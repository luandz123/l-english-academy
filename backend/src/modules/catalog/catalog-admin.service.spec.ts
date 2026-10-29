import { HttpException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CatalogAdminService } from './catalog-admin.service';
import { CatalogMapper } from './catalog.mapper';
import type { CatalogRepository } from './catalog.repository';

const MODULE_ROW = {
  id: 10,
  courseId: 1,
  title: 'Chương 1',
  description: 'Mô tả',
  displayOrder: 0,
  isFree: false,
  isPublished: true,
};

const COURSE_ROW = {
  id: 1,
  title: 'Khóa TOEIC 450+',
  subtitle: 'Subtitle',
  description: 'Mô tả',
  courseType: 'video_quiz',
  categoryId: BigInt(2),
  price: 500000,
  durationMonths: 6,
  thumbnailUrl: 'https://thumb.jpg',
  instructor: 'Cô Mai Phương',
  isActive: true,
  isFree: false,
  displayOrder: 1,
  createdAt: new Date('2026-03-29T14:17:47.000Z'),
};

const CATEGORY_ROW = {
  id: BigInt(2),
  name: 'TOEIC',
  slug: 'toeic',
  icon: 'BookOpen',
  displayOrder: 1,
  isActive: true,
  createdAt: new Date('2026-03-29T14:17:47.000Z'),
};

function setup() {
  const repo = {
    courseExists: jest.fn().mockResolvedValue(true),
    findAdminModulesByCourse: jest.fn().mockResolvedValue([]),
    findModuleById: jest.fn().mockResolvedValue(MODULE_ROW),
    nextModuleDisplayOrder: jest.fn().mockResolvedValue(0),
    createModule: jest
      .fn()
      .mockImplementation((data: { displayOrder: number; title: string }) =>
        Promise.resolve({
          ...MODULE_ROW,
          title: data.title,
          displayOrder: data.displayOrder,
        }),
      ),
    updateModule: jest
      .fn()
      .mockImplementation((_id: number, data: Record<string, unknown>) =>
        Promise.resolve({
          ...MODULE_ROW,
          ...data,
        }),
      ),
    deleteModule: jest.fn().mockResolvedValue(undefined),
    findModuleIdsByCourse: jest.fn().mockResolvedValue([10, 11, 12]),
    reorderModules: jest.fn().mockResolvedValue(undefined),
    setFreeModuleForCourse: jest.fn().mockResolvedValue(undefined),
    findAdminCourses: jest.fn().mockResolvedValue([COURSE_ROW]),
    findCourseById: jest.fn().mockResolvedValue(COURSE_ROW),
    createCourse: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ ...COURSE_ROW, ...data }),
      ),
    updateCourse: jest
      .fn()
      .mockImplementation((_id: number, data: Record<string, unknown>) =>
        Promise.resolve({ ...COURSE_ROW, ...data }),
      ),
    deleteCourse: jest.fn().mockResolvedValue(COURSE_ROW),
    findAdminCategories: jest.fn().mockResolvedValue([CATEGORY_ROW]),
    findCategoryById: jest.fn().mockResolvedValue(CATEGORY_ROW),
    createCategory: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ ...CATEGORY_ROW, ...data }),
      ),
    updateCategory: jest
      .fn()
      .mockImplementation((_id: number, data: Record<string, unknown>) =>
        Promise.resolve({ ...CATEGORY_ROW, ...data }),
      ),
    deleteCategory: jest.fn().mockResolvedValue(CATEGORY_ROW),
    createQuizRaw: jest.fn().mockResolvedValue({ id: 101 }),
    createLessonRaw: jest.fn().mockResolvedValue({ id: 201 }),
    createQuestionRaw: jest.fn().mockResolvedValue({ id: 301 }),
    createAnswersRaw: jest.fn().mockResolvedValue({ count: 4 }),
    updateQuizTotalQuestions: jest.fn().mockResolvedValue(undefined),
    inTransaction: jest
      .fn()
      .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(repo)),
  };

  const service = new CatalogAdminService(
    repo as unknown as CatalogRepository,
    new CatalogMapper(),
  );
  return { service, repo };
}

async function httpError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    const http = err as HttpException;
    return {
      status: http.getStatus(),
      body: http.getResponse() as { code: string },
    };
  }
  throw new Error('Lẽ ra phải ném lỗi');
}

