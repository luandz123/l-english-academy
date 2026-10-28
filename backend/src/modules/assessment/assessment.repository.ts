import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Answer,
  Question,
  Quiz,
  UserAnswer,
  UserQuizResult,
} from '../../generated/prisma/client';
import type { GradedAnswer } from './quiz-grading';

export type QuestionWithAnswers = Question & { answers: Answer[] };

@Injectable()
export class AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findQuiz(quizId: number): Promise<Quiz | null> {
    return this.prisma.quiz.findUnique({ where: { id: quizId } });
  }

  /** Như `select("*, answers(*)").order("display_order")`; thêm `id` để thứ tự ổn định. */
  findQuestionsWithAnswers(quizId: number): Promise<QuestionWithAnswers[]> {
    return this.prisma.question.findMany({
      where: { quizId },
      include: {
        answers: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * Ghi kết quả + từng câu trong một transaction (client cũ ghi 2 lệnh rời,
   * lỗi giữa chừng để lại kết quả không có chi tiết). Trả kèm số lần nộp của user
   * cho quiz này, đếm trong cùng transaction.
   */
  async createResult(input: {
    userId: string;
    quizId: number;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    answers: GradedAnswer[];
  }): Promise<{ result: UserQuizResult; attempts: number }> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.userQuizResult.create({
        data: {
          userId: input.userId,
          quizId: input.quizId,
          score: input.score,
          correctAnswers: input.correctAnswers,
          totalQuestions: input.totalQuestions,
          timeSpentSeconds: input.timeSpentSeconds,
        },
      });
      if (input.answers.length > 0) {
        await tx.userAnswer.createMany({
          data: input.answers.map((a) => ({
            resultId: result.id,
            questionId: a.questionId,
            selectedAnswerId: a.selectedAnswerId,
            isCorrect: a.isCorrect,
          })),
        });
      }
      const attempts = await tx.userQuizResult.count({
        where: { userId: input.userId, quizId: input.quizId },
      });
      return { result, attempts };
    });
  }

  findResult(resultId: number): Promise<UserQuizResult | null> {
    return this.prisma.userQuizResult.findUnique({ where: { id: resultId } });
  }

  findLatestResult(
    userId: string,
    quizId: number,
  ): Promise<UserQuizResult | null> {
    return this.prisma.userQuizResult.findFirst({
      where: { userId, quizId },
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  async hasResult(userId: string, quizId: number): Promise<boolean> {
    const count = await this.prisma.userQuizResult.count({
      where: { userId, quizId },
    });
    return count > 0;
  }

  findUserAnswers(resultId: number): Promise<UserAnswer[]> {
    return this.prisma.userAnswer.findMany({
      where: { resultId },
      orderBy: [{ id: 'asc' }],
    });
  }
}
