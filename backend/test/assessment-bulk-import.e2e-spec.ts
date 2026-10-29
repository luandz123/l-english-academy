import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { AssessmentAdminRepository } from '../src/modules/assessment/assessment-admin.repository';

describe('AssessmentBulkImport (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const PREFIX = '[E2E_BULK_IMPORT]';

  let adminToken: string;
  let studentToken: string;

  let courseId: number;
  let testId: number;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.answer.deleteMany({
      where: { question: { questionText: { contains: PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { questionText: { contains: PREFIX } },
    });
    await prisma.fullTestSection.deleteMany({
      where: { fullTest: { title: { contains: PREFIX } } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.fullTest.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.course.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { email: { endsWith: '@bulk-assessment.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@bulk-assessment.test' } },
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
      'admin@bulk-assessment.test',
      AppRole.admin,
    );
    adminToken = admin.token;

    const student = await createUserWithRole(
      'student@bulk-assessment.test',
      AppRole.student,
    );
    studentToken = student.token;

    const course = await prisma.course.create({
      data: {
        title: `${PREFIX} TOEIC Prep`,
        courseType: 'fulltest',
        price: 0,
        durationMonths: 6,
      },
    });
    courseId = course.id;

    const test = await prisma.fullTest.create({
      data: {
        title: `${PREFIX} Test Baseline`,
        courseId,
        category: '2026',
        totalQuestions: 0,
      },
    });
    testId = test.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC - 401 unauthenticated, 403 student', () => {
    it('DELETE /api/v1/assessment/admin/full-tests/:id -> 401 & 403', async () => {
      await http()
        .delete(`/api/v1/assessment/admin/full-tests/${testId}`)
        .expect(401);
      await http()
        .delete(`/api/v1/assessment/admin/full-tests/${testId}`)
        .set(bearer(studentToken))
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/full-tests/bulk-delete -> 401 & 403', async () => {
      await http()
        .post('/api/v1/assessment/admin/full-tests/bulk-delete')
        .send({ test_ids: [testId] })
        .expect(401);
      await http()
        .post('/api/v1/assessment/admin/full-tests/bulk-delete')
        .set(bearer(studentToken))
        .send({ test_ids: [testId] })
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/full-tests/:testId/import-questions -> 401 & 403', async () => {
      await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/import-questions`)
        .send({ questions: [] })
        .expect(401);
      await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/import-questions`)
        .set(bearer(studentToken))
        .send({ questions: [] })
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/full-tests/package-import -> 401 & 403', async () => {
      await http()
        .post('/api/v1/assessment/admin/full-tests/package-import')
        .send({ exams: [] })
        .expect(401);
      await http()
        .post('/api/v1/assessment/admin/full-tests/package-import')
        .set(bearer(studentToken))
        .send({ exams: [] })
        .expect(403);
    });
  });

  describe('Happy path & Transaction rollback proof', () => {
    it('import-questions: creates sections, questions, and updates totalQuestions', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/import-questions`)
        .set(bearer(adminToken))
        .send({
          audio_url: 'https://example.com/audio.mp3',
          questions: [
            {
              part: 5,
              question_text: `${PREFIX} Q1 Question text`,
              answers: [
                {
                  answer_text: 'Choice A',
                  is_correct: true,
                  explanation: 'OK',
                },
                { answer_text: 'Choice B', is_correct: false },
              ],
            },
            {
              part: 6,
              passage_text: 'Passage content',
              question_text: `${PREFIX} Q2 Question text`,
              answers: [
                { answer_text: 'Option 1', is_correct: true },
                { answer_text: 'Option 2', is_correct: false },
              ],
            },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({
        test_id: testId,
        imported_questions: 2,
      });

      const updatedTest = await prisma.fullTest.findUnique({
        where: { id: testId },
      });
      expect(updatedTest?.totalQuestions).toBe(2);
      expect(updatedTest?.audioUrl).toBe('https://example.com/audio.mp3');

      const sections = await prisma.fullTestSection.findMany({
        where: { testId },
      });
      expect(sections.length).toBe(7);
    });

    it('package-import: creates new course, exams, quizzes, questions', async () => {
      const res = await http()
        .post('/api/v1/assessment/admin/full-tests/package-import')
        .set(bearer(adminToken))
        .send({
          create_new_course: true,
          course_title: `${PREFIX} Package Course 1`,
          exams: [
            {
              exam_title: `${PREFIX} Exam 1`,
              audio_url: 'https://example.com/pkg_audio.mp3',
              questions: [
                {
                  part: 5,
                  question_text: `${PREFIX} Pkg Q1`,
                  answers: [
                    { answer_text: 'A', is_correct: true },
                    { answer_text: 'B', is_correct: false },
                  ],
                },
              ],
            },
          ],
        })
        .expect(201);

      const body = res.body as { exams_imported: number; course_id: number };
      expect(body.exams_imported).toBe(1);
      const createdCourseId = body.course_id;

      const createdTest = await prisma.fullTest.findFirst({
        where: { courseId: createdCourseId, title: `${PREFIX} Exam 1` },
      });
      expect(createdTest).toBeDefined();
    });

    it('Rollback proof: fails halfway in import-questions, leaving NO dangling records', async () => {
      // 1. Create a fresh test
      const freshTest = await prisma.fullTest.create({
        data: {
          title: `${PREFIX} Rollback Test`,
          courseId,
          category: '2026',
          totalQuestions: 0,
        },
      });

      const beforeQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });
      const beforeSectionCount = await prisma.fullTestSection.count({
        where: { testId: freshTest.id },
      });

      // 2. Force a failure inside transaction when answers are inserted
      jest
        .spyOn(AssessmentAdminRepository.prototype, 'createAnswers')
        .mockRejectedValueOnce(
          new Error('Simulated Database Crash Mid-Import'),
        );

      try {
        await http()
          .post(
            `/api/v1/assessment/admin/full-tests/${freshTest.id}/import-questions`,
          )
          .set(bearer(adminToken))
          .send({
            questions: [
              {
                part: 5,
                question_text: `${PREFIX} Q Rollback 1`,
                answers: [{ answer_text: 'Ans 1', is_correct: true }],
              },
            ],
          })
          .expect(500);
      } finally {
        jest
          .spyOn(AssessmentAdminRepository.prototype, 'createAnswers')
          .mockRestore();
      }

      // 3. Verify that despite creating 7 quizzes/sections before the error, everything rolled back!
      const afterQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });
      const afterSectionCount = await prisma.fullTestSection.count({
        where: { testId: freshTest.id },
      });

      expect(afterQCount).toBe(beforeQCount);
      expect(afterSectionCount).toBe(beforeSectionCount);
    });

    it('delete & bulk-delete: deletes full tests and associated quizzes cleanly', async () => {
      // Create a test to delete
      const delTest = await prisma.fullTest.create({
        data: {
          title: `${PREFIX} To Be Deleted`,
          courseId,
          category: '2026',
          totalQuestions: 0,
        },
      });

      const quiz = await prisma.quiz.create({
        data: {
          title: `${PREFIX} Quiz To Be Deleted`,
          totalQuestions: 0,
          displayOrder: 1,
        },
      });

      await prisma.fullTestSection.create({
        data: {
          testId: delTest.id,
          partNumber: 1,
          quizId: quiz.id,
        },
      });

      // DELETE /api/v1/assessment/admin/full-tests/:id
      await http()
        .delete(`/api/v1/assessment/admin/full-tests/${delTest.id}`)
        .set(bearer(adminToken))
        .expect(204);

      const checkTest = await prisma.fullTest.findUnique({
        where: { id: delTest.id },
      });
      expect(checkTest).toBeNull();
      const checkQuiz = await prisma.quiz.findUnique({
        where: { id: quiz.id },
      });
      expect(checkQuiz).toBeNull();
    });
  });
});
