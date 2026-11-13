import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import { SECONDS_PER_QUESTION } from '../practice/question-categories';
import { buildPlan, startOfDayUtc } from '../roadmap/roadmap-planner';
import { ANALYTICS_CONFIG as C, PART_STANDARD_COUNT } from './analytics-config';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService, isFullAttempt } from './analytics.service';
import type { RecommendationDto } from './dto/analytics.dto';

const DAY = 86_400_000;

interface Candidate {
  id: number;
  title: string;
  code: string;
  courseId: number | null;
  difficulty: string | null;
  verified: boolean;
  isFree: boolean;
  createdAt: Date | null;
  parts: number[];
  attempts: number;
  favorite: boolean;
  lastDoneAt: Date | null;
  accessible: boolean;
}

function minutesFor(parts: number[]): number {
  return Math.max(
    5,
    Math.round(
      parts.reduce(
        (n, p) =>
          n + (PART_STANDARD_COUNT[p] ?? 20) * (SECONDS_PER_QUESTION[p] ?? 40),
        0,
      ) /
        60 /
        5,
    ) * 5,
  );
}

/** Part đề xuất từ Part yếu nhất: tối đa 2 Part liền kỹ năng. */
export function pairParts(part: number): number[] {
  switch (part) {
    case 1:
    case 2:
      return [1, 2];
    case 3:
    case 4:
      return [3, 4];
    case 5:
      return [5, 6];
    default:
      return [6, 7];
  }
}

export function difficultyFits(
  level: number | null,
  difficulty: string | null,
): boolean | null {
  if (level === null || !difficulty) return null; // bỏ tiêu chí
  if (level < C.easyBelowScore)
    return difficulty === 'easy' || difficulty === 'medium';
  if (level > C.hardAboveScore)
    return difficulty === 'medium' || difficulty === 'hard';
  return difficulty === 'medium';
}

