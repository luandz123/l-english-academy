/**
 * Lịch hoạt động 52 tuần và chuỗi ngày học (dùng chung cho Hồ sơ và Tiến độ học tập để hai nơi
 * hiện cùng một con số). Nguồn: bài quiz, Full Test đã nộp và bài học đã xem trên server.
 */
export interface ActivityInput {
  quizResults: { completed_at?: string | null }[];
  fullTestResults: { completed_at?: string | null }[];
  lessonProgress: { created_at?: string | null }[];
}

export function computeActivityStats({
  quizResults,
  fullTestResults,
  lessonProgress,
}: ActivityInput) {
  const dateCountMap = new Map<string, number>();
  // Ngày theo giờ máy người học (không cắt chuỗi ISO UTC: làm bài sau 0h–7h sáng VN bị tính sang hôm trước)
  const localDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Add quiz submissions
  quizResults.forEach((q) => {
    if (q.completed_at) {
      const d = localDay(q.completed_at);
      dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
    }
  });

  // Add full test submissions
  fullTestResults.forEach((t) => {
    if (t.completed_at) {
      const d = localDay(t.completed_at);
      dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
    }
  });

  // Add lesson completions
  lessonProgress.forEach((p) => {
    if (p.created_at) {
      const d = localDay(p.created_at);
      dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
    }
  });

  let totalSubmissions = 0;
  dateCountMap.forEach((cnt) => {
    totalSubmissions += cnt;
  });

  // Generate last 52 weeks (364 days ending today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = (today.getDay() + 6) % 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - currentDayOfWeek - 51 * 7);

  const weeks: Array<
    Array<{ dateStr: string; count: number; dayOfWeek: number }>
  > = [];
  let currentWeek: Array<{
    dateStr: string;
    count: number;
    dayOfWeek: number;
  }> = [];

  const loopDate = new Date(startDate);
  let activeDaysCount = 0;
  let rollingStreak = 0;
  let computedMaxStreak = 0;

  for (let i = 0; i < 52 * 7; i++) {
    const year = loopDate.getFullYear();
    const month = String(loopDate.getMonth() + 1).padStart(2, "0");
    const day = String(loopDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const count = dateCountMap.get(dateStr) || 0;
    if (count > 0) {
      activeDaysCount++;
      rollingStreak++;
      if (rollingStreak > computedMaxStreak) {
        computedMaxStreak = rollingStreak;
      }
    } else {
      rollingStreak = 0;
    }

    currentWeek.push({
      dateStr,
      count,
      dayOfWeek: loopDate.getDay(),
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    loopDate.setDate(loopDate.getDate() + 1);
  }

  // Chuỗi hiện tại: số ngày liên tiếp có làm bài, tính tới hôm nay (hoặc hôm qua nếu hôm nay chưa học)
  let currentRun = 0;
  const cursor = new Date(today);
  if (!dateCountMap.has(localDay(cursor.toISOString())))
    cursor.setDate(cursor.getDate() - 1);
  while (dateCountMap.has(localDay(cursor.toISOString()))) {
    currentRun++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    heatmapWeeks: weeks,
    totalActiveDays: activeDaysCount,
    maxYearStreak: computedMaxStreak,
    currentStreak: currentRun,
    totalYearSubmissions: totalSubmissions,
  };
}
