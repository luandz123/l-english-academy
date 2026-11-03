import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MEMBER_ORDER = [{ joinedAt: 'asc' as const }];

export const roomWithMembers = {
  members: {
    orderBy: MEMBER_ORDER,
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
  },
} satisfies Prisma.SpeakingRoomInclude;

export type RoomWithMembers = Prisma.SpeakingRoomGetPayload<{
  include: typeof roomWithMembers;
}>;
export type Tx = Prisma.TransactionClient;

/**
 * Bảng phòng nói + đọc tên/ảnh từ `profiles` để hiển thị thành viên (chỉ đọc).
 * Rời phòng cộng `profiles.total_speaking_seconds` trong cùng transaction (như RPC cũ).
 */
@Injectable()
export class SpeakingRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /** Phòng công khai đang mở, chưa hết hạn, mới nhất trước. */
  listActivePublicRooms(level?: string): Promise<RoomWithMembers[]> {
    return this.prisma.speakingRoom.findMany({
      where: {
        status: 'active',
        visibility: 'public',
        expiresAt: { gt: new Date() },
        ...(level ? { englishLevel: level } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: roomWithMembers,
    });
  }

  findRoom(
    id: string,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<RoomWithMembers | null> {
    return tx.speakingRoom.findUnique({
      where: { id },
      include: roomWithMembers,
    });
  }

  /** Khóa dòng phòng tới hết transaction (chống vượt sĩ số khi nhiều người vào cùng lúc). */
  async lockRoom(tx: Tx, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM speaking_rooms WHERE id = ${id}::uuid FOR UPDATE`;
  }

  createRoom(
    tx: Tx,
    data: {
      name: string;
      hostUserId: string;
      englishLevel: string;
      topics: string[];
      visibility: string;
      passcode: string | null;
      capacity: number;
      expiresAt: Date;
    },
  ) {
    return tx.speakingRoom.create({ data: { ...data, status: 'active' } });
  }

  findMember(tx: Tx | PrismaService, roomId: string, userId: string) {
    return tx.speakingRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  countMembers(tx: Tx, roomId: string): Promise<number> {
    return tx.speakingRoomMember.count({ where: { roomId } });
  }

  touchMember(tx: Tx, id: string) {
    return tx.speakingRoomMember.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  addMember(tx: Tx, roomId: string, userId: string, role: 'host' | 'member') {
    return tx.speakingRoomMember.create({ data: { roomId, userId, role } });
  }

  openSession(tx: Tx, roomId: string, userId: string) {
    return tx.speakingSession.create({
      data: { roomId, userId, startedAt: new Date() },
    });
  }

  findOpenSession(
    tx: Tx | PrismaService,
    roomId: string,
    userId: string,
    sessionId?: string,
  ) {
    return tx.speakingSession.findFirst({
      where: sessionId
        ? { id: sessionId, userId }
        : { roomId, userId, endedAt: null },
      orderBy: [{ startedAt: 'desc' }],
    });
  }

  removeMember(tx: Tx, roomId: string, userId: string) {
    return tx.speakingRoomMember.deleteMany({ where: { roomId, userId } });
  }

  async closeSession(
    tx: Tx,
    sessionId: string,
    userId: string,
    durationSeconds: number,
  ): Promise<void> {
    await tx.speakingSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date(), durationSeconds },
    });
    await tx.profile.updateMany({
      where: { userId },
      data: { totalSpeakingSeconds: { increment: durationSeconds } },
    });
  }

  earliestMember(tx: Tx, roomId: string) {
    return tx.speakingRoomMember.findFirst({
      where: { roomId },
      orderBy: MEMBER_ORDER,
    });
  }

  async transferHost(tx: Tx, roomId: string, newHostId: string): Promise<void> {
    await tx.speakingRoom.update({
      where: { id: roomId },
      data: { hostUserId: newHostId },
    });
    await tx.speakingRoomMember.updateMany({
      where: { roomId, userId: newHostId },
      data: { role: 'host' },
    });
  }

  setRoomStatus(
    roomId: string,
    status: 'closed' | 'active',
    tx: Tx | PrismaService = this.prisma,
  ) {
    return tx.speakingRoom.update({ where: { id: roomId }, data: { status } });
  }

  /** Danh sách phòng mà người dùng đang ở (để loại khỏi ghép cặp). */
  async roomIdsOfUser(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.speakingRoomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    return new Set(rows.map((r) => r.roomId));
  }

  findProfileStats(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      select: {
        totalSpeakingSeconds: true,
        englishLevel: true,
        fullName: true,
        avatarUrl: true,
      },
    });
  }

  findUserEmail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
  }

  async updateEnglishLevel(userId: string, level: string): Promise<void> {
    await this.prisma.profile.updateMany({
      where: { userId },
      data: { englishLevel: level },
    });
  }
}
