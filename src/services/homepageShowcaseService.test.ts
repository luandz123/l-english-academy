import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_BANNER, normalizeHeroBanner } from "./homepageShowcaseService";

describe("normalizeHeroBanner", () => {
  it("không có cấu hình → nền sao băng mặc định, 8 giây", () => {
    expect(normalizeHeroBanner(undefined)).toEqual(DEFAULT_HERO_BANNER);
  });

  it("bỏ nền lỗi (thiếu URL, sai loại), giới hạn độ tối và thời gian", () => {
    const res = normalizeHeroBanner({
      interval_seconds: 1,
      backgrounds: [
        { id: "a", type: "image", url: "https://x/a.gif", dim: 200, enabled: true },
        { id: "b", type: "image", url: "  " },
        { id: "c", type: "audio", url: "https://x/c.mp3" },
        { id: "d", type: "video", url: "https://x/d.mp4", dim: -5 },
      ],
    });
    expect(res.interval_seconds).toBe(3);
    expect(res.backgrounds.map((b) => b.id)).toEqual(["a", "d"]);
    expect(res.backgrounds[0].dim).toBe(80);
    expect(res.backgrounds[1]).toMatchObject({ dim: 0, enabled: true });
  });

  it("danh sách rỗng sau khi lọc → quay về nền mặc định", () => {
    expect(normalizeHeroBanner({ backgrounds: [{ id: "x", type: "image" }] }).backgrounds).toEqual(DEFAULT_HERO_BANNER.backgrounds);
  });
});
