import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Catalog } from './roadmap-planner';

export const PLACEMENT_QUIZ_SETTING_KEY = 'roadmap_placement_quiz_id';

export interface RoadmapWrite {
  currentMode: string;
  currentScore: number;
  placementResultId: number | null;
  targetScore: number;
  purpose: string;
  examDate: Date | null;
  durationWeeks: number;
  minutesPerDay: number;
  daysPerWeek: number;
  startedAt: Date;
}

/**
 * Bảng `user_roadmaps` (của module này) + đọc chỉ-đọc nội dung khóa/chương/từ vựng/đề,
 * `platform_settings` và `user_quiz_results` để ghép tài nguyên và bài test nhanh
 * (cùng cách PaymentsRepository đọc platform_settings).
 */
@Injectable()
export class RoadmapRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.userRoadmap.findUnique({ where: { userId } });
  }

  /** Mỗi học viên một lộ trình: tạo mới hoặc ghi đè (làm lại wizard). */
  upsert(userId: string, data: RoadmapWrite) {
    return this.prisma.userRoadmap.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async deleteByUser(userId: string): Promise<number> {
    const { count } = await this.prisma.userRoadmap.deleteMany({
      where: { userId },
    });
    return count;
  }

  async findPlacementQuizId(): Promise<number | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: PLACEMENT_QUIZ_SETTING_KEY },
    });
    const id = Number(row?.value?.trim());
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** Quiz + khóa chứa nó (qua chương, hoặc qua bài học gắn quiz). */
  findQuizWithCourse(quizId: number) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        totalQuestions: true,
        timeLimitSeconds: true,
        module: { select: { courseId: true } },
        lessons: {
          select: { module: { select: { courseId: true } } },
          take: 1,
        },
        _count: { select: { questions: true } },
      },
    });
  }

  findLatestQuizResult(userId: string, quizId: number) {
    return this.prisma.userQuizResult.findFirst({
      where: { userId, quizId },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        correctAnswers: true,
        totalQuestions: true,
        completedAt: true,
      },
    });
  }

  /** Nội dung đang mở để gắn vào các chặng (chỉ khóa đang hoạt động, chương đã xuất bản). */
  async loadCatalog(): Promise<Catalog> {
    const activeCourse = { isActive: true };
    const [modules, vocab, fullTests] = await Promise.all([
      this.prisma.module.findMany({
        where: { isPublished: true, course: activeCourse },
        orderBy: [
          { course: { displayOrder: 'asc' } },
          { courseId: 'asc' },
          { displayOrder: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } },
        },
      }),
      this.prisma.vocabCategory.findMany({
        where: { course: activeCourse },
        orderBy: [
          { course: { displayOrder: 'asc' } },
          { displayOrder: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { title: true } },
        },
      }),
      this.prisma.fullTest.findMany({
        where: { OR: [{ courseId: null }, { course: activeCourse }] },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, title: true },
      }),
    ]);

    return {
      modules: modules
        .filter((m) => m.courseId !== null)
        .map((m) => ({
          id: m.id,
          title: m.title,
          courseId: m.courseId as number,
          courseTitle: m.course?.title ?? '',
        })),
      vocabCategories: vocab
        .filter((v) => v.courseId !== null)
        .map((v) => ({
          id: v.id,
          title: v.title,
          courseId: v.courseId as number,
          courseTitle: v.course?.title ?? '',
        })),
      fullTests: fullTests.map((t) => ({ id: t.id, title: t.title })),
    };
  }
}
