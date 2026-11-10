import type { ExamRecommendation } from "@/lib/api/analytics";

/** Link vào màn chuẩn bị Full Test, chọn sẵn Part theo chế độ đề xuất. */
export const examRecUrl = (r: ExamRecommendation) => {
  const base = r.course_id ? `/courses/${r.course_id}/fulltest/${r.test_id}` : `/fulltests/${r.test_id}`;
  return r.mode.full ? base : `${base}?parts=${r.mode.parts.join(",")}`;
};
