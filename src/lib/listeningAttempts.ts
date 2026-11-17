/**
 * Kết quả "Làm thử" (bước đầu) và "Làm lại" (bước cuối) của một bài Luyện nghe từng bước,
 * lưu trong trình duyệt để so sánh lần đầu với lần làm lại. Chỉ để học viên tự xem tiến bộ,
 * không cộng điểm, không gửi lên server.
 */
export interface AttemptResult {
  correct: number;
  total: number;
  at: number;
}

export interface UnitAttempts {
  first?: AttemptResult;
  final?: AttemptResult;
}

const key = (userId: string | undefined, unitKey: string) =>
  `lenglish_listening_attempts_${userId || "guest"}_${unitKey}`;

export function readAttempts(userId: string | undefined, unitKey: string): UnitAttempts {
  try {
    const raw = localStorage.getItem(key(userId, unitKey));
    return raw ? (JSON.parse(raw) as UnitAttempts) : {};
  } catch {
    return {};
  }
}

export function saveAttempt(
  userId: string | undefined,
  unitKey: string,
  mode: "first" | "final",
  result: AttemptResult,
): UnitAttempts {
  const next = { ...readAttempts(userId, unitKey), [mode]: result };
  try {
    localStorage.setItem(key(userId, unitKey), JSON.stringify(next));
  } catch {
    // Trình duyệt chặn bộ nhớ: chỉ mất phần so sánh
  }
  return next;
}
