/**
 * Quy tắc thuần của phân tích (P11, P10, P01, P03, E10) — có unit test.
 * Đầu vào là các lượt trả lời trong lượt ĐÃ NỘP (Full Test, lượt luyện, Mini Test, Daily,
 * chẩn đoán, luyện lại). Câu bỏ trống tính là sai khi đo tỉ lệ đúng nhưng đếm riêng.
 */
import {
  toeicListeningScore,
  toeicReadingScore,
} from '../assessment/toeic-scoring';
import { partDef, SECONDS_PER_QUESTION } from '../practice/question-categories';
import { ANALYTICS_CONFIG as C } from './analytics-config';

export interface AnswerRow {
  source: 'practice' | 'full_test';
  attemptId: string;
  kind: string;
  at: Date;
  questionId: number;
  part: number;
  category: string | null;
  passageType: string | null;
  blank: boolean;
  correct: boolean;
  timeSeconds: number | null;
}

export interface Stat {
  answered: number;
  correct: number;
  blank: number;
  timeSum: number;
  timeCount: number;
}

export type Level = 'insufficient' | 'weak' | 'average' | 'good';
export type TrendDir = 'up' | 'down' | 'flat';

export const emptyStat = (): Stat => ({
  answered: 0,
  correct: 0,
  blank: 0,
  timeSum: 0,
  timeCount: 0,
});

export function addRow(s: Stat, r: AnswerRow): void {
  s.answered++;
  if (r.correct) s.correct++;
  if (r.blank) s.blank++;
  if (r.timeSeconds !== null && !r.blank) {
    s.timeSum += r.timeSeconds;
    s.timeCount++;
  }
}

export const accuracy = (s: Stat): number | null =>
  s.answered === 0 ? null : Math.round((s.correct / s.answered) * 100);

export function levelOf(s: Stat, minAnswers: number): Level {
  const a = accuracy(s);
  if (a === null || s.answered < minAnswers) return 'insufficient';
  if (a < C.weakBelow) return 'weak';
  if (a < C.goodFrom) return 'average';
  return 'good';
}

/** Xu hướng so cửa sổ trước cùng độ dài; cửa sổ trước dưới ngưỡng → null. */
export function trendOf(
  current: Stat,
  previous: Stat | undefined,
  minAnswers: number,
): { direction: TrendDir; previous_accuracy: number } | null {
  if (!previous || previous.answered < minAnswers) return null;
  const a = accuracy(current);
  const b = accuracy(previous);
  if (a === null || b === null) return null;
  const d = a - b;
  return {
    direction:
      d >= C.trendMinDelta ? 'up' : d <= -C.trendMinDelta ? 'down' : 'flat',
    previous_accuracy: b,
  };
}

export interface Aggregate {
  overall: Stat;
  byPart: Map<number, Stat>;
  /** key "part:category" */
  byCategory: Map<string, Stat>;
  /** key passage_type (Part 7) */
  byPassage: Map<string, Stat>;
  attempts: Set<string>;
  first: Date | null;
  last: Date | null;
}

export function aggregate(rows: AnswerRow[]): Aggregate {
  const agg: Aggregate = {
    overall: emptyStat(),
    byPart: new Map(),
    byCategory: new Map(),
    byPassage: new Map(),
    attempts: new Set(),
    first: null,
    last: null,
  };
  const get = <K>(m: Map<K, Stat>, k: K) => {
    let s = m.get(k);
    if (!s) {
      s = emptyStat();
      m.set(k, s);
    }
    return s;
  };
  for (const r of rows) {
    addRow(agg.overall, r);
    addRow(get(agg.byPart, r.part), r);
    if (r.category) addRow(get(agg.byCategory, `${r.part}:${r.category}`), r);
    if (r.part === 7 && r.passageType)
      addRow(get(agg.byPassage, r.passageType), r);
    agg.attempts.add(`${r.source}:${r.attemptId}`);
    if (!agg.first || r.at < agg.first) agg.first = r.at;
    if (!agg.last || r.at > agg.last) agg.last = r.at;
  }
  return agg;
}

export function filterRows(
  rows: AnswerRow[],
  opts: {
    from?: Date | null;
    to?: Date | null;
    skill?: 'listening' | 'reading';
  },
): AnswerRow[] {
  return rows.filter(
    (r) =>
      (!opts.from || r.at >= opts.from) &&
      (!opts.to || r.at < opts.to) &&
      (!opts.skill || (opts.skill === 'listening' ? r.part <= 4 : r.part >= 5)),
  );
}

export function categoryLabel(part: number, category: string): string {
  return (
    partDef(part)?.categories.find((c) => c.key === category)?.label ?? category
  );
}

export interface CategoryFlags {
  many_blanks: boolean;
  slow: boolean;
  avg_seconds: number | null;
}

export function flagsOf(s: Stat, part: number): CategoryFlags {
  const avg = s.timeCount > 0 ? Math.round(s.timeSum / s.timeCount) : null;
  return {
    many_blanks: s.answered > 0 && s.blank / s.answered >= C.manyBlanksRate,
    slow:
      s.timeCount >= C.minTimedAnswers &&
      avg !== null &&
      avg > (SECONDS_PER_QUESTION[part] ?? 40),
    avg_seconds: avg,
  };
}

