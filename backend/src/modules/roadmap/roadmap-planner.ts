/**
 * Tính lộ trình TOEIC từ đầu vào wizard. Hàm thuần (không đọc DB), nhận `today` để test được.
 * Mọi con số (giờ cần học, chặng, điểm ước lượng) tính ở server — client chỉ gửi lựa chọn.
 */

export const SCORE_MIN = 10;
export const SCORE_MAX = 990;
/** "Chưa thi / mất gốc" được coi như xuất phát ở mức này. */
export const NO_SCORE_BASELINE = 150;
/** Phần giờ dành riêng cho chặng luyện đề tổng hợp, cộng thêm trên giờ học kiến thức. */
const TEST_PRACTICE_SHARE = 0.15;

export const PURPOSES = ['graduation', 'job', 'promotion', 'reflex'] as const;
export type Purpose = (typeof PURPOSES)[number];
export const CURRENT_MODES = ['score', 'none', 'placement'] as const;
export type CurrentMode = (typeof CURRENT_MODES)[number];

/** Số giờ cần cho mỗi 100 điểm, theo dải điểm (càng lên cao càng tốn công). */
const HOUR_BANDS = [
  { from: 0, to: 300, hoursPer100: 60 },
  { from: 300, to: 500, hoursPer100: 80 },
  { from: 500, to: 700, hoursPer100: 110 },
  { from: 700, to: 850, hoursPer100: 150 },
  { from: 850, to: SCORE_MAX, hoursPer100: 220 },
];

export interface Focus {
  grammar: number;
  vocab: number;
  listening: number;
  reading: number;
}

interface PhaseTemplate {
  key: string;
  title: string;
  description: string;
  from: number;
  to: number;
  focus: Focus;
  /** Part TOEIC trọng tâm, dùng để ghép với chương (module) có tên "Part N". */
  parts: number[];
  /** Từ khóa ghép chương/khóa nền tảng khi không có Part. */
  keywords: string[];
  grammarTopics: string[];
  vocabTopics: string[];
  practice: string[];
}

