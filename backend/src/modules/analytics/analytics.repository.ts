import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AnswerRow } from './analytics-rules';

export const DIAGNOSTIC_SET_KEY = 'diagnostic_set';

/**
 * Module analytics chỉ ĐỌC: lượt luyện (practice_*), Full Test (user_full_test_results,
 * full_test_answer_details), nhãn câu, sổ câu sai, đề, yêu thích, lộ trình. Bảng ghi duy nhất
 * của module là exam_recommendation_skips (đề "Không phải lúc này").
 */
@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Mọi câu trả lời trong lượt đã nộp của học viên (câu bỏ trống có `blank = true`). */
  async answerRows(userId: string): Promise<AnswerRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        source: 'practice' | 'full_test';
        attempt_id: string;
        kind: string;
        at: Date;
        question_id: number;
        part: number;
        category: string | null;
        passage_type: string | null;
        blank: boolean;
        correct: boolean;
        time_seconds: number | null;
      }[]
    >`
      SELECT 'practice' AS source, ps.id::text AS attempt_id, ps.kind, ps.submitted_at AS at,
             q.id AS question_id, COALESCE(q.toeic_part, 5)::int AS part, q.question_category AS category,
             q.passage_type, (pa.selected_answer_id IS NULL) AS blank,
             COALESCE(pa.is_correct, false) AS correct, pa.time_seconds
      FROM practice_sessions ps
      CROSS JOIN LATERAL unnest(ps.question_ids) AS qid(id)
      JOIN questions q ON q.id = qid.id
      LEFT JOIN practice_answers pa ON pa.session_id = ps.id AND pa.question_id = qid.id
      WHERE ps.user_id = ${userId}::uuid AND ps.status = 'submitted' AND ps.submitted_at IS NOT NULL
      UNION ALL
      SELECT 'full_test', r.id::text, 'full_test', r.completed_at,
             q.id, COALESCE(q.toeic_part, d.part_number, 5)::int, q.question_category,
             q.passage_type, (d.selected_answer_id IS NULL), COALESCE(d.is_correct, false), NULL
      FROM user_full_test_results r
      JOIN full_test_answer_details d ON d.result_id = r.id
      JOIN questions q ON q.id = d.question_id
      WHERE r.user_id = ${userId}::uuid AND r.completed_at IS NOT NULL`;
    return rows.map((r) => ({
      source: r.source,
      attemptId: r.attempt_id,
      kind: r.kind,
      at: r.at,
      questionId: r.question_id,
      part: Number(r.part),
      category: r.category,
      passageType: r.passage_type,
      blank: r.blank,
      correct: r.correct,
      timeSeconds: r.time_seconds,
    }));
  }

  /** Câu luyện được mà học viên CHƯA từng gặp, theo Part × dạng, tách đề có quyền / chưa có quyền. */
  async unseenCounts(userId: string, accessibleTestIds: number[]) {
    const rows = await this.prisma.$queryRaw<
      { part: number; category: string; accessible: boolean; n: bigint }[]
    >`
      SELECT q.toeic_part::int AS part, q.question_category AS category,
             (q.source_test_id = ANY(${accessibleTestIds}::int[])) AS accessible, COUNT(*) AS n
      FROM questions q
      WHERE q.practice_eligible AND q.source_test_id IS NOT NULL AND q.question_category IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM practice_sessions ps
          WHERE ps.user_id = ${userId}::uuid AND ps.status = 'submitted' AND q.id = ANY(ps.question_ids))
        AND NOT EXISTS (
          SELECT 1 FROM full_test_answer_details d JOIN user_full_test_results r ON r.id = d.result_id
          WHERE r.user_id = ${userId}::uuid AND d.question_id = q.id)
      GROUP BY 1, 2, 3`;
    return rows.map((r) => ({ ...r, part: Number(r.part), n: Number(r.n) }));
  }

  /** Số câu đang sai (chưa sửa đúng) trong Sổ câu sai theo Part × dạng. */
  async openMistakeCounts(userId: string) {
    const rows = await this.prisma.$queryRaw<
      { part: number; category: string; n: bigint }[]
    >`
      SELECT q.toeic_part::int AS part, q.question_category AS category, COUNT(*) AS n
      FROM mistake_notebook_items m JOIN questions q ON q.id = m.question_id
      WHERE m.user_id = ${userId}::uuid AND m.wrong_count > 0
        AND q.toeic_part IS NOT NULL AND q.question_category IS NOT NULL
      GROUP BY 1, 2`;
    return rows.map((r) => ({
      part: Number(r.part),
      category: r.category,
      n: Number(r.n),
    }));
  }

  recentQuestionTypeSessions(userId: string, since: Date) {
    return this.prisma.practiceSession.findMany({
      where: {
        userId,
        kind: 'question_type',
        status: 'submitted',
        submittedAt: { gte: since },
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        config: true,
        correctCount: true,
        totalQuestions: true,
        submittedAt: true,
      },
    });
  }

  fullTestResults(userId: string) {
    return this.prisma.userFullTestResult.findMany({
      where: { userId },
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      select: {
        id: true,
        testId: true,
        totalScore: true,
        listeningScore: true,
        readingScore: true,
        correctAnswers: true,
        totalQuestions: true,
        timeSpentSeconds: true,
        completedAt: true,
        answersDetail: true,
        fullTest: { select: { title: true, courseId: true } },
      },
    });
  }

  submittedSessions(userId: string, take?: number) {
    return this.prisma.practiceSession.findMany({
      where: { userId, status: 'submitted' },
      orderBy: { submittedAt: 'desc' },
      take,
      select: {
        id: true,
        kind: true,
        config: true,
        correctCount: true,
        totalQuestions: true,
        timeSpentSeconds: true,
        submittedAt: true,
      },
    });
  }

  // ---------- So sánh Full Test (E09) ----------

  resultsByIds(ids: number[]) {
    return this.prisma.userFullTestResult.findMany({
      where: { id: { in: ids } },
      include: {
        fullTest: { select: { id: true, title: true, courseId: true } },
        fullTestAnswerDetails: true,
      },
    });
  }

  questionsForCompare(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        toeicPart: true,
        partIndex: true,
        questionCategory: true,
        questionText: true,
        explanation: true,
        transcript: true,
        answers: {
          select: {
            id: true,
            answerText: true,
            isCorrect: true,
            explanation: true,
          },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  // ---------- Đề xuất đề (E10) ----------

  candidateTests() {
    return this.prisma.fullTest.findMany({
      include: {
        course: { select: { isFree: true, isActive: true } },
        fullTestSections: { select: { partNumber: true } },
      },
    });
  }

  async attemptCounts(): Promise<Map<number, number>> {
    const rows = await this.prisma.userFullTestResult.groupBy({
      by: ['testId'],
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.testId, r._count._all]));
  }

  favoriteTestIds(userId: string) {
    return this.prisma.favoriteExam
      .findMany({ where: { userId }, select: { testId: true } })
      .then((r) => new Set(r.map((x) => x.testId)));
  }

  activeSkips(userId: string, now: Date) {
    return this.prisma.examRecommendationSkip
      .findMany({
        where: { userId, skippedUntil: { gt: now } },
        select: { testId: true },
      })
      .then((r) => new Set(r.map((x) => x.testId)));
  }

  skip(userId: string, testId: number, until: Date) {
    return this.prisma.examRecommendationSkip.upsert({
      where: { userId_testId: { userId, testId } },
      create: { userId, testId, skippedUntil: until },
      update: { skippedUntil: until },
    });
  }

  testExists(id: number) {
    return this.prisma.fullTest.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  roadmap(userId: string) {
    return this.prisma.userRoadmap.findUnique({ where: { userId } });
  }

  async hasDiagnosticSet(): Promise<boolean> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: DIAGNOSTIC_SET_KEY },
    });
    if (!row?.value) return false;
    try {
      const parsed = JSON.parse(row.value) as { question_ids?: unknown };
      return (
        Array.isArray(parsed.question_ids) && parsed.question_ids.length > 0
      );
    } catch {
      return false;
    }
  }

  async eligibleQuestionCount(): Promise<number> {
    return this.prisma.question.count({ where: { practiceEligible: true } });
  }
}
