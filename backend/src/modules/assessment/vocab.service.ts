import { BadRequestException, Injectable } from '@nestjs/common';
import { VocabMapper } from './vocab.mapper';
import { VocabRepository } from './vocab.repository';
import {
  LessonQuizIdResponseDto,
  VocabCategoryDto,
  VocabQuizDto,
  VocabWordDto,
} from './dto/vocab.dto';

@Injectable()
export class VocabService {
  constructor(
    private readonly repo: VocabRepository,
    private readonly mapper: VocabMapper,
  ) {}

  async listCategories(courseId: number): Promise<VocabCategoryDto[]> {
    const categories = await this.repo.findCategoriesByCourseId(courseId);
    return categories.map((c) => this.mapper.toVocabCategoryDto(c));
  }

  async listQuizzes(categoryId: number): Promise<VocabQuizDto[]> {
    const quizzes = await this.repo.findQuizzesByCategoryId(categoryId);
    return quizzes.map((q) => this.mapper.toVocabQuizDto(q));
  }

  async listWords(vocabQuizId: number): Promise<VocabWordDto[]> {
    const words = await this.repo.findWordsByQuizId(vocabQuizId);
    return words.map((w) => this.mapper.toVocabWordDto(w));
  }

  /**
   * Helper mô phỏng quy tắc .maybeSingle() của Supabase / PostgREST:
   * Nếu có đúng 1 dòng -> trả dòng đó.
   * Nếu 0 dòng hoặc >= 2 dòng -> coi như không tìm thấy (PostgREST cũ trả lỗi -> null).
   */
  private maybeSingle<T>(rows: T[]): T | null {
    if (rows.length === 1) {
      return rows[0];
    }
    return null;
  }

  /**
   * Chuỗi dò 4 bước tra cứu từ vựng bài học (T-021 4.2):
   * 1. vocab_quizzes có lesson_id = ref -> dùng quiz đó.
   * 2. Không có -> vocab_quizzes có id = ref.
   * 3. Không có -> lessons có quiz_id = ref -> vocab_quizzes có lesson_id = lesson.id.
   * 4. Vẫn không có quiz -> nếu có question_ids: trả vocab_questions có question_id IN (question_ids); nếu không: [].
   * 5. Có quiz -> vocab_questions có vocab_quiz_id = quiz.id (và question_id IN nếu có).
   */
  async getLessonVocabWords(
    ref: number,
    questionIdsParam?: string,
  ): Promise<VocabWordDto[]> {
    const questionIds = this.parseQuestionIds(questionIdsParam);

    let quiz: { id: number } | null = null;

    // Bước 1: vocab_quizzes có lesson_id = ref
    const quizzesByLessonId = await this.repo.findVocabQuizzesByLessonId(ref);
    quiz = this.maybeSingle(quizzesByLessonId);

    // Bước 2: Không có -> vocab_quizzes có id = ref
    if (!quiz) {
      const quizzesById = await this.repo.findVocabQuizzesById(ref);
      quiz = this.maybeSingle(quizzesById);
    }

    // Bước 3: Không có -> lessons có quiz_id = ref -> vocab_quizzes có lesson_id = lesson.id
    if (!quiz) {
      const lessonsByQuizId = await this.repo.findLessonsByQuizId(ref);
      const lesson = this.maybeSingle(lessonsByQuizId);
      if (lesson) {
        const quizzesByLesson = await this.repo.findVocabQuizzesByLessonId(
          lesson.id,
        );
        quiz = this.maybeSingle(quizzesByLesson);
      }
    }

    // Bước 4: Vẫn không có quiz
    if (!quiz) {
      if (questionIds && questionIds.length > 0) {
        const words =
          await this.repo.findVocabQuestionsByQuestionIds(questionIds);
        return words.map((w) => this.mapper.toVocabWordDto(w));
      }
      return [];
    }

    // Bước 5: Có quiz
    const words = await this.repo.findVocabQuestionsForQuiz(
      quiz.id,
      questionIds,
    );
    return words.map((w) => this.mapper.toVocabWordDto(w));
  }

  async getLessonQuizId(lessonId: number): Promise<LessonQuizIdResponseDto> {
    const lesson = await this.repo.findLessonById(lessonId);
    return this.mapper.toLessonQuizIdResponseDto(lesson);
  }

  private parseQuestionIds(param?: string): number[] | undefined {
    if (!param || !param.trim()) {
      return undefined;
    }
    const rawIds = param
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawIds.length === 0) {
      return undefined;
    }

    if (rawIds.length > 500) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message:
          'Số lượng question_ids vượt quá giới hạn tối đa (tối đa 500 id).',
      });
    }

    const ids: number[] = [];
    for (const raw of rawIds) {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: `ID câu hỏi không hợp lệ: ${raw}`,
        });
      }
      ids.push(parsed);
    }
    return ids;
  }
}
