import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { UserGrammarTopic } from '../../generated/prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { PracticeService } from '../practice/practice.service';
import { RoadmapService } from '../roadmap/roadmap.service';
import type {
  FormulaSheetDto,
  LevelInfoDto,
  OverviewDto,
  QuestionTopicDtoOut,
  StartToeicDto,
  SuggestionDto,
  TopicCardDto,
  TopicDetailDto,
  TopicLinkDto,
  TopicProgressDto,
} from './dto/grammar.dto';
import {
  type Level,
  LEARNED_EXERCISE_PERCENT,
  LEVEL_LABELS,
  LEVELS,
  suggestedLevel,
  type SuggestedLevel,
  type TopicStatus,
  toeicRecentAccuracy,
  topicStatus,
} from './grammar-rules';
import { GrammarTaggingService } from './grammar-tagging.service';
import { isVisible, lessonOf, toFormulaDto } from './grammar.mapper';
import { GrammarRepository, type TopicWithCounts } from './grammar.repository';

export interface UserCtx {
  topics: TopicWithCounts[];
  userTopics: Map<number, UserGrammarTopic>;
  toeic: Map<number, boolean[]>;
  passed: Set<number>;
  answered: Set<number>;
  open: Map<number, number>;
  toeicAvail: Map<number, { count: number; tests: number }>;
  level: SuggestedLevel;
  levelInfo: LevelInfoDto;
}

/**
 * Grammar Center (G01–G05): danh sách chủ điểm, trang chủ điểm, công thức, tiến độ, cấp gợi ý.
 * Khách xem được bài học và công thức; trạng thái, tiến độ, lỗi chỉ có khi đăng nhập.
 */
