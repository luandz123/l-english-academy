import { Injectable } from '@nestjs/common';
import type { Material, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type MaterialWithCourse = Material & {
  course?: { title: string } | null;
};

@Injectable()
export class MaterialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  inTransaction<T>(
    fn: (txRepo: MaterialsRepository) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      fn(new MaterialsRepository(tx as unknown as PrismaService)),
    );
  }

  async findMany(params: {
    courseId?: number;
    folderPath?: string;
  }): Promise<MaterialWithCourse[]> {
    const where: Prisma.MaterialWhereInput = {};
    if (params.courseId !== undefined) {
      where.courseId = params.courseId;
    }
    if (params.folderPath !== undefined) {
      where.folderPath = params.folderPath;
    }

    const isCourseScoped = params.courseId !== undefined;

    return this.prisma.material.findMany({
      where,
      include: {
        course: { select: { title: true } },
      },
      orderBy: isCourseScoped
        ? [{ displayOrder: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number): Promise<MaterialWithCourse | null> {
    return this.prisma.material.findUnique({
      where: { id },
      include: {
        course: { select: { title: true } },
      },
    });
  }

  async findCourseById(id: number): Promise<{ id: number } | null> {
    return this.prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async findLessonById(id: number): Promise<{ id: number } | null> {
    return this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async findQuizById(id: number): Promise<{ id: number } | null> {
    return this.prisma.quiz.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async create(data: {
    title: string;
    fileUrl: string;
    fileType: string;
    folderPath: string;
    courseId?: number | null;
    lessonId?: number | null;
    quizId?: number | null;
    displayOrder?: number;
  }): Promise<MaterialWithCourse> {
    return this.prisma.material.create({
      data,
      include: {
        course: { select: { title: true } },
      },
    });
  }

  async delete(id: number): Promise<Material> {
    return this.prisma.material.delete({
      where: { id },
    });
  }

  async findAllForFolderOps(): Promise<
    Array<{ id: number; folderPath: string | null }>
  > {
    return this.prisma.material.findMany({
      select: { id: true, folderPath: true },
    });
  }

  async updateFolderPath(id: number, folderPath: string): Promise<void> {
    await this.prisma.material.update({
      where: { id },
      data: { folderPath },
    });
  }

  async deleteManyByIds(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await this.prisma.material.deleteMany({
      where: { id: { in: ids } },
    });
    return res.count;
  }
}
