/**
 * Cá nhân hóa lộ trình theo điểm yếu (P03) — thuần, có unit test. Không đổi tổng giờ, số tuần,
 * ranh giới chặng; chỉ điều chỉnh tỉ trọng trong chặng và sinh "Việc tuần này".
 */
import { ANALYTICS_CONFIG as C } from '../analytics/analytics-config';
import { SECONDS_PER_QUESTION } from '../practice/question-categories';
import type { Focus } from './roadmap-planner';

export type Bucket = keyof Focus;

const GRAMMAR_CATEGORIES = new Set([
  'word_form',
  'verb_tense',
  'pronoun',
  'prep_conj',
]);

/** Dạng câu thuộc kỹ năng nào trong tỉ trọng chặng. */
export function bucketOf(part: number, category: string): Bucket {
  if (part <= 4) return 'listening';
  if ((part === 5 || part === 6) && GRAMMAR_CATEGORIES.has(category))
    return 'grammar';
  if (category === 'vocabulary') return 'vocab';
  return 'reading';
}

const BUCKET_LABEL: Record<Bucket, string> = {
  listening: 'Nghe',
  reading: 'Đọc',
  grammar: 'Ngữ pháp',
  vocab: 'Từ vựng',
};

/** Phạm vi của chặng: dạng nào được đưa vào trọng tâm (ngoài phạm vi → "Để dành cho chặng sau"). */
export function inPhaseScope(
  phaseKey: string,
  part: number,
  category: string,
): boolean {
  switch (phaseKey) {
    case 'foundation':
      return [1, 2, 5].includes(part);
    case 'breakthrough':
      return part <= 6 || (part === 7 && category === 'single');
    case 'acceleration':
      return part !== 7 || category !== 'triple';
    default:
      return true;
  }
}

/** Mức tỉ lệ đúng cần đạt để qua chặng. */
export function requiredAccuracy(phaseKey: string): number {
  return ['advanced', 'mastery', 'test_practice'].includes(phaseKey)
    ? C.roadmapPassAdvanced
    : C.roadmapPassBasic;
}

/**
 * Cộng tỉ trọng cho kỹ năng chứa dạng yếu (mỗi dạng +5, tổng tối đa +15), lấy bớt đều từ các
 * kỹ năng còn lại; luôn tổng 100 và không kỹ năng nào âm.
 */
export function adjustFocus(
  base: Focus,
  weak: { part: number; category: string }[],
): { focus: Focus; note: string | null } {
  const add: Partial<Record<Bucket, number>> = {};
  let budget = C.roadmapMaxShift;
  for (const w of weak) {
    if (budget <= 0) break;
    const b = bucketOf(w.part, w.category);
    const step = Math.min(C.roadmapShiftStep, budget);
    add[b] = (add[b] ?? 0) + step;
    budget -= step;
  }
  const plus = Object.values(add).reduce((n, v) => n + (v ?? 0), 0);
  if (plus === 0) return { focus: { ...base }, note: null };
  const donors = (Object.keys(base) as Bucket[]).filter((k) => !add[k]);
  const donorTotal = donors.reduce((n, k) => n + base[k], 0);
  const focus = { ...base };
  for (const k of Object.keys(add) as Bucket[]) focus[k] += add[k]!;
  let taken = 0;
  donors.forEach((k, i) => {
    const share =
      i === donors.length - 1
        ? plus - taken
        : Math.round((plus * base[k]) / (donorTotal || 1));
    const t = Math.min(share, focus[k]);
    focus[k] -= t;
    taken += t;
  });
  const reasons = weak
    .filter((w) => add[bucketOf(w.part, w.category)])
    .map((w) => `Part ${w.part}`)
    .filter((v, i, a) => a.indexOf(v) === i);
  const raised = (Object.keys(add) as Bucket[])
    .map((b) => BUCKET_LABEL[b])
    .join(', ');
  return {
    focus,
    note: `Tăng phần ${raised} vì ${reasons.join(', ')} đang yếu`,
  };
}

export type TaskType =
  'practice' | 'mistakes' | 'mini_test' | 'full_test' | 'lesson';

export interface WeekTask {
  key: string;
  type: TaskType;
  title: string;
  target: number;
  unit: string;
  part?: number;
  category?: string;
  module_id?: number;
  url: string;
  minutes: number;
}

