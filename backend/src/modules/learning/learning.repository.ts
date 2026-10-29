import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Answer,
  Course,
  Enrollment,
  Lesson,
  LessonPractice,
  Material,
  Module,
  Profile,
  Question,
  Quiz,
  UserFavorite,
  UserLessonProgress,
  UserNote,
} from '../../generated/prisma/client';

export type QuestionWithAnswers = Question & { answers: Answer[] };

export type ModuleWithLessons = Module & { lessons: Lesson[] };

export interface LessonAccessRow {
  isFree: boolean | null;
  module: { isFree: boolean | null; courseId: number | null } | null;
}

export interface QuizAccessRow {
  isFree: boolean | null;
  module: { isFree: boolean | null; courseId: number | null } | null;
  lessons: LessonAccessRow[];
}

export type LessonPracticeWithQuiz = LessonPractice & {
  quiz: Pick<Quiz, 'id' | 'title' | 'totalQuestions'> | null;
};

export type EnrollmentWithCourseTitle = Enrollment & {
  course: Pick<Course, 'title'> | null;
};

export type EnrollmentWithFullCourse = Enrollment & {
  course: Course | null;
};

export type EnrollmentWithCourseAndProfile = Enrollment & {
  course: Pick<Course, 'title'> | null;
  user: {
    profile: Pick<Profile, 'id' | 'userId' | 'fullName'> | null;
  };
};

export type EnrollmentWithProfile = Enrollment & {
  user: {
    profile: Pick<Profile, 'userId' | 'fullName'> | null;
  };
};

