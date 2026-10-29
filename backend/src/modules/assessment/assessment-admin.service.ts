import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentMapper } from './assessment.mapper';
import { VocabMapper } from './vocab.mapper';
import { AssessmentAdminRepository } from './assessment-admin.repository';
import {
  AdminFullTestDetailDto,
  BulkDeleteQuestionsDto,
  BulkDeleteVocabWordsDto,
  CreateFullTestQuestionDto,
  CreateLessonVocabQuizDto,
  CreateVocabWordsBatchDto,
  FullTestQuestionDto,
  PatchQuizDto,
  QuizDto,
  ReorderQuestionsDto,
  ReviewQuestionDto,
  SaveModuleQuizDto,
  SaveQuestionDto,
  SaveVocabWordDto,
  SetQuestionImagesDto,
  UpdateFullTestDto,
  UpdateFullTestQuestionDto,
  UpdateQuestionGroupDto,
  VocabQuizDto,
  VocabWordDto,
} from './dto';

@Injectable()
export class AssessmentAdminService {
  constructor(
    private readonly repo: AssessmentAdminRepository,
    private readonly mapper: AssessmentMapper,
    private readonly vocabMapper: VocabMapper,
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

  async getFullTestDetail(testId: number): Promise<AdminFullTestDetailDto> {
    const test = await this.repo.findFullTestWithCourse(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Đề thi #${testId} không tồn tại`,
      });
    }
    return this.mapper.toAdminFullTestDetailDto(test);
  }

  async getFullTestQuestions(testId: number): Promise<FullTestQuestionDto[]> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Đề thi #${testId} không tồn tại`,
      });
    }
    const items = await this.repo.findFullTestQuestions(testId);
    return items.map(({ question, partNumber }) =>
      this.mapper.toFullTestQuestionDto(question, partNumber),
    );
  }

  async updateFullTest(
    testId: number,
    dto: UpdateFullTestDto,
  ): Promise<AdminFullTestDetailDto> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Đề thi #${testId} không tồn tại`,
      });
    }
    const updated = await this.repo.updateFullTest(testId, {
      title: dto.title,
      description: dto.description ?? null,
      audioUrl: dto.audio_url ?? null,
      category: dto.category ?? '2026',
      releaseDate: dto.release_date ? new Date(dto.release_date) : null,
    });
    return this.mapper.toAdminFullTestDetailDto(updated);
  }

  async createFullTestQuestion(
    testId: number,
    dto: CreateFullTestQuestionDto,
  ): Promise<FullTestQuestionDto> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Đề thi #${testId} không tồn tại`,
      });
    }

    return this.repo.inTransaction(async (txRepo) => {
      const section = await txRepo.findSectionByTestAndPart(
        testId,
        dto.part_number,
      );
      let targetQuizId = section?.quizId;

      if (!targetQuizId) {
        const quiz = await txRepo.createQuiz({
          title: `Part ${dto.part_number} - ${test.title || 'Test'}`,
          totalQuestions: 0,
          displayOrder: dto.part_number,
          moduleId: null,
        });
        await txRepo.createSection({
          testId,
          partNumber: dto.part_number,
          quizId: quiz.id,
        });
        targetQuizId = quiz.id;
      }

      const question = await txRepo.createQuestion({
        quizId: targetQuizId,
        displayOrder: dto.display_order,
        questionText: dto.question_text ?? null,
        audioUrl: dto.audio_url ?? null,
        imageUrl: dto.image_url ?? null,
        passageText: dto.passage_text ?? null,
        groupId: dto.group_id ?? null,
        transcript: dto.transcript ?? null,
        translation: dto.translation ?? null,
        questionType: 'multiple_choice',
      });

      if (dto.answers && dto.answers.length > 0) {
        await txRepo.createAnswers(
          dto.answers.map((ans, idx) => ({
            questionId: question.id,
            answerText: ans.answer_text,
            isCorrect: ans.is_correct ?? false,
            explanation: ans.explanation ?? null,
            displayOrder: idx,
          })),
        );
      }

      const totalCount = await txRepo.countQuestionsInTest(testId);
      await txRepo.updateFullTestTotalQuestions(testId, totalCount);

      const created = await txRepo.findQuestionById(question.id);
      return this.mapper.toFullTestQuestionDto(created!, dto.part_number);
    });
  }

  async updateFullTestQuestion(
    id: number,
    dto: UpdateFullTestQuestionDto,
  ): Promise<FullTestQuestionDto> {
    const question = await this.repo.findQuestionById(id);
    if (!question) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: `Câu hỏi #${id} không tồn tại`,
      });
    }

    const existingAnswerIds = question.answers.map((a) => a.id);
    for (const ans of dto.answers) {
      if (ans.id !== undefined && !existingAnswerIds.includes(ans.id)) {
        throw new BadRequestException({
          code: 'ANSWER_NOT_IN_QUESTION',
          message: `Đáp án #${ans.id} không thuộc câu hỏi #${id}`,
        });
      }
    }

    return this.repo.inTransaction(async (txRepo) => {
      await txRepo.updateQuestion(id, {
        displayOrder: dto.display_order,
        questionText: dto.question_text ?? null,
        audioUrl: dto.audio_url ?? null,
        imageUrl: dto.image_url ?? null,
        passageText: dto.passage_text ?? null,
        groupId: dto.group_id ?? null,
        transcript: dto.transcript ?? null,
        translation: dto.translation ?? null,
      });

      const currentBodyIds = dto.answers
        .map((a) => a.id)
        .filter((aid): aid is number => aid !== undefined);
      const toDeleteIds = existingAnswerIds.filter(
        (aid) => !currentBodyIds.includes(aid),
      );
      if (toDeleteIds.length > 0) {
        await txRepo.deleteAnswersByIds(toDeleteIds);
      }

      for (let idx = 0; idx < dto.answers.length; idx++) {
        const ans = dto.answers[idx];
        if (ans.id !== undefined) {
          await txRepo.updateAnswer(ans.id, {
            answerText: ans.answer_text,
            isCorrect: ans.is_correct ?? false,
            explanation: ans.explanation ?? null,
            displayOrder: idx,
          });
        } else {
          await txRepo.createAnswer({
            questionId: id,
            answerText: ans.answer_text,
            isCorrect: ans.is_correct ?? false,
            explanation: ans.explanation ?? null,
            displayOrder: idx,
          });
        }
      }

      const partNumber =
        (question.quizId
          ? await txRepo.findPartNumberByQuizId(question.quizId)
          : null) ?? 5;
      const updated = await txRepo.findQuestionById(id);
      return this.mapper.toFullTestQuestionDto(updated!, partNumber);
    });
  }

  async deleteFullTestQuestion(id: number): Promise<void> {
    const question = await this.repo.findQuestionById(id);
    if (!question) {
      return;
    }

    await this.repo.inTransaction(async (txRepo) => {
      const testId = await txRepo.findTestIdByQuestionId(id);
      await txRepo.deleteAnswersByQuestionId(id);
      await txRepo.deleteQuestion(id);

      if (testId) {
        const totalCount = await txRepo.countQuestionsInTest(testId);
        await txRepo.updateFullTestTotalQuestions(testId, totalCount);
      }
    });
  }

  async duplicateFullTestQuestion(id: number): Promise<FullTestQuestionDto> {
    const q = await this.repo.findQuestionById(id);
    if (!q) {
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: `Câu hỏi #${id} không tồn tại`,
      });
    }

    return this.repo.inTransaction(async (txRepo) => {
      const newQ = await txRepo.createQuestion({
        quizId: q.quizId,
        displayOrder: q.displayOrder + 1,
        questionText: `${q.questionText ?? ''} (Bản sao)`,
        audioUrl: q.audioUrl,
        imageUrl: q.imageUrl,
        passageText: q.passageText,
        groupId: q.groupId,
        transcript: q.transcript,
        translation: q.translation,
        questionType: q.questionType ?? 'multiple_choice',
      });

      if (q.answers.length > 0) {
        await txRepo.createAnswers(
          q.answers.map((a) => ({
            questionId: newQ.id,
            answerText: a.answerText ?? '',
            isCorrect: a.isCorrect ?? false,
            explanation: a.explanation,
            displayOrder: a.displayOrder,
          })),
        );
      }

      // Giữ đúng hành vi cũ: KHÔNG đếm lại total_questions
      const partNumber =
        (q.quizId ? await txRepo.findPartNumberByQuizId(q.quizId) : null) ?? 5;
      const duplicated = await txRepo.findQuestionById(newQ.id);
      return this.mapper.toFullTestQuestionDto(duplicated!, partNumber);
    });
  }

  async updateQuestionGroup(
    testId: number,
    dto: UpdateQuestionGroupDto,
  ): Promise<void> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: `Đề thi #${testId} không tồn tại`,
      });
    }

    const uniqueIds = new Set(dto.question_ids);
    if (uniqueIds.size !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Danh sách ID câu hỏi có phần tử trùng lặp',
      });
    }

    const quizIds = await this.repo.findQuizIdsByTestId(testId);
    const foundQuestions = await this.repo.findQuestionsByQuizIds(
      quizIds,
      dto.question_ids,
    );
    if (foundQuestions.length !== dto.question_ids.length) {
      throw new BadRequestException({
        code: 'QUESTION_IDS_INVALID',
        message: 'Có câu hỏi không thuộc đề thi này',
      });
    }

    await this.repo.updateQuestionsGroup(dto.question_ids, {
      passageText: dto.passage_text ?? null,
      audioUrl: dto.audio_url ?? null,
      imageUrl: dto.image_url ?? null,
      groupId: dto.group_id ?? null,
    });
  }

  async getLessonVocabQuiz(lessonId: number): Promise<VocabQuizDto | null> {
    const quiz = await this.repo.findVocabQuizByLessonId(lessonId);
    return quiz ? this.vocabMapper.toVocabQuizDto(quiz) : null;
  }

  async getOrCreateLessonVocabQuiz(
    lessonId: number,
    dto: CreateLessonVocabQuizDto,
  ): Promise<VocabQuizDto> {
    const existing = await this.repo.findVocabQuizByLessonId(lessonId);
    if (existing) return this.vocabMapper.toVocabQuizDto(existing);
    const created = await this.repo.createVocabQuiz({
      lessonId,
      title: dto.title,
      display_order: dto.display_order,
    });
    return this.vocabMapper.toVocabQuizDto(created);
  }

  async getLessonVocabWords(
    quizId: number,
    questionId?: number,
  ): Promise<VocabWordDto[]> {
    const words = await this.repo.findVocabWords(quizId, questionId);
    return words.map((w) => this.vocabMapper.toVocabWordDto(w));
  }

  async createVocabWordsBatch(
    quizId: number,
    dto: CreateVocabWordsBatchDto,
  ): Promise<{ count: number }> {
    const count = await this.repo.createVocabWords(quizId, dto.words);
    return { count };
  }

  async updateVocabWord(
    id: number,
    dto: Partial<SaveVocabWordDto>,
  ): Promise<VocabWordDto> {
    const word = await this.repo.updateVocabWord(id, dto);
    return this.vocabMapper.toVocabWordDto(word);
  }

  async deleteVocabWord(id: number): Promise<void> {
    await this.repo.deleteVocabWord(id);
  }

  async bulkDeleteVocabWords(
    dto: BulkDeleteVocabWordsDto,
  ): Promise<{ count: number }> {
    const count = await this.repo.bulkDeleteVocabWords(dto.ids);
    return { count };
  }

  async getAllLessonsForVocab(): Promise<
    { id: number; title: string; moduleId: number | null }[]
  > {
    return this.repo.findAllLessonsForVocab();
  }

  async getLessonQuestionsForVocab(lessonId: number): Promise<
    {
      id: number;
      question_text: string | null;
      display_order: number;
    }[]
  > {
    return this.repo.findLessonQuestions(lessonId);
  }
}
