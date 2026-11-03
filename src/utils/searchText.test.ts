import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearchText } from "./searchText";

describe("normalizeSearchText", () => {
  it("bỏ dấu tiếng Việt và chữ hoa", () => {
    expect(normalizeSearchText("  Luyện Đề  ETS ")).toBe("luyen de ets");
  });
});

describe("matchesSearch", () => {
  const fields = ["Bộ đề ETS 2026", "Đề sát thật", null];

  it("khớp khi gõ không dấu", () => {
    expect(matchesSearch("bo de ets", fields)).toBe(true);
  });

  it("khớp khi mọi từ có mặt ở bất kỳ trường nào", () => {
    expect(matchesSearch("ets sát thật", fields)).toBe(true);
  });

  it("không khớp khi thiếu một từ", () => {
    expect(matchesSearch("ets ngữ pháp", fields)).toBe(false);
  });

  it("chuỗi rỗng khớp tất cả", () => {
    expect(matchesSearch("   ", fields)).toBe(true);
  });
});
