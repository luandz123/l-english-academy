import { Injectable } from '@nestjs/common';
import type {
  Course,
  CourseCategory,
  Lesson,
  Module,
  Quiz,
} from '../../generated/prisma/client';
import {
  AdminModuleDto,
  AdminModuleLessonDto,
  AdminModuleQuizDto,
  CourseCategoryDto,
  CourseDto,
  ModuleDto,
} from './dto';
import type { AdminModuleWithRelations } from './catalog.repository';

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

  toModuleDto(mod: Module): ModuleDto {
    return {
      id: mod.id,
      course_id: mod.courseId,
      title: mod.title,
      description: mod.description,
      display_order: mod.displayOrder,
      is_free: mod.isFree,
      is_published: mod.isPublished,
    };
  }

  toAdminModuleLessonDto(lesson: Lesson): AdminModuleLessonDto {
    return {
      id: lesson.id,
      module_id: lesson.moduleId,
      title: lesson.title,
      video_url: lesson.videoUrl,
      duration_seconds: lesson.durationSeconds,
      display_order: lesson.displayOrder,
      is_live: lesson.isLive,
      live_time: lesson.liveTime ? lesson.liveTime.toISOString() : null,
      lesson_type: lesson.lessonType,
      quiz_id: lesson.quizId,
      pdf_url: lesson.pdfUrl,
      is_free: lesson.isFree,
      is_published: lesson.isPublished,
    };
  }

  toAdminModuleQuizDto(quiz: Quiz): AdminModuleQuizDto {
    return {
      id: quiz.id,
      module_id: quiz.moduleId,
      title: quiz.title,
      total_questions: quiz.totalQuestions,
      time_limit_seconds: quiz.timeLimitSeconds,
      display_order: quiz.displayOrder,
      audio_url: quiz.audioUrl,
      is_free: quiz.isFree,
    };
  }

  toAdminModuleDto(mod: AdminModuleWithRelations): AdminModuleDto {
    return {
      ...this.toModuleDto(mod),
      lessons: mod.lessons.map((l) => this.toAdminModuleLessonDto(l)),
      quizzes: mod.quizzes.map((q) => this.toAdminModuleQuizDto(q)),
    };
  }
}
