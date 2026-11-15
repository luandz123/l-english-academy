import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { GrammarSession } from '../../generated/prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { PracticeService } from '../practice/practice.service';
import type {
  AnswerItemDto,
  GrammarSessionDto,
  ItemFeedbackDto,
  ReviewSummaryDto,
  SessionItemDto,
  SessionResultDto,
  StartExerciseDto,
  StartReviewDto,
} from './dto/grammar.dto';
import {
  afterReview,
  checkExercise,
  difficultyForLevel,
  EXERCISE_KINDS,
  type ExerciseKind,
  exerciseXp,
  type Level,
  levelHint,
  LEVELS,
  orderDueTopics,
  pickExercises,
  REVIEW_ITEMS_PER_TOPIC,
  REVIEW_TOPICS_PER_SESSION,
  reviewXp,
  SECONDS_PER_REVIEW_ITEM,
  vnDate,
} from './grammar-rules';
import { GrammarMistakesService } from './grammar-mistakes.service';
import {
  isVisible,
  lessonOf,
  toExerciseView,
  toFormulaDto,
} from './grammar.mapper';
import { GrammarRepository } from './grammar.repository';
import { GrammarService } from './grammar.service';

interface Item {
  type: 'ex' | 'q';
  id: number;
  topic_id: number;
}

export interface TopicResult {
  correct: number;
  total: number;
  next_due: string | null;
  graduated: boolean;
  rescheduled: boolean;
}

interface Config {
  count?: number;
  kind?: string;
  extra?: boolean;
  exhausted?: boolean;
  fixed?: number;
  topic_results?: Record<string, TopicResult>;
  result?: Omit<SessionResultDto, 'xp_new'>;
  skipped?: { topic_id: number; name: string; reason: string }[];
}

/**
 * Lượt bài tập chủ điểm (G03), phiên ôn ngữ pháp (G08) và "Làm lại" một lỗi (G07). Server chọn câu,
 * giữ đáp án, chấm, ghi lỗi, tính lịch ôn và XP. Câu TOEIC trong phiên chấm qua lượt luyện practice
 * (mỗi câu một lượt, nộp ngay khi trả lời → vào sổ câu sai và phân tích như luyện lại câu sai).
 */
@Injectable()
export class GrammarSessionService {
  constructor(
    private readonly repo: GrammarRepository,
    private readonly grammar: GrammarService,
    private readonly mistakes: GrammarMistakesService,
    private readonly practice: PracticeService,
    private readonly analytics: AnalyticsService,
  ) {}

  private now(): Date {
    return new Date();
  }

  // =================== Bài tập chủ điểm (G03) ===================

  async startExercise(
    user: AuthenticatedUser,
    slug: string,
    dto: StartExerciseDto,
  ): Promise<GrammarSessionDto> {
    const t = await this.grammar.topicOrFail(slug);
    const kinds =
      !dto.kind || dto.kind === 'all' ? [...EXERCISE_KINDS] : [dto.kind];
    const pool = await this.repo.exercisePool(user.id, t.id, dto.level, kinds);
    if (pool.length === 0 || (pool.length < dto.count && !dto.allow_less)) {
      throw new UnprocessableEntityException({
        code: 'INSUFFICIENT_QUESTIONS',
        message:
          pool.length === 0
            ? 'Chưa có câu bài tập phù hợp với lựa chọn này'
            : `Chỉ có ${pool.length} câu phù hợp.`,
        details: { available: pool.length },
      });
    }
    const picked = pickExercises(
      pool,
      Math.min(dto.count, pool.length),
      Math.random,
    );
    await this.repo.abandonOthers(user.id, 'exercise', t.id);
    const now = this.now();
    const current = await this.repo.userTopic(user.id, t.id);
    await this.repo.upsertUserTopic(user.id, t.id, {
      openedAt: current?.openedAt ?? now,
      lastOpenedAt: now,
      lastTab: 'exercises',
    });
    const s = await this.repo.createSession({
      userId: user.id,
      kind: 'exercise',
      topicId: t.id,
      level: dto.level,
      items: picked.ids.map((id) => ({ type: 'ex', id, topic_id: t.id })),
      totalItems: picked.ids.length,
      config: {
        count: dto.count,
        kind: dto.kind ?? 'all',
        exhausted: picked.exhausted,
      },
    });
    return this.detail(user, s.id);
  }

