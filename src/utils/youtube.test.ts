import { describe, expect, it } from "vitest";
import { getYouTubeId, readYouTubeCurrentTime, toYouTubeEmbedUrl } from "./youtube";

describe("getYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
  ])("%s", (url, id) => {
    expect(getYouTubeId(url)).toBe(id);
  });

  it("không phải YouTube thì null", () => {
    expect(getYouTubeId("https://cdn.example.com/video.mp4")).toBeNull();
    expect(getYouTubeId("")).toBeNull();
  });
});

describe("toYouTubeEmbedUrl", () => {
  it("tạo link nhúng có JS API và giữ mốc thời gian", () => {
    const url = toYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=1m30s", "https://lenglish.vn");
    expect(url.startsWith("https://www.youtube.com/embed/dQw4w9WgXcQ?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("enablejsapi")).toBe("1");
    expect(params.get("rel")).toBe("0");
    expect(params.get("start")).toBe("90");
    expect(params.get("origin")).toBe("https://lenglish.vn");
  });

  it("giữ nguyên link không phải YouTube", () => {
    expect(toYouTubeEmbedUrl("https://cdn.example.com/a.mp4")).toBe("https://cdn.example.com/a.mp4");
  });
});

describe("readYouTubeCurrentTime", () => {
  const msg = (origin: string, data: unknown) => ({ origin, data }) as MessageEvent;

  it("đọc currentTime từ message của YouTube", () => {
    expect(readYouTubeCurrentTime(msg("https://www.youtube.com", JSON.stringify({ event: "infoDelivery", info: { currentTime: 12.5 } })))).toBe(12.5);
  });

  it("bỏ qua message từ nguồn khác", () => {
    expect(readYouTubeCurrentTime(msg("https://evil.example", JSON.stringify({ info: { currentTime: 5 } })))).toBeNull();
  });

  it("bỏ qua message không có thời gian", () => {
    expect(readYouTubeCurrentTime(msg("https://www.youtube.com", JSON.stringify({ event: "onReady" })))).toBeNull();
  });
});
