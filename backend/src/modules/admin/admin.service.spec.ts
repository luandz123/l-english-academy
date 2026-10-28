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
});
