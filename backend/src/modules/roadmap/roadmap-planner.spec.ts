import {
  achievableScore,
  allocateWeeks,
  buildPlan,
  type Catalog,
  estimateScoreFromPlacement,
  requiredHours,
  skillHours,
} from './roadmap-planner';

const EMPTY: Catalog = { modules: [], vocabCategories: [], fullTests: [] };
const START = new Date('2026-11-09T00:00:00Z');

const base = {
  currentScore: 450,
  targetScore: 650,
  purpose: 'job' as const,
  durationWeeks: 12,
  minutesPerDay: 60,
  daysPerWeek: 5,
  startedAt: START,
};

describe('roadmap-planner', () => {
  it('giờ cần học tăng theo dải điểm', () => {
    // 450→500: 50 * 0.8 = 40; 500→650: 150 * 1.1 = 165
    expect(skillHours(450, 650)).toBeCloseTo(205);
    expect(requiredHours(450, 650)).toBe(Math.ceil(205 * 1.15));
    // cùng 100 điểm nhưng ở dải cao tốn hơn
    expect(skillHours(850, 950)).toBeGreaterThan(skillHours(300, 400));
  });

  it('điểm có thể đạt: đủ giờ → mục tiêu; thiếu giờ → thấp hơn, bội số 5', () => {
    expect(achievableScore(450, 650, 1000)).toBe(650);
    const s = achievableScore(450, 650, 60);
    expect(s).toBeGreaterThan(450);
    expect(s).toBeLessThan(650);
    expect(s % 5).toBe(0);
  });

  it('quy đổi bài test nhanh theo các mốc, trần 900', () => {
    expect(estimateScoreFromPlacement(0, 10)).toBe(100);
    expect(estimateScoreFromPlacement(5, 10)).toBe(400);
    expect(estimateScoreFromPlacement(7, 10)).toBe(600);
    expect(estimateScoreFromPlacement(10, 10)).toBe(900);
    expect(estimateScoreFromPlacement(3, 0)).toBe(150);
  });

  it('chia tuần: tổng đúng, mỗi chặng ≥ 1 tuần khi đủ tuần', () => {
    const w = allocateWeeks([0.5, 0.3, 0.2], 10);
    expect(w.reduce((a, b) => a + b, 0)).toBe(10);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(1);
    expect(allocateWeeks([0.5, 0.3, 0.2], 2)).toEqual([1, 1, 0]);
  });

  it('chỉ gồm các chặng giao với [hiện tại, mục tiêu) + chặng luyện đề cuối', () => {
    const plan = buildPlan(base, EMPTY, START);
    expect(plan.phases.map((p) => p.key)).toEqual([
      'breakthrough',
      'acceleration',
      'test_practice',
    ]);
    expect(plan.phases[0].fromScore).toBe(450);
    expect(plan.phases[1].toScore).toBe(650);
    const last = plan.phases[plan.phases.length - 1];
    expect(last.endWeek).toBe(12);
    expect(plan.endDate.toISOString().slice(0, 10)).toBe('2027-01-31');
  });

  it('trạng thái theo tỷ lệ giờ có / giờ cần', () => {
    // 12 tuần * 5 ngày * 1h = 60h < 236h cần
    const atRisk = buildPlan(base, EMPTY, START);
    expect(atRisk.status).toBe('at_risk');
    expect(atRisk.recommendedMinutesPerDay).toBeGreaterThan(60);
    const ok = buildPlan(
      { ...base, minutesPerDay: 240, daysPerWeek: 7, durationWeeks: 20 },
      EMPTY,
      START,
    );
    expect(ok.status).toBe('on_track');
    expect(ok.achievableScore).toBe(650);
  });

  it('tuần hiện tại tính từ ngày bắt đầu, có giới hạn', () => {
    const later = new Date('2026-11-30T10:00:00Z'); // +21 ngày → tuần 4
    expect(buildPlan(base, EMPTY, later).currentWeek).toBe(4);
    const wayLater = new Date('2028-01-01T00:00:00Z');
    expect(buildPlan(base, EMPTY, wayLater).currentWeek).toBe(12);
  });

  it('mục tiêu phản xạ dồn trọng tâm sang nghe, tổng vẫn 100%', () => {
    const plan = buildPlan({ ...base, purpose: 'reflex' }, EMPTY, START);
    const f = plan.phases[0].focus;
    expect(f.grammar + f.vocab + f.listening + f.reading).toBe(100);
    expect(f.listening).toBe(35);
  });

  it('ghép tài nguyên: chương "Part N" theo chặng, từ vựng chia đều, đề ở chặng cuối', () => {
    const catalog: Catalog = {
      modules: [
        {
          id: 1,
          title: 'Part 1: Photographs',
          courseId: 7,
          courseTitle: 'TOEIC',
        },
        {
          id: 3,
          title: 'Part 3: Conversations',
          courseId: 7,
          courseTitle: 'TOEIC',
        },
        {
          id: 5,
          title: 'Part 5: Incomplete',
          courseId: 7,
          courseTitle: 'TOEIC',
        },
        {
          id: 9,
          title: 'Ngữ pháp cơ bản',
          courseId: 8,
          courseTitle: 'Mất gốc',
        },
      ],
      vocabCategories: [
        { id: 11, title: 'Office', courseId: 7, courseTitle: 'TOEIC' },
        { id: 12, title: 'Finance', courseId: 7, courseTitle: 'TOEIC' },
      ],
      fullTests: [{ id: 21, title: 'ETS 2024 Test 1' }],
    };
    const plan = buildPlan(
      { ...base, currentScore: 150, targetScore: 600 },
      catalog,
      START,
    );
    const byKey = Object.fromEntries(plan.phases.map((p) => [p.key, p]));
    expect(byKey.foundation.resources.map((r) => r.id)).toContain(9);
    const breakthrough = byKey.breakthrough.resources.filter(
      (r) => r.type === 'module',
    );
    expect(breakthrough.map((r) => r.id)).toEqual([1, 5]);
    expect(breakthrough[0].url).toBe('/courses/7/learn');
    expect(
      byKey.acceleration.resources.filter((r) => r.type === 'module'),
    ).toEqual([expect.objectContaining({ id: 3 })]);
    expect(byKey.test_practice.resources).toEqual([
      expect.objectContaining({
        type: 'full_test',
        id: 21,
        url: '/fulltests/21',
      }),
    ]);
    const vocabIds = plan.phases.flatMap((p) =>
      p.resources.filter((r) => r.type === 'vocab').map((r) => r.id),
    );
    expect(vocabIds).toEqual([11, 12]);
  });
});
