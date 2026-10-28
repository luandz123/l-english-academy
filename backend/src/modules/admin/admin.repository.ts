import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminStudentNote,
  PlatformSetting,
  Prisma,
} from '../../generated/prisma/client';

export type ProfileRecord = Prisma.ProfileGetPayload<object>;

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findNotesByStudent(studentId: string): Promise<AdminStudentNote[]> {
    return this.prisma.adminStudentNote.findMany({
      where: { studentId },
      orderBy: [{ createdAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    });
  }

  createNote(data: {
    adminId: string;
    studentId: string;
    content: string;
  }): Promise<AdminStudentNote> {
    return this.prisma.adminStudentNote.create({
      data,
    });
  }

  findSettingByKey(key: string): Promise<PlatformSetting | null> {
    return this.prisma.platformSetting.findUnique({
      where: { key },
    });
  }

  findAllSettings(): Promise<PlatformSetting[]> {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  upsertSetting(key: string, value: string): Promise<PlatformSetting> {
    const now = new Date();
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedAt: now,
      },
      update: {
        value,
        updatedAt: now,
      },
    });
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async getStatsCounts(): Promise<{
    total_students: number;
    total_courses: number;
    total_quiz_attempts: number;
  }> {
    const [total_students, total_courses, total_quiz_attempts] =
      await Promise.all([
        this.prisma.profile.count(),
        this.prisma.course.count({ where: { isActive: true } }),
        this.prisma.userQuizResult.count(),
      ]);
    return {
      total_students,
      total_courses,
      total_quiz_attempts,
    };
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  findRecentEnrollments(limit = 5) {
    return this.prisma.enrollment.findMany({
      orderBy: [
        { enrolledAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit,
      include: {
        course: {
          select: { title: true },
        },
        user: {
          include: {
            profile: {
              select: { userId: true, fullName: true },
            },
          },
        },
      },
    });
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  findRecentQuizResults(limit = 5) {
    return this.prisma.userQuizResult.findMany({
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit,
      include: {
        quiz: {
          select: { title: true },
        },
        user: {
          include: {
            profile: {
              select: { userId: true, fullName: true },
            },
          },
        },
      },
    });
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async findQuizScores(): Promise<{
    quizzes: { id: number; title: string }[];
    results: { quiz_id: number; score: number }[];
  }> {
    const [quizzes, results] = await Promise.all([
      this.prisma.quiz.findMany({
        select: { id: true, title: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.userQuizResult.findMany({
        select: { quizId: true, score: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    return {
      quizzes,
      results: results.map((r) => ({
        quiz_id: r.quizId,
        score: Number(r.score ?? 0),
      })),
    };
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async findCourseEnrollments(): Promise<{
    courses: { id: number; title: string }[];
    enrollments: { course_id: number }[];
  }> {
    const [courses, enrollments] = await Promise.all([
      this.prisma.course.findMany({
        where: { isActive: true },
        select: { id: true, title: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.enrollment.findMany({
        select: { courseId: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    return {
      courses,
      enrollments: enrollments.map((e) => ({
        course_id: e.courseId,
      })),
    };
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async findUserAnswers(): Promise<
    {
      question_id: number;
      is_correct: boolean | null;
    }[]
  > {
    const answers = await this.prisma.userAnswer.findMany({
      select: { questionId: true, isCorrect: true },
      orderBy: { id: 'asc' },
    });
    return answers.map((a) => ({
      question_id: a.questionId,
      is_correct: a.isCorrect,
    }));
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async findQuestionsByIds(
    ids: number[],
  ): Promise<{ id: number; question_text: string | null }[]> {
    if (ids.length === 0) {
      return [];
    }
    const questions = await this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, questionText: true },
      orderBy: { id: 'asc' },
    });
    return questions.map((q) => ({
      id: q.id,
      question_text: q.questionText,
    }));
  }

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async findStudentsWithEnrollments(): Promise<{
    profiles: ProfileRecord[];
    enrollments: { user_id: string; expires_at: string | null }[];
  }> {
    const [profiles, enrollments] = await Promise.all([
      this.prisma.profile.findMany({
        orderBy: [
          { createdAt: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
      }),
      this.prisma.enrollment.findMany({
        select: { userId: true, expiresAt: true },
        orderBy: { id: 'asc' },
      }),
    ]);
    return {
      profiles,
      enrollments: enrollments.map((e) => ({
        user_id: e.userId,
        expires_at: e.expiresAt ? e.expiresAt.toISOString() : null,
      })),
    };
  }
}
