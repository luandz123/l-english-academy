import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { LearningService } from '../learning/learning.service';
import { AssessmentMapper } from './assessment.mapper';
import { DictationMapper } from './dictation.mapper';
import type { DictationRepository } from './dictation.repository';
import { DictationService } from './dictation.service';
import { VocabMapper } from './vocab.mapper';

const QUIZ = {
  id: 1,
  moduleId: 10,
  title: 'Dictation Quiz',
  totalQuestions: 99, // Should be ignored in favor of questions.length (2)
  timeLimitSeconds: 0,
  displayOrder: 1,
  audioUrl: 'https://example.com/audio.mp3',
  isFree: false,
};

const QUESTIONS = [
  {
    id: 101,
    quizId: 1,
    questionText: 'Question 1',
    questionType: 'dictation',
    imageUrl: null,
    audioUrl: 'https://example.com/q1.mp3',
    displayOrder: 1,
    translation: 'Bản dịch 1',
    dictationKeywords: 'hello,world',
    explanation: 'Giải thích 1',
    transcript: 'Hello world',
    knowledgeTag: null,
    passageText: null,
    groupId: null,
    answers: [
      {
        id: 201,
        questionId: 101,
        answerText: 'Hello world',
        displayOrder: 1,
        isCorrect: true,
        explanation: null,
      },
    ],
  },
  {
    id: 102,
    quizId: 1,
    questionText: 'Question 2',
    questionType: 'dictation',
    imageUrl: null,
    audioUrl: null,
    displayOrder: 2,
    translation: 'Bản dịch 2',
    dictationKeywords: 'goodbye',
    explanation: 'Giải thích 2',
    transcript: 'Goodbye',
    knowledgeTag: null,
    passageText: null,
    groupId: null,
    answers: [
      {
        id: 202,
        questionId: 102,
        answerText: 'Goodbye',
        displayOrder: 1,
        isCorrect: true,
        explanation: null,
      },
    ],
  },
];

const USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@example.com',
  role: 'student' as const,
};

const RESULT = {
  id: 10,
  userId: USER.id,
  quizId: 1,
  score: 1,
  correctAnswers: 1,
  totalQuestions: 2,
  timeSpentSeconds: 0,
  completedAt: new Date(),
};

function setup(opts: { canTake?: boolean; quizExists?: boolean } = {}) {
  const quiz = (opts.quizExists ?? true) ? QUIZ : null;

  const mockRepo = {
    findQuizById: jest.fn().mockResolvedValue(quiz),
    findQuestionsWithAnswers: jest.fn().mockResolvedValue(QUESTIONS),
    findLessonByQuizId: jest.fn().mockResolvedValue({ id: 42 }),
    findVocabByQuestionIds: jest.fn().mockResolvedValue([
      {
        id: 1,
        vocabQuizId: 1,
        word: 'hello',
        phonetic: '/həˈloʊ/',
        definitionEn: 'greeting',
        definitionVi: 'xin chào',
        exampleSentence: null,
        imageUrl: null,
        audioMaleUrl: null,
        audioFemaleUrl: null,
        wrongAnswer1: null,
        wrongAnswer2: null,
        wrongAnswer3: null,
        displayOrder: 1,
        questionId: 101,
      },
    ]),
    findLatestQuizResult: jest.fn().mockResolvedValue(RESULT),
    createQuizResult: jest.fn().mockResolvedValue(RESULT),
    findAllResultIdsForQuiz: jest.fn().mockResolvedValue([10]),
    findCompletedAnswers: jest
      .fn()
      .mockResolvedValue([
        { id: 1, questionId: 101, isCorrect: true, resultId: 10 },
      ]),
    findOrCreateLatestResult: jest.fn().mockResolvedValue(RESULT),
    upsertUserAnswer: jest.fn().mockResolvedValue({
      id: 1,
      questionId: 101,
      isCorrect: true,
      resultId: 10,
    }),
    countDoneQuestions: jest.fn().mockResolvedValue(1),
    updateQuizResultScores: jest.fn().mockResolvedValue(RESULT),
    unmarkUserAnswer: jest.fn().mockResolvedValue(undefined),
    resetAllForQuiz: jest.fn().mockResolvedValue(undefined),
    inTransaction: jest
      .fn()
      .mockImplementation((fn: (repo: any) => Promise<any>) => fn(mockRepo)),
  };

  const learning = {
    canTakeQuiz: jest.fn().mockResolvedValue(opts.canTake ?? true),
  };

  const assessmentMapper = new AssessmentMapper();
  const dictationMapper = new DictationMapper(assessmentMapper);
  const vocabMapper = new VocabMapper();

  const service = new DictationService(
    mockRepo as unknown as DictationRepository,
    dictationMapper,
    assessmentMapper,
    vocabMapper,
    learning as unknown as LearningService,
  );

  return { service, mockRepo, learning };
}

