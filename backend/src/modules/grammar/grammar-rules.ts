/**
 * Quy tắc thuần của module grammar (có unit test): cấp độ (G05), trạng thái chủ điểm (G01–G04),
 * chấm bài tập chủ điểm (G03), lịch ôn theo chủ điểm (G08), gắn chủ điểm cho câu TOEIC.
 */

export type Level = 'basic' | 'intermediate' | 'advanced';
export const LEVELS: Level[] = ['basic', 'intermediate', 'advanced'];
export const LEVEL_LABELS: Record<Level, string> = {
  basic: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};
export const DEFAULT_LEVEL: Level = 'intermediate';

export type ExerciseKind = 'choice' | 'fill' | 'error';
export const EXERCISE_KINDS: ExerciseKind[] = ['choice', 'fill', 'error'];

export type TopicStatus = 'not_started' | 'learning' | 'learned' | 'mastered';

export const LESSON_SECTIONS = [
  'when_to_use',
  'structure',
  'examples',
  'mistakes',
  'signals',
] as const;
export type LessonSection = (typeof LESSON_SECTIONS)[number];

// ---------- Ngưỡng (chủ dự án chốt 14/11/2026) ----------
export const LEARNED_EXERCISE_PERCENT = 70;
export const MASTERED_TOEIC_PERCENT = 75;
export const MASTERED_MIN_TOEIC = 10;
export const LEVEL_UP_PERCENT = 80;
export const LEVEL_DOWN_PERCENT = 50;
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
export const REVIEW_GOOD_PERCENT = 80;
export const REVIEW_KEEP_PERCENT = 60;
export const REVIEW_TOPICS_PER_SESSION = 3;
export const REVIEW_ITEMS_PER_TOPIC = 5;
export const SECONDS_PER_REVIEW_ITEM = 40;
export const EXERCISE_COUNTS = [10, 15, 20];
export const TOEIC_COUNTS = [5, 10, 15, 20];

/** Cấp gợi ý theo điểm TOEIC ước lượng: < 450 Cơ bản, 450–750 Trung cấp, > 750 Nâng cao. */
export function levelForScore(score: number): Level {
  if (score < 450) return 'basic';
  if (score <= 750) return 'intermediate';
  return 'advanced';
}

/** Độ khó câu TOEIC tương ứng cấp (Dễ / Trung bình / Khó). */
export function difficultyForLevel(level: Level): 'easy' | 'medium' | 'hard' {
  return level === 'basic' ? 'easy' : level === 'advanced' ? 'hard' : 'medium';
}

export interface LevelSources {
  /** Điểm ước lượng gần nhất (Full Test đủ 7 Part / bài kiểm tra trình độ) */
  estimate: { total: number; date: string } | null;
  /** Lựa chọn tay ở hộp "Bạn đang ở mức nào?" */
  manual: { level: Level; setAt: Date } | null;
  /** Điểm xuất phát của lộ trình */
  roadmapScore: number | null;
}

export interface SuggestedLevel {
  level: Level;
  source: 'estimate' | 'manual' | 'roadmap' | 'default';
  score: number | null;
  date: string | null;
}

/**
 * Cấp gợi ý: lựa chọn tay dùng tới khi có điểm ước lượng MỚI HƠN lựa chọn đó;
 * không có lựa chọn tay thì điểm ước lượng → điểm xuất phát lộ trình → Cơ bản.
 */
export function suggestedLevel(src: LevelSources): SuggestedLevel {
  const est = src.estimate;
  if (
    src.manual &&
    (!est || new Date(est.date).getTime() <= src.manual.setAt.getTime())
  ) {
    return {
      level: src.manual.level,
      source: 'manual',
      score: null,
      date: src.manual.setAt.toISOString(),
    };
  }
  if (est)
    return {
      level: levelForScore(est.total),
      source: 'estimate',
      score: est.total,
      date: est.date,
    };
  if (src.roadmapScore !== null)
    return {
      level: levelForScore(src.roadmapScore),
      source: 'roadmap',
      score: src.roadmapScore,
      date: null,
    };
  return { level: 'basic', source: 'default', score: null, date: null };
}

