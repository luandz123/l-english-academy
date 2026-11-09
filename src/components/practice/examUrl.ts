import type { ExamCard } from "@/lib/api/practice";

/** Đường vào làm đề: theo khóa của đề (route cũ của Full Test). */
export const examStartUrl = (e: Pick<ExamCard, "id" | "course_id">) =>
  e.course_id ? `/courses/${e.course_id}/fulltest/${e.id}` : `/fulltests/${e.id}`;
