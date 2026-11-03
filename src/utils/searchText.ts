/** Chuẩn hóa chuỗi để tìm kiếm: bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng. */
export const normalizeSearchText = (value: string | null | undefined): string =>
  (value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** true nếu mọi từ trong `query` đều xuất hiện trong ít nhất một trường của `fields` (không phân biệt dấu). */
export const matchesSearch = (query: string, fields: Array<string | null | undefined>): boolean => {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map(normalizeSearchText).join(" ");
  return words.every((w) => haystack.includes(w));
};
