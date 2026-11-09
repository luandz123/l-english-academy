import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PracticeSession } from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import {
  ActiveSessionDto,
  CreateSessionDto,
  DailyChallengeDto,
  PartBreakdownDto,
  PracticeCatalogDto,
  SaveAnswerDto,
  SaveAnswerResultDto,
  SessionDetailDto,
  SessionResultDto,
  SessionSummaryDto,
} from './dto/practice.dto';
import { MistakesRepository } from './mistakes.repository';
import { MistakesService } from './mistakes.service';
import { PracticeAccessService } from './practice-access.service';
import { categoryLabel, PracticeMapper } from './practice.mapper';
import {
  PracticeRepository,
  type PoolFilter,
  type QuestionContent,
} from './practice.repository';
import {
  autoTimeLimitSeconds,
  dailyFocusParts,
  hashSeed,
  pickQuestions,
  seededRandom,
  vietnamDate,
  weakCategories,
} from './practice-rules';
import {
  isValidCategory,
  isValidPassageType,
  LISTENING_PARTS,
  PARTS,
  PASSAGE_TYPES,
  partDef,
  READING_PARTS,
} from './question-categories';
import { QuestionTaggingService } from './question-tagging.service';

const MINI_TEST_COUNTS = [5, 10, 15, 20, 30];
const DAILY_PER_SKILL = 5;
const MAX_SESSION_QUESTIONS = 100;
const SUBMIT_GRACE_SECONDS = 120;

/**
 * Lượt luyện dùng chung cho E03/L02/R02 (theo dạng câu), E04 (Mini Test + Daily Challenge),
 * luyện câu sai và luyện lại. Server chọn câu (theo quyền đề nguồn), giữ đáp án, chấm điểm,
 * ghi sổ câu sai. Client chỉ gửi lựa chọn.
 */
@Injectable()
export class PracticeService {
  constructor(
    private readonly repo: PracticeRepository,
    private readonly mistakesRepo: MistakesRepository,
    private readonly mistakes: MistakesService,
    private readonly access: PracticeAccessService,
    private readonly mapper: PracticeMapper,
    private readonly tagging: QuestionTaggingService,
  ) {}

  // ---------------- Danh mục ----------------

  async catalog(user: AuthenticatedUser): Promise<PracticeCatalogDto> {
    await this.tagging.ensureTagged();
    const testIds = [...(await this.access.accessibleTestIds(user))];
    const counts = await this.repo.countPool(testIds);
    return {
      parts: PARTS.map((p) => ({
        part: p.part,
        skill: p.skill,
        name: p.name,
        categories: p.categories,
      })),
      passage_types: PASSAGE_TYPES,
      counts: counts
        .filter((c) => c.part >= 1 && c.part <= 7)
        .map((c) => ({
          part: c.part,
          category: c.category,
          passage_type: c.passageType,
          difficulty: c.difficulty,
          count: c.count,
        })),
    };
  }

  // ---------------- Tạo lượt ----------------

  async create(
    user: AuthenticatedUser,
    dto: CreateSessionDto,
  ): Promise<SessionSummaryDto> {
    await this.tagging.ensureTagged();
    switch (dto.kind) {
      case 'question_type':
        return this.createQuestionType(user, dto);
      case 'mini_test':
        return this.createMiniTest(user, dto);
      case 'mistakes':
        return this.createMistakes(user, dto);
      case 'retry':
        return this.createRetry(user, dto);
    }
  }

  private async createQuestionType(
    user: AuthenticatedUser,
    dto: CreateSessionDto,
  ) {
    const part = dto.parts?.length === 1 ? dto.parts[0] : null;
    if (part === null)
      throw this.invalid('Luyện theo dạng câu cần chọn đúng một Part');
    const categories = dto.categories ?? [];
    if (categories.length === 0)
      throw this.invalid('Chọn ít nhất một dạng câu hỏi');
    if (categories.some((c) => !isValidCategory(part, c)))
      throw this.invalid('Dạng câu hỏi không hợp lệ');
    const passageTypes = part === 7 ? (dto.passage_types ?? []) : [];
    if (passageTypes.some((p) => !isValidPassageType(p)))
      throw this.invalid('Loại văn bản không hợp lệ');
    const count = this.requireCount(dto.count);

    const testIds = [...(await this.access.accessibleTestIds(user))];
    const pool = await this.repo.findPool({
      testIds,
      parts: [part],
      categories,
      passageTypes,
      difficulty: this.difficulty(dto),
    });
    const ids = this.pickOrFail(
      pool,
      count,
      dto.order ?? 'random',
      Math.random,
    );
    const def = partDef(part)!;
    const labels = categories.map((c) => categoryLabel(part, c)).join(', ');
    return this.persist(user.id, dto, {
      kind: 'question_type',
      skill: def.skill,
      ids,
      title: `Part ${part} · ${labels}`,
      parts: [part],
    });
  }

