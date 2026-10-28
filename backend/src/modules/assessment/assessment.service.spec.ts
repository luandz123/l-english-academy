import { HttpException } from '@nestjs/common';
import type { AuthService } from '../auth/auth.service';
import type { LearningService } from '../learning/learning.service';
import { AssessmentMapper } from './assessment.mapper';
import type { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';

const QUIZ = {
  id: 5,
  moduleId: 1,
  title: 'Quiz',
  totalQuestions: 2,
  timeLimitSeconds: 0,
  displayOrder: 0,
  audioUrl: null,
  isFree: false,
};

const QUESTION_BASE = {
  quizId: 5,
  questionText: 'Q',
  questionType: 'multiple_choice',
  imageUrl: null,
  audioUrl: null,
  translation: 'dịch',
  dictationKeywords: 'kw',
  explanation: 'giải',
  transcript: 'tt',
  knowledgeTag: null,
  passageText: null,
  groupId: null,
};

const answer = (id: number, questionId: number, isCorrect: boolean) => ({
  id,
  questionId,
  answerText: `A${id}`,
  isCorrect,
  explanation: `E${id}`,
  displayOrder: id,
});

const QUESTIONS = [
  {
    ...QUESTION_BASE,
    id: 1,
    displayOrder: 0,
    answers: [answer(11, 1, true), answer(12, 1, false)],
  },
  {
    ...QUESTION_BASE,
    id: 2,
    displayOrder: 1,
    answers: [answer(21, 2, false), answer(22, 2, true)],
  },
];

const RESULT = {
  id: 100,
  userId: 'u1',
  quizId: 5,
  score: '5.00',
  correctAnswers: 1,
  totalQuestions: 2,
  timeSpentSeconds: 30,
  completedAt: new Date('2026-10-28T10:00:00Z'),
};

function setup(
  opts: { admin?: boolean; hasResult?: boolean; canTake?: boolean } = {},
) {
  const repo = {
    findQuiz: jest.fn().mockResolvedValue(QUIZ),
    findQuestionsWithAnswers: jest.fn().mockResolvedValue(QUESTIONS),
    createResult: jest
      .fn()
      .mockImplementation((input: { score: number; correctAnswers: number }) =>
        Promise.resolve({
          result: {
            ...RESULT,
            score: String(input.score),
            correctAnswers: input.correctAnswers,
          },
          attempts: 1,
        }),
      ),
    findResult: jest.fn().mockResolvedValue(RESULT),
    findLatestResult: jest.fn().mockResolvedValue(null),
    hasResult: jest.fn().mockResolvedValue(opts.hasResult ?? false),
    findUserAnswers: jest.fn().mockResolvedValue([]),
  };
  const auth = { hasRole: jest.fn().mockResolvedValue(opts.admin ?? false) };
  const learning = {
    canTakeQuiz: jest.fn().mockResolvedValue(opts.canTake ?? true),
  };
  const service = new AssessmentService(
    repo as unknown as AssessmentRepository,
    new AssessmentMapper(),
    auth as unknown as AuthService,
    learning as unknown as LearningService,
  );
  return { service, repo, auth, learning };
}

async function httpError(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    const http = err as HttpException;
    return {
      status: http.getStatus(),
      body: http.getResponse() as { code: string },
    };
  }
  throw new Error('Lẽ ra phải ném lỗi');
}

const ME = { id: 'u1', email: 'u1@x.com' };
const OTHER = { id: 'u2', email: 'u2@x.com' };

