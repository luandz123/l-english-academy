import { BadRequestException } from '@nestjs/common';
import { VocabMapper } from './vocab.mapper';
import type { VocabRepository } from './vocab.repository';
import { VocabService } from './vocab.service';

const CATEGORY_ROW = {
  id: 1,
  courseId: 10,
  title: 'Category 1',
  displayOrder: 1,
};

const QUIZ_ROW = {
  id: 100,
  categoryId: 1,
  title: 'Vocab Quiz 1',
  totalQuestions: 10,
  displayOrder: 1,
  lessonId: 50,
};

const WORD_ROW = {
  id: 1001,
  vocabQuizId: 100,
  word: 'testword',
  phonetic: '/test/',
  definitionEn: 'A test word',
  definitionVi: 'Từ để test',
  exampleSentence: 'This is a test.',
  imageUrl: null,
  audioMaleUrl: null,
  audioFemaleUrl: null,
  wrongAnswer1: 'wrong1',
  wrongAnswer2: 'wrong2',
  wrongAnswer3: 'wrong3',
  displayOrder: 1,
  questionId: 42,
};

function setup() {
  const repo = {
    findCategoriesByCourseId: jest.fn().mockResolvedValue([CATEGORY_ROW]),
    findQuizzesByCategoryId: jest.fn().mockResolvedValue([QUIZ_ROW]),
    findWordsByQuizId: jest.fn().mockResolvedValue([WORD_ROW]),
    findVocabQuizzesByLessonId: jest.fn().mockResolvedValue([]),
    findVocabQuizzesById: jest.fn().mockResolvedValue([]),
    findLessonsByQuizId: jest.fn().mockResolvedValue([]),
    findVocabQuestionsByQuestionIds: jest.fn().mockResolvedValue([]),
    findVocabQuestionsForQuiz: jest.fn().mockResolvedValue([WORD_ROW]),
    findLessonById: jest.fn().mockResolvedValue({ quizId: 99 }),
  };
  const service = new VocabService(
    repo as unknown as VocabRepository,
    new VocabMapper(),
  );
  return { service, repo };
}