export interface TaskInput {
  phaseKey: string;
  phaseParts: number[];
  weeklyMinutes: number;
  focus: { part: number; category: string; label: string }[];
  openMistakes: number;
  /** Chương "Part N" gắn với chặng: part → { id, title, courseId } */
  modules: Map<number, { id: number; title: string; url: string }>;
}

const minutesPerQuestion = (part: number) =>
  (SECONDS_PER_QUESTION[part] ?? 40) / 60 + 0.5;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/**
 * "Việc tuần này": 3–6 việc, tổng khối lượng không vượt quỹ thời gian tuần. Có trọng tâm → luyện
 * từng dạng yếu + ôn sổ câu sai + học chương liên quan; không có → việc chung của chặng.
 */
export function buildWeekTasks(input: TaskInput): WeekTask[] {
  const budget = Math.max(30, input.weeklyMinutes);
  const tasks: WeekTask[] = [];
  const practiceBudget = budget * (input.focus.length > 0 ? 0.55 : 0.4);

  if (input.phaseKey === 'test_practice') {
    tasks.push({
      key: 'full_test',
      type: 'full_test',
      title: 'Làm 1 Full Test đủ 200 câu',
      target: 1,
      unit: 'đề',
      url: '/fulltests',
      minutes: 120,
    });
  }

  const focus = input.focus.slice(0, 3);
  for (const f of focus) {
    const n = Math.min(
      60,
      Math.max(
        10,
        round5(practiceBudget / focus.length / minutesPerQuestion(f.part)),
      ),
    );
    tasks.push({
      key: `practice:${f.part}:${f.category}`,
      type: 'practice',
      title: `Luyện ${n} câu Part ${f.part} – ${f.label}`,
      target: n,
      unit: 'câu',
      part: f.part,
      category: f.category,
      url: `/practice?skill=${f.part <= 4 ? 'listening' : 'reading'}&part=${f.part}&category=${f.category}`,
      minutes: Math.round(n * minutesPerQuestion(f.part)),
    });
  }
  if (focus.length === 0) {
    const parts = input.phaseParts.length ? input.phaseParts : [2, 5];
    for (const p of parts.slice(0, 2)) {
      const n = Math.min(
        40,
        Math.max(10, round5(practiceBudget / 2 / minutesPerQuestion(p))),
      );
      tasks.push({
        key: `part:${p}`,
        type: 'practice',
        title: `Luyện ${n} câu Part ${p}`,
        target: n,
        unit: 'câu',
        part: p,
        url: `/practice?skill=${p <= 4 ? 'listening' : 'reading'}&part=${p}`,
        minutes: Math.round(n * minutesPerQuestion(p)),
      });
    }
  }
  if (input.openMistakes > 0) {
    const n = Math.min(
      30,
      Math.max(10, round5(Math.min(input.openMistakes, (budget * 0.15) / 1.2))),
    );
    tasks.push({
      key: 'mistakes',
      type: 'mistakes',
      title: `Ôn ${n} câu trong Sổ câu sai`,
      target: n,
      unit: 'câu',
      url: '/mistakes',
      minutes: Math.round(n * 1.2),
    });
  }
  const lessonPart = (focus[0]?.part ?? input.phaseParts[0]) as
    number | undefined;
  const mod =
    lessonPart !== undefined ? input.modules.get(lessonPart) : undefined;
  if (mod) {
    tasks.push({
      key: `lesson:${mod.id}`,
      type: 'lesson',
      title: `Học 2 bài chương ${mod.title}`,
      target: 2,
      unit: 'bài',
      module_id: mod.id,
      url: mod.url,
      minutes: 30,
    });
  }
  if (input.phaseKey !== 'test_practice' && budget >= 120) {
    tasks.push({
      key: 'mini_test',
      type: 'mini_test',
      title: 'Làm 1 Mini Test 20 câu',
      target: 1,
      unit: 'bài',
      url: '/practice?tab=mini',
      minutes: 15,
    });
  }

  // Không vượt quỹ thời gian tuần: bỏ dần việc cuối (giữ ít nhất 3 việc nếu có)
  while (tasks.length > 3 && tasks.reduce((n, t) => n + t.minutes, 0) > budget)
    tasks.pop();
  return tasks.slice(0, 6);
}
