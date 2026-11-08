import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type {
  FullTest,
  FullTestAnswerDetail,
  UserFullTestResult,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { QuestionWithAnswers } from './assessment.repository';
import type { FullTestGrade } from './toeic-scoring';

export type FullTestQuestion = QuestionWithAnswers & { partNumber: number };

@Injectable()
export class FullTestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFullTest(testId: number): Promise<FullTest | null> {
    return this.prisma.fullTest.findUnique({ where: { id: testId } });
  }

  /**
   * Mọi câu của đề qua `full_test_sections` (Part ← section đầu tiên trỏ tới quiz, như
   * `sections.find` cũ), sắp Part rồi `display_order`, `id` (cũ sắp ở client, thứ tự trong
   * cùng `display_order` không xác định).
   */
  async findQuestions(testId: number): Promise<FullTestQuestion[]> {
    const sections = await this.prisma.fullTestSection.findMany({
      where: { testId, quizId: { not: null } },
      orderBy: [{ id: 'asc' }],
    });
    const partByQuiz = new Map<number, number>();
    for (const s of sections) {
      if (s.quizId !== null && !partByQuiz.has(s.quizId)) {
        partByQuiz.set(s.quizId, s.partNumber);
      }
    }
    if (partByQuiz.size === 0) return [];

    const questions = await this.prisma.question.findMany({
      where: { quizId: { in: [...partByQuiz.keys()] } },
      include: {
        answers: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      },
    });
    return questions
      .map((q) => ({ ...q, partNumber: partByQuiz.get(q.quizId!) ?? 5 }))
      .sort(
        (a, b) =>
          a.partNumber - b.partNumber ||
          a.displayOrder - b.displayOrder ||
          a.id - b.id,
      );
  }

  /** Thay 2 lệnh insert rời ở `FullTestExam.tsx:752-782` bằng một transaction. */
  createResult(input: {
    userId: string;
    testId: number;
    grade: FullTestGrade;
    timeSpentSeconds: number;
    pauseCount: number;
    testMode: string;
    answersDetail: Prisma.InputJsonValue;
  }): Promise<UserFullTestResult> {
    const { grade } = input;
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.userFullTestResult.create({
        data: {
          userId: input.userId,
          testId: input.testId,
          correctAnswers: grade.correctAnswers,
          listeningScore: grade.listeningScore,
          readingScore: grade.readingScore,
          totalScore: grade.totalScore,
          timeSpentSeconds: input.timeSpentSeconds,
          totalQuestions: grade.totalQuestions,
          listeningCorrect: grade.listeningCorrect,
          readingCorrect: grade.readingCorrect,
          pauseCount: input.pauseCount,
          testMode: input.testMode,
          answersDetail: input.answersDetail,
        },
      });
      if (grade.details.length > 0) {
        await tx.fullTestAnswerDetail.createMany({
          data: grade.details.map((d) => ({ resultId: result.id, ...d })),
        });
      }
      return result;
    });
  }

  findResult(resultId: number): Promise<UserFullTestResult | null> {
    return this.prisma.userFullTestResult.findUnique({
      where: { id: resultId },
    });
  }

  findLatestResult(
    userId: string,
    testId: number,
  ): Promise<UserFullTestResult | null> {
    return this.prisma.userFullTestResult.findFirst({
      where: { userId, testId },
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  findAnswerDetails(resultId: number): Promise<FullTestAnswerDetail[]> {
    return this.prisma.fullTestAnswerDetail.findMany({
      where: { resultId },
      orderBy: [{ id: 'asc' }],
    });
  }

  findCourseFullTests(courseId: number): Promise<FullTest[]> {
    return this.prisma.fullTest.findMany({
      where: { courseId },
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findMyFullTestResults(
    userId: string,
  ): Promise<(UserFullTestResult & { fullTest: FullTest | null })[]> {
    return this.prisma.userFullTestResult.findMany({
      where: { userId },
      include: { fullTest: true },
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  findAllFullTests(): Promise<FullTest[]> {
    return this.prisma.fullTest.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /** Số đếm thật; kho trống thì trả 0 (không dùng số mặc định viết cứng — luật UI/UX số 5). */
  async getStatsOverview(): Promise<{
    total_questions: number;
    listening_questions: number;
    reading_questions: number;
    total_full_tests: number;
    total_users: number;
    total_courses: number;
  }> {
    const listeningWhere: Prisma.QuestionWhereInput = {
      OR: [
        { audioUrl: { not: null } },
        { quiz: { is: { audioUrl: { not: null } } } },
      ],
    };
    const [
      totalQuestions,
      listeningQuestions,
      readingQuestions,
      totalFullTests,
      totalUsers,
      totalCourses,
    ] = await Promise.all([
      this.prisma.question.count(),
      // Câu nghe: có audio riêng hoặc thuộc bài có audio chung (Part 2/3/4, chép chính tả)
      this.prisma.question.count({ where: listeningWhere }),
      this.prisma.question.count({ where: { NOT: listeningWhere } }),
      this.prisma.fullTest.count(),
      this.prisma.user.count(),
      this.prisma.course.count({ where: { isActive: true } }),
    ]);

    return {
      total_questions: totalQuestions,
      listening_questions: listeningQuestions,
      reading_questions: readingQuestions,
      total_full_tests: totalFullTests,
      total_users: totalUsers,
      total_courses: totalCourses,
    };
  }
}
