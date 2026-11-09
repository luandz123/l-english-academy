/**
 * Danh mục dạng câu hỏi theo Part (nguồn duy nhất: frontend đọc nhãn qua API `/practice/catalog`).
 * Part 7 phân cấp: dạng cấu trúc (single/double/triple) là nhóm chính, loại văn bản là bộ lọc phụ.
 */

export type Skill = 'listening' | 'reading';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

export interface CategoryDef {
  key: string;
  label: string;
  description: string;
}

export interface PartDef {
  part: number;
  skill: Skill;
  name: string;
  categories: CategoryDef[];
}

const P5_GRAMMAR: CategoryDef[] = [
  {
    key: 'word_form',
    label: 'Từ loại (Word Form)',
    description: 'Chọn dạng từ đúng: danh, động, tính, trạng từ',
  },
  {
    key: 'verb_tense',
    label: 'Thì & dạng động từ',
    description: 'Thì, chủ động/bị động, động từ khuyết thiếu',
  },
  {
    key: 'pronoun',
    label: 'Đại từ',
    description: 'Đại từ nhân xưng, sở hữu, phản thân, quan hệ',
  },
  {
    key: 'prep_conj',
    label: 'Giới từ & liên từ',
    description: 'Giới từ, liên từ, trạng từ nối',
  },
  {
    key: 'vocabulary',
    label: 'Từ vựng',
    description: 'Chọn từ đúng nghĩa trong ngữ cảnh',
  },
];

const P34: CategoryDef[] = [
  {
    key: 'main_idea',
    label: 'Chủ đề / mục đích',
    description: 'Cuộc hội thoại/bài nói chủ yếu về điều gì',
  },
  {
    key: 'speaker',
    label: 'Người nói & địa điểm',
    description: 'Người nói là ai, làm ở đâu',
  },
  {
    key: 'detail',
    label: 'Chi tiết',
    description: 'Thông tin cụ thể được nhắc tới',
  },
  {
    key: 'request',
    label: 'Yêu cầu / đề nghị',
    description: 'Ai yêu cầu, gợi ý, đề nghị điều gì',
  },
  {
    key: 'next_action',
    label: 'Hành động tiếp theo',
    description: 'Ai sẽ làm gì tiếp theo',
  },
  {
    key: 'inference',
    label: 'Suy luận / hàm ý',
    description: 'Hàm ý của câu nói, điều có thể suy ra',
  },
  {
    key: 'graphic',
    label: 'Câu hỏi biểu đồ',
    description: 'Look at the graphic',
  },
];

export const PARTS: PartDef[] = [
  {
    part: 1,
    skill: 'listening',
    name: 'Mô tả tranh',
    categories: [
      {
        key: 'single_person',
        label: 'Tranh một người',
        description: 'Hành động, tư thế của một người',
      },
      {
        key: 'multiple_people',
        label: 'Tranh nhiều người',
        description: 'Hoạt động của nhóm người',
      },
      {
        key: 'objects_scene',
        label: 'Tranh đồ vật / cảnh',
        description: 'Vị trí, trạng thái đồ vật, cảnh vật',
      },
    ],
  },
  {
    part: 2,
    skill: 'listening',
    name: 'Hỏi – đáp',
    categories: [
      {
        key: 'wh',
        label: 'WH Questions',
        description: 'Who, What, When, Where, Why, How…',
      },
      {
        key: 'yes_no',
        label: 'Yes/No Questions',
        description: 'Câu hỏi Có/Không',
      },
      {
        key: 'choice',
        label: 'Choice Questions',
        description: 'Câu hỏi lựa chọn A or B',
      },
      { key: 'request', label: 'Requests', description: 'Lời yêu cầu, nhờ vả' },
      {
        key: 'suggestion',
        label: 'Suggestions',
        description: 'Lời gợi ý, đề nghị, mời',
      },
      { key: 'tag', label: 'Tag Questions', description: 'Câu hỏi đuôi' },
      { key: 'statement', label: 'Statements', description: 'Câu trần thuật' },
      {
        key: 'other',
        label: 'Other Questions',
        description: 'Câu hỏi gián tiếp và dạng khác',
      },
    ],
  },
  { part: 3, skill: 'listening', name: 'Đoạn hội thoại', categories: P34 },
  { part: 4, skill: 'listening', name: 'Bài nói ngắn', categories: P34 },
  { part: 5, skill: 'reading', name: 'Hoàn thành câu', categories: P5_GRAMMAR },
  {
    part: 6,
    skill: 'reading',
    name: 'Hoàn thành đoạn văn',
    categories: [
      {
        key: 'sentence_insertion',
        label: 'Chèn câu',
        description: 'Chọn câu phù hợp điền vào đoạn',
      },
      ...P5_GRAMMAR,
    ],
  },
  {
    part: 7,
    skill: 'reading',
    name: 'Đọc hiểu',
    categories: [
      { key: 'single', label: 'Single Passage', description: 'Một bài đọc' },
      {
        key: 'double',
        label: 'Double Passages',
        description: 'Hai bài đọc liên kết',
      },
      {
        key: 'triple',
        label: 'Triple Passages',
        description: 'Ba bài đọc liên kết',
      },
    ],
  },
];

/** Loại văn bản Part 7 (bộ lọc phụ). */
export const PASSAGE_TYPES: CategoryDef[] = [
  { key: 'email', label: 'Email', description: '' },
  { key: 'letter', label: 'Thư', description: '' },
  { key: 'memo', label: 'Memo', description: '' },
  { key: 'advertisement', label: 'Quảng cáo', description: '' },
  { key: 'article', label: 'Bài báo', description: '' },
  { key: 'notice', label: 'Thông báo', description: '' },
  { key: 'text_message', label: 'Tin nhắn / chat', description: '' },
  { key: 'web_page', label: 'Trang web', description: '' },
  { key: 'form_schedule', label: 'Biểu mẫu / lịch trình', description: '' },
  { key: 'other', label: 'Khác', description: '' },
];

export function partDef(part: number): PartDef | undefined {
  return PARTS.find((p) => p.part === part);
}

export function isValidCategory(part: number, key: string): boolean {
  return partDef(part)?.categories.some((c) => c.key === key) ?? false;
}

export function isValidPassageType(key: string): boolean {
  return PASSAGE_TYPES.some((c) => c.key === key);
}

export function skillOfPart(part: number): Skill {
  return part <= 4 ? 'listening' : 'reading';
}

export const LISTENING_PARTS = [1, 2, 3, 4];
export const READING_PARTS = [5, 6, 7];

/** Giây gợi ý cho mỗi câu (đặt giờ tự động cho Mini Test / chế độ Test). */
export const SECONDS_PER_QUESTION: Record<number, number> = {
  1: 30,
  2: 25,
  3: 40,
  4: 40,
  5: 30,
  6: 45,
  7: 75,
};
