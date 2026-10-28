import type { AuthService } from '../auth/auth.service';
import type { CatalogService } from '../catalog/catalog.service';
import { LearningMapper } from './learning.mapper';
import type { LearningRepository, QuizAccessRow } from './learning.repository';
import { LearningService } from './learning.service';

const USER = { id: 'u1', email: 'u1@x.com' };
const PAID_MODULE = { isFree: false, courseId: 1 };

function setup(opts: {
  quiz: QuizAccessRow | null;
  admin?: boolean;
  courseFree?: boolean;
  enrollment?: { expiresAt: Date | null } | null;
}) {
  const repo = {
    findQuizAccess: jest.fn().mockResolvedValue(opts.quiz),
    findEnrollment: jest.fn().mockResolvedValue(opts.enrollment ?? null),
  };
  const auth = { hasRole: jest.fn().mockResolvedValue(opts.admin ?? false) };
  const catalog = {
    findCourseById: jest
      .fn()
      .mockResolvedValue({ id: 1, is_free: opts.courseFree ?? false }),
  };
  const service = new LearningService(
    repo as unknown as LearningRepository,
    new LearningMapper(),
    auth as unknown as AuthService,
    catalog as unknown as CatalogService,
  );
  return { service, repo };
}

const quiz = (over: Partial<QuizAccessRow> = {}): QuizAccessRow => ({
  isFree: false,
  module: PAID_MODULE,
  lessons: [],
  ...over,
});

describe('LearningService.canTakeQuiz (#22a)', () => {
  it('quiz trả phí, chưa ghi danh → false; khách → false', async () => {
    expect(await setup({ quiz: quiz() }).service.canTakeQuiz(1, USER)).toBe(
      false,
    );
    expect(
      await setup({ quiz: quiz() }).service.canTakeQuiz(1, undefined),
    ).toBe(false);
  });

  it('ghi danh còn hạn → true; hết hạn → false', async () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 60_000);
    expect(
      await setup({
        quiz: quiz(),
        enrollment: { expiresAt: future },
      }).service.canTakeQuiz(1, USER),
    ).toBe(true);
    expect(
      await setup({
        quiz: quiz(),
        enrollment: { expiresAt: past },
      }).service.canTakeQuiz(1, USER),
    ).toBe(false);
  });

  it('quiz is_free, module free, khóa free → true kể cả khách', async () => {
    for (const s of [
      setup({ quiz: quiz({ isFree: true }) }),
      setup({ quiz: quiz({ module: { isFree: true, courseId: 1 } }) }),
      setup({ quiz: quiz(), courseFree: true }),
    ]) {
      expect(await s.service.canTakeQuiz(1, undefined)).toBe(true);
    }
  });

  it('một bài free gắn quiz → true; bài trả phí gắn quiz → false', async () => {
    const lessonFree = { isFree: true, module: PAID_MODULE };
    const lessonPaid = { isFree: false, module: PAID_MODULE };
    expect(
      await setup({
        quiz: quiz({ module: null, lessons: [lessonPaid, lessonFree] }),
      }).service.canTakeQuiz(1, USER),
    ).toBe(true);
    expect(
      await setup({
        quiz: quiz({ module: null, lessons: [lessonPaid] }),
      }).service.canTakeQuiz(1, USER),
    ).toBe(false);
  });

  it('quiz không gắn module hay bài nào → chỉ admin', async () => {
    const orphan = quiz({ module: null, lessons: [] });
    expect(await setup({ quiz: orphan }).service.canTakeQuiz(1, USER)).toBe(
      false,
    );
    expect(
      await setup({ quiz: orphan, admin: true }).service.canTakeQuiz(1, USER),
    ).toBe(true);
  });

  it('quiz không tồn tại → false', async () => {
    expect(await setup({ quiz: null }).service.canTakeQuiz(1, USER)).toBe(
      false,
    );
  });

  it('chỉ đọc enrollment một lần cho mỗi khóa', async () => {
    const { service, repo } = setup({
      quiz: quiz({
        lessons: [
          { isFree: false, module: PAID_MODULE },
          { isFree: false, module: PAID_MODULE },
        ],
      }),
    });
    await service.canTakeQuiz(1, USER);
    expect(repo.findEnrollment).toHaveBeenCalledTimes(1);
  });
});
