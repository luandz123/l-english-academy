export interface LessonAccessContext {
  isAdmin: boolean;
  /** Có dòng enrollments(user, course). Bỏ qua `expires_at` như client cũ — OPEN_QUESTIONS #18. */
  enrolled: boolean;
  courseIsFree: boolean;
  moduleIsFree: boolean;
  lessonIsFree: boolean;
}

/**
 * Quyền xem nội dung bài (video, PDF, tài liệu). Chuyển từ `LearnPage.tsx:219-224`
 * (`enrollment || course.is_free || module.is_free || lesson.is_free`, admin có
 * enrollment giả). Đổi quy tắc truy cập chỉ sửa ở đây.
 */
export function canStudyLesson(ctx: LessonAccessContext): boolean {
  return (
    ctx.isAdmin ||
    ctx.enrolled ||
    ctx.courseIsFree ||
    ctx.moduleIsFree ||
    ctx.lessonIsFree
  );
}

/**
 * Dựng ngữ cảnh từ dữ liệu có thể thiếu: bài không có module → không biết khóa,
 * nên `moduleIsFree = enrolled = courseIsFree = false`; khách không có enrollment.
 */
export function lessonAccessContext(input: {
  isAdmin: boolean;
  hasEnrollment: boolean;
  course: { is_free: boolean | null } | null;
  module: { isFree: boolean | null } | null;
  lesson: { isFree: boolean | null };
}): LessonAccessContext {
  return {
    isAdmin: input.isAdmin,
    enrolled: input.module !== null && input.hasEnrollment,
    courseIsFree: input.module !== null && Boolean(input.course?.is_free),
    moduleIsFree: Boolean(input.module?.isFree),
    lessonIsFree: Boolean(input.lesson.isFree),
  };
}
