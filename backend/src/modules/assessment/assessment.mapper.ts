import { Injectable } from '@nestjs/common';
import type {
  Quiz,
  UserAnswer,
  UserQuizResult,
} from '../../generated/prisma/client';
import {
  QuestionDto,
  QuizDto,
  QuizResultDto,
  ReviewQuestionDto,
  UserAnswerDto,
} from './dto';
import type { QuestionWithAnswers } from './assessment.repository';

@Injectable()
export class AssessmentMapper {
  toQuizDto(quiz: Quiz): QuizDto {
    return {
      id: quiz.id,
      module_id: quiz.moduleId,
      title: quiz.title,
      total_questions: quiz.totalQuestions,
      time_limit_seconds: quiz.timeLimitSeconds,
      display_order: quiz.displayOrder,
      audio_url: quiz.audioUrl,
      is_free: quiz.isFree,
    };
  }

  /** Liệt kê từng trường (không spread) để cột đáp án không lọt ra khi schema thêm cột. */
  toQuestionDto(q: QuestionWithAnswers): QuestionDto {
    return {
      id: q.id,
      quiz_id: q.quizId,
      question_text: q.questionText,
      question_type: q.questionType,
      image_url: q.imageUrl,
      audio_url: q.audioUrl,
      display_order: q.displayOrder,
      knowledge_tag: q.knowledgeTag,
      passage_text: q.passageText,
      group_id: q.groupId,
      answers: q.answers.map((a) => ({
        id: a.id,
        question_id: a.questionId,
        answer_text: a.answerText,
        display_order: a.displayOrder,
      })),
    };
  }

  toReviewQuestionDto(q: QuestionWithAnswers): ReviewQuestionDto {
    return {
      id: q.id,
      quiz_id: q.quizId,
      question_text: q.questionText,
      question_type: q.questionType,
      image_url: q.imageUrl,
      audio_url: q.audioUrl,
      display_order: q.displayOrder,
      translation: q.translation,
      dictation_keywords: q.dictationKeywords,
      explanation: q.explanation,
      transcript: q.transcript,
      knowledge_tag: q.knowledgeTag,
      passage_text: q.passageText,
      group_id: q.groupId,
      answers: q.answers.map((a) => ({
        id: a.id,
        question_id: a.questionId,
        answer_text: a.answerText,
        display_order: a.displayOrder,
        is_correct: a.isCorrect,
        explanation: a.explanation,
      })),
    };
  }

  toQuizResultDto(r: UserQuizResult): QuizResultDto {
    return {
      id: r.id,
      user_id: r.userId,
      quiz_id: r.quizId,
      score: r.score === null ? null : Number(r.score),
      correct_answers: r.correctAnswers,
      total_questions: r.totalQuestions,
      time_spent_seconds: r.timeSpentSeconds,
      completed_at: r.completedAt ? r.completedAt.toISOString() : null,
    };
  }

  toUserAnswerDto(a: UserAnswer): UserAnswerDto {
    return {
      id: a.id,
      result_id: a.resultId,
      question_id: a.questionId,
      selected_answer_id: a.selectedAnswerId,
      is_correct: a.isCorrect,
    };
  }
}
