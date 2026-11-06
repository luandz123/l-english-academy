/**
 * Adapter phòng luyện nói gọi backend NestJS (`/api/v1/speaking`, T-031) thay cho bảng/RPC Supabase
 * (chưa từng có trên production — OPEN_QUESTIONS #11) và `api/speaking-token.ts`.
 * Trả đúng shape `src/types/speaking.ts` để component không phải đổi.
 */
import type { EnglishLevel, RoomVisibility, SpeakingRoom } from "@/types/speaking";
import { apiClient, toResult, ApiError } from "./client";

export interface CreateRoomBody {
  name: string;
  english_level: EnglishLevel;
  topics: string[];
  capacity: number;
  visibility: RoomVisibility;
  passcode?: string;
}

export interface JoinResult {
  member_id: string;
  session_id: string | null;
  role: "host" | "member";
  is_existing: boolean;
}

export interface CreateRoomResult extends JoinResult {
  room: SpeakingRoom;
}

export interface LeaveResult {
  duration_seconds: number;
  remaining_members: number;
}

export interface MatchResult {
  matched: boolean;
  room: SpeakingRoom | null;
}

export interface SpeakingStats {
  total_speaking_seconds: number;
  english_level: EnglishLevel;
}

export interface VoiceToken {
  mode: "livekit" | "webrtc-mesh";
  roomId: string;
  identity: string;
  name: string;
  avatarUrl: string | null;
  token?: string;
  url?: string;
  iceServers?: { urls: string }[];
}

type Result<T> = Promise<{ data: T | null; error: ApiError | null }>;

export function listSpeakingRooms(filters?: { level?: string; topic?: string; hasSlotsOnly?: boolean }): Result<SpeakingRoom[]> {
  return toResult(
    apiClient.get<SpeakingRoom[]>("speaking/rooms", {
      query: {
        level: filters?.level && filters.level !== "all" ? filters.level : undefined,
        topic: filters?.topic && filters.topic !== "all" ? filters.topic : undefined,
        has_slots: filters?.hasSlotsOnly ? true : undefined,
      },
    }),
  );
}

export function getSpeakingRoom(roomId: string): Result<SpeakingRoom> {
  return toResult(apiClient.get<SpeakingRoom>(`speaking/rooms/${encodeURIComponent(roomId)}`));
}

export function createSpeakingRoomApi(body: CreateRoomBody): Result<CreateRoomResult> {
  return toResult(apiClient.post<CreateRoomResult>("speaking/rooms", body));
}

export function joinSpeakingRoomApi(roomId: string, passcode?: string): Result<JoinResult> {
  return toResult(
    apiClient.post<JoinResult>(`speaking/rooms/${encodeURIComponent(roomId)}/join`, passcode ? { passcode } : {}),
  );
}

export function leaveSpeakingRoomApi(roomId: string, sessionId?: string): Result<LeaveResult> {
  return toResult(
    apiClient.post<LeaveResult>(
      `speaking/rooms/${encodeURIComponent(roomId)}/leave`,
      sessionId ? { session_id: sessionId } : {},
    ),
  );
}

export function closeSpeakingRoomApi(roomId: string): Result<null> {
  return toResult(apiClient.post<null>(`speaking/rooms/${encodeURIComponent(roomId)}/close`));
}

export function matchSpeakingRoomApi(level: EnglishLevel, topics: string[]): Result<MatchResult> {
  return toResult(apiClient.post<MatchResult>("speaking/match", { level, topics }));
}

export function getMySpeakingStats(): Result<SpeakingStats> {
  return toResult(apiClient.get<SpeakingStats>("speaking/me/stats"));
}

export function updateMyEnglishLevel(level: EnglishLevel): Result<SpeakingStats> {
  return toResult(apiClient.put<SpeakingStats>("speaking/me/level", { english_level: level }));
}

export function getSpeakingVoiceToken(roomId: string): Result<VoiceToken> {
  return toResult(apiClient.post<VoiceToken>(`speaking/rooms/${encodeURIComponent(roomId)}/token`));
}

/**
 * Nhận giọng shadowing bằng Whisper ở server (khi Web Speech API của trình duyệt không chạy).
 * Server chỉ trả chữ; việc so với câu mẫu vẫn ở component như cũ.
 */
export function transcribeSpeech(audio: Blob): Result<{ text: string }> {
  const type = audio.type.split(";")[0];
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  const formData = new FormData();
  formData.append("file", audio, `speech.${ext}`);
  return toResult(apiClient.post<{ text: string }>("speaking/transcribe", formData));
}
