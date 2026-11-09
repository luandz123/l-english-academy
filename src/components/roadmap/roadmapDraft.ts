import type { RoadmapCurrentMode, RoadmapPurpose } from "@/lib/api/roadmap";

/** Nháp wizard lộ trình, giữ trong sessionStorage khi học viên rời đi làm bài test nhanh. */
const DRAFT_KEY = "roadmap_wizard_draft";

export interface WizardDraft {
  step: number;
  mode: RoadmapCurrentMode;
  score: string;
  target: string;
  purpose: RoadmapPurpose;
  timeframe: "weeks" | "date";
  weeks: number;
  examDate: string;
  minutes: number;
  days: number;
}

export function loadDraft(): WizardDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}
export function saveDraft(d: WizardDraft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* bỏ qua */
  }
}

export const clearRoadmapDraft = () => saveDraft(null);