const SKILL_PHASES: PhaseTemplate[] = [
  {
    key: 'foundation',
    title: 'Nền tảng',
    description:
      'Lấy lại gốc ngữ pháp và vốn từ cơ bản trước khi vào dạng bài TOEIC.',
    from: 0,
    to: 300,
    focus: { grammar: 40, vocab: 30, listening: 15, reading: 15 },
    parts: [],
    keywords: ['ngữ pháp', 'grammar', 'cơ bản', 'nền tảng', 'mất gốc', 'basic'],
    grammarTopics: [
      'Các thì cơ bản: hiện tại đơn, hiện tại tiếp diễn, quá khứ đơn, tương lai đơn',
      'Danh từ đếm được / không đếm được, mạo từ a/an/the',
      'Đại từ nhân xưng, tính từ và đại từ sở hữu',
      'Giới từ chỉ thời gian và nơi chốn (in/on/at)',
      'Cấu trúc câu cơ bản S + V + O, câu hỏi Yes/No và Wh-',
    ],
    vocabTopics: [
      '600 từ vựng nền tảng thường gặp',
      'Văn phòng và đồ dùng công sở',
      'Mua sắm, nhà hàng, đi lại',
    ],
    practice: [
      'Làm quiz ngữ pháp sau mỗi chủ điểm',
      'Nghe chép chính tả câu ngắn mỗi ngày',
    ],
  },
  {
    key: 'breakthrough',
    title: 'Bứt phá 300–500',
    description:
      'Làm quen cấu trúc đề, tập trung các Part dễ ăn điểm: tranh ảnh, hỏi đáp, điền câu.',
    from: 300,
    to: 500,
    focus: { grammar: 30, vocab: 25, listening: 25, reading: 20 },
    parts: [1, 2, 5],
    keywords: [],
    grammarTopics: [
      'Từ loại: nhận diện danh từ, động từ, tính từ, trạng từ qua hậu tố',
      'Thì hoàn thành và sự hòa hợp chủ ngữ – động từ',
      'Câu bị động',
      'So sánh hơn và so sánh nhất',
      'Liên từ và giới từ thường gặp trong Part 5',
    ],
    vocabTopics: [
      'Hội họp, lịch hẹn và sự kiện',
      'Tuyển dụng và nhân sự',
      'Du lịch, đặt phòng, sân bay',
    ],
    practice: [
      'Part 1–2: luyện bẫy phát âm và câu hỏi Wh-',
      'Part 5: 30 câu mỗi buổi, bấm giờ 20 giây/câu',
    ],
  },
  {
    key: 'acceleration',
    title: 'Tăng tốc 500–700',
    description:
      'Chuyển sang hội thoại, bài nói dài và đọc hiểu; luyện kỹ năng đọc trước câu hỏi.',
    from: 500,
    to: 700,
    focus: { grammar: 20, vocab: 20, listening: 30, reading: 30 },
    parts: [3, 4, 6, 7],
    keywords: [],
    grammarTopics: [
      'Mệnh đề quan hệ và rút gọn mệnh đề quan hệ',
      'Câu điều kiện loại 1, 2, 3',
      'Phân từ hiện tại / quá khứ dùng như tính từ',
      'Danh động từ và động từ nguyên mẫu',
      'Từ nối và liên kết câu trong Part 6',
    ],
    vocabTopics: [
      'Tài chính, ngân hàng và hóa đơn',
      'Hợp đồng, đơn hàng và vận chuyển',
      'Marketing và bán hàng',
    ],
    practice: [
      'Part 3–4: đọc trước câu hỏi, đoán ngữ cảnh',
      'Part 7: đọc lướt tìm ý, mỗi ngày 2 đoạn đơn',
    ],
  },
  {
    key: 'advanced',
    title: 'Chinh phục 700–850',
    description: 'Xử lý câu hỏi suy luận, đoạn kép/ba và tăng tốc độ làm bài.',
    from: 700,
    to: 850,
    focus: { grammar: 15, vocab: 15, listening: 35, reading: 35 },
    parts: [3, 4, 7],
    keywords: [],
    grammarTopics: [
      'Đảo ngữ và câu nhấn mạnh',
      'Mệnh đề danh từ, câu gián tiếp',
      'Giả định và các cấu trúc trang trọng',
    ],
    vocabTopics: [
      'Từ đồng nghĩa (paraphrase) giữa đề và đáp án',
      'Collocation trong môi trường doanh nghiệp',
    ],
    practice: [
      'Part 7 đoạn kép / ba: luyện trong giới hạn thời gian',
      'Mini test 100 câu mỗi tuần',
    ],
  },
  {
    key: 'mastery',
    title: 'Về đích 850+',
    description:
      'Gỡ các lỗi sai còn sót, ổn định tốc độ và độ chính xác ở mức cao.',
    from: 850,
    to: SCORE_MAX,
    focus: { grammar: 10, vocab: 15, listening: 35, reading: 40 },
    parts: [7, 3, 4],
    keywords: [],
    grammarTopics: [
      'Rà soát lỗi sai theo nhật ký đề',
      'Câu hỏi ngữ pháp bẫy về nghĩa trong Part 5–6',
    ],
    vocabTopics: [
      'Từ vựng học thuật và thành ngữ công sở',
      'Nhóm từ dễ nhầm (affect/effect, rise/raise…)',
    ],
    practice: [
      'Full test trong điều kiện thi thật',
      'Chữa đề chi tiết từng câu sai',
    ],
  },
];

const TEST_PHASE: PhaseTemplate = {
  key: 'test_practice',
  title: 'Luyện đề tổng hợp',
  description:
    'Làm đề full 200 câu, chữa lỗi và quản lý thời gian trước ngày thi.',
  from: 0,
  to: 0,
  focus: { grammar: 10, vocab: 10, listening: 40, reading: 40 },
  parts: [],
  keywords: [],
  grammarTopics: ['Ôn lại các chủ điểm hay sai theo kết quả đề'],
  vocabTopics: ['Ôn từ vựng ghi lại trong lúc chữa đề'],
  practice: [
    'Mỗi tuần 1–2 đề full, bấm giờ 120 phút',
    'Phân tích điểm từng Part, ôn lại Part yếu nhất',
  ],
};

