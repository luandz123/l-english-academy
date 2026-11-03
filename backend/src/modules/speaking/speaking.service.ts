import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../config/env.schema';
import type {
  CreateRoomDto,
  CreateRoomResultDto,
  JoinResultDto,
  LeaveResultDto,
  MatchResultDto,
  RoomsQueryDto,
  SpeakingRoomDto,
  SpeakingStatsDto,
  VoiceTokenDto,
} from './dto/speaking.dto';
import { displayName, SpeakingMapper } from './speaking.mapper';
import { SpeakingRepository } from './speaking.repository';
import {
  DEFAULT_ICE_SERVERS,
  generatePasscode,
  pickMatch,
  ROOM_TTL_MS,
} from './speaking-rules';

const notFound = () =>
  new NotFoundException({
    code: 'ROOM_NOT_FOUND',
    message: 'Phòng không tồn tại',
  });
const closed = () =>
  new ConflictException({
    code: 'ROOM_CLOSED',
    message: 'Phòng đã kết thúc hoặc hết hạn',
  });

const isOpen = (room: { status: string; expiresAt: Date }) =>
  room.status === 'active' && room.expiresAt > new Date();

/**
 * Phòng luyện nói (thay RPC Supabase `join/leave/match_speaking_room`, `api/speaking-token.ts`).
 * Quyền thay RLS cũ: ai đăng nhập cũng xem phòng công khai đang mở; mã phòng riêng tư chỉ chủ phòng
 * thấy; chỉ chủ phòng đóng phòng; token âm thanh chỉ cấp cho thành viên đã vào phòng.
 */
@Injectable()
export class SpeakingService {
  constructor(
    private readonly repo: SpeakingRepository,
    private readonly mapper: SpeakingMapper,
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
  ) {}

  async listRooms(
    viewerId: string,
    q: RoomsQueryDto,
  ): Promise<SpeakingRoomDto[]> {
    const level = q.level && q.level !== 'all' ? q.level : undefined;
    let rooms = await this.repo.listActivePublicRooms(level);
    if (q.topic && q.topic !== 'all')
      rooms = rooms.filter((r) => r.topics.includes(q.topic!));
    if (q.has_slots) rooms = rooms.filter((r) => r.members.length < r.capacity);
    return rooms.map((r) => this.mapper.toRoomDto(r, viewerId));
  }

  /** Như RLS "Public read for active rooms": phòng đang mở, hoặc mình là chủ/thành viên. */
  async getRoom(viewerId: string, roomId: string): Promise<SpeakingRoomDto> {
    const room = await this.repo.findRoom(roomId);
    const visible =
      room &&
      (room.status === 'active' ||
        room.hostUserId === viewerId ||
        room.members.some((m) => m.userId === viewerId));
    if (!room || !visible) throw notFound();
    return this.mapper.toRoomDto(room, viewerId);
  }

  async createRoom(
    userId: string,
    dto: CreateRoomDto,
  ): Promise<CreateRoomResultDto> {
    const passcode =
      dto.visibility === 'private' ? dto.passcode || generatePasscode(6) : null;
    const { roomId, join } = await this.repo.transaction(async (tx) => {
      const room = await this.repo.createRoom(tx, {
        name: dto.name,
        hostUserId: userId,
        englishLevel: dto.english_level,
        topics: Array.from(new Set(dto.topics)),
        visibility: dto.visibility,
        passcode,
        capacity: dto.capacity,
        expiresAt: new Date(Date.now() + ROOM_TTL_MS),
      });
      // Chủ phòng tự vào phòng ngay
      const member = await this.repo.addMember(tx, room.id, userId, 'host');
      const session = await this.repo.openSession(tx, room.id, userId);
      return {
        roomId: room.id,
        join: {
          member_id: member.id,
          session_id: session.id,
          role: 'host',
          is_existing: false,
        },
      };
    });
    const room = await this.repo.findRoom(roomId);
    return { ...join, room: this.mapper.toRoomDto(room!, userId) };
  }

  async joinRoom(
    userId: string,
    roomId: string,
    passcode?: string,
  ): Promise<JoinResultDto> {
    return this.repo.transaction(async (tx) => {
      await this.repo.lockRoom(tx, roomId);
      const room = await this.repo.findRoom(roomId, tx);
      if (!room) throw notFound();
      if (!isOpen(room)) throw closed();

      if (room.visibility === 'private' && room.hostUserId !== userId) {
        if (room.passcode && passcode !== room.passcode) {
          throw new ForbiddenException({
            code: 'INVALID_PASSCODE',
            message: 'Mã tham gia phòng riêng tư không chính xác',
          });
        }
      }

      const existing = await this.repo.findMember(tx, roomId, userId);
      if (existing) {
        await this.repo.touchMember(tx, existing.id);
        const session = await this.repo.findOpenSession(tx, roomId, userId);
        return {
          member_id: existing.id,
          session_id: session?.id ?? null,
          role: existing.role,
          is_existing: true,
        };
      }

      if ((await this.repo.countMembers(tx, roomId)) >= room.capacity) {
        throw new ConflictException({
          code: 'ROOM_FULL',
          message: 'Phòng đã đủ số lượng người tham gia tối đa',
        });
      }

      const role = room.hostUserId === userId ? 'host' : 'member';
      const member = await this.repo.addMember(tx, roomId, userId, role);
      const session = await this.repo.openSession(tx, roomId, userId);
      return {
        member_id: member.id,
        session_id: session.id,
        role,
        is_existing: false,
      };
    });
  }

