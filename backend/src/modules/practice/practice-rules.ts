/**
 * Quy tắc thuần của module practice (có unit test): chọn câu, trạng thái sổ câu sai, giờ làm bài.
 */
import { SECONDS_PER_QUESTION } from './question-categories';

export type MistakeStatus = 'not_reviewed' | 'improving' | 'fixed';

export interface MistakeState {
  wrongCount: number;
  status: MistakeStatus;
  reviewCount: number;
  firstWrongAt: Date | null;
  lastWrongAt: Date | null;
  isBookmarked: boolean;
}

/**
 * Trạng thái sổ câu sai sau một lần trả lời (spec §3.6):
 * - Chưa có dòng: sai → tạo "Chưa ôn"; đúng → không tạo.
 * - Đã có dòng: đúng → "Đã sửa đúng"; sai → "Đang cải thiện" (đã làm lại nhưng vẫn sai).
 *   Không bao giờ xóa dòng / lịch sử sai; câu bookmark giữ nguyên cờ.
 * - Câu chỉ bookmark (chưa từng sai) trả lời sai lần đầu → "Chưa ôn".
 * Trả về null khi không cần ghi gì.
 */
export function nextMistakeState(
  current: MistakeState | null,
  isCorrect: boolean,
  now: Date,
): MistakeState | null {
  if (!current) {
    if (isCorrect) return null;
    return {
      wrongCount: 1,
      status: 'not_reviewed',
      reviewCount: 0,
      firstWrongAt: now,
      lastWrongAt: now,
      isBookmarked: false,
    };
  }
  if (isCorrect) {
    return {
      ...current,
      status: current.wrongCount > 0 ? 'fixed' : current.status,
      reviewCount:
        current.wrongCount > 0 ? current.reviewCount + 1 : current.reviewCount,
    };
  }
  const neverWrong = current.wrongCount === 0;
  return {
    ...current,
    wrongCount: current.wrongCount + 1,
    status: neverWrong ? 'not_reviewed' : 'improving',
    reviewCount: neverWrong ? current.reviewCount : current.reviewCount + 1,
    firstWrongAt: current.firstWrongAt ?? now,
    lastWrongAt: now,
  };
}

export interface PoolItem {
  id: number;
  groupKey: string | null;
  sourceTestId: number | null;
  toeicPart: number | null;
  partIndex: number | null;
}

/** RNG có seed (mulberry32) để Daily Challenge và test lặp lại được. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const naturalOrder = (a: PoolItem, b: PoolItem) =>
  (a.sourceTestId ?? 0) - (b.sourceTestId ?? 0) ||
  (a.toeicPart ?? 0) - (b.toeicPart ?? 0) ||
  (a.partIndex ?? 0) - (b.partIndex ?? 0) ||
  a.id - b.id;

/**
 * Chọn `count` câu không trùng. `random`: xáo ngẫu nhiên; `sequential`: theo đề → Part → vị trí.
 * Sau khi chọn, các câu cùng nhóm (cùng đoạn văn/audio) được xếp cạnh nhau để đọc/nghe một lần.
 * `preferred`: id ưu tiên lấy trước (dạng đang yếu, câu chưa gặp).
 */
export function pickQuestions(
  pool: PoolItem[],
  count: number,
  order: 'random' | 'sequential',
  random: () => number,
  preferred: Set<number> = new Set(),
): number[] {
  const unique = [...new Map(pool.map((p) => [p.id, p])).values()];
  let chosen: PoolItem[];
  if (order === 'sequential') {
    chosen = [...unique].sort(naturalOrder).slice(0, count);
  } else {
    const first = shuffle(
      unique.filter((p) => preferred.has(p.id)),
      random,
    );
    const rest = shuffle(
      unique.filter((p) => !preferred.has(p.id)),
      random,
    );
    chosen = [...first, ...rest].slice(0, count);
  }
  return groupAdjacent(chosen, order === 'sequential').map((p) => p.id);
}

/** Gom câu cùng nhóm lại gần nhau, giữ thứ tự xuất hiện của nhóm đầu tiên. */
function groupAdjacent(items: PoolItem[], sortInside: boolean): PoolItem[] {
  const byKey = new Map<string, PoolItem[]>();
  const order: string[] = [];
  for (const it of items) {
    const key = it.groupKey ?? `q${it.id}`;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      order.push(key);
    }
    byKey.get(key)!.push(it);
  }
  return order.flatMap((k) => {
    const g = byKey.get(k)!;
    return sortInside || g.length > 1 ? [...g].sort(naturalOrder) : g;
  });
}

/** Giờ làm bài tự động theo số câu từng Part. */
export function autoTimeLimitSeconds(parts: (number | null)[]): number {
  const total = parts.reduce<number>(
    (s, p) => s + (SECONDS_PER_QUESTION[p ?? 5] ?? 40),
    0,
  );
  return Math.max(60, Math.ceil(total / 60) * 60);
}

/** Ngày theo giờ Việt Nam (UTC+7) dạng YYYY-MM-DD — mốc Daily Challenge. */
export function vietnamDate(now: Date): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Số nguyên từ chuỗi (seed Daily Challenge theo user + ngày). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Part trọng tâm Daily Challenge theo ngày (xoay vòng): nghe 1–4, đọc 5–7. */
export function dailyFocusParts(date: string): {
  listening: number;
  reading: number;
} {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return { listening: [2, 3, 4, 1][day % 4], reading: [5, 7, 6][day % 3] };
}

/**
 * Dạng yếu: (part, category) có tỉ lệ sai cao (đủ ≥ 3 lần trả lời). Trả về key `part:category`
 * sắp yếu nhất trước.
 */
export function weakCategories(
  stats: { part: number; category: string; total: number; wrong: number }[],
): string[] {
  return stats
    .filter((s) => s.total >= 3 && s.wrong / s.total >= 0.4)
    .sort((a, b) => b.wrong / b.total - a.wrong / a.total || b.total - a.total)
    .map((s) => `${s.part}:${s.category}`);
}