/** Cấp có câu gần cấp mong muốn nhất (ưu tiên đúng cấp, rồi cấp thấp hơn, rồi cao hơn). */
export function nearestAvailableLevel(
  wanted: Level,
  available: Level[],
): Level | null {
  if (available.includes(wanted)) return wanted;
  const i = LEVELS.indexOf(wanted);
  const order = [i - 1, i + 1, i - 2, i + 2]
    .filter((x) => x >= 0 && x < LEVELS.length)
    .map((x) => LEVELS[x]);
  return order.find((l) => available.includes(l)) ?? null;
}

// ---------- Trạng thái chủ điểm ----------

export interface TopicProgressInput {
  opened: boolean;
  answeredAny: boolean;
  lessonDone: boolean;
  hasExercises: boolean;
  /** Có lượt bài tập chủ điểm đạt ≥ 70% */
  passedExercise: boolean;
  hasToeic: boolean;
  /** Câu TOEIC gần nhất của chủ điểm (mới nhất trước) — đúng/sai */
  recentToeic: boolean[];
}

export function toeicRecentAccuracy(recent: boolean[]): {
  answered: number;
  percent: number | null;
} {
  const last = recent.slice(0, MASTERED_MIN_TOEIC);
  if (last.length < MASTERED_MIN_TOEIC)
    return { answered: recent.length, percent: null };
  const ok = last.filter(Boolean).length;
  return {
    answered: recent.length,
    percent: Math.round((ok / last.length) * 100),
  };
}

/**
 * - Chưa học: chưa mở, chưa làm câu nào.
 * - Đang học: đã mở bài học hoặc làm ít nhất 1 câu.
 * - Đã học: đọc xong bài học VÀ có lượt bài tập ≥ 70% (chủ điểm chưa có bài tập thì bỏ điều kiện này).
 * - Thành thạo: Đã học VÀ ≥ 75% trên 10 câu TOEIC gần nhất (không có câu TOEIC → tối đa Đã học).
 */
export function topicStatus(p: TopicProgressInput): TopicStatus {
  const learned = p.lessonDone && (!p.hasExercises || p.passedExercise);
  if (learned) {
    const acc = toeicRecentAccuracy(p.recentToeic).percent;
    if (p.hasToeic && acc !== null && acc >= MASTERED_TOEIC_PERCENT)
      return 'mastered';
    return 'learned';
  }
  if (p.opened || p.answeredAny || p.lessonDone) return 'learning';
  return 'not_started';
}

// ---------- Bài tập chủ điểm ----------

/** Bỏ khác biệt hoa/thường, khoảng trắng thừa, dấu câu cuối, nháy cong. */
export function normalizeFill(s: string): string {
  return s
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?;:]+|[\s.,!?;:]+$/g, '')
    .trim();
}

export interface ExerciseKey {
  kind: ExerciseKind;
  answerIndex: number | null;
  acceptedAnswers: string[];
}

export function checkExercise(
  ex: ExerciseKey,
  resp: { choice?: number | null; text?: string | null },
): boolean {
  if (ex.kind === 'fill') {
    const t = normalizeFill(resp.text ?? '');
    return t !== '' && ex.acceptedAnswers.some((a) => normalizeFill(a) === t);
  }
  return (
    resp.choice !== undefined &&
    resp.choice !== null &&
    ex.answerIndex === resp.choice
  );
}

/** Tách 4 phần gạch chân của câu "tìm lỗi sai": "The [[report]] [[were]] ...". */
export function errorSegments(prompt: string): string[] {
  return [...prompt.matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1]);
}