  /** "Làm lại câu sai" của một lượt bài tập đã nộp. */
  async retryWrong(
    user: AuthenticatedUser,
    id: string,
  ): Promise<GrammarSessionDto> {
    const src = await this.own(user.id, id);
    if (src.kind !== 'exercise' || src.status !== 'submitted')
      throw new ConflictException({
        code: 'SESSION_NOT_SUBMITTED',
        message: 'Lượt chưa nộp bài',
      });
    const answers = await this.repo.answers(src.id);
    const ok = new Set(
      answers.filter((a) => a.isCorrect).map((a) => a.itemIndex),
    );
    const items = itemsOf(src).filter((_, i) => !ok.has(i));
    const exercises = await this.repo.findExercises(items.map((i) => i.id));
    const alive = items.filter((i) =>
      exercises.some((e) => e.id === i.id && e.active),
    );
    if (alive.length === 0)
      throw new UnprocessableEntityException({
        code: 'NOTHING_TO_RETRY',
        message: 'Lượt này không có câu sai',
        details: { available: 0 },
      });
    await this.repo.abandonOthers(user.id, 'exercise', src.topicId);
    const s = await this.repo.createSession({
      userId: user.id,
      kind: 'exercise',
      topicId: src.topicId,
      level: src.level,
      items: alive.map((i) => ({ ...i })),
      totalItems: alive.length,
      config: { retry_of: src.id, kind: 'all', count: alive.length },
    });
    return this.detail(user, s.id);
  }

  // =================== Làm lại một lỗi (G07) ===================

  async retryMistake(
    user: AuthenticatedUser,
    dto: { type: 'ex' | 'q'; id: number },
  ): Promise<GrammarSessionDto> {
    let item: Item;
    const practiceSessions: Record<string, string> = {};
    if (dto.type === 'ex') {
      const m = await this.repo.findMistake(user.id, dto.id);
      const ex = await this.repo.findExercise(dto.id);
      if (!m || m.deletedAt || !ex)
        throw new NotFoundException({
          code: 'MISTAKE_NOT_FOUND',
          message: 'Không tìm thấy lỗi',
        });
      if (!ex.active)
        throw new ConflictException({
          code: 'ITEM_UNAVAILABLE',
          message: 'Câu không còn khả dụng',
        });
      item = { type: 'ex', id: ex.id, topic_id: ex.topicId };
    } else {
      const rows = await this.repo.toeicMistakes(user.id);
      const row = rows.find((r) => r.questionId === dto.id);
      if (!row)
        throw new NotFoundException({
          code: 'MISTAKE_NOT_FOUND',
          message: 'Không tìm thấy lỗi',
        });
      const ps = await this.practice.createGrammarReviewSession(
        user,
        [row.questionId],
        'Ngữ pháp · Làm lại lỗi',
        { grammar_topic_id: row.topicId },
      );
      if (!ps)
        throw new UnprocessableEntityException({
          code: 'NOT_ACCESSIBLE',
          message: 'Câu thuộc đề bạn chưa có quyền',
          details: { available: 0 },
        });
      practiceSessions[String(row.questionId)] = ps.id;
      item = { type: 'q', id: row.questionId, topic_id: row.topicId };
    }
    const s = await this.repo.createSession({
      userId: user.id,
      kind: 'retry',
      topicId: item.topic_id,
      items: [{ ...item }],
      practiceSessions,
      totalItems: 1,
      config: {},
    });
    return this.detail(user, s.id);
  }

  // =================== Phiên ôn (G08) ===================

