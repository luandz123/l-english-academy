import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import { PARTS } from '../practice/question-categories';
import {
  ANALYTICS_CONFIG as C,
  windowDays,
  type WindowKey,
} from './analytics-config';
import {
  accuracy,
  aggregate,
  categoryLabel,
  daysAgo,
  estimateFromRows,
  filterRows,
  flagsOf,
  levelOf,
  pickTopWeaknesses,
  trendOf,
  vnWeekStart,
  type Aggregate,
  type AnswerRow,
  type RankedCategory,
  type ScoreRange,
  type Stat,
} from './analytics-rules';
import { AnalyticsRepository } from './analytics.repository';
import type {
  CategoryAnalysisDto,
  PartAnalysisDto,
  ProgressDto,
  WeaknessReportDto,
} from './dto/analytics.dto';

type Skill = 'all' | 'listening' | 'reading';

export interface ScoreEstimate {
  total: number;
  listening: number | null;
  reading: number | null;
  range: { min: number; max: number } | null;
  source: 'full_test' | 'diagnostic';
  source_id: string;
  title: string;
  date: string;
  age_days: number;
  link: string;
}

interface PracticeLookup {
  unseen: Map<string, { accessible: number; locked: number }>;
  mistakes: Map<string, number>;
  recent: Map<string, { correct: number; total: number; submitted_at: string }>;
}

const DAY = 86_400_000;

/** Kết quả Full Test làm đủ 7 Part (kết quả cũ không có _meta coi như đủ). */
export function isFullAttempt(detail: unknown): boolean {
  const meta = (detail as { _meta?: { selected_parts?: unknown } } | null)
    ?._meta;
  if (!meta || !Array.isArray(meta.selected_parts)) return true;
  return meta.selected_parts.length >= 7;
}

export function selectedParts(detail: unknown): number[] | null {
  const meta = (detail as { _meta?: { selected_parts?: unknown } } | null)
    ?._meta;
  return meta && Array.isArray(meta.selected_parts)
    ? meta.selected_parts.map(Number)
    : null;
}

