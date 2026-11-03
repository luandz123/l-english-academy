import { randomInt } from 'node:crypto';

/** Phòng mở tối đa 4 giờ (như migration cũ). */
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

/** Mã phòng riêng tư 6 ký tự, bỏ ký tự dễ nhầm 0/O, 1/I (như speakingService cũ). */
export function generatePasscode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}

export interface MatchCandidate {
  id: string;
  englishLevel: string;
  topics: string[];
  capacity: number;
  memberCount: number;
  createdAt: Date;
}

/**
 * Chọn phòng ghép cặp như RPC `match_speaking_room`: còn chỗ, ưu tiên cùng trình độ,
 * nhiều chủ đề trùng, đông người, mới nhất. Không có phòng nào → null.
 */
export function pickMatch(
  level: string,
  topics: string[],
  rooms: MatchCandidate[],
): MatchCandidate | null {
  const wanted = new Set(topics);
  const scored = rooms
    .filter((r) => r.memberCount < r.capacity)
    .map((r) => ({
      r,
      level: r.englishLevel === level ? 2 : 1,
      overlap: new Set(r.topics.filter((t) => wanted.has(t))).size,
    }))
    .sort(
      (a, b) =>
        b.level - a.level ||
        b.overlap - a.overlap ||
        b.r.memberCount - a.r.memberCount ||
        b.r.createdAt.getTime() - a.r.createdAt.getTime(),
    );
  return scored[0]?.r ?? null;
}

export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