  async reviewSummary(user: AuthenticatedUser): Promise<ReviewSummaryDto> {
    const { info } = await this.mistakes.openByTopic(user.id);
    await this.mistakes.syncSchedule(user.id, info);
    const [topics, userTopics, active] = await Promise.all([
      this.grammar.visibleTopics(),
      this.repo.userTopics(user.id),
      this.repo.activeSession(user.id, 'review'),
    ]);
    const visible = new Map(topics.map((t) => [t.id, t]));
    const today = vnDate(this.now());
    const due = orderDueTopics(
      userTopics
        .filter(
          (u) =>
            visible.has(u.topicId) &&
            u.reviewStep !== null &&
            !u.reviewGraduated &&
            u.reviewDue &&
            u.reviewDue.toISOString().slice(0, 10) <= today,
        )
        .map((u) => ({
          topic_id: u.topicId,
          slug: visible.get(u.topicId)!.slug,
          name: visible.get(u.topicId)!.name,
          open: info.get(u.topicId)?.open ?? 0,
          due: u.reviewDue!.toISOString().slice(0, 10),
          last_review_at: u.reviewLastAt?.toISOString() ?? null,
          available: 0,
        })),
    );
    const first = due.slice(0, REVIEW_TOPICS_PER_SESSION);
    if (first.length) {
      const level = (await this.grammar.levelInfo(user)).level as Level;
      const testIds = [...(await this.analytics.accessibleTestIds(user))];
      for (const d of first) {
        d.available = (
          await this.planItems(user.id, d.topic_id, level, testIds)
        ).length;
      }
    }
    const items = first.reduce((s, d) => s + d.available, 0);
    const dueIds = new Set(due.map((d) => d.topic_id));
    return {
      due,
      due_count: due.length,
      est_minutes: Math.max(
        1,
        Math.round((items * SECONDS_PER_REVIEW_ITEM) / 60),
      ),
      extra_available: [...info.entries()].some(
        ([id, o]) => o.open > 0 && visible.has(id) && !dueIds.has(id),
      ),
      has_mistakes: [...info.entries()].some(
        ([id, o]) => o.open > 0 && visible.has(id),
      ),
      active_session_id: active?.id ?? null,
    };
  }

  /**
   * Câu cho một chủ điểm trong phiên ôn (tối đa 5): lỗi chưa sửa (sai nhiều lần, lâu chưa làm trước);
   * thiếu thì bù câu bài tập chưa làm ở cấp gợi ý, rồi câu TOEIC chưa làm cùng chủ điểm.
   */
  private async planItems(
    userId: string,
    topicId: number,
    level: Level,
    testIds: number[],
  ): Promise<Item[]> {
    const [ex, toeic] = await Promise.all([
      this.repo.exerciseMistakes(userId),
      this.repo.toeicMistakes(userId),
    ]);
    const exIds = ex
      .filter(
        (m) =>
          m.exercise.topicId === topicId &&
          m.exercise.active &&
          m.status !== 'fixed' &&
          (m.wrongCount > 0 || m.manual),
      )
      .map((m) => ({
        item: { type: 'ex' as const, id: m.exerciseId, topic_id: topicId },
        wrong: m.wrongCount,
        last: (m.answeredAt ?? m.lastWrongAt ?? m.createdAt).getTime(),
      }));
    const sources = await this.repo.questionSources(
      toeic.filter((m) => m.topicId === topicId).map((m) => m.questionId),
    );
    const allowed = new Set(testIds);
    const okQ = new Set(
      sources
        .filter((s) => s.sourceTestId !== null && allowed.has(s.sourceTestId))
        .map((s) => s.id),
    );
    const qIds = toeic
      .filter(
        (m) =>
          m.topicId === topicId &&
          m.status !== 'fixed' &&
          okQ.has(m.questionId),
      )
      .map((m) => ({
        item: { type: 'q' as const, id: m.questionId, topic_id: topicId },
        wrong: m.wrongCount,
        last: (m.lastWrongAt ?? m.createdAt).getTime(),
      }));
    const items = [...exIds, ...qIds]
      .sort((a, b) => b.wrong - a.wrong || a.last - b.last)
      .map((x) => x.item)
      .slice(0, REVIEW_ITEMS_PER_TOPIC);
    if (items.length < REVIEW_ITEMS_PER_TOPIC) {
      const pool = await this.repo.exercisePool(userId, topicId, level, [
        ...EXERCISE_KINDS,
      ]);
      const fresh = pickExercises(
        pool.filter((p) => !p.seen),
        REVIEW_ITEMS_PER_TOPIC - items.length,
        Math.random,
      );
      items.push(
        ...fresh.ids.map((id) => ({
          type: 'ex' as const,
          id,
          topic_id: topicId,
        })),
      );
    }
    if (items.length < REVIEW_ITEMS_PER_TOPIC) {
      const ids = await this.repo.unseenToeicIds(
        userId,
        topicId,
        testIds,
        difficultyForLevel(level),
        REVIEW_ITEMS_PER_TOPIC - items.length,
      );
      items.push(
        ...ids.map((id) => ({ type: 'q' as const, id, topic_id: topicId })),
      );
    }
    return items;
  }

