import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AdminMapper } from './admin.mapper';
import { AdminRepository } from './admin.repository';
import { AdminNoteDto, CreateAdminNoteDto, SettingDto } from './dto';
import {
  PUBLIC_SETTING_KEYS,
  PublicSettingKey,
  SETTING_KEY_REGEX,
} from './settings.constants';

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

  async getPublicSetting(key: string): Promise<SettingDto | null> {
    if (!PUBLIC_SETTING_KEYS.includes(key as PublicSettingKey)) {
      return null;
    }
    const setting = await this.repo.findSettingByKey(key);
    return setting ? this.mapper.toSettingDto(setting) : null;
  }

  async listAllSettings(): Promise<SettingDto[]> {
    const settings = await this.repo.findAllSettings();
    return settings.map((s) => this.mapper.toSettingDto(s));
  }

  async saveSetting(key: string, value: string): Promise<SettingDto> {
    if (!SETTING_KEY_REGEX.test(key)) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message:
          'Khóa cài đặt không hợp lệ. Chỉ chấp nhận chữ cái thường a-z, chữ số 0-9 và dấu gạch dưới, độ dài từ 1 đến 64 ký tự.',
      });
    }
    const setting = await this.repo.upsertSetting(key, value);
    return this.mapper.toSettingDto(setting);
  }
}