  private async createMiniTest(user: AuthenticatedUser, dto: CreateSessionDto) {
    const count = dto.count ?? 0;
    if (!MINI_TEST_COUNTS.includes(count))
      throw this.invalid('Mini Test có 5, 10, 15, 20 hoặc 30 câu');
    let parts: number[];
    let title: string;
    if (dto.parts?.length === 1) {
      parts = dto.parts;
      title = `Mini Test Part ${parts[0]}`;
    } else if (!dto.parts?.length && dto.skill) {
      parts = dto.skill === 'listening' ? LISTENING_PARTS : READING_PARTS;
      title = `Mini Test ${dto.skill === 'listening' ? 'Listening' : 'Reading'}`;
    } else {
      throw this.invalid('Chọn kỹ năng (Listening/Reading) hoặc một Part');
    }
    const testIds = [...(await this.access.accessibleTestIds(user))];
    const pool = await this.repo.findPool({
      testIds,
      parts,
      difficulty: this.difficulty(dto),
    });
    const ids = this.pickOrFail(pool, count, 'random', Math.random);
    // Theo kỹ năng: xếp lại theo Part như đề thật
    const partOf = new Map(pool.map((p) => [p.id, p.toeicPart ?? 0]));
    const ordered =
      parts.length > 1 ? stableSortBy(ids, (id) => partOf.get(id) ?? 0) : ids;
    return this.persist(
      user.id,
      { ...dto, order: 'random' },
      {
        kind: 'mini_test',
        skill: parts[0] <= 4 ? 'listening' : 'reading',
        ids: ordered,
        title: `${title} · ${count} câu`,
        parts,
      },
    );
  }

  private async createMistakes(user: AuthenticatedUser, dto: CreateSessionDto) {
    const ids = await this.mistakes.questionIdsFor(
      user.id,
      dto.mistake_filter ?? {},
    );
    if (ids.length === 0) {
      throw new UnprocessableEntityException({
        code: 'NO_MISTAKES',
        message: 'Không có câu nào khớp bộ lọc',
        details: { available: 0 },
      });
    }
    const content = await this.repo.findPool({
      testIds: [
        ...new Set(
          (await this.mistakesRepo.findQuestionSources(ids)).map(
            (s) => s.sourceTestId ?? -1,
          ),
        ),
      ],
      parts: [1, 2, 3, 4, 5, 6, 7],
    });
    // Câu trong sổ có thể không "luyện riêng được" (vd. audio cả Part) — vẫn cho luyện lại
    const poolById = new Map(content.map((p) => [p.id, p]));
    const pool = ids.map(
      (id) =>
        poolById.get(id) ?? {
          id,
          groupKey: null,
          sourceTestId: null,
          toeicPart: null,
          partIndex: null,
        },
    );
    const count = Math.min(
      dto.count ?? MAX_SESSION_QUESTIONS,
      MAX_SESSION_QUESTIONS,
      pool.length,
    );
    const picked = pickQuestions(
      pool,
      count,
      dto.order ?? 'random',
      Math.random,
    );
    const parts = await this.partsOf(picked);
    return this.persist(user.id, dto, {
      kind: 'mistakes',
      skill: skillOf(parts),
      ids: picked,
      title: `Luyện câu sai · ${picked.length} câu`,
      parts,
    });
  }

