import {
  autoTimeLimitSeconds,
  dailyFocusParts,
  nextMistakeState,
  pickQuestions,
  seededRandom,
  vietnamDate,
  weakCategories,
  type MistakeState,
  type PoolItem,
} from './practice-rules';

const now = new Date('2026-11-09T10:00:00Z');

describe('nextMistakeState', () => {
  it('câu mới trả lời đúng → không ghi; sai → Chưa ôn', () => {
    expect(nextMistakeState(null, true, now)).toBeNull();
    expect(nextMistakeState(null, false, now)).toMatchObject({
      wrongCount: 1,
      status: 'not_reviewed',
    });
  });

  const wrongOnce: MistakeState = {
    wrongCount: 1,
    status: 'not_reviewed',
    reviewCount: 0,
    firstWrongAt: now,
    lastWrongAt: now,
    isBookmarked: true,
  };

  it('làm lại đúng → Đã sửa đúng, không xóa lịch sử sai, giữ bookmark', () => {
    const s = nextMistakeState(wrongOnce, true, now)!;
    expect(s).toMatchObject({
      status: 'fixed',
      wrongCount: 1,
      reviewCount: 1,
      isBookmarked: true,
    });
  });

  it('làm lại vẫn sai → Đang cải thiện, tăng số lần sai', () => {
    const s = nextMistakeState(wrongOnce, false, now)!;
    expect(s).toMatchObject({ status: 'improving', wrongCount: 2 });
  });

  it('câu chỉ bookmark: đúng giữ nguyên, sai lần đầu → Chưa ôn', () => {
    const bm: MistakeState = {
      ...wrongOnce,
      wrongCount: 0,
      firstWrongAt: null,
      lastWrongAt: null,
    };
    expect(nextMistakeState(bm, true, now)).toMatchObject({
      status: 'not_reviewed',
      reviewCount: 0,
    });
    expect(nextMistakeState(bm, false, now)).toMatchObject({
      status: 'not_reviewed',
      wrongCount: 1,
    });
  });
});

describe('pickQuestions', () => {
  const pool: PoolItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    groupKey: `g${Math.floor(i / 3)}`,
    sourceTestId: 1,
    toeicPart: 3,
    partIndex: i,
  }));

  it('không trùng câu, đúng số lượng', () => {
    const ids = pickQuestions(
      [...pool, ...pool],
      10,
      'random',
      seededRandom(1),
    );
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it('theo thứ tự → lấy đầu Part', () => {
    expect(pickQuestions(pool, 4, 'sequential', seededRandom(1))).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it('câu cùng nhóm nằm cạnh nhau', () => {
    const ids = pickQuestions(pool, 20, 'random', seededRandom(7));
    const groups = ids.map((id) => pool[id - 1].groupKey);
    const seen = new Set<string>();
    groups.forEach((g, i) => {
      if (i > 0 && g !== groups[i - 1]) {
        expect(seen.has(g!)).toBe(false);
      }
      seen.add(g!);
    });
  });

  it('ưu tiên câu được chỉ định', () => {
    const ids = pickQuestions(
      pool,
      2,
      'random',
      seededRandom(3),
      new Set([7, 15]),
    );
    expect(new Set(ids)).toEqual(new Set([7, 15]));
  });
});

describe('khác', () => {
  it('giờ tự động theo Part, tối thiểu 1 phút', () => {
    expect(autoTimeLimitSeconds([5])).toBe(60);
    expect(autoTimeLimitSeconds([7, 7, 7, 7])).toBe(300);
  });

  it('ngày Daily theo giờ Việt Nam', () => {
    expect(vietnamDate(new Date('2026-11-09T18:30:00Z'))).toBe('2026-11-10');
    const f = dailyFocusParts('2026-11-10');
    expect([1, 2, 3, 4]).toContain(f.listening);
    expect([5, 6, 7]).toContain(f.reading);
  });

  it('dạng yếu cần đủ dữ liệu và tỉ lệ sai cao', () => {
    expect(
      weakCategories([
        { part: 5, category: 'pronoun', total: 10, wrong: 8 },
        { part: 2, category: 'wh', total: 2, wrong: 2 },
        { part: 7, category: 'single', total: 10, wrong: 1 },
        { part: 3, category: 'detail', total: 5, wrong: 3 },
      ]),
    ).toEqual(['5:pronoun', '3:detail']);
  });
});