/** Đề xuất đề tiếp theo (E10): một đề chính kèm chế độ làm, thời lượng, lý do và 2 đề thay thế. */
@Injectable()
export class RecommendationService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly analytics: AnalyticsService,
    private readonly learning: LearningService,
  ) {}

  async recommend(user: AuthenticatedUser): Promise<RecommendationDto> {
    const now = this.analytics.now();
    const rows = await this.repo.answerRows(user.id);
    const [
      tests,
      attemptCounts,
      favorites,
      skips,
      results,
      roadmap,
      hasDiagnostic,
    ] = await Promise.all([
      this.repo.candidateTests(),
      this.repo.attemptCounts(),
      this.repo.favoriteTestIds(user.id),
      this.repo.activeSkips(user.id, now),
      this.repo.fullTestResults(user.id),
      this.repo.roadmap(user.id),
      this.repo.hasDiagnosticSet(),
    ]);

    // Người mới, chưa có lượt nào: bài kiểm tra trình độ trước
    if (rows.length === 0 && results.length === 0 && hasDiagnostic) {
      return {
        kind: 'diagnostic',
        primary: {
          type: 'diagnostic',
          title: 'Bài kiểm tra trình độ',
          minutes: 40,
          reasons: [
            'Bạn chưa có bài làm nào — làm bài kiểm tra trình độ để biết mình đang ở mức nào',
          ],
          url: '/diagnostic',
        },
        alternatives: [],
      };
    }

    const access = new Map<number | null, boolean>();
    for (const c of new Set(tests.map((t) => t.courseId)))
      access.set(c, await this.learning.canAccessCourse(c, user));
    const lastDone = new Map<number, Date>();
    for (const r of results) {
      if (!r.completedAt) continue;
      const prev = lastDone.get(r.testId);
      if (!prev || r.completedAt > prev) lastDone.set(r.testId, r.completedAt);
    }

    const candidates: Candidate[] = tests
      .filter(
        (t) =>
          t.course?.isActive !== false &&
          (!t.releaseDate || t.releaseDate.getTime() <= now.getTime()) &&
          t.verificationStatus !== 'needs_review' &&
          !skips.has(t.id),
      )
      .map((t) => ({
        id: t.id,
        title: t.title,
        code: `LE-${String(t.id).padStart(4, '0')}`,
        courseId: t.courseId,
        difficulty: t.difficulty,
        verified: t.verificationStatus === 'verified',
        isFree: t.course?.isFree === true,
        createdAt: t.createdAt,
        parts: [...new Set(t.fullTestSections.map((s) => s.partNumber))].sort(
          (a, b) => a - b,
        ),
        attempts: attemptCounts.get(t.id) ?? 0,
        favorite: favorites.has(t.id),
        lastDoneAt: lastDone.get(t.id) ?? null,
        accessible: access.get(t.courseId) ?? false,
      }))
      .filter((c) => c.parts.length > 0);

    const estimate = await this.analytics.latestEstimate(user.id, rows);
    const level = estimate?.total ?? roadmap?.currentScore ?? null;

    // Chế độ: đủ đề hay các Part chứa điểm yếu
    const lookup = await this.analytics.practiceLookup(user);
    const report = this.analytics.buildReport(rows, '30', 'all', lookup);
    const weakest = report.state === 'ready' ? report.top[0] : undefined;
    const lastFull = results.find(
      (r) => r.completedAt && isFullAttempt(r.answersDetail),
    );
    let inTestPhase = false;
    if (roadmap) {
      const plan = buildPlan(
        {
          currentScore: roadmap.currentScore,
          targetScore: roadmap.targetScore,
          purpose: roadmap.purpose as never,
          durationWeeks: roadmap.durationWeeks,
          minutesPerDay: roadmap.minutesPerDay,
          daysPerWeek: roadmap.daysPerWeek,
          startedAt: roadmap.startedAt,
        },
        { modules: [], vocabCategories: [], fullTests: [] },
        startOfDayUtc(now),
      );
      inTestPhase =
        plan.phases[plan.currentPhaseIndex]?.key === 'test_practice';
    }
    const fullMode =
      inTestPhase ||
      !weakest ||
      !lastFull?.completedAt ||
      now.getTime() - lastFull.completedAt.getTime() >=
        C.fullTestEveryDays * DAY;

    const isFresh = (c: Candidate) =>
      !c.lastDoneAt ||
      now.getTime() - c.lastDoneAt.getTime() >= C.redoAfterDays * DAY;
    const score = (c: Candidate) => {
      const fit = difficultyFits(level, c.difficulty);
      return [
        isFresh(c) ? 1 : 0,
        c.lastDoneAt ? 0 : 1,
        fit === null ? 0.5 : fit ? 1 : 0,
        c.verified ? 1 : 0,
        c.favorite ? 1 : 0,
        c.createdAt?.getTime() ?? 0,
      ];
    };
    const cmp = (a: Candidate, b: Candidate) => {
      const sa = score(a);
      const sb = score(b);
      for (let i = 0; i < sa.length; i++)
        if (sa[i] !== sb[i]) return sb[i] - sa[i];
      return b.id - a.id;
    };

    const toRec = (c: Candidate, forceFull = false) => {
      const weakParts = weakest
        ? pairParts(weakest.part).filter((p) => c.parts.includes(p))
        : [];
      const full = forceFull || fullMode || weakParts.length === 0;
      const parts = full ? c.parts : weakParts;
      const reasons: string[] = [];
      if (!c.lastDoneAt) reasons.push('Bạn chưa làm đề này');
      else
        reasons.push(
          `Làm lại để so sánh với lần trước (đã làm cách đây ${Math.floor((now.getTime() - c.lastDoneAt.getTime()) / DAY)} ngày)`,
        );
      const fit = difficultyFits(level, c.difficulty);
      if (fit && level !== null)
        reasons.push(`Độ khó hợp mức ${level} của bạn`);
      if (!full && weakest)
        reasons.push(
          `Part ${weakest.part} đang là điểm yếu (${weakest.accuracy ?? 0}%)`,
        );
      if (full && inTestPhase)
        reasons.push('Bạn đang ở chặng Luyện đề tổng hợp');
      if (c.verified) reasons.push('Đề đã xác minh nội dung');
      if (c.favorite) reasons.push('Đề trong danh sách yêu thích');
      return {
        type: 'exam',
        test_id: c.id,
        code: c.code,
        title: c.title,
        course_id: c.courseId,
        difficulty: c.difficulty,
        verified: c.verified,
        is_free: c.isFree,
        locked: !c.accessible,
        mode: {
          full,
          parts,
          minutes: full && c.parts.length === 7 ? 120 : minutesFor(parts),
        },
        reasons,
      };
    };

    const open = candidates.filter((c) => c.accessible).sort(cmp);
    const fresh = open.filter(isFresh);
    if (fresh.length > 0) {
      const locked = candidates
        .filter((c) => !c.accessible && isFresh(c))
        .sort(cmp);
      const alts = fresh.slice(1, 3).map((c) => toRec(c));
      if (alts.length < 2 && locked[0]) alts.push(toRec(locked[0]));
      // Người mới khi chưa có bài chẩn đoán: đề miễn phí đã xác minh nhiều lượt làm, làm phần Listening
      if (rows.length === 0 && results.length === 0) {
        const starter = [...fresh].sort(
          (a, b) =>
            Number(b.isFree) - Number(a.isFree) ||
            Number(b.verified) - Number(a.verified) ||
            b.attempts - a.attempts,
        )[0];
        const rec = toRec(starter, true);
        const listening = starter.parts.filter((p) => p <= 4);
        if (listening.length > 0) {
          rec.mode = {
            full: false,
            parts: listening,
            minutes: minutesFor(listening),
          };
          rec.reasons = [
            'Đề miễn phí nhiều người làm — bắt đầu bằng phần Listening',
          ];
        }
        return {
          kind: 'exam',
          primary: rec,
          alternatives: fresh
            .filter((c) => c.id !== starter.id)
            .slice(0, 2)
            .map((c) => toRec(c)),
        };
      }
      return { kind: 'exam', primary: toRec(fresh[0]), alternatives: alts };
    }

    // Đã làm hết đề có quyền (đều trong 30 ngày): gợi ý Mini Test dạng yếu + một đề Premium
    const premium = candidates.filter((c) => !c.accessible).sort(cmp)[0];
    return {
      kind: 'all_done',
      primary: null,
      alternatives: [
        ...(weakest
          ? [
              {
                type: 'practice',
                title: `Luyện ${weakest.label} (Part ${weakest.part})`,
                url: `/practice?skill=${weakest.part <= 4 ? 'listening' : 'reading'}`,
                part: weakest.part,
                category: weakest.category,
                reasons: [`Dạng yếu nhất của bạn (${weakest.accuracy ?? 0}%)`],
              },
            ]
          : []),
        ...(premium ? [toRec(premium)] : []),
      ],
    };
  }

  async skip(user: AuthenticatedUser, testId: number): Promise<void> {
    if (!(await this.repo.testExists(testId))) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Không tìm thấy đề thi ${testId}`,
      });
    }
    await this.repo.skip(
      user.id,
      testId,
      new Date(this.analytics.now().getTime() + C.skipDays * DAY),
    );
  }
}
