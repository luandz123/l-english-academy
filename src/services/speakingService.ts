import { supabase } from "@/integrations/supabase/client";
import { authClient } from "@/lib/api/auth";
import { 
  EnglishLevel, 
  RoomVisibility, 
  SpeakingRoom, 
  SpeakingMember, 
  SpeakingSession 
} from "@/types/speaking";

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
 * Fetch public active rooms with member counts and avatars
 */
export async function fetchPublicRooms(filters?: RoomFilters): Promise<SpeakingRoom[]> {
  try {
    let query = supabase
      .from("speaking_rooms" as any)
      .select(`
        id,
        name,
        host_user_id,
        english_level,
        topics,
        visibility,
        capacity,
        status,
        created_at,
        expires_at
      `)
      .eq("status", "active")
      .eq("visibility", "public")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (filters?.level && filters.level !== "all") {
      query = query.eq("english_level", filters.level);
    }

    const { data: rooms, error } = await query;

    if (error) {
      if (error.code === "42P01") {
        console.warn("[speakingService] speaking_rooms table not yet created in Supabase.");
        return [];
      }
      throw error;
    }

    if (!rooms || rooms.length === 0) {
      return [];
    }

    const roomIds = rooms.map((r: any) => r.id);

    // Fetch members for these rooms
    const { data: members } = await supabase
      .from("speaking_room_members" as any)
      .select("id, room_id, user_id, role, is_muted, is_speaking")
      .in("room_id", roomIds);

    // Fetch user profiles for avatars
    const userIds = Array.from(new Set((members || []).map((m: any) => m.user_id)));
    let profileMap: Record<string, { full_name: string; avatar_url: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
    }

    // Combine room + member list
    const enrichedRooms: SpeakingRoom[] = rooms.map((r: any) => {
      const roomMembers: SpeakingMember[] = (members || [])
        .filter((m: any) => m.room_id === r.id)
        .map((m: any) => ({
          ...m,
          full_name: profileMap[m.user_id]?.full_name || "Học viên",
          avatar_url: profileMap[m.user_id]?.avatar_url,
        }));

      return {
        ...r,
        current_members: roomMembers.length,
        members: roomMembers,
      };
    });

    // Filter in-memory for topics and slots if needed
    let filtered = enrichedRooms;
    if (filters?.topic && filters.topic !== "all") {
      filtered = filtered.filter((r) => r.topics.includes(filters.topic!));
    }
    if (filters?.hasSlotsOnly) {
      filtered = filtered.filter((r) => (r.current_members || 0) < r.capacity);
    }

    return filtered;
  } catch (err: any) {
    console.error("[speakingService] fetchPublicRooms error:", err);
    return [];
  }
}

/**
 * Fetch a single room and its full member list with profiles
 */