describe('DictationService', () => {
  describe('getDictationQuiz', () => {
    it('throws 404 QUIZ_NOT_FOUND when quiz not found', async () => {
      const { service } = setup({ quizExists: false });
      const err = await service
        .getDictationQuiz(999, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: 'QUIZ_NOT_FOUND',
      });
    });

    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .getDictationQuiz(1, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('returns quiz detail with transcript and answers when allowed', async () => {
      const { service } = setup();
      const res = await service.getDictationQuiz(1, USER);
      expect(res.quiz.id).toBe(1);
      expect(res.questions.length).toBe(2);
      expect(res.questions[0].transcript).toBe('Hello world');
      expect(res.questions[0].dictation_keywords).toBe('hello,world');
      expect(res.questions[0].answers[0].is_correct).toBe(true);
    });
  });

  describe('getLessonByQuizId', () => {
    it('returns lesson id', async () => {
      const { service } = setup();
      const res = await service.getLessonByQuizId(1);
      expect(res).toEqual({ id: 42 });
    });
  });

  describe('getVocabForQuiz', () => {
    it('returns linked vocab words', async () => {
      const { service } = setup();
      const res = await service.getVocabForQuiz(1);
      expect(res.length).toBe(1);
      expect(res[0].word).toBe('hello');
      expect(res[0].question_id).toBe(101);
    });
  });

  describe('getOrCreateResult', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .getOrCreateResult(1, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('returns latest result with real questions count', async () => {
      const { service, mockRepo } = setup();
      const res = await service.getOrCreateResult(1, USER);
      expect(res.id).toBe(10);
      expect(mockRepo.findOrCreateLatestResult).toHaveBeenCalledWith(
        USER.id,
        1,
        2, // questions.length
      );
    });
  });

  describe('getUserAnswers', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .getUserAnswers(1, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('returns user answers', async () => {
      const { service } = setup();
      const res = await service.getUserAnswers(1, USER);
      expect(res.length).toBe(1);
      expect(res[0].question_id).toBe(101);
      expect(res[0].is_correct).toBe(true);
    });
  });

  describe('markQuestionDone', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .markQuestionDone(1, 101, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('throws 400 QUESTION_IDS_INVALID when question does not belong to quiz', async () => {
      const { service } = setup();
      const err = await service
        .markQuestionDone(1, 999, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'QUESTION_IDS_INVALID',
      });
    });

    it('upserts answer and updates score in transaction', async () => {
      const { service, mockRepo } = setup();
      mockRepo.countDoneQuestions.mockResolvedValue(2);

      const res = await service.markQuestionDone(1, 102, USER);
      expect(res.score).toBe(2);
      expect(res.correct_answers).toBe(2);
      expect(res.total_questions).toBe(2);
      expect(mockRepo.upsertUserAnswer).toHaveBeenCalledWith(10, 102, true);
      expect(mockRepo.updateQuizResultScores).toHaveBeenCalledWith(10, 2, 2, 2);
    });
  });

  describe('unmarkQuestionDone', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .unmarkQuestionDone(1, 101, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('throws 400 QUESTION_IDS_INVALID when question does not belong to quiz', async () => {
      const { service } = setup();
      const err = await service
        .unmarkQuestionDone(1, 999, USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'QUESTION_IDS_INVALID',
      });
    });

    it('unmarks question and updates score', async () => {
      const { service, mockRepo } = setup();
      mockRepo.countDoneQuestions.mockResolvedValue(0);

      const res = await service.unmarkQuestionDone(1, 101, USER);
      expect(res.score).toBe(0);
      expect(res.correct_answers).toBe(0);
      expect(mockRepo.unmarkUserAnswer).toHaveBeenCalledWith([10], 101);
    });
  });

  describe('syncSession', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service
        .syncSession(1, [101], USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('throws 400 QUESTION_IDS_INVALID when any question id not in quiz', async () => {
      const { service, mockRepo } = setup();
      const err = await service
        .syncSession(1, [101, 999], USER)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: 'QUESTION_IDS_INVALID',
      });
      expect(mockRepo.upsertUserAnswer).not.toHaveBeenCalled();
    });

    it('upserts all question ids in session and updates score', async () => {
      const { service, mockRepo } = setup();
      mockRepo.countDoneQuestions.mockResolvedValue(2);

      const res = await service.syncSession(1, [101, 102], USER);
      expect(res.score).toBe(2);
      expect(mockRepo.upsertUserAnswer).toHaveBeenCalledTimes(2);
      expect(mockRepo.updateQuizResultScores).toHaveBeenCalledWith(10, 2, 2, 2);
    });
  });

  describe('resetAll', () => {
    it('throws 403 QUIZ_LOCKED when quiz is locked', async () => {
      const { service } = setup({ canTake: false });
      const err = await service.resetAll(1, USER).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'QUIZ_LOCKED',
      });
    });

    it('resets all answers and scores to 0', async () => {
      const { service, mockRepo } = setup();

      const res = await service.resetAll(1, USER);
      expect(res.score).toBe(0);
      expect(res.correct_answers).toBe(0);
      expect(mockRepo.resetAllForQuiz).toHaveBeenCalledWith([10]);
    });
  });
});
