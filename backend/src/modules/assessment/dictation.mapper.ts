import { Injectable } from '@nestjs/common';
import type { Quiz, UserAnswer } from '../../generated/prisma/client';
import { DictationQuizDetailDto, DictationUserAnswerDto } from './dto';
import { AssessmentMapper } from './assessment.mapper';
import type { QuestionWithAnswers } from './assessment.repository';

@Injectable()
export class DictationMapper {
  constructor(private readonly assessmentMapper: AssessmentMapper) {}

  toDictationQuizDetailDto(
    quiz: Quiz,
    questions: QuestionWithAnswers[],
  ): DictationQuizDetailDto {
    return {
      quiz: this.assessmentMapper.toQuizDto(quiz),
      questions: questions.map((q) =>
        this.assessmentMapper.toReviewQuestionDto(q),
      ),
    };
  }

  toDictationUserAnswerDto(a: UserAnswer): DictationUserAnswerDto {
    return {
      id: a.id,
      question_id: a.questionId,
      is_correct: a.isCorrect,
      result_id: a.resultId,
    };
  }
}
