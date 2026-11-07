import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { ErrorResponseBody } from '../src/common/filters/all-exceptions.filter';
import type { ListeningStepProgressDto } from '../src/modules/learning/dto';

describe('LearningModule — tiến độ Luyện nghe từng bước (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA = '';
  let tokenB = '';

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const url = '/api/v1/learning/listening-steps/progress';

  async function cleanup(): Promise<void> {
    await prisma.userListeningStepProgress.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@listening-steps.test' } },
    });
  }

  async function userWithToken(email: string): Promise<string> {
    const user = await prisma.user.create({
      data: { email, emailVerifiedAt: new Date() },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return accessToken;
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
    tokenA = await userWithToken('a@listening-steps.test');
    tokenB = await userWithToken('b@listening-steps.test');
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('401 khi chưa đăng nhập (GET và PUT)', async () => {
    await http().get(url).expect(401);
    await http()
      .put(`${url}/dictation-part2-unit1`)
      .send({ completed_steps: [1], current_step: 2 })
      .expect(401);
  });

  it('400 khi số bước ngoài 1–7, trùng lặp hoặc mã bài sai', async () => {
    for (const body of [
      { completed_steps: [8], current_step: 1 },
      { completed_steps: [0], current_step: 1 },
      { completed_steps: [1, 1], current_step: 2 },
      { completed_steps: [1], current_step: 9 },
      { completed_steps: 'all', current_step: 1 },
    ]) {
      await http()
        .put(`${url}/dictation-part2-unit1`)
        .set(bearer(tokenA))
        .send(body)
        .expect(400);
    }
    const res = await http()
      .put(`${url}/Bad_ID`)
      .set(bearer(tokenA))
      .send({ completed_steps: [1], current_step: 2 })
      .expect(400);
    expect((res.body as ErrorResponseBody).code).toBe('INVALID_CLUSTER_ID');
  });

  it('lưu, gộp bước đã xong và ghi completed_at khi đủ 7 bước', async () => {
    const first = await http()
      .put(`${url}/dictation-part2-unit1`)
      .set(bearer(tokenA))
      .send({ completed_steps: [1, 2, 3], current_step: 4 })
      .expect(200);
    expect(first.body as ListeningStepProgressDto).toMatchObject({
      cluster_id: 'dictation-part2-unit1',
      completed_steps: [1, 2, 3],
      current_step: 4,
      completed_at: null,
    });

    // Máy khác gửi tiến độ cũ hơn: không làm mất bước đã xong
    const merged = await http()
      .put(`${url}/dictation-part2-unit1`)
      .set(bearer(tokenA))
      .send({ completed_steps: [1], current_step: 2 })
      .expect(200);
    expect((merged.body as ListeningStepProgressDto).completed_steps).toEqual([
      1, 2, 3,
    ]);

    const done = await http()
      .put(`${url}/dictation-part2-unit1`)
      .set(bearer(tokenA))
      .send({ completed_steps: [4, 5, 6, 7], current_step: 7 })
      .expect(200);
    const doneBody = done.body as ListeningStepProgressDto;
    expect(doneBody.completed_steps).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(doneBody.completed_at).not.toBeNull();
  });

  it('mỗi người chỉ thấy tiến độ của mình', async () => {
    const mine = await http().get(url).set(bearer(tokenA)).expect(200);
    expect(
      (mine.body as ListeningStepProgressDto[]).map((p) => p.cluster_id),
    ).toEqual(['dictation-part2-unit1']);

    const other = await http().get(url).set(bearer(tokenB)).expect(200);
    expect(other.body).toEqual([]);
  });
});
