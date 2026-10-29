import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MaterialsService } from './materials.service';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let prisma: {
    material: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
    };
    course: {
      findUnique: jest.Mock;
    };
    lesson: {
      findUnique: jest.Mock;
    };
    quiz: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
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
    prisma = {
      material: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
      },
      lesson: {
        findUnique: jest.fn(),
      },
      quiz: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('listMaterials', () => {
    it('lấy danh sách không filter: sắp xếp created_at desc', async () => {
      prisma.material.findMany.mockResolvedValue([mockMaterial]);

      const res = await service.listMaterials();

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {},
        include: { course: { select: { title: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      expect(res).toHaveLength(1);
      expect(res[0].courses?.title).toBe('TOEIC Course');
    });

    it('lấy danh sách theo course_id: sắp xếp display_order asc', async () => {
      prisma.material.findMany.mockResolvedValue([mockMaterial]);

      const res = await service.listMaterials({ course_id: 10 });

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { courseId: 10 },
        include: { course: { select: { title: true } } },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      });
      expect(res).toHaveLength(1);
    });
  });

  describe('createMaterial', () => {
    it('ném 400 COURSE_NOT_FOUND khi course_id không tồn tại', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

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
      prisma.lesson.findUnique.mockResolvedValue(null);

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
      prisma.quiz.findUnique.mockResolvedValue(null);

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
      prisma.material.create.mockResolvedValue(mockMaterial);

      const res = await service.createMaterial({
        title: 'Doc 1',
        file_url: 'https://example.com/doc1.pdf',
        file_type: 'pdf',
        folder_path: '/pdfs',
      });

      expect(prisma.material.create).toHaveBeenCalled();
      expect(res.id).toBe(1);
      expect(res.title).toBe('Doc 1');
    });
  });

  describe('deleteMaterial', () => {
    it('ném 404 MATERIAL_NOT_FOUND khi id không tồn tại', async () => {
      prisma.material.findUnique.mockResolvedValue(null);

      await expect(service.deleteMaterial(999)).rejects.toMatchObject({
        response: { code: 'MATERIAL_NOT_FOUND' },
      });
    });

    it('xóa thành công khi tài liệu tồn tại', async () => {
      prisma.material.findUnique.mockResolvedValue(mockMaterial);
      prisma.material.delete.mockResolvedValue(mockMaterial);

      await service.deleteMaterial(1);

      expect(prisma.material.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('renameFolder', () => {
    it('đổi tên folder_path cho các tài liệu khớp tiền tố trong một transaction', async () => {
      prisma.material.findMany.mockResolvedValue([
        { id: 1, folderPath: '/old/sub' },
        { id: 2, folderPath: '/old' },
        { id: 3, folderPath: '/other' },
      ]);
      prisma.material.update.mockResolvedValue({});

      const result = await service.renameFolder({
        old_path: '/old',
        new_path: '/new',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { folderPath: '/new/sub' },
      });
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { folderPath: '/new' },
      });
    });
  });

  describe('deleteFolder', () => {
    it('xóa các tài liệu khớp folder_path trong một transaction', async () => {
      prisma.material.findMany.mockResolvedValue([
        { id: 10, folderPath: '/folder/a' },
        { id: 11, folderPath: '/folder' },
        { id: 12, folderPath: '/another' },
      ]);
      prisma.material.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteFolder({
        folder_path: '/folder',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(prisma.material.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [10, 11] } },
      });
    });
  });
});
