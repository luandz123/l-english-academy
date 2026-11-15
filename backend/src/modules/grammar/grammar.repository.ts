import { Injectable } from '@nestjs/common';
import type {
  GrammarExercise,
  GrammarFormula,
  GrammarMistake,
  GrammarSession,
  GrammarTopic,
  UserGrammarTopic,
} from '../../generated/prisma/client';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TopicWithCounts = GrammarTopic & {
  _count: { formulas: number; exercises: number };
};

export interface ToeicAnswer {
  topicId: number;
  correct: boolean;
  at: Date;
}

export interface ToeicMistakeRow {
  itemId: number;
  questionId: number;
  topicId: number;
  wrongCount: number;
  status: string;
  isBookmarked: boolean;
  lastWrongAt: Date | null;
  createdAt: Date;
  lastSelectedAnswerId: number | null;
}

/**
 * Bảng grammar_* + user_grammar_* + nhãn chủ điểm trên questions. Đọc chỉ-đọc lượt luyện, Full Test và
 * sổ câu sai (practice) để tính tỉ lệ đúng TOEIC theo chủ điểm và Sổ lỗi ngữ pháp — không ghi vào đó.
 */
@Injectable()
export class GrammarRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Chủ điểm ----------

  listTopics(includeHidden: boolean): Promise<TopicWithCounts[]> {
    return this.prisma.grammarTopic.findMany({
      where: includeHidden ? {} : { hidden: false },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        _count: {
          select: { formulas: true, exercises: { where: { active: true } } },
        },
      },
    });
  }

  findTopicBySlug(slug: string) {
    return this.prisma.grammarTopic.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { formulas: true, exercises: { where: { active: true } } },
        },
      },
    });
  }

  findTopic(id: number) {
    return this.prisma.grammarTopic.findUnique({ where: { id } });
  }

  findTopicsByIds(ids: number[]) {
    return this.prisma.grammarTopic.findMany({ where: { id: { in: ids } } });
  }

  createTopic(data: Prisma.GrammarTopicUncheckedCreateInput) {
    return this.prisma.grammarTopic.create({ data });
  }

  updateTopic(id: number, data: Prisma.GrammarTopicUncheckedUpdateInput) {
    return this.prisma.grammarTopic.update({ where: { id }, data });
  }

  slugExists(slug: string, exceptId?: number) {
    return this.prisma.grammarTopic
      .count({
        where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
      })
      .then((n) => n > 0);
  }

  // ---------- Công thức ----------

  formulasOf(topicIds: number[]): Promise<GrammarFormula[]> {
    return this.prisma.grammarFormula.findMany({
      where: { topicId: { in: topicIds } },
      orderBy: [{ topicId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findFormula(id: number) {
    return this.prisma.grammarFormula.findUnique({ where: { id } });
  }

  createFormula(data: Prisma.GrammarFormulaUncheckedCreateInput) {
    return this.prisma.grammarFormula.create({ data });
  }

  updateFormula(id: number, data: Prisma.GrammarFormulaUncheckedUpdateInput) {
    return this.prisma.grammarFormula.update({ where: { id }, data });
  }

  deleteFormula(id: number) {
    return this.prisma.grammarFormula.delete({ where: { id } });
  }

  // ---------- Bài tập ----------

  /** Số câu đang dùng theo chủ điểm × cấp × loại. */
  async exerciseCounts(topicIds?: number[]) {
    const rows = await this.prisma.grammarExercise.groupBy({
      by: ['topicId', 'level', 'kind'],
      where: {
        active: true,
        ...(topicIds ? { topicId: { in: topicIds } } : {}),
      },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      topicId: r.topicId,
      level: r.level,
      kind: r.kind,
      count: r._count._all,
    }));
  }

  /** Câu của chủ điểm ở cấp/loại, kèm cờ đã làm / từng sai của học viên. */
  async exercisePool(
    userId: string,
    topicId: number,
    level: string,
    kinds: string[],
  ): Promise<{ id: number; seen: boolean; wrong: boolean }[]> {
    const rows = await this.prisma.$queryRaw<
      { id: number; seen: boolean; wrong: boolean }[]
    >`
      SELECT e.id,
             EXISTS (SELECT 1 FROM grammar_answers a JOIN grammar_sessions s ON s.id = a.session_id
                     WHERE s.user_id = ${userId}::uuid AND a.item_type = 'ex' AND a.item_id = e.id) AS seen,
             EXISTS (SELECT 1 FROM grammar_mistakes m
                     WHERE m.user_id = ${userId}::uuid AND m.exercise_id = e.id AND m.wrong_count > 0) AS wrong
      FROM grammar_exercises e
      WHERE e.topic_id = ${topicId} AND e.level = ${level} AND e.active = true
        AND e.kind = ANY(${kinds}::text[])`;
    return rows;
  }

  findExercises(ids: number[]): Promise<GrammarExercise[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.grammarExercise.findMany({ where: { id: { in: ids } } });
  }

  listExercises(topicId: number) {
    return this.prisma.grammarExercise.findMany({
      where: { topicId },
      orderBy: [{ active: 'desc' }, { level: 'asc' }, { id: 'asc' }],
    });
  }

  createExercise(data: Prisma.GrammarExerciseUncheckedCreateInput) {
    return this.prisma.grammarExercise.create({ data });
  }

  createExercises(data: Prisma.GrammarExerciseCreateManyInput[]) {
    return this.prisma.grammarExercise.createMany({ data });
  }

  updateExercise(id: number, data: Prisma.GrammarExerciseUncheckedUpdateInput) {
    return this.prisma.grammarExercise.update({ where: { id }, data });
  }

  findExercise(id: number) {
    return this.prisma.grammarExercise.findUnique({ where: { id } });
  }

  // ---------- Câu TOEIC theo chủ điểm ----------

  /** Số câu Part 5/6 luyện được theo chủ điểm trong các đề có quyền (+ số đề). */
  async toeicCounts(testIds: number[]) {
    if (testIds.length === 0) return [];
    const rows = await this.prisma.$queryRaw<
      { topic_id: number; count: bigint; tests: bigint }[]
    >`
      SELECT grammar_topic_id AS topic_id, COUNT(*) AS count, COUNT(DISTINCT source_test_id) AS tests
      FROM questions
      WHERE grammar_topic_id IS NOT NULL AND practice_eligible = true
        AND toeic_part IN (5, 6) AND source_test_id = ANY(${testIds}::int[])
      GROUP BY grammar_topic_id`;
    return rows.map((r) => ({
      topicId: r.topic_id,
      count: Number(r.count),
      tests: Number(r.tests),
    }));
  }

  /** Tổng câu gắn chủ điểm (mọi đề) — để phân biệt "chưa có câu" với "cần mở khóa đề". */
  async toeicTotals() {
    const rows = await this.prisma.question.groupBy({
      by: ['grammarTopicId'],
      where: {
        grammarTopicId: { not: null },
        practiceEligible: true,
        toeicPart: { in: [5, 6] },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.grammarTopicId!, r._count._all]));
  }

  /**
   * Câu TOEIC có chủ điểm học viên đã trả lời (lượt luyện đã nộp + Full Test), mới nhất trước.
   * Cùng nguồn dữ liệu với Phân tích điểm yếu: câu bỏ trống tính là sai.
   */
  async toeicAnswers(userId: string): Promise<ToeicAnswer[]> {
    const rows = await this.prisma.$queryRaw<
      { topic_id: number; correct: boolean; at: Date }[]
    >`
      SELECT q.grammar_topic_id AS topic_id, COALESCE(pa.is_correct, false) AS correct, ps.submitted_at AS at
      FROM practice_sessions ps
      CROSS JOIN LATERAL unnest(ps.question_ids) AS qid(id)
      JOIN questions q ON q.id = qid.id
      LEFT JOIN practice_answers pa ON pa.session_id = ps.id AND pa.question_id = qid.id
      WHERE ps.user_id = ${userId}::uuid AND ps.status = 'submitted' AND ps.submitted_at IS NOT NULL
        AND q.grammar_topic_id IS NOT NULL
      UNION ALL
      SELECT q.grammar_topic_id, COALESCE(d.is_correct, false), r.completed_at
      FROM user_full_test_results r
      JOIN full_test_answer_details d ON d.result_id = r.id
      JOIN questions q ON q.id = d.question_id
      WHERE r.user_id = ${userId}::uuid AND r.completed_at IS NOT NULL AND q.grammar_topic_id IS NOT NULL
      ORDER BY at DESC`;
    return rows.map((r) => ({
      topicId: r.topic_id,
      correct: r.correct,
      at: r.at,
    }));
  }

  // ---------- Tiến độ học viên ----------

  userTopics(userId: string): Promise<UserGrammarTopic[]> {
    return this.prisma.userGrammarTopic.findMany({ where: { userId } });
  }

  userTopic(userId: string, topicId: number) {
    return this.prisma.userGrammarTopic.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });
  }

  upsertUserTopic(
    userId: string,
    topicId: number,
    data: Prisma.UserGrammarTopicUncheckedUpdateInput,
  ) {
    return this.prisma.userGrammarTopic.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: {
        userId,
        topicId,
        ...(data as Omit<
          Prisma.UserGrammarTopicUncheckedCreateInput,
          'userId' | 'topicId'
        >),
      },
      update: data,
    });
  }

  settings(userId: string) {
    return this.prisma.userGrammarSettings.findUnique({ where: { userId } });
  }

  upsertSettings(
    userId: string,
    data: Prisma.UserGrammarSettingsUncheckedUpdateInput,
  ) {
    return this.prisma.userGrammarSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...(data as Omit<
          Prisma.UserGrammarSettingsUncheckedCreateInput,
          'userId'
        >),
      },
      update: data,
    });
  }

  roadmapStart(userId: string) {
    return this.prisma.userRoadmap.findUnique({
      where: { userId },
      select: { currentScore: true },
    });
  }

  /** Điểm % các lượt bài tập chủ điểm đã nộp, mới nhất trước. */
  exerciseResults(userId: string, topicId?: number) {
    return this.prisma.grammarSession.findMany({
      where: {
        userId,
        kind: 'exercise',
        status: 'submitted',
        ...(topicId ? { topicId } : {}),
      },
      select: {
        id: true,
        topicId: true,
        level: true,
        correctCount: true,
        totalItems: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /** Chủ điểm học viên đã làm ít nhất 1 câu bài tập/ôn. */
  async answeredTopicIds(userId: string): Promise<Set<number>> {
    const rows = await this.prisma.$queryRaw<{ topic_id: number }[]>`
      SELECT DISTINCT a.topic_id FROM grammar_answers a JOIN grammar_sessions s ON s.id = a.session_id
      WHERE s.user_id = ${userId}::uuid`;
    return new Set(rows.map((r) => r.topic_id));
  }

  // ---------- Lượt bài tập / ôn ----------

  createSession(data: Prisma.GrammarSessionUncheckedCreateInput) {
    return this.prisma.grammarSession.create({ data });
  }

  findSession(id: string): Promise<GrammarSession | null> {
    return this.prisma.grammarSession.findUnique({ where: { id } });
  }

  updateSession(id: string, data: Prisma.GrammarSessionUncheckedUpdateInput) {
    return this.prisma.grammarSession.update({ where: { id }, data });
  }

  activeSession(userId: string, kind: string, topicId?: number) {
    return this.prisma.grammarSession.findFirst({
      where: {
        userId,
        kind,
        status: 'in_progress',
        ...(topicId ? { topicId } : {}),
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  abandonOthers(userId: string, kind: string, topicId: number | null) {
    return this.prisma.grammarSession.updateMany({
      where: { userId, kind, status: 'in_progress', topicId },
      data: { status: 'abandoned' },
    });
  }

  answers(sessionId: string) {
    return this.prisma.grammarAnswer.findMany({
      where: { sessionId },
      orderBy: { itemIndex: 'asc' },
    });
  }

  createAnswer(data: Prisma.GrammarAnswerUncheckedCreateInput) {
    return this.prisma.grammarAnswer.create({ data });
  }

  /** Học viên đã từng trả lời câu bài tập này chưa (điều kiện "Lưu lỗi này"). */
  async hasAnsweredExercise(userId: string, exerciseId: number) {
    const n = await this.prisma.grammarAnswer.count({
      where: {
        itemType: 'ex',
        itemId: exerciseId,
        session: { userId },
      },
    });
    return n > 0;
  }

  // ---------- Lỗi bài tập chủ điểm ----------

  findMistake(userId: string, exerciseId: number) {
    return this.prisma.grammarMistake.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });
  }

  upsertMistake(
    userId: string,
    exerciseId: number,
    data: Omit<
      Prisma.GrammarMistakeUncheckedCreateInput,
      'userId' | 'exerciseId'
    >,
  ) {
    return this.prisma.grammarMistake.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: { userId, exerciseId, ...data },
      update: data,
    });
  }

  updateMistake(id: number, data: Prisma.GrammarMistakeUncheckedUpdateInput) {
    return this.prisma.grammarMistake.update({ where: { id }, data });
  }

  findMistakeById(userId: string, id: number) {
    return this.prisma.grammarMistake.findFirst({ where: { id, userId } });
  }

  /** Lỗi bài tập chủ điểm (chưa xóa) kèm câu và chủ điểm. */
  exerciseMistakes(userId: string) {
    return this.prisma.grammarMistake.findMany({
      where: { userId, deletedAt: null },
      include: { exercise: true },
      orderBy: { lastWrongAt: 'desc' },
    });
  }

  /** Câu TOEIC trong sổ câu sai có chủ điểm (từng sai hoặc bookmark). */
  async toeicMistakes(userId: string): Promise<ToeicMistakeRow[]> {
    const rows = await this.prisma.mistakeNotebookItem.findMany({
      where: {
        userId,
        question: { grammarTopicId: { not: null } },
        OR: [{ wrongCount: { gt: 0 } }, { isBookmarked: true }],
      },
      include: { question: { select: { grammarTopicId: true } } },
      orderBy: { lastWrongAt: 'desc' },
    });
    return rows.map((r) => ({
      itemId: r.id,
      questionId: r.questionId,
      topicId: r.question.grammarTopicId!,
      wrongCount: r.wrongCount,
      status: r.status,
      isBookmarked: r.isBookmarked,
      lastWrongAt: r.lastWrongAt,
      createdAt: r.createdAt,
      lastSelectedAnswerId: r.lastSelectedAnswerId,
    }));
  }

  /** Nội dung câu TOEIC để hiện trong sổ (đáp án đúng chỉ trả cho câu đã từng làm). */
  toeicQuestions(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        questionText: true,
        passageText: true,
        explanation: true,
        toeicPart: true,
        sourceTestId: true,
        partIndex: true,
        answers: {
          select: {
            id: true,
            answerText: true,
            isCorrect: true,
            displayOrder: true,
          },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  testTitles(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.fullTest.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
  }

  questionNotes(userId: string) {
    return this.prisma.grammarQuestionNote.findMany({ where: { userId } });
  }

  upsertQuestionNote(userId: string, questionId: number, note: string) {
    return this.prisma.grammarQuestionNote.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, note },
      update: { note },
    });
  }

  deleteQuestionNote(userId: string, questionId: number) {
    return this.prisma.grammarQuestionNote.deleteMany({
      where: { userId, questionId },
    });
  }

  /** Câu TOEIC chưa làm của chủ điểm (bù câu cho phiên ôn). */
  async unseenToeicIds(
    userId: string,
    topicId: number,
    testIds: number[],
    difficulty: string,
    limit: number,
  ): Promise<number[]> {
    if (testIds.length === 0 || limit <= 0) return [];
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT q.id FROM questions q
      WHERE q.grammar_topic_id = ${topicId} AND q.practice_eligible = true AND q.toeic_part = 5
        AND q.source_test_id = ANY(${testIds}::int[])
        AND COALESCE(q.difficulty, 'medium') = ${difficulty}
        AND NOT EXISTS (SELECT 1 FROM practice_answers pa JOIN practice_sessions ps ON ps.id = pa.session_id
                        WHERE ps.user_id = ${userId}::uuid AND pa.question_id = q.id)
        AND NOT EXISTS (SELECT 1 FROM full_test_answer_details d JOIN user_full_test_results r ON r.id = d.result_id
                        WHERE r.user_id = ${userId}::uuid AND d.question_id = q.id)
      ORDER BY random() LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }

  /** Nguồn đề của câu (lọc câu TOEIC theo quyền). */
  questionSources(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, sourceTestId: true, grammarTopicId: true },
    });
  }

  // ---------- Gắn chủ điểm câu TOEIC ----------

  /** Câu Part 5/6 cần gắn (lại): chưa gắn, hoặc nhãn dạng câu đổi sau lần gắn; bỏ qua câu admin đã sửa. */
  questionsToTag(all: boolean) {
    return this.prisma.question.findMany({
      where: {
        toeicPart: { in: [5, 6] },
        OR: [
          { grammarTagSource: null },
          { grammarTagSource: { not: 'admin' } },
        ],
        ...(all ? {} : { grammarTaggedAt: null }),
      },
      select: {
        id: true,
        questionCategory: true,
        questionText: true,
        answers: {
          select: { answerText: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /** Còn câu chưa gắn hoặc gắn trước khi nhãn dạng câu đổi? */
  async needsTagging(): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM questions
      WHERE toeic_part IN (5, 6) AND COALESCE(grammar_tag_source, '') <> 'admin'
        AND (grammar_tagged_at IS NULL OR (tagged_at IS NOT NULL AND tagged_at > grammar_tagged_at))`;
    return Number(rows[0]?.n ?? 0) > 0;
  }

  async staleQuestionIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM questions
      WHERE toeic_part IN (5, 6) AND COALESCE(grammar_tag_source, '') <> 'admin'
        AND (grammar_tagged_at IS NULL OR (tagged_at IS NOT NULL AND tagged_at > grammar_tagged_at))`;
    return rows.map((r) => r.id);
  }

  questionsForTagging(ids: number[]) {
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        questionCategory: true,
        questionText: true,
        answers: {
          select: { answerText: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async setQuestionTopics(
    groups: Map<number | null, number[]>,
    source: 'auto' | 'admin',
  ) {
    const now = new Date();
    await this.prisma.$transaction(
      [...groups.entries()].map(([topicId, ids]) =>
        this.prisma.question.updateMany({
          where: { id: { in: ids } },
          data: {
            grammarTopicId: topicId,
            grammarTagSource: source,
            grammarTaggedAt: now,
          },
        }),
      ),
    );
  }

  /** Danh sách câu Part 5/6 cho admin rà chủ điểm. */
  adminQuestions(f: {
    topicId?: number | null;
    testId?: number;
    untagged?: boolean;
    skip: number;
    take: number;
  }) {
    const where: Prisma.QuestionWhereInput = { toeicPart: { in: [5, 6] } };
    if (f.untagged) where.grammarTopicId = null;
    else if (f.topicId) where.grammarTopicId = f.topicId;
    if (f.testId) where.sourceTestId = f.testId;
    return this.prisma.$transaction([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: [
          { sourceTestId: 'asc' },
          { toeicPart: 'asc' },
          { partIndex: 'asc' },
          { id: 'asc' },
        ],
        skip: f.skip,
        take: f.take,
        select: {
          id: true,
          toeicPart: true,
          partIndex: true,
          questionText: true,
          questionCategory: true,
          sourceTestId: true,
          grammarTopicId: true,
          grammarTagSource: true,
          answers: {
            select: { answerText: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
    ]);
  }

  questionTopicsOf(ids: number[]) {
    return this.prisma.question.findMany({
      where: { id: { in: ids }, grammarTopicId: { not: null } },
      select: { id: true, grammarTopicId: true },
    });
  }

  /** Mistakes for status lookups when TOEIC answers happen inside grammar sessions. */
  mistakeItemsFor(userId: string, questionIds: number[]) {
    return this.prisma.mistakeNotebookItem.findMany({
      where: { userId, questionId: { in: questionIds } },
      select: { questionId: true, status: true },
    });
  }

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}

export type { GrammarMistake };
