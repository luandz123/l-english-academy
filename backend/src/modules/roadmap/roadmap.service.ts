import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import type {
  CreateRoadmapDto,
  MyRoadmapDto,
  PlacementDto,
  PlacementResultDto,
  RoadmapDto,
} from './dto/roadmap.dto';
import { RoadmapMapper } from './roadmap.mapper';
import {
  buildPlan,
  daysBetween,
  estimateScoreFromPlacement,
  NO_SCORE_BASELINE,
  startOfDayUtc,
} from './roadmap-planner';
import { RoadmapRepository } from './roadmap.repository';

const MIN_EXAM_DAYS = 14;
const MAX_EXAM_DAYS = 730;

const badRequest = (code: string, message: string) =>
  new BadRequestException({ code, message });

/**
 * Lộ trình học cá nhân. Server chốt điểm xuất phát (kể cả từ bài test nhanh),
 * tính giờ, chặng và tài nguyên; client chỉ gửi lựa chọn trong wizard.
 */
@Injectable()
export class RoadmapService {
  constructor(
    private readonly repo: RoadmapRepository,
    private readonly mapper: RoadmapMapper,
    private readonly learning: LearningService,
  ) {}

  /** Đồng hồ tách riêng để test e2e/unit cố định được "hôm nay". */
  now(): Date {
    return new Date();
  }

  async getMine(userId: string): Promise<MyRoadmapDto> {
    const row = await this.repo.findByUser(userId);
    if (!row) return { roadmap: null };
    return { roadmap: await this.toDto(row) };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateRoadmapDto,
  ): Promise<RoadmapDto> {
    const today = startOfDayUtc(this.now());

    // 1. Điểm xuất phát
    let currentScore: number;
    let placementResultId: number | null = null;
    if (dto.current_mode === 'score') {
      currentScore = dto.current_score as number;
    } else if (dto.current_mode === 'none') {
      currentScore = NO_SCORE_BASELINE;
    } else {
      const placement = await this.getPlacement(user);
      if (!placement.latest_result) {
        throw badRequest(
          'PLACEMENT_RESULT_NOT_FOUND',
          'Bạn chưa làm bài test nhanh',
        );
      }
      currentScore = placement.latest_result.estimated_score;
      placementResultId = placement.latest_result.id;
    }

    // 2. Mục tiêu
    if (dto.target_score % 5 !== 0) {
      throw badRequest('INVALID_TARGET', 'Điểm mục tiêu phải là bội số của 5');
    }
    if (dto.target_score <= currentScore) {
      throw badRequest(
        'TARGET_NOT_ABOVE_CURRENT',
        'Điểm mục tiêu phải cao hơn điểm hiện tại',
      );
    }

    // 3. Quỹ thời gian: đúng một trong ngày thi hoặc số tuần
    const hasDate = dto.exam_date !== undefined;
    const hasWeeks = dto.duration_weeks !== undefined;
    if (hasDate === hasWeeks) {
      throw badRequest(
        'INVALID_TIMEFRAME',
        'Chọn ngày thi hoặc tổng thời gian học (một trong hai)',
      );
    }
    let examDate: Date | null = null;
    let durationWeeks: number;
    if (hasDate) {
      examDate = startOfDayUtc(new Date(`${dto.exam_date}T00:00:00Z`));
      const days = daysBetween(today, examDate);
      if (Number.isNaN(days) || days < MIN_EXAM_DAYS || days > MAX_EXAM_DAYS) {
        throw badRequest(
          'INVALID_EXAM_DATE',
          'Ngày thi phải cách hôm nay từ 2 tuần đến 2 năm',
        );
      }
      durationWeeks = Math.floor(days / 7);
    } else {
      durationWeeks = dto.duration_weeks as number;
    }

    const row = await this.repo.upsert(user.id, {
      currentMode: dto.current_mode,
      currentScore,
      placementResultId,
      targetScore: dto.target_score,
      purpose: dto.purpose,
      examDate,
      durationWeeks,
      minutesPerDay: dto.minutes_per_day,
      daysPerWeek: dto.days_per_week,
      startedAt: today,
    });
    return this.toDto(row);
  }

  async remove(userId: string): Promise<void> {
    await this.repo.deleteByUser(userId);
  }

  /** Bài test nhanh do admin chọn + kết quả gần nhất của học viên (điểm ước lượng tính ở server). */
  async getPlacement(user: AuthenticatedUser): Promise<PlacementDto> {
    const quizId = await this.repo.findPlacementQuizId();
    if (!quizId) return { quiz: null, latest_result: null };
    const quiz = await this.repo.findQuizWithCourse(quizId);
    const courseId =
      quiz?.module?.courseId ?? quiz?.lessons[0]?.module?.courseId ?? null;
    if (!quiz || courseId === null) return { quiz: null, latest_result: null };
    if (!(await this.learning.canTakeQuiz(quizId, user))) {
      return { quiz: null, latest_result: null };
    }

    const result = await this.repo.findLatestQuizResult(user.id, quizId);
    let latest: PlacementResultDto | null = null;
    if (result) {
      const total = result.totalQuestions ?? 0;
      const correct = result.correctAnswers ?? 0;
      latest = {
        id: result.id,
        correct_answers: correct,
        total_questions: total,
        estimated_score: estimateScoreFromPlacement(correct, total),
        completed_at: result.completedAt?.toISOString() ?? null,
      };
    }
    return {
      quiz: {
        id: quiz.id,
        course_id: courseId,
        title: quiz.title,
        total_questions: quiz.totalQuestions || quiz._count.questions,
        time_limit_seconds: quiz.timeLimitSeconds ?? null,
      },
      latest_result: latest,
    };
  }

  private async toDto(
    row: Awaited<ReturnType<RoadmapRepository['upsert']>>,
  ): Promise<RoadmapDto> {
    const catalog = await this.repo.loadCatalog();
    const plan = buildPlan(
      {
        currentScore: row.currentScore,
        targetScore: row.targetScore,
        purpose: row.purpose as RoadmapDto['purpose'],
        durationWeeks: row.durationWeeks,
        minutesPerDay: row.minutesPerDay,
        daysPerWeek: row.daysPerWeek,
        startedAt: row.startedAt,
      },
      catalog,
      startOfDayUtc(this.now()),
    );
    return this.mapper.toDto(row, plan);
  }
}
