import { Injectable } from '@nestjs/common';
import type {
  AdminStudentNote,
  PlatformSetting,
  Prisma,
} from '../../generated/prisma/client';
import { toProfileDto as toAuthProfileDto } from '../auth/auth.mapper';
import type { ProfileDto } from '../auth/dto/profile.dto';
import type { ProfileRecord } from './admin.repository';
import {
  AdminNoteDto,
  RecentEnrollmentDto,
  RecentQuizResultDto,
  SettingDto,
} from './dto';

export type RecentEnrollmentRecord = {
  id: number;
  userId: string;
  courseId: number;
  enrolledAt: Date | null;
  expiresAt: Date | null;
  course: { title: string } | null;
  user: { profile: { userId: string; fullName: string | null } | null } | null;
};

export type RecentQuizResultRecord = {
  id: number;
  userId: string;
  quizId: number;
  score: Prisma.Decimal | number | null;
  correctAnswers: number | null;
  totalQuestions: number | null;
  completedAt: Date | null;
  quiz: { title: string } | null;
  user: { profile: { userId: string; fullName: string | null } | null } | null;
};

@Injectable()
export class AdminMapper {
  toAdminNoteDto(note: AdminStudentNote): AdminNoteDto {
    return {
      id: note.id,
      admin_id: note.adminId,
      student_id: note.studentId,
      content: note.content,
      created_at: note.createdAt ? note.createdAt.toISOString() : null,
    };
  }

  toSettingDto(setting: PlatformSetting): SettingDto {
    return {
      key: setting.key,
      value: setting.value,
      updated_at: setting.updatedAt ? setting.updatedAt.toISOString() : null,
    };
  }

  toRecentEnrollmentDto(e: RecentEnrollmentRecord): RecentEnrollmentDto {
    return {
      id: e.id,
      user_id: e.userId,
      course_id: e.courseId,
      enrolled_at: e.enrolledAt ? e.enrolledAt.toISOString() : null,
      expires_at: e.expiresAt ? e.expiresAt.toISOString() : null,
      courses: e.course ? { title: e.course.title } : null,
      profiles: e.user?.profile
        ? {
            user_id: e.user.profile.userId,
            full_name: e.user.profile.fullName,
          }
        : null,
    };
  }

  toRecentQuizResultDto(r: RecentQuizResultRecord): RecentQuizResultDto {
    return {
      id: r.id,
      user_id: r.userId,
      quiz_id: r.quizId,
      score: Number(r.score ?? 0),
      correct_answers: r.correctAnswers,
      total_questions: r.totalQuestions,
      completed_at: r.completedAt ? r.completedAt.toISOString() : null,
      quizzes: r.quiz ? { title: r.quiz.title } : null,
      profiles: r.user?.profile
        ? {
            user_id: r.user.profile.userId,
            full_name: r.user.profile.fullName,
          }
        : null,
    };
  }

  toProfileDto(p: ProfileRecord): ProfileDto {
    return toAuthProfileDto(p);
  }
}