export interface RankedCategory {
  key: string;
  part: number;
  category: string;
  stat: Stat;
}

/**
 * 3 điểm yếu: chỉ dạng đạt ngưỡng; tỉ lệ đúng tăng dần, bằng nhau thì nhiều câu sai hơn trước;
 * tối đa 2 dạng cùng một Part. `mode` = 'weak' nếu có dạng dưới mức Tốt, ngược lại 'lowest'.
 */
export function pickTopWeaknesses(
  byCategory: Map<string, Stat>,
  minAnswers: number = C.minAnswersPerCategory,
): { items: RankedCategory[]; mode: 'weak' | 'lowest' } {
  const eligible: RankedCategory[] = [];
  for (const [key, stat] of byCategory) {
    if (stat.answered < minAnswers) continue;
    const [p, ...rest] = key.split(':');
    eligible.push({ key, part: Number(p), category: rest.join(':'), stat });
  }
  eligible.sort((a, b) => {
    const da = accuracy(a.stat) ?? 0;
    const db = accuracy(b.stat) ?? 0;
    return (
      da - db ||
      b.stat.answered - b.stat.correct - (a.stat.answered - a.stat.correct) ||
      a.key.localeCompare(b.key)
    );
  });
  const perPart = new Map<number, number>();
  const items: RankedCategory[] = [];
  for (const c of eligible) {
    if ((perPart.get(c.part) ?? 0) >= C.maxWeakPerPart) continue;
    items.push(c);
    perPart.set(c.part, (perPart.get(c.part) ?? 0) + 1);
    if (items.length >= C.topWeakCount) break;
  }
  const mode = items.some((i) => (accuracy(i.stat) ?? 0) < C.goodFrom)
    ? 'weak'
    : 'lowest';
  return { items, mode };
}

// ---------- Ước lượng điểm (P01) ----------

export interface SkillEstimate {
  score: number;
  min: number;
  max: number;
  correct: number;
  total: number;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Điểm ước lượng một kỹ năng: tỉ lệ đúng quy về thang 100 câu rồi tra bảng ETS (cùng bảng chấm
 * Full Test). Khoảng ± một sai số chuẩn của tỉ lệ đúng trên thang 495, kẹp 20–75 điểm.
 */
export function estimateSkill(
  skill: 'listening' | 'reading',
  correct: number,
  total: number,
): SkillEstimate | null {
  if (total <= 0) return null;
  const p = Math.min(1, Math.max(0, correct / total));
  const scaled = Math.round(p * 100);
  const score =
    skill === 'listening'
      ? toeicListeningScore(scaled)
      : toeicReadingScore(scaled);
  const margin = Math.min(
    75,
    Math.max(20, round5(Math.sqrt((p * (1 - p)) / total) * 495)),
  );
  return {
    score,
    min: Math.max(5, round5(score - margin)),
    max: Math.min(495, round5(score + margin)),
    correct,
    total,
  };
}

export interface ScoreRange {
  listening: SkillEstimate | null;
  reading: SkillEstimate | null;
  total: { min: number; max: number; mid: number } | null;
  usable: boolean;
  margin: number | null;
}

/** Ước lượng từ một lượt chẩn đoán. Bỏ trống > 50% → không dùng được. */
export function estimateFromRows(rows: AnswerRow[]): ScoreRange {
  const l = rows.filter((r) => r.part <= 4);
  const rd = rows.filter((r) => r.part >= 5);
  const blank = rows.filter((r) => r.blank).length;
  const usable = rows.length > 0 && blank / rows.length <= 0.5;
  const listening = estimateSkill(
    'listening',
    l.filter((r) => r.correct).length,
    l.length,
  );
  const reading = estimateSkill(
    'reading',
    rd.filter((r) => r.correct).length,
    rd.length,
  );
  let total: ScoreRange['total'] = null;
  if (listening && reading) {
    const min = listening.min + reading.min;
    const max = listening.max + reading.max;
    total = { min, max, mid: round5((min + max) / 2) };
  }
  return {
    listening,
    reading,
    total,
    usable,
    margin: total ? Math.round((total.max - total.min) / 2) : null,
  };
}

// ---------- Thời gian (giờ Việt Nam) ----------

const VN_OFFSET = 7 * 3600_000;

/** Thứ Hai 00:00 giờ VN của tuần chứa `d`, trả về Date UTC tương ứng. */
export function vnWeekStart(d: Date): Date {
  const local = new Date(d.getTime() + VN_OFFSET);
  const day = (local.getUTCDay() + 6) % 7;
  const monday = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - day,
  );
  return new Date(monday - VN_OFFSET);
}

/** Ngày (YYYY-MM-DD) theo giờ VN. */
export function vnDateKey(d: Date): string {
  return new Date(d.getTime() + VN_OFFSET).toISOString().slice(0, 10);
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 86_400_000);
}
