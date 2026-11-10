import type { Focus } from './roadmap-planner';
import {
  adjustFocus,
  bucketOf,
  buildWeekTasks,
  inPhaseScope,
  requiredAccuracy,
} from './roadmap-personal';

const sum = (f: Focus): number => f.grammar + f.vocab + f.listening + f.reading;

describe('roadmap-personal', () => {
  it('xếp dạng câu vào kỹ năng của tỉ trọng chặng', () => {
    expect(bucketOf(3, 'inference')).toBe('listening');
    expect(bucketOf(5, 'word_form')).toBe('grammar');
    expect(bucketOf(5, 'vocabulary')).toBe('vocab');
    expect(bucketOf(7, 'double')).toBe('reading');
  });

  it('phạm vi chặng và mức cần đạt', () => {
    expect(inPhaseScope('foundation', 7, 'single')).toBe(false);
    expect(inPhaseScope('breakthrough', 7, 'single')).toBe(true);
    expect(inPhaseScope('acceleration', 7, 'triple')).toBe(false);
    expect(inPhaseScope('mastery', 7, 'triple')).toBe(true);
    expect(requiredAccuracy('acceleration')).toBe(65);
    expect(requiredAccuracy('advanced')).toBe(75);
  });

  it('điều chỉnh tỉ trọng tối đa ±15, tổng vẫn 100', () => {
    const base = { grammar: 25, vocab: 25, listening: 25, reading: 25 };
    const one = adjustFocus(base, [{ part: 3, category: 'inference' }]);
    expect(one.focus.listening).toBe(30);
    expect(sum(one.focus)).toBe(100);
    expect(one.note).toContain('Nghe');
    const many = adjustFocus(base, [
      { part: 3, category: 'detail' },
      { part: 4, category: 'detail' },
      { part: 2, category: 'wh' },
      { part: 1, category: 'single_person' },
    ]);
    expect(many.focus.listening).toBe(40);
    expect(sum(many.focus)).toBe(100);
    expect(adjustFocus(base, []).note).toBeNull();
  });

  it('việc tuần không vượt quỹ thời gian, có luyện dạng yếu và ôn câu sai', () => {
    const tasks = buildWeekTasks({
      phaseKey: 'acceleration',
      phaseParts: [3, 4, 7],
      weeklyMinutes: 300,
      focus: [
        { part: 3, category: 'inference', label: 'Suy luận' },
        { part: 5, category: 'word_form', label: 'Từ loại' },
      ],
      openMistakes: 25,
      modules: new Map([
        [3, { id: 9, title: 'Part 3', url: '/courses/2/learn' }],
      ]),
    });
    expect(tasks.map((t) => t.type)).toEqual([
      'practice',
      'practice',
      'mistakes',
      'lesson',
      'mini_test',
    ]);
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.length).toBeLessThanOrEqual(6);
    expect(tasks.reduce((n, t) => n + t.minutes, 0)).toBeLessThanOrEqual(300);
  });

  it('chưa có điểm yếu → việc chung của chặng', () => {
    const tasks = buildWeekTasks({
      phaseKey: 'breakthrough',
      phaseParts: [2, 5],
      weeklyMinutes: 60,
      focus: [],
      openMistakes: 0,
      modules: new Map(),
    });
    expect(tasks.every((t) => t.type === 'practice')).toBe(true);
    expect(tasks.length).toBe(2);
  });
});
