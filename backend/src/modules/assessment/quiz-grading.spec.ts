import {
  gradeQuiz,
  QuizGradingError,
  type GradableQuestion,
} from './quiz-grading';

/** 3 câu, mỗi câu 2 đáp án; đáp án đúng: 11, 22, 31. */
const QUESTIONS: GradableQuestion[] = [
  {
    id: 1,
    answers: [
      { id: 11, isCorrect: true },
      { id: 12, isCorrect: false },
    ],
  },
  {
    id: 2,
    answers: [
      { id: 21, isCorrect: false },
      { id: 22, isCorrect: true },
    ],
  },
  {
    id: 3,
    answers: [
      { id: 31, isCorrect: true },
      { id: 32, isCorrect: null },
    ],
  },
];

describe('gradeQuiz', () => {
  it('đếm câu đúng, score thang 10 làm tròn 2 chữ số', () => {
    const g = gradeQuiz(QUESTIONS, [
      { questionId: 1, selectedAnswerId: 11 },
      { questionId: 2, selectedAnswerId: 21 },
      { questionId: 3, selectedAnswerId: 31 },
    ]);
    expect(g.correctAnswers).toBe(2);
    expect(g.totalQuestions).toBe(3);
    expect(g.score).toBe(6.67);
  });

  it('trả một dòng cho mỗi câu của đề, câu không gửi hoặc gửi null là sai', () => {
    const g = gradeQuiz(QUESTIONS, [
      { questionId: 2, selectedAnswerId: 22 },
      { questionId: 3, selectedAnswerId: null },
    ]);
    expect(g.answers).toEqual([
      { questionId: 1, selectedAnswerId: null, isCorrect: false },
      { questionId: 2, selectedAnswerId: 22, isCorrect: true },
      { questionId: 3, selectedAnswerId: null, isCorrect: false },
    ]);
    expect(g.score).toBe(3.33);
  });

  it('is_correct null coi như sai', () => {
    const g = gradeQuiz(QUESTIONS, [{ questionId: 3, selectedAnswerId: 32 }]);
    expect(g.answers[2].isCorrect).toBe(false);
  });

  it('đề không có câu nào → score 0, total 0', () => {
    expect(gradeQuiz([], [])).toEqual({
      answers: [],
      correctAnswers: 0,
      totalQuestions: 0,
      score: 0,
    });
  });

  it('làm tròn giống hệt công thức cũ của client cho mọi đề tới 200 câu', () => {
    for (let total = 1; total <= 200; total++) {
      const qs: GradableQuestion[] = Array.from({ length: total }, (_, i) => ({
        id: i + 1,
        answers: [{ id: 1000 + i, isCorrect: true }],
      }));
      for (const correct of [0, 1, Math.floor(total / 3), total - 1, total]) {
        if (correct < 0 || correct > total) continue;
        const g = gradeQuiz(
          qs,
          qs.slice(0, correct).map((q) => ({
            questionId: q.id,
            selectedAnswerId: q.answers[0].id,
          })),
        );
        expect(g.score).toBe(Number(((correct / total) * 10).toFixed(2)));
      }
    }
  });

  it.each([
    [
      'câu không thuộc đề',
      [{ questionId: 99, selectedAnswerId: null }],
      'UNKNOWN_QUESTION',
    ],
    [
      'gửi trùng câu',
      [
        { questionId: 1, selectedAnswerId: 11 },
        { questionId: 1, selectedAnswerId: 12 },
      ],
      'DUPLICATE_QUESTION',
    ],
    [
      'đáp án của câu khác',
      [{ questionId: 1, selectedAnswerId: 22 }],
      'ANSWER_NOT_IN_QUESTION',
    ],
  ])('%s → QuizGradingError %s', (_name, submitted, reason) => {
    expect(() => gradeQuiz(QUESTIONS, submitted)).toThrow(QuizGradingError);
    try {
      gradeQuiz(QUESTIONS, submitted);
    } catch (err) {
      expect((err as QuizGradingError).reason).toBe(reason);
    }
  });
});
