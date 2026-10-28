import { Injectable } from '@nestjs/common';
import type { AdminStudentNote } from '../../generated/prisma/client';
import { AdminNoteDto } from './dto';

@Injectable()
export class AdminMapper {
  toAdminNoteDto(note: AdminStudentNote): AdminNoteDto {
    return {
      id: note.id,
      admin_id: note.adminId,
      student_id: note.studentId,
      content: note.content,
      created_at: note.createdAt ? note.createdAt.toISOString() : null,
    };
  }
}
