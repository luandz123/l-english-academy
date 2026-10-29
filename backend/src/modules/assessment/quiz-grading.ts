export interface GradableQuestion {
  id: number;
  answers: { id: number; isCorrect: boolean | null }[];
}

export interface SubmittedAnswer {
  questionId: number;
  selectedAnswerId: number | null;
}

export interface GradedAnswer {
  questionId: number;
  selectedAnswerId: number | null;
  isCorrect: boolean;
}

export interface QuizGrade {
  /** Một dòng cho **mỗi** câu của đề (câu bỏ trống: `selectedAnswerId = null`). */
  answers: GradedAnswer[];
  correctAnswers: number;
  totalQuestions: number;
  /** Thang 10, 2 chữ số thập phân. */
  score: number;
}

export class QuizGradingError extends Error {
  constructor(
    readonly reason:
      'UNKNOWN_QUESTION' | 'DUPLICATE_QUESTION' | 'ANSWER_NOT_IN_QUESTION',
    readonly questionId: number,
  ) {
    super(`${reason}: question ${questionId}`);
  }
}

/**
 * Chấm quiz trắc nghiệm. Chuyển từ `QuizPage.tsx:292-321`: câu đúng khi đáp án đã chọn
 * có `is_correct = true`; `score = correct / total * 10` làm tròn như `toFixed(2)`;
 * đề không có câu nào → 0. Đáp án đúng chỉ đọc từ DB, client chỉ gửi id đã chọn.
 */
export function gradeQuiz(
  questions: GradableQuestion[],
  submitted: SubmittedAnswer[],
): QuizGrade {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const selected = new Map<number, number | null>();
  for (const s of submitted) {
    const question = byId.get(s.questionId);
    if (!question) throw new QuizGradingError('UNKNOWN_QUESTION', s.questionId);
    if (selected.has(s.questionId)) {
      throw new QuizGradingError('DUPLICATE_QUESTION', s.questionId);
    }
    if (
      s.selectedAnswerId !== null &&
      !question.answers.some((a) => a.id === s.selectedAnswerId)
    ) {
      throw new QuizGradingError('ANSWER_NOT_IN_QUESTION', s.questionId);
    }
    selected.set(s.questionId, s.selectedAnswerId);
  }

  const answers = questions.map((q): GradedAnswer => {
    const selectedAnswerId = selected.get(q.id) ?? null;
    const isCorrect =
      selectedAnswerId !== null &&
      q.answers.some((a) => a.id === selectedAnswerId && a.isCorrect === true);
    return { questionId: q.id, selectedAnswerId, isCorrect };
  });

  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = questions.length;
  const score =
    totalQuestions > 0
      ? Number(((correctAnswers / totalQuestions) * 10).toFixed(2))
      : 0;

  return { answers, correctAnswers, totalQuestions, score };
}
