import { Injectable } from '@nestjs/common';
import type {
  Course,
  FullTest,
  Quiz,
  UserAnswer,
  UserQuizResult,
} from '../../generated/prisma/client';
import {
  AdminFullTestDetailDto,
  FullTestQuestionDto,
  QuestionDto,
  QuizDto,
  QuizResultDto,
  QuizResultWithQuizDto,
  ReviewQuestionDto,
  UserAnswerDto,
} from './dto';
import type {
  QuestionWithAnswers,
  UserQuizResultWithQuiz,
} from './assessment.repository';

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

  toQuizResultWithQuizDto(r: UserQuizResultWithQuiz): QuizResultWithQuizDto {
    return {
      ...this.toQuizResultDto(r),
      quizzes: r.quiz
        ? {
            id: r.quiz.id,
            title: r.quiz.title,
            audio_url: r.quiz.audioUrl,
            total_questions: r.quiz.totalQuestions,
            module_id: r.quiz.moduleId,
            modules: r.quiz.module
              ? {
                  id: r.quiz.module.id,
                  title: r.quiz.module.title,
                  courses: r.quiz.module.course
                    ? {
                        id: r.quiz.module.course.id,
                        title: r.quiz.module.course.title,
                      }
                    : null,
                }
              : null,
          }
        : null,
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

  toAdminFullTestDetailDto(
    t: FullTest & { course?: Pick<Course, 'id' | 'title'> | null },
  ): AdminFullTestDetailDto {
    return {
      id: t.id,
      course_id: t.courseId,
      category: t.category,
      title: t.title,
      total_questions: t.totalQuestions,
      release_date: t.releaseDate ? t.releaseDate.toISOString() : null,
      display_order: t.displayOrder,
      created_at: t.createdAt ? t.createdAt.toISOString() : null,
      audio_url: t.audioUrl,
      description: t.description,
      total_attempts: t.totalAttempts,
      courses: t.course ? { id: t.course.id, title: t.course.title } : null,
    };
  }

  toFullTestQuestionDto(
    q: QuestionWithAnswers,
    partNumber: number,
  ): FullTestQuestionDto {
    return {
      ...this.toReviewQuestionDto(q),
      part_number: partNumber,
    };
  }
}
