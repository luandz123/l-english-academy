import { Injectable } from '@nestjs/common';
import type {
  VocabCategory,
  VocabQuestion,
  VocabQuiz,
} from '../../generated/prisma/client';
import {
  LessonQuizIdResponseDto,
  VocabCategoryDto,
  VocabQuizDto,
  VocabWordDto,
} from './dto/vocab.dto';

@Injectable()
export class VocabMapper {
  toVocabCategoryDto(c: VocabCategory): VocabCategoryDto {
    return {
      id: c.id,
      course_id: c.courseId,
      title: c.title,
      display_order: c.displayOrder,
    };
  }

  toVocabQuizDto(q: VocabQuiz): VocabQuizDto {
    return {
      id: q.id,
      category_id: q.categoryId,
      title: q.title,
      total_questions: q.totalQuestions,
      display_order: q.displayOrder,
      lesson_id: q.lessonId,
    };
  }

  toVocabWordDto(w: VocabQuestion): VocabWordDto {
    return {
      id: w.id,
      vocab_quiz_id: w.vocabQuizId,
      word: w.word,
      phonetic: w.phonetic,
      definition_en: w.definitionEn,
      definition_vi: w.definitionVi,
      example_sentence: w.exampleSentence,
      image_url: w.imageUrl,
      audio_male_url: w.audioMaleUrl,
      audio_female_url: w.audioFemaleUrl,
      wrong_answer_1: w.wrongAnswer1,
      wrong_answer_2: w.wrongAnswer2,
      wrong_answer_3: w.wrongAnswer3,
      display_order: w.displayOrder,
      question_id: w.questionId,
    };
  }

  toLessonQuizIdResponseDto(
    lesson: { quizId: number | null } | null,
  ): LessonQuizIdResponseDto {
    return {
      lesson: lesson ? { quiz_id: lesson.quizId } : null,
    };
  }
}
