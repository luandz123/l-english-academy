import { BadRequestException, Injectable } from '@nestjs/common';
import type { UserRoadmap } from '../../generated/prisma/client';
import {
  accuracy,
  categoryLabel,
  vnDateKey,
  vnWeekStart,
} from '../analytics/analytics-rules';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import type {
  CreateRoadmapDto,
  MyRoadmapDto,
  PlacementDto,
  PlacementResultDto,
  RoadmapDto,
  RoadmapPersonalDto,
} from './dto/roadmap.dto';
import { RoadmapMapper } from './roadmap.mapper';
import {
  adjustFocus,
  buildWeekTasks,
  inPhaseScope,
  requiredAccuracy,
  type WeekTask,
} from './roadmap-personal';
import {
  buildPlan,
  daysBetween,
  estimateScoreFromPlacement,
  NO_SCORE_BASELINE,
  phaseParts,
  SCORE_MAX,
  SCORE_MIN,
  startOfDayUtc,
  type Plan,
} from './roadmap-planner';
import { RoadmapRepository } from './roadmap.repository';

const MIN_EXAM_DAYS = 14;
const MAX_EXAM_DAYS = 730;
const DAY = 86_400_000;
const DIAGNOSTIC_MINUTES = 40;

const badRequest = (code: string, message: string) =>
  new BadRequestException({ code, message });

const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Lộ trình học cá nhân. Server chốt điểm xuất phát (tự khai / mất gốc / bài kiểm tra trình độ),
 * tính giờ, chặng và tài nguyên; P03 thêm trọng tâm theo điểm yếu, tỉ trọng điều chỉnh và
 * "Việc tuần này" — tiến độ việc chỉ tính từ bài đã nộp.
 */
