import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';

/**
 * Quyền với câu hỏi luyện tập = quyền với đề nguồn (chủ dự án chọn, 2026-11-09): admin, khóa
 * miễn phí, hoặc ghi danh còn hạn — cùng `LearningService.canAccessCourse` mà Full Test dùng
 * (FULLTEST_LOCKED). Đề chưa tới ngày phát hành không đưa vào kho (học viên chưa làm được).
 */
@Injectable()
export class PracticeAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learning: LearningService,
  ) {}

  async accessibleTestIds(user: AuthenticatedUser): Promise<Set<number>> {
    const tests = await this.prisma.fullTest.findMany({
      select: { id: true, courseId: true, releaseDate: true },
    });
    const now = Date.now();
    const courseIds = [...new Set(tests.map((t) => t.courseId))];
    const allowed = new Map<number | null, boolean>();
    await Promise.all(
      courseIds.map(async (c) =>
        allowed.set(c, await this.learning.canAccessCourse(c, user)),
      ),
    );
    return new Set(
      tests
        .filter(
          (t) =>
            allowed.get(t.courseId) &&
            (!t.releaseDate || t.releaseDate.getTime() <= now),
        )
        .map((t) => t.id),
    );
  }

  canAccessCourse(
    courseId: number | null,
    user: AuthenticatedUser,
  ): Promise<boolean> {
    return this.learning.canAccessCourse(courseId, user);
  }
}
