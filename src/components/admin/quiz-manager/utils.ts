// ============================================================
// Quiz Manager Utilities — Single source of truth
// folder navigation, CSV parser, import format configs
// ============================================================

// ── Folder Navigation ──────────────────────────────────────

export const normalizeFolderPath = (folderPath?: string | null) => {
  const normalized = folderPath?.trim();
  return normalized && normalized.length > 0 ? normalized : "/";
};

export const buildFolderSet = (items: any[]) => {
  const folders = new Set<string>();
  items.forEach((item) => {
    const folderPath = normalizeFolderPath(item.folder_path);
    if (folderPath === "/") return;
    const parts = folderPath.split("/").filter(Boolean);
    let acc = "";
    parts.forEach((part) => { acc += `/${part}`; folders.add(acc); });
  });
  return folders;
};

export const getSubFolders = (folders: Set<string>, currentPath: string) => {
  const subs = new Set<string>();
  folders.forEach((folderPath) => {
    if (currentPath === "/") {
      const match = folderPath.match(/^\/([^/]+)$/);
      if (match) subs.add(match[1]);
      return;
    }
    const prefix = `${currentPath}/`;
    if (!folderPath.startsWith(prefix)) return;
    const remaining = folderPath.slice(prefix.length);
    const nextPart = remaining.split("/")[0];
    if (nextPart) subs.add(nextPart);
  });
  return Array.from(subs).sort((a, b) => a.localeCompare(b, "vi"));
};

export const getBreadcrumbs = (currentPath: string) =>
  currentPath === "/" ? ["/"] : ["/", ...currentPath.split("/").filter(Boolean)];

export const getParentPath = (currentPath: string) => {
  if (currentPath === "/") return "/";
  const parts = currentPath.split("/").filter(Boolean);
  parts.pop();
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
};

export const joinFolderPath = (currentPath: string, folderName: string) =>
  currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;

// ── CSV Parser ─────────────────────────────────────────────

export const parseQuotesCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = "";
  const delimiter = text.includes("\t") ? "\t" : ",";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') { currentVal += '"'; i++; }
        else { inQuotes = false; }
      } else { currentVal += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === delimiter) { row.push(currentVal); currentVal = ""; }
      else if (char === "\n" || char === "\r") {
        row.push(currentVal);
        if (row.some((v) => v.trim().length > 0)) result.push(row);
        row = []; currentVal = "";
        if (char === "\r" && i + 1 < text.length && text[i + 1] === "\n") i++;
      } else { currentVal += char; }
    }
  }
  row.push(currentVal);
  if (row.some((v) => v.trim().length > 0)) result.push(row);
  return result;
};

// ── Import Format Config ───────────────────────────────────
// Single source of truth cho tất cả parts:
// colOrder, ChatGPT prompt, template TSV

export type PartKey = "auto" | "part1" | "part2" | "part3" | "part4" | "part5" | "part6" | "part7";

export interface PartConfig {
  label: string;
  colOrder: string[];         // description of column order
  prompt: string;             // ChatGPT prompt
  templateHeader: string;     // TSV header
  templateExample: string;    // TSV example row(s)
}

