import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentMapper } from './assessment.mapper';
import { AssessmentAdminRepository } from './assessment-admin.repository';
import {
  BulkDeleteQuestionsDto,
  PatchQuizDto,
  QuizDto,
  ReorderQuestionsDto,
  ReviewQuestionDto,
  SaveModuleQuizDto,
  SaveQuestionDto,
  SetQuestionImagesDto,
} from './dto';

@Injectable()
export class AssessmentAdminService {
  constructor(
    private readonly repo: AssessmentAdminRepository,
    private readonly mapper: AssessmentMapper,
  ) {}

  async listQuizQuestions(quizId: number): Promise<ReviewQuestionDto[]> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    return questions.map((q) => this.mapper.toReviewQuestionDto(q));
  }

  async createQuizQuestion(
    quizId: number,
    dto: SaveQuestionDto,
  ): Promise<ReviewQuestionDto> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }

    return this.repo.inTransaction(async (tx) => {
      const displayOrder = await tx.getMaxQuestionDisplayOrder(quizId);
      const question = await tx.createQuestion({
        quizId,
        questionText: dto.question_text ?? null,
        translation: dto.translation ?? null,
        dictationKeywords: dto.dictation_keywords ?? null,
        imageUrl: dto.image_url ?? null,
        audioUrl: dto.audio_url ?? null,
        questionType: dto.question_type ?? 'multiple_choice',
        displayOrder,
      });

      const validAnswers = (dto.answers ?? []).filter(
        (a) => a.answer_text && a.answer_text.trim().length > 0,
      );

      if (validAnswers.length > 0) {
        await tx.createAnswers(
          validAnswers.map((a, index) => ({
            questionId: question.id,
            answerText: a.answer_text.trim(),
            isCorrect: a.is_correct ?? false,
            explanation: a.explanation ?? null,
            displayOrder: index,
          })),
        );
      }

      const totalQuestions = await tx.countQuestionsInQuiz(quizId);
      await tx.updateQuizTotalQuestions(quizId, totalQuestions);

      const created = await tx.findQuestionById(question.id);
      return this.mapper.toReviewQuestionDto(created!);
    });
  }

  async updateQuizQuestion(
    id: number,
    dto: SaveQuestionDto,
  ): Promise<ReviewQuestionDto> {
    return this.repo.inTransaction(async (tx) => {
      const question = await tx.findQuestionById(id);
      if (!question) {
        throw new NotFoundException({
          code: 'QUESTION_NOT_FOUND',
          message: `Câu hỏi #${id} không tồn tại`,
        });
      }

      await tx.updateQuestion(id, {
        questionText: dto.question_text ?? null,
        translation: dto.translation ?? null,
        dictationKeywords: dto.dictation_keywords ?? null,
        imageUrl: dto.image_url ?? null,
        audioUrl: dto.audio_url ?? null,
        questionType: dto.question_type ?? 'multiple_choice',
      });

      await tx.deleteAnswersByQuestionId(id);

      const validAnswers = (dto.answers ?? []).filter(
        (a) => a.answer_text && a.answer_text.trim().length > 0,
      );

      if (validAnswers.length > 0) {
        await tx.createAnswers(
          validAnswers.map((a, index) => ({
            questionId: id,
            answerText: a.answer_text.trim(),
            isCorrect: a.is_correct ?? false,
            explanation: a.explanation ?? null,
            displayOrder: index,
          })),
        );
      }

      if (question.quizId) {
        const totalQuestions = await tx.countQuestionsInQuiz(question.quizId);
        await tx.updateQuizTotalQuestions(question.quizId, totalQuestions);
      }

      const updated = await tx.findQuestionById(id);
      return this.mapper.toReviewQuestionDto(updated!);
    });
  }

  async deleteQuizQuestion(id: number): Promise<void> {
    await this.repo.inTransaction(async (tx) => {
      const question = await tx.findQuestionById(id);
      if (!question) return;

      await tx.deleteQuestion(id);

      if (question.quizId) {
        const totalQuestions = await tx.countQuestionsInQuiz(question.quizId);
        await tx.updateQuizTotalQuestions(question.quizId, totalQuestions);
      }
    });
  }

  async bulkDeleteQuizQuestions(
    quizId: number,
    dto: BulkDeleteQuestionsDto,
  ): Promise<void> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }

    if (new Set(dto.question_ids).size !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Danh sách ID câu hỏi có phần tử trùng lặp',
      });
    }

    const foundIds = await this.repo.findQuestionIdsInQuiz(
      quizId,
      dto.question_ids,
    );
    if (foundIds.length !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Có câu hỏi không thuộc quiz hoặc không tồn tại',
      });
    }

    await this.repo.inTransaction(async (tx) => {
      await tx.deleteQuestions(dto.question_ids);
      const totalQuestions = await tx.countQuestionsInQuiz(quizId);
      await tx.updateQuizTotalQuestions(quizId, totalQuestions);
    });
  }

  async reorderQuizQuestions(
    quizId: number,
    dto: ReorderQuestionsDto,
  ): Promise<void> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }

    if (new Set(dto.question_ids).size !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Danh sách ID câu hỏi có phần tử trùng lặp',
      });
    }

    const foundIds = await this.repo.findQuestionIdsInQuiz(
      quizId,
      dto.question_ids,
    );
    if (foundIds.length !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Có câu hỏi không thuộc quiz hoặc không tồn tại',
      });
    }

    await this.repo.inTransaction(async (tx) => {
      for (let i = 0; i < dto.question_ids.length; i++) {
        await tx.updateQuestionDisplayOrder(dto.question_ids[i], i);
      }
    });
  }

  async setQuizQuestionImages(
    quizId: number,
    dto: SetQuestionImagesDto,
  ): Promise<void> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }

    const ids = dto.items.map((i) => i.question_id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Danh sách ID câu hỏi có phần tử trùng lặp',
      });
    }

    if (ids.length > 0) {
      const foundIds = await this.repo.findQuestionIdsInQuiz(quizId, ids);
      if (foundIds.length !== ids.length) {
        throw new BadRequestException({
          code: 'QUESTION_IDS_INVALID',
          message: 'Có câu hỏi không thuộc quiz hoặc không tồn tại',
        });
      }
    }

    await this.repo.inTransaction(async (tx) => {
      for (const item of dto.items) {
        await tx.updateQuestionImageUrl(item.question_id, item.image_url);
      }
    });
  }

  async patchQuiz(quizId: number, dto: PatchQuizDto): Promise<QuizDto> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${quizId} không tồn tại`,
      });
    }

    const updated = await this.repo.updateQuizAudioUrl(
      quizId,
      dto.audio_url ?? null,
    );
    return this.mapper.toQuizDto(updated);
  }

  async createModuleQuiz(
    moduleId: number,
    dto: SaveModuleQuizDto,
  ): Promise<QuizDto> {
    const mod = await this.repo.findModuleById(moduleId);
    if (!mod) {
      throw new NotFoundException({
        code: 'MODULE_NOT_FOUND',
        message: `Chương #${moduleId} không tồn tại`,
      });
    }

    const displayOrder = await this.repo.countQuizzesInModule(moduleId);
    const quiz = await this.repo.createQuiz({
      moduleId,
      title: dto.title,
      totalQuestions: dto.total_questions,
      timeLimitSeconds: dto.time_limit_seconds ?? 0,
      displayOrder,
    });
    return this.mapper.toQuizDto(quiz);
  }

  async updateModuleQuiz(id: number, dto: SaveModuleQuizDto): Promise<QuizDto> {
    const quiz = await this.repo.findQuizById(id);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Quiz #${id} không tồn tại`,
      });
    }

    const updated = await this.repo.updateQuiz(id, {
      title: dto.title,
      totalQuestions: dto.total_questions,
      timeLimitSeconds: dto.time_limit_seconds ?? 0,
    });
    return this.mapper.toQuizDto(updated);
  }

  async deleteModuleQuiz(id: number): Promise<void> {
    const quiz = await this.repo.findQuizById(id);
    if (!quiz) return;

    await this.repo.deleteQuiz(id);
  }

  async createLessonQuiz(lessonId: number): Promise<QuizDto> {
    return this.repo.inTransaction(async (tx) => {
      const lesson = await tx.findLessonById(lessonId);
      if (!lesson) {
        throw new NotFoundException({
          code: 'LESSON_NOT_FOUND',
          message: `Bài học #${lessonId} không tồn tại`,
        });
      }

      if (lesson.quizId) {
        throw new ConflictException({
          code: 'LESSON_ALREADY_HAS_QUIZ',
          message: `Bài học #${lessonId} đã có quiz`,
        });
      }

      if (lesson.moduleId === null) {
        throw new BadRequestException({
          code: 'LESSON_HAS_NO_MODULE',
          message: `Bài học #${lessonId} chưa thuộc chương nào`,
        });
      }

      const displayOrder = await tx.countQuizzesInModule(lesson.moduleId);
      const quiz = await tx.createQuiz({
        title: `Quiz - ${lesson.title}`,
        totalQuestions: 0,
        moduleId: lesson.moduleId,
        displayOrder,
      });

      // TODO(Learning): chuyển qua LearningService khi có API nhận transaction
      await tx.updateLessonQuizId(lessonId, quiz.id);

      return this.mapper.toQuizDto(quiz);
    });
  }
}
