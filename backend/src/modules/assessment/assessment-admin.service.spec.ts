/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Lesson, Module, Quiz } from '../../generated/prisma/client';
import { AssessmentMapper } from './assessment.mapper';
import {
  AssessmentAdminRepository,
  type QuestionWithAnswers,
} from './assessment-admin.repository';
import { AssessmentAdminService } from './assessment-admin.service';

const makeQuiz = (overrides: Partial<Quiz> = {}): Quiz => ({
  id: 1,
  moduleId: 1,
  title: 'Quiz 1',
  totalQuestions: 0,
  timeLimitSeconds: 0,
  displayOrder: 0,
  audioUrl: null,
  isFree: false,
  ...overrides,
});

const makeQuestion = (
  overrides: Partial<QuestionWithAnswers> = {},
): QuestionWithAnswers => ({
  id: 10,
  quizId: 1,
  questionText: 'Question text',
  questionType: 'multiple_choice',
  imageUrl: null,
  audioUrl: null,
  displayOrder: 0,
  translation: null,
  dictationKeywords: null,
  explanation: null,
  transcript: null,
  knowledgeTag: null,
  passageText: null,
  groupId: null,
  answers: [],
  ...overrides,
});

const makeModule = (overrides: Partial<Module> = {}): Module => ({
  id: 1,
  courseId: 1,
  title: 'Chương 1',
  description: null,
  displayOrder: 0,
  isFree: false,
  isPublished: true,
  ...overrides,
});

const makeLesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 1,
  moduleId: 1,
  title: 'Bài 1',
  displayOrder: 0,
  isFree: false,
  quizId: null,
  isPublished: true,
  videoUrl: null,
  durationSeconds: null,
  isLive: false,
  liveTime: null,
  lessonType: 'video',
  pdfUrl: null,
  ...overrides,
});

