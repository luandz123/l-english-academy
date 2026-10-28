import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminStudentNote } from '../../generated/prisma/client';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findNotesByStudent(studentId: string): Promise<AdminStudentNote[]> {
    return this.prisma.adminStudentNote.findMany({
      where: { studentId },
      orderBy: [{ createdAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    });
  }

  createNote(data: {
    adminId: string;
    studentId: string;
    content: string;
  }): Promise<AdminStudentNote> {
    return this.prisma.adminStudentNote.create({
      data,
    });
  }
}
