import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Enrollment,
  Lesson,
  LessonPractice,
  Material,
  Module,
  Quiz,
  UserFavorite,
  UserLessonProgress,
  UserNote,
} from '../../generated/prisma/client';

export type ModuleWithLessons = Module & { lessons: Lesson[] };

export interface LessonAccessRow {
  isFree: boolean | null;
  module: { isFree: boolean | null; courseId: number | null } | null;
}

export type LessonPracticeWithQuiz = LessonPractice & {
  quiz: Pick<Quiz, 'id' | 'title' | 'totalQuestions'> | null;
};

@Injectable()
export class LearningRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Một truy vấn cho cả cây (Prisma gom `include` thành một lần đọc lessons). */
  findCurriculum(
    courseId: number,
    includeUnpublished: boolean,
  ): Promise<ModuleWithLessons[]> {
    const published = includeUnpublished ? {} : { isPublished: true };
    return this.prisma.module.findMany({
      where: { courseId, ...published },
      include: {
        lessons: {
          where: published,
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findEnrollment(userId: string, courseId: number): Promise<Enrollment | null> {
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  findLessonAccess(lessonId: number): Promise<LessonAccessRow | null> {
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isFree: true,
        module: { select: { isFree: true, courseId: true } },
      },
    });
  }

  findMaterialsByLesson(lessonId: number): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { lessonId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async lessonExists(lessonId: number): Promise<boolean> {
    const count = await this.prisma.lesson.count({
      where: { id: lessonId },
    });
    return count > 0;
  }

  findProgressByUser(userId: string): Promise<UserLessonProgress[]> {
    return this.prisma.userLessonProgress.findMany({
      where: { userId },
      orderBy: [
        { lastWatchedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  upsertProgress(
    userId: string,
    lessonId: number,
    isCompleted: boolean,
  ): Promise<UserLessonProgress> {
    return this.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        isCompleted,
      },
      update: {
        isCompleted,
      },
    });
  }

  findFavoritesByUser(userId: string): Promise<UserFavorite[]> {
    return this.prisma.userFavorite.findMany({
      where: { userId },
      orderBy: [{ id: 'asc' }],
    });
  }

  upsertFavorite(userId: string, lessonId: number): Promise<UserFavorite> {
    return this.prisma.userFavorite.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    });
  }

  async deleteFavorite(userId: string, lessonId: number): Promise<void> {
    await this.prisma.userFavorite.deleteMany({
      where: { userId, lessonId },
    });
  }

  findNotes(userId: string, lessonId: number): Promise<UserNote[]> {
    return this.prisma.userNote.findMany({
      where: { userId, lessonId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  createNote(
    userId: string,
    lessonId: number,
    content: string,
  ): Promise<UserNote> {
    return this.prisma.userNote.create({
      data: {
        userId,
        lessonId,
        content,
      },
    });
  }

  findPracticesByLesson(lessonId: number): Promise<LessonPracticeWithQuiz[]> {
    return this.prisma.lessonPractice.findMany({
      where: { lessonId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
          },
        },
      },
      orderBy: [{ triggerAtSeconds: 'asc' }, { id: 'asc' }],
    });
  }
}