export const PART_CONFIGS: Record<PartKey, PartConfig> = {
  auto: {
    label: "Tự động (Mặc định)",
    colOrder: ["question_text", "a", "b", "c", "d", "correct", "explanation", "translation", "audio_url", "image_url", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung trắc nghiệm sang định dạng TSV. Header: question_text, a, b, c, d, correct, explanation, translation, audio_url, image_url, vocabulary.\nQuy tắc:\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "question_text\ta\tb\tc\td\tcorrect\texplanation\ttranslation\taudio_url\timage_url\tvocabulary",
    templateExample: "What is shown in the picture?\tA man reading\tA woman cooking\tA child playing\tA dog sleeping\tA\tThe image shows a man reading\tBức tranh cho thấy một người đàn ông đang đọc sách\thttps://example.com/audio.mp3\thttps://example.com/image.jpg\tshow|cho thấy|/ʃoʊ/||She shows me",
  },
  part1: {
    label: "Part 1 - Ảnh (4 đáp án)",
    colOrder: ["image_url", "audio_url", "a", "b", "c", "d", "correct", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 1 sang định dạng TSV. Header: image_url, audio_url, a, b, c, d, correct, translation, vocabulary.\nQuy tắc:\n- a,b,c,d để trống (chỉ hiện nút chọn).\n- correct: A/B/C/D.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "image_url\taudio_url\ta\tb\tc\td\tcorrect\ttranslation\tvocabulary",
    templateExample: "https://img.com/1.jpg\thttps://aud.com/1.mp3\t\t\t\t\tA\tBức tranh mô tả...\tread|đọc|/riːd/|He is reading a book",
  },
  part2: {
    label: "Part 2 - Hỏi đáp (3 đáp án)",
    colOrder: ["question_text", "audio_url", "a", "b", "c", "correct", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 2 sang định dạng TSV. Header: question_text, audio_url, a, b, c, correct, translation, vocabulary.\nQuy tắc:\n- Chỉ có 3 đáp án A, B, C.\n- BẮT BUỘC có audio_url cho mỗi câu (nội dung câu hỏi và đáp án sẽ bị ẩn khi làm bài).\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "question_text\taudio_url\ta\tb\tc\tcorrect\ttranslation\tvocabulary",
    templateExample: "When are you moving to your new office?\thttps://example.com/audio.mp3\tThe office printer is over there.\tThe water bill is high this month.\tThe schedule is being revised.\tC\tKhi nào bạn chuyển đến văn phòng mới?\toffice|văn phòng|/ˈɑːfɪs/|The office is closed",
  },
  part3: {
    label: "Part 3 - Hội thoại (Audio chung)",
    colOrder: ["audio_url", "question_text", "a", "b", "c", "d", "correct", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 3 sang định dạng TSV. Header: audio_url, question_text, a, b, c, d, correct, translation, vocabulary.\nQuy tắc:\n- Các câu chung audio sẽ tự động được nhóm lại.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "audio_url\tquestion_text\ta\tb\tc\td\tcorrect\ttranslation\tvocabulary",
    templateExample: "https://aud.com/3.mp3\tQuestion 1\tA\tB\tC\tD\tA\t\tword|nghĩa|/phonetic/|example\nhttps://aud.com/3.mp3\tQuestion 2\tA\tB\tC\tD\tB\t\t\nhttps://aud.com/3.mp3\tQuestion 3\tA\tB\tC\tD\tC\t\t",
  },
  part4: {
    label: "Part 4 - Bài nói (Audio chung)",
    colOrder: ["audio_url", "question_text", "a", "b", "c", "d", "correct", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 4 sang định dạng TSV. Header: audio_url, question_text, a, b, c, d, correct, translation, vocabulary.\nQuy tắc:\n- Các câu chung audio sẽ tự động được nhóm lại.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "audio_url\tquestion_text\ta\tb\tc\td\tcorrect\ttranslation\tvocabulary",
    templateExample: "https://aud.com/4.mp3\tQuestion 1\tA\tB\tC\tD\tA\t\tword|nghĩa|/phonetic/|example\nhttps://aud.com/4.mp3\tQuestion 2\tA\tB\tC\tD\tB\t\t",
  },
  part5: {
    label: "Part 5 - Điền câu (Trắc nghiệm)",
    colOrder: ["question_text", "a", "b", "c", "d", "correct", "explanation", "translation", "audio_url", "image_url", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 5 sang định dạng TSV. Header: question_text, a, b, c, d, correct, explanation, translation, audio_url, image_url, vocabulary.\nQuy tắc:\n- Câu hỏi thường có dạng: "The manager ______ the report yesterday."\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "question_text\ta\tb\tc\td\tcorrect\texplanation\ttranslation\taudio_url\timage_url\tvocabulary",
    templateExample: "The manager ______ the report yesterday.\tsubmit\tsubmitted\tsubmits\tsubmitting\tB\tPast simple tense\tGiám đốc đã nộp báo cáo ngày hôm qua.\t\t\tsubmit|nộp|/səbˈmɪt/|She submitted the form",
  },
  part6: {
    label: "Part 6 - Điền đoạn văn (Passage chung)",
    colOrder: ["passage", "question_text", "a", "b", "c", "d", "correct", "explanation", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 6 sang định dạng TSV. Header: passage, question_text, a, b, c, d, correct, explanation, translation, vocabulary.\nQuy tắc:\n- Cột passage chỉ điền ở câu đầu tiên của nhóm câu hỏi.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "passage\tquestion_text\ta\tb\tc\td\tcorrect\texplanation\ttranslation\tvocabulary",
    templateExample: "Dear all, [passage text...]\tQuestion 15\tA\tB\tC\tD\tA\t\t\t\n\tQuestion 16\tA\tB\tC\tD\tB\t\t\t",
  },
  part7: {
    label: "Part 7 - Đọc hiểu (Passage/Ảnh chung)",
    colOrder: ["passage", "image_url", "question_text", "a", "b", "c", "d", "correct", "explanation", "translation", "vocabulary"],
    prompt: `Hãy giúp tôi chuyển nội dung TOEIC Part 7 sang định dạng TSV. Header: passage, image_url, question_text, a, b, c, d, correct, explanation, translation, vocabulary.\nQuy tắc:\n- passage và image_url chỉ điền ở câu đầu tiên của nhóm.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', nhiều từ cách nhau bằng ';'.`,
    templateHeader: "passage\timage_url\tquestion_text\ta\tb\tc\td\tcorrect\texplanation\ttranslation\tvocabulary",
    templateExample: "Questions 147-149 refer to the following email...\thttps://img.com/doc.jpg\tWhat is the purpose of the email?\tTo request leave\tTo report a problem\tTo give instructions\tTo make a complaint\tC\t\t\t\n\t\tWhen does the meeting start?\t8 AM\t9 AM\t10 AM\t11 AM\tB\t\t\t",
  },
};

export const DICTATION_PROMPT = `Hãy giúp tôi chuyển nội dung bài nghe điền từ sang định dạng TSV (Tab-separated values). Header: question_text, answers, translation, audio_url, vocabulary, dictation_keywords.\nQuy tắc:\n- Hệ thống hỗ trợ 1 Audio cho nhiều câu điền từ.\n- Cột answers chứa Full Transcript, nhiều câu ngăn cách bằng ' | '.\n- vocabulary: 'từ|nghĩa|phiên âm|ví dụ', cách nhau bằng ';'.\n- dictation_keywords: danh sách từ khóa cần điền, cách nhau bằng dấu phẩy.`;

export const DICTATION_TEMPLATE_HEADER = "question_text\tanswers\ttranslation\taudio_url\tvocabulary\tdictation_keywords";
export const DICTATION_TEMPLATE_EXAMPLE = "\tSentence 1 | Sentence 2\tDịch nghĩa cả đoạn...\thttps://example.com/audio.mp3\tword|nghĩa|/phonetic/|example\tkeyword1, keyword2";