@Injectable()
export class LearningRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Một truy vấn cho cả cây (Prisma gom `include` thành một lần đọc lessons). */
  findCurriculum(
    courseId: number,
    includeUnpublished: boolean,
  ): Promise<ModuleWithLessons[]> {
    const published = includeUnpublished ? {} : { isPublished: true };
    return this.prisma.module.findMany({
      where: { courseId, ...published },
      include: {
        lessons: {
          where: published,
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  findEnrollment(userId: string, courseId: number): Promise<Enrollment | null> {
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  findLessonAccess(lessonId: number): Promise<LessonAccessRow | null> {
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isFree: true,
        module: { select: { isFree: true, courseId: true } },
      },
    });
  }

  /** Quiz + module của nó + mọi bài gắn quiz này (`lessons.quiz_id`), cho quyền làm quiz. */
  findQuizAccess(quizId: number): Promise<QuizAccessRow | null> {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        isFree: true,
        module: { select: { isFree: true, courseId: true } },
        lessons: {
          select: {
            isFree: true,
            module: { select: { isFree: true, courseId: true } },
          },
        },
      },
    });
  }

  findMaterialsByLesson(lessonId: number): Promise<Material[]> {
    return this.prisma.material.findMany({
      where: { lessonId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async lessonExists(lessonId: number): Promise<boolean> {
    const count = await this.prisma.lesson.count({
      where: { id: lessonId },
    });
    return count > 0;
  }

  findProgressByUser(userId: string): Promise<UserLessonProgress[]> {
    return this.prisma.userLessonProgress.findMany({
      where: { userId },
      orderBy: [
        { lastWatchedAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  upsertProgress(
    userId: string,
    lessonId: number,
    isCompleted: boolean,
  ): Promise<UserLessonProgress> {
    return this.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        isCompleted,
      },
      update: {
        isCompleted,
      },
    });
  }

  findFavoritesByUser(userId: string): Promise<UserFavorite[]> {
    return this.prisma.userFavorite.findMany({
      where: { userId },
      orderBy: [{ id: 'asc' }],
    });
  }

  upsertFavorite(userId: string, lessonId: number): Promise<UserFavorite> {
    return this.prisma.userFavorite.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId },
      update: {},
    });
  }

  async deleteFavorite(userId: string, lessonId: number): Promise<void> {
    await this.prisma.userFavorite.deleteMany({
      where: { userId, lessonId },
    });
  }

  findNotes(userId: string, lessonId: number): Promise<UserNote[]> {
    return this.prisma.userNote.findMany({
      where: { userId, lessonId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  createNote(
    userId: string,
    lessonId: number,
    content: string,
  ): Promise<UserNote> {
    return this.prisma.userNote.create({
      data: {
        userId,
        lessonId,
        content,
      },
    });
  }

  findPracticesByLesson(lessonId: number): Promise<LessonPracticeWithQuiz[]> {
    return this.prisma.lessonPractice.findMany({
      where: { lessonId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
          },
        },
      },
      orderBy: [{ triggerAtSeconds: 'asc' }, { id: 'asc' }],
    });
  }

  inTransaction<T>(fn: (txRepo: LearningRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      fn(new LearningRepository(tx as PrismaService)),
    );
  }

  async moduleExists(moduleId: number): Promise<boolean> {
    const count = await this.prisma.module.count({
      where: { id: moduleId },
    });
    return count > 0;
  }

  findLessonById(id: number): Promise<Lesson | null> {
    return this.prisma.lesson.findUnique({
      where: { id },
    });
  }

  async nextLessonDisplayOrder(moduleId: number): Promise<number> {
    const agg = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: { displayOrder: true },
    });
    return agg._max.displayOrder !== null ? agg._max.displayOrder + 1 : 0;
  }

  // TODO(P3): chuyển sang AssessmentService
  async createAutoQuizForModule(
    moduleId: number | null,
    title: string,
  ): Promise<Quiz> {
    const agg = await this.prisma.quiz.aggregate({
      where: { moduleId },
      _max: { displayOrder: true },
    });
    const displayOrder =
      agg._max.displayOrder !== null ? agg._max.displayOrder + 1 : 0;
    return this.prisma.quiz.create({
      data: {
        title,
        totalQuestions: 0,
        moduleId,
        displayOrder,
      },
    });
  }

  createLesson(data: {
    moduleId: number;
    title: string;
    lessonType: string;
    videoUrl: string | null;
    pdfUrl: string | null;
    durationSeconds: number;
    displayOrder: number;
    quizId: number | null;
  }): Promise<Lesson> {
    return this.prisma.lesson.create({
      data,
    });
  }

  updateLesson(
    id: number,
    data: {
      title?: string;
      lessonType?: string;
      videoUrl?: string | null;
      pdfUrl?: string | null;
      durationSeconds?: number;
      quizId?: number | null;
      isFree?: boolean;
      isPublished?: boolean;
    },
  ): Promise<Lesson> {
    return this.prisma.lesson.update({
      where: { id },
      data,
    });
  }

  async deleteLesson(id: number): Promise<void> {
    await this.prisma.lesson.deleteMany({
      where: { id },
    });
  }

  async findLessonIdsByModule(moduleId: number): Promise<number[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async reorderLessons(lessonIds: number[]): Promise<void> {
    if (lessonIds.length === 0) return;
    await this.prisma.$transaction(
      lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );
  }

  async quizExists(quizId: number): Promise<boolean> {
    const count = await this.prisma.quiz.count({
      where: { id: quizId },
    });
    return count > 0;
  }

  findPracticeById(id: number): Promise<LessonPractice | null> {
    return this.prisma.lessonPractice.findUnique({
      where: { id },
    });
  }

  /** Lấy danh sách câu hỏi kèm đáp án của một quiz (như `select("*, answers(*)")`). */
  findQuestionsWithAnswers(quizId: number): Promise<QuestionWithAnswers[]> {
    return this.prisma.question.findMany({
      where: { quizId },
      include: {
        answers: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
  }

  countPracticesByLesson(lessonId: number): Promise<number> {
    return this.prisma.lessonPractice.count({
      where: { lessonId },
    });
  }

  createPractice(data: {
    lessonId: number;
    quizId: number | null;
    triggerAtSeconds: number;
    title: string;
    displayOrder: number;
  }): Promise<LessonPracticeWithQuiz> {
    return this.prisma.lessonPractice.create({
      data,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
          },
        },
      },
    });
  }

  updatePractice(
    id: number,
    data: {
      quizId: number | null;
      triggerAtSeconds: number;
      title: string;
    },
  ): Promise<LessonPracticeWithQuiz> {
    return this.prisma.lessonPractice.update({
      where: { id },
      data,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalQuestions: true,
          },
        },
      },
    });
  }

  async deletePractice(id: number): Promise<void> {
    await this.prisma.lessonPractice.deleteMany({
      where: { id },
    });
  }

  /**
   * Lấy danh sách ghi danh của chính user kèm toàn bộ thông tin khóa học (T-035).
   * Thay `MyCoursesPage.tsx:48` và `DashboardPage.tsx:114`.
   */
  findMyEnrollments(userId: string): Promise<EnrollmentWithFullCourse[]> {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: true,
      },
      orderBy: [
        { enrolledAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  /**
   * Join chỉ đọc vào bảng `courses` của Catalog để lấy `courses: { title }`
   * đúng shape PostgREST `select("*, courses(title)")` ở AdminStudentDetail.
   */
  findEnrollmentsByUser(userId: string): Promise<EnrollmentWithCourseTitle[]> {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: { title: true },
        },
      },
      orderBy: [{ id: 'asc' }],
    });
  }

  findAllEnrollments(): Promise<EnrollmentWithCourseAndProfile[]> {
    return this.prisma.enrollment.findMany({
      include: {
        course: {
          select: { title: true },
        },
        user: {
          select: {
            profile: {
              select: {
                id: true,
                userId: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { enrolledAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  findEnrollmentsByCourseId(
    courseId: number,
  ): Promise<EnrollmentWithProfile[]> {
    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            profile: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { enrolledAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
    });
  }

  /**
   * Tạo ghi danh và join chỉ đọc vào bảng `courses` của Catalog để lấy `courses: { title }`.
   */
  createEnrollment(data: {
    userId: string;
    courseId: number;
    expiresAt: Date | null;
  }): Promise<EnrollmentWithCourseTitle> {
    return this.prisma.enrollment.create({
      data,
      include: {
        course: {
          select: { title: true },
        },
      },
    });
  }

  async deleteEnrollment(id: number): Promise<void> {
    await this.prisma.enrollment.deleteMany({
      where: { id },
    });
  }
}
