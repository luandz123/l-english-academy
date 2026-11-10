/**
 * Phân tích & cá nhân hóa (`/api/v1/analytics`, `/api/v1/practice/diagnostic`): điểm yếu (P11),
 * tiến độ (P10), so sánh Full Test (E09), đề xuất đề (E10), bài kiểm tra trình độ (P01).
 * Mọi số liệu do server tính từ lượt đã nộp.
 */
import { apiClient } from "./client";
import type { SessionSummary } from "./practice";

export type WindowKey = "7" | "30" | "90" | "all";
export type SkillFilter = "all" | "listening" | "reading";
export type Level = "insufficient" | "weak" | "average" | "good";

export interface Trend {
  direction: "up" | "down" | "flat";
  previous_accuracy: number;
}

export interface CategoryAnalysis {
  part: number;
  category: string;
  label: string;
  answered: number;
  correct: number;
  wrong: number;
  blank: number;
  accuracy: number | null;
  gap: number | null;
  level: Level;
  trend: Trend | null;
  flags: { many_blanks: boolean; slow: boolean; avg_seconds: number | null };
  practice: {
    action: "practice" | "review" | "locked" | "none";
    available: number;
    locked: number;
    mistakes: number;
  };
  recent_practice: {
    correct: number;
    total: number;
    submitted_at: string;
  } | null;
}

export interface PartAnalysis {
  part: number;
  skill: "listening" | "reading";
  name: string;
  answered: number;
  correct: number;
  accuracy: number | null;
  level: Level;
  trend: Trend | null;
  categories: CategoryAnalysis[];
  passage_types: {
    key: string;
    answered: number;
    accuracy: number | null;
    level: Level;
  }[];
}

export interface WeaknessReport {
  state: "empty" | "insufficient" | "ready";
  window: WindowKey;
  skill: SkillFilter;
  summary: {
    answered: number;
    attempts: number;
    from: string | null;
    to: string | null;
    accuracy: number | null;
    blank: number;
  };
  top: CategoryAnalysis[];
  top_mode: "weak" | "lowest";
  needed: {
    answered: number;
    max_in_category: number;
    more_needed: number;
  } | null;
  suggest_window: WindowKey | null;
  skills: { listening: number; reading: number };
  parts: PartAnalysis[];
}

export interface ScorePoint {
  kind: "full_test" | "diagnostic";
  id: string;
  date: string;
  total: number;
  listening: number | null;
  reading: number | null;
  range: { min: number; max: number } | null;
  title: string;
  link: string;
}

export interface Progress {
  state: "empty" | "activity" | "full";
  estimate: {
    total: number;
    listening: number | null;
    reading: number | null;
    range: { min: number; max: number } | null;
    source: "full_test" | "diagnostic";
    title: string;
    date: string;
    age_days: number;
    stale: boolean;
    link: string;
  } | null;
  change_30d: number | null;
  last_30d: { answered: number; accuracy: number | null };
  score_points: ScorePoint[];
  parts: {
    part: number;
    name: string;
    answered: number;
    accuracy: number | null;
    previous_accuracy: number | null;
    level: Level;
    trend: Trend | null;
  }[];
  weekly: {
    week_start: string;
    listening: number;
    reading: number;
    seconds: number;
  }[];
  weaknesses: CategoryAnalysis[];
  history: {
    kind: string;
    id: string;
    title: string;
    date: string | null;
    score: number | null;
    correct: number | null;
    total: number | null;
    parts: number[] | null;
    link: string;
  }[];
}

export interface CompareAttempt {
  id: number;
  test_id: number;
  title: string;
  course_id: number | null;
  completed_at: string | null;
  parts: number[];
  full: boolean;
  total_score: number | null;
  listening_score: number | null;
  reading_score: number | null;
  time_spent_seconds: number | null;
  blank: number;
  by_part: Record<
    string,
    { correct: number; total: number; accuracy: number | null }
  >;
}

export interface CompareQuestion {
  question_id: number;
  number: number | null;
  part: number;
  category: string | null;
  label: string | null;
  picks: ({ letter: string | null; correct: boolean } | null)[];
  correct_letter: string | null;
  answer_updated: boolean;
  content: {
    text: string | null;
    answers: { letter: string; text: string | null }[];
    explanation: string | null;
    transcript: string | null;
  } | null;
}

export interface Comparison {
  attempts: CompareAttempt[];
  same_test: boolean;
  score_diff: {
    total: number | null;
    listening: number | null;
    reading: number | null;
  };
  parts: {
    part: number;
    cells: ({
      correct: number;
      total: number;
      accuracy: number | null;
    } | null)[];
    diff: number | null;
  }[];
  category_changes: {
    up: {
      part: number;
      category: string;
      label: string;
      before: number;
      after: number;
      delta: number;
    }[];
    down: {
      part: number;
      category: string;
      label: string;
      before: number;
      after: number;
      delta: number;
    }[];
  };
  questions: {
    accessible: boolean;
    fixed: CompareQuestion[];
    regressed: CompareQuestion[];
    still_wrong: CompareQuestion[];
    still_right: CompareQuestion[];
  } | null;
}