  /** Rời phòng: đóng phiên + cộng thời gian nói; phòng trống → đóng; chủ phòng rời → chuyển quyền. */
  async leaveRoom(
    userId: string,
    roomId: string,
    sessionId?: string,
  ): Promise<LeaveResultDto> {
    return this.repo.transaction(async (tx) => {
      await this.repo.lockRoom(tx, roomId);
      const room = await this.repo.findRoom(roomId, tx);
      if (!room) throw notFound();

      await this.repo.removeMember(tx, roomId, userId);

      let duration = 0;
      const session = await this.repo.findOpenSession(
        tx,
        roomId,
        userId,
        sessionId,
      );
      if (session && !session.endedAt) {
        duration = Math.max(
          0,
          Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
        );
        await this.repo.closeSession(tx, session.id, userId, duration);
      }

      const remaining = await this.repo.countMembers(tx, roomId);
      if (remaining === 0) {
        await this.repo.setRoomStatus(roomId, 'closed', tx);
      } else if (room.hostUserId === userId) {
        const next = await this.repo.earliestMember(tx, roomId);
        if (next) await this.repo.transferHost(tx, roomId, next.userId);
      }
      return { duration_seconds: duration, remaining_members: remaining };
    });
  }

  async closeRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.repo.findRoom(roomId);
    if (!room) throw notFound();
    if (room.hostUserId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_HOST',
        message: 'Chỉ chủ phòng được đóng phòng',
      });
    }
    await this.repo.setRoomStatus(roomId, 'closed');
  }

  async match(
    userId: string,
    level: string,
    topics: string[],
  ): Promise<MatchResultDto> {
    const [rooms, mine] = await Promise.all([
      this.repo.listActivePublicRooms(),
      this.repo.roomIdsOfUser(userId),
    ]);
    const candidates = rooms.filter((r) => !mine.has(r.id));
    const best = pickMatch(
      level,
      topics,
      candidates.map((r) => ({
        id: r.id,
        englishLevel: r.englishLevel,
        topics: r.topics,
        capacity: r.capacity,
        memberCount: r.members.length,
        createdAt: r.createdAt,
      })),
    );
    const room = best ? candidates.find((r) => r.id === best.id)! : null;
    return {
      matched: !!room,
      room: room ? this.mapper.toRoomDto(room, userId) : null,
    };
  }

  async getStats(userId: string): Promise<SpeakingStatsDto> {
    const p = await this.repo.findProfileStats(userId);
    return {
      total_speaking_seconds: p?.totalSpeakingSeconds ?? 0,
      english_level: p?.englishLevel || 'B1',
    };
  }

  async updateLevel(userId: string, level: string): Promise<SpeakingStatsDto> {
    await this.repo.updateEnglishLevel(userId, level);
    return this.getStats(userId);
  }

  /**
   * Token âm thanh: LiveKit nếu có LIVEKIT_* (JWT HS256 theo chuẩn LiveKit), không thì cấu hình
   * WebRTC mesh + STUN như `api/speaking-token.ts`. Chỉ thành viên đã vào phòng đang mở.
   */
  async voiceToken(userId: string, roomId: string): Promise<VoiceTokenDto> {
    const room = await this.repo.findRoom(roomId);
    if (!room) throw notFound();
    if (!isOpen(room)) throw closed();
    if (!room.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException({
        code: 'NOT_MEMBER',
        message: 'Bạn chưa vào phòng này',
      });
    }

    const profile = await this.repo.findProfileStats(userId);
    const user = await this.repo.findUserEmail(userId);
    const name = displayName(profile?.fullName, user?.email);
    const avatarUrl = profile?.avatarUrl ?? null;
    const base = { roomId, identity: userId, name, avatarUrl };

    const apiKey = this.config.get('LIVEKIT_API_KEY', { infer: true });
    const apiSecret = this.config.get('LIVEKIT_API_SECRET', { infer: true });
    const url = this.config.get('LIVEKIT_URL', { infer: true });
    if (apiKey && apiSecret && url) {
      const token = await this.jwt.signAsync(
        {
          name,
          metadata: JSON.stringify({ avatarUrl }),
          video: {
            room: roomId,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          },
        },
        {
          secret: apiSecret,
          algorithm: 'HS256',
          issuer: apiKey,
          subject: userId,
          expiresIn: '2h',
          notBefore: 0,
        },
      );
      return { mode: 'livekit', ...base, token, url };
    }
    return { mode: 'webrtc-mesh', ...base, iceServers: DEFAULT_ICE_SERVERS };
  }
}
