import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Course,
  CourseCategory,
  Lesson,
  Module,
  Quiz,
} from '../../generated/prisma/client';

export type AdminModuleWithRelations = Module & {
  lessons: Lesson[];
  quizzes: Quiz[];
};

export interface CategoryFilter {
  isActive?: boolean;
}

export interface CourseFilter {
  isActive?: boolean;
  courseType?: string;
}

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCategories(filter: CategoryFilter): Promise<CourseCategory[]> {
    return this.prisma.courseCategory.findMany({
      where: {
        ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findCourses(filter: CourseFilter): Promise<Course[]> {
    return this.prisma.course.findMany({
      where: {
        ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
        ...(filter.courseType !== undefined
          ? { courseType: filter.courseType }
          : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
    });
  }

  async countCourses(filter: Pick<CourseFilter, 'isActive'>): Promise<number> {
    return this.prisma.course.count({
      where: {
        ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      },
    });
  }

  async findCourseById(id: number): Promise<Course | null> {
    return this.prisma.course.findUnique({
      where: { id },
    });
  }

  async courseExists(courseId: number): Promise<boolean> {
    const count = await this.prisma.course.count({
      where: { id: courseId },
    });
    return count > 0;
  }

  /**
   * Đọc cây chương cho admin (`AdminCourseDetail.tsx:159-165`): trả cả chương/bài ẩn
   * kèm `lessons` và `quizzes`. Join chỉ đọc vào bảng `lessons` (Learning) và `quizzes`
   * (Assessment) ngay trong một câu SQL như PostgREST `select("*, lessons(*), quizzes(*)")`,
   * tránh N+1 qua nhiều service.
   */
  async findAdminModulesByCourse(
    courseId: number,
  ): Promise<AdminModuleWithRelations[]> {
    return this.prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
        quizzes: {
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findModuleById(id: number): Promise<Module | null> {
    return this.prisma.module.findUnique({
      where: { id },
    });
  }

  async nextModuleDisplayOrder(courseId: number): Promise<number> {
    const agg = await this.prisma.module.aggregate({
      where: { courseId },
      _max: { displayOrder: true },
    });
    return agg._max.displayOrder !== null ? agg._max.displayOrder + 1 : 0;
  }

  async createModule(data: {
    courseId: number;
    title: string;
    description: string | null;
    isFree: boolean;
    displayOrder: number;
  }): Promise<Module> {
    return this.prisma.module.create({
      data,
    });
  }

  async updateModule(
    id: number,
    data: {
      title?: string;
      description?: string | null;
      isFree?: boolean;
      isPublished?: boolean;
    },
  ): Promise<Module> {
    return this.prisma.module.update({
      where: { id },
      data,
    });
  }

  async deleteModule(id: number): Promise<void> {
    await this.prisma.module.deleteMany({
      where: { id },
    });
  }

  async findModuleIdsByCourse(courseId: number): Promise<number[]> {
    const rows = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async reorderModules(moduleIds: number[]): Promise<void> {
    if (moduleIds.length === 0) return;
    await this.prisma.$transaction(
      moduleIds.map((id, index) =>
        this.prisma.module.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );
  }

  async setFreeModuleForCourse(
    courseId: number,
    freeModuleId: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.module.updateMany({
        where: { courseId, id: { not: freeModuleId } },
        data: { isFree: false },
      }),
      this.prisma.module.update({
        where: { id: freeModuleId },
        data: { isFree: true },
      }),
    ]);
  }
}
