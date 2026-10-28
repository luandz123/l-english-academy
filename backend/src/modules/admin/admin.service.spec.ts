import { HttpException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AdminMapper } from './admin.mapper';
import type { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

const NOTE_ROW = {
  id: 1,
  adminId: 'admin-1',
  studentId: 'student-1',
  content: '  Ghi chú nguyên văn  ',
  createdAt: new Date('2026-10-28T12:00:00.000Z'),
};

const SETTING_ROW = {
  key: 'homepage_showcase_config',
  value: '{"vip_combo":{"price":1750000}}',
  updatedAt: new Date('2026-10-28T12:00:00.000Z'),
};

function setup() {
  const repo = {
    findNotesByStudent: jest.fn().mockResolvedValue([NOTE_ROW]),
    createNote: jest
      .fn()
      .mockImplementation(
        (data: { adminId: string; studentId: string; content: string }) =>
          Promise.resolve({
            ...NOTE_ROW,
            adminId: data.adminId,
            studentId: data.studentId,
            content: data.content,
          }),
      ),
    findSettingByKey: jest.fn().mockResolvedValue(SETTING_ROW),
    findAllSettings: jest.fn().mockResolvedValue([SETTING_ROW]),
    upsertSetting: jest.fn().mockImplementation((key: string, value: string) =>
      Promise.resolve({
        key,
        value,
        updatedAt: new Date('2026-10-28T12:00:00.000Z'),
      }),
    ),
    getStatsCounts: jest.fn().mockResolvedValue({
      total_students: 42,
      total_courses: 5,
      total_quiz_attempts: 120,
    }),
    findRecentEnrollments: jest.fn().mockResolvedValue([
      {
        id: 1,
        userId: 'user-1',
        courseId: 2,
        enrolledAt: new Date('2026-10-28T12:00:00.000Z'),
        expiresAt: new Date('2027-04-28T12:00:00.000Z'),
        course: { title: 'TOEIC 450+' },
        user: { profile: { userId: 'user-1', fullName: 'Học viên A' } },
      },
    ]),
    findRecentQuizResults: jest.fn().mockResolvedValue([
      {
        id: 10,
        userId: 'user-1',
        quizId: 3,
        score: new Prisma.Decimal(8.5),
        correctAnswers: 8,
        totalQuestions: 10,
        completedAt: new Date('2026-10-28T12:00:00.000Z'),
        quiz: { title: 'Mini Test 1' },
        user: { profile: { userId: 'user-1', fullName: 'Học viên A' } },
      },
    ]),
    findQuizScores: jest.fn().mockResolvedValue({
      quizzes: [{ id: 1, title: 'Quiz 1' }],
      results: [{ quiz_id: 1, score: 9.0 }],
    }),
    findCourseEnrollments: jest.fn().mockResolvedValue({
      courses: [{ id: 1, title: 'Course 1' }],
      enrollments: [{ course_id: 1 }],
    }),
    findUserAnswers: jest
      .fn()
      .mockResolvedValue([{ question_id: 101, is_correct: true }]),
    findQuestionsByIds: jest
      .fn()
      .mockResolvedValue([{ id: 101, question_text: 'Question text?' }]),
    findStudentsWithEnrollments: jest.fn().mockResolvedValue({
      profiles: [
        {
          id: 'p-1',
          userId: 'user-1',
          fullName: 'Học viên A',
          avatarUrl: null,
          email: 'student@example.com',
          isPro: false,
          proPlan: null,
          proActivatedAt: null,
          createdAt: new Date('2026-10-20T00:00:00.000Z'),
          updatedAt: new Date('2026-10-20T00:00:00.000Z'),
        },
      ],
      enrollments: [
        { user_id: 'user-1', expires_at: '2027-04-28T12:00:00.000Z' },
      ],
    }),
  };
  const service = new AdminService(
    repo as unknown as AdminRepository,
    new AdminMapper(),
  );
  return { service, repo };
}

describe('AdminService', () => {
  it('listStudentNotes trả danh sách đã map sang snake_case', async () => {
    const { service, repo } = setup();
    const res = await service.listStudentNotes('student-1');
    expect(repo.findNotesByStudent).toHaveBeenCalledWith('student-1');
    expect(res).toEqual([
      {
        id: 1,
        admin_id: 'admin-1',
        student_id: 'student-1',
        content: '  Ghi chú nguyên văn  ',
        created_at: '2026-10-28T12:00:00.000Z',
      },
    ]);
  });

  it('addStudentNote giữ nguyên văn content (không trim) và gán adminId từ tham số', async () => {
    const { service, repo } = setup();
    const res = await service.addStudentNote('admin-9', 'student-1', {
      content: '  Nội dung có khoảng trắng  ',
    });
    expect(repo.createNote).toHaveBeenCalledWith({
      adminId: 'admin-9',
      studentId: 'student-1',
      content: '  Nội dung có khoảng trắng  ',
    });
    expect(res.admin_id).toBe('admin-9');
    expect(res.content).toBe('  Nội dung có khoảng trắng  ');
  });

  it('addStudentNote: P2003 (học viên không tồn tại) → 404 USER_NOT_FOUND', async () => {
    const { service, repo } = setup();
    repo.createNote.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: '7.0.0',
      }),
    );

    try {
      await service.addStudentNote('admin-1', 'missing-user', {
        content: 'test',
      });
      throw new Error('Lẽ ra phải ném lỗi');
    } catch (err) {
      const http = err as HttpException;
      expect(http.getStatus()).toBe(404);
      expect(http.getResponse()).toMatchObject({ code: 'USER_NOT_FOUND' });
    }
  });

  describe('platform_settings', () => {
    it('getPublicSetting trả SettingDto khi key thuộc danh sách công khai', async () => {
      const { service, repo } = setup();
      const res = await service.getPublicSetting('homepage_showcase_config');
      expect(repo.findSettingByKey).toHaveBeenCalledWith(
        'homepage_showcase_config',
      );
      expect(res).toEqual({
        key: 'homepage_showcase_config',
        value: '{"vip_combo":{"price":1750000}}',
        updated_at: '2026-10-28T12:00:00.000Z',
      });
    });

    it('getPublicSetting trả null khi key không thuộc danh sách công khai (không gọi repo)', async () => {
      const { service, repo } = setup();
      const res = await service.getPublicSetting('secret_key');
      expect(repo.findSettingByKey).not.toHaveBeenCalled();
      expect(res).toBeNull();
    });

    it('getPublicSetting trả null khi key công khai nhưng không có trong DB', async () => {
      const { service, repo } = setup();
      repo.findSettingByKey.mockResolvedValue(null);
      const res = await service.getPublicSetting('contact_phone');
      expect(res).toBeNull();
    });

    it('listAllSettings trả danh sách cài đặt đã map', async () => {
      const { service, repo } = setup();
      const res = await service.listAllSettings();
      expect(repo.findAllSettings).toHaveBeenCalled();
      expect(res).toEqual([
        {
          key: 'homepage_showcase_config',
          value: '{"vip_combo":{"price":1750000}}',
          updated_at: '2026-10-28T12:00:00.000Z',
        },
      ]);
    });

    it('saveSetting ném 400 VALIDATION_FAILED nếu key không đúng định dạng', async () => {
      const { service, repo } = setup();
      const invalidKeys = [
        'INVALID_KEY',
        'key with space',
        'key!',
        '',
        'a'.repeat(65),
      ];

      for (const k of invalidKeys) {
        try {
          await service.saveSetting(k, 'some value');
          throw new Error(`Lẽ ra phải ném lỗi với key=${k}`);
        } catch (err) {
          const http = err as HttpException;
          expect(http.getStatus()).toBe(400);
          expect(http.getResponse()).toMatchObject({
            code: 'VALIDATION_FAILED',
          });
        }
      }
      expect(repo.upsertSetting).not.toHaveBeenCalled();
    });

    it('saveSetting upsert thành công với key hợp lệ', async () => {
      const { service, repo } = setup();
      const res = await service.saveSetting('custom_key_1', 'val');
      expect(repo.upsertSetting).toHaveBeenCalledWith('custom_key_1', 'val');
      expect(res).toEqual({
        key: 'custom_key_1',
        value: 'val',
        updated_at: '2026-10-28T12:00:00.000Z',
      });
    });
  });

  describe('admin_stats (T-020)', () => {
    it('getCounts trả đúng đối tượng thống kê', async () => {
      const { service, repo } = setup();
      const res = await service.getCounts();
      expect(repo.getStatsCounts).toHaveBeenCalled();
      expect(res).toEqual({
        total_students: 42,
        total_courses: 5,
        total_quiz_attempts: 120,
      });
    });

    it('getRecentEnrollments trả danh sách 5 lượt đăng ký gần nhất đã map', async () => {
      const { service, repo } = setup();
      const res = await service.getRecentEnrollments();
      expect(repo.findRecentEnrollments).toHaveBeenCalledWith(5);
      expect(res).toEqual([
        {
          id: 1,
          user_id: 'user-1',
          course_id: 2,
          enrolled_at: '2026-10-28T12:00:00.000Z',
          expires_at: '2027-04-28T12:00:00.000Z',
          courses: { title: 'TOEIC 450+' },
          profiles: { user_id: 'user-1', full_name: 'Học viên A' },
        },
      ]);
    });

    it('getRecentQuizResults trả danh sách 5 kết quả thi gần nhất đã map score sang number', async () => {
      const { service, repo } = setup();
      const res = await service.getRecentQuizResults();
      expect(repo.findRecentQuizResults).toHaveBeenCalledWith(5);
      expect(res).toEqual([
        {
          id: 10,
          user_id: 'user-1',
          quiz_id: 3,
          score: 8.5,
          correct_answers: 8,
          total_questions: 10,
          completed_at: '2026-10-28T12:00:00.000Z',
          quizzes: { title: 'Mini Test 1' },
          profiles: { user_id: 'user-1', full_name: 'Học viên A' },
        },
      ]);
    });

    it('getQuizScores trả quizzes và results', async () => {
      const { service, repo } = setup();
      const res = await service.getQuizScores();
      expect(repo.findQuizScores).toHaveBeenCalled();
      expect(res).toEqual({
        quizzes: [{ id: 1, title: 'Quiz 1' }],
        results: [{ quiz_id: 1, score: 9.0 }],
      });
    });

    it('getCourseEnrollments trả courses và enrollments', async () => {
      const { service, repo } = setup();
      const res = await service.getCourseEnrollments();
      expect(repo.findCourseEnrollments).toHaveBeenCalled();
      expect(res).toEqual({
        courses: [{ id: 1, title: 'Course 1' }],
        enrollments: [{ course_id: 1 }],
      });
    });

    it('getUserAnswers trả danh sách câu trả lời', async () => {
      const { service, repo } = setup();
      const res = await service.getUserAnswers();
      expect(repo.findUserAnswers).toHaveBeenCalled();
      expect(res).toEqual([{ question_id: 101, is_correct: true }]);
    });

    it('getQuestionsByIds trả mảng rỗng khi query rỗng', async () => {
      const { service, repo } = setup();
      expect(await service.getQuestionsByIds()).toEqual([]);
      expect(await service.getQuestionsByIds('')).toEqual([]);
      expect(await service.getQuestionsByIds('   ')).toEqual([]);
      expect(repo.findQuestionsByIds).not.toHaveBeenCalled();
    });

    it('getQuestionsByIds ném 400 VALIDATION_FAILED nếu > 50 ids', async () => {
      const { service, repo } = setup();
      const manyIds = Array.from({ length: 51 }, (_, i) => i + 1).join(',');
      try {
        await service.getQuestionsByIds(manyIds);
        throw new Error('Lẽ ra phải ném lỗi');
      } catch (err) {
        const http = err as HttpException;
        expect(http.getStatus()).toBe(400);
        expect(http.getResponse()).toMatchObject({
          code: 'VALIDATION_FAILED',
        });
      }
      expect(repo.findQuestionsByIds).not.toHaveBeenCalled();
    });

    it('getQuestionsByIds ném 400 VALIDATION_FAILED nếu có id không hợp lệ', async () => {
      const { service, repo } = setup();
      const invalidCases = ['abc', '1,xyz', '1,-5', '1,0', '1,2.5'];
      for (const c of invalidCases) {
        try {
          await service.getQuestionsByIds(c);
          throw new Error(`Lẽ ra phải ném lỗi với ids=${c}`);
        } catch (err) {
          const http = err as HttpException;
          expect(http.getStatus()).toBe(400);
          expect(http.getResponse()).toMatchObject({
            code: 'VALIDATION_FAILED',
          });
        }
      }
      expect(repo.findQuestionsByIds).not.toHaveBeenCalled();
    });

    it('getQuestionsByIds phân tích ids và gọi repo thành công', async () => {
      const { service, repo } = setup();
      const res = await service.getQuestionsByIds('101, 102 , 103');
      expect(repo.findQuestionsByIds).toHaveBeenCalledWith([101, 102, 103]);
      expect(res).toEqual([{ id: 101, question_text: 'Question text?' }]);
    });

    it('getStudents trả profiles và enrollments đã map', async () => {
      const { service, repo } = setup();
      const res = await service.getStudents();
      expect(repo.findStudentsWithEnrollments).toHaveBeenCalled();
      expect(res.profiles).toHaveLength(1);
      expect(res.profiles[0].user_id).toBe('user-1');
      expect(res.enrollments).toEqual([
        { user_id: 'user-1', expires_at: '2027-04-28T12:00:00.000Z' },
      ]);
    });
  });
});
