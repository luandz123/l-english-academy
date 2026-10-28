import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  AdminCountsDto,
  AdminCourseEnrollmentsDto,
  AdminQuestionDto,
  AdminQuizScoresDto,
  AdminStudentsDto,
  AdminUserAnswerDto,
  RecentEnrollmentDto,
  RecentQuizResultDto,
} from '../src/modules/admin/dto';

/**
 * E2E cho T-020: Thống kê và báo cáo admin
 * - 8 route × 3 vai (không token 401, học viên 403, admin 200).
 * - counts chính xác (active courses chỉ đếm is_active = true).
 * - recent-enrollments và recent-results tối đa 5, mới nhất trước, có profiles.full_name.
 * - questions?ids= chỉ trả id được hỏi; > 50 id → 400 VALIDATION_FAILED; id không hợp lệ → 400.
 * - students trả profiles và enrollments đúng format.
 */
describe('AdminStats (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@admin-stats.test';

  const tokens = { student: '', admin: '' };
  const userIds = { student: '', admin: '' };

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function userWithToken(
    email: string,
    fullName: string,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            fullName,
            email,
          },
        },
      },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  async function cleanup(): Promise<void> {
    await prisma.userAnswer.deleteMany({
      where: {
        userQuizResult: {
          user: { email: { endsWith: EMAIL_SUFFIX } },
        },
      },
    });
    await prisma.userQuizResult.deleteMany({
      where: { user: { email: { endsWith: EMAIL_SUFFIX } } },
    });
    await prisma.enrollment.deleteMany({
      where: { user: { email: { endsWith: EMAIL_SUFFIX } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
    await prisma.question.deleteMany({
      where: { questionText: { contains: '[STATS_TEST]' } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { contains: '[STATS_TEST]' } },
    });
    await prisma.course.deleteMany({
      where: { title: { contains: '[STATS_TEST]' } },
    });
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

    const student = await userWithToken(
      `student${EMAIL_SUFFIX}`,
      'Học Viên Test',
    );
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`, 'Quản Trị Viên');
    await prisma.userRole.create({
      data: { userId: admin.id, role: 'admin' },
    });
    userIds.student = student.id;
    userIds.admin = admin.id;
    tokens.student = student.token;
    tokens.admin = admin.token;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC — 8 route × không token (401) và học viên (403)', () => {
    const routes = [
      '/api/v1/admin/stats/counts',
      '/api/v1/admin/stats/recent-enrollments',
      '/api/v1/admin/stats/recent-results',
      '/api/v1/admin/stats/quiz-scores',
      '/api/v1/admin/stats/course-enrollments',
      '/api/v1/admin/stats/answers',
      '/api/v1/admin/stats/questions',
      '/api/v1/admin/stats/students',
    ];

    it.each(routes)('GET %s không token → 401', async (route) => {
      const res = await http().get(route);
      expect(res.status).toBe(401);
    });

    it.each(routes)('GET %s với token học viên → 403', async (route) => {
      const res = await http().get(route).set(bearer(tokens.student));
      expect(res.status).toBe(403);
    });

    it.each(routes)('GET %s với token admin → 200', async (route) => {
      const res = await http().get(route).set(bearer(tokens.admin));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/admin/stats/counts', () => {
    it('đếm đúng tổng học viên, khóa học hoạt động, và lượt làm bài', async () => {
      // Seed 2 khóa active + 1 khóa ẩn
      const course1 = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Khóa Active 1',
          courseType: 'video_quiz',
          isActive: true,
        },
      });
      const course2 = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Khóa Active 2',
          courseType: 'video_quiz',
          isActive: true,
        },
      });
      const courseHidden = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Khóa Ẩn',
          courseType: 'video_quiz',
          isActive: false,
        },
      });

      const totalProfilesInDb = await prisma.profile.count();
      const totalActiveCoursesInDb = await prisma.course.count({
        where: { isActive: true },
      });
      const totalQuizAttemptsInDb = await prisma.userQuizResult.count();

      const res = await http()
        .get('/api/v1/admin/stats/counts')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const body = res.body as AdminCountsDto;
      expect(body.total_students).toBe(totalProfilesInDb);
      expect(body.total_courses).toBe(totalActiveCoursesInDb);
      expect(body.total_quiz_attempts).toBe(totalQuizAttemptsInDb);

      // Dọn khóa seed
      await prisma.course.deleteMany({
        where: { id: { in: [course1.id, course2.id, courseHidden.id] } },
      });
    });
  });

  describe('GET /api/v1/admin/stats/recent-enrollments', () => {
    it('trả tối đa 5 bản ghi, mới nhất trước, có courses.title và profiles.full_name', async () => {
      const course = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Khóa Recent Enrollment',
          courseType: 'video_quiz',
          isActive: true,
        },
      });

      // Tạo 6 học viên và enrollments với mốc thời gian khác nhau
      const extraUsers: { id: string }[] = [];
      for (let i = 1; i <= 6; i++) {
        const u = await prisma.user.create({
          data: {
            email: `recent-enroll-${i}${EMAIL_SUFFIX}`,
            profile: {
              create: {
                fullName: `Học viên Recent ${i}`,
                email: `recent-enroll-${i}${EMAIL_SUFFIX}`,
              },
            },
          },
        });
        extraUsers.push(u);
        await prisma.enrollment.create({
          data: {
            userId: u.id,
            courseId: course.id,
            enrolledAt: new Date(Date.now() + i * 1000),
          },
        });
      }

      const res = await http()
        .get('/api/v1/admin/stats/recent-enrollments')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const list = res.body as RecentEnrollmentDto[];
      expect(list.length).toBeLessThanOrEqual(5);
      expect(list.length).toBe(5);

      // Bản ghi đầu tiên phải là học viên thứ 6 (mới nhất)
      expect(list[0].profiles?.full_name).toBe('Học viên Recent 6');
      expect(list[0].courses?.title).toBe(
        '[STATS_TEST] Khóa Recent Enrollment',
      );
      expect(list[0].user_id).toBe(extraUsers[5].id);

      // Dọn dẹp
      await prisma.enrollment.deleteMany({
        where: { courseId: course.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: extraUsers.map((u) => u.id) } },
      });
      await prisma.course.delete({ where: { id: course.id } });
    });
  });

  describe('GET /api/v1/admin/stats/recent-results', () => {
    it('trả tối đa 5 kết quả thi, mới nhất trước, score là number, có quizzes.title và profiles', async () => {
      const quiz = await prisma.quiz.create({
        data: {
          title: '[STATS_TEST] Quiz Recent Results',
        },
      });

      const extraUsers: { id: string }[] = [];
      for (let i = 1; i <= 6; i++) {
        const u = await prisma.user.create({
          data: {
            email: `recent-quiz-${i}${EMAIL_SUFFIX}`,
            profile: {
              create: {
                fullName: `Thi sinh ${i}`,
                email: `recent-quiz-${i}${EMAIL_SUFFIX}`,
              },
            },
          },
        });
        extraUsers.push(u);
        await prisma.userQuizResult.create({
          data: {
            userId: u.id,
            quizId: quiz.id,
            score: 7.5 + i * 0.2,
            correctAnswers: 8,
            totalQuestions: 10,
            completedAt: new Date(Date.now() + i * 1000),
          },
        });
      }

      const res = await http()
        .get('/api/v1/admin/stats/recent-results')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const list = res.body as RecentQuizResultDto[];
      expect(list.length).toBeLessThanOrEqual(5);
      expect(list.length).toBe(5);

      // Bản ghi đầu tiên là mới nhất (i = 6)
      expect(list[0].profiles?.full_name).toBe('Thi sinh 6');
      expect(list[0].quizzes?.title).toBe('[STATS_TEST] Quiz Recent Results');
      expect(typeof list[0].score).toBe('number');
      expect(list[0].correct_answers).toBe(8);
      expect(list[0].total_questions).toBe(10);

      // Dọn dẹp
      await prisma.userQuizResult.deleteMany({ where: { quizId: quiz.id } });
      await prisma.user.deleteMany({
        where: { id: { in: extraUsers.map((u) => u.id) } },
      });
      await prisma.quiz.delete({ where: { id: quiz.id } });
    });
  });

  describe('GET /api/v1/admin/stats/quiz-scores', () => {
    it('trả danh sách quizzes và kết quả thi với score là number', async () => {
      const quiz = await prisma.quiz.create({
        data: { title: '[STATS_TEST] Quiz Scores Test' },
      });
      const result = await prisma.userQuizResult.create({
        data: {
          userId: userIds.student,
          quizId: quiz.id,
          score: 8.5,
          completedAt: new Date(),
        },
      });

      const res = await http()
        .get('/api/v1/admin/stats/quiz-scores')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const body = res.body as AdminQuizScoresDto;
      expect(Array.isArray(body.quizzes)).toBe(true);
      expect(Array.isArray(body.results)).toBe(true);
      const foundResult = body.results.find((r) => r.quiz_id === quiz.id);
      expect(foundResult).toBeDefined();
      expect(typeof foundResult!.score).toBe('number');
      expect(foundResult!.score).toBe(8.5);

      await prisma.userQuizResult.delete({ where: { id: result.id } });
      await prisma.quiz.delete({ where: { id: quiz.id } });
    });
  });

  describe('GET /api/v1/admin/stats/course-enrollments', () => {
    it('trả danh sách courses (chỉ active) và enrollments', async () => {
      const activeCourse = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Active Course for enrollments',
          courseType: 'video_quiz',
          isActive: true,
        },
      });
      const inactiveCourse = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Inactive Course for enrollments',
          courseType: 'video_quiz',
          isActive: false,
        },
      });

      const enrollment = await prisma.enrollment.create({
        data: {
          userId: userIds.student,
          courseId: activeCourse.id,
        },
      });

      const res = await http()
        .get('/api/v1/admin/stats/course-enrollments')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const body = res.body as AdminCourseEnrollmentsDto;
      expect(body.courses.some((c) => c.id === activeCourse.id)).toBe(true);
      expect(body.courses.some((c) => c.id === inactiveCourse.id)).toBe(false);
      expect(
        body.enrollments.some((e) => e.course_id === activeCourse.id),
      ).toBe(true);

      await prisma.enrollment.delete({ where: { id: enrollment.id } });
      await prisma.course.deleteMany({
        where: { id: { in: [activeCourse.id, inactiveCourse.id] } },
      });
    });
  });

  describe('GET /api/v1/admin/stats/answers', () => {
    it('trả mảng answers với question_id và is_correct', async () => {
      const quiz = await prisma.quiz.create({
        data: { title: '[STATS_TEST] Quiz for answers' },
      });
      const question = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: '[STATS_TEST] Question text',
        },
      });
      const userResult = await prisma.userQuizResult.create({
        data: {
          userId: userIds.student,
          quizId: quiz.id,
          score: 10,
        },
      });
      const answer = await prisma.userAnswer.create({
        data: {
          resultId: userResult.id,
          questionId: question.id,
          isCorrect: true,
        },
      });

      const res = await http()
        .get('/api/v1/admin/stats/answers')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const list = res.body as AdminUserAnswerDto[];
      expect(Array.isArray(list)).toBe(true);
      const found = list.find((a) => a.question_id === question.id);
      expect(found).toBeDefined();
      expect(found!.is_correct).toBe(true);

      await prisma.userAnswer.delete({ where: { id: answer.id } });
      await prisma.userQuizResult.delete({ where: { id: userResult.id } });
      await prisma.question.delete({ where: { id: question.id } });
      await prisma.quiz.delete({ where: { id: quiz.id } });
    });
  });

  describe('GET /api/v1/admin/stats/questions', () => {
    it('rỗng khi query không có ids', async () => {
      const res = await http()
        .get('/api/v1/admin/stats/questions')
        .set(bearer(tokens.admin));
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('trả đúng câu hỏi theo query ids', async () => {
      const q1 = await prisma.question.create({
        data: { questionText: '[STATS_TEST] Question 1' },
      });
      const q2 = await prisma.question.create({
        data: { questionText: '[STATS_TEST] Question 2' },
      });
      const qOther = await prisma.question.create({
        data: { questionText: '[STATS_TEST] Other Question' },
      });

      const res = await http()
        .get(`/api/v1/admin/stats/questions?ids=${q1.id},${q2.id}`)
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const list = res.body as AdminQuestionDto[];
      expect(list.length).toBe(2);
      expect(list.some((q) => q.id === q1.id)).toBe(true);
      expect(list.some((q) => q.id === q2.id)).toBe(true);
      expect(list.some((q) => q.id === qOther.id)).toBe(false);

      await prisma.question.deleteMany({
        where: { id: { in: [q1.id, q2.id, qOther.id] } },
      });
    });

    it('ném 400 VALIDATION_FAILED nếu > 50 id', async () => {
      const ids51 = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
      const res = await http()
        .get(`/api/v1/admin/stats/questions?ids=${ids51}`)
        .set(bearer(tokens.admin));
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('ném 400 VALIDATION_FAILED nếu id không hợp lệ', async () => {
      const res = await http()
        .get('/api/v1/admin/stats/questions?ids=1,abc,3')
        .set(bearer(tokens.admin));
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('GET /api/v1/admin/stats/students', () => {
    it('trả danh sách profiles và enrollments', async () => {
      const course = await prisma.course.create({
        data: {
          title: '[STATS_TEST] Course For Student List',
          courseType: 'video_quiz',
        },
      });
      const expiresAt = new Date('2027-01-01T00:00:00.000Z');
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: userIds.student,
          courseId: course.id,
          expiresAt,
        },
      });

      const res = await http()
        .get('/api/v1/admin/stats/students')
        .set(bearer(tokens.admin));

      expect(res.status).toBe(200);
      const body = res.body as AdminStudentsDto;
      expect(Array.isArray(body.profiles)).toBe(true);
      expect(Array.isArray(body.enrollments)).toBe(true);

      const foundProfile = body.profiles.find(
        (p) => p.user_id === userIds.student,
      );
      expect(foundProfile).toBeDefined();
      expect(foundProfile!.full_name).toBe('Học Viên Test');
      expect(foundProfile!.email).toBe(`student${EMAIL_SUFFIX}`);

      const foundEnrollment = body.enrollments.find(
        (e) => e.user_id === userIds.student,
      );
      expect(foundEnrollment).toBeDefined();
      expect(foundEnrollment!.expires_at).toBe(expiresAt.toISOString());

      await prisma.enrollment.delete({ where: { id: enrollment.id } });
      await prisma.course.delete({ where: { id: course.id } });
    });
  });
});
