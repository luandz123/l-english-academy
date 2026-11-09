import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { PoolItem } from './practice-rules';

export const QUESTION_CONTENT_SELECT = {
  id: true,
  questionText: true,
  passageText: true,
  transcript: true,
  translation: true,
  explanation: true,
  audioUrl: true,
  imageUrl: true,
  groupId: true,
  groupKey: true,
  toeicPart: true,
  partIndex: true,
  questionCategory: true,
  passageType: true,
  sourceTestId: true,
  displayOrder: true,
  answers: {
    select: {
      id: true,
      answerText: true,
      isCorrect: true,
      explanation: true,
      displayOrder: true,
    },
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.QuestionSelect;

export type QuestionContent = Prisma.QuestionGetPayload<{
  select: typeof QUESTION_CONTENT_SELECT;
}>;

export interface PoolFilter {
  testIds: number[];
  parts: number[];
  categories?: string[];
  passageTypes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeIds?: number[];
}

/** Bảng practice_sessions / practice_answers + đọc chỉ-đọc kho câu đã gắn nhãn. */
@Injectable()
export class PracticeRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Kho câu ----------

  private poolWhere(f: PoolFilter): Prisma.QuestionWhereInput {
    const where: Prisma.QuestionWhereInput = {
      practiceEligible: true,
      sourceTestId: { in: f.testIds },
      toeicPart: { in: f.parts },
    };
    if (f.categories?.length) where.questionCategory = { in: f.categories };
    if (f.passageTypes?.length) where.passageType = { in: f.passageTypes };
    if (f.difficulty) {
      where.OR =
        f.difficulty === 'medium'
          ? [{ difficulty: 'medium' }, { difficulty: null }]
          : [{ difficulty: f.difficulty }];
    }
    if (f.excludeIds?.length) where.id = { notIn: f.excludeIds };
    return where;
  }

  findPool(
    f: PoolFilter,
  ): Promise<(PoolItem & { questionCategory: string | null })[]> {
    if (f.testIds.length === 0 || f.parts.length === 0)
      return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: this.poolWhere(f),
      select: {
        id: true,
        groupKey: true,
        sourceTestId: true,
        toeicPart: true,
        partIndex: true,
        questionCategory: true,
      },
    });
  }

  async countPool(testIds: number[]) {
    if (testIds.length === 0) return [];
    const rows = await this.prisma.question.groupBy({
      by: ['toeicPart', 'questionCategory', 'passageType', 'difficulty'],
      where: { practiceEligible: true, sourceTestId: { in: testIds } },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      part: r.toeicPart ?? 0,
      category: r.questionCategory ?? 'other',
      passageType: r.passageType,
      difficulty: r.difficulty ?? 'medium',
      count: r._count._all,
    }));
  }

  findQuestionsContent(ids: number[]): Promise<QuestionContent[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: QUESTION_CONTENT_SELECT,
    });
  }

  /** Mọi câu cùng nhóm (để lấy đoạn văn / audio / ảnh chung của nhóm). */
  findGroupMates(groupKeys: string[]) {
    if (groupKeys.length === 0) return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: { groupKey: { in: groupKeys } },
      select: {
        id: true,
        groupKey: true,
        partIndex: true,
        questionText: true,
        passageText: true,
        audioUrl: true,
        imageUrl: true,
        transcript: true,
      },
      orderBy: [{ partIndex: 'asc' }, { id: 'asc' }],
    });
  }

  findTestTitles(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.fullTest.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
  }

  // ---------- Lượt luyện ----------

  createSession(data: Prisma.PracticeSessionUncheckedCreateInput) {
    return this.prisma.practiceSession.create({ data });
  }

  findSession(id: string) {
    return this.prisma.practiceSession.findUnique({ where: { id } });
  }

  findAnswers(sessionId: string) {
    return this.prisma.practiceAnswer.findMany({ where: { sessionId } });
  }

  countAnswered(sessionIds: string[]) {
    if (sessionIds.length === 0) return Promise.resolve([]);
    return this.prisma.practiceAnswer.groupBy({
      by: ['sessionId'],
      where: { sessionId: { in: sessionIds }, selectedAnswerId: { not: null } },
      _count: { _all: true },
    });
  }

  upsertAnswer(data: {
    sessionId: string;
    questionId: number;
    selectedAnswerId: number | null;
    isCorrect: boolean | null;
    locked: boolean;
  }) {
    return this.prisma.practiceAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId: data.sessionId,
          questionId: data.questionId,
        },
      },
      create: { ...data, answeredAt: new Date() },
      update: {
        selectedAnswerId: data.selectedAnswerId,
        isCorrect: data.isCorrect,
        locked: data.locked,
        answeredAt: new Date(),
      },
    });
  }

  findActiveSession(userId: string) {
    return this.prisma.practiceSession.findFirst({
      where: { userId, status: 'in_progress' },
      orderBy: { startedAt: 'desc' },
    });
  }

  findHistory(userId: string, limit: number) {
    return this.prisma.practiceSession.findMany({
      where: { userId, status: 'submitted' },
      orderBy: { submittedAt: 'desc' },
      take: limit,
    });
  }

  updateSession(id: string, data: Prisma.PracticeSessionUncheckedUpdateInput) {
    return this.prisma.practiceSession.update({ where: { id }, data });
  }

  /** Nộp bài: ghi chấm điểm từng câu + tổng của lượt trong một transaction (chỉ khi còn in_progress). */
  async submitSession(
    id: string,
    graded: { questionId: number; isCorrect: boolean | null }[],
    totals: {
      correct: number;
      wrong: number;
      unanswered: number;
      timeSpentSeconds: number;
    },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.practiceSession.updateMany({
        where: { id, status: 'in_progress' },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          correctCount: totals.correct,
          wrongCount: totals.wrong,
          unansweredCount: totals.unanswered,
          timeSpentSeconds: totals.timeSpentSeconds,
        },
      });
      if (count === 0) return false;
      for (const g of graded) {
        await tx.practiceAnswer.updateMany({
          where: { sessionId: id, questionId: g.questionId },
          data: { isCorrect: g.isCorrect },
        });
      }
      return true;
    });
  }

  // ---------- Daily ----------

  findDaily(userId: string, date: Date) {
    return this.prisma.practiceSession.findFirst({
      where: {
        userId,
        kind: 'daily',
        dailyDate: date,
        status: { not: 'abandoned' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findRecentDailyQuestionIds(userId: string, since: Date) {
    return this.prisma.practiceSession.findMany({
      where: { userId, kind: 'daily', dailyDate: { gte: since } },
      select: { questionIds: true },
    });
  }

  findSubmittedDailyDates(userId: string) {
    return this.prisma.practiceSession.findMany({
      where: { userId, kind: 'daily', status: 'submitted' },
      select: { dailyDate: true },
      orderBy: { dailyDate: 'desc' },
      take: 400,
    });
  }

  /** Thống kê đúng/sai theo (Part, dạng) để tìm dạng yếu (lượt luyện + sổ câu sai). */
  async categoryStats(userId: string) {
    const practice = await this.prisma.$queryRaw<
      { part: number; category: string; total: bigint; wrong: bigint }[]
    >`
      SELECT q.toeic_part AS part, q.question_category AS category,
             COUNT(*) AS total, COUNT(*) FILTER (WHERE pa.is_correct = false) AS wrong
      FROM practice_answers pa
      JOIN practice_sessions ps ON ps.id = pa.session_id
      JOIN questions q ON q.id = pa.question_id
      WHERE ps.user_id = ${userId}::uuid AND ps.status = 'submitted'
        AND pa.is_correct IS NOT NULL AND q.toeic_part IS NOT NULL AND q.question_category IS NOT NULL
        AND ps.submitted_at > now() - interval '60 days'
      GROUP BY 1, 2`;
    const mistakes = await this.prisma.$queryRaw<
      { part: number; category: string; wrong: bigint }[]
    >`
      SELECT q.toeic_part AS part, q.question_category AS category, SUM(m.wrong_count) AS wrong
      FROM mistake_notebook_items m JOIN questions q ON q.id = m.question_id
      WHERE m.user_id = ${userId}::uuid AND m.status <> 'fixed'
        AND q.toeic_part IS NOT NULL AND q.question_category IS NOT NULL
      GROUP BY 1, 2`;
    const map = new Map<
      string,
      { part: number; category: string; total: number; wrong: number }
    >();
    for (const r of practice) {
      map.set(`${r.part}:${r.category}`, {
        part: Number(r.part),
        category: r.category,
        total: Number(r.total),
        wrong: Number(r.wrong),
      });
    }
    for (const r of mistakes) {
      const key = `${r.part}:${r.category}`;
      const cur = map.get(key) ?? {
        part: Number(r.part),
        category: r.category,
        total: 0,
        wrong: 0,
      };
      cur.total += Number(r.wrong);
      cur.wrong += Number(r.wrong);
      map.set(key, cur);
    }
    return [...map.values()];
  }
}