describe('AssessmentAdminService', () => {
  let service: AssessmentAdminService;
  let repo: jest.Mocked<AssessmentAdminRepository>;
  let mapper: AssessmentMapper;

  beforeEach(() => {
    const mockRepo: Partial<jest.Mocked<AssessmentAdminRepository>> = {
      inTransaction: jest.fn(),
      findQuizById: jest.fn(),
      findQuestionsWithAnswers: jest.fn(),
      findQuestionById: jest.fn(),
      findQuestionIdsInQuiz: jest.fn(),
      getMaxQuestionDisplayOrder: jest.fn(),
      createQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      deleteQuestion: jest.fn(),
      deleteQuestions: jest.fn(),
      updateQuestionDisplayOrder: jest.fn(),
      updateQuestionImageUrl: jest.fn(),
      deleteAnswersByQuestionId: jest.fn(),
      createAnswers: jest.fn(),
      countQuestionsInQuiz: jest.fn(),
      updateQuizTotalQuestions: jest.fn(),
      updateQuizAudioUrl: jest.fn(),
      findModuleById: jest.fn(),
      countQuizzesInModule: jest.fn(),
      createQuiz: jest.fn(),
      updateQuiz: jest.fn(),
      deleteQuiz: jest.fn(),
      findLessonById: jest.fn(),
      updateLessonQuizId: jest.fn(),
    };

    mockRepo.inTransaction!.mockImplementation((fn) =>
      fn(mockRepo as unknown as AssessmentAdminRepository),
    );

    repo = mockRepo as unknown as jest.Mocked<AssessmentAdminRepository>;
    mapper = new AssessmentMapper();
    service = new AssessmentAdminService(repo, mapper);
  });

  describe('listQuizQuestions', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(service.listQuizQuestions(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả danh sách câu hỏi khi quiz tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1, title: 'Quiz 1' }));
      repo.findQuestionsWithAnswers.mockResolvedValue([
        makeQuestion({
          id: 10,
          quizId: 1,
          questionText: 'Q1',
        }),
      ]);

      const res = await service.listQuizQuestions(1);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(10);
    });
  });

  describe('createQuizQuestion', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(
        service.createQuizQuestion(99, {
          question_text: 'Test',
          answers: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tạo câu hỏi mới, bỏ qua đáp án rỗng, tính display_order = max + 1, đếm lại total_questions', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.getMaxQuestionDisplayOrder.mockResolvedValue(3);
      repo.createQuestion.mockResolvedValue(
        makeQuestion({ id: 15, quizId: 1 }),
      );
      repo.countQuestionsInQuiz.mockResolvedValue(4);
      repo.findQuestionById.mockResolvedValue(
        makeQuestion({
          id: 15,
          quizId: 1,
          questionText: 'New Q',
          displayOrder: 3,
          answers: [
            {
              id: 101,
              questionId: 15,
              answerText: 'A',
              isCorrect: true,
              explanation: null,
              displayOrder: 0,
            },
          ],
        }),
      );

      const res = await service.createQuizQuestion(1, {
        question_text: 'New Q',
        answers: [
          { answer_text: 'A', is_correct: true },
          { answer_text: '   ', is_correct: false }, // rỗng -> bỏ qua
        ],
      });

      expect(repo.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId: 1,
          questionText: 'New Q',
          displayOrder: 3,
        }),
      );
      expect(repo.createAnswers).toHaveBeenCalledWith([
        {
          questionId: 15,
          answerText: 'A',
          isCorrect: true,
          explanation: null,
          displayOrder: 0,
        },
      ]);
      expect(repo.updateQuizTotalQuestions).toHaveBeenCalledWith(1, 4);
      expect(res.id).toBe(15);
    });

    it('rollback transaction khi chèn đáp án bị lỗi', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.getMaxQuestionDisplayOrder.mockResolvedValue(0);
      repo.createQuestion.mockResolvedValue(
        makeQuestion({ id: 20, quizId: 1 }),
      );
      repo.createAnswers.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.createQuizQuestion(1, {
          question_text: 'Err Q',
          answers: [{ answer_text: 'A', is_correct: true }],
        }),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('updateQuizQuestion', () => {
    it('ném 404 QUESTION_NOT_FOUND khi câu hỏi không tồn tại', async () => {
      repo.findQuestionById.mockResolvedValue(null);
      await expect(
        service.updateQuizQuestion(999, {
          question_text: 'Updated',
          answers: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('cập nhật câu hỏi, xóa đáp án cũ và chèn đáp án mới', async () => {
      repo.findQuestionById
        .mockResolvedValueOnce(makeQuestion({ id: 20, quizId: 5 }))
        .mockResolvedValueOnce(
          makeQuestion({
            id: 20,
            quizId: 5,
            questionText: 'Updated Q',
          }),
        );
      repo.countQuestionsInQuiz.mockResolvedValue(1);

      const res = await service.updateQuizQuestion(20, {
        question_text: 'Updated Q',
        answers: [{ answer_text: 'Ans 1', is_correct: true }],
      });

      expect(repo.updateQuestion).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ questionText: 'Updated Q' }),
      );
      expect(repo.deleteAnswersByQuestionId).toHaveBeenCalledWith(20);
      expect(repo.createAnswers).toHaveBeenCalled();
      expect(res.question_text).toBe('Updated Q');
    });
  });

  describe('deleteQuizQuestion', () => {
    it('trả về mà không ném lỗi khi câu hỏi không tồn tại (204)', async () => {
      repo.findQuestionById.mockResolvedValue(null);
      await expect(service.deleteQuizQuestion(999)).resolves.toBeUndefined();
      expect(repo.deleteQuestion).not.toHaveBeenCalled();
    });

    it('xóa câu hỏi và đếm lại total_questions', async () => {
      repo.findQuestionById.mockResolvedValue(
        makeQuestion({ id: 20, quizId: 2 }),
      );
      repo.countQuestionsInQuiz.mockResolvedValue(3);

      await service.deleteQuizQuestion(20);

      expect(repo.deleteQuestion).toHaveBeenCalledWith(20);
      expect(repo.updateQuizTotalQuestions).toHaveBeenCalledWith(2, 3);
    });
  });

  describe('bulkDeleteQuizQuestions', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(
        service.bulkDeleteQuizQuestions(99, { question_ids: [1, 2] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi mảng ID có phần tử trùng lặp', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      await expect(
        service.bulkDeleteQuizQuestions(1, { question_ids: [1, 2, 1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi có câu hỏi không thuộc quiz', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.findQuestionIdsInQuiz.mockResolvedValue([1]); // chỉ tìm thấy 1 câu
      await expect(
        service.bulkDeleteQuizQuestions(1, { question_ids: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('xóa các câu hỏi và cập nhật total_questions khi hợp lệ', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.findQuestionIdsInQuiz.mockResolvedValue([1, 2]);
      repo.countQuestionsInQuiz.mockResolvedValue(0);

      await service.bulkDeleteQuizQuestions(1, { question_ids: [1, 2] });

      expect(repo.deleteQuestions).toHaveBeenCalledWith([1, 2]);
      expect(repo.updateQuizTotalQuestions).toHaveBeenCalledWith(1, 0);
    });
  });

  describe('reorderQuizQuestions', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(
        service.reorderQuizQuestions(99, { question_ids: [1, 2] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi có ID trùng', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      await expect(
        service.reorderQuizQuestions(1, { question_ids: [1, 1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi câu hỏi không thuộc quiz', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.findQuestionIdsInQuiz.mockResolvedValue([1]);
      await expect(
        service.reorderQuizQuestions(1, { question_ids: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cập nhật display_order theo thứ tự index', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.findQuestionIdsInQuiz.mockResolvedValue([2, 1]);

      await service.reorderQuizQuestions(1, { question_ids: [2, 1] });

      expect(repo.updateQuestionDisplayOrder).toHaveBeenCalledWith(2, 0);
      expect(repo.updateQuestionDisplayOrder).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('setQuizQuestionImages', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(
        service.setQuizQuestionImages(99, { items: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi có id trùng', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      await expect(
        service.setQuizQuestionImages(1, {
          items: [
            { question_id: 1, image_url: 'a.jpg' },
            { question_id: 1, image_url: 'b.jpg' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cập nhật image_url cho các câu hỏi', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.findQuestionIdsInQuiz.mockResolvedValue([1, 2]);

      await service.setQuizQuestionImages(1, {
        items: [
          { question_id: 1, image_url: 'img1.png' },
          { question_id: 2, image_url: null },
        ],
      });

      expect(repo.updateQuestionImageUrl).toHaveBeenCalledWith(1, 'img1.png');
      expect(repo.updateQuestionImageUrl).toHaveBeenCalledWith(2, null);
    });
  });

  describe('patchQuiz', () => {
    it('ném 404 QUIZ_NOT_FOUND khi quiz không tồn tại', async () => {
      repo.findQuizById.mockResolvedValue(null);
      await expect(
        service.patchQuiz(99, { audio_url: 'a.mp3' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('cập nhật audio_url thành công', async () => {
      repo.findQuizById.mockResolvedValue(makeQuiz({ id: 1 }));
      repo.updateQuizAudioUrl.mockResolvedValue(
        makeQuiz({
          id: 1,
          audioUrl: 'a.mp3',
        }),
      );

      const res = await service.patchQuiz(1, { audio_url: 'a.mp3' });
      expect(res.audio_url).toBe('a.mp3');
    });
  });

  describe('createModuleQuiz', () => {
    it('ném 404 MODULE_NOT_FOUND khi chương không tồn tại', async () => {
      repo.findModuleById.mockResolvedValue(null);
      await expect(
        service.createModuleQuiz(99, {
          title: 'Quiz',
          total_questions: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tạo quiz độc lập với display_order = số quiz hiện có của module', async () => {
      repo.findModuleById.mockResolvedValue(
        makeModule({ id: 3, title: 'Mod 3' }),
      );
      repo.countQuizzesInModule.mockResolvedValue(2);
      repo.createQuiz.mockResolvedValue(
        makeQuiz({
          id: 10,
          moduleId: 3,
          title: 'Quiz Mod',
          totalQuestions: 5,
          timeLimitSeconds: 300,
          displayOrder: 2,
        }),
      );

      const res = await service.createModuleQuiz(3, {
        title: 'Quiz Mod',
        total_questions: 5,
        time_limit_seconds: 300,
      });

      expect(repo.createQuiz).toHaveBeenCalledWith({
        moduleId: 3,
        title: 'Quiz Mod',
        totalQuestions: 5,
        timeLimitSeconds: 300,
        displayOrder: 2,
      });
      expect(res.display_order).toBe(2);
    });
  });

  describe('createLessonQuiz', () => {
    it('ném 404 LESSON_NOT_FOUND khi bài học không tồn tại', async () => {
      repo.findLessonById.mockResolvedValue(null);
      await expect(service.createLessonQuiz(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ném 409 LESSON_ALREADY_HAS_QUIZ khi bài học đã có quiz', async () => {
      repo.findLessonById.mockResolvedValue(
        makeLesson({
          id: 1,
          quizId: 5,
          moduleId: 2,
        }),
      );
      await expect(service.createLessonQuiz(1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('ném 400 LESSON_HAS_NO_MODULE khi bài học chưa thuộc chương nào', async () => {
      repo.findLessonById.mockResolvedValue(
        makeLesson({
          id: 1,
          quizId: null,
          moduleId: null,
        }),
      );
      await expect(service.createLessonQuiz(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tạo quiz và gắn quiz_id vào lesson', async () => {
      repo.findLessonById.mockResolvedValue(
        makeLesson({
          id: 1,
          title: 'Bài 1',
          quizId: null,
          moduleId: 2,
        }),
      );
      repo.countQuizzesInModule.mockResolvedValue(1);
      repo.createQuiz.mockResolvedValue(
        makeQuiz({
          id: 50,
          title: 'Quiz - Bài 1',
          totalQuestions: 0,
          moduleId: 2,
          displayOrder: 1,
        }),
      );

      const res = await service.createLessonQuiz(1);

      expect(repo.createQuiz).toHaveBeenCalledWith({
        title: 'Quiz - Bài 1',
        totalQuestions: 0,
        moduleId: 2,
        displayOrder: 1,
      });
      expect(repo.updateLessonQuizId).toHaveBeenCalledWith(1, 50);
      expect(res.id).toBe(50);
    });
  });
});