  async startReview(
    user: AuthenticatedUser,
    dto: StartReviewDto,
  ): Promise<GrammarSessionDto> {
    const summary = await this.reviewSummary(user);
    const topics = await this.grammar.visibleTopics();
    const byId = new Map(topics.map((t) => [t.id, t]));
    let chosen: number[];
    const extra = dto.extra === true;
    if (extra) {
      const { info } = await this.mistakes.openByTopic(user.id);
      const dueIds = new Set(summary.due.map((d) => d.topic_id));
      chosen = [...info.entries()]
        .filter(([id, o]) => o.open > 0 && byId.has(id) && !dueIds.has(id))
        .sort((a, b) => b[1].open - a[1].open)
        .slice(0, REVIEW_TOPICS_PER_SESSION)
        .map(([id]) => id);
    } else {
      const due = summary.due.map((d) => d.topic_id);
      chosen = (
        dto.topic_ids?.length
          ? dto.topic_ids.filter((id) => due.includes(id))
          : due
      ).slice(0, REVIEW_TOPICS_PER_SESSION);
    }
    if (chosen.length === 0)
      throw new UnprocessableEntityException({
        code: 'NOTHING_TO_REVIEW',
        message: extra
          ? 'Không có chủ điểm nào để ôn thêm'
          : 'Hôm nay không có chủ điểm cần ôn',
        details: { available: 0 },
      });
    const levelInfo = await this.grammar.levelInfo(user);
    const testIds = [...(await this.analytics.accessibleTestIds(user))];
    const userTopics = new Map(
      (await this.repo.userTopics(user.id)).map((u) => [u.topicId, u]),
    );
    const items: Item[] = [];
    const skipped: Config['skipped'] = [];
    for (const id of chosen) {
      const level = (userTopics.get(id)?.chosenLevel ??
        levelInfo.level) as Level;
      const plan = await this.planItems(user.id, id, level, testIds);
      if (plan.length === 0) {
        skipped.push({
          topic_id: id,
          name: byId.get(id)!.name,
          reason:
            'Không còn câu khả dụng (câu TOEIC thuộc đề chưa mở khóa, chưa có câu bù)',
        });
        continue;
      }
      items.push(...plan);
    }
    if (items.length === 0)
      throw new UnprocessableEntityException({
        code: 'NOTHING_TO_REVIEW',
        message: 'Các chủ điểm đến hạn chưa có câu khả dụng',
        details: { available: 0, skipped },
      });
    const practiceSessions: Record<string, string> = {};
    for (const it of items.filter((i) => i.type === 'q')) {
      const ps = await this.practice.createGrammarReviewSession(
        user,
        [it.id],
        `Ôn ngữ pháp · ${byId.get(it.topic_id)!.name}`,
        { grammar_topic_id: it.topic_id },
      );
      if (ps) practiceSessions[String(it.id)] = ps.id;
    }
    const usable = items.filter(
      (i) => i.type === 'ex' || practiceSessions[String(i.id)],
    );
    const old = await this.repo.activeSession(user.id, 'review');
    if (old) await this.abandon(user, old.id);
    const s = await this.repo.createSession({
      userId: user.id,
      kind: 'review',
      items: usable.map((i) => ({ ...i })),
      practiceSessions,
      totalItems: usable.length,
      config: { extra, skipped, fixed: 0, topic_results: {} },
    });
    return this.detail(user, s.id);
  }

  // =================== Chi tiết, trả lời, nộp ===================