describe('CatalogAdminService', () => {
  describe('createModule', () => {
    it('tính display_order từ nextModuleDisplayOrder và tạo chương', async () => {
      const { service, repo } = setup();
      repo.nextModuleDisplayOrder.mockResolvedValue(3);

      const res = await service.createModule(1, {
        title: 'Chương 4',
        description: null,
        is_free: true,
      });

      expect(repo.nextModuleDisplayOrder).toHaveBeenCalledWith(1);
      expect(repo.createModule).toHaveBeenCalledWith({
        courseId: 1,
        title: 'Chương 4',
        description: null,
        isFree: true,
        displayOrder: 3,
      });
      expect(res.display_order).toBe(3);
    });

    it('khóa không tồn tại → 404 COURSE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.courseExists.mockResolvedValue(false);

      const err = await httpError(
        service.createModule(999, { title: 'M', is_free: false }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('COURSE_NOT_FOUND');
      expect(repo.createModule).not.toHaveBeenCalled();
    });
  });

  describe('updateModule & patchModule', () => {
    it('updateModule: chương không tồn tại → 404 MODULE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.findModuleById.mockResolvedValue(null);

      const err = await httpError(
        service.updateModule(999, { title: 'M', is_free: false }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('MODULE_NOT_FOUND');
    });

    it('patchModule: body rỗng → 400 VALIDATION_FAILED', async () => {
      const { service, repo } = setup();
      const err = await httpError(service.patchModule(10, {}));
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('VALIDATION_FAILED');
      expect(repo.updateModule).not.toHaveBeenCalled();
    });

    it('patchModule: chương không tồn tại → 404 MODULE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.findModuleById.mockResolvedValue(null);

      const err = await httpError(
        service.patchModule(999, { is_published: false }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('MODULE_NOT_FOUND');
    });
  });

  describe('reorderModules', () => {
    it('khóa không tồn tại → 404 COURSE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.courseExists.mockResolvedValue(false);

      const err = await httpError(
        service.reorderModules(999, { module_ids: [10] }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('COURSE_NOT_FOUND');
    });

    it('ID trùng lặp → 400 MODULE_ORDER_INVALID, không ghi', async () => {
      const { service, repo } = setup();
      const err = await httpError(
        service.reorderModules(1, { module_ids: [10, 10] }),
      );
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('MODULE_ORDER_INVALID');
      expect(repo.reorderModules).not.toHaveBeenCalled();
    });

    it('ID không thuộc khóa → 400 MODULE_ORDER_INVALID, không ghi', async () => {
      const { service, repo } = setup();
      const err = await httpError(
        service.reorderModules(1, { module_ids: [10, 999] }),
      );
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('MODULE_ORDER_INVALID');
      expect(repo.reorderModules).not.toHaveBeenCalled();
    });

    it('hợp lệ → gọi repo.reorderModules', async () => {
      const { service, repo } = setup();
      await service.reorderModules(1, { module_ids: [12, 10, 11] });
      expect(repo.reorderModules).toHaveBeenCalledWith([12, 10, 11]);
    });
  });

  describe('setFreeModule', () => {
    it('khóa không tồn tại → 404 COURSE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.courseExists.mockResolvedValue(false);

      const err = await httpError(
        service.setFreeModule(999, { module_id: 10 }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('COURSE_NOT_FOUND');
    });

    it('module_id không thuộc khóa → 400 MODULE_NOT_IN_COURSE, không ghi', async () => {
      const { service, repo } = setup();
      const err = await httpError(service.setFreeModule(1, { module_id: 999 }));
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('MODULE_NOT_IN_COURSE');
      expect(repo.setFreeModuleForCourse).not.toHaveBeenCalled();
    });

    it('hợp lệ → gọi repo.setFreeModuleForCourse', async () => {
      const { service, repo } = setup();
      await service.setFreeModule(1, { module_id: 11 });
      expect(repo.setFreeModuleForCourse).toHaveBeenCalledWith(1, 11);
    });
  });

  describe('admin courses & categories', () => {
    it('listAdminCourses trả danh sách đã map', async () => {
      const { service, repo } = setup();
      const res = await service.listAdminCourses();
      expect(repo.findAdminCourses).toHaveBeenCalled();
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1);
      expect(res[0].category_id).toBe(2);
    });

    it('createCourse: is_free = true → lưu price = 0 bất kể client gửi gì', async () => {
      const { service, repo } = setup();
      const res = await service.createCourse({
        title: 'Khóa Free',
        course_type: 'video_quiz',
        price: 999000,
        is_free: true,
        is_active: true,
        display_order: 1,
      });
      expect(repo.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({ price: 0, isFree: true }),
      );
      expect(res.price).toBe(0);
    });

    it('createCourse: category_id không tồn tại → 404 CATEGORY_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.findCategoryById.mockResolvedValue(null);
      const err = await httpError(
        service.createCourse({
          title: 'Khóa Lạ',
          category_id: 9999,
          course_type: 'video_quiz',
          price: 100000,
          is_free: false,
          is_active: true,
          display_order: 1,
        }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('updateCourse: khóa không tồn tại → 404 COURSE_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.findCourseById.mockResolvedValue(null);
      const err = await httpError(
        service.updateCourse(999, {
          title: 'Update',
          course_type: 'video_quiz',
          price: 100000,
          is_free: false,
          is_active: true,
          display_order: 1,
        }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('COURSE_NOT_FOUND');
    });

    it('patchCourse: body rỗng → 400 VALIDATION_FAILED', async () => {
      const { service } = setup();
      const err = await httpError(service.patchCourse(1, {}));
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('VALIDATION_FAILED');
    });

    it('patchCourse: is_free: true → đặt price = 0', async () => {
      const { service, repo } = setup();
      await service.patchCourse(1, { is_free: true });
      expect(repo.updateCourse).toHaveBeenCalledWith(1, {
        isFree: true,
        price: 0,
      });
    });

    it('deleteCourse: P2025 không ném lỗi (204)', async () => {
      const { service, repo } = setup();
      repo.deleteCourse.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: '7.0.0',
        }),
      );
      await expect(service.deleteCourse(999)).resolves.toBeUndefined();
    });

    it('createCategory: slug trùng → 409 CATEGORY_SLUG_EXISTS', async () => {
      const { service, repo } = setup();
      repo.createCategory.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique failed', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );
      const err = await httpError(
        service.createCategory({
          name: 'TOEIC',
          slug: 'toeic',
          icon: 'BookOpen',
          display_order: 1,
          is_active: true,
        }),
      );
      expect(err.status).toBe(409);
      expect(err.body.code).toBe('CATEGORY_SLUG_EXISTS');
    });

    it('deleteCategory: P2003 (đang có khóa học) → 409 CATEGORY_HAS_COURSES', async () => {
      const { service, repo } = setup();
      repo.deleteCategory.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK failed', {
          code: 'P2003',
          clientVersion: '7.0.0',
        }),
      );
      const err = await httpError(service.deleteCategory(2));
      expect(err.status).toBe(409);
      expect(err.body.code).toBe('CATEGORY_HAS_COURSES');
    });
  });

  describe('importCourseJson', () => {
    it('ném 404 khi khóa học không tồn tại', async () => {
      const { service, repo } = setup();
      repo.findCourseById.mockResolvedValue(null);

      const err = await httpError(
        service.importCourseJson(999, {
          course_title: 'Part 5 test',
          exams: [],
        }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('COURSE_NOT_FOUND');
    });

    it('tạo module, quiz, lesson, question và answers thành công trong transaction với đúng quy tắc mapping cũ', async () => {
      const { service, repo } = setup();
      repo.courseExists.mockResolvedValue(true);

      const res = await service.importCourseJson(1, {
        course_title: 'Part 5 chuyên sâu',
        exams: [
          {
            exam_title: 'Đề 1',
            questions: [
              {
                part: 6,
                question_text: 'Choose the best answer',
                passage_text: 'Passage body',
                answers: [
                  {
                    answer_text: 'A',
                    is_correct: true,
                    explanation: 'OK',
                    display_order: 2,
                  },
                  { answer_text: 'B', is_correct: false },
                ],
              },
              {
                question_text: 'Question without part',
                answers: [{ answer_text: 'X' }],
              },
            ],
          },
        ],
      });

      expect(repo.createModule).toHaveBeenCalledWith({
        courseId: 1,
        title: 'Part 5 chuyên sâu',
        description: null,
        isFree: false,
        displayOrder: 0,
      });
      expect(repo.createQuizRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Đề 1',
          totalQuestions: 2,
        }),
      );
      // First question (part 6): embedded passage, part6 question_type
      expect(repo.createQuestionRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          questionText:
            '[PASSAGE]Passage body[ENDPASSAGE]Choose the best answer',
          questionType: 'part6',
          displayOrder: 0,
        }),
      );
      // Second question (no part): multiple_choice fallback
      expect(repo.createQuestionRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          questionText: 'Question without part',
          questionType: 'multiple_choice',
          displayOrder: 1,
        }),
      );
      // Answers: display_order 2 (explicit) and 0 (default fallback)
      expect(repo.createAnswersRaw).toHaveBeenCalledWith([
        {
          questionId: 301,
          answerText: 'A',
          isCorrect: true,
          explanation: 'OK',
          displayOrder: 2,
        },
        {
          questionId: 301,
          answerText: 'B',
          isCorrect: false,
          explanation: null,
          displayOrder: 0,
        },
      ]);
      expect(repo.createAnswersRaw).toHaveBeenCalledWith([
        {
          questionId: 301,
          answerText: 'X',
          isCorrect: false,
          explanation: null,
          displayOrder: 0,
        },
      ]);
      expect(res).toEqual({
        module_id: 10,
        exams_count: 1,
        total_questions: 2,
      });
    });
  });
});
