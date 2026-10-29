import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import type {
  AdminFullTestDetailDto,
  FullTestQuestionDto,
} from '../src/modules/assessment/dto';

interface RbacRouteCase {
  name: string;
  method: 'get' | 'post' | 'put' | 'delete';
  path: () => string;
  body?: () => object;
  expectedAdminStatus: number;
}

describe('AssessmentAdminFullTest (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const PREFIX = '[E2E_ADMIN_FT]';

  let adminToken: string;
  let studentToken: string;

  let courseId: number;
  let testId: number;
  let otherTestId: number;
  let existingQId: number;
  let existingAns1Id: number;
  let existingAns2Id: number;
  let otherQId: number;
  let otherAnsId: number;

  // RBAC fixture IDs
  let rbacTestId: number;
  let rbacQId: number;
  let rbacQDeleteId: number;

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
      where: { user: { email: { endsWith: '@admin-fulltest.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@admin-fulltest.test' } },
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
      'admin@admin-fulltest.test',
      AppRole.admin,
    );
    adminToken = admin.token;

    const student = await createUserWithRole(
      'student@admin-fulltest.test',
      AppRole.student,
    );
    studentToken = student.token;

    // Course fixture
    const course = await prisma.course.create({
      data: {
        title: `${PREFIX} TOEIC Course`,
        courseType: 'fulltest',
        price: 0,
        durationMonths: 6,
      },
    });
    courseId = course.id;

    // Test 1 fixture
    const ft1 = await prisma.fullTest.create({
      data: {
        title: `${PREFIX} Full Test 1`,
        courseId,
        category: '2026',
        totalQuestions: 1,
      },
    });
    testId = ft1.id;

    // Quiz & section for Test 1
    const qz1 = await prisma.quiz.create({
      data: {
        title: `Part 1 - ${PREFIX} Full Test 1`,
        totalQuestions: 1,
        displayOrder: 1,
      },
    });
    await prisma.fullTestSection.create({
      data: {
        testId,
        quizId: qz1.id,
        partNumber: 1,
      },
    });

    const q1 = await prisma.question.create({
      data: {
        quizId: qz1.id,
        questionText: `${PREFIX} Question 1 in Test 1`,
        displayOrder: 1,
        answers: {
          create: [
            { answerText: 'Ans 1', isCorrect: true, displayOrder: 0 },
            { answerText: 'Ans 2', isCorrect: false, displayOrder: 1 },
          ],
        },
      },
      include: { answers: true },
    });
    existingQId = q1.id;
    existingAns1Id = q1.answers[0].id;
    existingAns2Id = q1.answers[1].id;

    // Test 2 (other test) fixture
    const ft2 = await prisma.fullTest.create({
      data: {
        title: `${PREFIX} Full Test 2 (Other)`,
        category: '2026',
        totalQuestions: 1,
      },
    });
    otherTestId = ft2.id;

    const qz2 = await prisma.quiz.create({
      data: {
        title: `Part 1 - ${PREFIX} Full Test 2`,
        totalQuestions: 1,
        displayOrder: 1,
      },
    });
    await prisma.fullTestSection.create({
      data: {
        testId: otherTestId,
        quizId: qz2.id,
        partNumber: 1,
      },
    });

    const otherQ = await prisma.question.create({
      data: {
        quizId: qz2.id,
        questionText: `${PREFIX} Other Test Question`,
        displayOrder: 1,
        answers: {
          create: [
            { answerText: 'Other Ans', isCorrect: true, displayOrder: 0 },
          ],
        },
      },
      include: { answers: true },
    });
    otherQId = otherQ.id;
    otherAnsId = otherQ.answers[0].id;

    // RBAC fixtures
    const rbacFt = await prisma.fullTest.create({
      data: {
        title: `${PREFIX} RBAC Full Test`,
        category: '2026',
        totalQuestions: 2,
      },
    });
    rbacTestId = rbacFt.id;

    const rbacQz = await prisma.quiz.create({
      data: {
        title: `Part 1 - ${PREFIX} RBAC Full Test`,
        totalQuestions: 2,
        displayOrder: 1,
      },
    });
    await prisma.fullTestSection.create({
      data: {
        testId: rbacTestId,
        quizId: rbacQz.id,
        partNumber: 1,
      },
    });

    const rbacQ = await prisma.question.create({
      data: {
        quizId: rbacQz.id,
        questionText: `${PREFIX} RBAC Question`,
        displayOrder: 1,
        answers: {
          create: [{ answerText: 'A', isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    rbacQId = rbacQ.id;

    const rbacQDel = await prisma.question.create({
      data: {
        quizId: rbacQz.id,
        questionText: `${PREFIX} RBAC Question Delete`,
        displayOrder: 2,
        answers: {
          create: [{ answerText: 'B', isCorrect: true, displayOrder: 0 }],
        },
      },
    });
    rbacQDeleteId = rbacQDel.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('Phân quyền RBAC (401 unauth, 403 student, 2xx admin)', () => {
    const cases: RbacRouteCase[] = [
      {
        name: 'GET /full-tests/:testId',
        method: 'get',
        path: () => `/api/v1/assessment/admin/full-tests/${rbacTestId}`,
        expectedAdminStatus: 200,
      },
      {
        name: 'PUT /full-tests/:testId',
        method: 'put',
        path: () => `/api/v1/assessment/admin/full-tests/${rbacTestId}`,
        body: () => ({ title: `${PREFIX} RBAC Updated Title` }),
        expectedAdminStatus: 200,
      },
      {
        name: 'GET /full-tests/:testId/questions',
        method: 'get',
        path: () =>
          `/api/v1/assessment/admin/full-tests/${rbacTestId}/questions`,
        expectedAdminStatus: 200,
      },
      {
        name: 'POST /full-tests/:testId/questions',
        method: 'post',
        path: () =>
          `/api/v1/assessment/admin/full-tests/${rbacTestId}/questions`,
        body: () => ({
          part_number: 1,
          display_order: 10,
          question_text: `${PREFIX} RBAC New Question`,
          answers: [{ answer_text: 'Opt 1', is_correct: true }],
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /fulltest-questions/:id',
        method: 'put',
        path: () => `/api/v1/assessment/admin/fulltest-questions/${rbacQId}`,
        body: () => ({
          display_order: 1,
          question_text: `${PREFIX} RBAC Updated Question`,
          answers: [{ answer_text: 'Opt Updated', is_correct: true }],
        }),
        expectedAdminStatus: 200,
      },
      {
        name: 'POST /fulltest-questions/:id/duplicate',
        method: 'post',
        path: () =>
          `/api/v1/assessment/admin/fulltest-questions/${rbacQId}/duplicate`,
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /full-tests/:testId/question-group',
        method: 'put',
        path: () =>
          `/api/v1/assessment/admin/full-tests/${rbacTestId}/question-group`,
        body: () => ({
          question_ids: [rbacQId],
          group_id: 'rbac_grp',
        }),
        expectedAdminStatus: 204,
      },
      {
        name: 'DELETE /fulltest-questions/:id',
        method: 'delete',
        path: () =>
          `/api/v1/assessment/admin/fulltest-questions/${rbacQDeleteId}`,
        expectedAdminStatus: 204,
      },
    ];

    it.each(cases)('$name: 401 khi chưa đăng nhập', async (tc) => {
      const req = http()[tc.method](tc.path());
      if (tc.body) req.send(tc.body());
      await req.expect(401);
    });

    it.each(cases)('$name: 403 khi đăng nhập là student', async (tc) => {
      const req = http()[tc.method](tc.path()).set(bearer(studentToken));
      if (tc.body) req.send(tc.body());
      await req.expect(403);
    });

    it.each(cases)('$name: 2xx khi đăng nhập là admin', async (tc) => {
      const req = http()[tc.method](tc.path()).set(bearer(adminToken));
      if (tc.body) req.send(tc.body());
      await req.expect(tc.expectedAdminStatus);
    });
  });

  describe('Nghiệp vụ Full Test Admin (T-024)', () => {
    it('GET /full-tests/:testId: trả chi tiết đề thi kèm khóa học; 404 khi không tồn tại', async () => {
      const res = await http()
        .get(`/api/v1/assessment/admin/full-tests/${testId}`)
        .set(bearer(adminToken))
        .expect(200);

      const ft = res.body as AdminFullTestDetailDto;
      expect(ft.id).toBe(testId);
      expect(ft.title).toContain(PREFIX);
      expect(ft.courses?.id).toBe(courseId);
      expect(ft.courses?.title).toContain(PREFIX);

      await http()
        .get('/api/v1/assessment/admin/full-tests/9999999')
        .set(bearer(adminToken))
        .expect(404);
    });

    it('PUT /full-tests/:testId: cập nhật thông tin đề thi; 404 khi không tồn tại', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/full-tests/${testId}`)
        .set(bearer(adminToken))
        .send({
          title: `${PREFIX} Full Test 1 Updated`,
          description: 'Mô tả mới',
          audio_url: 'https://cdn.example.com/ft1.mp3',
          category: '2026',
          release_date: '2026-04-01T00:00:00.000Z',
        })
        .expect(200);

      const ft = res.body as AdminFullTestDetailDto;
      expect(ft.title).toBe(`${PREFIX} Full Test 1 Updated`);
      expect(ft.description).toBe('Mô tả mới');
      expect(ft.audio_url).toBe('https://cdn.example.com/ft1.mp3');

      await http()
        .put('/api/v1/assessment/admin/full-tests/9999999')
        .set(bearer(adminToken))
        .send({ title: 'Nonexistent' })
        .expect(404);
    });

    it('POST /full-tests/:testId/questions: thêm câu vào Part chưa có section → tạo quiz Part N + section; đếm lại total_questions', async () => {
      // Part 2 chưa có section trong testId
      const res = await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/questions`)
        .set(bearer(adminToken))
        .send({
          part_number: 2,
          display_order: 7,
          question_text: `${PREFIX} Question Part 2 Number 7`,
          passage_text: 'Passage 2',
          audio_url: 'https://cdn.example.com/p2.mp3',
          answers: [
            { answer_text: 'A', is_correct: true, explanation: 'Exp A' },
            { answer_text: 'B', is_correct: false },
          ],
        })
        .expect(201);

      const q = res.body as FullTestQuestionDto;
      expect(q.part_number).toBe(2);
      expect(q.display_order).toBe(7);
      expect(q.answers).toHaveLength(2);

      // Section Part 2 đã được tạo tự động
      const sec = await prisma.fullTestSection.findFirst({
        where: { testId, partNumber: 2 },
        include: { quiz: true },
      });
      expect(sec).not.toBeNull();
      expect(sec?.quiz?.title).toContain('Part 2 -');

      // totalQuestions của đề thi đã được đếm lại = 2
      const ft = await prisma.fullTest.findUniqueOrThrow({
        where: { id: testId },
      });
      expect(ft.totalQuestions).toBe(2);
    });

    it('POST /full-tests/:testId/questions: thêm câu thứ 2 vào cùng Part 2 → tái sử dụng section có sẵn', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/questions`)
        .set(bearer(adminToken))
        .send({
          part_number: 2,
          display_order: 8,
          question_text: `${PREFIX} Question Part 2 Number 8`,
          answers: [{ answer_text: 'Option A', is_correct: true }],
        })
        .expect(201);

      const q = res.body as FullTestQuestionDto;
      expect(q.part_number).toBe(2);
      expect(q.display_order).toBe(8);

      // Số lượng section Part 2 vẫn là 1 (không tạo thêm)
      const secCount = await prisma.fullTestSection.count({
        where: { testId, partNumber: 2 },
      });
      expect(secCount).toBe(1);

      // totalQuestions cập nhật lên 3
      const ft = await prisma.fullTest.findUniqueOrThrow({
        where: { id: testId },
      });
      expect(ft.totalQuestions).toBe(3);
    });

    it('GET /full-tests/:testId/questions: trả danh sách sắp xếp theo Part rồi display_order', async () => {
      const res = await http()
        .get(`/api/v1/assessment/admin/full-tests/${testId}/questions`)
        .set(bearer(adminToken))
        .expect(200);

      const list = res.body as FullTestQuestionDto[];
      expect(list.length).toBeGreaterThanOrEqual(3);

      // Kiểm tra sắp xếp: Part 1 câu 1 trước Part 2 câu 7, rồi Part 2 câu 8
      for (let i = 0; i < list.length - 1; i++) {
        const cur = list[i];
        const next = list[i + 1];
        if (cur.part_number === next.part_number) {
          expect(cur.display_order).toBeLessThanOrEqual(next.display_order);
        } else {
          expect(cur.part_number).toBeLessThan(next.part_number);
        }
      }
    });

    it('PUT /fulltest-questions/:id: đáp án có id lạ/câu khác → 400 ANSWER_NOT_IN_QUESTION; không thay đổi dữ liệu', async () => {
      await http()
        .put(`/api/v1/assessment/admin/fulltest-questions/${existingQId}`)
        .set(bearer(adminToken))
        .send({
          display_order: 1,
          question_text: `${PREFIX} Updated Text`,
          answers: [
            { id: otherAnsId, answer_text: 'Wrong Answer', is_correct: true },
          ],
        })
        .expect(400);

      // Câu hỏi không bị đổi
      const q = await prisma.question.findUniqueOrThrow({
        where: { id: existingQId },
      });
      expect(q.questionText).not.toBe(`${PREFIX} Updated Text`);
    });

    it('PUT /fulltest-questions/:id: sửa câu, giữ nguyên id đáp án cập nhật, xóa đáp án bị bỏ, thêm đáp án mới', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/fulltest-questions/${existingQId}`)
        .set(bearer(adminToken))
        .send({
          display_order: 1,
          question_text: `${PREFIX} Question 1 Updated`,
          transcript: 'Transcript edited',
          answers: [
            // existingAns1Id giữ nguyên id và cập nhật nội dung
            {
              id: existingAns1Id,
              answer_text: 'Ans 1 Updated',
              is_correct: false,
              explanation: 'Exp updated',
            },
            // existingAns2Id bị bỏ -> sẽ bị xóa
            // Thêm đáp án mới (không có id)
            { answer_text: 'Ans 3 Brand New', is_correct: true },
          ],
        })
        .expect(200);

      const updated = res.body as FullTestQuestionDto;
      expect(updated.question_text).toBe(`${PREFIX} Question 1 Updated`);
      expect(updated.transcript).toBe('Transcript edited');

      // existingAns1Id vẫn giữ id
      const ans1 = updated.answers.find((a) => a.id === existingAns1Id);
      expect(ans1).toBeDefined();
      expect(ans1?.answer_text).toBe('Ans 1 Updated');

      // existingAns2Id đã bị xóa
      const ans2InDb = await prisma.answer.findUnique({
        where: { id: existingAns2Id },
      });
      expect(ans2InDb).toBeNull();

      // Có đáp án mới được thêm
      const ans3 = updated.answers.find((a) => a.id !== existingAns1Id);
      expect(ans3).toBeDefined();
      expect(ans3?.answer_text).toBe('Ans 3 Brand New');
    });

    it('POST /fulltest-questions/:id/duplicate: nhân bản câu hỏi display_order + 1, đuôi "(Bản sao)"; total_questions KHÔNG đổi', async () => {
      const countBefore = (
        await prisma.fullTest.findUniqueOrThrow({ where: { id: testId } })
      ).totalQuestions;

      const res = await http()
        .post(
          `/api/v1/assessment/admin/fulltest-questions/${existingQId}/duplicate`,
        )
        .set(bearer(adminToken))
        .expect(201);

      const dup = res.body as FullTestQuestionDto;
      expect(dup.display_order).toBe(2);
      expect(dup.question_text).toContain('(Bản sao)');
      expect(dup.answers).toHaveLength(2);

      // total_questions không thay đổi theo đúng spec & hành vi cũ
      const countAfter = (
        await prisma.fullTest.findUniqueOrThrow({ where: { id: testId } })
      ).totalQuestions;
      expect(countAfter).toBe(countBefore);
    });

    it('PUT /full-tests/:testId/question-group: id trùng hoặc thuộc đề khác → 400; hợp lệ → cập nhật 4 trường', async () => {
      // ID trùng lặp -> 400
      await http()
        .put(`/api/v1/assessment/admin/full-tests/${testId}/question-group`)
        .set(bearer(adminToken))
        .send({
          question_ids: [existingQId, existingQId],
          group_id: 'grp_dup',
        })
        .expect(400);

      // ID câu hỏi thuộc đề khác -> 400
      await http()
        .put(`/api/v1/assessment/admin/full-tests/${testId}/question-group`)
        .set(bearer(adminToken))
        .send({
          question_ids: [existingQId, otherQId],
          group_id: 'grp_other',
        })
        .expect(400);

      // Hợp lệ -> 204
      await http()
        .put(`/api/v1/assessment/admin/full-tests/${testId}/question-group`)
        .set(bearer(adminToken))
        .send({
          question_ids: [existingQId],
          passage_text: 'Shared Group Passage',
          audio_url: 'https://cdn.example.com/shared.mp3',
          image_url: 'https://cdn.example.com/shared.png',
          group_id: 'group_test_1',
        })
        .expect(204);

      const qInDb = await prisma.question.findUniqueOrThrow({
        where: { id: existingQId },
      });
      expect(qInDb.passageText).toBe('Shared Group Passage');
      expect(qInDb.audioUrl).toBe('https://cdn.example.com/shared.mp3');
      expect(qInDb.imageUrl).toBe('https://cdn.example.com/shared.png');
      expect(qInDb.groupId).toBe('group_test_1');
    });

    it('DELETE /fulltest-questions/:id: xóa câu hỏi → total_questions của đề giảm; xóa lại trả 204', async () => {
      // Tạo 1 câu tạm để xóa
      const createRes = await http()
        .post(`/api/v1/assessment/admin/full-tests/${testId}/questions`)
        .set(bearer(adminToken))
        .send({
          part_number: 1,
          display_order: 99,
          question_text: `${PREFIX} Temp Question To Delete`,
          answers: [{ answer_text: 'Ans', is_correct: true }],
        })
        .expect(201);

      const tempQ = createRes.body as FullTestQuestionDto;
      const countBefore = (
        await prisma.fullTest.findUniqueOrThrow({ where: { id: testId } })
      ).totalQuestions!;

      // Xóa câu tạm
      await http()
        .delete(`/api/v1/assessment/admin/fulltest-questions/${tempQ.id}`)
        .set(bearer(adminToken))
        .expect(204);

      const countAfter = (
        await prisma.fullTest.findUniqueOrThrow({ where: { id: testId } })
      ).totalQuestions!;
      expect(countAfter).toBe(countBefore - 1);

      // Xóa lại câu vừa xóa trả về 204
      await http()
        .delete(`/api/v1/assessment/admin/fulltest-questions/${tempQ.id}`)
        .set(bearer(adminToken))
        .expect(204);
    });
  });
});
