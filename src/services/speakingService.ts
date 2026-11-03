import {
  closeSpeakingRoomApi,
  createSpeakingRoomApi,
  getMySpeakingStats,
  getSpeakingRoom,
  getSpeakingVoiceToken,
  joinSpeakingRoomApi,
  leaveSpeakingRoomApi,
  listSpeakingRooms,
  matchSpeakingRoomApi,
  updateMyEnglishLevel,
} from "@/lib/api/speaking";
import { EnglishLevel, RoomVisibility, SpeakingRoom } from "@/types/speaking";

export interface CreateRoomInput {
  name: string;
  english_level: EnglishLevel;
  topics: string[];
  capacity: number;
  visibility: RoomVisibility;
  passcode?: string;
}

export interface RoomFilters {
  level?: string;
  topic?: string;
  hasSlotsOnly?: boolean;
}

// Generate secure random alphanumeric passcode for private rooms
export function generateRandomRoomPasscode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable without confusing 0/O, 1/I
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Phòng luyện nói: các hàm giữ nguyên chữ ký cũ, nay gọi backend (`src/lib/api/speaking.ts`, T-032).
 * Quyền, sĩ số, mã phòng, thời gian nói đều do server kiểm tra.
 */

/** Phòng công khai đang mở kèm thành viên. Lỗi → danh sách rỗng (như cũ). */
export async function fetchPublicRooms(filters?: RoomFilters): Promise<SpeakingRoom[]> {
  const { data, error } = await listSpeakingRooms(filters);
  if (error) {
    console.error("[speakingService] fetchPublicRooms error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Chi tiết phòng (mã phòng riêng tư chỉ có khi mình là chủ phòng). */
export async function fetchRoomDetails(roomId: string): Promise<SpeakingRoom | null> {
  const { data } = await getSpeakingRoom(roomId);
  return data ? { ...data, members: data.members?.map((m) => ({ ...m, connection_status: "connected" as const })) } : null;
}

/** Tạo phòng; chủ phòng được server cho vào phòng ngay (trả kèm session_id). */
export async function createSpeakingRoom(
  input: CreateRoomInput,
): Promise<{ success: boolean; room?: SpeakingRoom; session_id?: string; error?: string }> {
  const { data, error } = await createSpeakingRoomApi({
    name: input.name.trim(),
    english_level: input.english_level,
    topics: input.topics,
    capacity: Math.min(5, Math.max(2, input.capacity)),
    visibility: input.visibility,
    passcode: input.visibility === "private" ? input.passcode?.trim() || undefined : undefined,
  });
  if (error || !data) return { success: false, error: error?.message || "Không thể tạo phòng lúc này" };
  return { success: true, room: data.room, session_id: data.session_id ?? undefined };
}

export async function joinSpeakingRoom(
  roomId: string,
  passcode?: string,
): Promise<{ success: boolean; member_id?: string; session_id?: string; error?: string; role?: string }> {
  const { data, error } = await joinSpeakingRoomApi(roomId, passcode);
  if (error || !data) return { success: false, error: error?.message || "Lỗi tham gia phòng" };
  return { success: true, member_id: data.member_id, session_id: data.session_id ?? undefined, role: data.role };
}

export async function leaveSpeakingRoom(roomId: string, sessionId?: string): Promise<boolean> {
  const { error } = await leaveSpeakingRoomApi(roomId, sessionId);
  if (error) console.error("[speakingService] leaveSpeakingRoom error:", error.message);
  return !error;
}

/** Đóng phòng (server chỉ cho chủ phòng). */
export async function closeSpeakingRoom(roomId: string): Promise<boolean> {
  const { error } = await closeSpeakingRoomApi(roomId);
  return !error;
}

export async function matchSpeakingRoom(
  level: EnglishLevel,
  topics: string[],
): Promise<{ matched: boolean; room?: SpeakingRoom; error?: string }> {
  const { data, error } = await matchSpeakingRoomApi(level, topics);
  if (error || !data) return { matched: false, error: error?.message };
  return data.matched && data.room ? { matched: true, room: data.room } : { matched: false };
}

/** Thống kê thời gian nói của chính mình (tham số userId giữ cho tương thích). */
export async function fetchUserSpeakingStats(_userId: string): Promise<{
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  englishLevel: EnglishLevel;
}> {
  const { data } = await getMySpeakingStats();
  const totalSeconds = data?.total_speaking_seconds || 0;
  return {
    totalSeconds,
    totalMinutes: Math.floor(totalSeconds / 60),
    totalHours: Number((totalSeconds / 3600).toFixed(1)),
    englishLevel: data?.english_level || "B1",
  };
}

export async function updateUserEnglishLevel(_userId: string, level: EnglishLevel): Promise<boolean> {
  const { error } = await updateMyEnglishLevel(level);
  return !error;
}

/** Token âm thanh (LiveKit hoặc WebRTC mesh) — chỉ cấp cho thành viên đã vào phòng. */
export async function getVoiceToken(roomId: string, _passcode?: string) {
  const { data, error } = await getSpeakingVoiceToken(roomId);
  if (error || !data) throw new Error(error?.message || "Không thể khởi tạo kết nối âm thanh");
  return data;
}
