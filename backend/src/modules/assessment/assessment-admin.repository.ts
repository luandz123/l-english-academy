import { Injectable } from '@nestjs/common';
import type {
  Answer,
  Lesson,
  Module,
  Prisma,
  Question,
  Quiz,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type QuestionWithAnswers = Question & { answers: Answer[] };

@Injectable()
export class AssessmentAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  inTransaction<T>(
    fn: (txRepo: AssessmentAdminRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      fn(new AssessmentAdminRepository(tx as unknown as PrismaService)),
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

  findQuestionById(id: number): Promise<QuestionWithAnswers | null> {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        answers: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
  }

  async findQuestionIdsInQuiz(
    quizId: number,
    questionIds: number[],
  ): Promise<number[]> {
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
        quizId,
      },
      select: { id: true },
    });
    return questions.map((q) => q.id);
  }

  async getMaxQuestionDisplayOrder(quizId: number): Promise<number> {
    const agg = await this.prisma.question.aggregate({
      where: { quizId },
      _max: { displayOrder: true },
    });
    return agg._max.displayOrder !== null ? agg._max.displayOrder + 1 : 0;
  }

  createQuestion(data: Prisma.QuestionUncheckedCreateInput): Promise<Question> {
    return this.prisma.question.create({ data });
  }

  updateQuestion(
    id: number,
    data: Prisma.QuestionUncheckedUpdateInput,
  ): Promise<Question> {
    return this.prisma.question.update({
      where: { id },
      data,
    });
  }

  deleteQuestion(id: number): Promise<Question> {
    return this.prisma.question.delete({
      where: { id },
    });
  }

  async deleteQuestions(ids: number[]): Promise<number> {
    const res = await this.prisma.question.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  updateQuestionDisplayOrder(
    id: number,
    displayOrder: number,
  ): Promise<Question> {
    return this.prisma.question.update({
      where: { id },
      data: { displayOrder },
    });
  }

  updateQuestionImageUrl(
    id: number,
    imageUrl: string | null,
  ): Promise<Question> {
    return this.prisma.question.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async deleteAnswersByQuestionId(questionId: number): Promise<number> {
    const res = await this.prisma.answer.deleteMany({
      where: { questionId },
    });
    return res.count;
  }

  async createAnswers(
    data: {
      questionId: number;
      answerText: string;
      isCorrect: boolean;
      explanation: string | null;
      displayOrder: number;
    }[],
  ): Promise<number> {
    if (data.length === 0) return 0;
    const res = await this.prisma.answer.createMany({ data });
    return res.count;
  }

  countQuestionsInQuiz(quizId: number): Promise<number> {
    return this.prisma.question.count({
      where: { quizId },
    });
  }

  updateQuizTotalQuestions(
    quizId: number,
    totalQuestions: number,
  ): Promise<Quiz> {
    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { totalQuestions },
    });
  }

  updateQuizAudioUrl(quizId: number, audioUrl: string | null): Promise<Quiz> {
    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { audioUrl },
    });
  }

  findModuleById(moduleId: number): Promise<Module | null> {
    return this.prisma.module.findUnique({
      where: { id: moduleId },
    });
  }

  countQuizzesInModule(moduleId: number): Promise<number> {
    return this.prisma.quiz.count({
      where: { moduleId },
    });
  }

  createQuiz(data: {
    moduleId: number | null;
    title: string;
    totalQuestions: number;
    timeLimitSeconds?: number;
    displayOrder: number;
  }): Promise<Quiz> {
    return this.prisma.quiz.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        totalQuestions: data.totalQuestions,
        timeLimitSeconds: data.timeLimitSeconds ?? 0,
        displayOrder: data.displayOrder,
      },
    });
  }

  updateQuiz(
    id: number,
    data: {
      title: string;
      totalQuestions: number;
      timeLimitSeconds: number;
    },
  ): Promise<Quiz> {
    return this.prisma.quiz.update({
      where: { id },
      data,
    });
  }

  deleteQuiz(id: number): Promise<Quiz> {
    return this.prisma.quiz.delete({
      where: { id },
    });
  }

  findLessonById(lessonId: number): Promise<Lesson | null> {
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
  }

  updateLessonQuizId(lessonId: number, quizId: number): Promise<Lesson> {
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { quizId },
    });
  }
}
