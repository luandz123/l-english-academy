/**
 * Các con số giả định của đặc tả "Ưu tiên 2" (mục 7) — chủ dự án đã duyệt giữ nguyên (D14).
 * Đổi giá trị ở đây không làm thay đổi luồng.
 */
export const ANALYTICS_CONFIG = {
  /** Một dạng câu được kết luận khi đã làm ít nhất N câu. */
  minAnswersPerCategory: 10,
  /** Một Part được kết luận khi đã làm ít nhất N câu. */
  minAnswersPerPart: 20,
  /** Ngưỡng riêng cho bài chẩn đoán (P01). */
  minAnswersPerCategoryDiagnostic: 3,
  /** Mức: Yếu < weak, Trung bình < good, Tốt ≥ good (tỉ lệ đúng, %). */
  weakBelow: 50,
  goodFrom: 75,
  /** Xu hướng chỉ hiện khi chênh ≥ N điểm %. */
  trendMinDelta: 5,
  /** Dấu hiệu "Bỏ trống nhiều": tỉ lệ câu bỏ trống ≥ N. */
  manyBlanksRate: 0.2,
  /** Dấu hiệu "Làm chậm": cần ít nhất N câu có đo thời gian. */
  minTimedAnswers: 5,
  /** Tối đa N dạng cùng một Part trong "3 điểm yếu". */
  maxWeakPerPart: 2,
  topWeakCount: 3,
  /** Số câu mặc định khi bấm "Luyện 10 câu dạng này". */
  practiceCount: 10,
  /** Lộ trình: điều chỉnh tỉ trọng tối đa ±N điểm %, mỗi dạng yếu +step. */
  roadmapMaxShift: 15,
  roadmapShiftStep: 5,
  /** Mức cần đạt để qua chặng (tỉ lệ đúng của dạng trọng tâm). */
  roadmapPassBasic: 65,
  roadmapPassAdvanced: 75,
  /** Đề xuất đề: dải điểm → độ khó phù hợp. */
  easyBelowScore: 450,
  hardAboveScore: 750,
  /** Làm lại đề cũ khi đã cách ≥ N ngày; làm đủ đề khi Full Test đủ 7 Part gần nhất cách ≥ N ngày. */
  redoAfterDays: 30,
  fullTestEveryDays: 14,
  skipDays: 7,
  /** Điểm ước lượng cũ hơn N ngày thì nhắc làm bài mới. */
  staleScoreDays: 60,
} as const;

export const WINDOWS = ['7', '30', '90', 'all'] as const;
export type WindowKey = (typeof WINDOWS)[number];

export function windowDays(w: WindowKey): number | null {
  return w === 'all' ? null : Number(w);
}

/** Số thứ tự câu đầu tiên của mỗi Part trong đề 200 câu. */
export const PART_FIRST_NUMBER: Record<number, number> = {
  1: 1,
  2: 7,
  3: 32,
  4: 71,
  5: 101,
  6: 131,
  7: 147,
};

/** Số câu chuẩn mỗi Part của đề thật (ước thời lượng khi đề xuất làm một số Part). */
export const PART_STANDARD_COUNT: Record<number, number> = {
  1: 6,
  2: 25,
  3: 39,
  4: 30,
  5: 30,
  6: 16,
  7: 54,
};
