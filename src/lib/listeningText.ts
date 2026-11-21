/**
 * Xử lý văn bản cho "Luyện nghe từng bước" (D17): tách câu để học từng câu, chọn từ để điền,
 * gợi ý câu chứa đáp án, dạng câu hỏi Part 3/4. Chỉ dùng dữ liệu có sẵn của bài.
 */
import type { Part2CoachQuestion } from "@/types/part2Coach";

export type ChoiceLetter = "A" | "B" | "C" | "D";

export interface Choice {
  letter: ChoiceLetter;
  text: string;
  translation: string;
}

export interface StudySentence {
  key: string;
  text: string;
  /** Nhãn người nói, vd. "Nữ 1", "Nam" */
  speaker?: string;
  translation?: string;
  /** Bản dịch là của cả lượt nói (không tách được theo câu) */
  translationIsTurn?: boolean;
  /** Part 1: câu mô tả A–D */
  letter?: ChoiceLetter;
  isCorrect?: boolean;
}

const COMMON = new Set(
  (
    "about above after again also always another anything around because been before being below " +
    "between both could didn doesn does doing done down during each even every from have having here " +
    "into just know like make many more most much must need never next only other over really right " +
    "same should some still such sure take than that their them then there these they thing think " +
    "this those through time very want well were what when where which while will with would your " +
    "yours yeah okay thank thanks hello please today sorry going come came went said says tell told " +
    "give gave look looks looking people you're it's that's there's i'm we're they're don't can't i'll " +
    "we'll let's"
  ).split(" "),
);

/** Từ chung chung trong câu hỏi Part 3/4, không phải từ khóa cần nghe */
const QUESTION_GENERIC = new Set(
  (
    "what who where when why how which does do did is are was were will would the a an of to in on " +
    "for about most likely probably speaker speakers man woman men women talk talking conversation " +
    "according mentioned mention say says said listener listeners caller message they he she his her " +
    "their them it its be been being with at by from that this as or and has have had can could may " +
    "might should mean means imply implies suggest suggests indicate indicates purpose"
  ).split(" "),
);

export const normalizeWord = (w: string) =>
  w
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/'s$/, "");

/** Bỏ đuôi đơn giản để so khớp từ: -s, -es, -ed, -ing. */
export const stem = (w: string) => {
  const k = normalizeWord(w);
  if (k.length <= 4) return k;
  return k.replace(/(ies|ied)$/, "y").replace(/(ing|ed|es|s)$/, "");
};

export const isContentWord = (w: string) => {
  const k = normalizeWord(w);
  return k.length >= 4 && !COMMON.has(k);
};

const ABBR = /\b(Mr|Mrs|Ms|Dr|St|Ave|Inc|Ltd|Co|Jr|Sr|vs|etc|a\.m|p\.m)\./gi;

/** Tách đoạn thành câu, không cắt ở "Mr." hay "a.m.". */
export function splitSentences(text: string): string[] {
  const guarded = text.replace(ABBR, (m) => m.replace(/\./g, "§"));
  return guarded
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.replace(/§/g, ".").trim())
    .filter(Boolean);
}

export function speakerLabel(code: string): string {
  const m = code.trim().match(/^([A-Za-z]+)\s*(\d*)$/);
  if (!m) return code.trim();
  const who = m[1].toUpperCase();
  const base = who === "W" ? "Nữ" : who === "M" ? "Nam" : m[1];
  return m[2] ? `${base} ${m[2]}` : base;
}

const SPEAKER_RE = /^\s*([A-Za-z]{1,2}\d?)\s*:\s*/;

/** Part 3/4: tách transcript theo lượt nói rồi theo câu, ghép bản dịch tương ứng. */
export function buildPassageSentences(transcript = "", translation = ""): StudySentence[] {
  const enLines = transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const viLines = translation.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const sameLines = enLines.length === viLines.length;
  const out: StudySentence[] = [];
  enLines.forEach((line, li) => {
    const sp = line.match(SPEAKER_RE);
    const body = sp ? line.slice(sp[0].length) : line;
    const viLine = sameLines ? viLines[li] : undefined;
    const viBody = viLine ? viLine.replace(SPEAKER_RE, "") : undefined;
    const en = splitSentences(body);
    const vi = viBody ? splitSentences(viBody) : [];
    const perSentence = vi.length === en.length;
    en.forEach((text, si) => {
      out.push({
        key: `${li}-${si}`,
        text,
        speaker: sp ? speakerLabel(sp[1]) : undefined,
        translation: perSentence ? vi[si] : si === en.length - 1 ? viBody : undefined,
        translationIsTurn: !perSentence && en.length > 1 && si === en.length - 1 && !!viBody,
      });
    });
  });
  return out;
}

export function getChoices(q: Part2CoachQuestion): Choice[] {
  const all: Choice[] = [
    { letter: q.correctChoice.letter, text: q.correctChoice.text, translation: q.correctChoice.translation },
    ...q.distractors.map((d) => ({ letter: d.letter, text: d.text, translation: d.translation })),
  ];
  return all.filter((c) => c.text).sort((a, b) => a.letter.localeCompare(b.letter));
}

/** Part 1: 4 câu mô tả A–D là 4 câu để học. */
export function buildPart1Sentences(q: Part2CoachQuestion): StudySentence[] {
  return getChoices(q).map((c) => ({
    key: `${q.id}-${c.letter}`,
    text: c.text,
    translation: c.translation,
    letter: c.letter,
    isCorrect: c.letter === q.correctChoice.letter,
  }));
}

