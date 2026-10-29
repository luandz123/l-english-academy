/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type {
  FullTest,
  FullTestSection,
  Lesson,
  Module,
  Quiz,
} from '../../generated/prisma/client';
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

const makeFullTest = (
  overrides: Partial<
    FullTest & { course?: { id: number; title: string } | null }
  > = {},
): FullTest & { course: { id: number; title: string } | null } => ({
  id: 1,
  courseId: 1,
  category: '2026',
  title: 'Đề thi 1',
  totalQuestions: 200,
  releaseDate: new Date('2026-03-29T00:00:00.000Z'),
  displayOrder: 0,
  createdAt: new Date('2026-03-29T00:00:00.000Z'),
  audioUrl: null,
  description: 'Mô tả',
  totalAttempts: 10,
  course: { id: 1, title: 'Khóa TOEIC' },
  ...overrides,
});

const makeSection = (
  overrides: Partial<FullTestSection> = {},
): FullTestSection => ({
  id: 1,
  testId: 1,
  partNumber: 1,
  quizId: 1,
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
      findFullTestById: jest.fn(),
      findFullTestWithCourse: jest.fn(),
      updateFullTest: jest.fn(),
      findSectionByTestAndPart: jest.fn(),
      createSection: jest.fn(),
      countQuestionsInTest: jest.fn(),
      updateFullTestTotalQuestions: jest.fn(),
      findTestIdByQuestionId: jest.fn(),
      findAnswersByQuestionId: jest.fn(),
      deleteAnswersByIds: jest.fn(),
      updateAnswer: jest.fn(),
      createAnswer: jest.fn(),
      findQuizIdsByTestId: jest.fn(),
      findQuestionsByQuizIds: jest.fn(),
      updateQuestionsGroup: jest.fn(),
      findPartNumberByQuizId: jest.fn(),
      findFullTestQuestions: jest.fn(),
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

  describe('getFullTestDetail', () => {
    it('ném 404 FULLTEST_NOT_FOUND khi đề thi không tồn tại', async () => {
      repo.findFullTestWithCourse.mockResolvedValue(null);
      await expect(service.getFullTestDetail(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả thông tin đề thi kèm khóa học', async () => {
      repo.findFullTestWithCourse.mockResolvedValue(
        makeFullTest({ id: 1, title: 'TOEIC Practice 1' }),
      );

      const res = await service.getFullTestDetail(1);
      expect(res.id).toBe(1);
      expect(res.title).toBe('TOEIC Practice 1');
      expect(res.courses?.id).toBe(1);
    });
  });

  describe('getFullTestQuestions', () => {
    it('ném 404 FULLTEST_NOT_FOUND khi đề thi không tồn tại', async () => {
      repo.findFullTestById.mockResolvedValue(null);
      await expect(service.getFullTestQuestions(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả danh sách câu hỏi đã gắn part_number', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.findFullTestQuestions.mockResolvedValue([
        {
          question: makeQuestion({ id: 10, questionText: 'Q1' }),
          partNumber: 1,
        },
      ]);

      const res = await service.getFullTestQuestions(1);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(10);
      expect(res[0].part_number).toBe(1);
    });
  });

  describe('updateFullTest', () => {
    it('ném 404 FULLTEST_NOT_FOUND khi đề thi không tồn tại', async () => {
      repo.findFullTestById.mockResolvedValue(null);
      await expect(
        service.updateFullTest(99, { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('cập nhật thông tin đề thi thành công', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.updateFullTest.mockResolvedValue(
        makeFullTest({ id: 1, title: 'Updated Title' }),
      );

      const res = await service.updateFullTest(1, {
        title: 'Updated Title',
        category: '2026',
        release_date: '2026-03-29T00:00:00.000Z',
      });
      expect(res.title).toBe('Updated Title');
      expect(repo.updateFullTest).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });
  });

  describe('createFullTestQuestion', () => {
    it('ném 404 FULLTEST_NOT_FOUND khi đề thi không tồn tại', async () => {
      repo.findFullTestById.mockResolvedValue(null);
      await expect(
        service.createFullTestQuestion(99, {
          part_number: 1,
          display_order: 1,
          answers: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tạo quiz và section mới khi Part chưa có section', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.findSectionByTestAndPart.mockResolvedValue(null);
      repo.createQuiz.mockResolvedValue(makeQuiz({ id: 80 }));
      repo.createSection.mockResolvedValue(makeSection({ id: 5, quizId: 80 }));
      repo.createQuestion.mockResolvedValue(makeQuestion({ id: 101 }));
      repo.countQuestionsInTest.mockResolvedValue(1);
      repo.findQuestionById.mockResolvedValue(
        makeQuestion({ id: 101, displayOrder: 1 }),
      );

      const res = await service.createFullTestQuestion(1, {
        part_number: 2,
        display_order: 1,
        question_text: 'New Part 2 Question',
        answers: [{ answer_text: 'A', is_correct: true }],
      });

      expect(repo.createQuiz).toHaveBeenCalledWith({
        title: 'Part 2 - Đề thi 1',
        totalQuestions: 0,
        displayOrder: 2,
        moduleId: null,
      });
      expect(repo.createSection).toHaveBeenCalledWith({
        testId: 1,
        partNumber: 2,
        quizId: 80,
      });
      expect(repo.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId: 80,
          displayOrder: 1,
        }),
      );
      expect(repo.updateFullTestTotalQuestions).toHaveBeenCalledWith(1, 1);
      expect(res.id).toBe(101);
      expect(res.part_number).toBe(2);
    });

    it('sử dụng section có sẵn khi Part đã tồn tại', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.findSectionByTestAndPart.mockResolvedValue(
        makeSection({ id: 5, quizId: 80, partNumber: 1 }),
      );
      repo.createQuestion.mockResolvedValue(makeQuestion({ id: 102 }));
      repo.countQuestionsInTest.mockResolvedValue(2);
      repo.findQuestionById.mockResolvedValue(
        makeQuestion({ id: 102, displayOrder: 2 }),
      );

      const res = await service.createFullTestQuestion(1, {
        part_number: 1,
        display_order: 2,
        answers: [],
      });

      expect(repo.createQuiz).not.toHaveBeenCalled();
      expect(repo.createSection).not.toHaveBeenCalled();
      expect(repo.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ quizId: 80, displayOrder: 2 }),
      );
      expect(res.id).toBe(102);
    });
  });

  describe('updateFullTestQuestion', () => {
    it('ném 404 QUESTION_NOT_FOUND khi câu hỏi không tồn tại', async () => {
      repo.findQuestionById.mockResolvedValue(null);
      await expect(
        service.updateFullTestQuestion(999, {
          display_order: 1,
          answers: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 400 ANSWER_NOT_IN_QUESTION khi đáp án có id không thuộc câu hỏi', async () => {
      repo.findQuestionById.mockResolvedValue(
        makeQuestion({
          id: 10,
          answers: [
            {
              id: 1,
              questionId: 10,
              answerText: 'A',
              isCorrect: true,
              explanation: null,
              displayOrder: 0,
            },
          ],
        }),
      );

      await expect(
        service.updateFullTestQuestion(10, {
          display_order: 1,
          answers: [{ id: 999, answer_text: 'Wrong ID', is_correct: true }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cập nhật câu hỏi, xóa đáp án bị bỏ, giữ nguyên id đáp án cập nhật và thêm đáp án mới', async () => {
      repo.findQuestionById
        .mockResolvedValueOnce(
          makeQuestion({
            id: 10,
            quizId: 80,
            answers: [
              {
                id: 1,
                questionId: 10,
                answerText: 'Old A',
                isCorrect: true,
                explanation: null,
                displayOrder: 0,
              },
              {
                id: 2,
                questionId: 10,
                answerText: 'Old B (to delete)',
                isCorrect: false,
                explanation: null,
                displayOrder: 1,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          makeQuestion({
            id: 10,
            quizId: 80,
            questionText: 'Updated Q',
            answers: [
              {
                id: 1,
                questionId: 10,
                answerText: 'Updated A',
                isCorrect: true,
                explanation: null,
                displayOrder: 0,
              },
              {
                id: 3,
                questionId: 10,
                answerText: 'New C',
                isCorrect: false,
                explanation: null,
                displayOrder: 1,
              },
            ],
          }),
        );
      repo.findPartNumberByQuizId.mockResolvedValue(3);

      const res = await service.updateFullTestQuestion(10, {
        display_order: 5,
        question_text: 'Updated Q',
        answers: [
          { id: 1, answer_text: 'Updated A', is_correct: true },
          { answer_text: 'New C', is_correct: false },
        ],
      });

      expect(repo.updateQuestion).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ displayOrder: 5, questionText: 'Updated Q' }),
      );
      expect(repo.deleteAnswersByIds).toHaveBeenCalledWith([2]);
      expect(repo.updateAnswer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ answerText: 'Updated A', displayOrder: 0 }),
      );
      expect(repo.createAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId: 10,
          answerText: 'New C',
          displayOrder: 1,
        }),
      );
      expect(res.id).toBe(10);
      expect(res.part_number).toBe(3);
    });
  });

  describe('deleteFullTestQuestion', () => {
    it('trả về mà không ném lỗi khi câu hỏi không tồn tại (204)', async () => {
      repo.findQuestionById.mockResolvedValue(null);
      await expect(
        service.deleteFullTestQuestion(999),
      ).resolves.toBeUndefined();
      expect(repo.deleteQuestion).not.toHaveBeenCalled();
    });

    it('xóa câu hỏi và cập nhật total_questions của đề thi', async () => {
      repo.findQuestionById.mockResolvedValue(makeQuestion({ id: 25 }));
      repo.findTestIdByQuestionId.mockResolvedValue(7);
      repo.countQuestionsInTest.mockResolvedValue(199);

      await service.deleteFullTestQuestion(25);

      expect(repo.deleteAnswersByQuestionId).toHaveBeenCalledWith(25);
      expect(repo.deleteQuestion).toHaveBeenCalledWith(25);
      expect(repo.updateFullTestTotalQuestions).toHaveBeenCalledWith(7, 199);
    });
  });

  describe('duplicateFullTestQuestion', () => {
    it('ném 404 QUESTION_NOT_FOUND khi câu hỏi không tồn tại', async () => {
      repo.findQuestionById.mockResolvedValue(null);
      await expect(service.duplicateFullTestQuestion(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nhân bản câu hỏi display_order + 1, thêm "(Bản sao)" và sao chép đáp án mà không đếm lại total_questions', async () => {
      repo.findQuestionById
        .mockResolvedValueOnce(
          makeQuestion({
            id: 50,
            quizId: 12,
            displayOrder: 4,
            questionText: 'Origin Question',
            answers: [
              {
                id: 10,
                questionId: 50,
                answerText: 'A',
                isCorrect: true,
                explanation: 'Exp',
                displayOrder: 0,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          makeQuestion({
            id: 51,
            quizId: 12,
            displayOrder: 5,
            questionText: 'Origin Question (Bản sao)',
          }),
        );
      repo.createQuestion.mockResolvedValue(makeQuestion({ id: 51 }));
      repo.findPartNumberByQuizId.mockResolvedValue(4);

      const res = await service.duplicateFullTestQuestion(50);

      expect(repo.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId: 12,
          displayOrder: 5,
          questionText: 'Origin Question (Bản sao)',
        }),
      );
      expect(repo.createAnswers).toHaveBeenCalledWith([
        {
          questionId: 51,
          answerText: 'A',
          isCorrect: true,
          explanation: 'Exp',
          displayOrder: 0,
        },
      ]);
      expect(repo.updateFullTestTotalQuestions).not.toHaveBeenCalled();
      expect(res.id).toBe(51);
      expect(res.part_number).toBe(4);
    });
  });

  describe('updateQuestionGroup', () => {
    it('ném 404 FULLTEST_NOT_FOUND khi đề thi không tồn tại', async () => {
      repo.findFullTestById.mockResolvedValue(null);
      await expect(
        service.updateQuestionGroup(999, {
          question_ids: [1, 2],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi có id trùng lặp', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      await expect(
        service.updateQuestionGroup(1, {
          question_ids: [1, 2, 1],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném 400 QUESTION_IDS_INVALID khi có câu hỏi không thuộc đề thi', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.findQuizIdsByTestId.mockResolvedValue([10, 11]);
      repo.findQuestionsByQuizIds.mockResolvedValue([{ id: 1 }]); // chỉ tìm thấy 1 câu trong 2

      await expect(
        service.updateQuestionGroup(1, {
          question_ids: [1, 2],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cập nhật 4 trường nhóm cho các câu hỏi hợp lệ', async () => {
      repo.findFullTestById.mockResolvedValue(makeFullTest({ id: 1 }));
      repo.findQuizIdsByTestId.mockResolvedValue([10]);
      repo.findQuestionsByQuizIds.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.updateQuestionGroup(1, {
        question_ids: [1, 2],
        passage_text: 'Passage 1',
        audio_url: 'audio.mp3',
        image_url: 'img.png',
        group_id: 'group_A',
      });

      expect(repo.updateQuestionsGroup).toHaveBeenCalledWith([1, 2], {
        passageText: 'Passage 1',
        audioUrl: 'audio.mp3',
        imageUrl: 'img.png',
        groupId: 'group_A',
      });
    });
  });
});
