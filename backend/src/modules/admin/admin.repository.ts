import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminActivityLog,
  AdminStudentNote,
  AppRole,
  PlatformSetting,
  Prisma,
} from '../../generated/prisma/client';

export type ProfileRecord = Prisma.ProfileGetPayload<object>;

export const BACKUP_TABLES = [
  'platform_settings',
  'course_categories',
  'courses',
  'modules',
  'lessons',
  'lesson_practices',
  'quizzes',
  'full_tests',
  'full_test_sections',
  'questions',
  'answers',
  'profiles',
  'user_roles',
  'enrollments',
  'user_full_test_results',
  'user_quiz_results',
  'user_lesson_progress',
  'vocab_categories',
  'vocab_quizzes',
  'vocab_questions',
] as const;

function serializeRowValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === 'bigint') return Number(val);
  if (val instanceof Date) return val.toISOString();
  if (
    typeof val === 'object' &&
    val !== null &&
    'toNumber' in val &&
    typeof (val as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (val as { toNumber: () => number }).toNumber();
  }
  if (Array.isArray(val)) {
    return val.map(serializeRowValue);
  }
  return val;
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    result[key] = serializeRowValue(val);
  }
  return result;
}

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

  async getBackupStats(): Promise<Record<string, number>> {
    const [
      courses,
      lessons,
      full_tests,
      questions,
      answers,
      profiles,
      user_full_test_results,
      enrollments,
      vocab_quizzes,
      platform_settings,
    ] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.lesson.count(),
      this.prisma.fullTest.count(),
      this.prisma.question.count(),
      this.prisma.answer.count(),
      this.prisma.profile.count(),
      this.prisma.userFullTestResult.count(),
      this.prisma.enrollment.count(),
      this.prisma.vocabQuiz.count(),
      this.prisma.platformSetting.count(),
    ]);
    return {
      courses,
      lessons,
      full_tests,
      questions,
      answers,
      profiles,
      user_full_test_results,
      enrollments,
      vocab_quizzes,
      platform_settings,
    };
  }

  async getBackupFullSnapshot(): Promise<Record<string, unknown[]>> {
    const tableQueries = BACKUP_TABLES.map(async (table) => {
      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "${table}"`,
      );
      return [table, rows.map((r) => serializeRow(r))] as const;
    });
    const entries = await Promise.all(tableQueries);
    return Object.fromEntries(entries);
  }

  async getBackupStudents(): Promise<
    {
      user_id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      updated_at: string | null;
    }[]
  > {
    const profiles = await this.prisma.profile.findMany({
      select: {
        userId: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return profiles.map((p) => ({
      user_id: p.userId,
      full_name: p.fullName,
      email: p.email,
      avatar_url: p.avatarUrl,
      updated_at: p.updatedAt ? p.updatedAt.toISOString() : null,
    }));
  }

  async getBackupTestResults(): Promise<
    {
      id: number;
      user_id: string;
      test_id: number;
      correct_answers: number | null;
      listening_score: number | null;
      reading_score: number | null;
      total_score: number | null;
      time_spent_seconds: number | null;
      test_mode: string | null;
      created_at: string | null;
    }[]
  > {
    const results = await this.prisma.userFullTestResult.findMany({
      select: {
        id: true,
        userId: true,
        testId: true,
        correctAnswers: true,
        listeningScore: true,
        readingScore: true,
        totalScore: true,
        timeSpentSeconds: true,
        testMode: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });
    return results.map((r) => ({
      id: r.id,
      user_id: r.userId,
      test_id: r.testId,
      correct_answers: r.correctAnswers,
      listening_score: r.listeningScore,
      reading_score: r.readingScore,
      total_score: r.totalScore,
      time_spent_seconds: r.timeSpentSeconds,
      test_mode: r.testMode,
      created_at: r.completedAt ? r.completedAt.toISOString() : null,
    }));
  }

  async getBackupQuestionBank(): Promise<{
    full_tests: { id: number; title: string; category: string }[];
    questions: unknown[];
    answers: unknown[];
  }> {
    const [questions, answers, fullTests] = await Promise.all([
      this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM "questions"',
      ),
      this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM "answers"',
      ),
      this.prisma.fullTest.findMany({
        select: {
          id: true,
          title: true,
          category: true,
        },
      }),
    ]);
    return {
      full_tests: fullTests,
      questions: questions.map((q) => serializeRow(q)),
      answers: answers.map((a) => serializeRow(a)),
    };
  }

  async findAdminUsers(): Promise<ProfileRecord[]> {
    const adminRoles = await this.prisma.userRole.findMany({
      where: { role: AppRole.admin },
      select: { userId: true },
    });
    const userIds = adminRoles.map((r) => r.userId);
    if (userIds.length === 0) return [];
    return this.prisma.profile.findMany({
      where: { userId: { in: userIds } },
      orderBy: { fullName: 'asc' },
    });
  }

  createActivityLog(data: {
    adminId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Prisma.InputJsonValue;
  }): Promise<AdminActivityLog> {
    return this.prisma.adminActivityLog.create({
      data: {
        adminId: data.adminId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        details: data.details,
      },
    });
  }

  findActivityLogs(limit = 100): Promise<AdminActivityLog[]> {
    return this.prisma.adminActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
