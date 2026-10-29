import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsMapper } from './materials.mapper';
import { MaterialsRepository } from './materials.repository';
import { MaterialsService } from './materials.service';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let repository: {
    findMany: jest.Mock;
    findById: jest.Mock;
    findCourseById: jest.Mock;
    findLessonById: jest.Mock;
    findQuizById: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    findAllForFolderOps: jest.Mock;
    updateFolderPath: jest.Mock;
    deleteManyByIds: jest.Mock;
    inTransaction: jest.Mock;
  };

  const mockMaterial = {
    id: 1,
    title: 'Doc 1',
    fileUrl: 'https://example.com/doc1.pdf',
    fileType: 'pdf',
    folderPath: '/pdfs',
    courseId: 10,
    lessonId: 20,
    quizId: null,
    displayOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    course: { title: 'TOEIC Course' },
  };

  beforeEach(async () => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findCourseById: jest.fn(),
      findLessonById: jest.fn(),
      findQuizById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findAllForFolderOps: jest.fn(),
      updateFolderPath: jest.fn(),
      deleteManyByIds: jest.fn(),
      inTransaction: jest.fn(
        (callback: (txRepo: unknown) => Promise<unknown>) =>
          callback(repository),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        MaterialsMapper,
        { provide: MaterialsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('listMaterials', () => {
    it('lấy danh sách không filter: gọi repository.findMany không điều kiện', async () => {
      repository.findMany.mockResolvedValue([mockMaterial]);

      const res = await service.listMaterials();

      expect(repository.findMany).toHaveBeenCalledWith({
        courseId: undefined,
        folderPath: undefined,
      });
      expect(res).toHaveLength(1);
      expect(res[0].courses?.title).toBe('TOEIC Course');
    });

    it('lấy danh sách theo course_id: gọi repository.findMany với courseId', async () => {
      repository.findMany.mockResolvedValue([mockMaterial]);

      const res = await service.listMaterials({ course_id: 10 });

      expect(repository.findMany).toHaveBeenCalledWith({
        courseId: 10,
        folderPath: undefined,
      });
      expect(res).toHaveLength(1);
    });
  });

  describe('createMaterial', () => {
    it('ném 400 COURSE_NOT_FOUND khi course_id không tồn tại', async () => {
      repository.findCourseById.mockResolvedValue(null);

      await expect(
        service.createMaterial({
          title: 'Tài liệu',
          file_url: 'https://test.com/f.pdf',
          course_id: 999,
        }),
      ).rejects.toMatchObject({
        response: { code: 'COURSE_NOT_FOUND' },
      });
    });

    it('ném 400 LESSON_NOT_FOUND khi lesson_id không tồn tại', async () => {
      repository.findLessonById.mockResolvedValue(null);

      await expect(
        service.createMaterial({
          title: 'Tài liệu',
          file_url: 'https://test.com/f.pdf',
          lesson_id: 999,
        }),
      ).rejects.toMatchObject({
        response: { code: 'LESSON_NOT_FOUND' },
      });
    });

    it('ném 400 QUIZ_NOT_FOUND khi quiz_id không tồn tại', async () => {
      repository.findQuizById.mockResolvedValue(null);

      await expect(
        service.createMaterial({
          title: 'Tài liệu',
          file_url: 'https://test.com/f.pdf',
          quiz_id: 999,
        }),
      ).rejects.toMatchObject({
        response: { code: 'QUIZ_NOT_FOUND' },
      });
    });

    it('tạo thành công tài liệu khi dữ liệu hợp lệ', async () => {
      repository.create.mockResolvedValue(mockMaterial);

      const res = await service.createMaterial({
        title: 'Doc 1',
        file_url: 'https://example.com/doc1.pdf',
        file_type: 'pdf',
        folder_path: '/pdfs',
      });

      expect(repository.create).toHaveBeenCalled();
      expect(res.id).toBe(1);
      expect(res.title).toBe('Doc 1');
    });
  });

  describe('deleteMaterial', () => {
    it('ném 404 MATERIAL_NOT_FOUND khi id không tồn tại', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteMaterial(999)).rejects.toMatchObject({
        response: { code: 'MATERIAL_NOT_FOUND' },
      });
    });

    it('xóa thành công khi tài liệu tồn tại', async () => {
      repository.findById.mockResolvedValue(mockMaterial);
      repository.delete.mockResolvedValue(mockMaterial);

      await service.deleteMaterial(1);

      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('renameFolder', () => {
    it('đổi tên folder_path cho các tài liệu khớp tiền tố trong một transaction', async () => {
      repository.findAllForFolderOps.mockResolvedValue([
        { id: 1, folderPath: '/old/sub' },
        { id: 2, folderPath: '/old' },
        { id: 3, folderPath: '/other' },
      ]);
      repository.updateFolderPath.mockResolvedValue(undefined);

      const result = await service.renameFolder({
        old_path: '/old',
        new_path: '/new',
      });

      expect(repository.inTransaction).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(repository.updateFolderPath).toHaveBeenCalledWith(1, '/new/sub');
      expect(repository.updateFolderPath).toHaveBeenCalledWith(2, '/new');
    });
  });

  describe('deleteFolder', () => {
    it('xóa các tài liệu khớp folder_path trong một transaction', async () => {
      repository.findAllForFolderOps.mockResolvedValue([
        { id: 10, folderPath: '/folder/a' },
        { id: 11, folderPath: '/folder' },
        { id: 12, folderPath: '/another' },
      ]);
      repository.deleteManyByIds.mockResolvedValue(2);

      const result = await service.deleteFolder({
        folder_path: '/folder',
      });

      expect(repository.inTransaction).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(repository.deleteManyByIds).toHaveBeenCalledWith([10, 11]);
    });
  });
});
