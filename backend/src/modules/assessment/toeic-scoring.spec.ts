import {
  gradeFullTest,
  toeicListeningScore,
  toeicReadingScore,
  type FullTestGradableQuestion,
} from './toeic-scoring';

/** n câu cho mỗi Part trong `parts`, đáp án đúng có id = câu * 10 + 1. */
function makeTest(
  parts: number[],
  perPart: number,
): FullTestGradableQuestion[] {
  const qs: FullTestGradableQuestion[] = [];
  let id = 1;
  for (const p of parts) {
    for (let i = 0; i < perPart; i++, id++) {
      qs.push({
        id,
        partNumber: p,
        answers: [
          { id: id * 10 + 1, isCorrect: true },
          { id: id * 10 + 2, isCorrect: false },
        ],
      });
    }
  }
  return qs;
}

const answerAll = (
  qs: FullTestGradableQuestion[],
  correct: (q: FullTestGradableQuestion) => boolean,
) =>
  new Map(
    qs.map(
      (q) =>
        [q.id, correct(q) ? q.id * 10 + 1 : q.id * 10 + 2] as [number, number],
    ),
  );

describe('bảng quy đổi ETS', () => {
  it('biên và một số mốc', () => {
    expect(toeicListeningScore(0)).toBe(5);
    expect(toeicListeningScore(5)).toBe(5);
    expect(toeicListeningScore(25)).toBe(110);
    expect(toeicListeningScore(95)).toBe(470);
    expect(toeicListeningScore(96)).toBe(495);
    expect(toeicReadingScore(26)).toBe(115);
    expect(toeicReadingScore(96)).toBe(470);
    expect(toeicReadingScore(97)).toBe(495);
  });
});

describe('gradeFullTest', () => {
  it('đủ 7 Part, đúng hết → 990; sai hết → 10', () => {
    const qs = makeTest([1, 2, 3, 4, 5, 6, 7], 4);
    expect(
      gradeFullTest(
        qs,
        answerAll(qs, () => true),
        7,
      ).totalScore,
    ).toBe(990);
    const none = gradeFullTest(
      qs,
      answerAll(qs, () => false),
      7,
    );
    expect(none).toMatchObject({
      totalScore: 10,
      listeningScore: 5,
      readingScore: 5,
      correctAnswers: 0,
    });
  });

  it('tách Listening (Part 1-4) và Reading (Part 5-7), quy về thang 100 câu', () => {
    const qs = makeTest([1, 2, 3, 4, 5, 6, 7], 10); // 40 L, 30 R
    // đúng 20/40 L → 50 → 240; đúng 30/30 R → 100 → 495
    const g = gradeFullTest(
      qs,
      answerAll(qs, (q) => q.partNumber >= 5 || q.id % 2 === 0),
      7,
    );
    expect(g).toMatchObject({
      listeningCorrect: 20,
      readingCorrect: 30,
      listeningScore: 240,
      readingScore: 495,
      totalScore: 735,
    });
  });

  it('thiếu Part → tổng = đúng / số câu × 990', () => {
    const qs = makeTest([5], 30);
    const g = gradeFullTest(
      qs,
      answerAll(qs, (q) => q.id <= 10),
      1,
    );
    expect(g.totalScore).toBe(Math.round((10 / 30) * 990));
    expect(g.totalQuestions).toBe(30);
  });

  it('câu bỏ trống: selected null, sai; mỗi câu một dòng chi tiết kèm part', () => {
    const qs = makeTest([1, 5], 1);
    const g = gradeFullTest(qs, new Map([[1, 11]]), 2);
    expect(g.details).toEqual([
      { questionId: 1, selectedAnswerId: 11, isCorrect: true, partNumber: 1 },
      {
        questionId: 2,
        selectedAnswerId: null,
        isCorrect: false,
        partNumber: 5,
      },
    ]);
  });
});