const PURPOSE_NOTES: Record<Purpose, string> = {
  graduation:
    'Mục tiêu chuẩn đầu ra: ưu tiên chắc điểm đủ chuẩn, luyện đề đều đặn để không bất ngờ trong phòng thi.',
  job: 'Mục tiêu xin việc: ưu tiên từ vựng công sở, tuyển dụng và giao tiếp email.',
  promotion:
    'Mục tiêu thăng chức: ưu tiên đọc hiểu văn bản doanh nghiệp và nghe hội thoại họp hành.',
  reflex:
    'Mục tiêu phản xạ: tăng thời lượng nghe và nói theo, kết hợp phòng luyện nói.',
};

// ---------- Tài nguyên có sẵn trong hệ thống ----------

export interface CatalogModule {
  id: number;
  title: string;
  courseId: number;
  courseTitle: string;
}
export interface CatalogVocabCategory {
  id: number;
  title: string;
  courseId: number;
  courseTitle: string;
}
export interface CatalogFullTest {
  id: number;
  title: string;
}
export interface Catalog {
  modules: CatalogModule[];
  vocabCategories: CatalogVocabCategory[];
  fullTests: CatalogFullTest[];
}

export type ResourceType = 'module' | 'vocab' | 'full_test';
export interface Resource {
  type: ResourceType;
  id: number;
  title: string;
  subtitle: string | null;
  url: string;
}

const MODULES_PER_PHASE = 6;
const VOCAB_PER_PHASE = 4;
const FULL_TESTS_IN_TEST_PHASE = 4;

// ---------- Đầu vào / đầu ra ----------

export interface PlanInput {
  currentScore: number;
  targetScore: number;
  purpose: Purpose;
  durationWeeks: number;
  minutesPerDay: number;
  daysPerWeek: number;
  startedAt: Date;
}

export interface PlannedPhase {
  key: string;
  title: string;
  description: string;
  fromScore: number;
  toScore: number;
  hours: number;
  weeks: number;
  startWeek: number;
  endWeek: number;
  startDate: Date;
  endDate: Date;
  focus: Focus;
  grammarTopics: string[];
  vocabTopics: string[];
  practice: string[];
  resources: Resource[];
}

export type PlanStatus = 'on_track' | 'tight' | 'at_risk';

export interface Plan {
  requiredHours: number;
  availableHours: number;
  weeklyHours: number;
  status: PlanStatus;
  recommendedMinutesPerDay: number;
  achievableScore: number;
  totalWeeks: number;
  currentWeek: number;
  currentPhaseIndex: number;
  endDate: Date;
  purposeNote: string;
  phases: PlannedPhase[];
}

// ---------- Tính toán ----------

/** Giờ học kiến thức để đi từ `from` lên `to` (chưa gồm chặng luyện đề). */
export function skillHours(from: number, to: number): number {
  let hours = 0;
  for (const band of HOUR_BANDS) {
    const lo = Math.max(from, band.from);
    const hi = Math.min(to, band.to);
    if (hi > lo) hours += ((hi - lo) * band.hoursPer100) / 100;
  }
  return hours;
}

/** Tổng giờ cần (kiến thức + luyện đề), làm tròn lên. */
export function requiredHours(from: number, to: number): number {
  return Math.ceil(skillHours(from, to) * (1 + TEST_PRACTICE_SHARE));
}

/** Điểm có thể đạt với số giờ đang có, bội số của 5, không vượt mục tiêu. */
export function achievableScore(
  from: number,
  target: number,
  hours: number,
): number {
  let budget = hours / (1 + TEST_PRACTICE_SHARE);
  let score = from;
  for (const band of HOUR_BANDS) {
    if (score >= target || budget <= 0) break;
    if (score >= band.to) continue;
    const hi = Math.min(band.to, target);
    const cost = ((hi - score) * band.hoursPer100) / 100;
    if (budget >= cost) {
      budget -= cost;
      score = hi;
    } else {
      score += (budget * 100) / band.hoursPer100;
      budget = 0;
    }
  }
  return Math.min(target, Math.floor(score / 5) * 5);
}

/**
 * Quy đổi % đúng của bài test nhanh ra điểm TOEIC ước lượng (nội suy tuyến tính theo mốc).
 * Bài ngắn nên trần 900 — chỉ để chọn điểm xuất phát, không phải điểm thi thật.
 */