/** Chia câu thành các phần từ / khoảng trắng-dấu câu để hiện ô điền. */
export function tokenizeForBlanks(text: string): string[] {
  return text.match(/[A-Za-z0-9’']+(?:[-’'][A-Za-z0-9]+)*|[^A-Za-z0-9’']+/g) ?? [];
}

/**
 * Chọn vị trí từ cần điền trong câu: ưu tiên từ trong danh sách từ vựng của bài, sau đó là từ
 * nội dung dài nhất. Câu ≥ 8 từ có 2 ô, ngắn hơn có 1 ô.
 */
export function pickBlanks(text: string, preferred: string[] = []): number[] {
  const tokens = tokenizeForBlanks(text);
  const words = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => /[A-Za-z]/.test(t));
  const max = words.length >= 8 ? 2 : 1;
  const pref = new Set(preferred.flatMap((p) => p.split(/\s+/)).map(stem));
  // Từ viết hoa (tên riêng, đầu câu) không làm ô điền, trừ khi không còn từ nào khác
  const candidates = words.filter(({ t }) => isContentWord(t) && !/^[A-Z]/.test(t));
  const pool = candidates.length > 0 ? candidates : words.filter(({ t }) => isContentWord(t));
  const ranked = [...pool].sort((a, b) => {
    const pa = pref.has(stem(a.t)) ? 1 : 0;
    const pb = pref.has(stem(b.t)) ? 1 : 0;
    return pb - pa || b.t.length - a.t.length || a.i - b.i;
  });
  return ranked
    .slice(0, max)
    .map((w) => w.i)
    .sort((a, b) => a - b);
}

export const isBlankCorrect = (answer: string, expected: string) =>
  normalizeWord(answer) !== "" && normalizeWord(answer) === normalizeWord(expected);

/**
 * Gợi ý câu có thể chứa đáp án: câu có nhiều từ nội dung trùng với đáp án đúng nhất.
 * Chỉ trả về khi trùng ≥ 2 từ (hoặc trùng hết khi đáp án chỉ có 1 từ nội dung); không chắc thì -1.
 */
export function findAnswerSentence(sentences: string[], answer: string): number {
  const target = Array.from(new Set(answer.split(/\s+/).filter(isContentWord).map(stem)));
  if (target.length === 0) return -1;
  let best = -1;
  let bestScore = 0;
  sentences.forEach((s, i) => {
    const words = new Set(s.split(/\s+/).map(stem));
    const score = target.filter((t) => words.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  const enough = bestScore >= 2 || (target.length === 1 && bestScore === 1);
  return enough ? best : -1;
}

export interface QuestionCategory {
  label: string;
  tip: string;
}

/** Dạng câu hỏi Part 3/4 theo câu chữ của câu hỏi (cùng nhóm với bộ gắn nhãn ở backend). */
export function questionCategory(question: string): QuestionCategory {
  const q = question.toLowerCase();
  if (/look at the graphic/.test(q))
    return { label: "Câu hỏi biểu đồ", tip: "Nhìn trước bảng/biểu đồ, nghe thông tin nối với một ô trong hình (thường không đọc thẳng đáp án)." };
  if (/mean when|imply when|why does .* say|when (?:he|she) says|says?, "/.test(q))
    return { label: "Ý của câu nói", tip: "Nghe ngữ cảnh trước và sau câu được trích để hiểu người nói muốn gì, không dịch từng chữ." };
  if (/main (?:topic|purpose|subject)|mainly (?:discuss|about)|purpose of|why (?:is|has|did|does) .* (?:calling|call|come|visit|contact|writing)|what is .* (?:discussing|about)|talk mainly/.test(q))
    return { label: "Chủ đề / mục đích", tip: "Đáp án thường nằm ở 1–2 câu đầu của bài." };
  if (/who (?:is|are|most likely)|where (?:do|does|is|are) .* (?:work|most likely)|what (?:is|are) .* (?:job|profession|occupation)|what kind of business|what industry|where .* take place|who is the/.test(q))
    return { label: "Người nói / nơi chốn", tip: "Nghe từ chỉ nghề nghiệp, nơi làm việc hoặc tình huống ở đầu bài." };
  if (/(?:do|does|will) .* (?:next|do next)|what will .* (?:probably|most likely)? ?(?:do|happen)|going to do/.test(q))
    return { label: "Hành động tiếp theo", tip: "Đáp án thường ở cuối bài: I'll..., Let me..., I'm going to..." };
  if (/ask|request|suggest|recommend|offer|advise|remind|invite|want .* to do/.test(q))
    return { label: "Yêu cầu / đề nghị", tip: "Nghe các mẫu: Could you..., Why don't you..., I suggest..., Would you like..." };
  if (/problem|concern|worried|issue|complain/.test(q))
    return { label: "Vấn đề", tip: "Nghe các từ báo hiệu: but, unfortunately, I'm afraid, the problem is..." };
  return { label: "Chi tiết", tip: "Nghe đúng từ khóa của câu hỏi; đáp án thường được nói bằng từ khác (diễn đạt lại)." };
}

/** Từ khóa nên nghe trong câu hỏi (bỏ từ để hỏi và từ chung chung). */
export function questionKeywords(question: string): string[] {
  return tokenizeForBlanks(question)
    .filter((t) => /[A-Za-z]/.test(t))
    .filter((t) => {
      const k = normalizeWord(t);
      return k.length >= 3 && !QUESTION_GENERIC.has(k) && !COMMON.has(k);
    })
    .map((t) => normalizeWord(t));
}
