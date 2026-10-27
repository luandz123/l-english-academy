import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from '../catalog/catalog.service';
import { CurriculumModuleDto, EnrollmentResponseDto, MaterialDto } from './dto';
import {
  canStudyLesson,
  isEnrollmentActive,
  lessonAccessContext,
} from './lesson-access';
import { LearningMapper } from './learning.mapper';
import { LearningRepository } from './learning.repository';

@Injectable()
export class LearningService {
  constructor(
    private readonly repo: LearningRepository,
    private readonly mapper: LearningMapper,
    private readonly auth: AuthService,
    private readonly catalog: CatalogService,
  ) {}

  /**
   * Thay `LearnPage.tsx:49-66`. Công khai như RLS "Modules/Lessons viewable by all",
   * nhưng `video_url`/`pdf_url` chỉ trả khi được học (D-02).
   */
  async getCurriculum(
    courseId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<CurriculumModuleDto[]> {
    const isAdmin = await this.isAdmin(user);
    const [modules, course, enrollment] = await Promise.all([
      this.repo.findCurriculum(courseId, isAdmin),
      this.catalog.findCourseById(courseId),
      user && !isAdmin ? this.repo.findEnrollment(user.id, courseId) : null,
    ]);

    return modules.map((module) =>
      this.mapper.toCurriculumModuleDto(module, (lesson) =>
        canStudyLesson(
          lessonAccessContext({
            isAdmin,
            enrollment,
            now: new Date(),
            course,
            module,
            lesson,
          }),
        ),
      ),
    );
  }

  /**
   * Thay `LearnPage.tsx:29-39`. user id luôn lấy từ token (RLS "Users view own enrollments").
   * Hết hạn → `null`: LearnPage chỉ dùng enrollment làm cờ mở khóa (`:224`, `:894`),
   * trả bản ghi hết hạn sẽ hiện player với URL rỗng thay vì màn hình khóa (#18).
   */
  async getMyEnrollment(
    userId: string,
    courseId: number,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.repo.findEnrollment(userId, courseId);
    const active = enrollment && isEnrollmentActive(enrollment, new Date());
    return {
      enrollment: active ? this.mapper.toEnrollmentDto(enrollment) : null,
    };
  }

  /**
   * Thay `LearnPage.tsx:116-126`. Bài không tồn tại hoặc không được học → `[]`
   * (tab tài liệu chỉ hiện khi được học; trả lỗi sẽ sinh trạng thái giao diện mới).
   */
  async getLessonMaterials(
    lessonId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<MaterialDto[]> {
    const lesson = await this.repo.findLessonAccess(lessonId);
    if (!lesson) return [];

    const isAdmin = await this.isAdmin(user);
    const courseId = lesson.module?.courseId ?? null;
    const [course, enrollment] = await Promise.all([
      courseId !== null ? this.catalog.findCourseById(courseId) : null,
      user && !isAdmin && courseId !== null
        ? this.repo.findEnrollment(user.id, courseId)
        : null,
    ]);

    const allowed = canStudyLesson(
      lessonAccessContext({
        isAdmin,
        enrollment,
        now: new Date(),
        course,
        module: lesson.module,
        lesson,
      }),
    );
    if (!allowed) return [];

    const materials = await this.repo.findMaterialsByLesson(lessonId);
    return materials.map((m) => this.mapper.toMaterialDto(m));
  }

  private async isAdmin(user: AuthenticatedUser | undefined): Promise<boolean> {
    return user ? this.auth.hasRole(user.id, 'admin') : false;
  }
}