/** Kiểm tra nội dung câu bài tập do admin soạn; trả lỗi tiếng Việt hoặc null. */
export function validateExercise(ex: {
  kind: string;
  prompt: string;
  options: string[];
  answerIndex: number | null;
  acceptedAnswers: string[];
}): string | null {
  if (!EXERCISE_KINDS.includes(ex.kind as ExerciseKind))
    return 'Loại câu không hợp lệ';
  if (!ex.prompt.trim()) return 'Thiếu nội dung câu';
  if (ex.kind === 'choice') {
    if (ex.options.length < 2 || ex.options.length > 4)
      return 'Câu chọn đáp án cần 2–4 lựa chọn';
    if (ex.options.some((o) => !o.trim())) return 'Có lựa chọn trống';
    if (
      ex.answerIndex === null ||
      ex.answerIndex < 0 ||
      ex.answerIndex >= ex.options.length
    )
      return 'Chưa chọn đáp án đúng';
  }
  if (ex.kind === 'fill') {
    if (!ex.prompt.includes('___')) return 'Câu điền từ cần có chỗ trống ___';
    if (!ex.acceptedAnswers.some((a) => a.trim()))
      return 'Cần ít nhất một đáp án đúng';
  }
  if (ex.kind === 'error') {
    if (errorSegments(ex.prompt).length !== 4)
      return 'Câu tìm lỗi sai cần đúng 4 phần đánh dấu [[...]]';
    if (ex.answerIndex === null || ex.answerIndex < 0 || ex.answerIndex > 3)
      return 'Chưa chọn phần sai';
  }
  return null;
}

/**
 * Chọn câu cho lượt bài tập: câu chưa làm trước (ngẫu nhiên); thiếu thì bù câu đã làm,
 * ưu tiên câu từng sai. `exhausted` = không còn câu mới ở cấp này.
 */
export function pickExercises(
  pool: { id: number; seen: boolean; wrong: boolean }[],
  count: number,
  rand: () => number,
): { ids: number[]; exhausted: boolean } {
  const shuffle = <T>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const fresh = shuffle(pool.filter((p) => !p.seen));
  const wrong = shuffle(pool.filter((p) => p.seen && p.wrong));
  const rest = shuffle(pool.filter((p) => p.seen && !p.wrong));
  const ids = [...fresh, ...wrong, ...rest].slice(0, count).map((p) => p.id);
  return { ids, exhausted: fresh.length < count };
}

/**
 * Gợi ý lên/xuống cấp sau lượt bài tập: lên khi lượt này và lượt trước cùng cấp đều ≥ 80%;
 * xuống khi lượt này < 50%. Còn lại không gợi ý.
 */
export function levelHint(
  level: Level,
  percent: number,
  previousSameLevelPercent: number | null,
): { type: 'up' | 'down'; to: Level | null } | null {
  const i = LEVELS.indexOf(level);
  if (
    percent >= LEVEL_UP_PERCENT &&
    previousSameLevelPercent !== null &&
    previousSameLevelPercent >= LEVEL_UP_PERCENT &&
    i < LEVELS.length - 1
  )
    return { type: 'up', to: LEVELS[i + 1] };
  if (percent < LEVEL_DOWN_PERCENT)
    return { type: 'down', to: i > 0 ? LEVELS[i - 1] : null };
  return null;
}

// ---------- Lịch ôn theo chủ điểm (G08) ----------

export interface ReviewState {
  step: number | null;
  due: string | null; // YYYY-MM-DD
  goodStreak: number;
  graduated: boolean;
}

