import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import {
  FullTestAnswerDetailDto,
  FullTestDto,
  FullTestQuestionDto,
  FullTestResultDto,
  LatestFullTestResultResponseDto,
  SubmitFullTestDto,
} from './dto';
import { FullTestMapper } from './full-test.mapper';
import { FullTestRepository } from './full-test.repository';
import { gradeFullTest } from './toeic-scoring';

const MAX_ANSWERS_MAP_KEYS = 400;

@Injectable()
export class FullTestService {
  constructor(
    private readonly repo: FullTestRepository,
    private readonly mapper: FullTestMapper,
    private readonly learning: LearningService,
    private readonly auth: AuthService,
  ) {}

  /** Thay `FullTestExam.tsx:314`. Công khai như RLS cũ. */
  async getFullTest(testId: number): Promise<FullTestDto> {
    const test = await this.repo.findFullTest(testId);
    if (!test) throw this.notFound(testId);
    return this.mapper.toFullTestDto(test);
  }

  /**
   * Thay `FullTestExam.tsx:339-377`, `FullTestResult.tsx:92-128`. Kèm đáp án (chế độ luyện
   * tập cần), nên chỉ trả khi được vào khóa của **đề** (không phải khóa trên URL). Đề không
   * có → []; không có quyền → 403 `FULLTEST_LOCKED`.
   */
  async getQuestions(
    testId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<FullTestQuestionDto[]> {
    const test = await this.repo.findFullTest(testId);
    if (!test) return [];
    await this.assertAccess(test.courseId, user);
    const questions = await this.repo.findQuestions(testId);
    return questions.map((q) => this.mapper.toQuestionDto(q));
  }

  /**
   * Thay `FullTestExam.tsx:703-783`: chấm và quy đổi ETS ở server, ghi kết quả + chi tiết
   * trong một transaction. Câu trong bài = mọi câu của các Part đã chọn (server tự lấy).
   */
  async submit(
    user: AuthenticatedUser,
    testId: number,
    dto: SubmitFullTestDto,
  ): Promise<FullTestResultDto> {
    const test = await this.repo.findFullTest(testId);
    if (!test) throw this.notFound(testId);
    await this.assertAccess(test.courseId, user);

    const all = await this.repo.findQuestions(testId);
    const parts = new Set(dto.selected_parts);
    const inSession = all.filter((q) => parts.has(q.partNumber));
    const byId = new Map(inSession.map((q) => [q.id, q]));

    const selected = new Map<number, number | null>();
    for (const a of dto.answers) {
      const q = byId.get(a.question_id);
      const answerId = a.selected_answer_id ?? null;
      if (
        !q ||
        selected.has(a.question_id) ||
        (answerId !== null && !q.answers.some((x) => x.id === answerId))
      ) {
        throw this.invalidAnswer(a.question_id);
      }
      selected.set(a.question_id, answerId);
    }
    this.assertAnswersMap(dto.answers_map);

    const grade = gradeFullTest(inSession, selected, dto.selected_parts.length);
    const result = await this.repo.createResult({
      userId: user.id,
      testId,
      grade,
      timeSpentSeconds: dto.time_spent_seconds,
      pauseCount: dto.pause_count,
      testMode: dto.test_mode,
      answersDetail: {
        answers: dto.answers_map,
        _meta: {
          selected_parts: dto.selected_parts,
          test_mode: dto.test_mode,
          total_in_test: all.length,
          time_allocated_minutes: dto.time_allocated_minutes,
        },
      },
    });
    return this.mapper.toResultDto(result);
  }

  /** Thay `FullTestResult.tsx:55` (theo id). Của người khác (không phải admin) → 404. */
  async getResult(
    user: AuthenticatedUser,
    resultId: number,
  ): Promise<FullTestResultDto> {
    const result = await this.repo.findResult(resultId);
    if (!result || !(await this.canSee(user, result.userId))) {
      throw new NotFoundException({
        code: 'RESULT_NOT_FOUND',
        message: `Không tìm thấy kết quả ${resultId}`,
      });
    }
    return this.mapper.toResultDto(result);
  }

  /** Thay `FullTestResult.tsx:62-69`. */
  async getLatestResult(
    userId: string,
    testId: number,
  ): Promise<LatestFullTestResultResponseDto> {
    const result = await this.repo.findLatestResult(userId, testId);
    return { result: result ? this.mapper.toResultDto(result) : null };
  }

  /** Thay `FullTestResult.tsx:81`. Không phải của mình (và không phải admin) → []. */
  async getAnswerDetails(
    user: AuthenticatedUser,
    resultId: number,
  ): Promise<FullTestAnswerDetailDto[]> {
    const result = await this.repo.findResult(resultId);
    if (!result || !(await this.canSee(user, result.userId))) return [];
    const details = await this.repo.findAnswerDetails(resultId);
    return details.map((d) => this.mapper.toAnswerDetailDto(d));
  }

  private async assertAccess(
    courseId: number | null,
    user: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!(await this.learning.canAccessCourse(courseId, user))) {
      throw new ForbiddenException({
        code: 'FULLTEST_LOCKED',
        message: 'Bạn chưa có quyền làm đề thi này',
      });
    }
  }

  /** `answers_map` chỉ để hiển thị lại, nhưng vẫn giới hạn kích thước và kiểu. */
  private assertAnswersMap(map: Record<string, number>): void {
    const entries = Object.entries(map);
    const ok =
      entries.length <= MAX_ANSWERS_MAP_KEYS &&
      entries.every(([k, v]) => /^\d+$/.test(k) && Number.isInteger(v));
    if (!ok) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'answers_map không hợp lệ',
      });
    }
  }

  private async canSee(
    user: AuthenticatedUser,
    ownerId: string,
  ): Promise<boolean> {
    return ownerId === user.id || this.auth.hasRole(user.id, 'admin');
  }

  private invalidAnswer(questionId: number): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_ANSWER',
      message: `Câu trả lời không hợp lệ (câu ${questionId})`,
    });
  }

  private notFound(testId: number): NotFoundException {
    return new NotFoundException({
      code: 'FULLTEST_NOT_FOUND',
      message: `Không tìm thấy đề thi ${testId}`,
    });
  }
}
