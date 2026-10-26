/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { CatalogRepository } from './catalog.repository';
import { CatalogMapper } from './catalog.mapper';
import type { Course, CourseCategory } from '../../generated/prisma/client';

describe('CatalogService', () => {
  let service: CatalogService;
  let repository: jest.Mocked<CatalogRepository>;

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<CatalogRepository>> = {
      findCategories: jest.fn(),
      findCourses: jest.fn(),
      countCourses: jest.fn(),
      findCourseById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        CatalogMapper,
        {
          provide: CatalogRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    repository = module.get(CatalogRepository);
  });

  describe('getCategories', () => {
    it('gọi repository.findCategories với đúng filter và trả về danh sách DTO', async () => {
      const mockCategories: CourseCategory[] = [
        {
          id: BigInt(1),
          name: 'Category 1',
          slug: 'category-1',
          icon: 'Book',
          displayOrder: 1,
          isActive: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ];
      repository.findCategories.mockResolvedValue(mockCategories);

      const result = await service.getCategories({ active: true });

      expect(repository.findCategories).toHaveBeenCalledWith({
        isActive: true,
      });
      expect(result).toEqual([
        {
          id: 1,
          name: 'Category 1',
          slug: 'category-1',
          icon: 'Book',
          display_order: 1,
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('getCourses', () => {
    it('gọi repository.findCourses với đúng active và courseType', async () => {
      const mockCourses: Course[] = [
        {
          id: 10,
          title: 'Khóa Listening',
          subtitle: null,
          description: null,
          courseType: 'listening',
          price: 100000,
          durationMonths: 3,
          thumbnailUrl: null,
          instructor: 'Cô Mai Phương',
          isActive: true,
          displayOrder: 1,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          isFree: false,
          categoryId: BigInt(2),
        },
      ];
      repository.findCourses.mockResolvedValue(mockCourses);

      const result = await service.getCourses({
        active: true,
        courseType: 'listening',
      });

      expect(repository.findCourses).toHaveBeenCalledWith({
        isActive: true,
        courseType: 'listening',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(10);
      expect(result[0].course_type).toBe('listening');
      expect(result[0].category_id).toBe(2);
    });
  });

  describe('countCourses', () => {
    it('gọi repository.countCourses và trả về đối tượng { count }', async () => {
      repository.countCourses.mockResolvedValue(5);

      const result = await service.countCourses({ active: true });

      expect(repository.countCourses).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('getCourseById', () => {
    it('trả về CourseDto khi tìm thấy khóa học', async () => {
      const mockCourse: Course = {
        id: 7,
        title: 'Khóa 7',
        subtitle: null,
        description: null,
        courseType: 'fulltest',
        price: 0,
        durationMonths: 1,
        thumbnailUrl: null,
        instructor: null,
        isActive: true,
        displayOrder: 0,
        createdAt: null,
        isFree: true,
        categoryId: null,
      };
      repository.findCourseById.mockResolvedValue(mockCourse);

      const result = await service.getCourseById(7);

      expect(repository.findCourseById).toHaveBeenCalledWith(7);
      expect(result.id).toBe(7);
      expect(result.title).toBe('Khóa 7');
      expect(result.course_type).toBe('fulltest');
    });

    it('ném NotFoundException với mã COURSE_NOT_FOUND khi không tìm thấy', async () => {
      repository.findCourseById.mockResolvedValue(null);

      await expect(service.getCourseById(999999)).rejects.toThrow(
        NotFoundException,
      );

      try {
        await service.getCourseById(999999);
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
        const res = (err as NotFoundException).getResponse() as Record<
          string,
          unknown
        >;
        expect(res.code).toBe('COURSE_NOT_FOUND');
      }
    });
  });
});
