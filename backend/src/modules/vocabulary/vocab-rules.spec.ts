import {
  assignTags,
  countByPart,
  extractCandidates,
  isContentKey,
  lemmaCandidates,
  rankExtracted,
  sentenceWith,
  previewIntervals,
  schedule,
  sentenceAround,
  wordKey,
  type CardSrs,
} from './vocab-rules';

const now = new Date('2026-11-13T00:00:00Z');
const fresh: CardSrs = {
  ease: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};
const days = (d: Date) =>
  Math.round((d.getTime() - now.getTime()) / 86_400_000);

describe('schedule (SM-2)', () => {
  it('thẻ mới: Quên 10 phút, Khó 1, Nhớ 1, Dễ 4 ngày', () => {
    const again = schedule(fresh, 'again', now);
    expect(again.state).toBe('learning');
    expect(again.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(schedule(fresh, 'hard', now).intervalDays).toBe(1);
    expect(days(schedule(fresh, 'good', now).dueAt)).toBe(1);
    expect(schedule(fresh, 'easy', now).intervalDays).toBe(4);
  });

  it('nhớ liên tiếp: 1 → 3 → 3×ease, rồi thành "đã thuộc" khi ≥ 21 ngày', () => {
    let c = { ...fresh };
    const seq: number[] = [];
    for (let i = 0; i < 5; i++) {
      const n = schedule(c, 'good', now);
      seq.push(n.intervalDays);
      c = n;
    }
    expect(seq.slice(0, 3)).toEqual([1, 3, 7.5]);
    expect(schedule(c, 'good', now).state).toBe('mastered');
  });

  it('quên thẻ đã ôn: giảm ease (không dưới 1.3), tăng số lần quên, về học lại', () => {
    const c: CardSrs = {
      ease: 1.35,
      intervalDays: 10,
      repetitions: 4,
      lapses: 0,
    };
    const n = schedule(c, 'again', now);
    expect(n).toMatchObject({
      ease: 1.3,
      repetitions: 0,
      lapses: 1,
      intervalDays: 0,
    });
  });

  it('nhãn khoảng cách trên nút', () => {
    expect(previewIntervals(fresh, now)).toEqual({
      again: '10 phút',
      hard: '1 ngày',
      good: '1 ngày',
      easy: '4 ngày',
    });
  });
});

describe('tra từ', () => {
  it('khóa từ và dạng gốc', () => {
    expect(wordKey('  Agreement, ')).toBe('agreement');
    expect(lemmaCandidates('companies')).toContain('company');
    expect(lemmaCandidates('scheduled')).toContain('schedule');
    expect(lemmaCandidates('planning')).toContain('plan');
    expect(lemmaCandidates('abide by')).toEqual(['abide by']);
  });

  it('câu ngữ cảnh', () => {
    expect(
      sentenceAround(
        '<p>We signed it. The agreement ends soon!</p>',
        'agreement',
      ),
    ).toBe('The agreement ends soon!');
  });
});

describe('gắn nhãn Part / cấp độ', () => {
  it('Part = nơi xuất hiện nhiều nhất; cấp độ theo độ phổ biến; 600 từ không xếp Nâng cao', () => {
    const keys = ['meeting', 'invoice', 'abide by', 'zygote'];
    const counts = countByPart(keys, [
      [3, 'The meeting was moved. Meetings are long.'],
      [3, 'Where is the meeting?'],
      [5, 'Please send the invoice. The invoices were paid.'],
      [7, 'Staff must abide by the rules.'],
      [2, 'Is the meeting today?'],
    ]);
    expect(counts.get('meeting')).toEqual([0, 0, 1, 3, 0, 0, 0, 0]);
    expect(counts.get('abide by')![7]).toBe(1);
    const tags = assignTags(
      keys.map((k) => ({
        key: k,
        source: k === 'zygote' ? 'admin' : 'toeic600',
      })),
      counts,
    );
    expect(tags.get('meeting')).toMatchObject({
      part: 3,
      level: 'basic',
      frequency: 4,
    });
    expect(tags.get('invoice')!.part).toBe(5);
    expect(tags.get('zygote')).toMatchObject({ part: null, level: 'advanced' });
    expect(tags.get('abide by')!.level).not.toBe('advanced');
  });
});

describe('từ quan trọng trong bài (D17)', () => {
  it('extractCandidates: dạng gốc của từ và cụm 2–3 từ, giữ lần gặp đầu tiên', () => {
    const c = extractCandidates(
      'Some bicycles are parked in a rack. Bicycles!',
    );
    expect(c.get('bicycle')).toEqual({
      index: 1,
      surface: 'bicycles',
      size: 1,
    });
    expect(c.get('park')).toMatchObject({ surface: 'parked', size: 1 });
    expect(c.get('parked in')).toMatchObject({ index: 3, size: 2 });
    expect(c.get('parked in a')).toMatchObject({ size: 3 });
    expect(c.has('a')).toBe(false);
  });

  it('isContentKey: bỏ từ ngắn và từ quá phổ biến, giữ cụm từ', () => {
    expect(isContentKey('rack')).toBe(true);
    expect(isContentKey('there')).toBe(false);
    expect(isContentKey('go')).toBe(false);
    expect(isContentKey('in charge')).toBe(true);
  });

  it('rankExtracted: ưu tiên đúng Part, cấp độ cao, không trùng vị trí, xếp theo bài', () => {
    const items = [
      { key: 'park', index: 3, size: 1, part: 1, level: 'basic' },
      { key: 'parked', index: 3, size: 1, part: null, level: 'basic' },
      { key: 'rack', index: 6, size: 1, part: 1, level: 'intermediate' },
      { key: 'bicycle', index: 1, size: 1, part: 4, level: 'advanced' },
      { key: 'in a rack', index: 4, size: 3, part: null, level: null },
    ];
    const picked = rankExtracted(items, 1, 3).map((w) => w.key);
    // "rack" (Part 1, trung cấp) và "park" (Part 1) thắng; "in a rack" trùng vị trí của "rack"
    expect(picked).toEqual(['bicycle', 'park', 'rack']);
    expect(rankExtracted(items, 1, 10).map((w) => w.key)).not.toContain(
      'parked',
    );
  });

  it('sentenceWith: câu chứa dạng từ, bỏ nhãn người nói / (A)', () => {
    const text = 'W1: Hi there. I have a broken heater.\nM1: Let me check.';
    expect(sentenceWith(text, 'heater')).toBe('I have a broken heater.');
    expect(
      sentenceWith('(B) Some benches are being repaired.', 'benches'),
    ).toBe('Some benches are being repaired.');
    expect(sentenceWith(text, 'nothing')).toBeNull();
  });
});
