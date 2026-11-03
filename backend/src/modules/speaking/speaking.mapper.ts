import { Injectable } from '@nestjs/common';
import type { SpeakingRoomDto, SpeakingMemberDto } from './dto/speaking.dto';
import type { RoomWithMembers } from './speaking.repository';

type MemberRow = RoomWithMembers['members'][number];

/** Tên hiển thị: họ tên → phần trước @ của email → "Học viên" (như speakingService cũ). */
export function displayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  return fullName?.trim() || email?.split('@')[0] || 'Học viên';
}

@Injectable()
export class SpeakingMapper {
  toMemberDto(m: MemberRow): SpeakingMemberDto {
    return {
      id: m.id,
      room_id: m.roomId,
      user_id: m.userId,
      role: m.role,
      joined_at: m.joinedAt.toISOString(),
      last_seen_at: m.lastSeenAt.toISOString(),
      is_muted: m.isMuted,
      is_speaking: m.isSpeaking,
      full_name: displayName(m.user?.profile?.fullName, m.user?.email),
      avatar_url: m.user?.profile?.avatarUrl ?? null,
    };
  }

  /** `viewerId`: chỉ chủ phòng mới thấy mã phòng riêng tư. */
  toRoomDto(room: RoomWithMembers, viewerId: string): SpeakingRoomDto {
    const members = room.members.map((m) => this.toMemberDto(m));
    const host = room.members.find((m) => m.userId === room.hostUserId);
    return {
      id: room.id,
      name: room.name,
      host_user_id: room.hostUserId,
      english_level: room.englishLevel,
      topics: room.topics,
      visibility: room.visibility,
      passcode: room.hostUserId === viewerId ? room.passcode : null,
      capacity: room.capacity,
      status: room.status,
      created_at: room.createdAt.toISOString(),
      expires_at: room.expiresAt.toISOString(),
      current_members: members.length,
      members,
      host_name: host
        ? displayName(host.user?.profile?.fullName, host.user?.email)
        : null,
      host_avatar: host?.user?.profile?.avatarUrl ?? null,
    };
  }
}
