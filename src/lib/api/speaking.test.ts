import { afterEach, describe, expect, it, vi } from "vitest";
import { createSpeakingRoom, fetchPublicRooms, joinSpeakingRoom, getVoiceToken } from "@/services/speakingService";
import { transcribeSpeech } from "@/lib/api/speaking";

function mockFetch(...responses: Array<[number, unknown]>) {
  const fn = vi.fn();
  for (const [status, body] of responses) {
    fn.mockResolvedValueOnce(
      new Response(body === null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
    );
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("speakingService → backend /api/v1/speaking", () => {
  it("tạo phòng gửi đúng trường, không gửi host_user_id/status; trả room + session_id", async () => {
    const fetchMock = mockFetch([201, { member_id: "m1", session_id: "s1", role: "host", is_existing: false, room: { id: "r1", name: "A" } }]);
    const res = await createSpeakingRoom({ name: "  A  ", english_level: "B1", topics: ["Travel"], capacity: 9, visibility: "public", passcode: "X" });
    expect(res).toMatchObject({ success: true, session_id: "s1", room: { id: "r1" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/speaking/rooms");
    expect(JSON.parse(init.body)).toEqual({ name: "A", english_level: "B1", topics: ["Travel"], capacity: 5, visibility: "public" });
  });

  it("lọc phòng chuyển thành query; lỗi server → danh sách rỗng", async () => {
    const fetchMock = mockFetch([200, []], [500, { code: "X", message: "boom" }]);
    await fetchPublicRooms({ level: "B2", topic: "all", hasSlotsOnly: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/speaking/rooms?level=B2&has_slots=true");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchPublicRooms()).toEqual([]);
  });

  it("vào phòng sai mã → success false kèm thông báo của server", async () => {
    mockFetch([403, { code: "INVALID_PASSCODE", message: "Mã tham gia phòng riêng tư không chính xác" }]);
    expect(await joinSpeakingRoom("r1", "bad")).toEqual({ success: false, error: "Mã tham gia phòng riêng tư không chính xác" });
  });

  it("token âm thanh lấy từ backend; người ngoài phòng → ném lỗi", async () => {
    const fetchMock = mockFetch([200, { mode: "webrtc-mesh", roomId: "r1" }], [403, { code: "NOT_MEMBER", message: "Bạn chưa vào phòng này" }]);
    expect(await getVoiceToken("r1")).toMatchObject({ mode: "webrtc-mesh" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/speaking/rooms/r1/token");
    await expect(getVoiceToken("r1")).rejects.toThrow("Bạn chưa vào phòng này");
  });

  it("nhận giọng shadowing: gửi multipart file đúng đuôi, không gửi điểm; lỗi server → error", async () => {
    const fetchMock = mockFetch([200, { text: "Good morning." }], [503, { code: "STT_NOT_CONFIGURED", message: "x" }]);
    const res = await transcribeSpeech(new Blob(["a"], { type: "audio/webm;codecs=opus" }));
    expect(res).toEqual({ data: { text: "Good morning." }, error: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/speaking/transcribe");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect([...form.keys()]).toEqual(["file"]);
    expect((form.get("file") as File).name).toBe("speech.webm");
    const failed = await transcribeSpeech(new Blob(["a"], { type: "audio/mp4" }));
    expect(failed.data).toBeNull();
    expect(failed.error?.code).toBe("STT_NOT_CONFIGURED");
    expect((fetchMock.mock.calls[1][1].body.get("file") as File).name).toBe("speech.mp4");
  });
});
