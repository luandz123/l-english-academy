import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Enrollment,
  Lesson,
  Material,
  Module,
} from '../../generated/prisma/client';

export type ModuleWithLessons = Module & { lessons: Lesson[] };

export interface LessonAccessRow {
  isFree: boolean | null;
  module: { isFree: boolean | null; courseId: number | null } | null;
}

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
}
