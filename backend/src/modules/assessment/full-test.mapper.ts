import { Injectable } from '@nestjs/common';
import type {
  FullTest,
  FullTestAnswerDetail,
  UserFullTestResult,
} from '../../generated/prisma/client';
import {
  FullTestAnswerDetailDto,
  FullTestDto,
  FullTestQuestionDto,
  FullTestResultDto,
} from './dto';
import { AssessmentMapper } from './assessment.mapper';
import type { FullTestQuestion } from './full-test.repository';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

@Injectable()
export class FullTestMapper {
  constructor(private readonly assessment: AssessmentMapper) {}

  toFullTestDto(t: FullTest): FullTestDto {
    return {
      id: t.id,
      course_id: t.courseId,
      category: t.category,
      title: t.title,
      total_questions: t.totalQuestions,
      release_date: iso(t.releaseDate),
      display_order: t.displayOrder,
      created_at: iso(t.createdAt),
      audio_url: t.audioUrl,
      description: t.description,
      total_attempts: t.totalAttempts,
    };
  }

  toQuestionDto(q: FullTestQuestion): FullTestQuestionDto {
    return {
      ...this.assessment.toReviewQuestionDto(q),
      part_number: q.partNumber,
    };
  }

  toResultDto(r: UserFullTestResult): FullTestResultDto {
    return {
      id: r.id,
      user_id: r.userId,
      test_id: r.testId,
      total_score: r.totalScore,
      listening_score: r.listeningScore,
      reading_score: r.readingScore,
      correct_answers: r.correctAnswers,
      time_spent_seconds: r.timeSpentSeconds,
      completed_at: iso(r.completedAt),
      total_questions: r.totalQuestions,
      listening_correct: r.listeningCorrect,
      reading_correct: r.readingCorrect,
      pause_count: r.pauseCount,
      test_mode: r.testMode,
      answers_detail: r.answersDetail,
    };
  }

  toAnswerDetailDto(d: FullTestAnswerDetail): FullTestAnswerDetailDto {
    return {
      id: d.id,
      result_id: d.resultId,
      question_id: d.questionId,
      selected_answer_id: d.selectedAnswerId,
      is_correct: d.isCorrect,
      part_number: d.partNumber,
    };
  }
}
