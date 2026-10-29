import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { CatalogRepository } from '../src/modules/catalog/catalog.repository';

describe('CatalogCourseImport (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const PREFIX = '[E2E_COURSE_IMPORT]';

  let adminToken: string;
  let studentToken: string;

  let courseId: number;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.answer.deleteMany({
      where: { question: { questionText: { contains: PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { questionText: { contains: PREFIX } },
    });
    await prisma.lesson.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.module.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.course.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { email: { endsWith: '@course-import.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@course-import.test' } },
    });
  }

  async function createUserWithRole(
    email: string,
    role: AppRole,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        roles: { create: { role } },
      },
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

    const admin = await createUserWithRole(
      'admin@course-import.test',
      AppRole.admin,
    );
    adminToken = admin.token;

    const student = await createUserWithRole(
      'student@course-import.test',
      AppRole.student,
    );
    studentToken = student.token;

    const course = await prisma.course.create({
      data: {
        title: `${PREFIX} Target Course`,
        courseType: 'video_quiz',
        price: 0,
        durationMonths: 6,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC - 401 unauthenticated, 403 student', () => {
    it('POST /api/v1/catalog/admin/courses/:courseId/import-json -> 401 & 403', async () => {
      await http()
        .post(`/api/v1/catalog/admin/courses/${courseId}/import-json`)
        .send({ exams: [] })
        .expect(401);
      await http()
        .post(`/api/v1/catalog/admin/courses/${courseId}/import-json`)
        .set(bearer(studentToken))
        .send({ exams: [] })
        .expect(403);
    });
  });

  describe('Happy path & Transaction rollback proof', () => {
    it('import-json: creates module, lessons, quizzes, questions, answers', async () => {
      const res = await http()
        .post(`/api/v1/catalog/admin/courses/${courseId}/import-json`)
        .set(bearer(adminToken))
        .send({
          course_title: `${PREFIX} Imported Module`,
          exams: [
            {
              exam_title: `${PREFIX} Exam 1`,
              audio_url: 'https://example.com/audio1.mp3',
              questions: [
                {
                  part: 5,
                  question_text: `${PREFIX} Q1 Question text`,
                  answers: [
                    {
                      answer_text: 'Choice A',
                      is_correct: true,
                      explanation: 'Explanation A',
                    },
                    { answer_text: 'Choice B', is_correct: false },
                  ],
                },
              ],
            },
          ],
        })
        .expect(201);

      const body = res.body as {
        exams_count: number;
        total_questions: number;
        module_id: number;
      };
      expect(body.exams_count).toBe(1);
      expect(body.total_questions).toBe(1);

      const createdModule = await prisma.module.findUnique({
        where: { id: body.module_id },
      });
      expect(createdModule).toBeDefined();
      expect(createdModule?.title).toBe(`${PREFIX} Imported Module`);
    });

    it('Rollback proof: fails halfway in importCourseJson, leaving NO dangling records', async () => {
      const beforeModCount = await prisma.module.count({
        where: { title: { contains: PREFIX } },
      });
      const beforeQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });

      // Force failure on question creation inside transaction
      jest
        .spyOn(CatalogRepository.prototype, 'createAnswersRaw')
        .mockRejectedValueOnce(
          new Error('Simulated Mid-Transaction Database Error'),
        );

      try {
        await http()
          .post(`/api/v1/catalog/admin/courses/${courseId}/import-json`)
          .set(bearer(adminToken))
          .send({
            course_title: `${PREFIX} Failing Module`,
            exams: [
              {
                exam_title: `${PREFIX} Exam Failing`,
                questions: [
                  {
                    part: 5,
                    question_text: `${PREFIX} Q Fail`,
                    answers: [{ answer_text: 'A', is_correct: true }],
                  },
                ],
              },
            ],
          })
          .expect(500);
      } finally {
        jest
          .spyOn(CatalogRepository.prototype, 'createAnswersRaw')
          .mockRestore();
      }

      const afterModCount = await prisma.module.count({
        where: { title: { contains: PREFIX } },
      });
      const afterQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });

      expect(afterModCount).toBe(beforeModCount);
      expect(afterQCount).toBe(beforeQCount);
    });
  });
});
