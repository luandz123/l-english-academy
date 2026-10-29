import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Answer,
  Question,
  Quiz,
  UserAnswer,
  UserQuizResult,
  VocabQuestion,
} from '../../generated/prisma/client';

export type QuestionWithAnswers = Question & { answers: Answer[] };

@Injectable()
export class DictationRepository {
  constructor(private readonly prisma: PrismaService) {}

  inTransaction<T>(
    fn: (txRepo: DictationRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      fn(new DictationRepository(tx as unknown as PrismaService)),
    );
  }

  findQuizById(id: number): Promise<Quiz | null> {
    return this.prisma.quiz.findUnique({
      where: { id },
    });
  }

  findQuestionsWithAnswers(quizId: number): Promise<QuestionWithAnswers[]> {
    return this.prisma.question.findMany({
      where: { quizId },
      include: {
        answers: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findLessonByQuizId(quizId: number): Promise<{ id: number } | null> {
    return this.prisma.lesson.findFirst({
      where: { quizId },
      select: { id: true },
    });
  }

  findVocabByQuestionIds(questionIds: number[]): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: { questionId: { in: questionIds } },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findLatestQuizResult(
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

  createQuizResult(data: {
    userId: string;
    quizId: number;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
  }): Promise<UserQuizResult> {
    return this.prisma.userQuizResult.create({ data });
  }

  async findAllResultIdsForQuiz(
    userId: string,
    quizId: number,
  ): Promise<number[]> {
    const rows = await this.prisma.userQuizResult.findMany({
      where: { userId, quizId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  findCompletedAnswers(resultIds: number[]): Promise<UserAnswer[]> {
    if (resultIds.length === 0) return Promise.resolve([]);
    return this.prisma.userAnswer.findMany({
      where: {
        resultId: { in: resultIds },
        isCorrect: true,
      },
    });
  }

  async findOrCreateLatestResult(
    userId: string,
    quizId: number,
    totalQuestions: number,
  ): Promise<UserQuizResult> {
    const existing = await this.findLatestQuizResult(userId, quizId);
    if (existing) return existing;
    return this.createQuizResult({
      userId,
      quizId,
      score: 0,
      correctAnswers: 0,
      totalQuestions,
    });
  }

  async upsertUserAnswer(
    resultId: number,
    questionId: number,
    isCorrect: boolean,
  ): Promise<UserAnswer> {
    const existing = await this.prisma.userAnswer.findFirst({
      where: { resultId, questionId },
    });
    if (existing) {
      return this.prisma.userAnswer.update({
        where: { id: existing.id },
        data: { isCorrect },
      });
    }
    return this.prisma.userAnswer.create({
      data: {
        resultId,
        questionId,
        isCorrect,
      },
    });
  }

  countDoneQuestions(resultId: number): Promise<number> {
    return this.prisma.userAnswer.count({
      where: {
        resultId,
        isCorrect: true,
      },
    });
  }

  updateQuizResultScores(
    resultId: number,
    score: number,
    correctAnswers: number,
    totalQuestions: number,
  ): Promise<UserQuizResult> {
    return this.prisma.userQuizResult.update({
      where: { id: resultId },
      data: {
        score,
        correctAnswers,
        totalQuestions,
      },
    });
  }

  async unmarkUserAnswer(
    resultIds: number[],
    questionId: number,
  ): Promise<void> {
    if (resultIds.length === 0) return;
    await this.prisma.userAnswer.updateMany({
      where: {
        resultId: { in: resultIds },
        questionId,
      },
      data: { isCorrect: false },
    });
  }

  async resetAllForQuiz(resultIds: number[]): Promise<void> {
    if (resultIds.length === 0) return;
    await this.prisma.userAnswer.updateMany({
      where: {
        resultId: { in: resultIds },
      },
      data: { isCorrect: false },
    });
    await this.prisma.userQuizResult.updateMany({
      where: {
        id: { in: resultIds },
      },
      data: {
        score: 0,
        correctAnswers: 0,
      },
    });
  }
}
