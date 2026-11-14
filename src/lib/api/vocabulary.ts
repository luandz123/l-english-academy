/**
 * Từ vựng cá nhân (`/api/v1/vocabulary`): tra từ, sổ từ, ôn SRS (lịch ôn do server tính),
 * kho từ theo Part/cấp độ.
 */
import { apiClient } from "./client";

export type VocabSource = "pack" | "toeic600" | "listening" | "reading" | "manual";
export type VocabState = "new" | "learning" | "review" | "mastered";
export type VocabLevel = "basic" | "intermediate" | "advanced";
export type Rating = "again" | "hard" | "good" | "easy";

export interface SavedWord {
  id: number;
  word: string;
  phonetic: string | null;
  definition_vi: string | null;
  definition_en: string | null;
  example: string | null;
  note: string | null;
  source: VocabSource;
  part: number | null;
  level: VocabLevel | null;
  state: VocabState;
  due_at: string | null;
  interval_days: number;
  lapses: number;
  created_at: string;
}

export interface ReviewCard extends SavedWord {
  intervals: Record<Rating, string>;
}

export interface LookupResult {
  word: string;
  found: {
    source: "entry" | "pack";
    word: string;
    phonetic: string | null;
    definition_vi: string | null;
    definition_en: string | null;
    example: string | null;
    part: number | null;
    level: VocabLevel | null;
  } | null;
  saved: SavedWord | null;
}

export interface VocabSummary {
  total: number;
  due: number;
  new_available: number;
  new_count: number;
  learning: number;
  review: number;
  mastered: number;
  reviewed_today: number;
  new_per_day: number;
}

export interface VocabEntry {
  id: number;
  word: string;
  phonetic: string | null;
  definition_vi: string | null;
  example: string | null;
  part: number | null;
  level: VocabLevel | null;
  frequency: number;
  tag_source: string | null;
  saved: boolean;
}

export interface NotebookQuery {
  q?: string;
  sources?: VocabSource[];
  parts?: number[];
  levels?: VocabLevel[];
  states?: VocabState[];
  due?: boolean;
  page?: number;
  limit?: number;
}

const csv = <T>(v: T[] | undefined) => (v && v.length ? v.join(",") : undefined);

export const lookupWord = (word: string) => apiClient.get<LookupResult>("vocabulary/lookup", { query: { word } });

export const saveWord = (body: {
  word: string;
  source: VocabSource;
  definition_vi?: string;
  phonetic?: string;
  example?: string;
  note?: string;
  source_ref?: string;
}) => apiClient.post<{ word: SavedWord; already: boolean }>("vocabulary/notebook", body);

export const saveWordsBatch = (body: { entry_ids?: number[]; pack_word_ids?: number[] }) =>
  apiClient.post<{ added: number; skipped: number }>("vocabulary/notebook/batch", body);

export const listNotebook = (q: NotebookQuery) =>
  apiClient.get<{ items: SavedWord[]; total: number; page: number; limit: number }>("vocabulary/notebook", {
    query: {
      q: q.q?.trim() || undefined,
      sources: csv(q.sources),
      parts: csv(q.parts),
      levels: csv(q.levels),
      states: csv(q.states),
      due: q.due || undefined,
      page: q.page,
      limit: q.limit,
    },
  });

export const getVocabSummary = () => apiClient.get<VocabSummary>("vocabulary/notebook/summary");

export const getSavedWordKeys = () =>
  apiClient.get<{ words: string[] }>("vocabulary/notebook/words").then((r) => new Set(r.words));

export const updateWord = (id: number, body: Partial<Pick<SavedWord, "definition_vi" | "phonetic" | "example" | "note">>) =>
  apiClient.patch<SavedWord>(`vocabulary/notebook/${id}`, body);

export const deleteWord = (id: number) => apiClient.delete<void>(`vocabulary/notebook/${id}`);

export const getReviewQueue = () =>
  apiClient.get<{ cards: ReviewCard[]; due: number; new_today: number; new_per_day: number }>("vocabulary/review/queue");

export const reviewCard = (id: number, rating: Rating) => apiClient.post<ReviewCard>(`vocabulary/review/${id}`, { rating });

export const saveVocabSettings = (newPerDay: number) =>
  apiClient.put<VocabSummary>("vocabulary/settings", { new_per_day: newPerDay });

export const listVocabEntries = (q: { q?: string; parts?: number[]; levels?: VocabLevel[]; page?: number; limit?: number }) =>
  apiClient.get<{ items: VocabEntry[]; total: number; facets: { part: number | null; level: string | null; count: number }[] }>(
    "vocabulary/entries",
    { query: { q: q.q?.trim() || undefined, parts: csv(q.parts), levels: csv(q.levels), page: q.page, limit: q.limit } },
  );

export const LEVEL_LABELS: Record<VocabLevel, string> = { basic: "Cơ bản", intermediate: "Trung cấp", advanced: "Nâng cao" };
export const STATE_LABELS: Record<VocabState, string> = {
  new: "Chưa học",
  learning: "Đang học",
  review: "Đang ôn",
  mastered: "Đã thuộc",
};
export const SOURCE_LABELS: Record<VocabSource, string> = {
  pack: "Bộ flashcard",
  toeic600: "600 từ TOEIC",
  listening: "Bài nghe",
  reading: "Bài đọc",
  manual: "Tự thêm",
};

/** Khóa từ (khớp backend `wordKey`) để đánh dấu "Đã lưu". */
export const wordKeyOf = (w: string) =>
  w
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
