/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { LearningMapper } from './learning.mapper';
import { LearningRepository } from './learning.repository';
import { LearningService } from './learning.service';
import type {
  UserFavorite,
  UserLessonProgress,
  UserNote,
} from '../../generated/prisma/client';

describe('LearningService', () => {
  let service: LearningService;
  let repo: jest.Mocked<LearningRepository>;

  const mockUserId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<LearningRepository>> = {
      findCurriculum: jest.fn(),
      findEnrollment: jest.fn(),
      findLessonAccess: jest.fn(),
      findMaterialsByLesson: jest.fn(),
      lessonExists: jest.fn(),
      findProgressByUser: jest.fn(),
      upsertProgress: jest.fn(),
      findFavoritesByUser: jest.fn(),
      upsertFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      findNotes: jest.fn(),
      createNote: jest.fn(),
      findPracticesByLesson: jest.fn(),
    };

    const mockAuth: Partial<jest.Mocked<AuthService>> = {
      hasRole: jest.fn().mockResolvedValue(false),
    };

    const mockCatalog: Partial<jest.Mocked<CatalogService>> = {
      findCourseById: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningService,
        LearningMapper,
        { provide: LearningRepository, useValue: mockRepo },
        { provide: AuthService, useValue: mockAuth },
        { provide: CatalogService, useValue: mockCatalog },
      ],
    }).compile();

    service = module.get<LearningService>(LearningService);
    repo = module.get(LearningRepository);
  });

  describe('updateProgress', () => {
    it('ném NotFoundException (LESSON_NOT_FOUND) khi bài học không tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(false);

      await expect(
        service.updateProgress(mockUserId, 999, { is_completed: true }),
      ).rejects.toThrow(NotFoundException);

      try {
        await service.updateProgress(mockUserId, 999, { is_completed: true });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
        const res = (err as NotFoundException).getResponse() as Record<
          string,
          unknown
        >;
        expect(res.code).toBe('LESSON_NOT_FOUND');
      }
    });

    it('upsert progress và trả về DTO khi bài học tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(true);
      const mockRecord: UserLessonProgress = {
        id: 1,
        userId: mockUserId,
        lessonId: 10,
        isCompleted: true,
        lastWatchedAt: new Date('2026-01-01T00:00:00.000Z'),
        watchDurationSeconds: 100,
      };
      repo.upsertProgress.mockResolvedValue(mockRecord);

      const result = await service.updateProgress(mockUserId, 10, {
        is_completed: true,
      });

      expect(repo.upsertProgress).toHaveBeenCalledWith(mockUserId, 10, true);
      expect(result.is_completed).toBe(true);
      expect(result.lesson_id).toBe(10);
    });
  });

  describe('addFavorite', () => {
    it('ném NotFoundException (LESSON_NOT_FOUND) khi bài học không tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(false);

      try {
        await service.addFavorite(mockUserId, 999);
        fail('Phải ném NotFoundException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
        const res = (err as NotFoundException).getResponse() as Record<
          string,
          unknown
        >;
        expect(res.code).toBe('LESSON_NOT_FOUND');
      }
    });

    it('upsert favorite và trả về DTO khi bài học tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(true);
      const mockFav: UserFavorite = {
        id: 5,
        userId: mockUserId,
        lessonId: 15,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      repo.upsertFavorite.mockResolvedValue(mockFav);

      const result = await service.addFavorite(mockUserId, 15);

      expect(repo.upsertFavorite).toHaveBeenCalledWith(mockUserId, 15);
      expect(result.id).toBe(5);
      expect(result.lesson_id).toBe(15);
    });
  });

  describe('removeFavorite', () => {
    it('gọi repo.deleteFavorite mà không ném lỗi', async () => {
      repo.deleteFavorite.mockResolvedValue(undefined);

      await expect(
        service.removeFavorite(mockUserId, 15),
      ).resolves.toBeUndefined();
      expect(repo.deleteFavorite).toHaveBeenCalledWith(mockUserId, 15);
    });
  });

  describe('createNote', () => {
    it('ném BadRequestException (VALIDATION_FAILED) khi content rỗng hoặc chỉ có khoảng trắng', async () => {
      await expect(
        service.createNote(mockUserId, 20, { content: '   ' }),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.createNote(mockUserId, 20, { content: '   ' });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(BadRequestException);
        const res = (err as BadRequestException).getResponse() as Record<
          string,
          unknown
        >;
        expect(res.code).toBe('VALIDATION_FAILED');
      }
    });

    it('ném NotFoundException (LESSON_NOT_FOUND) khi bài học không tồn tại', async () => {
      repo.lessonExists.mockResolvedValue(false);

      try {
        await service.createNote(mockUserId, 999, { content: 'Học bài' });
        fail('Phải ném NotFoundException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(NotFoundException);
        const res = (err as NotFoundException).getResponse() as Record<
          string,
          unknown
        >;
        expect(res.code).toBe('LESSON_NOT_FOUND');
      }
    });

    it('trim nội dung ghi chú trước khi lưu vào DB', async () => {
      repo.lessonExists.mockResolvedValue(true);
      const mockNote: UserNote = {
        id: 7,
        userId: mockUserId,
        lessonId: 20,
        content: 'Nội dung quan trọng',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      repo.createNote.mockResolvedValue(mockNote);

      const result = await service.createNote(mockUserId, 20, {
        content: '   Nội dung quan trọng   ',
      });

      expect(repo.createNote).toHaveBeenCalledWith(
        mockUserId,
        20,
        'Nội dung quan trọng',
      );
      expect(result.content).toBe('Nội dung quan trọng');
    });
  });

  describe('getMyProgress & getMyFavorites & getLessonNotes & getLessonPractices', () => {
    it('getMyProgress trả về danh sách tiến độ bài học của user', async () => {
      repo.findProgressByUser.mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          lessonId: 10,
          isCompleted: true,
          lastWatchedAt: new Date('2026-01-01T00:00:00.000Z'),
          watchDurationSeconds: 60,
        },
      ]);

      const list = await service.getMyProgress(mockUserId);
      expect(repo.findProgressByUser).toHaveBeenCalledWith(mockUserId);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(1);
    });

    it('getMyFavorites trả về danh sách yêu thích của user', async () => {
      repo.findFavoritesByUser.mockResolvedValue([
        {
          id: 3,
          userId: mockUserId,
          lessonId: 12,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const list = await service.getMyFavorites(mockUserId);
      expect(repo.findFavoritesByUser).toHaveBeenCalledWith(mockUserId);
      expect(list).toHaveLength(1);
    });

    it('getLessonNotes trả về danh sách ghi chú của bài học', async () => {
      repo.findNotes.mockResolvedValue([
        {
          id: 4,
          userId: mockUserId,
          lessonId: 12,
          content: 'Note 1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const list = await service.getLessonNotes(mockUserId, 12);
      expect(repo.findNotes).toHaveBeenCalledWith(mockUserId, 12);
      expect(list).toHaveLength(1);
    });

    it('getLessonPractices trả về danh sách popup luyện tập', async () => {
      const mockPractices = [
        {
          id: 1,
          lessonId: 12,
          quizId: 5,
          triggerAtSeconds: 30,
          title: 'Quiz 5',
          displayOrder: 1,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          quiz: { id: 5, title: 'Quiz 5', totalQuestions: 3 },
        },
      ];
      repo.findPracticesByLesson.mockResolvedValue(mockPractices);

      const list = await service.getLessonPractices(12);
      expect(repo.findPracticesByLesson).toHaveBeenCalledWith(12);
      expect(list).toHaveLength(1);
      expect(list[0].quizzes?.title).toBe('Quiz 5');
    });
  });
});
