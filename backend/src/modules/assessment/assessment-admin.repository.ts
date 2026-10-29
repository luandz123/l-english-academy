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
  VocabQuestion,
  VocabQuiz,
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

  findVocabQuizByLessonId(lessonId: number): Promise<VocabQuiz | null> {
    return this.prisma.vocabQuiz.findFirst({
      where: { lessonId },
    });
  }

  createVocabQuiz(data: {
    lessonId: number;
    title: string;
    display_order?: number;
  }): Promise<VocabQuiz> {
    return this.prisma.vocabQuiz.create({
      data: {
        lessonId: data.lessonId,
        title: data.title,
        displayOrder: data.display_order ?? 0,
        totalQuestions: 0,
      },
    });
  }

  findVocabWords(
    quizId: number,
    questionId?: number,
  ): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: {
        vocabQuizId: quizId,
        ...(questionId ? { questionId } : {}),
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createVocabWords(
    quizId: number,
    words: {
      word: string;
      definition_vi?: string | null;
      definition_en?: string | null;
      phonetic?: string | null;
      audio_male_url?: string | null;
      example_sentence?: string | null;
      question_id?: number | null;
      display_order?: number;
    }[],
  ): Promise<number> {
    const existingCount = await this.prisma.vocabQuestion.count({
      where: { vocabQuizId: quizId },
    });
    await this.prisma.vocabQuestion.createMany({
      data: words.map((w, idx) => ({
        vocabQuizId: quizId,
        word: w.word,
        definitionVi: w.definition_vi ?? null,
        definitionEn: w.definition_en ?? null,
        phonetic: w.phonetic ?? null,
        audioMaleUrl: w.audio_male_url ?? null,
        exampleSentence: w.example_sentence ?? null,
        questionId: w.question_id ?? null,
        displayOrder:
          w.display_order !== undefined ? w.display_order : existingCount + idx,
      })),
    });
    const totalCount = await this.prisma.vocabQuestion.count({
      where: { vocabQuizId: quizId },
    });
    await this.prisma.vocabQuiz.update({
      where: { id: quizId },
      data: { totalQuestions: totalCount },
    });
    return words.length;
  }

  updateVocabWord(
    id: number,
    data: {
      word?: string;
      definition_vi?: string | null;
      definition_en?: string | null;
      phonetic?: string | null;
      audio_male_url?: string | null;
      example_sentence?: string | null;
      question_id?: number | null;
      display_order?: number;
    },
  ): Promise<VocabQuestion> {
    return this.prisma.vocabQuestion.update({
      where: { id },
      data: {
        ...(data.word !== undefined ? { word: data.word } : {}),
        ...(data.definition_vi !== undefined
          ? { definitionVi: data.definition_vi }
          : {}),
        ...(data.definition_en !== undefined
          ? { definitionEn: data.definition_en }
          : {}),
        ...(data.phonetic !== undefined ? { phonetic: data.phonetic } : {}),
        ...(data.audio_male_url !== undefined
          ? { audioMaleUrl: data.audio_male_url }
          : {}),
        ...(data.example_sentence !== undefined
          ? { exampleSentence: data.example_sentence }
          : {}),
        ...(data.question_id !== undefined
          ? { questionId: data.question_id }
          : {}),
        ...(data.display_order !== undefined
          ? { displayOrder: data.display_order }
          : {}),
      },
    });
  }

  async deleteVocabWord(id: number): Promise<void> {
    const word = await this.prisma.vocabQuestion.findUnique({
      where: { id },
      select: { vocabQuizId: true },
    });
    if (!word) return;
    await this.prisma.vocabQuestion.delete({ where: { id } });
    if (word.vocabQuizId) {
      const count = await this.prisma.vocabQuestion.count({
        where: { vocabQuizId: word.vocabQuizId },
      });
      await this.prisma.vocabQuiz.update({
        where: { id: word.vocabQuizId },
        data: { totalQuestions: count },
      });
    }
  }

  async bulkDeleteVocabWords(ids: number[]): Promise<number> {
    const words = await this.prisma.vocabQuestion.findMany({
      where: { id: { in: ids } },
      select: { vocabQuizId: true },
    });
    const quizIds = [
      ...new Set(
        words
          .map((w) => w.vocabQuizId)
          .filter((qid): qid is number => qid !== null),
      ),
    ];
    const res = await this.prisma.vocabQuestion.deleteMany({
      where: { id: { in: ids } },
    });
    for (const quizId of quizIds) {
      const count = await this.prisma.vocabQuestion.count({
        where: { vocabQuizId: quizId },
      });
      await this.prisma.vocabQuiz.update({
        where: { id: quizId },
        data: { totalQuestions: count },
      });
    }
    return res.count;
  }

  findAllLessonsForVocab(): Promise<
    { id: number; title: string; moduleId: number | null }[]
  > {
    return this.prisma.lesson.findMany({
      select: { id: true, title: true, moduleId: true },
      orderBy: { id: 'desc' },
    });
  }

  async findLessonQuestions(lessonId: number): Promise<
    {
      id: number;
      question_text: string | null;
      display_order: number;
    }[]
  > {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { quizId: true },
    });
    if (!lesson || !lesson.quizId) return [];
    const questions = await this.prisma.question.findMany({
      where: { quizId: lesson.quizId },
      select: { id: true, questionText: true, displayOrder: true },
      orderBy: { displayOrder: 'asc' },
    });
    return questions.map((q) => ({
      id: q.id,
      question_text: q.questionText,
      display_order: q.displayOrder,
    }));
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
    description?: string | null;
    audioUrl?: string | null;
    category?: string;
    displayOrder?: number;
    releaseDate?: Date | null;
    totalQuestions?: number;
  }): Promise<FullTest> {
    return this.prisma.fullTest.create({
      data: {
        title: data.title,
        courseId: data.courseId,
        description: data.description ?? null,
        audioUrl: data.audioUrl ?? null,
        // undefined → mặc định DB (category 'general', display_order 0, total_questions 200)
        category: data.category,
        displayOrder: data.displayOrder,
        releaseDate: data.releaseDate,
        totalQuestions: data.totalQuestions,
      },
    });
  }

  findAdminFullTests(courseId?: number) {
    return this.prisma.fullTest.findMany({
      where: courseId ? { courseId } : undefined,
      include: {
        course: {
          select: { title: true },
        },
        fullTestSections: {
          include: {
            quiz: {
              select: { totalQuestions: true },
            },
          },
          orderBy: { partNumber: 'asc' },
        },
      },
      orderBy: courseId
        ? [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
    });
  }

  searchVocabQuestions(query?: string) {
    return this.prisma.vocabQuestion.findMany({
      where: query?.trim()
        ? {
            word: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: { id: 'desc' },
      take: 60,
      select: {
        id: true,
        word: true,
        phonetic: true,
        definitionVi: true,
        exampleSentence: true,
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
