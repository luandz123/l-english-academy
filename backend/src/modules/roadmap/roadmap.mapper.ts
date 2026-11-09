import { Injectable } from '@nestjs/common';
import type { UserRoadmap } from '../../generated/prisma/client';
import type { RoadmapDto } from './dto/roadmap.dto';
import type { CurrentMode, Plan, Purpose } from './roadmap-planner';

/** Date → 'YYYY-MM-DD' (cột DATE, theo UTC). */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

@Injectable()
export class RoadmapMapper {
  toDto(row: UserRoadmap, plan: Plan): RoadmapDto {
    return {
      id: row.id,
      current_mode: row.currentMode as CurrentMode,
      current_score: row.currentScore,
      target_score: row.targetScore,
      purpose: row.purpose as Purpose,
      exam_date: row.examDate ? isoDate(row.examDate) : null,
      duration_weeks: row.durationWeeks,
      minutes_per_day: row.minutesPerDay,
      days_per_week: row.daysPerWeek,
      started_at: isoDate(row.startedAt),
      end_date: isoDate(plan.endDate),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
      purpose_note: plan.purposeNote,
      summary: {
        required_hours: plan.requiredHours,
        available_hours: plan.availableHours,
        weekly_hours: plan.weeklyHours,
        status: plan.status,
        recommended_minutes_per_day: plan.recommendedMinutesPerDay,
        achievable_score: plan.achievableScore,
        total_weeks: plan.totalWeeks,
        current_week: plan.currentWeek,
        current_phase_index: plan.currentPhaseIndex,
      },
      phases: plan.phases.map((p) => ({
        key: p.key,
        title: p.title,
        description: p.description,
        from_score: p.fromScore,
        to_score: p.toScore,
        hours: p.hours,
        weeks: p.weeks,
        start_week: p.startWeek,
        end_week: p.endWeek,
        start_date: isoDate(p.startDate),
        end_date: isoDate(p.endDate),
        focus: { ...p.focus },
        grammar_topics: [...p.grammarTopics],
        vocab_topics: [...p.vocabTopics],
        practice: [...p.practice],
        resources: p.resources.map((r) => ({ ...r })),
      })),
    };
  }
}
