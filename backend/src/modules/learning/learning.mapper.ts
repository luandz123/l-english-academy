import { Injectable } from '@nestjs/common';
import type {
  Course,
  Enrollment,
  Lesson,
  Material,
  UserFavorite,
  UserLessonProgress,
  UserNote,
} from '../../generated/prisma/client';
import { CourseDto } from '../catalog/dto';
import {
  AdminEnrollmentDto,
  AdminEnrollmentListDto,
  CourseEnrollmentDto,
  CurriculumModuleDto,
  EnrollmentDto,
  FavoriteDto,
  LessonDto,
  LessonProgressDto,
  MaterialDto,
  MyEnrollmentDto,
  NoteDto,
  PracticeDto,
  PracticeQuestionDto,
} from './dto';
import type {
  EnrollmentWithCourseAndProfile,
  EnrollmentWithCourseTitle,
  EnrollmentWithFullCourse,
  EnrollmentWithProfile,
  LessonPracticeWithQuiz,
  ModuleWithLessons,
  QuestionWithAnswers,
} from './learning.repository';

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

  toMyEnrollmentDto(enrollment: EnrollmentWithFullCourse): MyEnrollmentDto {
    return {
      ...this.toEnrollmentDto(enrollment),
      courses: enrollment.course ? this.toCourseDto(enrollment.course) : null,
    };
  }

  toMyEnrollmentDtoList(
    enrollments: EnrollmentWithFullCourse[],
  ): MyEnrollmentDto[] {
    return enrollments.map((e) => this.toMyEnrollmentDto(e));
  }

  toLessonProgressDto(progress: UserLessonProgress): LessonProgressDto {
    return {
      id: progress.id,
      user_id: progress.userId,
      lesson_id: progress.lessonId,
      is_completed: progress.isCompleted,
      last_watched_at: progress.lastWatchedAt
        ? progress.lastWatchedAt.toISOString()
        : null,
      watch_duration_seconds: progress.watchDurationSeconds,
    };
  }

  toFavoriteDto(favorite: UserFavorite): FavoriteDto {
    return {
      id: favorite.id,
      user_id: favorite.userId,
      lesson_id: favorite.lessonId,
      created_at: favorite.createdAt ? favorite.createdAt.toISOString() : null,
    };
  }

  toNoteDto(note: UserNote): NoteDto {
    return {
      id: note.id,
      user_id: note.userId,
      lesson_id: note.lessonId,
      content: note.content,
      created_at: note.createdAt ? note.createdAt.toISOString() : null,
      updated_at: note.updatedAt ? note.updatedAt.toISOString() : null,
    };
  }

  toPracticeDto(practice: LessonPracticeWithQuiz): PracticeDto {
    return {
      id: practice.id,
      lesson_id: practice.lessonId,
      quiz_id: practice.quizId,
      trigger_at_seconds: practice.triggerAtSeconds,
      title: practice.title,
      display_order: practice.displayOrder,
      created_at: practice.createdAt ? practice.createdAt.toISOString() : null,
      quizzes: practice.quiz
        ? {
            id: practice.quiz.id,
            title: practice.quiz.title,
            total_questions: practice.quiz.totalQuestions,
          }
        : null,
    };
  }

  toAdminEnrollmentDto(
    enrollment: EnrollmentWithCourseTitle,
  ): AdminEnrollmentDto {
    return {
      ...this.toEnrollmentDto(enrollment),
      courses: enrollment.course ? { title: enrollment.course.title } : null,
    };
  }

  toAdminEnrollmentListDto(
    enrollment: EnrollmentWithCourseAndProfile,
  ): AdminEnrollmentListDto {
    return {
      ...this.toAdminEnrollmentDto(enrollment),
      profiles: enrollment.user?.profile
        ? {
            id: enrollment.user.profile.id,
            user_id: enrollment.user.profile.userId,
            full_name: enrollment.user.profile.fullName,
          }
        : null,
    };
  }

  toCourseEnrollmentDto(
    enrollment: EnrollmentWithProfile,
  ): CourseEnrollmentDto {
    return {
      ...this.toEnrollmentDto(enrollment),
      profiles: enrollment.user?.profile
        ? {
            user_id: enrollment.user.profile.userId,
            full_name: enrollment.user.profile.fullName,
          }
        : null,
    };
  }

  toPracticeQuestionDto(q: QuestionWithAnswers): PracticeQuestionDto {
    return {
      id: q.id,
      quiz_id: q.quizId,
      question_text: q.questionText,
      question_type: q.questionType,
      image_url: q.imageUrl,
      audio_url: q.audioUrl,
      display_order: q.displayOrder,
      translation: q.translation,
      dictation_keywords: q.dictationKeywords,
      explanation: q.explanation,
      transcript: q.transcript,
      knowledge_tag: q.knowledgeTag,
      passage_text: q.passageText,
      group_id: q.groupId,
      answers: q.answers.map((a) => ({
        id: a.id,
        question_id: a.questionId,
        answer_text: a.answerText,
        display_order: a.displayOrder,
        is_correct: a.isCorrect,
        explanation: a.explanation,
      })),
    };
  }
}
