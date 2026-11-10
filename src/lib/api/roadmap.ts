/**
 * Lộ trình học cá nhân (`/api/v1/roadmap`). Tổng giờ, chặng, tài nguyên và điểm ước lượng
 * từ bài test nhanh đều do server tính — client chỉ gửi lựa chọn trong wizard.
 */
import { apiClient } from "./client";

export type RoadmapCurrentMode = "score" | "none" | "placement";
export type RoadmapPurpose = "graduation" | "job" | "promotion" | "reflex";
export type RoadmapStatus = "on_track" | "tight" | "at_risk";

export interface RoadmapResource {
  type: "module" | "vocab" | "full_test";
  id: number;
  title: string;
  subtitle: string | null;
  url: string;
}

export interface RoadmapPhase {
  key: string;
  title: string;
  description: string;
  from_score: number;
  to_score: number;
  hours: number;
  weeks: number;
  start_week: number;
  end_week: number;
  start_date: string;
  end_date: string;
  focus: { grammar: number; vocab: number; listening: number; reading: number };
  grammar_topics: string[];
  vocab_topics: string[];
  practice: string[];
  resources: RoadmapResource[];
}

export interface Roadmap {
  id: string;
  current_mode: RoadmapCurrentMode;
  current_score: number;
  target_score: number;
  purpose: RoadmapPurpose;
  exam_date: string | null;
  duration_weeks: number;
  minutes_per_day: number;
  days_per_week: number;
  started_at: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  purpose_note: string;
  summary: {
    required_hours: number;
    available_hours: number;
    weekly_hours: number;
    status: RoadmapStatus;
    recommended_minutes_per_day: number;
    achievable_score: number;
    total_weeks: number;
    current_week: number;
    current_phase_index: number;
  };
  phases: RoadmapPhase[];
  /** Cá nhân hóa theo điểm yếu (P03) */
  personal?: RoadmapPersonal | null;
}

export interface RoadmapWeekTask {
  key: string;
  type: "practice" | "mistakes" | "mini_test" | "full_test" | "lesson";
  title: string;
  target: number;
  done: number;
  unit: string;
  part?: number;
  category?: string;
  url: string;
  minutes: number;
}

export interface RoadmapPersonal {
  focus_source: "analysis" | "diagnostic" | null;
  focus: {
    part: number;
    category: string;
    label: string;
    accuracy: number;
    answered: number;
    required: number;
    achieved: boolean;
    practice: { action: "practice" | "review" | "locked" | "none"; available: number; mistakes: number };
  }[];
  deferred: string[];
  adjusted_focus: RoadmapPhase["focus"];
  adjustment_note: string | null;
  week: { week_start: string; tasks: RoadmapWeekTask[]; completed: number; total: number };
  notices: { type: "focus_changed" | "last_week" | "score_exceeded" | "phase_done"; message: string; action?: { label: string; kind: "advance" | "link"; url?: string } }[];
}

export interface RoadmapPlacement {
  quiz: {
    id: number;
    course_id: number;
    title: string;
    total_questions: number;
    time_limit_seconds: number | null;
  } | null;
  /** Bài kiểm tra trình độ (P01); có thì thay cho bài test nhanh cũ */
  diagnostic?: { total_questions: number; minutes: number } | null;
  latest_result: {
    id: number;
    source?: "quiz" | "diagnostic";
    session_id?: string;
    range?: { min: number; max: number } | null;
    correct_answers: number;
    total_questions: number;
    estimated_score: number;
    completed_at: string | null;
  } | null;
}

export interface SaveRoadmapBody {
  current_mode: RoadmapCurrentMode;
  current_score?: number;
  target_score: number;
  purpose: RoadmapPurpose;
  exam_date?: string;
  duration_weeks?: number;
  minutes_per_day: number;
  days_per_week: number;
}

export async function getMyRoadmap(): Promise<Roadmap | null> {
  const res = await apiClient.get<{ roadmap: Roadmap | null }>("roadmap/me");
  return res.roadmap;
}

export function saveMyRoadmap(body: SaveRoadmapBody): Promise<Roadmap> {
  return apiClient.put<Roadmap>("roadmap/me", body);
}

export function deleteMyRoadmap(): Promise<void> {
  return apiClient.delete<void>("roadmap/me");
}

export function getRoadmapPlacement(): Promise<RoadmapPlacement> {
  return apiClient.get<RoadmapPlacement>("roadmap/placement");
}

/** Đánh dấu học viên đang làm bài test nhanh từ wizard, để trang kết quả hiện nút quay lại. */
const PLACEMENT_FLAG = "roadmap_placement_quiz";
export function markPlacementStarted(quizId: number): void {
  try {
    sessionStorage.setItem(PLACEMENT_FLAG, String(quizId));
  } catch {
    /* trình duyệt chặn storage: chỉ mất nút quay lại */
  }
}
export function isPlacementQuiz(quizId: string | number | undefined): boolean {
  try {
    return quizId !== undefined && sessionStorage.getItem(PLACEMENT_FLAG) === String(quizId);
  } catch {
    return false;
  }
}

/** Điểm ước lượng mới đã vượt chặng: chuyển sang chặng sau (học viên bấm đồng ý). */
export async function advanceRoadmap(): Promise<Roadmap> {
  return apiClient.post<Roadmap>("roadmap/me/advance");
}
