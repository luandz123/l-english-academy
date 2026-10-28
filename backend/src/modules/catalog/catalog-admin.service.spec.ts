import { HttpException } from '@nestjs/common';
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
});
