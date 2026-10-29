import { CatalogMapper } from './catalog.mapper';
import type { Course, CourseCategory } from '../../generated/prisma/client';

describe('CatalogMapper', () => {
  let mapper: CatalogMapper;

  beforeEach(() => {
    mapper = new CatalogMapper();
  });

  describe('toCategoryDto', () => {
    it('chuyển đổi BigInt id sang number và Date createdAt sang chuỗi ISO', () => {
      const date = new Date('2026-03-29T14:17:47.000Z');
      const category: CourseCategory = {
        id: BigInt(42),
        name: 'TOEIC Căn Bản',
        slug: 'toeic-can-ban',
        icon: 'BookOpen',
        displayOrder: 1,
        isActive: true,
        createdAt: date,
      };

      const result = mapper.toCategoryDto(category);

      expect(result).toEqual({
        id: 42,
        name: 'TOEIC Căn Bản',
        slug: 'toeic-can-ban',
        icon: 'BookOpen',
        display_order: 1,
        is_active: true,
        created_at: '2026-03-29T14:17:47.000Z',
      });
      expect(typeof result.id).toBe('number');
    });

    it('giữ nguyên giá trị null cho các trường tùy chọn', () => {
      const category: CourseCategory = {
        id: BigInt(1),
        name: 'Không icon',
        slug: 'khong-icon',
        icon: null,
        displayOrder: null,
        isActive: null,
        createdAt: null,
      };

      const result = mapper.toCategoryDto(category);

      expect(result).toEqual({
        id: 1,
        name: 'Không icon',
        slug: 'khong-icon',
        icon: null,
        display_order: null,
        is_active: null,
        created_at: null,
      });
    });

    it('toCategoryDtoList ánh xạ chính xác một danh sách', () => {
      const categories: CourseCategory[] = [
        {
          id: BigInt(1),
          name: 'Cat 1',
          slug: 'cat-1',
          icon: null,
          displayOrder: 1,
          isActive: true,
          createdAt: null,
        },
      ];

      const result = mapper.toCategoryDtoList(categories);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('toCourseDto', () => {
    it('chuyển đổi category_id BigInt sang number và Date createdAt sang ISO', () => {
      const date = new Date('2026-03-29T14:17:47.000Z');
      const course: Course = {
        id: 101,
        title: 'Khóa TOEIC 450+',
        subtitle: 'Cho người bắt đầu',
        description: 'Chi tiết khóa học...',
        courseType: 'video_quiz',
        price: 500000,
        durationMonths: 6,
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        instructor: 'Cô Mai Phương',
        isActive: true,
        displayOrder: 0,
        createdAt: date,
        isFree: false,
        categoryId: BigInt(99),
      };

      const result = mapper.toCourseDto(course);

      expect(result).toEqual({
        id: 101,
        title: 'Khóa TOEIC 450+',
        subtitle: 'Cho người bắt đầu',
        description: 'Chi tiết khóa học...',
        course_type: 'video_quiz',
        category_id: 99,
        price: 500000,
        duration_months: 6,
        thumbnail_url: 'https://cdn.example.com/thumb.jpg',
        instructor: 'Cô Mai Phương',
        is_active: true,
        is_free: false,
        display_order: 0,
        created_at: '2026-03-29T14:17:47.000Z',
      });
      expect(typeof result.category_id).toBe('number');
    });

    it('giữ nguyên null khi category_id và các trường tùy chọn là null', () => {
      const course: Course = {
        id: 102,
        title: 'Khóa tự do',
        subtitle: null,
        description: null,
        courseType: 'fulltest',
        price: null,
        durationMonths: null,
        thumbnailUrl: null,
        instructor: null,
        isActive: null,
        displayOrder: null,
        createdAt: null,
        isFree: null,
        categoryId: null,
      };

      const result = mapper.toCourseDto(course);

      expect(result.category_id).toBeNull();
      expect(result.subtitle).toBeNull();
      expect(result.description).toBeNull();
      expect(result.price).toBeNull();
      expect(result.duration_months).toBeNull();
      expect(result.thumbnail_url).toBeNull();
      expect(result.instructor).toBeNull();
      expect(result.is_active).toBeNull();
      expect(result.is_free).toBeNull();
      expect(result.display_order).toBeNull();
      expect(result.created_at).toBeNull();
    });

    it('toCourseDtoList ánh xạ chính xác một danh sách', () => {
      const courses: Course[] = [
        {
          id: 1,
          title: 'Khóa 1',
          subtitle: null,
          description: null,
          courseType: 'listening',
          price: 0,
          durationMonths: 3,
          thumbnailUrl: null,
          instructor: null,
          isActive: true,
          displayOrder: 1,
          createdAt: null,
          isFree: true,
          categoryId: null,
        },
      ];

      const result = mapper.toCourseDtoList(courses);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].course_type).toBe('listening');
    });
  });
});