@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name);

  constructor(
    private readonly repo: GrammarRepository,
    private readonly analytics: AnalyticsService,
    private readonly roadmap: RoadmapService,
    private readonly practice: PracticeService,
    private readonly tagging: GrammarTaggingService,
  ) {}

  // =================== Ngữ cảnh học viên ===================

  async visibleTopics(): Promise<TopicWithCounts[]> {
    return (await this.repo.listTopics(false)).filter(isVisible);
  }

  async levelInfo(user: AuthenticatedUser): Promise<LevelInfoDto> {
    const [settings, estimate, start] = await Promise.all([
      this.repo.settings(user.id),
      this.analytics.latestEstimate(user.id).catch(() => null),
      this.repo.roadmapStart(user.id),
    ]);
    const s = suggestedLevel({
      estimate:
        estimate && estimate.total !== null
          ? { total: estimate.total, date: estimate.date }
          : null,
      manual:
        settings?.level && settings.levelSetAt
          ? { level: settings.level as Level, setAt: settings.levelSetAt }
          : null,
      roadmapScore: start?.currentScore ?? null,
    });
    let changedFrom: string | null = null;
    if (!settings?.lastSeenLevel) {
      await this.repo.upsertSettings(user.id, { lastSeenLevel: s.level });
    } else if (settings.lastSeenLevel !== s.level && s.source === 'estimate') {
      changedFrom = settings.lastSeenLevel;
    } else if (settings.lastSeenLevel !== s.level) {
      await this.repo.upsertSettings(user.id, { lastSeenLevel: s.level });
    }
    return {
      level: s.level,
      label: LEVEL_LABELS[s.level],
      source: s.source,
      score: s.score,
      date: s.date,
      needs_prompt:
        s.source === 'default' &&
        !settings?.promptDismissed &&
        !settings?.level,
      changed_from: changedFrom,
    };
  }

  async context(user: AuthenticatedUser): Promise<UserCtx> {
    await this.tagging.ensureTagged();
    const [
      topics,
      userTopics,
      toeicRows,
      results,
      answered,
      exMistakes,
      qMistakes,
      testIds,
      level,
    ] = await Promise.all([
      this.visibleTopics(),
      this.repo.userTopics(user.id),
      this.repo.toeicAnswers(user.id),
      this.repo.exerciseResults(user.id),
      this.repo.answeredTopicIds(user.id),
      this.repo.exerciseMistakes(user.id),
      this.repo.toeicMistakes(user.id),
      this.analytics.accessibleTestIds(user),
      this.levelInfo(user),
    ]);
    const toeic = new Map<number, boolean[]>();
    for (const r of toeicRows) {
      const list = toeic.get(r.topicId) ?? [];
      list.push(r.correct);
      toeic.set(r.topicId, list);
    }
    const passed = new Set<number>();
    for (const r of results) {
      if (
        r.topicId !== null &&
        r.totalItems > 0 &&
        ((r.correctCount ?? 0) / r.totalItems) * 100 >= LEARNED_EXERCISE_PERCENT
      )
        passed.add(r.topicId);
    }
    const open = new Map<number, number>();
    for (const m of exMistakes) {
      if (m.status !== 'fixed' && (m.wrongCount > 0 || m.manual))
        open.set(m.exercise.topicId, (open.get(m.exercise.topicId) ?? 0) + 1);
    }
    for (const m of qMistakes) {
      if (m.status !== 'fixed')
        open.set(m.topicId, (open.get(m.topicId) ?? 0) + 1);
    }
    const counts = await this.repo.toeicCounts([...testIds]);
    return {
      topics,
      userTopics: new Map(userTopics.map((u) => [u.topicId, u])),
      toeic,
      passed,
      answered,
      open,
      toeicAvail: new Map(counts.map((c) => [c.topicId, c])),
      level: {
        level: level.level as Level,
        source: level.source as SuggestedLevel['source'],
        score: level.score,
        date: level.date,
      },
      levelInfo: level,
    };
  }

  statusOf(t: TopicWithCounts, ctx: UserCtx): TopicStatus {
    const u = ctx.userTopics.get(t.id);
    return topicStatus({
      opened: !!u?.openedAt,
      answeredAny:
        ctx.answered.has(t.id) || (ctx.toeic.get(t.id)?.length ?? 0) > 0,
      lessonDone: !!u?.lessonDoneAt || lessonOf(t) === null,
      hasExercises: t._count.exercises > 0,
      passedExercise: ctx.passed.has(t.id),
      hasToeic: (ctx.toeicAvail.get(t.id)?.count ?? 0) > 0,
      recentToeic: ctx.toeic.get(t.id) ?? [],
    });
  }

  private card(t: TopicWithCounts, ctx: UserCtx | null): TopicCardDto {
    const base: TopicCardDto = {
      id: t.id,
      slug: t.slug,
      name: t.name,
      group: t.groupName,
      level: t.level,
      summary: t.summary,
      has_lesson: lessonOf(t) !== null,
      formula_count: t._count.formulas,
      exercise_count: t._count.exercises,
      status: null,
      needs_review: false,
      toeic_accuracy: null,
      toeic_answered: 0,
      open_mistakes: null,
      foundation: false,
      hidden: t.hidden,
    };
    if (!ctx) return base;
    const status = this.statusOf(t, ctx);
    const acc = toeicRecentAccuracy(ctx.toeic.get(t.id) ?? []);
    const u = ctx.userTopics.get(t.id);
    return {
      ...base,
      status,
      needs_review: !!u?.everMastered && status === 'learned',
      toeic_accuracy: acc.percent,
      toeic_answered: acc.answered,
      open_mistakes: ctx.open.get(t.id) ?? 0,
      foundation:
        LEVELS.indexOf(t.level as Level) < LEVELS.indexOf(ctx.level.level) &&
        status !== 'learned' &&
        status !== 'mastered',
    };
  }

  /** Ghi cờ "từng Thành thạo" để báo "Cần ôn lại" khi tụt. */
  private async rememberMastered(
    userId: string,
    cards: TopicCardDto[],
    ctx: UserCtx,
  ) {
    for (const c of cards) {
      if (c.status === 'mastered' && !ctx.userTopics.get(c.id)?.everMastered)
        await this.repo.upsertUserTopic(userId, c.id, { everMastered: true });
    }
  }

  // =================== Trang tổng ===================

  async overview(user: AuthenticatedUser | undefined): Promise<OverviewDto> {
    if (!user) {
      const topics = await this.visibleTopics();
      return {
        level: null,
        topics: topics.map((t) => this.card(t, null)),
        groups: groupsOf(topics),
        progress: null,
        resume: null,
        suggestions: [],
        open_mistakes: null,
      };
    }
    const ctx = await this.context(user);
    const cards = ctx.topics.map((t) => this.card(t, ctx));
    await this.rememberMastered(user.id, cards, ctx);
    const levelInfo = ctx.levelInfo;
    // "Học tiếp": chủ điểm mở gần nhất; chưa mở chủ điểm nào → chủ điểm gợi ý đầu tiên
    const recent = [...ctx.userTopics.values()]
      .filter(
        (u) => u.lastOpenedAt && ctx.topics.some((t) => t.id === u.topicId),
      )
      .sort((a, b) => b.lastOpenedAt!.getTime() - a.lastOpenedAt!.getTime())[0];
    const suggestions = await this.suggestions(user, ctx, cards);
    let resume: OverviewDto['resume'] = null;
    if (recent) {
      const t = ctx.topics.find((x) => x.id === recent.topicId)!;
      resume = {
        slug: t.slug,
        name: t.name,
        tab: recent.lastTab,
        started: true,
      };
    } else if (suggestions[0] || cards[0]) {
      const s = suggestions[0] ?? cards[0];
      resume = { slug: s.slug, name: s.name, tab: null, started: false };
    }
    return {
      level: levelInfo,
      topics: cards,
      groups: groupsOf(ctx.topics),
      progress: {
        learned: cards.filter(
          (c) => c.status === 'learned' || c.status === 'mastered',
        ).length,
        mastered: cards.filter((c) => c.status === 'mastered').length,
        total: cards.length,
      },
      resume,
      suggestions,
      open_mistakes: [...ctx.open.entries()]
        .filter(([id]) => ctx.topics.some((t) => t.id === id))
        .reduce((s, [, n]) => s + n, 0),
    };
  }

  /**
   * Gợi ý tối đa 3: (1) tỉ lệ đúng TOEIC thấp nhất (đủ 10 câu), (2) nhiều lỗi chưa sửa,
   * (3) chủ điểm chặng lộ trình hiện tại chưa Đã học. Không gợi ý chủ điểm Thành thạo.
   * Người mới: theo chặng lộ trình, chưa có lộ trình thì 3 chủ điểm Cơ bản đầu tiên.
   */
  private async suggestions(
    user: AuthenticatedUser,
    ctx: UserCtx,
    cards: TopicCardDto[],
  ): Promise<SuggestionDto[]> {
    const out: SuggestionDto[] = [];
    const add = (c: TopicCardDto, reason: string) => {
      if (out.length >= 3 || out.some((o) => o.slug === c.slug)) return;
      out.push({ slug: c.slug, name: c.name, reason });
    };
    const candidates = cards.filter((c) => c.status !== 'mastered');
    [...candidates]
      .filter((c) => c.toeic_accuracy !== null)
      .sort((a, b) => a.toeic_accuracy! - b.toeic_accuracy!)
      .forEach((c) =>
        add(c, `Câu TOEIC của chủ điểm này đang đúng ${c.toeic_accuracy}%`),
      );
    [...candidates]
      .filter((c) => (c.open_mistakes ?? 0) > 0)
      .sort((a, b) => b.open_mistakes! - a.open_mistakes!)
      .forEach((c) => add(c, `Có ${c.open_mistakes} lỗi chưa sửa`));
    if (out.length < 3) {
      const phase = await this.roadmapPhase(user);
      if (phase) {
        candidates
          .filter(
            (c) =>
              c.status !== 'learned' &&
              ctx.topics
                .find((t) => t.id === c.id)
                ?.roadmapLabels.some((l) => phase.topics.includes(l)),
          )
          .forEach((c) => add(c, `Thuộc chặng ${phase.title} của lộ trình`));
      } else if (out.length === 0) {
        candidates
          .filter((c) => c.level === 'basic' && c.status !== 'learned')
          .forEach((c) => add(c, 'Chủ điểm nền tảng'));
      }
    }
    return out;
  }

  private async roadmapPhase(
    user: AuthenticatedUser,
  ): Promise<{ title: string; topics: string[] } | null> {
    try {
      const mine = await this.roadmap.getMine(user);
      const r = mine.roadmap;
      if (!r) return null;
      const p = r.phases[r.summary.current_phase_index];
      return p ? { title: p.title, topics: p.grammar_topics } : null;
    } catch (e) {
      this.logger.warn(`Không đọc được lộ trình: ${String(e)}`);
      return null;
    }
  }

  // =================== Trang chủ điểm ===================

  async topicOrFail(slug: string, allowHidden = false) {
    const t = await this.repo.findTopicBySlug(slug);
    if (!t || (!allowHidden && !isVisible(t)))
      throw new NotFoundException({
        code: 'TOPIC_NOT_FOUND',
        message: 'Không tìm thấy chủ điểm',
      });
    return t;
  }

  async topic(
    user: AuthenticatedUser | undefined,
    slug: string,
  ): Promise<TopicDetailDto> {
    const t = await this.topicOrFail(slug);
    const [formulas, counts, totals] = await Promise.all([
      this.repo.formulasOf([t.id]),
      this.repo.exerciseCounts([t.id]),
      this.repo.toeicTotals(),
    ]);
    const exerciseCounts: Record<string, Record<string, number>> = {};
    for (const l of LEVELS)
      exerciseCounts[l] = { choice: 0, fill: 0, error: 0 };
    for (const c of counts) {
      if (exerciseCounts[c.level]) exerciseCounts[c.level][c.kind] = c.count;
    }
    const base = {
      lesson: lessonOf(t),
      video_url: t.videoUrl,
      formulas: formulas.map(toFormulaDto),
      exercise_counts: exerciseCounts,
    };
    if (!user) {
      return {
        ...this.card(t, null),
        ...base,
        toeic: {
          available: 0,
          tests: 0,
          total_tagged: totals.get(t.id) ?? 0,
          answered: 0,
          accuracy: null,
        },
        progress: null,
      };
    }
    const ctx = await this.context(user);
    const card = this.card(t, ctx);
    const u = ctx.userTopics.get(t.id);
    const avail = ctx.toeicAvail.get(t.id) ?? { count: 0, tests: 0 };
    const active = await this.repo.activeSession(user.id, 'exercise', t.id);
    const activeAnswers = active ? await this.repo.answers(active.id) : [];
    const suggested = u?.chosenLevel ?? ctx.level.level;
    const remembered = (u?.formulasRemembered ?? []).filter((id) =>
      formulas.some((f) => f.id === id),
    );
    const exhausted = await this.exhaustedLevels(user.id, t.id, exerciseCounts);
    if (card.status === 'mastered' && !u?.everMastered)
      await this.repo.upsertUserTopic(user.id, t.id, { everMastered: true });
    return {
      ...card,
      ...base,
      toeic: {
        available: avail.count,
        tests: avail.tests,
        total_tagged: totals.get(t.id) ?? 0,
        answered: card.toeic_answered,
        accuracy: card.toeic_accuracy,
      },
      progress: {
        steps: {
          lesson: !!u?.lessonDoneAt,
          formulas: formulas.length > 0 && remembered.length >= formulas.length,
          exercises: ctx.passed.has(t.id),
          toeic: card.status === 'mastered',
        },
        last_tab: u?.lastTab ?? null,
        remembered,
        chosen_level: u?.chosenLevel ?? null,
        suggested_level: suggested,
        active_session: active
          ? {
              id: active.id,
              answered: activeAnswers.length,
              total: active.totalItems,
            }
          : null,
        exhausted_levels: exhausted,
      },
    };
  }

  /** Cấp mà học viên đã làm hết câu mới (để hiện "Bạn đã làm hết câu mới ở cấp này"). */
  private async exhaustedLevels(
    userId: string,
    topicId: number,
    counts: Record<string, Record<string, number>>,
  ): Promise<string[]> {
    const out: string[] = [];
    for (const l of LEVELS) {
      const total = Object.values(counts[l]).reduce((s, n) => s + n, 0);
      if (total === 0) continue;
      const pool = await this.repo.exercisePool(userId, topicId, l, [
        'choice',
        'fill',
        'error',
      ]);
      if (pool.every((p) => p.seen)) out.push(l);
    }
    return out;
  }

  async markProgress(
    user: AuthenticatedUser,
    slug: string,
    dto: TopicProgressDto,
  ): Promise<{ ok: true }> {
    const t = await this.topicOrFail(slug);
    const now = new Date();
    const current = await this.repo.userTopic(user.id, t.id);
    switch (dto.action) {
      case 'open':
        await this.repo.upsertUserTopic(user.id, t.id, {
          openedAt: current?.openedAt ?? now,
          lastOpenedAt: now,
          ...(dto.tab ? { lastTab: dto.tab } : {}),
        });
        break;
      case 'lesson_done':
        await this.repo.upsertUserTopic(user.id, t.id, {
          openedAt: current?.openedAt ?? now,
          lastOpenedAt: now,
          lessonDoneAt: current?.lessonDoneAt ?? now,
          lastTab: 'exercises',
        });
        break;
      case 'formula':
      case 'formula_unset': {
        const f = dto.formula_id
          ? await this.repo.findFormula(dto.formula_id)
          : null;
        if (!f || f.topicId !== t.id)
          throw new NotFoundException({
            code: 'FORMULA_NOT_FOUND',
            message: 'Không tìm thấy công thức',
          });
        const set = new Set(current?.formulasRemembered ?? []);
        if (dto.action === 'formula') set.add(f.id);
        else set.delete(f.id);
        await this.repo.upsertUserTopic(user.id, t.id, {
          openedAt: current?.openedAt ?? now,
          lastOpenedAt: now,
          formulasRemembered: [...set],
        });
        break;
      }
    }
    return { ok: true };
  }

  async setTopicLevel(user: AuthenticatedUser, slug: string, level: Level) {
    const t = await this.topicOrFail(slug);
    await this.repo.upsertUserTopic(user.id, t.id, { chosenLevel: level });
    return { ok: true as const };
  }

  async updateSettings(
    user: AuthenticatedUser,
    dto: {
      level?: Level;
      dismiss_prompt?: boolean;
      ack_level_change?: boolean;
    },
  ): Promise<LevelInfoDto> {
    const now = new Date();
    if (dto.level) {
      await this.repo.upsertSettings(user.id, {
        level: dto.level,
        levelSetAt: now,
        promptDismissed: true,
        lastSeenLevel: dto.level,
      });
    } else if (dto.dismiss_prompt) {
      await this.repo.upsertSettings(user.id, { promptDismissed: true });
    }
    if (dto.ack_level_change) {
      const info = await this.levelInfo(user);
      await this.repo.upsertSettings(user.id, { lastSeenLevel: info.level });
    }
    return this.levelInfo(user);
  }

  // =================== Công thức, liên kết ===================

  async formulaSheet(): Promise<FormulaSheetDto[]> {
    const topics = await this.visibleTopics();
    const formulas = await this.repo.formulasOf(topics.map((t) => t.id));
    return topics
      .map((t) => ({
        topic: {
          slug: t.slug,
          name: t.name,
          group: t.groupName,
          level: t.level,
        },
        formulas: formulas.filter((f) => f.topicId === t.id).map(toFormulaDto),
      }))
      .filter((g) => g.formulas.length > 0);
  }

  /** Liên kết chủ điểm cho Lộ trình (chữ chủ điểm → trang chủ điểm) và thẻ điểm yếu. */
  async links(): Promise<TopicLinkDto[]> {
    return (await this.visibleTopics()).map((t) => ({
      slug: t.slug,
      name: t.name,
      roadmap_labels: t.roadmapLabels,
      toeic_categories: t.toeicCategories,
    }));
  }

  async questionTopics(idsCsv: string): Promise<QuestionTopicDtoOut[]> {
    const ids = [
      ...new Set(
        idsCsv
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ].slice(0, 300);
    if (ids.length === 0) return [];
    await this.tagging.ensureTagged();
    const [rows, topics] = await Promise.all([
      this.repo.questionTopicsOf(ids),
      this.visibleTopics(),
    ]);
    const byId = new Map(topics.map((t) => [t.id, t]));
    return rows
      .filter((r) => byId.has(r.grammarTopicId!))
      .map((r) => ({
        question_id: r.id,
        slug: byId.get(r.grammarTopicId!)!.slug,
        name: byId.get(r.grammarTopicId!)!.name,
      }));
  }

  /** "Học lại ngữ pháp" từ thẻ điểm yếu: chủ điểm của nhóm có tỉ lệ đúng thấp nhất. */
  async topicForCategory(
    user: AuthenticatedUser,
    category: string,
  ): Promise<{ slug: string; name: string } | null> {
    const ctx = await this.context(user);
    const inGroup = ctx.topics.filter((t) =>
      t.toeicCategories.includes(category),
    );
    if (inGroup.length === 0) return null;
    const scored = inGroup.map((t) => {
      const list = ctx.toeic.get(t.id) ?? [];
      const acc = list.length
        ? list.filter(Boolean).length / list.length
        : null;
      return { t, acc };
    });
    scored.sort((a, b) => {
      if (a.acc === null && b.acc === null)
        return a.t.sortOrder - b.t.sortOrder;
      if (a.acc === null) return 1;
      if (b.acc === null) return -1;
      return a.acc - b.acc;
    });
    return { slug: scored[0].t.slug, name: scored[0].t.name };
  }

  // =================== Bài tập TOEIC (G04) ===================

  async startToeic(user: AuthenticatedUser, slug: string, dto: StartToeicDto) {
    const t = await this.topicOrFail(slug);
    const now = new Date();
    const current = await this.repo.userTopic(user.id, t.id);
    await this.repo.upsertUserTopic(user.id, t.id, {
      openedAt: current?.openedAt ?? now,
      lastOpenedAt: now,
      lastTab: 'toeic',
    });
    return this.practice.createGrammarTopicSession(
      user,
      {
        kind: 'question_type',
        count: dto.count,
        difficulty: dto.difficulty ?? 'all',
        mode: dto.mode,
        feedback: dto.feedback,
        unseen_only: dto.unseen_first ?? false,
      },
      { id: t.id, slug: t.slug, name: t.name },
    );
  }
}

function groupsOf(topics: { groupName: string }[]): string[] {
  return [...new Set(topics.map((t) => t.groupName))];
}
