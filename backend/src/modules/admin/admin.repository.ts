import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminStudentNote,
  PlatformSetting,
} from '../../generated/prisma/client';

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

  findSettingByKey(key: string): Promise<PlatformSetting | null> {
    return this.prisma.platformSetting.findUnique({
      where: { key },
    });
  }

  findAllSettings(): Promise<PlatformSetting[]> {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  upsertSetting(key: string, value: string): Promise<PlatformSetting> {
    const now = new Date();
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedAt: now,
      },
      update: {
        value,
        updatedAt: now,
      },
    });
  }
}