  async detail(
    user: AuthenticatedUser,
    id: string,
  ): Promise<GrammarSessionDto> {
    const s = await this.own(user.id, id);
    const items = itemsOf(s);
    const [answers, exercises, topics] = await Promise.all([
      this.repo.answers(s.id),
      this.repo.findExercises(
        items.filter((i) => i.type === 'ex').map((i) => i.id),
      ),
      this.repo.findTopicsByIds([...new Set(items.map((i) => i.topic_id))]),
    ]);
    const exById = new Map(exercises.map((e) => [e.id, e]));
    const topicById = new Map(topics.map((t) => [t.id, t]));
    const ansByIndex = new Map(answers.map((a) => [a.itemIndex, a]));
    const ps = practiceMap(s);
    const savedIds = new Set(
      (await this.repo.exerciseMistakes(user.id)).map((m) => m.exerciseId),
    );

    const out: SessionItemDto[] = [];
    for (const [index, it] of items.entries()) {
      const t = topicById.get(it.topic_id);
      const a = ansByIndex.get(index);
      let exercise: SessionItemDto['exercise'] = null;
      let question: SessionItemDto['question'] = null;
      let feedback: ItemFeedbackDto | null = null;
      if (it.type === 'ex') {
        const e = exById.get(it.id);
        if (e) {
          exercise = toExerciseView(e);
          if (a) feedback = this.exerciseFeedback(e, a.isCorrect, a.response);
        }
      } else if (ps[String(it.id)]) {
        const d = await this.practice
          .detail(user, ps[String(it.id)])
          .catch(() => null);
        const q = d?.questions.find((x) => x.id === it.id) ?? null;
        if (q) {
          const { feedback: fb, ...rest } = q as typeof q & {
            feedback?: Record<string, unknown> | null;
          };
          question = rest;
          if (a)
            feedback = {
              correct: a.isCorrect,
              response: a.response,
              correct_choice: null,
              accepted: [],
              explanation: (fb?.explanation as string | null) ?? null,
              lesson_section: null,
              toeic: fb ?? null,
            };
        }
      }
      out.push({
        index,
        type: it.type,
        topic_id: it.topic_id,
        topic_slug: t?.slug ?? '',
        topic_name: t?.name ?? '',
        exercise,
        question,
        feedback,
        saved: it.type === 'ex' && savedIds.has(it.id),
      });
    }

    const recap: GrammarSessionDto['recap'] = {};
    if (s.kind === 'review') {
      const topicIds = [...new Set(items.map((i) => i.topic_id))];
      const formulas = await this.repo.formulasOf(topicIds);
      const exM = await this.repo.exerciseMistakes(user.id);
      const qNotes = await this.repo.questionNotes(user.id);
      const qTopic = new Map(
        (await this.repo.questionTopicsOf(qNotes.map((n) => n.questionId))).map(
          (r) => [r.id, r.grammarTopicId],
        ),
      );
      for (const tid of topicIds) {
        const t = topicById.get(tid);
        const lesson = t ? lessonOf(t) : null;
        const mistakes = Array.isArray(lesson?.mistakes)
          ? (lesson.mistakes as unknown[]).slice(0, 2)
          : [];
        recap[String(tid)] = {
          formulas: formulas.filter((f) => f.topicId === tid).map(toFormulaDto),
          mistakes,
          notes: [
            ...exM
              .filter((m) => m.exercise.topicId === tid && m.note)
              .map((m) => m.note!),
            ...qNotes
              .filter((n) => qTopic.get(n.questionId) === tid)
              .map((n) => n.note),
          ].slice(0, 5),
        };
      }
    }
    const topic = s.topicId
      ? (topicById.get(s.topicId) ?? (await this.repo.findTopic(s.topicId)))
      : null;
    return {
      id: s.id,
      kind: s.kind,
      topic: topic
        ? { id: topic.id, slug: topic.slug, name: topic.name }
        : null,
      level: s.level,
      status: s.status,
      total: s.totalItems,
      answered: answers.length,
      correct: answers.filter((a) => a.isCorrect).length,
      started_at: s.startedAt.toISOString(),
      items: out,
      config: publicConfig(s),
      recap,
    };
  }

