import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AdminMapper } from './admin.mapper';
import { AdminRepository } from './admin.repository';
import {
  AdminActivityLogDto,
  AdminCountsDto,
  AdminCourseEnrollmentsDto,
  AdminNoteDto,
  AdminQuestionDto,
  AdminQuizScoresDto,
  AdminStudentsDto,
  AdminUserAnswerDto,
  CreateAdminActivityLogDto,
  CreateAdminNoteDto,
  RecentEnrollmentDto,
  RecentQuizResultDto,
  SettingDto,
} from './dto';
import type { ProfileDto } from '../auth/dto/profile.dto';
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

  // Thống kê toàn hệ thống (dashboard / báo cáo / học viên) — chỉ đọc (T-020)
  async getCounts(): Promise<AdminCountsDto> {
    return this.repo.getStatsCounts();
  }

  async getRecentEnrollments(): Promise<RecentEnrollmentDto[]> {
    const enrollments = await this.repo.findRecentEnrollments(5);
    return enrollments.map((e) => this.mapper.toRecentEnrollmentDto(e));
  }

  async getRecentQuizResults(): Promise<RecentQuizResultDto[]> {
    const results = await this.repo.findRecentQuizResults(5);
    return results.map((r) => this.mapper.toRecentQuizResultDto(r));
  }

  async getQuizScores(): Promise<AdminQuizScoresDto> {
    return this.repo.findQuizScores();
  }

  async getCourseEnrollments(): Promise<AdminCourseEnrollmentsDto> {
    return this.repo.findCourseEnrollments();
  }

  async getUserAnswers(): Promise<AdminUserAnswerDto[]> {
    return this.repo.findUserAnswers();
  }

  async getQuestionsByIds(idsParam?: string): Promise<AdminQuestionDto[]> {
    if (!idsParam || !idsParam.trim()) {
      return [];
    }
    const rawIds = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawIds.length === 0) {
      return [];
    }

    if (rawIds.length > 50) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Số lượng câu hỏi vượt quá giới hạn tối đa (tối đa 50 id).',
      });
    }

    const ids: number[] = [];
    for (const rawId of rawIds) {
      const parsed = Number(rawId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: `ID câu hỏi không hợp lệ: ${rawId}`,
        });
      }
      ids.push(parsed);
    }

    return this.repo.findQuestionsByIds(ids);
  }

  async getStudents(): Promise<AdminStudentsDto> {
    const { profiles, enrollments } =
      await this.repo.findStudentsWithEnrollments();
    return {
      profiles: profiles.map((p) => this.mapper.toProfileDto(p)),
      enrollments,
    };
  }

  getBackupStats(): Promise<Record<string, number>> {
    return this.repo.getBackupStats();
  }

  async getBackupFullSnapshot(): Promise<{
    snapshot: Record<string, unknown[]>;
    counts: Record<string, number>;
  }> {
    const snapshot = await this.repo.getBackupFullSnapshot();
    const counts = Object.fromEntries(
      Object.entries(snapshot).map(([k, v]) => [k, v.length]),
    );
    return { snapshot, counts };
  }

  getBackupStudents(): Promise<
    {
      user_id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      updated_at: string | null;
    }[]
  > {
    return this.repo.getBackupStudents();
  }

  getBackupTestResults(): Promise<
    {
      id: number;
      user_id: string;
      test_id: number;
      correct_answers: number | null;
      listening_score: number | null;
      reading_score: number | null;
      total_score: number | null;
      time_spent_seconds: number | null;
      test_mode: string | null;
      created_at: string | null;
    }[]
  > {
    return this.repo.getBackupTestResults();
  }

  getBackupQuestionBank(): Promise<{
    full_tests: { id: number; title: string; category: string }[];
    questions: unknown[];
    answers: unknown[];
  }> {
    return this.repo.getBackupQuestionBank();
  }

  async getAdminUsers(): Promise<ProfileDto[]> {
    const profiles = await this.repo.findAdminUsers();
    return profiles.map((p) => this.mapper.toProfileDto(p));
  }

  async createActivityLog(
    adminId: string,
    dto: CreateAdminActivityLogDto,
  ): Promise<AdminActivityLogDto> {
    const log = await this.repo.createActivityLog({
      adminId,
      action: dto.action,
      entityType: dto.entity_type,
      entityId: dto.entity_id,
      details: dto.details as unknown as Prisma.InputJsonValue,
    });
    return this.mapper.toAdminActivityLogDto(log);
  }

  async getActivityLogs(limit = 100): Promise<AdminActivityLogDto[]> {
    const logs = await this.repo.findActivityLogs(limit);
    return logs.map((l) => this.mapper.toAdminActivityLogDto(l));
  }
}
