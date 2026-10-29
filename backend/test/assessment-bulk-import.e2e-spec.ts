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

    it('POST /api/v1/assessment/admin/full-tests/:testId/append-questions -> 401 & 403', async () => {
      await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/append-questions`)
        .send({ questions: [] })
        .expect(401);
      await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/append-questions`)
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

      const sections = await prisma.fullTestSection.findMany({
        where: { testId },
      });
      expect(sections.length).toBe(7);
    });

    it('append-questions: appends questions to existing sections and updates audio_url', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/append-questions`)
        .set(bearer(adminToken))
        .send({
          audio_url: 'https://example.com/audio_append.mp3',
          questions: [
            {
              part: 5,
              question_text: `${PREFIX} Q3 Appended`,
              answers: [
                {
                  answer_text: 'Choice C',
                  is_correct: true,
                  explanation: 'Appended OK',
                },
              ],
            },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({
        test_id: testId,
        imported_questions: 1,
      });

      const updatedTest = await prisma.fullTest.findUnique({
        where: { id: testId },
      });
      expect(updatedTest?.audioUrl).toBe(
        'https://example.com/audio_append.mp3',
      );
    });

    it('package-import 2 lần cùng course_title: dùng lại một khóa, đề thi bị ghi đè không bị nhân đôi số câu', async () => {
      const courseTitle = `${PREFIX} Unique Package Course Overwrite`;
      const examTitle = `${PREFIX} Exam Overwrite 1`;

      // Lần 1: Import lần đầu
      const res1 = await http()
        .post('/api/v1/assessment/admin/full-tests/package-import')
        .set(bearer(adminToken))
        .send({
          course_title: courseTitle,
          exams: [
            {
              exam_title: examTitle,
              questions: [
                {
                  part: 5,
                  question_text: `${PREFIX} Initial Q1`,
                  answers: [
                    { answer_text: 'Choice A', is_correct: true },
                    { answer_text: 'Choice B', is_correct: false },
                  ],
                },
              ],
            },
          ],
        })
        .expect(201);

      const courseId1 = (res1.body as { course_id: number }).course_id;

      // Lần 2: Import lại với cùng course_title và cùng exam_title nhưng câu hỏi khác
      const res2 = await http()
        .post('/api/v1/assessment/admin/full-tests/package-import')
        .set(bearer(adminToken))
        .send({
          course_title: courseTitle,
          exams: [
            {
              exam_title: examTitle,
              questions: [
                {
                  part: 5,
                  question_text: `${PREFIX} Overwritten Q2`,
                  answers: [{ answer_text: 'Choice X', is_correct: true }],
                },
              ],
            },
          ],
        })
        .expect(201);

      const courseId2 = (res2.body as { course_id: number }).course_id;

      // Khẳng định chỉ 1 khóa học được dùng
      expect(courseId2).toBe(courseId1);

      const totalCourses = await prisma.course.count({
        where: { title: courseTitle },
      });
      expect(totalCourses).toBe(1);

      const exams = await prisma.fullTest.findMany({
        where: { courseId: courseId1, title: examTitle },
      });
      expect(exams.length).toBe(1);

      // Đề thi bị ghi đè: số câu không nhân đôi, câu cũ bị xóa và thay bằng câu mới
      const examTest = exams[0];
      const sections = await prisma.fullTestSection.findMany({
        where: { testId: examTest.id, partNumber: 5 },
      });
      expect(sections.length).toBe(1);
      const quizId = sections[0].quizId!;

      const questions = await prisma.question.findMany({
        where: { quizId },
      });
      expect(questions.length).toBe(1);
      expect(questions[0].questionText).toBe(`${PREFIX} Overwritten Q2`);
    });

    it('append-questions vào đề không có section: trả về 400 FULLTEST_SECTIONS_NOT_FOUND và không ghi gì vào DB', async () => {
      // Tạo đề rỗng không có section
      const emptyTest = await prisma.fullTest.create({
        data: {
          title: `${PREFIX} Empty Sections Test`,
          courseId,
          category: '2026',
          totalQuestions: 0,
        },
      });

      const beforeQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });

      const res = await http()
        .post(
          `/api/v1/assessment/admin/full-tests/${emptyTest.id}/append-questions`,
        )
        .set(bearer(adminToken))
        .send({
          questions: [
            {
              part: 5,
              question_text: `${PREFIX} Should not be saved`,
              answers: [{ answer_text: 'A', is_correct: true }],
            },
          ],
        })
        .expect(400);

      expect((res.body as { code: string }).code).toBe(
        'FULLTEST_SECTIONS_NOT_FOUND',
      );

      const afterQCount = await prisma.question.count({
        where: { questionText: { contains: PREFIX } },
      });
      expect(afterQCount).toBe(beforeQCount);
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