  private exerciseFeedback(
    e: {
      kind: string;
      answerIndex: number | null;
      acceptedAnswers: string[];
      explanation: string | null;
      lessonSection: string | null;
    },
    correct: boolean,
    response: string | null,
  ): ItemFeedbackDto {
    return {
      correct,
      response,
      correct_choice: e.kind === 'fill' ? null : e.answerIndex,
      accepted: e.kind === 'fill' ? e.acceptedAnswers : [],
      explanation: e.explanation,
      lesson_section: e.lessonSection,
      toeic: null,
    };
  }

  async answer(
    user: AuthenticatedUser,
    id: string,
    dto: AnswerItemDto,
  ): Promise<ItemFeedbackDto & { topic_result: TopicResult | null }> {
    const s = await this.own(user.id, id);
    if (s.status !== 'in_progress')
      throw new ConflictException({
        code: 'SESSION_CLOSED',
        message: 'Lượt đã kết thúc',
      });
    const items = itemsOf(s);
    const it = items[dto.index];
    if (!it)
      throw new UnprocessableEntityException({
        code: 'INVALID_ANSWER',
        message: 'Câu không hợp lệ',
      });
    const answers = await this.repo.answers(s.id);
    if (answers.some((a) => a.itemIndex === dto.index))
      throw new ConflictException({
        code: 'ANSWER_LOCKED',
        message: 'Câu này đã chốt đáp án',
      });
    const now = this.now();
    const cfg = configOf(s);
    let feedback: ItemFeedbackDto;
    if (it.type === 'ex') {
      const e = await this.repo.findExercise(it.id);
      if (!e)
        throw new ConflictException({
          code: 'ITEM_UNAVAILABLE',
          message: 'Câu không còn khả dụng',
        });
      const response =
        e.kind === 'fill'
          ? (dto.text ?? '').trim()
          : dto.choice !== undefined
            ? String(dto.choice)
            : null;
      if (response === null || response === '')
        throw new UnprocessableEntityException({
          code: 'INVALID_ANSWER',
          message: 'Chưa có câu trả lời',
        });
      const correct = checkExercise(
        {
          kind: e.kind as ExerciseKind,
          answerIndex: e.answerIndex,
          acceptedAnswers: e.acceptedAnswers,
        },
        { choice: dto.choice ?? null, text: dto.text ?? null },
      );
      await this.repo.createAnswer({
        sessionId: s.id,
        itemIndex: dto.index,
        itemType: 'ex',
        itemId: e.id,
        topicId: it.topic_id,
        response,
        isCorrect: correct,
      });
      const fixed = await this.mistakes.recordExercise(
        user.id,
        e,
        correct,
        response,
        now,
      );
      if (fixed) cfg.fixed = (cfg.fixed ?? 0) + 1;
      feedback = this.exerciseFeedback(e, correct, response);
    } else {
      const psId = practiceMap(s)[String(it.id)];
      if (!psId || dto.answer_id === undefined)
        throw new UnprocessableEntityException({
          code: 'INVALID_ANSWER',
          message: 'Chưa chọn đáp án',
        });
      const before = await this.repo.mistakeItemsFor(user.id, [it.id]);
      const saved = await this.practice.saveAnswer(user, psId, {
        question_id: it.id,
        selected_answer_id: dto.answer_id,
      });
      await this.practice.submit(user, psId);
      const fb = saved.feedback as unknown as Record<string, unknown> | null;
      const correct = fb?.is_correct === true;
      await this.repo.createAnswer({
        sessionId: s.id,
        itemIndex: dto.index,
        itemType: 'q',
        itemId: it.id,
        topicId: it.topic_id,
        response: String(dto.answer_id),
        isCorrect: correct,
      });
      const after = await this.repo.mistakeItemsFor(user.id, [it.id]);
      if (
        correct &&
        before[0] &&
        before[0].status !== 'fixed' &&
        after[0]?.status === 'fixed'
      )
        cfg.fixed = (cfg.fixed ?? 0) + 1;
      feedback = {
        correct,
        response: String(dto.answer_id),
        correct_choice: null,
        accepted: [],
        explanation: (fb?.explanation as string | null) ?? null,
        lesson_section: null,
        toeic: fb,
      };
    }

    // Phiên ôn: làm xong mọi câu của một chủ điểm → cập nhật lịch ôn chủ điểm đó
    let topicResult: TopicResult | null = null;
    if (s.kind === 'review') {
      const done = [
        ...answers,
        { itemIndex: dto.index, isCorrect: feedback.correct },
      ];
      const idx = items
        .map((x, i) => ({ x, i }))
        .filter(({ x }) => x.topic_id === it.topic_id)
        .map(({ i }) => i);
      if (idx.every((i) => done.some((a) => a.itemIndex === i))) {
        const correct = done.filter(
          (a) => idx.includes(a.itemIndex) && a.isCorrect,
        ).length;
        topicResult = await this.applySchedule(
          user.id,
          it.topic_id,
          correct,
          idx.length,
          cfg.extra === true,
        );
        cfg.topic_results = {
          ...(cfg.topic_results ?? {}),
          [String(it.topic_id)]: topicResult,
        };
      }
    }
    await this.repo.updateSession(s.id, { config: cfg as object });
    return { ...feedback, topic_result: topicResult };
  }

