import type { RoadmapPurpose, RoadmapStatus } from "@/lib/api/roadmap";

export const PURPOSE_LABELS: Record<RoadmapPurpose, string> = {
  graduation: "Tốt nghiệp đại học",
  job: "Xin việc",
  promotion: "Thăng chức",
  reflex: "Nâng phản xạ",
};

export const STATUS_META: Record<RoadmapStatus, { label: string; className: string }> = {
  on_track: { label: "Khả thi", className: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40" },
  tight: { label: "Hơi gấp", className: "text-amber-300 bg-amber-500/15 border-amber-500/40" },
  at_risk: { label: "Chưa đủ thời gian", className: "text-rose-300 bg-rose-500/15 border-rose-500/40" },
};

/** 'YYYY-MM-DD' → 'dd/mm/yyyy' (không đổi múi giờ). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
