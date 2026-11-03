import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  CreateRoomResultDto,
  JoinResultDto,
  LeaveResultDto,
  MatchResultDto,
  SpeakingRoomDto,
  SpeakingStatsDto,
  VoiceTokenDto,
} from '../src/modules/speaking/dto/speaking.dto';

type ErrorBody = { code: string };
/** supertest trả `body: any`; ép kiểu một chỗ cho gọn. */
const as = <T>(res: { body: unknown }): T => res.body as T;

/**
 * Phòng luyện nói (thay RLS + RPC Supabase của migration 20261023_speaking_rooms.sql):
 * - "Public read for active rooms" → ai đăng nhập cũng xem phòng công khai đang mở; mã phòng riêng
 *   tư chỉ chủ phòng thấy (cũ: select * trả cả passcode cho mọi người).
 * - "Host can update room" → chỉ chủ phòng đóng phòng.
 * - join_speaking_room → khóa dòng, kiểm tra mã phòng, sĩ số, phòng đã đóng.
 * - leave_speaking_room → đóng phiên + cộng thời gian, chuyển chủ phòng, phòng trống thì đóng.
 * - api/speaking-token.ts → chỉ thành viên đã vào phòng mới nhận token.
 */
describe('SpeakingModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@speaking.test';
  const t: Record<'host' | 'a' | 'b' | 'c', string> = {
    host: '',
    a: '',
    b: '',
    c: '',
  };
  const ids: Record<'host' | 'a' | 'b' | 'c', string> = {
    host: '',
    a: '',
    b: '',
    c: '',
  };

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const create = (token: string, body: object) =>
    http().post('/api/v1/speaking/rooms').set(auth(token)).send(body);
  const join = (token: string, roomId: string, body: object = {}) =>
    http()
      .post(`/api/v1/speaking/rooms/${roomId}/join`)
      .set(auth(token))
      .send(body);
  const leave = (token: string, roomId: string, body: object = {}) =>
    http()
      .post(`/api/v1/speaking/rooms/${roomId}/leave`)
      .set(auth(token))
      .send(body);

  const BASE_ROOM = {
    name: 'Phòng e2e',
    english_level: 'B1',
    topics: ['Travel'],
    capacity: 3,
    visibility: 'public',
  };

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
    for (const key of ['host', 'a', 'b', 'c'] as const) {
      const email = `${key}${SUFFIX}`;
      const user = await prisma.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          profile: { create: { fullName: `User ${key}` } },
        },
      });
      ids[key] = user.id;
      t[key] = (
        await app.get(TokenService).signAccessToken({ id: user.id, email })
      ).accessToken;
    }
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  it('không token → 401 ở mọi endpoint', async () => {
    await http().get('/api/v1/speaking/rooms').expect(401);
    await http().post('/api/v1/speaking/rooms').send(BASE_ROOM).expect(401);
    await http().get('/api/v1/speaking/me/stats').expect(401);
  });

  it('tạo phòng: dữ liệu sai → 400; chủ phòng tự vào phòng', async () => {
    await create(t.host, { ...BASE_ROOM, capacity: 9 }).expect(400);
    await create(t.host, { ...BASE_ROOM, english_level: 'Z9' }).expect(400);
    const res = as<CreateRoomResultDto>(
      await create(t.host, BASE_ROOM).expect(201),
    );
    expect(res).toMatchObject({ role: 'host', is_existing: false });
    expect(res.session_id).toBeTruthy();
    expect(res.room).toMatchObject({
      current_members: 1,
      host_user_id: ids.host,
      host_name: 'User host',
    });
    await prisma.speakingRoom.update({
      where: { id: res.room.id },
      data: { status: 'closed' },
    });
  });

  it('phòng riêng tư: mã chỉ chủ phòng thấy; sai mã → 403; đúng mã → vào được', async () => {
    const res = as<CreateRoomResultDto>(
      await create(t.host, { ...BASE_ROOM, visibility: 'private' }).expect(201),
    );
    const room = res.room;
    expect(room.passcode).toMatch(/^[A-Z0-9]{6}$/);

    const other = as<SpeakingRoomDto>(
      await http()
        .get(`/api/v1/speaking/rooms/${room.id}`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(other.passcode).toBeNull();
    const list = as<SpeakingRoomDto[]>(
      await http().get('/api/v1/speaking/rooms').set(auth(t.a)).expect(200),
    );
    expect(list.some((r) => r.id === room.id)).toBe(false);

    const wrong = as<ErrorBody>(
      await join(t.a, room.id, { passcode: 'WRONG1' }).expect(403),
    );
    expect(wrong.code).toBe('INVALID_PASSCODE');
    await join(t.a, room.id, { passcode: room.passcode ?? '' }).expect(200);
    await prisma.speakingRoom.update({
      where: { id: room.id },
      data: { status: 'closed' },
    });
  });

  describe('vào/rời phòng công khai', () => {
    let roomId = '';
    let hostSession = '';

    beforeAll(async () => {
      const res = as<CreateRoomResultDto>(
        await create(t.host, BASE_ROOM).expect(201),
      );
      roomId = res.room.id;
      hostSession = res.session_id ?? '';
    });

    it('vào lại không nhân đôi; đủ sĩ số → 409 ROOM_FULL', async () => {
      await join(t.a, roomId).expect(200);
      const again = as<JoinResultDto>(await join(t.a, roomId).expect(200));
      expect(again.is_existing).toBe(true);
      await join(t.b, roomId).expect(200);
      const full = as<ErrorBody>(await join(t.c, roomId).expect(409));
      expect(full.code).toBe('ROOM_FULL');
      const list = as<SpeakingRoomDto[]>(
        await http()
          .get('/api/v1/speaking/rooms?has_slots=true')
          .set(auth(t.c))
          .expect(200),
      );
      expect(list.some((r) => r.id === roomId)).toBe(false);
    });

    it('token âm thanh: thành viên nhận cấu hình mesh, người ngoài → 403', async () => {
      const ok = as<VoiceTokenDto>(
        await http()
          .post(`/api/v1/speaking/rooms/${roomId}/token`)
          .set(auth(t.a))
          .expect(200),
      );
      expect(ok).toMatchObject({
        mode: 'webrtc-mesh',
        roomId,
        identity: ids.a,
        name: 'User a',
      });
      expect(ok.iceServers?.length).toBeGreaterThan(0);
      const no = as<ErrorBody>(
        await http()
          .post(`/api/v1/speaking/rooms/${roomId}/token`)
          .set(auth(t.c))
          .expect(403),
      );
      expect(no.code).toBe('NOT_MEMBER');
    });

    it('người không phải chủ phòng không đóng được phòng → 403', async () => {
      const res = as<ErrorBody>(
        await http()
          .post(`/api/v1/speaking/rooms/${roomId}/close`)
          .set(auth(t.a))
          .expect(403),
      );
      expect(res.code).toBe('NOT_HOST');
    });

    it('chủ phòng rời → chuyển quyền cho người vào sớm nhất, cộng thời gian nói', async () => {
      await prisma.speakingSession.update({
        where: { id: hostSession },
        data: { startedAt: new Date(Date.now() - 90_000) },
      });
      const res = as<LeaveResultDto>(
        await leave(t.host, roomId, { session_id: hostSession }).expect(200),
      );
      expect(res.duration_seconds).toBeGreaterThanOrEqual(90);
      expect(res.remaining_members).toBe(2);
      const room = await prisma.speakingRoom.findUniqueOrThrow({
        where: { id: roomId },
      });
      expect(room.hostUserId).toBe(ids.a);
      const stats = as<SpeakingStatsDto>(
        await http()
          .get('/api/v1/speaking/me/stats')
          .set(auth(t.host))
          .expect(200),
      );
      expect(stats.total_speaking_seconds).toBeGreaterThanOrEqual(90);
    });

    it('chủ phòng mới đóng phòng → vào phòng đã đóng 409; mọi người rời → phòng vẫn đóng', async () => {
      await http()
        .post(`/api/v1/speaking/rooms/${roomId}/close`)
        .set(auth(t.a))
        .expect(204);
      const res = as<ErrorBody>(await join(t.c, roomId).expect(409));
      expect(res.code).toBe('ROOM_CLOSED');
      await leave(t.a, roomId).expect(200);
      const last = as<LeaveResultDto>(await leave(t.b, roomId).expect(200));
      expect(last.remaining_members).toBe(0);
      const room = await prisma.speakingRoom.findUniqueOrThrow({
        where: { id: roomId },
      });
      expect(room.status).toBe('closed');
    });
  });

  it('ghép cặp: bỏ phòng mình đang ở, chọn phòng cùng trình độ', async () => {
    const mine = as<CreateRoomResultDto>(
      await create(t.c, { ...BASE_ROOM, english_level: 'A2' }).expect(201),
    ).room.id;
    const b1 = as<CreateRoomResultDto>(
      await create(t.b, {
        ...BASE_ROOM,
        english_level: 'A2',
        topics: ['Food'],
      }).expect(201),
    ).room.id;
    const res = as<MatchResultDto>(
      await http()
        .post('/api/v1/speaking/match')
        .set(auth(t.c))
        .send({ level: 'A2', topics: ['Food'] })
        .expect(200),
    );
    expect(res.matched).toBe(true);
    expect(res.room?.id).toBe(b1);
    expect(res.room?.id).not.toBe(mine);
  });

  it('đổi trình độ của mình', async () => {
    await http()
      .put('/api/v1/speaking/me/level')
      .set(auth(t.a))
      .send({ english_level: 'X' })
      .expect(400);
    const res = as<SpeakingStatsDto>(
      await http()
        .put('/api/v1/speaking/me/level')
        .set(auth(t.a))
        .send({ english_level: 'C1' })
        .expect(200),
    );
    expect(res.english_level).toBe('C1');
  });

  it('phòng không tồn tại → 404; id sai định dạng → 400', async () => {
    await http()
      .get('/api/v1/speaking/rooms/00000000-0000-4000-8000-000000000000')
      .set(auth(t.a))
      .expect(404);
    await http().get('/api/v1/speaking/rooms/abc').set(auth(t.a)).expect(400);
  });
});
