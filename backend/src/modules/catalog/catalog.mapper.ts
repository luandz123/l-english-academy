import { Injectable } from '@nestjs/common';
import type { Course, CourseCategory } from '../../generated/prisma/client';
import { CourseCategoryDto, CourseDto } from './dto';

@Injectable()
export class CatalogMapper {
  toCategoryDto(category: CourseCategory): CourseCategoryDto {
    return {
      id: Number(category.id),
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? null,
      display_order: category.displayOrder ?? null,
      is_active: category.isActive ?? null,
      created_at: category.createdAt ? category.createdAt.toISOString() : null,
    };
  }

  toCategoryDtoList(categories: CourseCategory[]): CourseCategoryDto[] {
    return categories.map((cat) => this.toCategoryDto(cat));
  }

  toCourseDto(course: Course): CourseDto {
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle ?? null,
      description: course.description ?? null,
      course_type: course.courseType,
      category_id:
        course.categoryId !== null && course.categoryId !== undefined
          ? Number(course.categoryId)
          : null,
      price: course.price ?? null,
      duration_months: course.durationMonths ?? null,
      thumbnail_url: course.thumbnailUrl ?? null,
      instructor: course.instructor ?? null,
      is_active: course.isActive ?? null,
      is_free: course.isFree ?? null,
      display_order: course.displayOrder ?? null,
      created_at: course.createdAt ? course.createdAt.toISOString() : null,
    };
  }

  toCourseDtoList(courses: Course[]): CourseDto[] {
    return courses.map((course) => this.toCourseDto(course));
  }
}
