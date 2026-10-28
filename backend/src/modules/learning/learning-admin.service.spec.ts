/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client';
import type {
  Lesson,
  LessonPractice,
  Quiz,
} from '../../generated/prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import type { CourseDto } from '../catalog/dto';
import { LearningAdminService } from './learning-admin.service';
import { LearningMapper } from './learning.mapper';
import {
  LearningRepository,
  type EnrollmentWithCourseTitle,
  type LessonPracticeWithQuiz,
} from './learning.repository';

describe('LearningAdminService', () => {
  let service: LearningAdminService;
  let repo: jest.Mocked<LearningRepository>;
  let catalog: jest.Mocked<CatalogService>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';

  const makeLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
    id: 10,
    moduleId: 1,
    title: 'Bài 1',
    videoUrl: 'https://cdn.example.com/v.mp4',
    durationSeconds: 300,
    displayOrder: 0,
    isLive: false,
    liveTime: null,
    lessonType: 'video',
    quizId: null,
    pdfUrl: 'https://cdn.example.com/p.pdf',
    isFree: false,
    isPublished: true,
    ...overrides,
  });

  const makeQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
    id: 50,
    moduleId: 1,
    title: 'Quiz - Bài 1',
    totalQuestions: 0,
    timeLimitSeconds: 0,
    displayOrder: 0,
    audioUrl: null,
    isFree: false,
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<LearningRepository>> = {
      inTransaction: jest.fn(),
      moduleExists: jest.fn(),
      findLessonById: jest.fn(),
      nextLessonDisplayOrder: jest.fn(),
      createAutoQuizForModule: jest.fn(),
      createLesson: jest.fn(),
      updateLesson: jest.fn(),
      deleteLesson: jest.fn(),
      findLessonIdsByModule: jest.fn(),
      reorderLessons: jest.fn(),
      lessonExists: jest.fn(),
      quizExists: jest.fn(),
      findPracticeById: jest.fn(),
      countPracticesByLesson: jest.fn(),
      createPractice: jest.fn(),
      updatePractice: jest.fn(),
      deletePractice: jest.fn(),
      findEnrollmentsByUser: jest.fn(),
      findAllEnrollments: jest.fn(),
      createEnrollment: jest.fn(),
      deleteEnrollment: jest.fn(),
    };

    mockRepo.inTransaction!.mockImplementation(async (fn) =>
      fn(mockRepo as unknown as LearningRepository),
    );

    const mockCatalog: Partial<jest.Mocked<CatalogService>> = {
      findCourseById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningAdminService,
        LearningMapper,
        { provide: LearningRepository, useValue: mockRepo },
        { provide: CatalogService, useValue: mockCatalog },
      ],
    }).compile();

    service = module.get<LearningAdminService>(LearningAdminService);
    repo = module.get(LearningRepository);
    catalog = module.get(CatalogService);
  });

  const expectErrorCode = async (
    promise: Promise<unknown>,
    ErrorClass:
      | typeof NotFoundException
      | typeof BadRequestException
      | typeof ConflictException,
    expectedCode: string,
  ): Promise<void> => {
    try {
      await promise;
      fail(`Expected ${ErrorClass.name} with code ${expectedCode}`);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ErrorClass);
      const res = (
        err as InstanceType<typeof ErrorClass>
      ).getResponse() as Record<string, unknown>;
      expect(res.code).toBe(expectedCode);
    }
  };

  describe('createLesson', () => {
    it('ném 404 MODULE_NOT_FOUND khi module không tồn tại', async () => {
      repo.moduleExists.mockResolvedValue(false);

      await expectErrorCode(
        service.createLesson(999, {
          title: 'Bài mới',
          lesson_type: 'video',
          duration_seconds: 120,
        }),
        NotFoundException,
        'MODULE_NOT_FOUND',
      );
    });

    it('tạo bài video: giữ video_url/pdf_url, tính display_order từ server và không tạo quiz', async () => {
      repo.moduleExists.mockResolvedValue(true);
      repo.nextLessonDisplayOrder.mockResolvedValue(2);
      repo.createLesson.mockResolvedValue(
        makeLesson({
          id: 11,
          moduleId: 1,
          title: 'Bài Video',
          lessonType: 'video',
          videoUrl: 'https://cdn.example.com/v1.mp4',
          pdfUrl: 'https://cdn.example.com/p1.pdf',
          durationSeconds: 180,
          displayOrder: 2,
          quizId: null,
        }),
      );

      const res = await service.createLesson(1, {
        title: 'Bài Video',
        lesson_type: 'video',
        video_url: 'https://cdn.example.com/v1.mp4',
        pdf_url: 'https://cdn.example.com/p1.pdf',
        duration_seconds: 180,
      });

      expect(repo.createAutoQuizForModule).not.toHaveBeenCalled();
      expect(repo.createLesson).toHaveBeenCalledWith({
        moduleId: 1,
        title: 'Bài Video',
        lessonType: 'video',
        videoUrl: 'https://cdn.example.com/v1.mp4',
        pdfUrl: 'https://cdn.example.com/p1.pdf',
        durationSeconds: 180,
        displayOrder: 2,
        quizId: null,
      });
      expect(res.display_order).toBe(2);
      expect(res.video_url).toBe('https://cdn.example.com/v1.mp4');
      expect(res.pdf_url).toBe('https://cdn.example.com/p1.pdf');
    });

    it('bài không phải video (exam/practice/dictation): ép video_url/pdf_url = null và tự tạo quiz', async () => {
      repo.moduleExists.mockResolvedValue(true);
      repo.nextLessonDisplayOrder.mockResolvedValue(0);
      repo.createAutoQuizForModule.mockResolvedValue(
        makeQuiz({ id: 77, title: 'Quiz - Đề thi thử' }),
      );
      repo.createLesson.mockResolvedValue(
        makeLesson({
          id: 12,
          moduleId: 1,
          title: 'Đề thi thử',
          lessonType: 'exam',
          videoUrl: null,
          pdfUrl: null,
          durationSeconds: 600,
          displayOrder: 0,
          quizId: 77,
        }),
      );

      const res = await service.createLesson(1, {
        title: 'Đề thi thử',
        lesson_type: 'exam',
        video_url: 'https://cdn.example.com/should-be-ignored.mp4',
        pdf_url: 'https://cdn.example.com/should-be-ignored.pdf',
        duration_seconds: 600,
      });

      expect(repo.createAutoQuizForModule).toHaveBeenCalledWith(
        1,
        'Quiz - Đề thi thử',
      );
      expect(repo.createLesson).toHaveBeenCalledWith({
        moduleId: 1,
        title: 'Đề thi thử',
        lessonType: 'exam',
        videoUrl: null,
        pdfUrl: null,
        durationSeconds: 600,
        displayOrder: 0,
        quizId: 77,
      });
      expect(res.quiz_id).toBe(77);
      expect(res.video_url).toBeNull();
      expect(res.pdf_url).toBeNull();
    });

    it('rollback transaction khi ghi bài lỗi sau bước tạo quiz → không còn quiz mồ côi', async () => {
      const committedQuizzes: Quiz[] = [];

      repo.moduleExists.mockResolvedValue(true);
      repo.inTransaction.mockImplementation(async (fn) => {
        const snapshot = [...committedQuizzes];
        try {
          return await fn(repo);
        } catch (err) {
          committedQuizzes.length = 0;
          committedQuizzes.push(...snapshot);
          throw err;
        }
      });
      repo.nextLessonDisplayOrder.mockResolvedValue(0);
      repo.createAutoQuizForModule.mockImplementation((moduleId, title) => {
        const q = makeQuiz({ id: 88, moduleId, title });
        committedQuizzes.push(q);
        return Promise.resolve(q);
      });
      repo.createLesson.mockRejectedValue(new Error('DB write lesson failed'));

      await expect(
        service.createLesson(1, {
          title: 'Bài lỗi',
          lesson_type: 'practice',
          duration_seconds: 60,
        }),
      ).rejects.toThrow('DB write lesson failed');

      expect(committedQuizzes).toHaveLength(0);
    });
  });

  describe('updateLesson', () => {
    it('ném 404 LESSON_NOT_FOUND khi bài học không tồn tại', async () => {
      repo.findLessonById.mockResolvedValue(null);

      await expectErrorCode(
        service.updateLesson(999, {
          title: 'Bài sửa',
          lesson_type: 'video',
          duration_seconds: 100,
        }),
        NotFoundException,
        'LESSON_NOT_FOUND',
      );
    });

    it('sửa bài video chưa có quiz thành dictation → tự tạo quiz và giữ nguyên display_order', async () => {
      repo.findLessonById.mockResolvedValue(
        makeLesson({
          id: 10,
          moduleId: 3,
          lessonType: 'video',
          quizId: null,
          displayOrder: 4,
        }),
      );
      repo.createAutoQuizForModule.mockResolvedValue(
        makeQuiz({ id: 91, moduleId: 3, title: 'Quiz - Nghe chép' }),
      );
      repo.updateLesson.mockResolvedValue(
        makeLesson({
          id: 10,
          moduleId: 3,
          title: 'Nghe chép',
          lessonType: 'dictation',
          videoUrl: null,
          pdfUrl: null,
          durationSeconds: 240,
          displayOrder: 4,
          quizId: 91,
        }),
      );

      const res = await service.updateLesson(10, {
        title: 'Nghe chép',
        lesson_type: 'dictation',
        video_url: 'https://cdn.example.com/ignore.mp4',
        duration_seconds: 240,
      });

      expect(repo.createAutoQuizForModule).toHaveBeenCalledWith(
        3,
        'Quiz - Nghe chép',
      );
      expect(repo.updateLesson).toHaveBeenCalledWith(10, {
        title: 'Nghe chép',
        lessonType: 'dictation',
        videoUrl: null,
        pdfUrl: null,
        durationSeconds: 240,
        quizId: 91,
      });
      expect(res.display_order).toBe(4);
      expect(res.quiz_id).toBe(91);
    });

    it('sửa bài đã có quiz_id → không tạo quiz mới', async () => {
      repo.findLessonById.mockResolvedValue(
        makeLesson({
          id: 10,
          moduleId: 3,
          lessonType: 'exam',
          quizId: 55,
          displayOrder: 2,
        }),
      );
      repo.updateLesson.mockResolvedValue(
        makeLesson({
          id: 10,
          moduleId: 3,
          title: 'Đề thi cập nhật',
          lessonType: 'exam',
          videoUrl: null,
          pdfUrl: null,
          durationSeconds: 500,
          displayOrder: 2,
          quizId: 55,
        }),
      );

      const res = await service.updateLesson(10, {
        title: 'Đề thi cập nhật',
        lesson_type: 'exam',
        duration_seconds: 500,
      });

      expect(repo.createAutoQuizForModule).not.toHaveBeenCalled();
      expect(repo.updateLesson).toHaveBeenCalledWith(10, {
        title: 'Đề thi cập nhật',
        lessonType: 'exam',
        videoUrl: null,
        pdfUrl: null,
        durationSeconds: 500,
        quizId: 55,
      });
      expect(res.quiz_id).toBe(55);
    });
  });

  describe('patchLesson', () => {
    it('ném 400 VALIDATION_FAILED khi body rỗng', async () => {
      await expectErrorCode(
        service.patchLesson(10, {}),
        BadRequestException,
        'VALIDATION_FAILED',
      );
    });

    it('ném 404 LESSON_NOT_FOUND khi bài không tồn tại', async () => {
      repo.findLessonById.mockResolvedValue(null);

      await expectErrorCode(
        service.patchLesson(999, { is_free: true }),
        NotFoundException,
        'LESSON_NOT_FOUND',
      );
    });

    it('cập nhật is_free và is_published', async () => {
      repo.findLessonById.mockResolvedValue(makeLesson({ id: 10 }));
      repo.updateLesson.mockResolvedValue(
        makeLesson({ id: 10, isFree: true, isPublished: false }),
      );

      const res = await service.patchLesson(10, {
        is_free: true,
        is_published: false,
      });

      expect(repo.updateLesson).toHaveBeenCalledWith(10, {
        isFree: true,
        isPublished: false,
      });
      expect(res.is_free).toBe(true);
      expect(res.is_published).toBe(false);
    });
  });

  describe('reorderLessons', () => {
    it('ném 404 MODULE_NOT_FOUND khi module không tồn tại', async () => {
      repo.moduleExists.mockResolvedValue(false);

      await expectErrorCode(
        service.reorderLessons(999, { lesson_ids: [1, 2] }),
        NotFoundException,
        'MODULE_NOT_FOUND',
      );
    });

    it('ném 400 LESSON_ORDER_INVALID khi mảng có ID trùng', async () => {
      repo.moduleExists.mockResolvedValue(true);

      await expectErrorCode(
        service.reorderLessons(1, { lesson_ids: [10, 10, 11] }),
        BadRequestException,
        'LESSON_ORDER_INVALID',
      );
      expect(repo.reorderLessons).not.toHaveBeenCalled();
    });

    it('ném 400 LESSON_ORDER_INVALID khi có ID không thuộc module', async () => {
      repo.moduleExists.mockResolvedValue(true);
      repo.findLessonIdsByModule.mockResolvedValue([10, 11]);

      await expectErrorCode(
        service.reorderLessons(1, { lesson_ids: [10, 99] }),
        BadRequestException,
        'LESSON_ORDER_INVALID',
      );
      expect(repo.reorderLessons).not.toHaveBeenCalled();
    });

    it('gọi repo.reorderLessons khi danh sách hợp lệ', async () => {
      repo.moduleExists.mockResolvedValue(true);
      repo.findLessonIdsByModule.mockResolvedValue([10, 11, 12]);
      repo.reorderLessons.mockResolvedValue(undefined);

      await service.reorderLessons(1, { lesson_ids: [12, 10, 11] });

      expect(repo.reorderLessons).toHaveBeenCalledWith([12, 10, 11]);
    });
  });

  describe('practices (create / update / delete)', () => {
    const mockPracticeWithQuiz: LessonPracticeWithQuiz = {
      id: 1,
      lessonId: 10,
      quizId: 50,
      triggerAtSeconds: 90,
      title: 'Popup 1',
      displayOrder: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      quiz: { id: 50, title: 'Quiz 50', totalQuestions: 5 },
    };

    it('createPractice: ném 404 LESSON_NOT_FOUND khi bài học không tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(false);

      await expectErrorCode(
        service.createPractice(999, {
          quiz_id: null,
          trigger_at_seconds: 30,
          title: 'Popup',
        }),
        NotFoundException,
        'LESSON_NOT_FOUND',
      );
    });

    it('createPractice: ném 404 QUIZ_NOT_FOUND khi quiz_id không tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(true);
      repo.quizExists.mockResolvedValue(false);

      await expectErrorCode(
        service.createPractice(10, {
          quiz_id: 999,
          trigger_at_seconds: 30,
          title: 'Popup',
        }),
        NotFoundException,
        'QUIZ_NOT_FOUND',
      );
    });

    it('createPractice: tính display_order = số practice hiện có của bài', async () => {
      repo.lessonExists.mockResolvedValue(true);
      repo.quizExists.mockResolvedValue(true);
      repo.countPracticesByLesson.mockResolvedValue(2);
      repo.createPractice.mockResolvedValue(mockPracticeWithQuiz);

      const res = await service.createPractice(10, {
        quiz_id: 50,
        trigger_at_seconds: 90,
        title: 'Popup 1',
      });

      expect(repo.createPractice).toHaveBeenCalledWith({
        lessonId: 10,
        quizId: 50,
        triggerAtSeconds: 90,
        title: 'Popup 1',
        displayOrder: 2,
      });
      expect(res.display_order).toBe(2);
      expect(res.quizzes?.id).toBe(50);
    });

    it('updatePractice: ném 404 PRACTICE_NOT_FOUND khi practice không tồn tại', async () => {
      repo.findPracticeById.mockResolvedValue(null);

      await expectErrorCode(
        service.updatePractice(999, {
          quiz_id: null,
          trigger_at_seconds: 60,
          title: 'Sửa',
        }),
        NotFoundException,
        'PRACTICE_NOT_FOUND',
      );
    });

    it('updatePractice: ném 404 QUIZ_NOT_FOUND khi quiz_id không tồn tại', async () => {
      const existing: LessonPractice = {
        id: 1,
        lessonId: 10,
        quizId: null,
        triggerAtSeconds: 30,
        title: 'Cũ',
        displayOrder: 3,
        createdAt: new Date(),
      };
      repo.findPracticeById.mockResolvedValue(existing);
      repo.quizExists.mockResolvedValue(false);

      await expectErrorCode(
        service.updatePractice(1, {
          quiz_id: 888,
          trigger_at_seconds: 60,
          title: 'Mới',
        }),
        NotFoundException,
        'QUIZ_NOT_FOUND',
      );
    });

    it('updatePractice: giữ nguyên display_order khi cập nhật', async () => {
      const existing: LessonPractice = {
        id: 1,
        lessonId: 10,
        quizId: 50,
        triggerAtSeconds: 30,
        title: 'Cũ',
        displayOrder: 3,
        createdAt: new Date(),
      };
      repo.findPracticeById.mockResolvedValue(existing);
      repo.updatePractice.mockResolvedValue({
        ...mockPracticeWithQuiz,
        quizId: null,
        quiz: null,
        displayOrder: 3,
        title: 'Mới',
      });

      const res = await service.updatePractice(1, {
        quiz_id: null,
        trigger_at_seconds: 90,
        title: 'Mới',
      });

      expect(repo.updatePractice).toHaveBeenCalledWith(1, {
        quizId: null,
        triggerAtSeconds: 90,
        title: 'Mới',
      });
      expect(res.display_order).toBe(3);
      expect(res.quizzes).toBeNull();
    });
  });

  describe('enrollments (list / create / delete)', () => {
    const mockCourse: CourseDto = {
      id: 5,
      title: 'TOEIC 650+',
      subtitle: null,
      description: null,
      course_type: 'video_quiz',
      price: 500000,
      duration_months: 6,
      thumbnail_url: null,
      instructor: 'Cô Mai Phương',
      is_active: true,
      display_order: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      is_free: false,
      category_id: null,
    };

    it('getAllEnrollments: trả danh sách ghi danh kèm courses và profiles', async () => {
      repo.findAllEnrollments.mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          courseId: 5,
          enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: null,
          course: { title: 'TOEIC 650+' },
          user: {
            profile: {
              id: 'prof-1',
              userId: mockUserId,
              fullName: 'Nguyen Van A',
            },
          },
        },
        {
          id: 2,
          userId: 'user-2',
          courseId: 6,
          enrolledAt: null,
          expiresAt: null,
          course: null,
          user: {
            profile: null,
          },
        },
      ]);

      const res = await service.getAllEnrollments();
      expect(repo.findAllEnrollments).toHaveBeenCalled();
      expect(res).toHaveLength(2);
      expect(res[0].courses).toEqual({ title: 'TOEIC 650+' });
      expect(res[0].profiles).toEqual({
        id: 'prof-1',
        user_id: mockUserId,
        full_name: 'Nguyen Van A',
      });
      expect(res[1].courses).toBeNull();
      expect(res[1].profiles).toBeNull();
    });

    it('createUserEnrollment: ném 404 COURSE_NOT_FOUND khi khóa học không tồn tại', async () => {
      catalog.findCourseById.mockResolvedValue(null);

      await expectErrorCode(
        service.createUserEnrollment(mockUserId, {
          course_id: 999,
          expires_in_days: 30,
        }),
        NotFoundException,
        'COURSE_NOT_FOUND',
      );
    });

    it('createUserEnrollment: bắt P2002 → 409 ENROLLMENT_EXISTS', async () => {
      catalog.findCourseById.mockResolvedValue(mockCourse);
      repo.createEnrollment.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expectErrorCode(
        service.createUserEnrollment(mockUserId, {
          course_id: 5,
          expires_in_days: null,
        }),
        ConflictException,
        'ENROLLMENT_EXISTS',
      );
    });

    it('createUserEnrollment: bắt P2003 → 404 USER_NOT_FOUND', async () => {
      catalog.findCourseById.mockResolvedValue(mockCourse);
      repo.createEnrollment.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          {
            code: 'P2003',
            clientVersion: '7.0.0',
          },
        ),
      );

      await expectErrorCode(
        service.createUserEnrollment(mockUserId, {
          course_id: 5,
          expires_in_days: 30,
        }),
        NotFoundException,
        'USER_NOT_FOUND',
      );
    });

    it('createUserEnrollment: tính expires_at từ expires_in_days ở server', async () => {
      catalog.findCourseById.mockResolvedValue(mockCourse);
      let capturedExpiresAt: Date | null = null;
      repo.createEnrollment.mockImplementation(
        ({ userId, courseId, expiresAt }) => {
          capturedExpiresAt = expiresAt;
          const row: EnrollmentWithCourseTitle = {
            id: 20,
            userId,
            courseId,
            enrolledAt: new Date(),
            expiresAt,
            course: { title: 'TOEIC 650+' },
          };
          return Promise.resolve(row);
        },
      );

      const before = Date.now();
      const res = await service.createUserEnrollment(mockUserId, {
        course_id: 5,
        expires_in_days: 30,
      });
      const after = Date.now();

      expect(capturedExpiresAt).not.toBeNull();
      const expectedMin = before + 30 * 86_400_000;
      const expectedMax = after + 30 * 86_400_000;
      expect(capturedExpiresAt!.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(capturedExpiresAt!.getTime()).toBeLessThanOrEqual(expectedMax);
      expect(res.courses).toEqual({ title: 'TOEIC 650+' });
    });

    it('createUserEnrollment: expires_in_days = null → expires_at = null', async () => {
      catalog.findCourseById.mockResolvedValue(mockCourse);
      repo.createEnrollment.mockResolvedValue({
        id: 21,
        userId: mockUserId,
        courseId: 5,
        enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: null,
        course: { title: 'TOEIC 650+' },
      });

      const res = await service.createUserEnrollment(mockUserId, {
        course_id: 5,
        expires_in_days: null,
      });

      expect(repo.createEnrollment).toHaveBeenCalledWith({
        userId: mockUserId,
        courseId: 5,
        expiresAt: null,
      });
      expect(res.expires_at).toBeNull();
    });
  });
});
