import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import type {
  LessonQuizIdResponseDto,
  VocabCategoryDto,
  VocabQuizDto,
  VocabWordDto,
} from '../src/modules/assessment/dto/vocab.dto';

/**
 * E2E cho T-021: Trang Từ vựng và Flashcard qua API
 * - 3 route danh sách công khai, đúng thứ tự display_order, id, lọc theo parent id.
 * - Chuỗi dò 4 bước của GET /lessons/:ref/words:
 *   (1) quiz gắn lesson_id = ref;
 *   (2) quiz có id = ref;
 *   (3) lessons có quiz_id = ref -> quiz có lesson_id = lesson.id;
 *   (4) không quiz + question_ids -> lọc theo question_id;
 *   (4b) không quiz, không question_ids -> [];
 *   (5) có quiz + question_ids -> lọc đúng theo quiz + question_ids.
 * - question_ids=abc hoặc > 500 -> 400 VALIDATION_FAILED.
 * - GET /lessons/:lessonId/quiz-id -> { lesson: { quiz_id } } hoặc { lesson: null }.
 * - Hoàn toàn không cần token (public).
 */
describe('AssessmentVocab (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const PREFIX = '[VOCAB_TEST]';

  const http = () => request(app.getHttpServer());

  async function cleanup(): Promise<void> {
    await prisma.vocabQuestion.deleteMany({
      where: { word: { contains: PREFIX } },
    });
    await prisma.vocabQuiz.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.vocabCategory.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.lesson.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.question.deleteMany({
      where: { questionText: { contains: PREFIX } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.course.deleteMany({
      where: { title: { contains: PREFIX } },
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
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('3 route danh sách công khai (không cần token)', () => {
    it('GET /courses/:courseId/categories trả danh sách categories theo thứ tự display_order, id', async () => {
      const courseA = await prisma.course.create({
        data: {
          title: `${PREFIX} Course A`,
          courseType: 'video_quiz',
        },
      });
      const courseB = await prisma.course.create({
        data: {
          title: `${PREFIX} Course B`,
          courseType: 'video_quiz',
        },
      });

      const catA2 = await prisma.vocabCategory.create({
        data: {
          courseId: courseA.id,
          title: `${PREFIX} Cat A2`,
          displayOrder: 2,
        },
      });
      const catA1 = await prisma.vocabCategory.create({
        data: {
          courseId: courseA.id,
          title: `${PREFIX} Cat A1`,
          displayOrder: 1,
        },
      });
      const catB = await prisma.vocabCategory.create({
        data: {
          courseId: courseB.id,
          title: `${PREFIX} Cat B`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/courses/${courseA.id}/categories`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabCategoryDto[];
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(catA1.id);
      expect(list[0].display_order).toBe(1);
      expect(list[1].id).toBe(catA2.id);
      expect(list[1].display_order).toBe(2);
      expect(list.some((c) => c.id === catB.id)).toBe(false);

      await prisma.vocabCategory.deleteMany({
        where: { id: { in: [catA1.id, catA2.id, catB.id] } },
      });
      await prisma.course.deleteMany({
        where: { id: { in: [courseA.id, courseB.id] } },
      });
    });

    it('GET /categories/:categoryId/quizzes trả danh sách quizzes theo category', async () => {
      const cat = await prisma.vocabCategory.create({
        data: { title: `${PREFIX} Category Quizzes` },
      });
      const otherCat = await prisma.vocabCategory.create({
        data: { title: `${PREFIX} Other Category` },
      });

      const q2 = await prisma.vocabQuiz.create({
        data: {
          categoryId: cat.id,
          title: `${PREFIX} Quiz 2`,
          displayOrder: 2,
        },
      });
      const q1 = await prisma.vocabQuiz.create({
        data: {
          categoryId: cat.id,
          title: `${PREFIX} Quiz 1`,
          displayOrder: 1,
        },
      });
      const qOther = await prisma.vocabQuiz.create({
        data: {
          categoryId: otherCat.id,
          title: `${PREFIX} Other Quiz`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/categories/${cat.id}/quizzes`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabQuizDto[];
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(q1.id);
      expect(list[1].id).toBe(q2.id);
      expect(list.some((q) => q.id === qOther.id)).toBe(false);

      await prisma.vocabQuiz.deleteMany({
        where: { id: { in: [q1.id, q2.id, qOther.id] } },
      });
      await prisma.vocabCategory.deleteMany({
        where: { id: { in: [cat.id, otherCat.id] } },
      });
    });

    it('GET /quizzes/:vocabQuizId/words trả danh sách từ vựng theo quiz', async () => {
      const quiz = await prisma.vocabQuiz.create({
        data: { title: `${PREFIX} Quiz Words` },
      });
      const otherQuiz = await prisma.vocabQuiz.create({
        data: { title: `${PREFIX} Other Quiz Words` },
      });

      const w2 = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          word: `${PREFIX} word2`,
          displayOrder: 2,
        },
      });
      const w1 = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          word: `${PREFIX} word1`,
          displayOrder: 1,
        },
      });
      const wOther = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: otherQuiz.id,
          word: `${PREFIX} other word`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/quizzes/${quiz.id}/words`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(w1.id);
      expect(list[1].id).toBe(w2.id);
      expect(list.some((w) => w.id === wOther.id)).toBe(false);

      await prisma.vocabQuestion.deleteMany({
        where: { id: { in: [w1.id, w2.id, wOther.id] } },
      });
      await prisma.vocabQuiz.deleteMany({
        where: { id: { in: [quiz.id, otherQuiz.id] } },
      });
    });
  });

  describe('Chuỗi dò 4 bước: GET /lessons/:ref/words', () => {
    it('Nhánh 1: quiz có lesson_id = ref', async () => {
      const lesson = await prisma.lesson.create({
        data: { title: `${PREFIX} Lesson Branch 1` },
      });
      const quiz = await prisma.vocabQuiz.create({
        data: {
          title: `${PREFIX} Quiz Branch 1`,
          lessonId: lesson.id,
        },
      });
      const word = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          word: `${PREFIX} branch1word`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${lesson.id}/words`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(word.id);
      expect(list[0].word).toBe(`${PREFIX} branch1word`);

      await prisma.vocabQuestion.delete({ where: { id: word.id } });
      await prisma.vocabQuiz.delete({ where: { id: quiz.id } });
      await prisma.lesson.delete({ where: { id: lesson.id } });
    });

    it('Nhánh 2: không có (1), nhưng có quiz với id = ref', async () => {
      const quiz = await prisma.vocabQuiz.create({
        data: {
          title: `${PREFIX} Quiz Branch 2`,
          lessonId: null,
        },
      });
      const word = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          word: `${PREFIX} branch2word`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${quiz.id}/words`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(word.id);

      await prisma.vocabQuestion.delete({ where: { id: word.id } });
      await prisma.vocabQuiz.delete({ where: { id: quiz.id } });
    });

    it('Nhánh 3: chỉ khớp qua lessons.quiz_id = ref -> quiz có lesson_id = lesson.id', async () => {
      const parentQuiz = await prisma.quiz.create({
        data: { title: `${PREFIX} Parent Quiz Branch 3` },
      });
      const lesson = await prisma.lesson.create({
        data: {
          title: `${PREFIX} Lesson Branch 3`,
          quizId: parentQuiz.id,
        },
      });
      const quiz = await prisma.vocabQuiz.create({
        data: {
          title: `${PREFIX} Quiz Branch 3`,
          lessonId: lesson.id,
        },
      });
      const word = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          word: `${PREFIX} branch3word`,
          displayOrder: 1,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${parentQuiz.id}/words`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(word.id);

      await prisma.vocabQuestion.delete({ where: { id: word.id } });
      await prisma.vocabQuiz.delete({ where: { id: quiz.id } });
      await prisma.lesson.delete({ where: { id: lesson.id } });
      await prisma.quiz.delete({ where: { id: parentQuiz.id } });
    });

    it('Nhánh 4: không quiz + có question_ids -> lọc theo question_id', async () => {
      const q1 = await prisma.question.create({
        data: { questionText: `${PREFIX} Question 1` },
      });
      const q2 = await prisma.question.create({
        data: { questionText: `${PREFIX} Question 2` },
      });

      const w1 = await prisma.vocabQuestion.create({
        data: {
          word: `${PREFIX} qword1`,
          questionId: q1.id,
          displayOrder: 1,
        },
      });
      const w2 = await prisma.vocabQuestion.create({
        data: {
          word: `${PREFIX} qword2`,
          questionId: q2.id,
          displayOrder: 2,
        },
      });

      const nonExistentRef = 999999;
      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${nonExistentRef}/words?question_ids=${q1.id},${q2.id}`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(2);
      expect(list[0].id).toBe(w1.id);
      expect(list[1].id).toBe(w2.id);

      await prisma.vocabQuestion.deleteMany({
        where: { id: { in: [w1.id, w2.id] } },
      });
      await prisma.question.deleteMany({
        where: { id: { in: [q1.id, q2.id] } },
      });
    });

    it('Nhánh 4b: không quiz, không question_ids -> trả mảng rỗng []', async () => {
      const nonExistentRef = 999999;
      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${nonExistentRef}/words`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('Có quiz + có question_ids -> lọc đúng theo quiz và question_ids', async () => {
      const q1 = await prisma.question.create({
        data: { questionText: `${PREFIX} Question Q1` },
      });
      const q2 = await prisma.question.create({
        data: { questionText: `${PREFIX} Question Q2` },
      });

      const quiz = await prisma.vocabQuiz.create({
        data: { title: `${PREFIX} Quiz Filter Test` },
      });

      const w1 = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          questionId: q1.id,
          word: `${PREFIX} match word`,
          displayOrder: 1,
        },
      });
      const w2 = await prisma.vocabQuestion.create({
        data: {
          vocabQuizId: quiz.id,
          questionId: q2.id,
          word: `${PREFIX} non-match word`,
          displayOrder: 2,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${quiz.id}/words?question_ids=${q1.id}`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(w1.id);

      await prisma.vocabQuestion.deleteMany({
        where: { id: { in: [w1.id, w2.id] } },
      });
      await prisma.vocabQuiz.delete({ where: { id: quiz.id } });
      await prisma.question.deleteMany({
        where: { id: { in: [q1.id, q2.id] } },
      });
    });

    it('question_ids=abc -> 400 VALIDATION_FAILED', async () => {
      const res = await http().get(
        '/api/v1/assessment/vocab/lessons/1/words?question_ids=abc',
      );
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('question_ids > 500 id -> 400 VALIDATION_FAILED', async () => {
      const many = Array.from({ length: 501 }, (_, i) => i + 1).join(',');
      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/1/words?question_ids=${many}`,
      );
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });

  describe('GET /lessons/:lessonId/quiz-id', () => {
    it('bài học tồn tại -> trả { lesson: { quiz_id } }', async () => {
      const parentQuiz = await prisma.quiz.create({
        data: { title: `${PREFIX} Quiz For Lesson Quiz Id` },
      });
      const lesson = await prisma.lesson.create({
        data: {
          title: `${PREFIX} Lesson Quiz Id`,
          quizId: parentQuiz.id,
        },
      });

      const res = await http().get(
        `/api/v1/assessment/vocab/lessons/${lesson.id}/quiz-id`,
      );
      expect(res.status).toBe(200);
      const body = res.body as LessonQuizIdResponseDto;
      expect(body.lesson).toBeDefined();
      expect(body.lesson!.quiz_id).toBe(parentQuiz.id);

      await prisma.lesson.delete({ where: { id: lesson.id } });
      await prisma.quiz.delete({ where: { id: parentQuiz.id } });
    });

    it('bài học không tồn tại -> trả { lesson: null }', async () => {
      const res = await http().get(
        '/api/v1/assessment/vocab/lessons/999999/quiz-id',
      );
      expect(res.status).toBe(200);
      const body = res.body as LessonQuizIdResponseDto;
      expect(body.lesson).toBeNull();
    });
  });
});
