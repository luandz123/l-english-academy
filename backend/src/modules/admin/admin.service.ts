import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AdminMapper } from './admin.mapper';
import { AdminRepository } from './admin.repository';
import { AdminNoteDto, CreateAdminNoteDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly mapper: AdminMapper,
  ) {}

  async listStudentNotes(studentId: string): Promise<AdminNoteDto[]> {
    const notes = await this.repo.findNotesByStudent(studentId);
    return notes.map((n) => this.mapper.toAdminNoteDto(n));
  }

  async addStudentNote(
    adminId: string,
    studentId: string,
    dto: CreateAdminNoteDto,
  ): Promise<AdminNoteDto> {
    try {
      const note = await this.repo.createNote({
        adminId,
        studentId,
        content: dto.content,
      });
      return this.mapper.toAdminNoteDto(note);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException({
          code: 'USER_NOT_FOUND',
          message: 'Học viên không tồn tại',
        });
      }
      throw error;
    }
  }
}
