import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import {
  AdminEnrollmentDto,
  AdminEnrollmentListDto,
  CreateAdminEnrollmentDto,
  LessonDto,
  PatchLessonDto,
  PracticeDto,
  ReorderLessonsDto,
  SaveLessonDto,
  SavePracticeDto,
} from './dto';
import { LearningMapper } from './learning.mapper';
import { LearningRepository } from './learning.repository';

const QUIZ_LESSON_TYPES = new Set(['exam', 'practice', 'dictation']);
const MS_PER_DAY = 86_400_000;

@Injectable()
export class LearningAdminService {
  constructor(
    private readonly repo: LearningRepository,
    private readonly mapper: LearningMapper,
    private readonly catalogService: CatalogService,
  ) {}

  // --- 4.1 Bài học ---

  async createLesson(moduleId: number, dto: SaveLessonDto): Promise<LessonDto> {
    if (!(await this.repo.moduleExists(moduleId))) {
      throw new NotFoundException({
        code: 'MODULE_NOT_FOUND',
        message: 'Chương học không tồn tại',
      });
    }

    const { videoUrl, pdfUrl } = this.resolveMediaUrls(dto);
    const needsQuiz = QUIZ_LESSON_TYPES.has(dto.lesson_type);

    const lesson = await this.repo.inTransaction(async (txRepo) => {
      const displayOrder = await txRepo.nextLessonDisplayOrder(moduleId);
      let quizId: number | null = null;
      if (needsQuiz) {
        const quiz = await txRepo.createAutoQuizForModule(
          moduleId,
          `Quiz - ${dto.title}`,
        );
        quizId = quiz.id;
      }

      return txRepo.createLesson({
        moduleId,
        title: dto.title,
        lessonType: dto.lesson_type,
        videoUrl,
        pdfUrl,
        durationSeconds: dto.duration_seconds,
        displayOrder,
        quizId,
      });
    });

    return this.mapper.toLessonDto(lesson, true);
  }

