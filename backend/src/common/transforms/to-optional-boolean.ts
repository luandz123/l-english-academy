/**
 * Chuyển đổi query param thành boolean tùy chọn:
 * - 'true' hoặc true -> true
 * - 'false' hoặc false -> false
 * - undefined, null, '' -> undefined (không lọc)
 * - Giá trị khác -> giữ nguyên để class-validator @IsBoolean() xử lý (400 VALIDATION_FAILED)
 */
export function toOptionalBoolean(input: unknown): unknown {
  const value =
    typeof input === 'object' && input !== null && 'value' in input
      ? input.value
      : input;

  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return value;
}
