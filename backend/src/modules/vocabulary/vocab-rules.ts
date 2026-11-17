/**
 * Quy tắc thuần của Từ vựng (V06 SRS SM-2, chuẩn hóa/tra từ, V02/V04 gắn Part và cấp độ) — có unit test.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy'];
export type CardState = 'new' | 'learning' | 'review' | 'mastered';

export const SRS = {
  /** "Quên": hỏi lại sau N phút trong cùng phiên */
  againMinutes: 10,
  minEase: 1.3,
  /** Khoảng cách ≥ N ngày → "Đã thuộc" */
  masteredDays: 21,
  maxIntervalDays: 365,
  defaultNewPerDay: 20,
} as const;

export interface CardSrs {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface CardNext extends CardSrs {
  state: CardState;
  dueAt: Date;
}

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * SM-2 rút gọn kiểu Anki:
 * - Quên: về học lại, hỏi lại sau 10 phút, ease −0.2, tăng số lần quên.
 * - Khó: khoảng × 1.2 (ít nhất 1 ngày), ease −0.15.
 * - Nhớ: lần đầu 1 ngày, lần hai 3 ngày, sau đó khoảng × ease.
 * - Dễ: lần đầu 4 ngày, sau đó khoảng × ease × 1.3, ease +0.15.
 */
export function schedule(card: CardSrs, rating: Rating, now: Date): CardNext {
  let { ease, intervalDays, repetitions, lapses } = card;
  if (rating === 'again') {
    ease = Math.max(SRS.minEase, ease - 0.2);
    lapses += card.repetitions > 0 ? 1 : 0;
    return {
      ease: round1(ease * 100) / 100,
      intervalDays: 0,
      repetitions: 0,
      lapses,
      state: 'learning',
      dueAt: new Date(now.getTime() + SRS.againMinutes * 60_000),
    };
  }
  if (rating === 'hard') {
    ease = Math.max(SRS.minEase, ease - 0.15);
    intervalDays = Math.max(1, intervalDays * 1.2);
  } else if (rating === 'good') {
    intervalDays =
      repetitions === 0 ? 1 : repetitions === 1 ? 3 : intervalDays * ease;
  } else {
    intervalDays = repetitions === 0 ? 4 : intervalDays * ease * 1.3;
    ease += 0.15;
  }
  intervalDays = Math.min(SRS.maxIntervalDays, round1(intervalDays));
  repetitions += 1;
  return {
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    repetitions,
    lapses,
    state: intervalDays >= SRS.masteredDays ? 'mastered' : 'review',
    dueAt: new Date(now.getTime() + intervalDays * DAY),
  };
}

/** Khoảng cách sẽ có cho từng nút (hiện trên nút: "10 phút", "3 ngày"...). */
export function previewIntervals(
  card: CardSrs,
  now: Date,
): Record<Rating, string> {
  const out = {} as Record<Rating, string>;
  for (const r of RATINGS) {
    const next = schedule(card, r, now);
    out[r] =
      next.intervalDays === 0
        ? `${SRS.againMinutes} phút`
        : formatDays(next.intervalDays);
  }
  return out;
}

export function formatDays(d: number): string {
  if (d < 30) return `${Math.round(d)} ngày`;
  if (d < 365) return `${Math.round(d / 30)} tháng`;
  return '1 năm';
}

/** Khóa tra từ: thường, gọn khoảng trắng, bỏ dấu câu đầu/cuối. */
export function wordKey(word: string): string {
  return word
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Các dạng gốc có thể của một từ (đơn giản: bỏ -s/-es/-ed/-ing/-ies/-ied) để tra kho. */
export function lemmaCandidates(word: string): string[] {
  const k = wordKey(word);
  const out = new Set<string>([k]);
  if (k.includes(' ')) return [...out];
  const add = (w: string) => w.length >= 2 && out.add(w);
  if (k.endsWith('ies')) add(k.slice(0, -3) + 'y');
  if (k.endsWith('ied')) add(k.slice(0, -3) + 'y');
  if (k.endsWith('es')) add(k.slice(0, -2));
  if (k.endsWith('s') && !k.endsWith('ss')) add(k.slice(0, -1));
  if (k.endsWith('ed')) {
    add(k.slice(0, -2));
    add(k.slice(0, -1));
    if (/(.)\1ed$/.test(k)) add(k.slice(0, -3));
  }
  if (k.endsWith('ing')) {
    add(k.slice(0, -3));
    add(k.slice(0, -3) + 'e');
    if (/(.)\1ing$/.test(k)) add(k.slice(0, -4));
  }
  return [...out];
}

// ---------- Gắn nhãn Part / cấp độ (V02/V04) ----------

export type Level = 'basic' | 'intermediate' | 'advanced';
export const LEVELS: Level[] = ['basic', 'intermediate', 'advanced'];

/** Tách văn bản thành các từ thường (bỏ HTML). */
export function tokenize(text: string): string[] {
  return (
    text
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase()
      .match(/[a-z]+(?:'[a-z]+)?/g) ?? []
  );
}

/**
 * Đếm số lần xuất hiện của mỗi từ khóa (kể cả cụm nhiều từ và dạng biến đổi -s/-ed/-ing) trong
 * từng Part. `texts`: [part, text][]. Trả về key → mảng 8 phần tử (chỉ số = Part).
 */
export function countByPart(
  keys: string[],
  texts: [number, string][],
): Map<string, number[]> {
  const single = new Map<string, string>(); // dạng → key
  const multi: { key: string; tokens: string[] }[] = [];
  for (const k of keys) {
    const toks = k.split(' ');
    if (toks.length > 1) multi.push({ key: k, tokens: toks });
    else {
      for (const form of inflections(k))
        if (!single.has(form)) single.set(form, k);
    }
  }
  const counts = new Map<string, number[]>(
    keys.map((k) => [k, [0, 0, 0, 0, 0, 0, 0, 0]]),
  );
  for (const [part, text] of texts) {
    if (part < 1 || part > 7) continue;
    const toks = tokenize(text);
    for (let i = 0; i < toks.length; i++) {
      const k = single.get(toks[i]);
      if (k) counts.get(k)![part]++;
    }
    if (multi.length) {
      const joined = ` ${toks.join(' ')} `;
      for (const m of multi) {
        const needle = ` ${m.tokens.join(' ')} `;
        let idx = joined.indexOf(needle);
        while (idx >= 0) {
          counts.get(m.key)![part]++;
          idx = joined.indexOf(needle, idx + 1);
        }
      }
    }
  }
  return counts;
}

function inflections(w: string): string[] {
  const out = [w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`];
  if (w.endsWith('e')) out.push(`${w.slice(0, -1)}ing`);
  if (w.endsWith('y')) out.push(`${w.slice(0, -1)}ies`, `${w.slice(0, -1)}ied`);
  return out;
}

/**
 * Part = nơi từ xuất hiện nhiều nhất (chưa xuất hiện → null). Cấp độ theo độ phổ biến: chia ba
 * theo tổng số lần xuất hiện (phổ biến nhất → Cơ bản); 600 từ TOEIC không xếp Nâng cao.
 */
export function assignTags(
  entries: { key: string; source: string }[],
  counts: Map<string, number[]>,
): Map<string, { part: number | null; level: Level; frequency: number }> {
  const totals = entries.map((e) => ({
    e,
    total: (counts.get(e.key) ?? []).reduce((a, b) => a + b, 0),
  }));
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const n = sorted.length || 1;
  const rank = new Map(sorted.map((t, i) => [t.e.key, i / n]));
  const out = new Map<
    string,
    { part: number | null; level: Level; frequency: number }
  >();
  for (const { e, total } of totals) {
    const c = counts.get(e.key) ?? [];
    let part: number | null = null;
    let best = 0;
    for (let p = 1; p <= 7; p++) {
      if ((c[p] ?? 0) > best) {
        best = c[p];
        part = p;
      }
    }
    const r = rank.get(e.key) ?? 1;
    let level: Level =
      total === 0
        ? 'advanced'
        : r < 1 / 3
          ? 'basic'
          : r < 2 / 3
            ? 'intermediate'
            : 'advanced';
    if (e.source === 'toeic600' && level === 'advanced') level = 'intermediate';
    out.set(e.key, { part, level, frequency: total });
  }
  return out;
}

/** Câu chứa từ trong một đoạn văn (để lưu làm ngữ cảnh). */
export function sentenceAround(text: string, word: string): string | null {
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.split(/(?<=[.!?])\s+/);
  const k = wordKey(word);
  const hit = sentences.find((s) => s.toLowerCase().includes(k));
  return hit ? hit.slice(0, 300) : null;
}

// ---------- Từ quan trọng trong một bài (D17) ----------

/** Từ chức năng / quá phổ biến: không đưa vào danh sách "từ quan trọng" khi lấy từ bộ flashcard. */
const COMMON_WORDS = new Set(
  (
    'about above after again also always another anything around because been before being below ' +
    'between both could didn doesn does doing done down during each even every from have having here ' +
    'into just know like make many more most much must need never next only other over really right ' +
    'same should some still such sure take than that their them then there these they thing think ' +
    'this those through time very want well were what when where which while will with would your ' +
    'yours yeah okay thank thanks hello please good great today tomorrow yesterday morning afternoon ' +
    'evening sorry going come came went said says tell told give gave look looks looking people'
  ).split(' '),
);

export interface ExtractCandidate {
  /** Vị trí từ đầu tiên trong bài (để xếp theo thứ tự xuất hiện) */
  index: number;
  /** Dạng gặp trong bài, vd. "parked" cho từ gốc "park" */
  surface: string;
  /** Số từ của cụm (1–3) */
  size: number;
}

/**
 * Ứng viên tra kho cho một đoạn văn: các dạng gốc của từng từ (bỏ -s/-ed/-ing) và các cụm
 * 2–3 từ liền nhau. Mỗi khóa giữ lần xuất hiện đầu tiên.
 */
export function extractCandidates(text: string): Map<string, ExtractCandidate> {
  const toks = tokenize(text);
  const out = new Map<string, ExtractCandidate>();
  const add = (key: string, c: ExtractCandidate) => {
    if (key && !out.has(key)) out.set(key, c);
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.length >= 3) {
      for (const k of lemmaCandidates(t))
        add(k, { index: i, surface: t, size: 1 });
    }
    if (i + 1 < toks.length) {
      const surface = `${t} ${toks[i + 1]}`;
      add(surface, { index: i, surface, size: 2 });
    }
    if (i + 2 < toks.length) {
      const surface = `${t} ${toks[i + 1]} ${toks[i + 2]}`;
      add(surface, { index: i, surface, size: 3 });
    }
  }
  return out;
}

/** Từ có nên lấy từ bộ flashcard không (bỏ từ ngắn và từ quá phổ biến). */
export function isContentKey(key: string): boolean {
  if (key.includes(' ')) return true;
  return key.length >= 4 && !COMMON_WORDS.has(key);
}

export interface RankableWord {
  key: string;
  index: number;
  size: number;
  part: number | null;
  level: string | null;
}

/**
 * Chọn tối đa `limit` từ quan trọng: ưu tiên từ gắn đúng Part của bài, cấp độ cao hơn, cụm
 * nhiều từ; mỗi vị trí trong bài chỉ giữ một từ (vd. "parked" không ra cả "park" lẫn "parked").
 * Kết quả xếp theo thứ tự xuất hiện trong bài.
 */
export function rankExtracted<T extends RankableWord>(
  items: T[],
  part: number | undefined,
  limit: number,
): T[] {
  const levelScore: Record<string, number> = {
    advanced: 2,
    intermediate: 1,
    basic: 0,
  };
  const score = (w: T) =>
    (part && w.part === part ? 3 : 0) +
    (levelScore[w.level ?? ''] ?? 1) +
    (w.size > 1 ? 1 : 0);
  const sorted = [...items].sort(
    (a, b) => score(b) - score(a) || a.index - b.index,
  );
  const usedIndex = new Set<number>();
  const usedKey = new Set<string>();
  const picked: T[] = [];
  for (const w of sorted) {
    if (picked.length >= limit) break;
    if (usedKey.has(w.key)) continue;
    const span = Array.from({ length: w.size }, (_, i) => w.index + i);
    if (span.some((i) => usedIndex.has(i))) continue;
    span.forEach((i) => usedIndex.add(i));
    usedKey.add(w.key);
    picked.push(w);
  }
  return picked.sort((a, b) => a.index - b.index);
}

/** Câu (hoặc lượt nói) trong bài chứa dạng từ đã gặp, bỏ nhãn người nói "W1:". */
export function sentenceWith(text: string, surface: string): string | null {
  const lines = text
    .replace(/<[^>]+>/g, ' ')
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:\([A-D]\)|[A-Z][A-Za-z]?\d?:)\s*/, '').trim())
    .filter(Boolean);
  // surface chỉ gồm chữ thường, dấu ' và khoảng trắng (từ tokenize) nên không cần thoát ký tự
  const pattern = surface
    .replace(/[^a-z' ]/g, '')
    .split(' ')
    .join(String.raw`\s+`);
  const re = new RegExp(String.raw`\b` + pattern + String.raw`\b`, 'i');
  for (const line of lines) {
    for (const s of line.split(/(?<=[.!?])\s+/)) {
      if (re.test(s)) return s.slice(0, 300);
    }
  }
  return null;
}
