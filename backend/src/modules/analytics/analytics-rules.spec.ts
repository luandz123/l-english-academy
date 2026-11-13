import {
  aggregate,
  accuracy,
  estimateFromRows,
  estimateSkill,
  flagsOf,
  levelOf,
  pickTopWeaknesses,
  trendOf,
  vnWeekStart,
  type AnswerRow,
  type Stat,
} from './analytics-rules';

let qid = 1;
const row = (
  part: number,
  category: string,
  correct: boolean,
  over: Partial<AnswerRow> = {},
): AnswerRow => ({
  source: 'practice',
  attemptId: 's1',
  kind: 'question_type',
  at: new Date('2026-11-05T03:00:00Z'),
  questionId: qid++,
  part,
  category,
  passageType: null,
  blank: false,
  correct,
  timeSeconds: null,
  ...over,
});
const many = (n: number, part: number, cat: string, correctCount: number) =>
  Array.from({ length: n }, (_, i) => row(part, cat, i < correctCount));
const stat = (answered: number, correct: number): Stat => ({
  answered,
  correct,
  blank: 0,
  timeSum: 0,
  timeCount: 0,
});

describe('levelOf / trendOf', () => {
  it('dưới ngưỡng câu → chưa đủ dữ liệu; mức theo 50/75', () => {
    expect(levelOf(stat(9, 1), 10)).toBe('insufficient');
    expect(levelOf(stat(10, 4), 10)).toBe('weak');
    expect(levelOf(stat(10, 5), 10)).toBe('average');
    expect(levelOf(stat(10, 8), 10)).toBe('good');
  });

  it('xu hướng cần chênh ≥ 5 điểm % và cửa sổ trước đủ dữ liệu', () => {
    expect(trendOf(stat(10, 7), stat(10, 5), 10)?.direction).toBe('up');
    expect(trendOf(stat(10, 5), stat(10, 7), 10)?.direction).toBe('down');
    expect(trendOf(stat(40, 20), stat(40, 19), 10)?.direction).toBe('flat');
    expect(trendOf(stat(10, 7), stat(5, 1), 10)).toBeNull();
  });
});

describe('pickTopWeaknesses', () => {
  it('chỉ dạng đủ 10 câu, thấp nhất trước, tối đa 2 dạng / Part', () => {
    const agg = aggregate([
      ...many(10, 5, 'word_form', 3),
      ...many(10, 5, 'pronoun', 4),
      ...many(12, 5, 'vocabulary', 4),
      ...many(10, 2, 'wh', 6),
      ...many(5, 3, 'detail', 0),
    ]);
    const { items, mode } = pickTopWeaknesses(agg.byCategory);
    expect(items.map((i) => i.key)).toEqual([
      '5:word_form',
      '5:vocabulary',
      '2:wh',
    ]);
    expect(mode).toBe('weak');
  });

  it('không dạng nào dưới 75% → vẫn chỉ ra dạng thấp nhất (mode lowest)', () => {
    const agg = aggregate([
      ...many(10, 5, 'word_form', 8),
      ...many(10, 2, 'wh', 9),
    ]);
    const r = pickTopWeaknesses(agg.byCategory);
    expect(r.mode).toBe('lowest');
    expect(r.items[0].key).toBe('5:word_form');
  });
});

describe('flagsOf', () => {
  it('bỏ trống ≥ 20% và làm chậm so với mức tham chiếu của Part', () => {
    const s: Stat = {
      answered: 10,
      correct: 3,
      blank: 2,
      timeSum: 8 * 50,
      timeCount: 8,
    };
    expect(flagsOf(s, 5)).toEqual({
      many_blanks: true,
      slow: true,
      avg_seconds: 50,
    });
    expect(flagsOf({ ...s, blank: 1, timeSum: 8 * 20 }, 5)).toMatchObject({
      many_blanks: false,
      slow: false,
    });
  });
});

describe('ước lượng điểm chẩn đoán', () => {
  it('khoảng điểm theo bảng ETS, kẹp sai số', () => {
    const e = estimateSkill('listening', 13, 26)!;
    expect(e.min).toBeLessThan(e.score);
    expect(e.max).toBeGreaterThan(e.score);
    expect(e.max - e.min).toBeLessThanOrEqual(150);
  });

  it('bỏ trống quá 50% → không dùng được; đủ 2 kỹ năng → có tổng', () => {
    const rows = [...many(10, 2, 'wh', 5), ...many(10, 5, 'pronoun', 6)];
    const ok = estimateFromRows(rows);
    expect(ok.usable).toBe(true);
    expect(ok.total!.mid % 5).toBe(0);
    const blanks = rows.map((r, i) =>
      i < 11 ? { ...r, blank: true, correct: false } : r,
    );
    expect(estimateFromRows(blanks).usable).toBe(false);
  });
});

describe('khác', () => {
  it('accuracy và tuần bắt đầu thứ Hai giờ VN', () => {
    expect(accuracy(stat(3, 1))).toBe(33);
    // Chủ nhật 23:30 giờ VN (16:30 UTC) thuộc tuần bắt đầu thứ Hai 2026-11-02
    expect(vnWeekStart(new Date('2026-11-08T16:30:00Z')).toISOString()).toBe(
      '2026-11-01T17:00:00.000Z',
    );
    // Thứ Hai 00:30 giờ VN
    expect(vnWeekStart(new Date('2026-11-08T17:30:00Z')).toISOString()).toBe(
      '2026-11-08T17:00:00.000Z',
    );
  });
});