  private async createRetry(user: AuthenticatedUser, dto: CreateSessionDto) {
    if (!dto.source_session_id) throw this.invalid('Thiếu lượt luyện nguồn');
    const source = await this.ownSession(user.id, dto.source_session_id);
    if (source.status !== 'submitted')
      throw this.invalid('Lượt nguồn chưa nộp bài');
    const answers = await this.repo.findAnswers(source.id);
    const correct = new Set(
      answers.filter((a) => a.isCorrect === true).map((a) => a.questionId),
    );
    const ids = source.questionIds.filter((id) => !correct.has(id));
    if (ids.length === 0) {
      throw new UnprocessableEntityException({
        code: 'NOTHING_TO_RETRY',
        message: 'Lượt này không có câu sai hoặc bỏ trống',
        details: { available: 0 },
      });
    }
    const parts = await this.partsOf(ids);
    const config = (source.config ?? {}) as Record<string, unknown>;
    return this.persist(user.id, dto, {
      kind: 'retry',
      skill: source.skill,
      ids,
      title:
        `Luyện lại câu sai · ${typeof config.title === 'string' ? config.title : ''}`.trim(),
      parts,
      extra: { source_session_id: source.id },
    });
  }

  private async persist(
    userId: string,
    dto: CreateSessionDto,
    s: {
      kind: string;
      skill: string;
      ids: number[];
      title: string;
      parts: number[];
      dailyDate?: Date;
      extra?: Record<string, unknown>;
    },
  ): Promise<SessionSummaryDto> {
    const mode = dto.mode;
    const feedback =
      mode === 'practice' ? (dto.feedback ?? 'immediate') : 'end';
    const partsOfQuestions = await this.partsOfEach(s.ids);
    let timeLimit: number | null;
    if (dto.time_limit_minutes === 0) timeLimit = null;
    else if (dto.time_limit_minutes) timeLimit = dto.time_limit_minutes * 60;
    else
      timeLimit =
        mode === 'test' || s.kind === 'mini_test'
          ? autoTimeLimitSeconds(partsOfQuestions)
          : null;

    const session = await this.repo.createSession({
      userId,
      kind: s.kind,
      skill: s.skill,
      mode,
      feedback,
      questionIds: s.ids,
      totalQuestions: s.ids.length,
      timeLimitSeconds: timeLimit,
      dailyDate: s.dailyDate ?? null,
      config: {
        title: s.title,
        parts: s.parts,
        categories: dto.categories ?? [],
        passage_types: dto.passage_types ?? [],
        difficulty: dto.difficulty ?? 'all',
        count: dto.count ?? s.ids.length,
        order: dto.order ?? 'random',
        skill: dto.skill ?? null,
        time_limit_minutes: dto.time_limit_minutes ?? null,
        mistake_filter: dto.mistake_filter ? { ...dto.mistake_filter } : null,
        ...(s.extra ?? {}),
      },
    });
    return this.mapper.toSummary(session, 0);
  }

  // ---------------- Daily Challenge ----------------

  async getDaily(user: AuthenticatedUser): Promise<DailyChallengeDto> {
    const date = vietnamDate(new Date());
    const session = await this.repo.findDaily(user.id, new Date(date));
    const focus = dailyFocusParts(date);
    return {
      date,
      session: session ? await this.summary(session) : null,
      focus_listening_part: focus.listening,
      focus_reading_part: focus.reading,
      streak: await this.dailyStreak(user.id, date),
    };
  }

