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
  AdminFullTestListItemDto,
  AdminSearchVocabWordDto,
  AppendFullTestQuestionsDto,
  BulkDeleteFullTestsDto,
  BulkDeleteQuestionsDto,
  BulkDeleteVocabWordsDto,
  CreateFullTestDto,
  CreateFullTestQuestionDto,
  CreateLessonVocabQuizDto,
  CreateVocabWordsBatchDto,
  FullTestQuestionDto,
  ImportFullTestQuestionsDto,
  ImportQuizQuestionsDto,
  ImportQuizQuestionsResponseDto,
  PackageImportFullTestsDto,
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

  async importQuizQuestions(
    quizId: number,
    dto: ImportQuizQuestionsDto,
  ): Promise<ImportQuizQuestionsResponseDto> {
    return this.repo.inTransaction(async (tx) => {
      const quiz = await tx.findQuizById(quizId);
      if (!quiz) {
        throw new NotFoundException({
          code: 'QUIZ_NOT_FOUND',
          message: `Quiz #${quizId} không tồn tại`,
        });
      }

      if (dto.effective_lesson_id) {
        const lesson = await tx.findLessonById(dto.effective_lesson_id);
        if (!lesson) {
          throw new NotFoundException({
            code: 'LESSON_NOT_FOUND',
            message: `Bài học #${dto.effective_lesson_id} không tồn tại`,
          });
        }
      }

      // Như ImportDialog cũ: display_order = existingCount (= questions.length) + i
      let nextOrder = await tx.countQuestionsInQuiz(quizId);

      const insertedQuestions: Array<{
        id: number;
        vocabText?: string | null;
      }> = [];
      for (const q of dto.questions) {
        const question = await tx.createQuestion({
          quizId,
          questionText: q.question_text ?? null,
          questionType: q.question_type ?? 'multiple_choice',
          displayOrder: nextOrder++,
          translation: q.translation ?? null,
          dictationKeywords: q.dictation_keywords ?? null,
          audioUrl: q.audio_url ?? null,
          imageUrl: q.image_url ?? null,
        });

        if (q.answers && q.answers.length > 0) {
          await tx.createAnswers(
            q.answers.map((ans, aIdx) => ({
              questionId: question.id,
              answerText: ans.text,
              isCorrect: ans.is_correct ?? false,
              explanation: ans.explanation ?? null,
              displayOrder: aIdx,
            })),
          );
        }

        insertedQuestions.push({
          id: question.id,
          vocabText: q.vocab_text,
        });
      }

      if (dto.effective_lesson_id) {
        let vQuiz = await tx.findVocabQuizByLessonId(dto.effective_lesson_id);
        const hasAnyVocab = insertedQuestions.some((iq) =>
          Boolean(iq.vocabText),
        );

        if (!vQuiz && hasAnyVocab) {
          const title = `Từ vựng - ${dto.quiz_title || quiz.title || 'Bài học'}`;
          vQuiz = await tx.createVocabQuiz({
            title,
            lessonId: dto.effective_lesson_id,
            display_order: 0,
          });
        }

        if (vQuiz) {
          const allVocabEntries: Array<{
            word: string;
            definition_vi?: string | null;
            phonetic?: string | null;
            audio_male_url?: string | null;
            example_sentence?: string | null;
            question_id?: number | null;
            display_order?: number;
          }> = [];

          for (const iq of insertedQuestions) {
            if (!iq.vocabText) continue;
            const words = iq.vocabText
              .split(';')
              .map((v) => v.trim())
              .filter(Boolean);

            words.forEach((v, vIdx) => {
              const [word, def, phonetic, example] = v
                .split('|')
                .map((s) => s.trim());
              if (word) {
                allVocabEntries.push({
                  word,
                  definition_vi: def || '',
                  phonetic: phonetic || null,
                  audio_male_url: null,
                  example_sentence: example || null,
                  question_id: iq.id,
                  display_order: vIdx,
                });
              }
            });
          }

          if (allVocabEntries.length > 0) {
            await tx.createVocabWords(vQuiz.id, allVocabEntries);
          }
        }
      }

      const totalQuizQuestions = await tx.countQuestionsInQuiz(quizId);
      await tx.updateQuizTotalQuestions(quizId, totalQuizQuestions);

      return {
        success: true,
        count: insertedQuestions.length,
      };
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

  async listAdminFullTests(
    courseId?: number,
  ): Promise<AdminFullTestListItemDto[]> {
    const tests = await this.repo.findAdminFullTests(courseId);
    return this.mapper.toAdminFullTestListItemDtoList(tests);
  }

  async createFullTest(
    dto: CreateFullTestDto,
  ): Promise<AdminFullTestDetailDto> {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Tên đề thi không được để trống',
      });
    }

    return this.repo.inTransaction(async (tx) => {
      let displayOrder = dto.display_order;
      if (displayOrder === undefined || displayOrder === null) {
        const count = await tx.countFullTestsByCourse(dto.course_id);
        displayOrder = count + 1;
      }

      const newTest = await tx.createFullTest({
        title,
        courseId: dto.course_id,
        description: dto.description?.trim() || null,
        audioUrl: dto.audio_url?.trim() || null,
        category: dto.category?.trim() || '2026',
        displayOrder,
        releaseDate: dto.release_date ? new Date(dto.release_date) : null,
        totalQuestions: dto.total_questions ?? 200,
      });

      // Tự động tạo 7 quiz và 7 sections cho 7 Parts của TOEIC
      for (let part = 1; part <= 7; part++) {
        const newQuiz = await tx.createQuizRaw({
          title: `Part ${part} - ${title}`,
          totalQuestions: 0,
          displayOrder: part,
        });

        await tx.createFullTestSection({
          testId: newTest.id,
          partNumber: part,
          quizId: newQuiz.id,
        });
      }

      return this.mapper.toAdminFullTestDetailDto(newTest);
    });
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
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      audioUrl: dto.audio_url?.trim() ?? null,
      category: dto.category ?? '2026',
      releaseDate: dto.release_date ? new Date(dto.release_date) : null,
      ...(dto.course_id ? { course: { connect: { id: dto.course_id } } } : {}),
      ...(dto.display_order !== undefined && dto.display_order !== null
        ? { displayOrder: dto.display_order }
        : {}),
      ...(dto.total_questions !== undefined && dto.total_questions !== null
        ? { totalQuestions: dto.total_questions }
        : {}),
    });
    return this.mapper.toAdminFullTestDetailDto(updated);
  }

  async searchVocabWords(query?: string): Promise<AdminSearchVocabWordDto[]> {
    const words = await this.repo.searchVocabQuestions(query);
    return words.map((w) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic ?? null,
      definition_vi: w.definitionVi ?? null,
      example_sentence: w.exampleSentence ?? null,
    }));
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

  async deleteFullTest(id: number): Promise<void> {
    const existing = await this.repo.findFullTestById(id);
    if (!existing) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: 'Đề thi không tồn tại',
      });
    }

    await this.repo.inTransaction(async (tx) => {
      const sections = await tx.findSectionsByTestId(id);
      const quizIds = sections
        .map((s) => s.quizId)
        .filter((qid): qid is number => qid !== null);

      await tx.deleteFullTest(id);
      if (quizIds.length > 0) {
        await tx.deleteQuizzes(quizIds);
      }
    });
  }

  async bulkDeleteFullTests(
    dto: BulkDeleteFullTestsDto,
  ): Promise<{ count: number }> {
    return this.repo.inTransaction(async (tx) => {
      const sections = await tx.findSectionsByTestIds(dto.test_ids);
      const quizIds = sections
        .map((s) => s.quizId)
        .filter((qid): qid is number => qid !== null);

      const count = await tx.deleteFullTests(dto.test_ids);
      if (quizIds.length > 0) {
        await tx.deleteQuizzes(quizIds);
      }
      return { count };
    });
  }

  async importFullTestQuestions(
    testId: number,
    dto: ImportFullTestQuestionsDto,
  ): Promise<{ test_id: number; imported_questions: number }> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: 'Đề thi không tồn tại',
      });
    }

    return this.repo.inTransaction(async (tx) => {
      let sections = await tx.findSectionsByTestId(testId);

      // Only create 7 sections when test has NO sections at all
      if (!sections || sections.length === 0) {
        for (let p = 1; p <= 7; p++) {
          const newQuiz = await tx.createQuizRaw({
            title: `Part ${p} - ${test.title}`,
            totalQuestions: 0,
            displayOrder: p,
          });
          await tx.createFullTestSection({
            testId,
            partNumber: p,
            quizId: newQuiz.id,
          });
        }
        sections = await tx.findSectionsByTestId(testId);
      }

      let totalQuestionsImported = 0;

      for (let part = 1; part <= 7; part++) {
        const partSection = sections.find((s) => s.partNumber === part);
        if (!partSection || !partSection.quizId) continue;

        const partQuestions = dto.questions.filter((q) => {
          const qPart =
            q.part_number ??
            q.part ??
            (q.display_order
              ? q.display_order <= 6
                ? 1
                : q.display_order <= 31
                  ? 2
                  : q.display_order <= 70
                    ? 3
                    : q.display_order <= 100
                      ? 4
                      : q.display_order <= 130
                        ? 5
                        : q.display_order <= 146
                          ? 6
                          : 7
              : 5);
          return qPart === part;
        });

        if (partQuestions.length === 0) continue;

        for (const item of partQuestions) {
          const displayOrder = item.display_order || totalQuestionsImported + 1;

          const insertedQ = await tx.createQuestion({
            quizId: partSection.quizId,
            questionText: item.question_text || item.text || '',
            displayOrder,
            passageText: item.passage_text || item.passage || null,
            translation: item.translation || null,
            audioUrl: item.audio_url || null,
            imageUrl: item.image_url || null,
            transcript: item.transcript || null,
            groupId: item.group_id ? String(item.group_id) : null,
          });

          const rawAnswers = (item.answers || item.options || []) as (
            | {
                answer_text?: string;
                text?: string;
                is_correct?: boolean;
                explanation?: string | null;
              }
            | string
          )[];

          const answersToInsert = rawAnswers.map((ans, aIdx) => {
            const isStr = typeof ans === 'string';
            const obj = isStr ? null : ans;
            return {
              questionId: insertedQ.id,
              answerText: isStr ? ans : obj?.answer_text || obj?.text || '',
              isCorrect: isStr
                ? item.correct_answer === aIdx || item.correct === aIdx
                : Boolean(obj?.is_correct),
              explanation: isStr
                ? item.explanation || null
                : obj?.explanation || item.explanation || null,
              displayOrder: aIdx,
            };
          });

          if (answersToInsert.length > 0) {
            await tx.createAnswers(answersToInsert);
          }

          totalQuestionsImported++;
        }

        await tx.updateQuizTotalQuestions(
          partSection.quizId,
          partQuestions.length,
        );
      }

      await tx.updateFullTestTotalQuestions(testId, totalQuestionsImported);

      return { test_id: testId, imported_questions: totalQuestionsImported };
    });
  }

  async appendFullTestQuestions(
    testId: number,
    dto: AppendFullTestQuestionsDto,
  ): Promise<{ test_id: number; imported_questions: number }> {
    const test = await this.repo.findFullTestById(testId);
    if (!test) {
      throw new NotFoundException({
        code: 'FULLTEST_NOT_FOUND',
        message: 'Đề thi không tồn tại',
      });
    }

    return this.repo.inTransaction(async (tx) => {
      const sections = await tx.findSectionsByTestId(testId);
      if (!sections || sections.length === 0) {
        throw new BadRequestException({
          code: 'FULLTEST_SECTIONS_NOT_FOUND',
          message:
            'Không thể tìm thấy các Sections của đề thi này. Hãy thử tạo lại đề.',
        });
      }

      if (dto.audio_url) {
        await tx.updateFullTest(testId, { audioUrl: dto.audio_url });
      }

      const quizByPart = new Map<number, number>();
      for (const s of sections) {
        if (s.quizId !== null) {
          quizByPart.set(s.partNumber, s.quizId);
        }
      }

      let totalQuestionsImported = 0;

      for (let i = 0; i < dto.questions.length; i++) {
        const q = dto.questions[i];
        const part = q.part || q.part_number || 5;
        const quizId = quizByPart.get(part);
        if (!quizId) continue;

        let questionText = q.question_text || '';
        if (q.passage_text) {
          questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
        }

        const currentStep = i + 1;
        const displayOrder = q.display_order || currentStep;

        const insertedQ = await tx.createQuestion({
          quizId,
          questionText,
          questionType: `part${part}`,
          displayOrder,
          translation: q.translation || q.translation_text || null,
          audioUrl: q.audio_url || null,
          imageUrl: q.image_url || null,
          groupId: q.group_id ? String(q.group_id) : null,
          transcript: q.transcript || null,
        });

        const answers = q.answers || q.options || [];
        const answersToInsert = answers.map((ans, aIdx) => ({
          questionId: insertedQ.id,
          answerText: ans.answer_text || ans.text || '',
          isCorrect: Boolean(ans.is_correct || ans.correct),
          explanation: ans.explanation || null,
          displayOrder:
            ans.display_order !== undefined ? ans.display_order : aIdx,
        }));

        if (answersToInsert.length > 0) {
          await tx.createAnswers(answersToInsert);
        }

        totalQuestionsImported++;
      }

      for (const [, quizId] of quizByPart.entries()) {
        const count = await tx.countQuestionsByQuizId(quizId);
        await tx.updateQuizTotalQuestions(quizId, count);
      }

      return { test_id: testId, imported_questions: totalQuestionsImported };
    });
  }

  async packageImportFullTests(
    dto: PackageImportFullTestsDto,
  ): Promise<{ course_id: number; exams_imported: number }> {
    return this.repo.inTransaction(async (tx) => {
      const existingCourse = await tx.findCourseByTitle(dto.course_title);
      let targetCourseId: number;

      if (existingCourse) {
        targetCourseId = existingCourse.id;
      } else {
        const newCourse = await tx.createCourse({
          title: dto.course_title,
          subtitle: 'Bộ đề thi thử TOEIC sát đề thi thật 2026',
          courseType: 'fulltest',
          isActive: true,
          price: 0,
          durationMonths: 12,
          instructor: 'Cô Mai Phương',
        });
        targetCourseId = newCourse.id;
      }

      for (let exIdx = 0; exIdx < dto.exams.length; exIdx++) {
        const exam = dto.exams[exIdx];
        const examTitle =
          exam.exam_title || exam.title || `Đề thi số ${exIdx + 1}`;

        const existingTest = await tx.findFullTestByTitleAndCourse(
          examTitle,
          targetCourseId,
        );
        let testId: number;

        if (existingTest) {
          testId = existingTest.id;
          const oldSections = await tx.findSectionsByTestId(testId);
          const quizIds = oldSections
            .map((s) => s.quizId)
            .filter((qid): qid is number => qid !== null);
          if (quizIds.length > 0) {
            await tx.deleteQuestionsByQuizIds(quizIds);
          }
        } else {
          const newTest = await tx.createFullTest({
            title: examTitle,
            courseId: targetCourseId,
            audioUrl: exam.audio_url || null,
          });
          testId = newTest.id;

          for (let part = 1; part <= 7; part++) {
            const newQuiz = await tx.createQuizRaw({
              title: `Part ${part} - ${examTitle}`,
              totalQuestions: 0,
              displayOrder: part,
            });
            await tx.createFullTestSection({
              testId,
              partNumber: part,
              quizId: newQuiz.id,
            });
          }
        }

        if (exam.audio_url) {
          await tx.updateFullTest(testId, { audioUrl: exam.audio_url });
        }

        const sections = await tx.findSectionsByTestId(testId);
        const quizByPart = new Map<number, number>();
        for (const s of sections) {
          if (s.quizId !== null) {
            quizByPart.set(s.partNumber, s.quizId);
          }
        }

        const questionsArray = exam.questions || [];

        for (let i = 0; i < questionsArray.length; i++) {
          const q = questionsArray[i];
          const part = q.part || q.part_number || 5;
          const quizId = quizByPart.get(part);
          if (!quizId) continue;

          let questionText = q.question_text || '';
          if (q.passage_text) {
            questionText = `[PASSAGE]${q.passage_text}[ENDPASSAGE]${questionText}`;
          }

          const currentStep = i + 1;
          const displayOrder = q.display_order || currentStep;

          const insertedQ = await tx.createQuestion({
            quizId,
            questionText,
            questionType: `part${part}`,
            displayOrder,
            translation: q.translation || q.translation_text || null,
            audioUrl: q.audio_url || null,
            imageUrl: q.image_url || null,
            groupId: q.group_id ? String(q.group_id) : null,
            transcript: q.transcript || null,
          });

          const answers = q.answers || q.options || [];
          const answersToInsert = answers.map((ans, aIdx) => ({
            questionId: insertedQ.id,
            answerText: ans.answer_text || ans.text || '',
            isCorrect: Boolean(ans.is_correct || ans.correct),
            explanation: ans.explanation || null,
            displayOrder:
              ans.display_order !== undefined ? ans.display_order : aIdx,
          }));

          if (answersToInsert.length > 0) {
            await tx.createAnswers(answersToInsert);
          }
        }

        for (const [, quizId] of quizByPart.entries()) {
          const count = await tx.countQuestionsByQuizId(quizId);
          await tx.updateQuizTotalQuestions(quizId, count);
        }
      }

      return { course_id: targetCourseId, exams_imported: dto.exams.length };
    });
  }
}