  async updateLesson(id: number, dto: SaveLessonDto): Promise<LessonDto> {
    const existing = await this.repo.findLessonById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: 'Bài học không tồn tại',
      });
    }

    const { videoUrl, pdfUrl } = this.resolveMediaUrls(dto);
    const needsQuiz =
      QUIZ_LESSON_TYPES.has(dto.lesson_type) && existing.quizId === null;

    const updated = await this.repo.inTransaction(async (txRepo) => {
      let quizId = existing.quizId;
      if (needsQuiz) {
        const quiz = await txRepo.createAutoQuizForModule(
          existing.moduleId,
          `Quiz - ${dto.title}`,
        );
        quizId = quiz.id;
      }

      return txRepo.updateLesson(id, {
        title: dto.title,
        lessonType: dto.lesson_type,
        videoUrl,
        pdfUrl,
        durationSeconds: dto.duration_seconds,
        quizId,
      });
    });

    return this.mapper.toLessonDto(updated, true);
  }

  async patchLesson(id: number, dto: PatchLessonDto): Promise<LessonDto> {
    if (dto.is_free === undefined && dto.is_published === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }

    const existing = await this.repo.findLessonById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: 'Bài học không tồn tại',
      });
    }

    const updated = await this.repo.updateLesson(id, {
      ...(dto.is_free !== undefined ? { isFree: dto.is_free } : {}),
      ...(dto.is_published !== undefined
        ? { isPublished: dto.is_published }
        : {}),
    });

    return this.mapper.toLessonDto(updated, true);
  }

  async deleteLesson(id: number): Promise<void> {
    await this.repo.deleteLesson(id);
  }

  async reorderLessons(
    moduleId: number,
    dto: ReorderLessonsDto,
  ): Promise<void> {
    if (!(await this.repo.moduleExists(moduleId))) {
      throw new NotFoundException({
        code: 'MODULE_NOT_FOUND',
        message: 'Chương học không tồn tại',
      });
    }

    const uniqueIds = new Set(dto.lesson_ids);
    if (uniqueIds.size !== dto.lesson_ids.length) {
      throw new BadRequestException({
        code: 'LESSON_ORDER_INVALID',
        message: 'Danh sách bài học chứa ID trùng lặp',
      });
    }

    const moduleLessonIds = new Set(
      await this.repo.findLessonIdsByModule(moduleId),
    );
    const allBelongToModule = dto.lesson_ids.every((id) =>
      moduleLessonIds.has(id),
    );
    if (!allBelongToModule) {
      throw new BadRequestException({
        code: 'LESSON_ORDER_INVALID',
        message: 'Có bài học không thuộc chương này',
      });
    }

    await this.repo.reorderLessons(dto.lesson_ids);
  }

  // --- 4.2 Popup luyện tập ---

  async createPractice(
    lessonId: number,
    dto: SavePracticeDto,
  ): Promise<PracticeDto> {
    if (!(await this.repo.lessonExists(lessonId))) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: 'Bài học không tồn tại',
      });
    }

    const quizId = dto.quiz_id ?? null;
    if (quizId !== null && !(await this.repo.quizExists(quizId))) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: 'Bài kiểm tra không tồn tại',
      });
    }

    const displayOrder = await this.repo.countPracticesByLesson(lessonId);
    const practice = await this.repo.createPractice({
      lessonId,
      quizId,
      triggerAtSeconds: dto.trigger_at_seconds,
      title: dto.title,
      displayOrder,
    });

    return this.mapper.toPracticeDto(practice);
  }

  async updatePractice(id: number, dto: SavePracticeDto): Promise<PracticeDto> {
    const existing = await this.repo.findPracticeById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'PRACTICE_NOT_FOUND',
        message: 'Bài luyện tập không tồn tại',
      });
    }

    const quizId = dto.quiz_id ?? null;
    if (quizId !== null && !(await this.repo.quizExists(quizId))) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: 'Bài kiểm tra không tồn tại',
      });
    }

    const updated = await this.repo.updatePractice(id, {
      quizId,
      triggerAtSeconds: dto.trigger_at_seconds,
      title: dto.title,
    });

    return this.mapper.toPracticeDto(updated);
  }

  async deletePractice(id: number): Promise<void> {
    await this.repo.deletePractice(id);
  }

  // --- 4.3 Ghi danh ---

  async getAllEnrollments(): Promise<AdminEnrollmentListDto[]> {
    const rows = await this.repo.findAllEnrollments();
    return rows.map((r) => this.mapper.toAdminEnrollmentListDto(r));
  }

  async getUserEnrollments(userId: string): Promise<AdminEnrollmentDto[]> {
    const rows = await this.repo.findEnrollmentsByUser(userId);
    return rows.map((r) => this.mapper.toAdminEnrollmentDto(r));
  }

  async createUserEnrollment(
    userId: string,
    dto: CreateAdminEnrollmentDto,
  ): Promise<AdminEnrollmentDto> {
    const course = await this.catalogService.findCourseById(dto.course_id);
    if (!course) {
      throw new NotFoundException({
        code: 'COURSE_NOT_FOUND',
        message: 'Khóa học không tồn tại',
      });
    }

    const expiresAt =
      dto.expires_in_days !== undefined && dto.expires_in_days !== null
        ? new Date(Date.now() + dto.expires_in_days * MS_PER_DAY)
        : null;

    try {
      const created = await this.repo.createEnrollment({
        userId,
        courseId: dto.course_id,
        expiresAt,
      });
      return this.mapper.toAdminEnrollmentDto(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException({
            code: 'ENROLLMENT_EXISTS',
            message: 'Học viên đã được ghi danh vào khóa học này',
          });
        }
        if (err.code === 'P2003') {
          throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: 'Học viên không tồn tại',
          });
        }
      }
      throw err;
    }
  }

  async deleteEnrollment(id: number): Promise<void> {
    await this.repo.deleteEnrollment(id);
  }

  private resolveMediaUrls(dto: SaveLessonDto): {
    videoUrl: string | null;
    pdfUrl: string | null;
  } {
    if (dto.lesson_type !== 'video') {
      return { videoUrl: null, pdfUrl: null };
    }
    const videoUrl =
      typeof dto.video_url === 'string' && dto.video_url.trim().length > 0
        ? dto.video_url
        : null;
    const pdfUrl =
      typeof dto.pdf_url === 'string' && dto.pdf_url.trim().length > 0
        ? dto.pdf_url
        : null;
    return { videoUrl, pdfUrl };
  }
}