describe('AssessmentService', () => {
  describe('getQuestions', () => {
    it('không trả is_correct, explanation, transcript, translation, dictation_keywords', async () => {
      const { service } = setup();
      const [q] = await service.getQuestions(5, ME);
      const json = JSON.stringify(q);
      for (const key of [
        'is_correct',
        'explanation',
        'transcript',
        'translation',
        'dictation_keywords',
      ]) {
        expect(json).not.toContain(`"${key}"`);
      }
      expect(q.answers.map((a) => a.id)).toEqual([11, 12]);
    });
  });

  describe('submit', () => {
    it('server chấm và ghi kết quả, client không gửi điểm', async () => {
      const { service, repo } = setup();
      const res = await service.submit(ME, 5, {
        answers: [
          { question_id: 1, selected_answer_id: 11 },
          { question_id: 2, selected_answer_id: 21 },
        ],
        time_spent_seconds: 30,
      });
      expect(repo.createResult).toHaveBeenCalledWith({
        userId: 'u1',
        quizId: 5,
        score: 5,
        correctAnswers: 1,
        totalQuestions: 2,
        timeSpentSeconds: 30,
        answers: [
          { questionId: 1, selectedAnswerId: 11, isCorrect: true },
          { questionId: 2, selectedAnswerId: 21, isCorrect: false },
        ],
      });
      expect(res.result.score).toBe(5);
      expect(res.is_first_attempt).toBe(true);
    });

    it('quiz không tồn tại → 404 QUIZ_NOT_FOUND', async () => {
      const { service, repo } = setup();
      repo.findQuiz.mockResolvedValue(null);
      const err = await httpError(
        service.submit(ME, 9, { answers: [], time_spent_seconds: 1 }),
      );
      expect(err.status).toBe(404);
      expect(err.body.code).toBe('QUIZ_NOT_FOUND');
      expect(repo.createResult).not.toHaveBeenCalled();
    });

    it('đáp án không thuộc câu → 400 INVALID_ANSWER, không ghi gì', async () => {
      const { service, repo } = setup();
      const err = await httpError(
        service.submit(ME, 5, {
          answers: [{ question_id: 1, selected_answer_id: 22 }],
          time_spent_seconds: 1,
        }),
      );
      expect(err.status).toBe(400);
      expect(err.body.code).toBe('INVALID_ANSWER');
      expect(repo.createResult).not.toHaveBeenCalled();
    });

    it('lần nộp thứ hai → is_first_attempt false', async () => {
      const { service, repo } = setup();
      repo.createResult.mockResolvedValue({ result: RESULT, attempts: 2 });
      const res = await service.submit(ME, 5, {
        answers: [],
        time_spent_seconds: 1,
      });
      expect(res.is_first_attempt).toBe(false);
    });
  });

  describe('quyền làm quiz (#22a)', () => {
    it('không có quyền → getQuestions 403 QUIZ_LOCKED', async () => {
      const { service } = setup({ canTake: false });
      const err = await httpError(service.getQuestions(5, ME));
      expect(err.status).toBe(403);
      expect(err.body.code).toBe('QUIZ_LOCKED');
    });

    it('không có quyền → submit 403 QUIZ_LOCKED, không ghi', async () => {
      const { service, repo } = setup({ canTake: false });
      const err = await httpError(
        service.submit(ME, 5, { answers: [], time_spent_seconds: 1 }),
      );
      expect(err.body.code).toBe('QUIZ_LOCKED');
      expect(repo.createResult).not.toHaveBeenCalled();
    });

    it('quiz không có câu nào → [] mà không cần kiểm quyền', async () => {
      const { service, repo, learning } = setup({ canTake: false });
      repo.findQuestionsWithAnswers.mockResolvedValue([]);
      await expect(service.getQuestions(9, undefined)).resolves.toEqual([]);
      expect(learning.canTakeQuiz).not.toHaveBeenCalled();
    });
  });

  describe('getResult / getResultAnswers', () => {
    it('chủ kết quả xem được', async () => {
      const { service } = setup();
      await expect(service.getResult(ME, 100)).resolves.toMatchObject({
        id: 100,
        score: 5,
      });
    });

    it('người khác → 404 RESULT_NOT_FOUND, answers → []', async () => {
      const { service, repo } = setup();
      const err = await httpError(service.getResult(OTHER, 100));
      expect(err.body.code).toBe('RESULT_NOT_FOUND');
      await expect(service.getResultAnswers(OTHER, 100)).resolves.toEqual([]);
      expect(repo.findUserAnswers).not.toHaveBeenCalled();
    });

    it('admin xem được kết quả người khác', async () => {
      const { service } = setup({ admin: true });
      await expect(service.getResult(OTHER, 100)).resolves.toMatchObject({
        id: 100,
      });
    });
  });

  describe('getReview', () => {
    it('chưa nộp lần nào → 403 QUIZ_NOT_ATTEMPTED', async () => {
      const { service } = setup();
      const err = await httpError(service.getReview(ME, 5));
      expect(err.status).toBe(403);
      expect(err.body.code).toBe('QUIZ_NOT_ATTEMPTED');
    });

    it('đã nộp → có is_correct và lời giải', async () => {
      const { service } = setup({ hasResult: true });
      const [q] = await service.getReview(ME, 5);
      expect(q.explanation).toBe('giải');
      expect(q.answers[0]).toMatchObject({
        id: 11,
        is_correct: true,
        explanation: 'E11',
      });
    });

    it('admin chưa nộp vẫn xem được', async () => {
      const { service } = setup({ admin: true });
      await expect(service.getReview(ME, 5)).resolves.toHaveLength(2);
    });
  });
});
