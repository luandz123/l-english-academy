import {
  canStudyLesson,
  lessonAccessContext,
  type LessonAccessContext,
} from './lesson-access';

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
          hasEnrollment: false,
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
      hasEnrollment: false,
      course: { is_free: null },
      module: { isFree: null },
      lesson: { isFree: null },
    });
    expect(canStudyLesson(ctx)).toBe(false);
  });

  it('khóa không tồn tại → courseIsFree = false', () => {
    const ctx = lessonAccessContext({
      isAdmin: false,
      hasEnrollment: false,
      course: null,
      module: paidModule,
      lesson: paidLesson,
    });
    expect(ctx.courseIsFree).toBe(false);
  });

  it('bài không có module: enrolled/courseIsFree/moduleIsFree = false, chỉ còn lessonIsFree', () => {
    const ctx = lessonAccessContext({
      isAdmin: false,
      hasEnrollment: true,
      course: { is_free: true },
      module: null,
      lesson: paidLesson,
    });
    expect(ctx).toEqual(NONE);
    expect(
      canStudyLesson(
        lessonAccessContext({
          isAdmin: false,
          hasEnrollment: true,
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
      hasEnrollment: false,
      course: null,
      module: null,
      lesson: paidLesson,
    });
    expect(canStudyLesson(ctx)).toBe(true);
  });
});
