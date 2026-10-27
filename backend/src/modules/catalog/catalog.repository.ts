import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Course, CourseCategory } from '../../generated/prisma/client';

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
}
