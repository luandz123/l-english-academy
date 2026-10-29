import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Lesson,
  VocabCategory,
  VocabQuestion,
  VocabQuiz,
} from '../../generated/prisma/client';

@Injectable()
export class VocabRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCategoriesByCourseId(courseId: number): Promise<VocabCategory[]> {
    return this.prisma.vocabCategory.findMany({
      where: { courseId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findQuizzesByCategoryId(categoryId: number): Promise<VocabQuiz[]> {
    return this.prisma.vocabQuiz.findMany({
      where: { categoryId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findWordsByQuizId(vocabQuizId: number): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: { vocabQuizId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  // --- Chuỗi dò 4 bước tra cứu từ vựng bài học (T-021) ---

  findVocabQuizzesByLessonId(lessonId: number): Promise<VocabQuiz[]> {
    return this.prisma.vocabQuiz.findMany({
      where: { lessonId },
    });
  }

  findVocabQuizzesById(id: number): Promise<VocabQuiz[]> {
    return this.prisma.vocabQuiz.findMany({
      where: { id },
    });
  }

  // Đọc bảng lessons của module Learning — chỉ đọc để tra cứu từ vựng (T-021)
  findLessonsByQuizId(quizId: number): Promise<Lesson[]> {
    return this.prisma.lesson.findMany({
      where: { quizId },
    });
  }

  findVocabQuestionsByQuestionIds(
    questionIds: number[],
  ): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: { questionId: { in: questionIds } },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findVocabQuestionsForQuiz(
    vocabQuizId: number,
    questionIds?: number[],
  ): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: {
        vocabQuizId,
        ...(questionIds && questionIds.length > 0
          ? { questionId: { in: questionIds } }
          : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  // Đọc bảng lessons của module Learning — chỉ đọc để lấy quiz_id (T-021)
  findLessonById(id: number): Promise<{ quizId: number | null } | null> {
    return this.prisma.lesson.findUnique({
      where: { id },
      select: { quizId: true },
    });
  }

  findVocabPool(limit: number = 100): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: {
        word: { not: '' },
        definitionVi: { not: null },
      },
      take: limit,
      orderBy: [{ id: 'asc' }],
    });
  }
}
