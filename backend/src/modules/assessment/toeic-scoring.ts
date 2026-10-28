/** Thang quy đổi TOEIC (100 câu) — chép nguyên từ `FullTestExam.tsx:69-102`. */
// prettier-ignore
const LISTENING: Record<number, number> = {
  6: 10, 7: 15, 8: 20, 9: 25, 10: 30, 11: 35, 12: 40, 13: 45, 14: 50, 15: 55,
  16: 60, 17: 65, 18: 70, 19: 75, 20: 80, 21: 85, 22: 90, 23: 95, 24: 100, 25: 110,
  26: 120, 27: 125, 28: 130, 29: 135, 30: 140, 31: 145, 32: 150, 33: 155, 34: 160, 35: 165,
  36: 170, 37: 175, 38: 180, 39: 185, 40: 190, 41: 195, 42: 200, 43: 205, 44: 210, 45: 215,
  46: 220, 47: 225, 48: 230, 49: 235, 50: 240, 51: 245, 52: 250, 53: 255, 54: 260, 55: 265,
  56: 270, 57: 275, 58: 280, 59: 285, 60: 290, 61: 295, 62: 300, 63: 305, 64: 310, 65: 315,
  66: 320, 67: 325, 68: 330, 69: 335, 70: 340, 71: 345, 72: 350, 73: 355, 74: 360, 75: 365,
  76: 370, 77: 375, 78: 380, 79: 385, 80: 390, 81: 395, 82: 400, 83: 405, 84: 410, 85: 415,
  86: 420, 87: 425, 88: 430, 89: 435, 90: 440, 91: 445, 92: 450, 93: 455, 94: 460, 95: 470,
};

// prettier-ignore
const READING: Record<number, number> = {
  6: 10, 7: 15, 8: 20, 9: 25, 10: 30, 11: 35, 12: 40, 13: 45, 14: 50, 15: 55,
  16: 60, 17: 65, 18: 70, 19: 75, 20: 80, 21: 85, 22: 90, 23: 95, 24: 100, 25: 110,
  26: 115, 27: 120, 28: 125, 29: 130, 30: 135, 31: 140, 32: 145, 33: 150, 34: 155, 35: 160,
  36: 165, 37: 170, 38: 175, 39: 180, 40: 185, 41: 190, 42: 195, 43: 200, 44: 205, 45: 210,
  46: 215, 47: 220, 48: 225, 49: 230, 50: 235, 51: 240, 52: 245, 53: 250, 54: 255, 55: 260,
  56: 265, 57: 270, 58: 275, 59: 280, 60: 285, 61: 290, 62: 295, 63: 300, 64: 305, 65: 310,
  66: 315, 67: 320, 68: 325, 69: 330, 70: 335, 71: 340, 72: 345, 73: 350, 74: 355, 75: 360,
  76: 365, 77: 370, 78: 375, 79: 380, 80: 385, 81: 390, 82: 395, 83: 400, 84: 405, 85: 410,
  86: 415, 87: 420, 88: 425, 89: 430, 90: 435, 91: 440, 92: 445, 93: 450, 94: 455, 95: 460,
  96: 470,
};

export function toeicListeningScore(correct: number): number {
  if (correct <= 5) return 5;
  if (correct >= 96) return 495;
  return LISTENING[correct] || Math.round((correct / 100) * 490) + 5;
}

export function toeicReadingScore(correct: number): number {
  if (correct <= 5) return 5;
  if (correct >= 97) return 495;
  return READING[correct] || Math.round((correct / 100) * 490) + 5;
}

export interface FullTestGradableQuestion {
  id: number;
  partNumber: number;
  answers: { id: number; isCorrect: boolean | null }[];
}

export interface FullTestGrade {
  /** Một dòng cho mỗi câu của các Part đã chọn, theo thứ tự đề. */
  details: {
    questionId: number;
    selectedAnswerId: number | null;
    isCorrect: boolean;
    partNumber: number;
  }[];
  totalQuestions: number;
  correctAnswers: number;
  listeningCorrect: number;
  readingCorrect: number;
  listeningScore: number;
  readingScore: number;
  totalScore: number;
}

/**
 * Chấm Full Test. Chuyển từ `FullTestExam.tsx:703-740`: Part 1-4 là Listening, 5-7 Reading;
 * số câu đúng mỗi phần quy về thang 100 câu rồi tra bảng ETS; làm đủ 7 Part → tổng = L + R,
 * thiếu Part → tổng = đúng / số câu × 990. `questions` đã lọc theo Part đã chọn.
 */
export function gradeFullTest(
  questions: FullTestGradableQuestion[],
  selected: Map<number, number | null>,
  selectedPartsCount: number,
): FullTestGrade {
  let listeningCorrect = 0;
  let readingCorrect = 0;
  const details = questions.map((q) => {
    const selectedAnswerId = selected.get(q.id) ?? null;
    const isCorrect =
      selectedAnswerId !== null &&
      q.answers.some((a) => a.id === selectedAnswerId && a.isCorrect === true);
    if (isCorrect) {
      if (q.partNumber <= 4) listeningCorrect++;
      else readingCorrect++;
    }
    return {
      questionId: q.id,
      selectedAnswerId,
      isCorrect,
      partNumber: q.partNumber,
    };
  });

  const correctAnswers = listeningCorrect + readingCorrect;
  const listeningTotal = questions.filter((q) => q.partNumber <= 4).length;
  const readingTotal = questions.filter((q) => q.partNumber >= 5).length;
  const scaledListening =
    listeningTotal > 0
      ? Math.min(100, Math.round((listeningCorrect / listeningTotal) * 100))
      : 0;
  const scaledReading =
    readingTotal > 0
      ? Math.min(100, Math.round((readingCorrect / readingTotal) * 100))
      : 0;
  const listeningScore = toeicListeningScore(scaledListening);
  const readingScore = toeicReadingScore(scaledReading);
  const totalScore =
    selectedPartsCount === 7
      ? listeningScore + readingScore
      : Math.round((correctAnswers / Math.max(1, questions.length)) * 990);

  return {
    details,
    totalQuestions: questions.length,
    correctAnswers,
    listeningCorrect,
    readingCorrect,
    listeningScore,
    readingScore,
    totalScore,
  };
}