const PLACEMENT_CURVE: Array<[number, number]> = [
  [0, 100],
  [0.3, 250],
  [0.5, 400],
  [0.7, 600],
  [0.85, 750],
  [1, 900],
];
export function estimateScoreFromPlacement(
  correct: number,
  total: number,
): number {
  if (total <= 0) return NO_SCORE_BASELINE;
  const ratio = Math.min(1, Math.max(0, correct / total));
  for (let i = 1; i < PLACEMENT_CURVE.length; i++) {
    const [x1, y1] = PLACEMENT_CURVE[i];
    if (ratio <= x1) {
      const [x0, y0] = PLACEMENT_CURVE[i - 1];
      const y = y0 + ((ratio - x0) / (x1 - x0)) * (y1 - y0);
      return Math.round(y / 5) * 5;
    }
  }
  return PLACEMENT_CURVE[PLACEMENT_CURVE.length - 1][1];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
/** Ngày (UTC 00:00) của một thời điểm — cột `DATE` lưu theo ngày. */
export function startOfDayUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
export function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDayUtc(to).getTime() - startOfDayUtc(from).getTime()) / DAY_MS,
  );
}

function adjustFocus(focus: Focus, purpose: Purpose): Focus {
  if (purpose !== 'reflex') return focus;
  // Phản xạ: chuyển 5 điểm % từ ngữ pháp và 5 từ đọc sang nghe
  const grammarShift = Math.min(5, focus.grammar);
  const readingShift = Math.min(5, focus.reading);
  return {
    grammar: focus.grammar - grammarShift,
    vocab: focus.vocab,
    listening: focus.listening + grammarShift + readingShift,
    reading: focus.reading - readingShift,
  };
}

const PART_RE = /part\s*(\d)/i;

function pickModules(
  tpl: PhaseTemplate,
  catalog: Catalog,
  used: Set<number>,
): Resource[] {
  const matches = catalog.modules.filter((m) => {
    if (used.has(m.id)) return false;
    if (tpl.parts.length > 0) {
      const part = PART_RE.exec(m.title);
      return part !== null && tpl.parts.includes(Number(part[1]));
    }
    const text = `${m.title} ${m.courseTitle}`.toLowerCase();
    return tpl.keywords.some((k) => text.includes(k));
  });
  // Giữ thứ tự Part trọng tâm của chặng, rồi tới thứ tự catalog
  const partRank = (title: string) => {
    const part = PART_RE.exec(title);
    const idx = part ? tpl.parts.indexOf(Number(part[1])) : -1;
    return idx < 0 ? tpl.parts.length : idx;
  };
  const sorted = [...matches].sort(
    (a, b) => partRank(a.title) - partRank(b.title),
  );
  return sorted.slice(0, MODULES_PER_PHASE).map((m) => {
    used.add(m.id);
    return {
      type: 'module' as const,
      id: m.id,
      title: m.title,
      subtitle: m.courseTitle,
      url: `/courses/${m.courseId}/learn`,
    };
  });
}

/** Chia đều danh sách theo thứ tự cho `n` chặng. */
function chunkEvenly<T>(items: T[], n: number, max: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  if (n === 0) return out;
  const size = Math.ceil(items.length / n);
  for (let i = 0; i < n; i++) {
    out[i] = items.slice(i * size, i * size + size).slice(0, max);
  }
  return out;
}