export interface ExamRecommendation {
  type: "exam";
  test_id: number;
  code: string;
  title: string;
  course_id: number | null;
  difficulty: string | null;
  verified: boolean;
  is_free: boolean;
  locked: boolean;
  mode: { full: boolean; parts: number[]; minutes: number };
  reasons: string[];
}

export interface OtherRecommendation {
  type: "diagnostic" | "practice";
  title: string;
  url: string;
  minutes?: number;
  reasons: string[];
  part?: number;
  category?: string;
}

export type Recommendation = ExamRecommendation | OtherRecommendation;

export interface Recommendations {
  kind: "diagnostic" | "exam" | "all_done" | "none";
  primary: Recommendation | null;
  alternatives: Recommendation[];
}

export interface DiagnosticStatus {
  available: boolean;
  total_questions: number;
  minutes: number;
  structure: { part: number; count: number }[];
  in_progress: SessionSummary | null;
  latest: {
    session_id: string;
    submitted_at: string | null;
    usable: boolean;
    total: { min: number; max: number; mid: number } | null;
  } | null;
  retake_warning: boolean;
  recent_full_test: {
    result_id: number;
    test_id: number;
    course_id: number | null;
    title: string;
    total_score: number | null;
    completed_at: string | null;
  } | null;
}

export interface DiagnosticReport {
  session_id: string;
  submitted_at: string | null;
  total_questions: number;
  answered: number;
  correct: number;
  blank: number;
  usable: boolean;
  estimate: {
    listening: { min: number; max: number; score: number } | null;
    reading: { min: number; max: number; score: number } | null;
    total: { min: number; max: number; mid: number } | null;
    margin: number | null;
  };
  parts: {
    part: number;
    correct: number;
    total: number;
    accuracy: number | null;
    level: Level;
  }[];
  weak: {
    part: number;
    category: string;
    label: string;
    accuracy: number | null;
    answered: number;
  }[];
}

export const getWeaknesses = (window: WindowKey, skill: SkillFilter) =>
  apiClient.get<WeaknessReport>("analytics/weaknesses", {
    query: { window, skill },
  });

export const getProgress = () => apiClient.get<Progress>("analytics/progress");

export const compareAttempts = (ids: number[]) =>
  apiClient.get<Comparison>("analytics/compare", {
    query: { ids: ids.join(",") },
  });

export const getRecommendations = () =>
  apiClient.get<Recommendations>("analytics/recommendations");

export const skipRecommendation = (testId: number) =>
  apiClient.post<void>(`analytics/recommendations/${testId}/skip`);

export const getDiagnosticStatus = () =>
  apiClient.get<DiagnosticStatus>("practice/diagnostic");

export const startDiagnostic = (restart = false) =>
  apiClient.post<SessionSummary>("practice/diagnostic", { restart });

export const getDiagnosticReport = (sessionId: string) =>
  apiClient.get<DiagnosticReport>(`practice/diagnostic/${sessionId}/report`);

export const adminDiagnosticStatus = () =>
  apiClient.get<{
    available: boolean;
    total_questions: number;
    structure: { part: number; count: number }[];
    missing: { part: number; needed: number; got: number }[];
    generated_at: string | null;
  }>("practice/admin/diagnostic");

export const adminRegenerateDiagnostic = () =>
  apiClient.post<{
    available: boolean;
    total_questions: number;
    structure: { part: number; count: number }[];
    missing: { part: number; needed: number; got: number }[];
    generated_at: string | null;
  }>("practice/admin/diagnostic/regenerate");

export const LEVEL_LABELS: Record<Level, string> = {
  insufficient: "Chưa đủ dữ liệu",
  weak: "Yếu",
  average: "Trung bình",
  good: "Tốt",
};

export const WINDOW_LABELS: Record<WindowKey, string> = {
  "7": "7 ngày",
  "30": "30 ngày",
  "90": "90 ngày",
  all: "Toàn bộ",
};

/** Màu theo mức (Yếu / Trung bình / Tốt / chưa đủ dữ liệu). */
export const LEVEL_CLASS: Record<
  Level,
  { bar: string; text: string; chip: string }
> = {
  weak: {
    bar: "bg-rose-500",
    text: "text-rose-300",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  },
  average: {
    bar: "bg-amber-400",
    text: "text-amber-300",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  good: {
    bar: "bg-emerald-500",
    text: "text-emerald-300",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  insufficient: {
    bar: "bg-slate-600",
    text: "text-slate-400",
    chip: "border-slate-700 bg-slate-800/60 text-slate-400",
  },
};
