import { LearningMapper } from './learning.mapper';
import type {
  Enrollment,
  Lesson,
  Material,
  UserFavorite,
  UserLessonProgress,
  UserNote,
} from '../../generated/prisma/client';
import type { LessonPracticeWithQuiz } from './learning.repository';

describe('LearningMapper', () => {
  const mapper = new LearningMapper();

  describe('toLessonProgressDto', () => {
    it('chuyển đổi UserLessonProgress sang LessonProgressDto với ngày ISO', () => {
      const progress: UserLessonProgress = {
        id: 1,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 10,
        isCompleted: true,
        lastWatchedAt: new Date('2026-01-02T03:04:05.000Z'),
        watchDurationSeconds: 120,
      };

      const dto = mapper.toLessonProgressDto(progress);

      expect(dto).toEqual({
        id: 1,
        user_id: '11111111-1111-1111-1111-111111111111',
        lesson_id: 10,
        is_completed: true,
        last_watched_at: '2026-01-02T03:04:05.000Z',
        watch_duration_seconds: 120,
      });
    });

    it('giữ null khi lastWatchedAt là null', () => {
      const progress: UserLessonProgress = {
        id: 2,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 11,
        isCompleted: false,
        lastWatchedAt: null,
        watchDurationSeconds: 0,
      };

      const dto = mapper.toLessonProgressDto(progress);

      expect(dto.last_watched_at).toBeNull();
      expect(dto.is_completed).toBe(false);
    });
  });

  describe('toFavoriteDto', () => {
    it('chuyển đổi UserFavorite sang FavoriteDto', () => {
      const favorite: UserFavorite = {
        id: 5,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 20,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };

      const dto = mapper.toFavoriteDto(favorite);

      expect(dto).toEqual({
        id: 5,
        user_id: '11111111-1111-1111-1111-111111111111',
        lesson_id: 20,
        created_at: '2026-01-01T00:00:00.000Z',
      });
    });

    it('giữ null khi createdAt là null', () => {
      const favorite: UserFavorite = {
        id: 6,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 21,
        createdAt: null,
      };

      const dto = mapper.toFavoriteDto(favorite);

      expect(dto.created_at).toBeNull();
    });
  });

  describe('toNoteDto', () => {
    it('chuyển đổi UserNote sang NoteDto', () => {
      const note: UserNote = {
        id: 8,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 30,
        content: 'Ghi chú học tập',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-01T11:00:00.000Z'),
      };

      const dto = mapper.toNoteDto(note);

      expect(dto).toEqual({
        id: 8,
        user_id: '11111111-1111-1111-1111-111111111111',
        lesson_id: 30,
        content: 'Ghi chú học tập',
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-01-01T11:00:00.000Z',
      });
    });

    it('giữ null khi createdAt/updatedAt là null', () => {
      const note: UserNote = {
        id: 9,
        userId: '11111111-1111-1111-1111-111111111111',
        lessonId: 31,
        content: 'Ghi chú khác',
        createdAt: null,
        updatedAt: null,
      };

      const dto = mapper.toNoteDto(note);

      expect(dto.created_at).toBeNull();
      expect(dto.updated_at).toBeNull();
    });
  });

  describe('toPracticeDto', () => {
    it('chuyển đổi LessonPracticeWithQuiz có quiz liên kết', () => {
      const practice: LessonPracticeWithQuiz = {
        id: 12,
        lessonId: 40,
        quizId: 99,
        triggerAtSeconds: 150,
        title: 'Luyện tập giữa bài',
        displayOrder: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        quiz: {
          id: 99,
          title: 'Quiz 99',
          totalQuestions: 5,
        },
      };

      const dto = mapper.toPracticeDto(practice);

      expect(dto).toEqual({
        id: 12,
        lesson_id: 40,
        quiz_id: 99,
        trigger_at_seconds: 150,
        title: 'Luyện tập giữa bài',
        display_order: 1,
        created_at: '2026-01-01T00:00:00.000Z',
        quizzes: {
          id: 99,
          title: 'Quiz 99',
          total_questions: 5,
        },
      });
    });

    it('trả về quizzes: null khi quizId = null hoặc không có quiz', () => {
      const practice: LessonPracticeWithQuiz = {
        id: 13,
        lessonId: 40,
        quizId: null,
        triggerAtSeconds: 300,
        title: null,
        displayOrder: 2,
        createdAt: null,
        quiz: null,
      };

      const dto = mapper.toPracticeDto(practice);

      expect(dto.quiz_id).toBeNull();
      expect(dto.quizzes).toBeNull();
      expect(dto.title).toBeNull();
      expect(dto.created_at).toBeNull();
    });
  });

  describe('toLessonDto / toMaterialDto / toEnrollmentDto', () => {
    it('toLessonDto che videoUrl và pdfUrl khi canStudy = false', () => {
      const lesson: Lesson = {
        id: 1,
        moduleId: 2,
        title: 'Bài 1',
        videoUrl: 'https://cdn.example.com/video.mp4',
        durationSeconds: 300,
        displayOrder: 1,
        isLive: false,
        liveTime: null,
        lessonType: 'video',
        quizId: null,
        pdfUrl: 'https://cdn.example.com/slide.pdf',
        isFree: false,
        isPublished: true,
      };

      const hidden = mapper.toLessonDto(lesson, false);
      expect(hidden.video_url).toBeNull();
      expect(hidden.pdf_url).toBeNull();

      const visible = mapper.toLessonDto(lesson, true);
      expect(visible.video_url).toBe('https://cdn.example.com/video.mp4');
      expect(visible.pdf_url).toBe('https://cdn.example.com/slide.pdf');
    });

    it('toMaterialDto chuyển đổi đầy đủ các trường', () => {
      const material: Material = {
        id: 1,
        lessonId: 10,
        quizId: null,
        courseId: 2,
        title: 'Tài liệu PDF',
        fileUrl: 'https://cdn.example.com/doc.pdf',
        fileType: 'pdf',
        displayOrder: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        folderPath: '/',
      };
      const dto = mapper.toMaterialDto(material);
      expect(dto.title).toBe('Tài liệu PDF');
      expect(dto.file_url).toBe('https://cdn.example.com/doc.pdf');
    });

    it('toEnrollmentDto chuyển đổi ngày sang ISO', () => {
      const enrollment: Enrollment = {
        id: 1,
        userId: '11111111-1111-1111-1111-111111111111',
        courseId: 5,
        enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-07-01T00:00:00.000Z'),
      };
      const dto = mapper.toEnrollmentDto(enrollment);
      expect(dto.enrolled_at).toBe('2026-01-01T00:00:00.000Z');
      expect(dto.expires_at).toBe('2026-07-01T00:00:00.000Z');
    });
  });
});