  /** Lấy hoặc tạo Daily Challenge hôm nay (mỗi người một bài/ngày, giờ Việt Nam). */
  async startDaily(user: AuthenticatedUser): Promise<SessionSummaryDto> {
    await this.tagging.ensureTagged();
    const date = vietnamDate(new Date());
    const day = new Date(date);
    const existing = await this.repo.findDaily(user.id, day);
    if (existing) return this.summary(existing);

    const testIds = [...(await this.access.accessibleTestIds(user))];
    const since = new Date(day.getTime() - 7 * 86_400_000);
    const recent = new Set(
      (await this.repo.findRecentDailyQuestionIds(user.id, since)).flatMap(
        (r) => r.questionIds,
      ),
    );
    const weak = new Set(
      weakCategories(await this.repo.categoryStats(user.id)),
    );
    const focus = dailyFocusParts(date);
    const random = seededRandom(hashSeed(`${user.id}:${date}`));

    const pickSkill = async (parts: number[], focusPart: number) => {
      const pool = (await this.repo.findPool({ testIds, parts })).filter(
        (p) => !recent.has(p.id),
      );
      const preferred = new Set(
        pool
          .filter((p) =>
            weak.size > 0
              ? weak.has(`${p.toeicPart}:${p.questionCategory}`)
              : p.toeicPart === focusPart,
          )
          .map((p) => p.id),
      );
      return pickQuestions(pool, DAILY_PER_SKILL, 'random', random, preferred);
    };
    const listening = await pickSkill(LISTENING_PARTS, focus.listening);
    const reading = await pickSkill(READING_PARTS, focus.reading);
    const ids = [...listening, ...reading];
    if (ids.length === 0) {
      throw new UnprocessableEntityException({
        code: 'INSUFFICIENT_QUESTIONS',
        message: 'Chưa có câu hỏi nào để tạo Daily Challenge',
        details: { available: 0 },
      });
    }
    const [d, m] = [date.slice(8, 10), date.slice(5, 7)];
    try {
      return await this.persist(
        user.id,
        {
          kind: 'mini_test',
          mode: 'practice',
          feedback: 'immediate',
          time_limit_minutes: 0,
        },
        {
          kind: 'daily',
          skill: 'mixed',
          ids,
          title: `Daily Challenge ${d}/${m}`,
          parts: [...new Set(await this.partsOfEach(ids))].sort(),
          dailyDate: day,
          extra: { weak_focus: weak.size > 0 },
        },
      );
    } catch (err) {
      // Bấm hai lần cùng lúc: chỉ một lượt được tạo (unique index), trả lượt đã có
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const again = await this.repo.findDaily(user.id, day);
        if (again) return this.summary(again);
      }
      throw err;
    }
  }

  private async dailyStreak(userId: string, today: string): Promise<number> {
    const rows = await this.repo.findSubmittedDailyDates(userId);
    const done = new Set(
      rows.map((r) => r.dailyDate?.toISOString().slice(0, 10)),
    );
    let streak = 0;
    let cursor = new Date(today);
    if (!done.has(today)) cursor = new Date(cursor.getTime() - 86_400_000);
    while (done.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
    return streak;
  }

  // ---------------- Làm bài ----------------

  async active(userId: string): Promise<ActiveSessionDto> {
    const s = await this.repo.findActiveSession(userId);
    return { session: s ? await this.summary(s) : null };
  }

  async history(userId: string, limit: number): Promise<SessionSummaryDto[]> {
    const rows = await this.repo.findHistory(userId, limit);
    const counts = await this.repo.countAnswered(rows.map((r) => r.id));
    const byId = new Map(counts.map((c) => [c.sessionId, c._count._all]));
    return rows.map((r) => this.mapper.toSummary(r, byId.get(r.id) ?? 0));
  }

  async detail(user: AuthenticatedUser, id: string): Promise<SessionDetailDto> {
    const s = await this.ownSession(user.id, id);
    return this.buildDetail(user.id, s);
  }

  async saveAnswer(
    user: AuthenticatedUser,
    id: string,
    dto: SaveAnswerDto,
  ): Promise<SaveAnswerResultDto> {
    const s = await this.ownSession(user.id, id);
    if (s.status !== 'in_progress') {
      throw new ConflictException({
        code: 'SESSION_CLOSED',
        message: 'Lượt luyện đã kết thúc',
      });
    }
    if (!s.questionIds.includes(dto.question_id))
      throw this.invalidAnswer(dto.question_id);
    const [q] = await this.repo.findQuestionsContent([dto.question_id]);
    if (!q) throw this.invalidAnswer(dto.question_id);
    const selected = dto.selected_answer_id ?? null;
    if (selected !== null && !q.answers.some((a) => a.id === selected))
      throw this.invalidAnswer(dto.question_id);

    const existing = (await this.repo.findAnswers(s.id)).find(
      (a) => a.questionId === dto.question_id,
    );
    if (existing?.locked) {
      throw new ConflictException({
        code: 'ANSWER_LOCKED',
        message: 'Câu này đã chốt đáp án',
      });
    }
    const immediate =
      s.mode === 'practice' && s.feedback === 'immediate' && selected !== null;
    const isCorrect = immediate
      ? q.answers.find((a) => a.id === selected)?.isCorrect === true
      : null;
    await this.repo.upsertAnswer({
      sessionId: s.id,
      questionId: q.id,
      selectedAnswerId: selected,
      isCorrect,
      locked: immediate,
    });
    if (!immediate) return { saved: true, locked: false, feedback: null };

    const mates = q.groupKey
      ? await this.repo.findGroupMates([q.groupKey])
      : [];
    return {
      saved: true,
      locked: true,
      feedback: this.mapper.feedback(
        q,
        selected,
        this.mapper.context(q, mates).transcript,
      ),
    };
  }

  async submit(user: AuthenticatedUser, id: string): Promise<SessionResultDto> {
    const s = await this.ownSession(user.id, id);
    if (s.status === 'submitted') return this.result(user, id);
    if (s.status !== 'in_progress') {
      throw new ConflictException({
        code: 'SESSION_CLOSED',
        message: 'Lượt luyện đã bị bỏ',
      });
    }
    const [answers, questions] = await Promise.all([
      this.repo.findAnswers(s.id),
      this.repo.findQuestionsContent(s.questionIds),
    ]);
    const byQuestion = new Map(questions.map((q) => [q.id, q]));
    const selectedOf = new Map(
      answers.map((a) => [a.questionId, a.selectedAnswerId]),
    );
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const graded: { questionId: number; isCorrect: boolean | null }[] = [];
    const forNotebook: {
      questionId: number;
      selectedAnswerId: number | null;
      isCorrect: boolean;
    }[] = [];
    for (const qid of s.questionIds) {
      const q = byQuestion.get(qid);
      const selected = selectedOf.get(qid) ?? null;
      if (!q || selected === null) {
        unanswered++;
        if (selectedOf.has(qid))
          graded.push({ questionId: qid, isCorrect: null });
        continue;
      }
      const ok = q.answers.find((a) => a.id === selected)?.isCorrect === true;
      if (ok) correct++;
      else wrong++;
      graded.push({ questionId: qid, isCorrect: ok });
      forNotebook.push({
        questionId: qid,
        selectedAnswerId: selected,
        isCorrect: ok,
      });
    }
    const elapsed = Math.round((Date.now() - s.startedAt.getTime()) / 1000);
    const timeSpent = s.timeLimitSeconds
      ? Math.min(elapsed, s.timeLimitSeconds + SUBMIT_GRACE_SECONDS)
      : elapsed;

    const done = await this.repo.submitSession(s.id, graded, {
      correct,
      wrong,
      unanswered,
      timeSpentSeconds: timeSpent,
    });
    if (done) {
      await this.mistakes.recordAnswers(user.id, forNotebook, {
        source: 'practice',
        sourceId: s.id,
      });
    }
    return this.result(user, id);
  }

  async abandon(user: AuthenticatedUser, id: string): Promise<void> {
    const s = await this.ownSession(user.id, id);
    if (s.status !== 'in_progress') return;
    await this.repo.updateSession(s.id, { status: 'abandoned' });
  }

  async result(user: AuthenticatedUser, id: string): Promise<SessionResultDto> {
    const s = await this.ownSession(user.id, id);
    if (s.status !== 'submitted') {
      throw new ConflictException({
        code: 'SESSION_NOT_SUBMITTED',
        message: 'Lượt luyện chưa nộp bài',
      });
    }
    const detail = await this.buildDetail(user.id, s);
    const byPart = new Map<number, PartBreakdownDto>();
    const byCat = new Map<
      string,
      PartBreakdownDto & { category: string; label: string }
    >();
    for (const q of detail.questions) {
      const status =
        q.selected_answer_id === null
          ? 'unanswered'
          : q.feedback?.is_correct
            ? 'correct'
            : 'wrong';
      const p = byPart.get(q.part) ?? {
        part: q.part,
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
      };
      p.total++;
      p[status]++;
      byPart.set(q.part, p);
      const key = `${q.part}:${q.category ?? 'other'}`;
      const c = byCat.get(key) ?? {
        part: q.part,
        category: q.category ?? 'other',
        label: q.category_label ?? 'Khác',
        total: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
      };
      c.total++;
      c[status]++;
      byCat.set(key, c);
    }
    const total = s.totalQuestions || 1;
    return {
      ...detail,
      accuracy: Math.round(((s.correctCount ?? 0) / total) * 100),
      average_seconds_per_question:
        s.timeSpentSeconds !== null && s.totalQuestions > 0
          ? Math.round(s.timeSpentSeconds / s.totalQuestions)
          : null,
      by_part: [...byPart.values()].sort((a, b) => a.part - b.part),
      by_category: [...byCat.values()].sort(
        (a, b) => a.part - b.part || b.wrong - a.wrong,
      ),
    };
  }

  // ---------------- Nội bộ ----------------

  private async buildDetail(
    userId: string,
    s: PracticeSession,
  ): Promise<SessionDetailDto> {
    const [answers, questions, bookmarked] = await Promise.all([
      this.repo.findAnswers(s.id),
      this.repo.findQuestionsContent(s.questionIds),
      this.mistakesRepo.bookmarkedIds(userId),
    ]);
    const groupKeys = [
      ...new Set(
        questions.map((q) => q.groupKey).filter((k): k is string => !!k),
      ),
    ];
    const testIds = [
      ...new Set(
        questions
          .map((q) => q.sourceTestId)
          .filter((k): k is number => k !== null),
      ),
    ];
    const [mates, titles] = await Promise.all([
      this.repo.findGroupMates(groupKeys),
      this.repo.findTestTitles(testIds),
    ]);
    const titleById = new Map(titles.map((t) => [t.id, t.title]));
    const byId = new Map<number, QuestionContent>(
      questions.map((q) => [q.id, q]),
    );
    const answerOf = new Map(answers.map((a) => [a.questionId, a]));
    const bookmarkSet = new Set(bookmarked);
    const submitted = s.status === 'submitted';

    const list = s.questionIds
      .map((qid) => byId.get(qid))
      .filter((q): q is QuestionContent => !!q)
      .map((q) => {
        const a = answerOf.get(q.id);
        return this.mapper.toSessionQuestion(q, mates, titleById, {
          selectedAnswerId: a?.selectedAnswerId ?? null,
          reveal: submitted || a?.locked === true,
          bookmarked: bookmarkSet.has(q.id),
        });
      });
    const answered = answers.filter((a) => a.selectedAnswerId !== null).length;
    const remaining =
      s.timeLimitSeconds && s.status === 'in_progress'
        ? Math.max(
            0,
            s.timeLimitSeconds -
              Math.round((Date.now() - s.startedAt.getTime()) / 1000),
          )
        : null;
    return {
      ...this.mapper.toSummary(s, answered),
      questions: list,
      remaining_seconds: remaining,
    };
  }

  private async summary(s: PracticeSession): Promise<SessionSummaryDto> {
    const counts = await this.repo.countAnswered([s.id]);
    return this.mapper.toSummary(s, counts[0]?._count._all ?? 0);
  }

  private async ownSession(
    userId: string,
    id: string,
  ): Promise<PracticeSession> {
    const s = await this.repo.findSession(id);
    if (!s || s.userId !== userId) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy lượt luyện',
      });
    }
    return s;
  }

  private async partsOfEach(ids: number[]): Promise<number[]> {
    const qs = await this.repo.findQuestionsContent(ids);
    const byId = new Map(qs.map((q) => [q.id, q.toeicPart ?? 5]));
    return ids.map((id) => byId.get(id) ?? 5);
  }

  private async partsOf(ids: number[]): Promise<number[]> {
    return [...new Set(await this.partsOfEach(ids))].sort((a, b) => a - b);
  }

  private difficulty(dto: CreateSessionDto): PoolFilter['difficulty'] {
    return !dto.difficulty || dto.difficulty === 'all'
      ? undefined
      : dto.difficulty;
  }

  private requireCount(count: number | undefined): number {
    if (!count) throw this.invalid('Chọn số câu');
    return Math.min(count, MAX_SESSION_QUESTIONS);
  }

  private pickOrFail(
    pool: Parameters<typeof pickQuestions>[0],
    count: number,
    order: 'random' | 'sequential',
    random: () => number,
  ): number[] {
    const available = new Set(pool.map((p) => p.id)).size;
    if (available < count) {
      throw new UnprocessableEntityException({
        code: 'INSUFFICIENT_QUESTIONS',
        message:
          available === 0
            ? 'Chưa có câu hỏi phù hợp với lựa chọn này'
            : `Chỉ có ${available} câu phù hợp. Hãy chọn tối đa ${available} câu.`,
        details: { available },
      });
    }
    return pickQuestions(pool, count, order, random);
  }

  private invalid(message: string): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_PRACTICE_CONFIG',
      message,
    });
  }

  private invalidAnswer(questionId: number): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_ANSWER',
      message: `Câu trả lời không hợp lệ (câu ${questionId})`,
    });
  }
}

function skillOf(parts: number[]): string {
  const l = parts.some((p) => p <= 4);
  const r = parts.some((p) => p >= 5);
  return l && r ? 'mixed' : l ? 'listening' : 'reading';
}

function stableSortBy<T>(items: T[], key: (t: T) => number): T[] {
  return items
    .map((t, i) => ({ t, i, k: key(t) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.t);
}
