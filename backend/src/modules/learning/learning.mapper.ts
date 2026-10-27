import { Injectable } from '@nestjs/common';
import type {
  Enrollment,
  Lesson,
  Material,
} from '../../generated/prisma/client';
import {
  CurriculumModuleDto,
  EnrollmentDto,
  LessonDto,
  MaterialDto,
} from './dto';
import type { ModuleWithLessons } from './learning.repository';

@Injectable()
export class LearningMapper {
  /** `canStudy = false` → bỏ URL nội dung, giữ các trường sidebar cần. */
  toLessonDto(lesson: Lesson, canStudy: boolean): LessonDto {
    return {
      id: lesson.id,
      module_id: lesson.moduleId,
      title: lesson.title,
      video_url: canStudy ? lesson.videoUrl : null,
      duration_seconds: lesson.durationSeconds,
      display_order: lesson.displayOrder,
      is_live: lesson.isLive,
      live_time: lesson.liveTime ? lesson.liveTime.toISOString() : null,
      lesson_type: lesson.lessonType,
      quiz_id: lesson.quizId,
      pdf_url: canStudy ? lesson.pdfUrl : null,
      is_free: lesson.isFree,
      is_published: lesson.isPublished,
    };
  }

  toCurriculumModuleDto(
    module: ModuleWithLessons,
    canStudy: (lesson: Lesson) => boolean,
  ): CurriculumModuleDto {
    return {
      id: module.id,
      course_id: module.courseId,
      title: module.title,
      description: module.description,
      display_order: module.displayOrder,
      is_free: module.isFree,
      is_published: module.isPublished,
      lessons: module.lessons.map((l) => this.toLessonDto(l, canStudy(l))),
    };
  }

  toMaterialDto(material: Material): MaterialDto {
    return {
      id: material.id,
      lesson_id: material.lessonId,
      quiz_id: material.quizId,
      course_id: material.courseId,
      title: material.title,
      file_url: material.fileUrl,
      file_type: material.fileType,
      display_order: material.displayOrder,
      created_at: material.createdAt ? material.createdAt.toISOString() : null,
      folder_path: material.folderPath,
    };
  }

  toEnrollmentDto(enrollment: Enrollment): EnrollmentDto {
    return {
      id: enrollment.id,
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      enrolled_at: enrollment.enrolledAt
        ? enrollment.enrolledAt.toISOString()
        : null,
      expires_at: enrollment.expiresAt
        ? enrollment.expiresAt.toISOString()
        : null,
    };
  }
}