/** Ngày theo giờ Việt Nam (YYYY-MM-DD). */
export function vnDate(d: Date): string {
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Chủ điểm có lỗi chưa sửa mà chưa vào lịch (hoặc đã "Đã vững") → vào lịch nấc 1 ngày,
 * hạn = ngày hôm sau. Đang trong lịch thì giữ nguyên.
 */
export function enterSchedule(
  s: ReviewState,
  hasOpenMistakes: boolean,
  today: string,
): ReviewState | null {
  if (!hasOpenMistakes) return null;
  if (s.step !== null && !s.graduated) return null;
  return {
    step: 0,
    due: addDays(today, REVIEW_INTERVALS[0]),
    goodStreak: 0,
    graduated: false,
  };
}

/**
 * Sau khi ôn đủ 5 câu của chủ điểm: ≥ 80% lên nấc, 60–79% giữ nấc, < 60% về nấc 1 ngày.
 * Rời lịch ("Đã vững") khi mọi lỗi đã sửa và 2 lần ôn liên tiếp ≥ 80%.
 * Phiên "Ôn thêm" (chưa đến hạn) không đổi lịch, trừ khi < 60%.
 */
export function afterReview(
  s: ReviewState,
  percent: number,
  allFixed: boolean,
  today: string,
  extra: boolean,
): ReviewState {
  const step = s.step ?? 0;
  if (extra && percent >= REVIEW_KEEP_PERCENT) return s;
  if (percent < REVIEW_KEEP_PERCENT) {
    return {
      step: 0,
      due: addDays(today, REVIEW_INTERVALS[0]),
      goodStreak: 0,
      graduated: false,
    };
  }
  const good = percent >= REVIEW_GOOD_PERCENT;
  const goodStreak = good ? s.goodStreak + 1 : 0;
  if (allFixed && goodStreak >= 2) {
    return { step: null, due: null, goodStreak, graduated: true };
  }
  const next = good ? Math.min(step + 1, REVIEW_INTERVALS.length - 1) : step;
  return {
    step: next,
    due: addDays(today, REVIEW_INTERVALS[next]),
    goodStreak,
    graduated: false,
  };
}

/** Thứ tự chủ điểm đến hạn: quá hạn lâu nhất trước, bằng nhau thì nhiều lỗi chưa sửa hơn trước. */
export function orderDueTopics<T extends { due: string; open: number }>(
  topics: T[],
): T[] {
  return [...topics].sort((a, b) =>
    a.due === b.due ? b.open - a.open : a.due.localeCompare(b.due),
  );
}

/** XP: lượt bài tập như Quiz (tối thiểu 10, 5 XP/câu đúng); phiên ôn như ôn từ vựng (tối thiểu 10, 2 XP/câu). */
export function exerciseXp(correct: number): number {
  return Math.max(10, correct * 5);
}
export function reviewXp(answered: number): number {
  return answered === 0 ? 0 : Math.max(10, answered * 2);
}

// ---------- Gắn chủ điểm cho câu TOEIC ----------

const RELATIVE = new Set(['who', 'whom', 'whose', 'which', 'that', 'where']);
const NOUN_CLAUSE = new Set([
  'what',
  'whatever',
  'whether',
  'whoever',
  'whichever',
  'how',
  'why',
]);
const CONJ_ADV = new Set([
  'however',
  'therefore',
  'moreover',
  'furthermore',
  'although',
  'though',
  'because',
  'since',
  'unless',
  'while',
  'whereas',
  'despite',
  'nevertheless',
  'otherwise',
  'consequently',
  'meanwhile',
  'instead',
  'so',
  'but',
  'and',
  'or',
  'yet',
  'once',
  'until',
  'whenever',
  'even',
  'as',
  'besides',
  'thus',
  'if',
]);
const PREPOSITIONS = new Set([
  'in',
  'on',
  'at',
  'by',
  'for',
  'during',
  'within',
  'until',
  'since',
  'from',
  'to',
  'with',
  'without',
  'among',
  'between',
  'about',
  'above',
  'below',
  'over',
  'under',
  'through',
  'throughout',
  'into',
  'onto',
  'toward',
  'towards',
  'upon',
  'of',
  'off',
  'out',
  'across',
  'along',
  'beside',
  'beyond',
  'near',
  'past',
  'per',
  'regarding',
  'concerning',
  'following',
  'prior',
  'due',
  'according',
  'except',
  'like',
  'unlike',
  'against',
  'after',
  'before',
  'behind',
  'around',
]);
const PERSONAL = new Set([
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'we',
  'us',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'i',
  'me',
  'my',
  'mine',
  'myself',
]);

const firstWord = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .split(/\s+/)[0]
    ?.replace(/[^a-z']/g, '') ?? '';
const words = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z']/g, ''))
    .filter(Boolean);

/** Slug của 18 chủ điểm mặc định (khớp dữ liệu nạp trong migration). */
export const TOPIC = {
  wordForm: 'tu-loai',
  nouns: 'danh-tu-mao-tu',
  pronouns: 'dai-tu',
  basicTenses: 'cac-thi-co-ban',
  perfect: 'thi-hoan-thanh',
  agreement: 'hoa-hop-chu-ngu-dong-tu',
  passive: 'cau-bi-dong',
  gerundInf: 'danh-dong-tu-dong-tu-nguyen-mau',
  participle: 'phan-tu-lam-tinh-tu',
  comparison: 'so-sanh',
  prepositions: 'gioi-tu',
  conjunctions: 'lien-tu-trang-tu-lien-ket',
  relative: 'menh-de-quan-he',
  conditional: 'cau-dieu-kien',
  nounClause: 'menh-de-danh-tu-cau-gian-tiep',
  inversion: 'dao-ngu-cau-nhan-manh',
  subjunctive: 'gia-dinh-cau-truc-trang-trong',
  cohesion: 'tu-noi-chen-cau-part-6',
} as const;

/**
 * Chủ điểm chính của một câu Part 5/6 từ nhãn dạng câu + 4 lựa chọn (+ nội dung câu).
 * Câu "Từ vựng" (hoặc chưa có nhãn) → null. Nhãn thô, admin rà và sửa sau.
 */
export function grammarTopicFor(
  category: string | null,
  options: string[],
  questionText: string | null,
): string | null {
  const opts = options.map((o) => o.trim()).filter(Boolean);
  const firsts = opts.map(firstWord);
  const text = (questionText ?? '').toLowerCase();
  switch (category) {
    case 'sentence_insertion':
      return TOPIC.cohesion;
    case 'pronoun': {
      if (firsts.some((w) => RELATIVE.has(w) && w !== 'that'))
        return TOPIC.relative;
      return TOPIC.pronouns;
    }
    case 'prep_conj': {
      if (firsts.filter((w) => RELATIVE.has(w)).length >= 2)
        return TOPIC.relative;
      if (firsts.some((w) => NOUN_CLAUSE.has(w))) return TOPIC.nounClause;
      const preps = firsts.filter((w) => PREPOSITIONS.has(w)).length;
      const conjs = firsts.filter((w) => CONJ_ADV.has(w)).length;
      if (preps >= opts.length - 1 && conjs <= 1) return TOPIC.prepositions;
      return TOPIC.conjunctions;
    }
    case 'verb_tense': {
      const all = opts.map((o) => o.toLowerCase());
      if (
        /\b(recommend|suggest|request|insist|require|ask|propose|demand)(s|ed|ing)?\b.*\bthat\b/.test(
          text,
        ) ||
        /\b(essential|imperative|vital|necessary|important) that\b/.test(text)
      )
        return TOPIC.subjunctive;
      if (
        /\bif\b|\bunless\b|\bhad\b.*\b(not )?\w+ed\b,|\bwere\b/.test(text) &&
        all.some((o) => /\bwould\b|\bwill\b|\bhad\b/.test(o))
      )
        return TOPIC.conditional;
      if (
        all.some((o) => /^to \w+/.test(o)) &&
        all.some((o) => /ing\b/.test(o))
      )
        return TOPIC.gerundInf;
      const passive = all.filter((o) =>
        /\b(is|are|was|were|be|been|being)\s+\w+(ed|en|wn|ne|t)\b/.test(o),
      ).length;
      if (passive >= 1 && passive <= 3) return TOPIC.passive;
      if (
        all.filter((o) => /\b(have|has|had)\s+(been\s+)?\w+/.test(o)).length >=
        2
      )
        return TOPIC.perfect;
      const sg = all.filter((o) => /^(is|was|has|does)$|^\w+s$/.test(o)).length;
      const pl = all.filter((o) => /^(are|were|have|do)$/.test(o)).length;
      if (sg >= 1 && pl >= 1 && opts.every((o) => words(o).length === 1))
        return TOPIC.agreement;
      return TOPIC.basicTenses;
    }
    case 'word_form': {
      const all = opts.map((o) => o.toLowerCase());
      if (
        all.some((o) => /^(more|most)\s/.test(o) || /\w(er|est)$/.test(o)) &&
        all.filter((o) => /^(more|most)\s|\w(er|est)$/.test(o)).length >= 2
      )
        return TOPIC.comparison;
      const ing = all.filter((o) => /ing$/.test(o)).length;
      const ed = all.filter((o) => /ed$/.test(o)).length;
      if (ing >= 1 && ed >= 1 && all.length - ing - ed <= 2)
        return TOPIC.participle;
      if (all.some((o) => PERSONAL.has(o))) return TOPIC.pronouns;
      return TOPIC.wordForm;
    }
    default:
      return null;
  }
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
export function foldVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function slugify(s: string): string {
  return foldVi(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