describe('VocabService', () => {
  describe('Danh sách cơ bản', () => {
    it('listCategories trả danh sách category đã map sang snake_case', async () => {
      const { service, repo } = setup();
      const res = await service.listCategories(10);
      expect(repo.findCategoriesByCourseId).toHaveBeenCalledWith(10);
      expect(res).toEqual([
        {
          id: 1,
          course_id: 10,
          title: 'Category 1',
          display_order: 1,
        },
      ]);
    });

    it('listQuizzes trả danh sách quiz đã map', async () => {
      const { service, repo } = setup();
      const res = await service.listQuizzes(1);
      expect(repo.findQuizzesByCategoryId).toHaveBeenCalledWith(1);
      expect(res).toEqual([
        {
          id: 100,
          category_id: 1,
          title: 'Vocab Quiz 1',
          total_questions: 10,
          display_order: 1,
          lesson_id: 50,
        },
      ]);
    });

    it('listWords trả danh sách từ vựng đã map', async () => {
      const { service, repo } = setup();
      const res = await service.listWords(100);
      expect(repo.findWordsByQuizId).toHaveBeenCalledWith(100);
      expect(res).toEqual([
        {
          id: 1001,
          vocab_quiz_id: 100,
          word: 'testword',
          phonetic: '/test/',
          definition_en: 'A test word',
          definition_vi: 'Từ để test',
          example_sentence: 'This is a test.',
          image_url: null,
          audio_male_url: null,
          audio_female_url: null,
          wrong_answer_1: 'wrong1',
          wrong_answer_2: 'wrong2',
          wrong_answer_3: 'wrong3',
          display_order: 1,
          question_id: 42,
        },
      ]);
    });
  });

  describe('Chuỗi dò 4 bước (getLessonVocabWords)', () => {
    it('Bước 1: khớp đúng 1 quiz có lesson_id = ref', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([QUIZ_ROW]);

      const res = await service.getLessonVocabWords(50);
      expect(repo.findVocabQuizzesByLessonId).toHaveBeenCalledWith(50);
      expect(repo.findVocabQuizzesById).not.toHaveBeenCalled();
      expect(repo.findVocabQuestionsForQuiz).toHaveBeenCalledWith(
        100,
        undefined,
      );
      expect(res).toHaveLength(1);
      expect(res[0].word).toBe('testword');
    });

    it('Quy tắc .maybeSingle(): 2 quiz cùng lesson_id = ref -> coi như không tìm thấy, bỏ qua bước 1 sang bước 2', async () => {
      const { service, repo } = setup();
      // Bước 1 trả 2 quiz -> lỗi trong Supabase maybeSingle() -> null
      repo.findVocabQuizzesByLessonId.mockResolvedValue([
        QUIZ_ROW,
        { ...QUIZ_ROW, id: 101 },
      ]);
      // Bước 2 tìm theo id = ref
      const quizStep2 = { ...QUIZ_ROW, id: 50 };
      repo.findVocabQuizzesById.mockResolvedValue([quizStep2]);

      const res = await service.getLessonVocabWords(50);
      expect(repo.findVocabQuizzesByLessonId).toHaveBeenCalledWith(50);
      expect(repo.findVocabQuizzesById).toHaveBeenCalledWith(50);
      expect(repo.findVocabQuestionsForQuiz).toHaveBeenCalledWith(
        50,
        undefined,
      );
      expect(res).toHaveLength(1);
    });

    it('Bước 2: bước 1 không có -> bước 2 khớp đúng 1 quiz có id = ref', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([]);
      repo.findVocabQuizzesById.mockResolvedValue([QUIZ_ROW]);

      const res = await service.getLessonVocabWords(100);
      expect(repo.findVocabQuizzesById).toHaveBeenCalledWith(100);
      expect(repo.findLessonsByQuizId).not.toHaveBeenCalled();
      expect(repo.findVocabQuestionsForQuiz).toHaveBeenCalledWith(
        100,
        undefined,
      );
      expect(res).toHaveLength(1);
    });

    it('Bước 3: bước 1 & 2 không có -> bài học lessons có quiz_id = ref -> quiz có lesson_id = lesson.id', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId
        .mockResolvedValueOnce([]) // bước 1: không có
        .mockResolvedValueOnce([QUIZ_ROW]); // bước 3: tìm theo lesson.id -> có QUIZ_ROW
      repo.findVocabQuizzesById.mockResolvedValue([]); // bước 2: không có
      repo.findLessonsByQuizId.mockResolvedValue([{ id: 77, quizId: 99 }]); // bước 3

      const res = await service.getLessonVocabWords(99);
      expect(repo.findLessonsByQuizId).toHaveBeenCalledWith(99);
      expect(repo.findVocabQuizzesByLessonId).toHaveBeenLastCalledWith(77);
      expect(repo.findVocabQuestionsForQuiz).toHaveBeenCalledWith(
        100,
        undefined,
      );
      expect(res).toHaveLength(1);
    });

    it('Bước 3 quy tắc .maybeSingle(): 2 bài học cùng quiz_id = ref -> coi như không tìm thấy, sang bước 4', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([]);
      repo.findVocabQuizzesById.mockResolvedValue([]);
      repo.findLessonsByQuizId.mockResolvedValue([
        { id: 77, quizId: 99 },
        { id: 78, quizId: 99 },
      ]);

      const res = await service.getLessonVocabWords(99);
      expect(repo.findVocabQuestionsForQuiz).not.toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('Bước 4: không tìm thấy quiz nào và có question_ids -> lọc theo question_id', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([]);
      repo.findVocabQuizzesById.mockResolvedValue([]);
      repo.findLessonsByQuizId.mockResolvedValue([]);
      repo.findVocabQuestionsByQuestionIds.mockResolvedValue([WORD_ROW]);

      const res = await service.getLessonVocabWords(99, '42,43');
      expect(repo.findVocabQuestionsByQuestionIds).toHaveBeenCalledWith([
        42, 43,
      ]);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe(1001);
    });

    it('Bước 4b: không tìm thấy quiz nào và không có question_ids -> trả mảng rỗng []', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([]);
      repo.findVocabQuizzesById.mockResolvedValue([]);
      repo.findLessonsByQuizId.mockResolvedValue([]);

      const res = await service.getLessonVocabWords(99);
      expect(repo.findVocabQuestionsByQuestionIds).not.toHaveBeenCalled();
      expect(repo.findVocabQuestionsForQuiz).not.toHaveBeenCalled();
      expect(res).toEqual([]);
    });

    it('Có quiz và có question_ids -> gọi repo với cả quizId và questionIds', async () => {
      const { service, repo } = setup();
      repo.findVocabQuizzesByLessonId.mockResolvedValue([QUIZ_ROW]);

      await service.getLessonVocabWords(50, '42,43');
      expect(repo.findVocabQuestionsForQuiz).toHaveBeenCalledWith(
        100,
        [42, 43],
      );
    });

    it('question_ids > 500 ném 400 VALIDATION_FAILED', async () => {
      const { service } = setup();
      const many = Array.from({ length: 501 }, (_, i) => i + 1).join(',');
      await expect(service.getLessonVocabWords(50, many)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('question_ids sai định dạng ném 400 VALIDATION_FAILED', async () => {
      const { service } = setup();
      await expect(service.getLessonVocabWords(50, 'abc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getLessonVocabWords(50, '1,-2')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getLessonVocabWords(50, '1,0')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLessonQuizId', () => {
    it('bài học tồn tại -> trả { lesson: { quiz_id } }', async () => {
      const { service, repo } = setup();
      const res = await service.getLessonQuizId(12);
      expect(repo.findLessonById).toHaveBeenCalledWith(12);
      expect(res).toEqual({ lesson: { quiz_id: 99 } });
    });

    it('bài học không tồn tại -> trả { lesson: null }', async () => {
      const { service, repo } = setup();
      repo.findLessonById.mockResolvedValue(null);
      const res = await service.getLessonQuizId(999);
      expect(res).toEqual({ lesson: null });
    });
  });
});