  private async applySchedule(
    userId: string,
    topicId: number,
    correct: number,
    total: number,
    extraSession: boolean,
  ): Promise<TopicResult> {
    const now = this.now();
    const today = vnDate(now);
    const { info } = await this.mistakes.openByTopic(userId);
    await this.mistakes.syncSchedule(userId, info);
    const u = await this.repo.userTopic(userId, topicId);
    const due = u?.reviewDue ? u.reviewDue.toISOString().slice(0, 10) : null;
    const state = {
      step: u?.reviewStep ?? null,
      due,
      goodStreak: u?.reviewGoodStreak ?? 0,
      graduated: u?.reviewGraduated ?? false,
    };
    const percent = Math.round((correct / total) * 100);
    // "Ôn thêm" chỉ tính là ôn thêm khi chủ điểm chưa đến hạn
    const extra = extraSession && (!due || due > today);
    const allFixed = (info.get(topicId)?.open ?? 0) === 0;
    const next =
      state.step === null && !state.graduated && allFixed
        ? state
        : afterReview(
            state.step === null ? { ...state, step: 0 } : state,
            percent,
            allFixed,
            today,
            extra,
          );
    const rescheduled = next !== state;
    await this.repo.upsertUserTopic(userId, topicId, {
      reviewStep: next.step,
      reviewDue: next.due ? new Date(`${next.due}T00:00:00Z`) : null,
      reviewGoodStreak: next.goodStreak,
      reviewGraduated: next.graduated,
      reviewLastAt: now,
      reviewLastScore: percent,
    });
    return {
      correct,
      total,
      next_due: next.due,
      graduated: next.graduated,
      rescheduled,
    };
  }

