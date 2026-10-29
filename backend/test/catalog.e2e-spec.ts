import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import {
  CourseCategoryDto,
  CourseCountDto,
  CourseDto,
} from '../src/modules/catalog/dto';
import type { ErrorResponseBody } from '../src/common/filters/all-exceptions.filter';

describe('CatalogModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany();
    await prisma.courseCategory.deleteMany();
  }

  beforeEach(async () => {
    await cleanup();
  });

  it('gọi không có header Authorization vẫn 200 (policy viewable by all)', async () => {
    const resCat = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .expect(200);
    expect(Array.isArray(resCat.body)).toBe(true);

    const resCourse = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses')
      .expect(200);
    expect(Array.isArray(resCourse.body)).toBe(true);
  });

  it('active=true loại khóa/danh mục is_active=false; bỏ active thì trả cả hai', async () => {
    await prisma.courseCategory.createMany({
      data: [
        {
          name: 'Cat Active',
          slug: 'cat-active',
          isActive: true,
          displayOrder: 1,
        },
        {
          name: 'Cat Inactive',
          slug: 'cat-inactive',
          isActive: false,
          displayOrder: 2,
        },
      ],
    });

    const catActiveOnly = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories?active=true')
      .expect(200);
    const catActiveBody = catActiveOnly.body as CourseCategoryDto[];
    expect(catActiveBody).toHaveLength(1);
    expect(catActiveBody[0].slug).toBe('cat-active');

    const catAll = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .expect(200);
    const catAllBody = catAll.body as CourseCategoryDto[];
    expect(catAllBody).toHaveLength(2);

    await prisma.course.createMany({
      data: [
        {
          title: 'Course Active',
          courseType: 'listening',
          isActive: true,
          displayOrder: 1,
        },
        {
          title: 'Course Inactive',
          courseType: 'listening',
          isActive: false,
          displayOrder: 2,
        },
      ],
    });

    const courseActiveOnly = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses?active=true')
      .expect(200);
    const courseActiveBody = courseActiveOnly.body as CourseDto[];
    expect(courseActiveBody).toHaveLength(1);
    expect(courseActiveBody[0].title).toBe('Course Active');

    const courseAll = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses')
      .expect(200);
    const courseAllBody = courseAll.body as CourseDto[];
    expect(courseAllBody).toHaveLength(2);

    const countActive = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses/count?active=true')
      .expect(200);
    expect(countActive.body as CourseCountDto).toEqual({ count: 1 });

    const countAll = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses/count')
      .expect(200);
    expect(countAll.body as CourseCountDto).toEqual({ count: 2 });
  });

  it('courseType=listening chỉ trả khóa listening; courseType=abc → 400', async () => {
    await prisma.course.createMany({
      data: [
        { title: 'Listening 1', courseType: 'listening', isActive: true },
        { title: 'Fulltest 1', courseType: 'fulltest', isActive: true },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses?courseType=listening')
      .expect(200);
    const resBody = res.body as CourseDto[];
    expect(resBody).toHaveLength(1);
    expect(resBody[0].course_type).toBe('listening');

    const errRes = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses?courseType=abc')
      .expect(400);
    const errBody = errRes.body as ErrorResponseBody;
    expect(errBody.code).toBe('VALIDATION_FAILED');
  });

  it('thứ tự: 2 khóa cùng display_order → id lớn đứng trước; danh mục cùng display_order → id nhỏ đứng trước', async () => {
    const cat1 = await prisma.courseCategory.create({
      data: { name: 'Cat A', slug: 'cat-a', displayOrder: 5 },
    });
    const cat2 = await prisma.courseCategory.create({
      data: { name: 'Cat B', slug: 'cat-b', displayOrder: 5 },
    });

    const resCats = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .expect(200);
    const resCatsBody = resCats.body as CourseCategoryDto[];
    expect(resCatsBody).toHaveLength(2);
    // id asc: cat1 (id nhỏ hơn) trước cat2
    expect(resCatsBody[0].id).toBe(Number(cat1.id));
    expect(resCatsBody[1].id).toBe(Number(cat2.id));

    const course1 = await prisma.course.create({
      data: { title: 'Course A', courseType: 'listening', displayOrder: 5 },
    });
    const course2 = await prisma.course.create({
      data: { title: 'Course B', courseType: 'listening', displayOrder: 5 },
    });

    const resCourses = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses')
      .expect(200);
    const resCoursesBody = resCourses.body as CourseDto[];
    expect(resCoursesBody).toHaveLength(2);
    // id desc: course2 (id lớn hơn) trước course1
    expect(resCoursesBody[0].id).toBe(course2.id);
    expect(resCoursesBody[1].id).toBe(course1.id);
  });

  it('/catalog/courses/999999 → 404 COURSE_NOT_FOUND; /catalog/courses/abc → 400', async () => {
    const notFoundRes = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses/999999')
      .expect(404);
    expect(notFoundRes.body).toMatchObject({
      statusCode: 404,
      code: 'COURSE_NOT_FOUND',
    });

    const badReqRes = await request(app.getHttpServer())
      .get('/api/v1/catalog/courses/abc')
      .expect(400);
    const badReqBody = badReqRes.body as ErrorResponseBody;
    expect(badReqBody.statusCode).toBe(400);
  });

  it('response có đủ mọi cột snake_case, id/category_id là number', async () => {
    const category = await prisma.courseCategory.create({
      data: {
        name: 'TOEIC Prep',
        slug: 'toeic-prep',
        icon: 'Book',
        displayOrder: 1,
        isActive: true,
      },
    });

    const course = await prisma.course.create({
      data: {
        title: 'Full TOEIC Master',
        subtitle: 'Từ 0 đến 990',
        description: 'Khóa học đầy đủ nhất',
        courseType: 'video_quiz',
        price: 1200000,
        durationMonths: 12,
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        instructor: 'Cô Mai Phương',
        isActive: true,
        isFree: false,
        displayOrder: 1,
        categoryId: category.id,
      },
    });

    const resCat = await request(app.getHttpServer())
      .get('/api/v1/catalog/categories')
      .expect(200);
    const catList = resCat.body as CourseCategoryDto[];
    const catItem = catList[0];
    expect(catItem).toHaveProperty('id');
    expect(typeof catItem.id).toBe('number');
    expect(catItem).toHaveProperty('name', 'TOEIC Prep');
    expect(catItem).toHaveProperty('slug', 'toeic-prep');
    expect(catItem).toHaveProperty('icon', 'Book');
    expect(catItem).toHaveProperty('display_order', 1);
    expect(catItem).toHaveProperty('is_active', true);
    expect(catItem).toHaveProperty('created_at');
    expect(typeof catItem.created_at).toBe('string');

    const resCourse = await request(app.getHttpServer())
      .get(`/api/v1/catalog/courses/${course.id}`)
      .expect(200);
    const courseItem = resCourse.body as CourseDto;
    expect(courseItem).toMatchObject({
      id: course.id,
      title: 'Full TOEIC Master',
      subtitle: 'Từ 0 đến 990',
      description: 'Khóa học đầy đủ nhất',
      course_type: 'video_quiz',
      category_id: Number(category.id),
      price: 1200000,
      duration_months: 12,
      thumbnail_url: 'https://cdn.example.com/thumb.jpg',
      instructor: 'Cô Mai Phương',
      is_active: true,
      is_free: false,
      display_order: 1,
    });
    expect(typeof courseItem.id).toBe('number');
    expect(typeof courseItem.category_id).toBe('number');
    expect(typeof courseItem.created_at).toBe('string');

    // Đảm bảo không sót trường nào trong 14 trường Course
    const expectedCourseKeys = [
      'id',
      'title',
      'subtitle',
      'description',
      'course_type',
      'category_id',
      'price',
      'duration_months',
      'thumbnail_url',
      'instructor',
      'is_active',
      'is_free',
      'display_order',
      'created_at',
    ];
    const courseRecord = courseItem as unknown as Record<string, unknown>;
    expect(Object.keys(courseRecord).sort()).toEqual(expectedCourseKeys.sort());

    // Đảm bảo không sót trường nào trong 7 trường CourseCategory
    const expectedCatKeys = [
      'id',
      'name',
      'slug',
      'icon',
      'display_order',
      'is_active',
      'created_at',
    ];
    const catRecord = catItem as unknown as Record<string, unknown>;
    expect(Object.keys(catRecord).sort()).toEqual(expectedCatKeys.sort());
  });
});