export async function fetchRoomDetails(roomId: string): Promise<SpeakingRoom | null> {
  try {
    const { data: room, error } = await supabase
      .from("speaking_rooms" as any)
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (error || !room) {
      return null;
    }

    // Get members
    const { data: members } = await supabase
      .from("speaking_room_members" as any)
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    const memberList = members || [];
    const userIds = memberList.map((m: any) => m.user_id);

    let profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      (profiles || []).forEach((p: any) => {
        profileMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
    }

    const hostProfile = profileMap[room.host_user_id];

    const enrichedMembers: SpeakingMember[] = memberList.map((m: any) => ({
      ...m,
      full_name: profileMap[m.user_id]?.full_name || "Học viên",
      avatar_url: profileMap[m.user_id]?.avatar_url,
      connection_status: "connected",
    }));

    return {
      ...room,
      current_members: enrichedMembers.length,
      members: enrichedMembers,
      host_name: hostProfile?.full_name,
      host_avatar: hostProfile?.avatar_url,
    };
  } catch (err) {
    console.error("[speakingService] fetchRoomDetails error:", err);
    return null;
  }
}

/**
 * Create a new speaking room
 */
export async function createSpeakingRoom(input: CreateRoomInput): Promise<{ success: boolean; room?: SpeakingRoom; error?: string }> {
  try {
    const { data: authData } = await authClient.getUser();
    if (!authData.user) {
      return { success: false, error: "Vui lòng đăng nhập để tạo phòng" };
    }

    const user = authData.user;
    const finalPasscode = input.visibility === "private" 
      ? (input.passcode?.trim() || generateRandomRoomPasscode(6)) 
      : null;

    const newRoomPayload = {
      name: input.name.trim(),
      host_user_id: user.id,
      english_level: input.english_level,
      topics: input.topics,
      visibility: input.visibility,
      passcode: finalPasscode,
      capacity: Math.min(5, Math.max(2, input.capacity)),
      status: "active",
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };

    const { data: room, error: insertError } = await supabase
      .from("speaking_rooms" as any)
      .insert(newRoomPayload)
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Host automatically joins the room
    const joinResult = await joinSpeakingRoom(room.id, finalPasscode || undefined);
    if (!joinResult.success) {
      console.warn("[speakingService] Host auto-join warning:", joinResult.error);
    }

    return { success: true, room };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể tạo phòng lúc này" };
  }
}

/**
 * Join a room with atomic capacity check and passcode validation
 */
export async function joinSpeakingRoom(
  roomId: string, 
  passcode?: string
): Promise<{ success: boolean; member_id?: string; session_id?: string; error?: string; role?: string }> {
  try {
    const { data: authData } = await authClient.getUser();
    if (!authData.user) {
      return { success: false, error: "Vui lòng đăng nhập để tham gia phòng" };
    }

    // Try RPC first (atomic check with row locking)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("join_speaking_room" as any, {
        p_room_id: roomId,
        p_passcode: passcode || null,
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          return { success: false, error: rpcData.message || rpcData.error };
        }
        return {
          success: true,
          member_id: rpcData.member_id,
          session_id: rpcData.session_id,
          role: rpcData.role,
        };
      }
    } catch {
      // Fallback below if RPC is missing
    }

    // Fallback direct check
    const { data: room } = await supabase
      .from("speaking_rooms" as any)
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room || room.status !== "active") {
      return { success: false, error: "Phòng không tồn tại hoặc đã đóng" };
    }

    if (room.visibility === "private" && room.host_user_id !== authData.user.id) {
      if (room.passcode && room.passcode !== passcode) {
        return { success: false, error: "Mã phòng riêng tư không chính xác" };
      }
    }

    // Count existing members
    const { count } = await supabase
      .from("speaking_room_members" as any)
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);

    if ((count || 0) >= room.capacity) {
      return { success: false, error: "Phòng đã đủ số lượng người tối đa" };
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from("speaking_room_members" as any)
      .select("id, role")
      .eq("room_id", roomId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (existing) {
      return { success: true, member_id: existing.id, role: existing.role };
    }

    // Insert membership
    const isHost = room.host_user_id === authData.user.id;
    const { data: member, error: memberErr } = await supabase
      .from("speaking_room_members" as any)
      .insert({
        room_id: roomId,
        user_id: authData.user.id,
        role: isHost ? "host" : "member",
      })
      .select()
      .single();

    if (memberErr) {
      return { success: false, error: memberErr.message };
    }

    // Insert session
    const { data: session } = await supabase
      .from("speaking_sessions" as any)
      .insert({
        room_id: roomId,
        user_id: authData.user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    return {
      success: true,
      member_id: member.id,
      session_id: session?.id,
      role: isHost ? "host" : "member",
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi tham gia phòng" };
  }
}

/**
 * Leave a room cleanly, updating session duration and membership
 */
export async function leaveSpeakingRoom(roomId: string, sessionId?: string): Promise<boolean> {
  try {
    const { data: authData } = await authClient.getUser();
    if (!authData.user) return false;

    // Try RPC first
    try {
      const { data, error } = await supabase.rpc("leave_speaking_room" as any, {
        p_room_id: roomId,
        p_session_id: sessionId || null,
      });
      if (!error && data?.success) {
        return true;
      }
    } catch {
      // fallback
    }

    // Direct fallback
    await supabase
      .from("speaking_room_members" as any)
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", authData.user.id);

    if (sessionId) {
      await supabase
        .from("speaking_sessions" as any)
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return true;
  } catch (err) {
    console.error("[speakingService] leaveSpeakingRoom error:", err);
    return false;
  }
}

/**
 * Close room (host only)
 */
export async function closeSpeakingRoom(roomId: string): Promise<boolean> {
  try {
    const { data: authData } = await authClient.getUser();
    if (!authData.user) return false;

    const { error } = await supabase
      .from("speaking_rooms" as any)
      .update({ status: "closed" })
      .eq("id", roomId)
      .eq("host_user_id", authData.user.id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Matchmaking: find matching room by level and topics
 */
export async function matchSpeakingRoom(
  level: EnglishLevel, 
  topics: string[]
): Promise<{ matched: boolean; room?: SpeakingRoom; error?: string }> {
  try {
    const { data: authData } = await authClient.getUser();
    if (!authData.user) {
      return { matched: false, error: "Vui lòng đăng nhập để bắt đầu ghép cặp" };
    }

    // 1. Try DB RPC
    try {
      const { data: rpcRes, error } = await supabase.rpc("match_speaking_room" as any, {
        p_level: level,
        p_topics: topics,
      });

      if (!error && rpcRes?.success) {
        if (rpcRes.matched && rpcRes.room) {
          return { matched: true, room: rpcRes.room };
        }
        return { matched: false };
      }
    } catch {
      // fallback
    }

    // 2. Client-side matchmaking fallback across active rooms
    const activeRooms = await fetchPublicRooms({ hasSlotsOnly: true });
    if (!activeRooms || activeRooms.length === 0) {
      return { matched: false };
    }

    // Exclude rooms hosted by current user or user already in
    const candidates = activeRooms.filter(
      (r) => r.host_user_id !== authData.user.id && (r.current_members || 0) < r.capacity
    );

    if (candidates.length === 0) {
      return { matched: false };
    }

    // Score candidates
    const scored = candidates.map((r) => {
      let score = 0;
      if (r.english_level === level) score += 10;
      const overlap = r.topics.filter((t) => topics.includes(t)).length;
      score += overlap * 5;
      score += (r.current_members || 0); // prefer active room with people
      return { room: r, score };
    });

    scored.sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score > 0) {
      return { matched: true, room: scored[0].room };
    }

    return { matched: false };
  } catch (err: any) {
    return { matched: false, error: err.message };
  }
}

/**
 * Fetch user speaking statistics (cumulative seconds, level)
 */
export async function fetchUserSpeakingStats(userId: string): Promise<{
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  englishLevel: EnglishLevel;
}> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_speaking_seconds, english_level" as any)
      .eq("user_id", userId)
      .maybeSingle();

    const totalSeconds = (profile as any)?.total_speaking_seconds || 0;
    const englishLevel: EnglishLevel = (profile as any)?.english_level || "B1";

    return {
      totalSeconds,
      totalMinutes: Math.floor(totalSeconds / 60),
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      englishLevel,
    };
  } catch {
    return {
      totalSeconds: 0,
      totalMinutes: 0,
      totalHours: 0,
      englishLevel: "B1",
    };
  }
}

/**
 * Update user english level preference
 */
export async function updateUserEnglishLevel(userId: string, level: EnglishLevel): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ english_level: level } as any)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Request voice room token from /api/speaking-token
 */
export async function getVoiceToken(roomId: string, passcode?: string) {
  const { data: sessionData } = await authClient.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("Người dùng chưa xác thực");
  }

  const res = await fetch("/api/speaking-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomId, passcode }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || "Không thể khởi tạo kết nối âm thanh");
  }

  return await res.json();
}
