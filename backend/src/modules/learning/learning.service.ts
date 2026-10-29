import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from '../catalog/catalog.service';
import {
  CreateNoteDto,
  CurriculumModuleDto,
  EnrollmentResponseDto,
  FavoriteDto,
  LessonProgressDto,
  MaterialDto,
  MyEnrollmentDto,
  NoteDto,
  PracticeDto,
  PracticeQuestionDto,
  UpdateLessonProgressDto,
} from './dto';
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
   * Thay `MyCoursesPage.tsx:48` và `DashboardPage.tsx:114`.
   * Lấy danh sách ghi danh của chính user kèm thông tin khóa học (RLS "Users view own enrollments").
   */
  async getMyEnrollments(userId: string): Promise<MyEnrollmentDto[]> {
    const enrollments = await this.repo.findMyEnrollments(userId);
    return this.mapper.toMyEnrollmentDtoList(enrollments);
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

  /**
   * Quyền làm quiz (OPEN_QUESTIONS #22a): admin, quiz `is_free`, học được module chứa
   * quiz (coi quiz như một bài của module), hoặc học được ít nhất một bài gắn quiz.
   * Cùng quy tắc `canStudyLesson` với video. Quiz không gắn module/bài (vd. các Part
   * của đề thi thử) chỉ admin làm qua đây. Quiz không tồn tại → false.
   */
  /**
   * Quyền vào nội dung theo khóa (dùng cho Full Test, #18/#22a): admin, khóa `is_free`,
   * hoặc ghi danh **còn hạn**. Thay `FullTestExam.tsx:320-334` (cũ lấy khóa từ URL và
   * coi ghi danh hết hạn vẫn hợp lệ). Khóa không tồn tại → false.
   */
  async canAccessCourse(
    courseId: number | null,
    user: AuthenticatedUser | undefined,
  ): Promise<boolean> {
    if (await this.isAdmin(user)) return true;
    if (courseId === null) return false;
    const [course, enrollment] = await Promise.all([
      this.catalog.findCourseById(courseId),
      user ? this.repo.findEnrollment(user.id, courseId) : null,
    ]);
    if (!course) return false;
    return (
      Boolean(course.is_free) ||
      (enrollment !== null && isEnrollmentActive(enrollment, new Date()))
    );
  }

  async canTakeQuiz(
    quizId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<boolean> {
    if (await this.isAdmin(user)) return true;
    const quiz = await this.repo.findQuizAccess(quizId);
    if (!quiz) return false;

    const contexts = [
      { module: quiz.module, lesson: { isFree: quiz.isFree } },
      ...quiz.lessons.map((l) => ({ module: l.module, lesson: l })),
    ];
    const courseIds = [
      ...new Set(
        contexts
          .map((c) => c.module?.courseId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];
    const byCourse = new Map(
      await Promise.all(
        courseIds.map(
          async (id) =>
            [
              id,
              await Promise.all([
                this.catalog.findCourseById(id),
                user ? this.repo.findEnrollment(user.id, id) : null,
              ]),
            ] as const,
        ),
      ),
    );

    const now = new Date();
    return contexts.some((c) => {
      const courseId = c.module?.courseId;
      const [course, enrollment] =
        typeof courseId === 'number'
          ? (byCourse.get(courseId) ?? [null, null])
          : [null, null];
      return canStudyLesson(
        lessonAccessContext({
          isAdmin: false,
          enrollment,
          now,
          course,
          module: c.module,
          lesson: c.lesson,
        }),
      );
    });
  }

  /**
   * Thay `LearnPage.tsx:71-80`. Lấy danh sách tiến độ bài học của người dùng hiện tại.
   * Order `last_watched_at desc nulls last, id desc`.
   */
  async getMyProgress(userId: string): Promise<LessonProgressDto[]> {
    const list = await this.repo.findProgressByUser(userId);
    return list.map((p) => this.mapper.toLessonProgressDto(p));
  }

  /**
   * Thay `LearnPage.tsx:229-239`. Đánh dấu hoàn thành / chưa hoàn thành bài học.
   * Upsert theo (userId, lessonId), ghi is_completed client gửi.
   * Không đổi last_watched_at, watch_duration_seconds khi update.
   */
  async updateProgress(
    userId: string,
    lessonId: number,
    dto: UpdateLessonProgressDto,
  ): Promise<LessonProgressDto> {
    const exists = await this.repo.lessonExists(lessonId);
    if (!exists) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: `Bài học với ID ${lessonId} không tồn tại`,
      });
    }

    const progress = await this.repo.upsertProgress(
      userId,
      lessonId,
      dto.is_completed,
    );
    return this.mapper.toLessonProgressDto(progress);
  }

  /**
   * Thay `LearnPage.tsx:82-90`. Lấy danh sách bài học yêu thích của tôi.
   * Order `id asc`.
   */
  async getMyFavorites(userId: string): Promise<FavoriteDto[]> {
    const list = await this.repo.findFavoritesByUser(userId);
    return list.map((f) => this.mapper.toFavoriteDto(f));
  }

  /**
   * Thay `LearnPage.tsx:255-263`. Thêm bài học vào danh sách yêu thích.
   * Idempotent (đã có → trả bản ghi cũ, 200).
   */
  async addFavorite(userId: string, lessonId: number): Promise<FavoriteDto> {
    const exists = await this.repo.lessonExists(lessonId);
    if (!exists) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: `Bài học với ID ${lessonId} không tồn tại`,
      });
    }

    const favorite = await this.repo.upsertFavorite(userId, lessonId);
    return this.mapper.toFavoriteDto(favorite);
  }

  /**
   * Thay `LearnPage.tsx:255-263`. Xóa bài học khỏi danh sách yêu thích.
   * Idempotent (không có cũng thành công).
   */
  async removeFavorite(userId: string, lessonId: number): Promise<void> {
    await this.repo.deleteFavorite(userId, lessonId);
  }

  /**
   * Thay `LearnPage.tsx:106-114`. Lấy danh sách ghi chú của tôi trong bài học.
   * Order `created_at desc, id desc`. Bài không tồn tại → [].
   */
  async getLessonNotes(userId: string, lessonId: number): Promise<NoteDto[]> {
    const notes = await this.repo.findNotes(userId, lessonId);
    return notes.map((n) => this.mapper.toNoteDto(n));
  }

  /**
   * Thay `LearnPage.tsx:295-299`. Tạo ghi chú mới.
   * Trim nội dung, nếu rỗng → 400 VALIDATION_FAILED. Lưu bản đã trim.
   * Bài không tồn tại → 404 LESSON_NOT_FOUND.
   */
  async createNote(
    userId: string,
    lessonId: number,
    dto: CreateNoteDto,
  ): Promise<NoteDto> {
    const trimmed = dto.content ? dto.content.trim() : '';
    if (trimmed.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Nội dung ghi chú không được để trống',
      });
    }

    const exists = await this.repo.lessonExists(lessonId);
    if (!exists) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: `Bài học với ID ${lessonId} không tồn tại`,
      });
    }

    const note = await this.repo.createNote(userId, lessonId, trimmed);
    return this.mapper.toNoteDto(note);
  }

  /**
   * Thay `LearnPage.tsx:128-139`. Lấy danh sách popup luyện tập trong bài.
   * Công khai, không cần đăng nhập. Order `trigger_at_seconds asc, id asc`.
   * Bài không tồn tại → [].
   */
  async getLessonPractices(lessonId: number): Promise<PracticeDto[]> {
    const practices = await this.repo.findPracticesByLesson(lessonId);
    return practices.map((p) => this.mapper.toPracticeDto(p));
  }

  /**
   * Thay `LearnPage.tsx:198`. Lấy danh sách câu hỏi kèm đáp án của popup luyện tập.
   * - Bài học không tồn tại → 404 LESSON_NOT_FOUND
   * - Practice không tồn tại → 404 PRACTICE_NOT_FOUND
   * - Practice không thuộc bài học → 400 PRACTICE_NOT_IN_LESSON
   * - Không có quyền học bài (canStudyLesson) → 403 LESSON_LOCKED
   * - Practice không gắn quiz → []
   */
  async getPracticeQuestions(
    lessonId: number,
    practiceId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<PracticeQuestionDto[]> {
    const lesson = await this.repo.findLessonAccess(lessonId);
    if (!lesson) {
      throw new NotFoundException({
        code: 'LESSON_NOT_FOUND',
        message: 'Bài học không tồn tại',
      });
    }

    const practice = await this.repo.findPracticeById(practiceId);
    if (!practice) {
      throw new NotFoundException({
        code: 'PRACTICE_NOT_FOUND',
        message: 'Bài luyện tập không tồn tại',
      });
    }

    if (practice.lessonId !== lessonId) {
      throw new BadRequestException({
        code: 'PRACTICE_NOT_IN_LESSON',
        message: 'Bài luyện tập không thuộc bài học này',
      });
    }

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

    if (!allowed) {
      throw new ForbiddenException({
        code: 'LESSON_LOCKED',
        message: 'Bạn chưa có quyền học bài này',
      });
    }

    if (!practice.quizId) {
      return [];
    }

    const questions = await this.repo.findQuestionsWithAnswers(practice.quizId);
    return questions.map((q) => this.mapper.toPracticeQuestionDto(q));
  }

  private async isAdmin(user: AuthenticatedUser | undefined): Promise<boolean> {
    return user ? this.auth.hasRole(user.id, 'admin') : false;
  }
}