@Injectable()
export class RoadmapService {
  constructor(
    private readonly repo: RoadmapRepository,
    private readonly mapper: RoadmapMapper,
    private readonly learning: LearningService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Đồng hồ tách riêng để test e2e/unit cố định được "hôm nay". */
  now(): Date {
    return new Date();
  }

  async getMine(user: AuthenticatedUser): Promise<MyRoadmapDto> {
    const row = await this.repo.findByUser(user.id);
    if (!row) return { roadmap: null };
    return { roadmap: await this.toDto(row, user) };
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
          'Bạn chưa làm bài kiểm tra trình độ',
        );
      }
      currentScore = placement.latest_result.estimated_score;
      placementResultId =
        placement.latest_result.source === 'diagnostic'
          ? null
          : placement.latest_result.id;
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
    return this.toDto(row, user);
  }

  async remove(userId: string): Promise<void> {
    await this.repo.deleteByUser(userId);
  }

  /**
   * Điểm xuất phát "kiểm tra trình độ": bài chẩn đoán (P01) nếu đã có bộ câu; nếu chưa thì giữ
   * bài test nhanh cũ do admin chọn. Điểm luôn do server tính.
   */
  async getPlacement(user: AuthenticatedUser): Promise<PlacementDto> {
    const diagnosticSize = await this.repo.diagnosticSize();
    if (diagnosticSize > 0) {
      const diag = await this.analytics.latestDiagnostic(user.id);
      const correct = diag
        ? (diag.range.listening?.correct ?? 0) +
          (diag.range.reading?.correct ?? 0)
        : 0;
      const total = diag
        ? (diag.range.listening?.total ?? 0) + (diag.range.reading?.total ?? 0)
        : 0;
      const latest: PlacementResultDto | null =
        diag && diag.range.total
          ? {
              id: 0,
              source: 'diagnostic',
              session_id: diag.id,
              correct_answers: correct,
              total_questions: total,
              estimated_score: Math.min(
                SCORE_MAX - 5,
                Math.max(SCORE_MIN, round5(diag.range.total.mid)),
              ),
              range: { min: diag.range.total.min, max: diag.range.total.max },
              completed_at: diag.at.toISOString(),
            }
          : null;
      return {
        quiz: null,
        diagnostic: {
          total_questions: diagnosticSize,
          minutes: DIAGNOSTIC_MINUTES,
        },
        latest_result: latest,
      };
    }

    const quizId = await this.repo.findPlacementQuizId();
    if (!quizId) return { quiz: null, diagnostic: null, latest_result: null };
    const quiz = await this.repo.findQuizWithCourse(quizId);
    const courseId =
      quiz?.module?.courseId ?? quiz?.lessons[0]?.module?.courseId ?? null;
    if (!quiz || courseId === null)
      return { quiz: null, diagnostic: null, latest_result: null };
    if (!(await this.learning.canTakeQuiz(quizId, user))) {
      return { quiz: null, diagnostic: null, latest_result: null };
    }

    const result = await this.repo.findLatestQuizResult(user.id, quizId);
    let latest: PlacementResultDto | null = null;
    if (result) {
      const total = result.totalQuestions ?? 0;
      const correct = result.correctAnswers ?? 0;
      latest = {
        id: result.id,
        source: 'quiz',
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
      diagnostic: null,
      latest_result: latest,
    };
  }

  /**
   * Điểm ước lượng mới đã vượt chặng hiện tại → học viên đồng ý chuyển chặng: điểm xuất phát mới =
   * điểm ước lượng, bắt đầu lại từ hôm nay, giữ mục tiêu và ngày thi (hoặc số tuần còn lại).
   */
  async advance(user: AuthenticatedUser): Promise<RoadmapDto> {
    const row = await this.repo.findByUser(user.id);
    if (!row) throw badRequest('NO_ROADMAP', 'Bạn chưa có lộ trình');
    const today = startOfDayUtc(this.now());
    const plan = this.plan(row, await this.repo.loadCatalog());
    const phase = plan.phases[plan.currentPhaseIndex];
    const estimate = await this.analytics.latestEstimate(user.id);
    if (
      !phase ||
      !estimate ||
      estimate.total <= phase.toScore ||
      phase.key === 'test_practice'
    ) {
      throw badRequest('NOT_EXCEEDED', 'Điểm hiện tại chưa vượt chặng này');
    }
    const score = Math.min(SCORE_MAX - 5, round5(estimate.total));
    if (score >= row.targetScore) {
      throw badRequest(
        'TARGET_REACHED',
        'Bạn đã đạt mục tiêu — hãy tạo lộ trình với mục tiêu mới',
      );
    }
    const durationWeeks = row.examDate
      ? Math.max(1, Math.floor(daysBetween(today, row.examDate) / 7))
      : Math.max(1, row.durationWeeks - plan.currentWeek + 1);
    const updated = await this.repo.advance(user.id, {
      currentScore: score,
      startedAt: today,
      durationWeeks,
    });
    return this.toDto(updated, user);
  }

  private plan(
    row: UserRoadmap,
    catalog: Awaited<ReturnType<RoadmapRepository['loadCatalog']>>,
  ): Plan {
    return buildPlan(
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
  }

  private async toDto(
    row: UserRoadmap,
    user: AuthenticatedUser,
  ): Promise<RoadmapDto> {
    const plan = this.plan(row, await this.repo.loadCatalog());
    const dto = this.mapper.toDto(row, plan);
    dto.personal = await this.personal(row, plan, user);
    return dto;
  }

  // =================== P03 ===================

  private async personal(
    row: UserRoadmap,
    plan: Plan,
    user: AuthenticatedUser,
  ): Promise<RoadmapPersonalDto | null> {
    const phase = plan.phases[plan.currentPhaseIndex];
    if (!phase) return null;
    const snap = await this.analytics.focusSnapshot(user);
    const required = requiredAccuracy(phase.key);

    const items = snap.top.map((t) => {
      const acc = accuracy(t.stat) ?? 0;
      const key = `${t.part}:${t.category}`;
      const unseen = snap.lookup.unseen.get(key) ?? {
        accessible: 0,
        locked: 0,
      };
      const mistakes = snap.lookup.mistakes.get(key) ?? 0;
      return {
        key,
        part: t.part,
        category: t.category,
        label: categoryLabel(t.part, t.category),
        accuracy: acc,
        answered: t.stat.answered,
        required,
        achieved: acc >= required,
        in_scope: inPhaseScope(phase.key, t.part, t.category),
        practice: {
          action:
            unseen.accessible > 0
              ? 'practice'
              : mistakes > 0
                ? 'review'
                : unseen.locked > 0
                  ? 'locked'
                  : 'none',
          available: unseen.accessible,
          mistakes,
        },
      };
    });
    const focus = items.filter((i) => i.in_scope);
    const deferred = items
      .filter((i) => !i.in_scope)
      .map((i) => `Part ${i.part} – ${i.label}`);
    const active = focus.filter((i) => !i.achieved);
    const adjusted = adjustFocus(phase.focus, active);

    // Việc tuần này: chốt lần đầu trong tuần (thứ Hai giờ VN); trọng tâm đổi giữa tuần áp dụng từ tuần sau
    const now = this.now();
    const weekStartInstant = vnWeekStart(now);
    const weekKey = new Date(`${vnDateKey(weekStartInstant)}T00:00:00Z`);
    const modules = new Map<
      number,
      { id: number; title: string; url: string }
    >();
    for (const r of phase.resources) {
      const m = r.type === 'module' ? /part\s*(\d)/i.exec(r.title) : null;
      if (m && !modules.has(Number(m[1])))
        modules.set(Number(m[1]), { id: r.id, title: r.title, url: r.url });
    }
    const currentKeys = active.map((i) => i.key);
    let weekPlan = await this.repo.findWeekPlan(user.id, weekKey);
    if (!weekPlan) {
      const tasks = buildWeekTasks({
        phaseKey: phase.key,
        phaseParts: phaseParts(phase.key),
        weeklyMinutes: row.minutesPerDay * row.daysPerWeek,
        focus: active.map((i) => ({
          part: i.part,
          category: i.category,
          label: i.label,
        })),
        openMistakes: await this.repo.openMistakeCount(user.id),
        modules,
      });
      weekPlan = await this.repo.createWeekPlan(
        user.id,
        weekKey,
        currentKeys,
        tasks,
      );
    }
    const tasks = (weekPlan?.tasks ?? []) as unknown as WeekTask[];
    const progressed = await this.progress(user.id, tasks, weekStartInstant);

    const notices: {
      type: string;
      message: string;
      action?: { label: string; kind: string; url?: string };
    }[] = [];
    const planned = ((weekPlan?.focus ?? []) as unknown[]).filter(
      (k): k is string => typeof k === 'string',
    );
    const removed = planned.filter((k) => !currentKeys.includes(k));
    const added = currentKeys.filter((k) => !planned.includes(k));
    if (removed.length > 0 || added.length > 0) {
      const name = (k: string) => {
        const p = Number(k.split(':')[0]);
        return `Part ${p} – ${categoryLabel(p, k.split(':').slice(1).join(':'))}`;
      };
      const parts: string[] = [];
      for (const k of removed) {
        const i = items.find((x) => x.key === k);
        parts.push(
          i ? `${name(k)} đã đạt ${i.accuracy}%` : `${name(k)} đã cải thiện`,
        );
      }
      if (added.length) parts.push(`thêm ${added.map(name).join(', ')}`);
      notices.push({
        type: 'focus_changed',
        message: `Trọng tâm đã cập nhật: ${parts.join(', ')}. Việc mới áp dụng từ tuần sau.`,
      });
    }
    const prevPlan = await this.repo.findWeekPlan(
      user.id,
      new Date(weekKey.getTime() - 7 * DAY),
    );
    if (prevPlan) {
      const prevTasks = prevPlan.tasks as unknown as WeekTask[];
      const prevDone = (
        await this.progress(
          user.id,
          prevTasks,
          new Date(weekStartInstant.getTime() - 7 * DAY),
        )
      ).filter((t) => t.done >= t.target).length;
      if (prevTasks.length > 0 && prevDone < prevTasks.length) {
        notices.push({
          type: 'last_week',
          message: `Tuần trước hoàn thành ${prevDone}/${prevTasks.length} việc.${
            plan.status !== 'on_track'
              ? ` Với thời gian còn lại, điểm có thể đạt khoảng ${plan.achievableScore}.`
              : ''
          }`,
        });
      }
    }
    const estimate = await this.analytics.latestEstimate(user.id);
    const next = plan.phases[plan.currentPhaseIndex + 1];
    if (
      estimate &&
      phase.key !== 'test_practice' &&
      estimate.total > phase.toScore &&
      new Date(estimate.date) > row.startedAt
    ) {
      notices.push({
        type: 'score_exceeded',
        message: `Điểm mới của bạn (${estimate.total}) đã vượt chặng này.${next ? ` Chuyển sang chặng ${next.title}?` : ''}`,
        action: {
          label: next ? `Chuyển sang chặng ${next.title}` : 'Cập nhật lộ trình',
          kind: 'advance',
        },
      });
    }
    if (focus.length > 0 && active.length === 0) {
      notices.push({
        type: 'phase_done',
        message: 'Bạn đã đạt yêu cầu chặng này.',
        action:
          phase.key === 'test_practice'
            ? {
                label: 'Làm Full Test kiểm tra',
                kind: 'link',
                url: '/fulltests',
              }
            : {
                label: 'Làm Mini Test kiểm tra',
                kind: 'link',
                url: '/practice?tab=mini',
              },
      });
    }

    return {
      focus_source: snap.source,
      focus: focus.map((i) => ({
        part: i.part,
        category: i.category,
        label: i.label,
        accuracy: i.accuracy,
        answered: i.answered,
        required: i.required,
        achieved: i.achieved,
        practice: i.practice,
      })),
      deferred,
      adjusted_focus: adjusted.focus,
      adjustment_note: adjusted.note,
      week: {
        week_start: vnDateKey(weekStartInstant),
        tasks: progressed,
        completed: progressed.filter((t) => t.done >= t.target).length,
        total: progressed.length,
      },
      notices,
    };
  }

  /** Tiến độ từng việc trong tuần bắt đầu `from` (giờ VN), chỉ từ bài đã nộp / bài học hoàn thành. */
  private async progress(userId: string, tasks: WeekTask[], from: Date) {
    const to = new Date(from.getTime() + 7 * DAY);
    const activity = await this.analytics.activityBetween(userId, from, to);
    const lessons = await this.repo.lessonsCompleted(
      userId,
      tasks
        .filter((t) => t.type === 'lesson' && t.module_id)
        .map((t) => t.module_id!),
      from,
      to,
    );
    return tasks.map((t) => {
      let done = 0;
      if (t.type === 'practice') {
        done = t.category
          ? (activity.byCategory.get(`${t.part}:${t.category}`) ?? 0)
          : (activity.byPart.get(t.part ?? 0) ?? 0);
      } else if (t.type === 'mistakes') done = activity.mistakesReviewed;
      else if (t.type === 'mini_test') done = activity.miniTests;
      else if (t.type === 'full_test') done = activity.fullTestsComplete;
      else if (t.type === 'lesson') done = lessons.get(t.module_id ?? 0) ?? 0;
      return { ...t, done: Math.min(done, t.target) };
    });
  }
}