export function buildPlan(
  input: PlanInput,
  catalog: Catalog,
  today: Date,
): Plan {
  const {
    currentScore,
    targetScore,
    purpose,
    durationWeeks,
    minutesPerDay,
    daysPerWeek,
  } = input;
  const startedAt = startOfDayUtc(input.startedAt);

  const required = requiredHours(currentScore, targetScore);
  const available =
    Math.round(((durationWeeks * daysPerWeek * minutesPerDay) / 60) * 10) / 10;
  const weeklyHours =
    Math.round(((daysPerWeek * minutesPerDay) / 60) * 10) / 10;
  const ratio = required === 0 ? 1 : available / required;
  const status: PlanStatus =
    ratio >= 1 ? 'on_track' : ratio >= 0.8 ? 'tight' : 'at_risk';
  const recommendedMinutesPerDay =
    Math.ceil((required * 60) / (durationWeeks * daysPerWeek) / 5) * 5;

  // Chặng kiến thức: các dải điểm giao với [current, target)
  const skill = SKILL_PHASES.filter(
    (p) => p.to > currentScore && p.from < targetScore,
  ).map((tpl) => {
    const from = Math.max(tpl.from, currentScore);
    const to = Math.min(tpl.to, targetScore);
    return { tpl, from, to, hours: skillHours(from, to) };
  });
  const testHours = skillHours(currentScore, targetScore) * TEST_PRACTICE_SHARE;
  const all = [
    ...skill,
    { tpl: TEST_PHASE, from: targetScore, to: targetScore, hours: testHours },
  ];

  // Phân bổ tuần theo tỷ lệ giờ, mỗi chặng tối thiểu 1 tuần (nếu đủ tuần)
  const totalHours = all.reduce((s, p) => s + p.hours, 0) || 1;
  const weeks = allocateWeeks(
    all.map((p) => p.hours / totalHours),
    durationWeeks,
  );
  const hoursShare = all.map(
    (p) => Math.round((p.hours / totalHours) * required * 10) / 10,
  );

  const vocabChunks = chunkEvenly(
    catalog.vocabCategories,
    skill.length,
    VOCAB_PER_PHASE,
  );
  const usedModules = new Set<number>();

  let weekCursor = 0;
  const phases: PlannedPhase[] = all.map((p, i) => {
    // Chặng 0 tuần (ít tuần hơn số chặng) nằm chung tuần cuối của lộ trình
    const startWeek = Math.min(weekCursor + 1, durationWeeks);
    weekCursor += weeks[i];
    const endWeek = Math.max(startWeek, weekCursor);
    const isTest = p.tpl.key === TEST_PHASE.key;
    const resources: Resource[] = isTest
      ? catalog.fullTests.slice(0, FULL_TESTS_IN_TEST_PHASE).map((t) => ({
          type: 'full_test' as const,
          id: t.id,
          title: t.title,
          subtitle: null,
          url: `/fulltests/${t.id}`,
        }))
      : [
          ...pickModules(p.tpl, catalog, usedModules),
          ...(vocabChunks[i] ?? []).map((v) => ({
            type: 'vocab' as const,
            id: v.id,
            title: v.title,
            subtitle: v.courseTitle,
            url: `/courses/${v.courseId}/vocab`,
          })),
        ];
    return {
      key: p.tpl.key,
      title: p.tpl.title,
      description: p.tpl.description,
      fromScore: p.from,
      toScore: p.to,
      hours: hoursShare[i],
      weeks: weeks[i],
      startWeek,
      endWeek,
      startDate: addDays(startedAt, (startWeek - 1) * 7),
      endDate: addDays(startedAt, endWeek * 7 - 1),
      focus: adjustFocus(p.tpl.focus, purpose),
      grammarTopics: p.tpl.grammarTopics,
      vocabTopics: p.tpl.vocabTopics,
      practice: p.tpl.practice,
      resources,
    };
  });

  const elapsedDays = daysBetween(startedAt, today);
  const currentWeek = Math.min(
    durationWeeks,
    Math.max(1, Math.floor(elapsedDays / 7) + 1),
  );
  const currentPhaseIndex = Math.max(
    0,
    phases.findIndex(
      (p) => currentWeek >= p.startWeek && currentWeek <= p.endWeek,
    ),
  );

  return {
    requiredHours: required,
    availableHours: available,
    weeklyHours,
    status,
    recommendedMinutesPerDay,
    achievableScore: achievableScore(currentScore, targetScore, available),
    totalWeeks: durationWeeks,
    currentWeek,
    currentPhaseIndex,
    endDate: addDays(startedAt, durationWeeks * 7 - 1),
    purposeNote: PURPOSE_NOTES[purpose],
    phases,
  };
}

/**
 * Chia `total` tuần theo tỷ lệ `shares` (tổng = 1). Mỗi chặng ít nhất 1 tuần khi đủ tuần;
 * nếu số chặng nhiều hơn số tuần, các chặng cuối dồn vào tuần cuối (0 tuần riêng).
 */
export function allocateWeeks(shares: number[], total: number): number[] {
  const n = shares.length;
  if (n === 0) return [];
  if (total <= n) {
    // Không đủ tuần: 1 tuần mỗi chặng đầu, phần còn lại 0
    return shares.map((_, i) => (i < total ? 1 : 0));
  }
  const base = shares.map(() => 1);
  const remaining = total - n;
  const raw = shares.map((s) => s * remaining);
  const floors = raw.map(Math.floor);
  let left = remaining - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return base.map((b, i) => b + floors[i]);
}
