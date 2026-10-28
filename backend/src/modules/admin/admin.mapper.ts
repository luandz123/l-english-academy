import { Injectable } from '@nestjs/common';
import type {
  AdminStudentNote,
  PlatformSetting,
} from '../../generated/prisma/client';
import { AdminNoteDto, SettingDto } from './dto';

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

  toSettingDto(setting: PlatformSetting): SettingDto {
    return {
      key: setting.key,
      value: setting.value,
      updated_at: setting.updatedAt ? setting.updatedAt.toISOString() : null,
    };
  }
}
