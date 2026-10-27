import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  CurriculumModuleDto,
  EnrollmentResponseDto,
  LessonDto,
  MaterialDto,
} from '../src/modules/learning/dto';

/**
 * Policy RLS cũ → kiểm tra mới:
 * - "Modules viewable by all", "Lessons viewable by all": curriculum công khai,
 *   nhưng video_url/pdf_url chỉ trả khi canStudyLesson (D-02).
 * - "Users view own enrollments": enrollment lấy user từ token.
 * - "Admins manage enrollments": admin thấy đủ nội dung.
 * - "Users enroll themselves": không mở endpoint (đóng có chủ đích).
 */
describe('LearningModule — quyền xem bài (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const ids = {
    paidCourse: 0,
    freeCourse: 0,
    paidModule: 0,
    freeModule: 0,
    hiddenModule: 0,
    paidLesson: 0,
    freeLesson: 0,
    hiddenLesson: 0,
    freeModuleLesson: 0,
    freeCourseLesson: 0,
  };
  const tokens = {
    enrolled: '',
    other: '',
    admin: '',
    expired: '',
    notYet: '',
  };
  let enrolledUserId = '';

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.material.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.module.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@learn.test' } },
    });
  }

  async function userWithToken(
    email: string,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: { email, emailVerifiedAt: new Date() },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const paidCourse = await prisma.course.create({
      data: { title: 'Trả phí', courseType: 'video_quiz', isFree: false },
    });
    const freeCourse = await prisma.course.create({
      data: { title: 'Miễn phí', courseType: 'video_quiz', isFree: true },
    });
    ids.paidCourse = paidCourse.id;
    ids.freeCourse = freeCourse.id;

    const lesson = (
      moduleId: number,
      title: string,
      displayOrder: number,
      extra: { isFree?: boolean; isPublished?: boolean } = {},
    ) =>
      prisma.lesson.create({
        data: {
          moduleId,
          title,
          displayOrder,
          videoUrl: `https://video.test/${title}`,
          pdfUrl: `https://pdf.test/${title}`,
          ...extra,
        },
      });

    // Module thứ tự 2 tạo trước để kiểm sắp xếp
    const freeModule = await prisma.module.create({
      data: {
        courseId: paidCourse.id,
        title: 'M2 free',
        displayOrder: 2,
        isFree: true,
      },
    });
    const paidModule = await prisma.module.create({
      data: { courseId: paidCourse.id, title: 'M1', displayOrder: 1 },
    });
    const hiddenModule = await prisma.module.create({
      data: {
        courseId: paidCourse.id,
        title: 'M3 ẩn',
        displayOrder: 3,
        isPublished: false,
      },
    });
    ids.paidModule = paidModule.id;
    ids.freeModule = freeModule.id;
    ids.hiddenModule = hiddenModule.id;

    // Bài thứ tự 2 tạo trước
    ids.freeLesson = (
      await lesson(paidModule.id, 'free', 2, { isFree: true })
    ).id;
    ids.paidLesson = (await lesson(paidModule.id, 'paid', 1)).id;
    ids.hiddenLesson = (
      await lesson(paidModule.id, 'hidden', 3, { isPublished: false })
    ).id;
    ids.freeModuleLesson = (
      await lesson(freeModule.id, 'in-free-module', 1)
    ).id;
    await lesson(hiddenModule.id, 'in-hidden-module', 1);

    const freeCourseModule = await prisma.module.create({
      data: { courseId: freeCourse.id, title: 'FC', displayOrder: 1 },
    });
    ids.freeCourseLesson = (
      await lesson(freeCourseModule.id, 'in-free-course', 1)
    ).id;

    await prisma.material.createMany({
      data: [
        {
          lessonId: ids.paidLesson,
          title: 'B',
          fileUrl: 'https://f.test/b',
          displayOrder: 2,
        },
        {
          lessonId: ids.paidLesson,
          title: 'A',
          fileUrl: 'https://f.test/a',
          displayOrder: 1,
        },
        {
          lessonId: ids.freeLesson,
          title: 'F',
          fileUrl: 'https://f.test/f',
          displayOrder: 1,
        },
      ],
    });

    const enrolled = await userWithToken('enrolled@learn.test');
    const other = await userWithToken('other@learn.test');
    const admin = await userWithToken('admin@learn.test');
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    enrolledUserId = enrolled.id;
    tokens.enrolled = enrolled.token;
    tokens.other = other.token;
    tokens.admin = admin.token;

    await prisma.enrollment.create({
      data: { userId: enrolled.id, courseId: paidCourse.id },
    });
    // "other" ghi danh khóa khác — không được mở khóa trả phí
    await prisma.enrollment.create({
      data: { userId: other.id, courseId: freeCourse.id },
    });

    // OPEN_QUESTIONS #18: ghi danh hết hạn không mở bài; còn hạn thì mở
    const expired = await userWithToken('expired@learn.test');
    const notYet = await userWithToken('notyet@learn.test');
    tokens.expired = expired.token;
    tokens.notYet = notYet.token;
    await prisma.enrollment.create({
      data: {
        userId: expired.id,
        courseId: paidCourse.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.enrollment.create({
      data: {
        userId: notYet.id,
        courseId: paidCourse.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  async function curriculum(
    courseId: number,
    token?: string,
  ): Promise<CurriculumModuleDto[]> {
    const req = http().get(`/api/v1/learning/courses/${courseId}/curriculum`);
    const res = await (token ? req.set(bearer(token)) : req).expect(200);
    return res.body as CurriculumModuleDto[];
  }

  function lessonIn(
    tree: CurriculumModuleDto[],
    id: number,
  ): LessonDto | undefined {
    return tree.flatMap((m) => m.lessons).find((l) => l.id === id);
  }

  // --- curriculum ---

  it('khách: thấy cây bài; bài free có URL, bài trả phí video_url/pdf_url = null', async () => {
    const tree = await curriculum(ids.paidCourse);
    expect(tree.map((m) => m.id)).toEqual([ids.paidModule, ids.freeModule]);
    expect(tree[0].lessons.map((l) => l.id)).toEqual([
      ids.paidLesson,
      ids.freeLesson,
    ]);

    const paid = lessonIn(tree, ids.paidLesson)!;
    expect(paid.video_url).toBeNull();
    expect(paid.pdf_url).toBeNull();
    // Sidebar vẫn cần các trường này
    expect(paid).toMatchObject({
      title: 'paid',
      is_free: false,
      lesson_type: 'video',
    });

    expect(lessonIn(tree, ids.freeLesson)!.video_url).toBe(
      'https://video.test/free',
    );
  });

  it('module.is_free mở toàn bộ bài trong module', async () => {
    const tree = await curriculum(ids.paidCourse);
    expect(lessonIn(tree, ids.freeModuleLesson)!.video_url).toBe(
      'https://video.test/in-free-module',
    );
  });

  it('course.is_free mở toàn khóa', async () => {
    const tree = await curriculum(ids.freeCourse);
    expect(lessonIn(tree, ids.freeCourseLesson)!.pdf_url).toBe(
      'https://pdf.test/in-free-course',
    );
  });

  it('học viên có enrollment thấy đủ URL', async () => {
    const tree = await curriculum(ids.paidCourse, tokens.enrolled);
    expect(lessonIn(tree, ids.paidLesson)!.video_url).toBe(
      'https://video.test/paid',
    );
  });

  it('học viên ghi danh khóa khác: bài trả phí vẫn null', async () => {
    const tree = await curriculum(ids.paidCourse, tokens.other);
    expect(lessonIn(tree, ids.paidLesson)!.video_url).toBeNull();
  });

  it('học viên không thấy module/bài is_published = false', async () => {
    const tree = await curriculum(ids.paidCourse, tokens.enrolled);
    expect(tree.map((m) => m.id)).not.toContain(ids.hiddenModule);
    expect(lessonIn(tree, ids.hiddenLesson)).toBeUndefined();
  });

  it('admin thấy đủ URL và cả module/bài is_published = false', async () => {
    const tree = await curriculum(ids.paidCourse, tokens.admin);
    expect(tree.map((m) => m.id)).toEqual([
      ids.paidModule,
      ids.freeModule,
      ids.hiddenModule,
    ]);
    expect(lessonIn(tree, ids.hiddenLesson)!.video_url).toBe(
      'https://video.test/hidden',
    );
    expect(lessonIn(tree, ids.paidLesson)!.video_url).toBe(
      'https://video.test/paid',
    );
  });

  it('khóa không tồn tại → [] (không 404)', async () => {
    expect(await curriculum(999999)).toEqual([]);
  });

  it('gửi token hỏng → 401 bad_jwt, không hạ xuống khách', async () => {
    const res = await http()
      .get(`/api/v1/learning/courses/${ids.paidCourse}/curriculum`)
      .set(bearer('not-a-jwt'))
      .expect(401);
    expect(res.body).toMatchObject({ code: 'bad_jwt' });
  });

  it('id sai kiểu → 400', async () => {
    await http().get('/api/v1/learning/courses/abc/curriculum').expect(400);
  });

  // --- enrollment ---

  it('enrollment: không token → 401', async () => {
    await http()
      .get(`/api/v1/learning/courses/${ids.paidCourse}/enrollment`)
      .expect(401);
  });

  it('enrollment: trả đúng bản ghi của chính mình', async () => {
    const res = await http()
      .get(`/api/v1/learning/courses/${ids.paidCourse}/enrollment`)
      .set(bearer(tokens.enrolled))
      .expect(200);
    const body = res.body as EnrollmentResponseDto;
    expect(body.enrollment).toMatchObject({
      user_id: enrolledUserId,
      course_id: ids.paidCourse,
      expires_at: null,
    });
  });

  it('enrollment: người khác không đọc được (bỏ qua user_id do client gửi)', async () => {
    const res = await http()
      .get(
        `/api/v1/learning/courses/${ids.paidCourse}/enrollment?user_id=${enrolledUserId}`,
      )
      .set(bearer(tokens.other))
      .expect(200);
    expect((res.body as EnrollmentResponseDto).enrollment).toBeNull();
  });

  it('ghi danh hết hạn (#18): enrollment null, bài trả phí và tài liệu bị khóa', async () => {
    const res = await http()
      .get(`/api/v1/learning/courses/${ids.paidCourse}/enrollment`)
      .set(bearer(tokens.expired))
      .expect(200);
    expect((res.body as EnrollmentResponseDto).enrollment).toBeNull();

    const tree = await curriculum(ids.paidCourse, tokens.expired);
    expect(lessonIn(tree, ids.paidLesson)!.video_url).toBeNull();
    // Bài free vẫn mở
    expect(lessonIn(tree, ids.freeLesson)!.video_url).toBe(
      'https://video.test/free',
    );
    expect(await materials(ids.paidLesson, tokens.expired)).toEqual([]);
  });

  it('ghi danh còn hạn (expires_at tương lai): mở bài và trả bản ghi', async () => {
    const res = await http()
      .get(`/api/v1/learning/courses/${ids.paidCourse}/enrollment`)
      .set(bearer(tokens.notYet))
      .expect(200);
    expect((res.body as EnrollmentResponseDto).enrollment).not.toBeNull();

    const tree = await curriculum(ids.paidCourse, tokens.notYet);
    expect(lessonIn(tree, ids.paidLesson)!.video_url).toBe(
      'https://video.test/paid',
    );
  });

  it('không có route tự ghi danh cho học viên', async () => {
    await http()
      .post(`/api/v1/learning/courses/${ids.paidCourse}/enrollment`)
      .set(bearer(tokens.other))
      .expect(404);
  });

  // --- materials ---

  async function materials(
    lessonId: number,
    token?: string,
  ): Promise<MaterialDto[]> {
    const req = http().get(`/api/v1/learning/lessons/${lessonId}/materials`);
    const res = await (token ? req.set(bearer(token)) : req).expect(200);
    return res.body as MaterialDto[];
  }

  it('materials: khách và học viên không ghi danh nhận [] với bài trả phí', async () => {
    expect(await materials(ids.paidLesson)).toEqual([]);
    expect(await materials(ids.paidLesson, tokens.other)).toEqual([]);
  });

  it('materials: được học → đủ, đúng thứ tự display_order', async () => {
    const list = await materials(ids.paidLesson, tokens.enrolled);
    expect(list.map((m) => m.title)).toEqual(['A', 'B']);
    expect(list[0]).toMatchObject({
      lesson_id: ids.paidLesson,
      file_url: 'https://f.test/a',
    });
    expect(
      (await materials(ids.paidLesson, tokens.admin)).map((m) => m.title),
    ).toEqual(['A', 'B']);
  });

  it('materials: bài free mở cho khách; bài không tồn tại → []', async () => {
    expect((await materials(ids.freeLesson)).map((m) => m.title)).toEqual([
      'F',
    ]);
    expect(await materials(999999)).toEqual([]);
  });
});