  async finish(user: AuthenticatedUser, id: string): Promise<SessionResultDto> {
    const s = await this.own(user.id, id);
    const cfg = configOf(s);
    if (s.status === 'submitted' && cfg.result)
      return { ...cfg.result, xp_new: false };
    if (s.status !== 'in_progress')
      throw new ConflictException({
        code: 'SESSION_CLOSED',
        message: 'Lượt đã bị bỏ',
      });
    const items = itemsOf(s);
    const answers = await this.repo.answers(s.id);
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = s.totalItems;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const ansIdx = new Map(answers.map((a) => [a.itemIndex, a]));
    const wrong = items
      .map((_, i) => i)
      .filter((i) => !ansIdx.get(i)?.isCorrect);
    // Câu TOEIC chưa trả lời: bỏ lượt practice tương ứng (không tính là bỏ trống)
    for (const [qid, psId] of Object.entries(practiceMap(s))) {
      if (!answers.some((a) => a.itemType === 'q' && a.itemId === Number(qid)))
        await this.practice.abandon(user, psId).catch(() => undefined);
    }
    let xp = 0;
    let hint: SessionResultDto['level_hint'] = null;
    if (s.kind === 'exercise') {
      xp = answers.length ? exerciseXp(correct) : 0;
      const prev = (
        await this.repo.exerciseResults(user.id, s.topicId ?? undefined)
      ).find((r) => r.id !== s.id && r.level === s.level);
      const prevPct =
        prev && prev.totalItems
          ? Math.round(((prev.correctCount ?? 0) / prev.totalItems) * 100)
          : null;
      const h =
        s.level && LEVELS.includes(s.level as Level)
          ? levelHint(s.level as Level, percent, prevPct)
          : null;
      hint = h ? { type: h.type, from: s.level!, to: h.to } : null;
    } else if (s.kind === 'review') {
      xp = reviewXp(answers.length);
    }
    const topicIds = [...new Set(items.map((i) => i.topic_id))];
    const topics = await this.repo.findTopicsByIds(topicIds);
    const topicResults = topicIds.map((tid) => {
      const t = topics.find((x) => x.id === tid);
      const r = cfg.topic_results?.[String(tid)];
      const idx = items
        .map((x, i) => ({ x, i }))
        .filter(({ x }) => x.topic_id === tid)
        .map(({ i }) => i);
      return {
        topic_id: tid,
        slug: t?.slug ?? '',
        name: t?.name ?? '',
        correct: idx.filter((i) => ansIdx.get(i)?.isCorrect).length,
        total: idx.length,
        next_due: r?.next_due ?? null,
        graduated: r?.graduated ?? false,
        rescheduled: r?.rescheduled ?? false,
      };
    });
    const topic = s.topicId
      ? (topics.find((t) => t.id === s.topicId) ?? null)
      : null;
    const result: Omit<SessionResultDto, 'xp_new'> = {
      id: s.id,
      kind: s.kind,
      total,
      correct,
      percent,
      time_seconds: Math.round(
        (this.now().getTime() - s.startedAt.getTime()) / 1000,
      ),
      xp,
      wrong_indexes: wrong,
      level_hint: hint,
      topics: topicResults,
      fixed_count: cfg.fixed ?? 0,
      topic: topic ? { slug: topic.slug, name: topic.name } : null,
      level: s.level,
    };
    await this.repo.updateSession(s.id, {
      status: 'submitted',
      submittedAt: this.now(),
      correctCount: correct,
      xp,
      config: { ...cfg, result } as object,
    });
    return { ...result, xp_new: xp > 0 };
  }

  async abandon(user: AuthenticatedUser, id: string): Promise<void> {
    const s = await this.own(user.id, id);
    if (s.status !== 'in_progress') return;
    const answers = await this.repo.answers(s.id);
    for (const [qid, psId] of Object.entries(practiceMap(s))) {
      if (!answers.some((a) => a.itemType === 'q' && a.itemId === Number(qid)))
        await this.practice.abandon(user, psId).catch(() => undefined);
    }
    await this.repo.updateSession(s.id, { status: 'abandoned' });
  }

  async activeReviewId(userId: string) {
    return (await this.repo.activeSession(userId, 'review'))?.id ?? null;
  }

  private async own(userId: string, id: string): Promise<GrammarSession> {
    const s = /^[0-9a-f-]{36}$/i.test(id)
      ? await this.repo.findSession(id)
      : null;
    if (!s || s.userId !== userId)
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy lượt',
      });
    return s;
  }

  async visibleTopicIds(): Promise<Set<number>> {
    return new Set(
      (await this.repo.listTopics(false)).filter(isVisible).map((t) => t.id),
    );
  }
}

function itemsOf(s: GrammarSession): Item[] {
  return Array.isArray(s.items) ? (s.items as unknown as Item[]) : [];
}

function practiceMap(s: GrammarSession): Record<string, string> {
  return s.practiceSessions && typeof s.practiceSessions === 'object'
    ? (s.practiceSessions as Record<string, string>)
    : {};
}

function configOf(s: GrammarSession): Config {
  return s.config && typeof s.config === 'object'
    ? { ...(s.config as Config) }
    : {};
}

function publicConfig(s: GrammarSession): Record<string, unknown> {
  const c = configOf(s);
  return {
    count: c.count ?? null,
    kind: c.kind ?? null,
    extra: c.extra ?? false,
    exhausted: c.exhausted ?? false,
    skipped: c.skipped ?? [],
    topic_results: c.topic_results ?? {},
  };
}