/**
 * Phân tích điểm yếu (P11) — nguồn kết luận "điểm yếu" duy nhất — và tiến độ (P10).
 * Mọi số liệu đọc từ lượt đã nộp trên server; không có số mặc định.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly learning: LearningService,
  ) {}

  now(): Date {
    return new Date();
  }

  // =================== P11 ===================

  async weaknesses(
    user: AuthenticatedUser,
    window: WindowKey = '30',
    skill: Skill = 'all',
  ): Promise<WeaknessReportDto> {
    const rows = await this.repo.answerRows(user.id);
    const lookup = await this.practiceLookup(user);
    return this.buildReport(rows, window, skill, lookup);
  }

  buildReport(
    rows: AnswerRow[],
    window: WindowKey,
    skill: Skill,
    lookup: PracticeLookup,
  ): WeaknessReportDto {
    const now = this.now();
    const days = windowDays(window);
    const from = days ? daysAgo(now, days) : null;
    const prevFrom = days ? daysAgo(now, days * 2) : null;
    const skillOpt = skill === 'all' ? undefined : skill;
    const allSkillRows = filterRows(rows, { skill: skillOpt });
    const cur = aggregate(filterRows(allSkillRows, { from }));
    const prev = days
      ? aggregate(filterRows(allSkillRows, { from: prevFrom, to: from }))
      : null;
    const overallAcc = accuracy(cur.overall);

    const catDto = (key: string, stat: Stat): CategoryAnalysisDto => {
      const [p, category] = [
        Number(key.split(':')[0]),
        key.split(':').slice(1).join(':'),
      ];
      const acc = accuracy(stat);
      return {
        part: p,
        category,
        label: categoryLabel(p, category),
        answered: stat.answered,
        correct: stat.correct,
        wrong: stat.answered - stat.correct,
        blank: stat.blank,
        accuracy: acc,
        gap: acc !== null && overallAcc !== null ? acc - overallAcc : null,
        level: levelOf(stat, C.minAnswersPerCategory),
        trend: prev
          ? trendOf(stat, prev.byCategory.get(key), C.minAnswersPerCategory)
          : null,
        flags: flagsOf(stat, p),
        practice: this.practiceAction(key, lookup),
        recent_practice: lookup.recent.get(key) ?? null,
      };
    };

    const { items, mode } = pickTopWeaknesses(cur.byCategory);
    const parts: PartAnalysisDto[] = PARTS.filter(
      (p) => !skillOpt || p.skill === skillOpt,
    ).map((p) => {
      const stat = cur.byPart.get(p.part) ?? {
        answered: 0,
        correct: 0,
        blank: 0,
        timeSum: 0,
        timeCount: 0,
      };
      const categories = p.categories
        .map((c) => {
          const key = `${p.part}:${c.key}`;
          const s = cur.byCategory.get(key);
          return s ? catDto(key, s) : null;
        })
        .filter((c): c is CategoryAnalysisDto => c !== null)
        .sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101));
      const passage_types =
        p.part === 7
          ? [...cur.byPassage.entries()]
              .map(([k, s]) => ({
                key: k,
                answered: s.answered,
                accuracy: accuracy(s),
                level: levelOf(s, C.minAnswersPerCategory),
              }))
              .sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101))
          : [];
      return {
        part: p.part,
        skill: p.skill,
        name: p.name,
        answered: stat.answered,
        correct: stat.correct,
        accuracy: accuracy(stat),
        level: levelOf(stat, C.minAnswersPerPart),
        trend: prev
          ? trendOf(stat, prev.byPart.get(p.part), C.minAnswersPerPart)
          : null,
        categories,
        passage_types,
      };
    });

    const hasAny = rows.length > 0;
    const state = !hasAny
      ? 'empty'
      : items.length === 0
        ? 'insufficient'
        : 'ready';
    const maxCat = Math.max(
      0,
      ...[...cur.byCategory.values()].map((s) => s.answered),
    );

    // Cửa sổ hiện tại thiếu dữ liệu nhưng cửa sổ rộng hơn đủ → gợi ý
    let suggest: WindowKey | null = null;
    if (state === 'insufficient' && days) {
      for (const w of ['90', 'all'] as WindowKey[]) {
        const d = windowDays(w);
        if (d !== null && d <= days) continue;
        const wide = aggregate(
          filterRows(allSkillRows, { from: d ? daysAgo(now, d) : null }),
        );
        if (pickTopWeaknesses(wide.byCategory).items.length > 0) {
          suggest = w;
          break;
        }
      }
    }

    const listeningCount = filterRows(rows, {
      from,
      skill: 'listening',
    }).length;
    const readingCount = filterRows(rows, { from, skill: 'reading' }).length;
    return {
      state,
      window,
      skill,
      summary: {
        answered: cur.overall.answered,
        attempts: cur.attempts.size,
        from: cur.first?.toISOString() ?? null,
        to: cur.last?.toISOString() ?? null,
        accuracy: overallAcc,
        blank: cur.overall.blank,
      },
      top: items.map((i) => catDto(i.key, i.stat)),
      top_mode: mode,
      needed:
        state === 'insufficient'
          ? {
              answered: cur.overall.answered,
              max_in_category: maxCat,
              more_needed: Math.max(1, C.minAnswersPerCategory - maxCat),
            }
          : null,
      suggest_window: suggest,
      skills: { listening: listeningCount, reading: readingCount },
      parts,
    };
  }

  private practiceAction(key: string, lookup: PracticeLookup) {
    const unseen = lookup.unseen.get(key) ?? { accessible: 0, locked: 0 };
    const mistakes = lookup.mistakes.get(key) ?? 0;
    const action =
      unseen.accessible > 0
        ? 'practice'
        : mistakes > 0
          ? 'review'
          : unseen.locked > 0
            ? 'locked'
            : 'none';
    return {
      action,
      available: unseen.accessible,
      locked: unseen.locked,
      mistakes,
    };
  }

  async practiceLookup(user: AuthenticatedUser): Promise<PracticeLookup> {
    const accessible = [...(await this.accessibleTestIds(user))];
    const [unseenRows, mistakeRows, recentSessions] = await Promise.all([
      this.repo.unseenCounts(user.id, accessible),
      this.repo.openMistakeCounts(user.id),
      this.repo.recentQuestionTypeSessions(
        user.id,
        new Date(this.now().getTime() - DAY),
      ),
    ]);
    const unseen = new Map<string, { accessible: number; locked: number }>();
    for (const r of unseenRows) {
      const key = `${r.part}:${r.category}`;
      const cur = unseen.get(key) ?? { accessible: 0, locked: 0 };
      if (r.accessible) cur.accessible += r.n;
      else cur.locked += r.n;
      unseen.set(key, cur);
    }
    const mistakes = new Map(
      mistakeRows.map((r) => [`${r.part}:${r.category}`, r.n]),
    );
    const recent = new Map<
      string,
      { correct: number; total: number; submitted_at: string }
    >();
    for (const s of recentSessions) {
      const cfg = (s.config ?? {}) as {
        parts?: number[];
        categories?: string[];
      };
      if (cfg.parts?.length !== 1) continue;
      for (const c of cfg.categories ?? []) {
        const key = `${cfg.parts[0]}:${c}`;
        if (!recent.has(key)) {
          recent.set(key, {
            correct: s.correctCount ?? 0,
            total: s.totalQuestions,
            submitted_at: s.submittedAt?.toISOString() ?? '',
          });
        }
      }
    }
    return { unseen, mistakes, recent };
  }

  async accessibleTestIds(user: AuthenticatedUser): Promise<Set<number>> {
    const tests = await this.repo.candidateTests();
    const now = this.now().getTime();
    const allowed = new Map<number | null, boolean>();
    for (const c of new Set(tests.map((t) => t.courseId))) {
      allowed.set(c, await this.learning.canAccessCourse(c, user));
    }
    return new Set(
      tests
        .filter(
          (t) =>
            allowed.get(t.courseId) &&
            (!t.releaseDate || t.releaseDate.getTime() <= now),
        )
        .map((t) => t.id),
    );
  }

  // =================== Điểm ước lượng ===================

  /** Ước lượng của từng lượt chẩn đoán đã nộp (mới nhất trước). */
  diagnosticEstimates(
    rows: AnswerRow[],
  ): { id: string; at: Date; range: ScoreRange }[] {
    const byAttempt = new Map<string, AnswerRow[]>();
    for (const r of rows) {
      if (r.kind !== 'diagnostic') continue;
      const list = byAttempt.get(r.attemptId) ?? [];
      list.push(r);
      byAttempt.set(r.attemptId, list);
    }
    return [...byAttempt.entries()]
      .map(([id, list]) => ({
        id,
        at: list[0].at,
        range: estimateFromRows(list),
      }))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
  }

  async scorePoints(userId: string, rows?: AnswerRow[]) {
    const [results, answerRows] = await Promise.all([
      this.repo.fullTestResults(userId),
      rows ? Promise.resolve(rows) : this.repo.answerRows(userId),
    ]);
    const points: {
      kind: 'full_test' | 'diagnostic';
      id: string;
      date: string;
      total: number;
      listening: number | null;
      reading: number | null;
      range: { min: number; max: number } | null;
      title: string;
      link: string;
    }[] = [];
    for (const r of results) {
      if (
        !r.completedAt ||
        r.totalScore === null ||
        !isFullAttempt(r.answersDetail)
      )
        continue;
      points.push({
        kind: 'full_test',
        id: String(r.id),
        date: r.completedAt.toISOString(),
        total: r.totalScore,
        listening: r.listeningScore,
        reading: r.readingScore,
        range: null,
        title: r.fullTest?.title ?? `Đề #${r.testId}`,
        link: `/courses/${r.fullTest?.courseId ?? 0}/fulltest/${r.testId}/result?resultId=${r.id}`,
      });
    }
    for (const d of this.diagnosticEstimates(answerRows)) {
      if (!d.range.usable || !d.range.total) continue;
      points.push({
        kind: 'diagnostic',
        id: d.id,
        date: d.at.toISOString(),
        total: d.range.total.mid,
        listening: d.range.listening?.score ?? null,
        reading: d.range.reading?.score ?? null,
        range: { min: d.range.total.min, max: d.range.total.max },
        title: 'Bài kiểm tra trình độ',
        link: `/diagnostic/result/${d.id}`,
      });
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Điểm ước lượng hiện tại = lượt cho ra điểm quy đổi gần nhất (Full Test đủ 7 Part hoặc chẩn đoán). */
  async latestEstimate(
    userId: string,
    rows?: AnswerRow[],
  ): Promise<ScoreEstimate | null> {
    const points = await this.scorePoints(userId, rows);
    const last = points[points.length - 1];
    if (!last) return null;
    return {
      total: last.total,
      listening: last.listening,
      reading: last.reading,
      range: last.range,
      source: last.kind,
      source_id: last.id,
      title: last.title,
      date: last.date,
      age_days: Math.floor(
        (this.now().getTime() - new Date(last.date).getTime()) / DAY,
      ),
      link: last.link,
    };
  }

  /** Lượt chẩn đoán dùng được gần nhất (cho điểm xuất phát lộ trình). */
  async latestDiagnostic(userId: string) {
    const rows = await this.repo.answerRows(userId);
    const usable = this.diagnosticEstimates(rows).find(
      (d) => d.range.usable && d.range.total,
    );
    return usable ?? null;
  }

  // =================== Cho lộ trình (P03) ===================

  /**
   * Thống kê dạng câu để lộ trình chọn trọng tâm: ưu tiên phân tích 30 ngày, thiếu thì 90 ngày,
   * rồi toàn bộ; vẫn chưa có dạng nào đủ 10 câu thì dùng lượt chẩn đoán (ngưỡng 3 câu).
   */
  async focusSnapshot(user: AuthenticatedUser): Promise<{
    source: 'analysis' | 'diagnostic' | null;
    byCategory: Map<string, Stat>;
    top: RankedCategory[];
    minAnswers: number;
    lookup: PracticeLookup;
  }> {
    const rows = await this.repo.answerRows(user.id);
    const lookup = await this.practiceLookup(user);
    for (const days of [30, 90, null]) {
      const agg = aggregate(
        filterRows(rows, { from: days ? daysAgo(this.now(), days) : null }),
      );
      const top = pickTopWeaknesses(agg.byCategory);
      if (top.items.length > 0) {
        return {
          source: 'analysis',
          byCategory: agg.byCategory,
          top: top.items,
          minAnswers: C.minAnswersPerCategory,
          lookup,
        };
      }
    }
    const diag = this.diagnosticEstimates(rows)[0];
    if (diag) {
      const agg = aggregate(
        rows.filter((r) => r.attemptId === diag.id && r.kind === 'diagnostic'),
      );
      const top = pickTopWeaknesses(
        agg.byCategory,
        C.minAnswersPerCategoryDiagnostic,
      );
      if (top.items.length > 0) {
        return {
          source: 'diagnostic',
          byCategory: agg.byCategory,
          top: top.items,
          minAnswers: C.minAnswersPerCategoryDiagnostic,
          lookup,
        };
      }
    }
    return {
      source: null,
      byCategory: new Map(),
      top: [],
      minAnswers: C.minAnswersPerCategory,
      lookup,
    };
  }

  /** Hoạt động trong khoảng [from, to): số câu theo Part×dạng, câu sai đã ôn, Mini Test, Full Test đủ đề. */
  async activityBetween(userId: string, from: Date, to: Date) {
    const rows = filterRows(await this.repo.answerRows(userId), { from, to });
    const byCategory = new Map<string, number>();
    const byPart = new Map<number, number>();
    let mistakesReviewed = 0;
    const miniTests = new Set<string>();
    const fullTests = new Set<string>();
    for (const r of rows) {
      if (r.category)
        byCategory.set(
          `${r.part}:${r.category}`,
          (byCategory.get(`${r.part}:${r.category}`) ?? 0) + 1,
        );
      byPart.set(r.part, (byPart.get(r.part) ?? 0) + 1);
      if (r.kind === 'mistakes' || r.kind === 'retry') mistakesReviewed++;
      if (r.kind === 'mini_test') miniTests.add(r.attemptId);
      if (r.source === 'full_test') fullTests.add(r.attemptId);
    }
    const results = await this.repo.fullTestResults(userId);
    const fullTestsComplete = results.filter(
      (r) => fullTests.has(String(r.id)) && isFullAttempt(r.answersDetail),
    ).length;
    return {
      byCategory,
      byPart,
      mistakesReviewed,
      miniTests: miniTests.size,
      fullTestsComplete,
      total: rows.length,
    };
  }

  // =================== P10 ===================

  async progress(user: AuthenticatedUser): Promise<ProgressDto> {
    const now = this.now();
    const rows = await this.repo.answerRows(user.id);
    const [points, results, sessions, lookup] = await Promise.all([
      this.scorePoints(user.id, rows),
      this.repo.fullTestResults(user.id),
      this.repo.submittedSessions(user.id),
      this.practiceLookup(user),
    ]);
    const report = this.buildReport(rows, '30', 'all', lookup);

    const last = points[points.length - 1] ?? null;
    const estimate = last
      ? {
          total: last.total,
          listening: last.listening,
          reading: last.reading,
          range: last.range,
          source: last.kind,
          title: last.title,
          date: last.date,
          age_days: Math.floor(
            (now.getTime() - new Date(last.date).getTime()) / DAY,
          ),
          stale:
            now.getTime() - new Date(last.date).getTime() >
            C.staleScoreDays * DAY,
          link: last.link,
        }
      : null;
    const since30 = daysAgo(now, 30).toISOString();
    const recentPoints = points.filter((p) => p.date >= since30);
    const change30 =
      recentPoints.length >= 2
        ? recentPoints[recentPoints.length - 1].total - recentPoints[0].total
        : null;

    const cur = aggregate(filterRows(rows, { from: daysAgo(now, 30) }));
    const prev = aggregate(
      filterRows(rows, { from: daysAgo(now, 60), to: daysAgo(now, 30) }),
    );
    const parts = PARTS.map((p) => {
      const c = cur.byPart.get(p.part);
      const pv = prev.byPart.get(p.part);
      return {
        part: p.part,
        name: p.name,
        answered: c?.answered ?? 0,
        accuracy: c ? accuracy(c) : null,
        previous_accuracy: pv && pv.answered > 0 ? accuracy(pv) : null,
        level: c ? levelOf(c, C.minAnswersPerPart) : 'insufficient',
        trend: c ? trendOf(c, pv, C.minAnswersPerPart) : null,
      };
    });

    // 8 tuần gần nhất (thứ Hai giờ VN), kể cả tuần không học
    const thisWeek = vnWeekStart(now);
    const weekly = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(thisWeek.getTime() - (7 - i) * 7 * DAY);
      const end = new Date(start.getTime() + 7 * DAY);
      const inWeek = filterRows(rows, { from: start, to: end });
      const secs =
        sessions
          .filter(
            (s) =>
              s.submittedAt && s.submittedAt >= start && s.submittedAt < end,
          )
          .reduce((n, s) => n + (s.timeSpentSeconds ?? 0), 0) +
        results
          .filter(
            (r) =>
              r.completedAt && r.completedAt >= start && r.completedAt < end,
          )
          .reduce((n, r) => n + (r.timeSpentSeconds ?? 0), 0);
      return {
        week_start: start.toISOString(),
        listening: inWeek.filter((r) => r.part <= 4).length,
        reading: inWeek.filter((r) => r.part >= 5).length,
        seconds: secs,
      };
    });

    const history = [
      ...results.map((r) => ({
        kind: 'full_test',
        id: String(r.id),
        title: r.fullTest?.title ?? `Đề #${r.testId}`,
        date: r.completedAt?.toISOString() ?? null,
        score: isFullAttempt(r.answersDetail) ? r.totalScore : null,
        correct: r.correctAnswers,
        total: r.totalQuestions,
        parts: selectedParts(r.answersDetail),
        link: `/courses/${r.fullTest?.courseId ?? 0}/fulltest/${r.testId}/result?resultId=${r.id}`,
      })),
      ...sessions.map((s) => ({
        kind: s.kind,
        id: s.id,
        title:
          typeof (s.config as { title?: unknown })?.title === 'string'
            ? (s.config as { title: string }).title
            : 'Lượt luyện',
        date: s.submittedAt?.toISOString() ?? null,
        score: null as number | null,
        correct: s.correctCount,
        total: s.totalQuestions,
        parts: null,
        link:
          s.kind === 'diagnostic'
            ? `/diagnostic/result/${s.id}`
            : `/practice/session/${s.id}/result`,
      })),
    ]
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, 10);

    const state =
      rows.length === 0 && points.length === 0
        ? 'empty'
        : points.length === 0
          ? 'activity'
          : 'full';
    return {
      state,
      estimate,
      change_30d: change30,
      last_30d: {
        answered: cur.overall.answered,
        accuracy: accuracy(cur.overall),
      },
      score_points: points,
      parts,
      weekly,
      weaknesses: report.top,
      history,
    };
  }

  aggregateRows(rows: AnswerRow[]): Aggregate {
    return aggregate(rows);
  }
}
