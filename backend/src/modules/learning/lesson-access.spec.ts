import {
  canStudyLesson,
  isEnrollmentActive,
  lessonAccessContext,
  type LessonAccessContext,
} from './lesson-access';

const NOW = new Date('2026-10-28T12:00:00Z');

const NONE: LessonAccessContext = {
  isAdmin: false,
  enrolled: false,
  courseIsFree: false,
  moduleIsFree: false,
  lessonIsFree: false,
};

describe('canStudyLesson', () => {
  it('không có nguồn quyền nào → không được học', () => {
    expect(canStudyLesson(NONE)).toBe(false);
  });

  it.each<keyof LessonAccessContext>([
    'isAdmin',
    'enrolled',
    'courseIsFree',
    'moduleIsFree',
    'lessonIsFree',
  ])('chỉ có %s → được học', (key) => {
    expect(canStudyLesson({ ...NONE, [key]: true })).toBe(true);
  });
});

describe('lessonAccessContext', () => {
  const paidLesson = { isFree: false };
  const paidModule = { isFree: false };
  const paidCourse = { is_free: false };

  it('khách (không enrollment) chỉ được học bài/module/khóa free', () => {
    const guest = (over: Partial<Parameters<typeof lessonAccessContext>[0]>) =>
      canStudyLesson(
        lessonAccessContext({
          isAdmin: false,
          enrollment: null,
          now: NOW,
          course: paidCourse,
          module: paidModule,
          lesson: paidLesson,
          ...over,
        }),
      );
    expect(guest({})).toBe(false);
    expect(guest({ lesson: { isFree: true } })).toBe(true);
    expect(guest({ module: { isFree: true } })).toBe(true);
    expect(guest({ course: { is_free: true } })).toBe(true);
  });

  it('cờ free null coi như false', () => {
    const ctx = lessonAccessContext({
      isAdmin: false,
      enrollment: null,
      now: NOW,
      course: { is_free: null },
      module: { isFree: null },
      lesson: { isFree: null },
    });
    expect(canStudyLesson(ctx)).toBe(false);
  });

  it('khóa không tồn tại → courseIsFree = false', () => {
    const ctx = lessonAccessContext({
      isAdmin: false,
      enrollment: null,
      now: NOW,
      course: null,
      module: paidModule,
      lesson: paidLesson,
    });
    expect(ctx.courseIsFree).toBe(false);
  });

  it('bài không có module: enrolled/courseIsFree/moduleIsFree = false, chỉ còn lessonIsFree', () => {
    const ctx = lessonAccessContext({
      isAdmin: false,
      enrollment: { expiresAt: null },
      now: NOW,
      course: { is_free: true },
      module: null,
      lesson: paidLesson,
    });
    expect(ctx).toEqual(NONE);
    expect(
      canStudyLesson(
        lessonAccessContext({
          isAdmin: false,
          enrollment: { expiresAt: null },
          now: NOW,
          course: null,
          module: null,
          lesson: { isFree: true },
        }),
      ),
    ).toBe(true);
  });

  it('admin luôn học được, kể cả bài không module', () => {
    const ctx = lessonAccessContext({
      isAdmin: true,
      enrollment: null,
      now: NOW,
      course: null,
      module: null,
      lesson: paidLesson,
    });
    expect(canStudyLesson(ctx)).toBe(true);
  });
});

describe('ghi danh hết hạn (OPEN_QUESTIONS #18)', () => {
  const at = (iso: string) => ({ expiresAt: new Date(iso) });

  it('expires_at null = vĩnh viễn → còn hạn', () => {
    expect(isEnrollmentActive({ expiresAt: null }, NOW)).toBe(true);
  });

  it('expires_at < now → hết hạn; bằng hoặc sau now → còn hạn', () => {
    expect(isEnrollmentActive(at('2026-10-28T11:59:59Z'), NOW)).toBe(false);
    expect(isEnrollmentActive(at('2026-10-28T12:00:00Z'), NOW)).toBe(true);
    expect(isEnrollmentActive(at('2027-01-01T00:00:00Z'), NOW)).toBe(true);
  });

  it('ghi danh hết hạn không mở bài trả phí, nhưng bài/module/khóa free vẫn học được', () => {
    const study = (over: Partial<Parameters<typeof lessonAccessContext>[0]>) =>
      canStudyLesson(
        lessonAccessContext({
          isAdmin: false,
          enrollment: at('2026-01-01T00:00:00Z'),
          now: NOW,
          course: { is_free: false },
          module: { isFree: false },
          lesson: { isFree: false },
          ...over,
        }),
      );
    expect(study({})).toBe(false);
    expect(study({ lesson: { isFree: true } })).toBe(true);
    expect(study({ enrollment: at('2027-01-01T00:00:00Z') })).toBe(true);
  });
});
