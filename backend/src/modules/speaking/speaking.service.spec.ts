import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { SpeakingMapper } from './speaking.mapper';
import type { SpeakingRepository } from './speaking.repository';
import { SpeakingService } from './speaking.service';

const ROOM = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  expiresAt: new Date(Date.now() + 60_000),
  members: [{ userId: 'u1' }],
};

function setup(env: Partial<Record<keyof Env, unknown>>) {
  const repo = {
    findRoom: jest.fn().mockResolvedValue(ROOM),
    findProfileStats: jest
      .fn()
      .mockResolvedValue({ fullName: 'Lan', avatarUrl: null }),
    findUserEmail: jest.fn().mockResolvedValue({ email: 'lan@x.com' }),
  };
  const jwt = new JwtService({});
  const service = new SpeakingService(
    repo as unknown as SpeakingRepository,
    new SpeakingMapper(),
    { get: (k: keyof Env) => env[k] } as unknown as ConfigService<Env, true>,
    jwt,
  );
  return { service, jwt };
}

describe('SpeakingService.voiceToken', () => {
  it('có LIVEKIT_* → token LiveKit HS256 đúng claim (iss = api key, sub = user, quyền vào đúng phòng)', async () => {
    const { service, jwt } = setup({
      LIVEKIT_API_KEY: 'APIkey',
      LIVEKIT_API_SECRET: 'secret-secret-secret-secret-1234',
      LIVEKIT_URL: 'wss://x.livekit.cloud',
    });
    const res = await service.voiceToken('u1', ROOM.id);
    expect(res).toMatchObject({
      mode: 'livekit',
      url: 'wss://x.livekit.cloud',
      name: 'Lan',
    });
    const claims = jwt.verify<Record<string, any>>(res.token!, {
      secret: 'secret-secret-secret-secret-1234',
    });
    expect(claims).toMatchObject({
      iss: 'APIkey',
      sub: 'u1',
      name: 'Lan',
      video: {
        room: ROOM.id,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
      },
    });
    expect(claims.exp - claims.iat).toBe(7200);
  });

  it('thiếu cấu hình → WebRTC mesh', async () => {
    const { service } = setup({});
    const res = await service.voiceToken('u1', ROOM.id);
    expect(res.mode).toBe('webrtc-mesh');
    expect(res.token).toBeUndefined();
  });
});
