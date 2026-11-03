/**
 * Tiện ích cho video bài giảng YouTube.
 * - toYouTubeEmbedUrl: đổi mọi dạng link YouTube sang link nhúng, giữ mốc thời gian bắt đầu,
 *   bật JS API để trang đọc được thời gian đang phát (dùng cho bài tập bật lên giữa video).
 * - Link không phải YouTube (mp4, Drive...) được trả lại nguyên vẹn.
 */

const ID = "([A-Za-z0-9_-]{6,})";
const PATTERNS = [
  new RegExp(`youtu\\.be/${ID}`),
  new RegExp(`youtube(?:-nocookie)?\\.com/embed/${ID}`),
  new RegExp(`youtube\\.com/(?:shorts|live)/${ID}`),
  new RegExp(`youtube\\.com/.*[?&]v=${ID}`),
];

export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const re of PATTERNS) {
    const m = re.exec(url);
    if (m) return m[1];
  }
  return null;
}

/** "90", "1m30s", "1h2m3s" → giây */
function parseStart(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

export function toYouTubeEmbedUrl(url: string, origin?: string): string {
  const id = getYouTubeId(url);
  if (!id) return url;
  let start: number | null = null;
  try {
    const parsed = new URL(url);
    start = parseStart(parsed.searchParams.get("t") || parsed.searchParams.get("start"));
  } catch {
    /* link không hợp lệ, bỏ qua mốc thời gian */
  }
  const params = new URLSearchParams({ rel: "0", enablejsapi: "1", playsinline: "1" });
  if (origin) params.set("origin", origin);
  if (start) params.set("start", String(start));
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Đọc thời gian phát (giây) từ message mà iframe YouTube gửi về; null nếu không phải message của YouTube. */
export function readYouTubeCurrentTime(event: MessageEvent): number | null {
  if (typeof event.origin !== "string" || !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(event.origin)) return null;
  let data: unknown = event.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const t = (data as { info?: { currentTime?: unknown } } | null)?.info?.currentTime;
  return typeof t === "number" && Number.isFinite(t) ? t : null;
}

/** Gửi lệnh tới iframe YouTube (cần enablejsapi=1). */
export function postYouTubeCommand(iframe: HTMLIFrameElement | null, func: "pauseVideo" | "playVideo") {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
}

/** Báo cho iframe YouTube biết trang muốn nhận sự kiện (thời gian phát, trạng thái). */
export function listenToYouTube(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
}
