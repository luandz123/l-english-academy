import { Injectable } from '@nestjs/common';
import type {
  Answer,
  Course,
  FullTest,
  FullTestSection,
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

  findFullTestById(id: number): Promise<FullTest | null> {
    return this.prisma.fullTest.findUnique({
      where: { id },
    });
  }

  findFullTestWithCourse(
    id: number,
  ): Promise<
    (FullTest & { course: Pick<Course, 'id' | 'title'> | null }) | null
  > {
    return this.prisma.fullTest.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });
  }

  updateFullTest(
    id: number,
    data: Prisma.FullTestUpdateInput,
  ): Promise<FullTest & { course: Pick<Course, 'id' | 'title'> | null }> {
    return this.prisma.fullTest.update({
      where: { id },
      data,
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });
  }

  findSectionByTestAndPart(
    testId: number,
    partNumber: number,
  ): Promise<FullTestSection | null> {
    return this.prisma.fullTestSection.findFirst({
      where: { testId, partNumber },
    });
  }

  createSection(
    data: Prisma.FullTestSectionUncheckedCreateInput,
  ): Promise<FullTestSection> {
    return this.prisma.fullTestSection.create({ data });
  }

  async countQuestionsInTest(testId: number): Promise<number> {
    const sections = await this.prisma.fullTestSection.findMany({
      where: { testId, quizId: { not: null } },
      select: { quizId: true },
    });
    const quizIds = sections
      .map((s) => s.quizId)
      .filter((id): id is number => id !== null);
    if (quizIds.length === 0) return 0;
    return this.prisma.question.count({
      where: { quizId: { in: quizIds } },
    });
  }

  updateFullTestTotalQuestions(
    testId: number,
    totalQuestions: number,
  ): Promise<FullTest> {
    return this.prisma.fullTest.update({
      where: { id: testId },
      data: { totalQuestions },
    });
  }

  async findTestIdByQuestionId(questionId: number): Promise<number | null> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { quizId: true },
    });
    if (!question || !question.quizId) return null;
    const section = await this.prisma.fullTestSection.findFirst({
      where: { quizId: question.quizId },
      select: { testId: true },
    });
    return section?.testId ?? null;
  }

  findAnswersByQuestionId(questionId: number): Promise<Answer[]> {
    return this.prisma.answer.findMany({
      where: { questionId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async deleteAnswersByIds(ids: number[]): Promise<number> {
    const res = await this.prisma.answer.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  updateAnswer(id: number, data: Prisma.AnswerUpdateInput): Promise<Answer> {
    return this.prisma.answer.update({
      where: { id },
      data,
    });
  }

  createAnswer(data: Prisma.AnswerUncheckedCreateInput): Promise<Answer> {
    return this.prisma.answer.create({ data });
  }

  async findQuizIdsByTestId(testId: number): Promise<number[]> {
    const sections = await this.prisma.fullTestSection.findMany({
      where: { testId, quizId: { not: null } },
      select: { quizId: true },
    });
    return sections
      .map((s) => s.quizId)
      .filter((id): id is number => id !== null);
  }

  findQuestionsByQuizIds(
    quizIds: number[],
    questionIds: number[],
  ): Promise<{ id: number }[]> {
    return this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
        quizId: { in: quizIds },
      },
      select: { id: true },
    });
  }

  async updateQuestionsGroup(
    ids: number[],
    data: {
      passageText?: string | null;
      audioUrl?: string | null;
      imageUrl?: string | null;
      groupId?: string | null;
    },
  ): Promise<number> {
    const res = await this.prisma.question.updateMany({
      where: { id: { in: ids } },
      data,
    });
    return res.count;
  }

  async findPartNumberByQuizId(quizId: number): Promise<number | null> {
    const section = await this.prisma.fullTestSection.findFirst({
      where: { quizId },
      select: { partNumber: true },
    });
    return section?.partNumber ?? null;
  }

  async findFullTestQuestions(
    testId: number,
  ): Promise<{ question: QuestionWithAnswers; partNumber: number }[]> {
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
        answers: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });

    return questions
      .map((q) => ({
        question: q,
        partNumber: partByQuiz.get(q.quizId!) ?? 5,
      }))
      .sort(
        (a, b) =>
          a.partNumber - b.partNumber ||
          a.question.displayOrder - b.question.displayOrder ||
          a.question.id - b.question.id,
      );
  }

  findSectionsByTestId(testId: number): Promise<FullTestSection[]> {
    return this.prisma.fullTestSection.findMany({
      where: { testId },
    });
  }

  findSectionsByTestIds(testIds: number[]): Promise<FullTestSection[]> {
    return this.prisma.fullTestSection.findMany({
      where: { testId: { in: testIds } },
    });
  }

  deleteFullTest(id: number): Promise<FullTest> {
    return this.prisma.fullTest.delete({
      where: { id },
    });
  }

  async deleteFullTests(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.prisma.fullTest.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  async deleteQuizzes(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.prisma.quiz.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }

  findCourseById(id: number): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { id },
    });
  }

  findCourseByTitle(title: string): Promise<Course | null> {
    return this.prisma.course.findFirst({
      where: { title },
    });
  }

  createCourse(data: {
    title: string;
    subtitle?: string | null;
    courseType: string;
    isActive?: boolean;
    price?: number;
    instructor?: string;
    durationMonths?: number;
  }): Promise<Course> {
    return this.prisma.course.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? 'Bộ đề thi thử TOEIC sát đề thi thật 2026',
        courseType: data.courseType,
        isActive: data.isActive ?? true,
        price: data.price ?? 0,
        instructor: data.instructor ?? 'Cô Mai Phương',
        durationMonths: data.durationMonths ?? 12,
      },
    });
  }

  findFullTestByTitleAndCourse(
    title: string,
    courseId: number,
  ): Promise<FullTest | null> {
    return this.prisma.fullTest.findFirst({
      where: { title, courseId },
    });
  }

  createFullTest(data: {
    title: string;
    courseId: number;
    audioUrl?: string | null;
  }): Promise<FullTest> {
    return this.prisma.fullTest.create({
      data: {
        title: data.title,
        courseId: data.courseId,
        audioUrl: data.audioUrl ?? null,
      },
    });
  }

  createFullTestSection(data: {
    testId: number;
    partNumber: number;
    quizId: number;
  }): Promise<FullTestSection> {
    return this.prisma.fullTestSection.create({
      data: {
        testId: data.testId,
        partNumber: data.partNumber,
        quizId: data.quizId,
      },
    });
  }

  createQuizRaw(data: {
    title: string;
    totalQuestions: number;
    displayOrder: number;
  }): Promise<Quiz> {
    return this.prisma.quiz.create({
      data: {
        title: data.title,
        totalQuestions: data.totalQuestions,
        displayOrder: data.displayOrder,
      },
    });
  }

  async deleteQuestionsByQuizIds(quizIds: number[]): Promise<number> {
    if (quizIds.length === 0) return 0;
    // Prisma cascade or delete answers first if needed
    const questions = await this.prisma.question.findMany({
      where: { quizId: { in: quizIds } },
      select: { id: true },
    });
    const questionIds = questions.map((q) => q.id);
    if (questionIds.length > 0) {
      await this.prisma.answer.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      const res = await this.prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
      return res.count;
    }
    return 0;
  }

  countQuestionsByQuizId(quizId: number): Promise<number> {
    return this.prisma.question.count({
      where: { quizId },
    });
  }
}
