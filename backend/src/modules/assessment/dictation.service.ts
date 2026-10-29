import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import { AssessmentMapper } from './assessment.mapper';
import { DictationMapper } from './dictation.mapper';
import { DictationRepository } from './dictation.repository';
import { VocabMapper } from './vocab.mapper';
import {
  DictationProgressResponseDto,
  DictationQuizDetailDto,
  DictationUserAnswerDto,
  QuizResultDto,
  VocabWordDto,
} from './dto';

@Injectable()
export class DictationService {
  constructor(
    private readonly repo: DictationRepository,
    private readonly dictationMapper: DictationMapper,
    private readonly assessmentMapper: AssessmentMapper,
    private readonly vocabMapper: VocabMapper,
    private readonly learning: LearningService,
  ) {}

  private async assertQuizAccessible(
    quizId: number,
    user?: AuthenticatedUser,
  ) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException({
        code: 'QUIZ_NOT_FOUND',
        message: `Không tìm thấy quiz ${quizId}`,
      });
    }

    const canTake = await this.learning.canTakeQuiz(quizId, user);
    if (!canTake) {
      throw new ForbiddenException({
        code: 'QUIZ_LOCKED',
        message: 'Bạn chưa có quyền làm bài này',
      });
    }

    return quiz;
  }

  async getDictationQuiz(
    quizId: number,
    user?: AuthenticatedUser,
  ): Promise<DictationQuizDetailDto> {
    const quiz = await this.assertQuizAccessible(quizId, user);
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    return this.dictationMapper.toDictationQuizDetailDto(quiz, questions);
  }

  async getLessonByQuizId(quizId: number): Promise<{ id: number } | null> {
    return this.repo.findLessonByQuizId(quizId);
  }

  async getVocabForQuiz(quizId: number): Promise<VocabWordDto[]> {
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    const questionIds = questions.map((q) => q.id);
    if (questionIds.length === 0) return [];
    const words = await this.repo.findVocabByQuestionIds(questionIds);
    return words.map((w) => this.vocabMapper.toVocabWordDto(w));
  }

  async getOrCreateResult(
    quizId: number,
    user: AuthenticatedUser,
  ): Promise<QuizResultDto> {
    await this.assertQuizAccessible(quizId, user);
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    const total = questions.length;
    const result = await this.repo.findOrCreateLatestResult(
      user.id,
      quizId,
      total,
    );
    return this.assessmentMapper.toQuizResultDto(result);
  }

  async getUserAnswers(
    quizId: number,
    user: AuthenticatedUser,
  ): Promise<DictationUserAnswerDto[]> {
    await this.assertQuizAccessible(quizId, user);
    const resultIds = await this.repo.findAllResultIdsForQuiz(user.id, quizId);
    const answers = await this.repo.findCompletedAnswers(resultIds);
    return answers.map((a) => this.dictationMapper.toDictationUserAnswerDto(a));
  }

  async markQuestionDone(
    quizId: number,
    questionId: number,
    user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    await this.assertQuizAccessible(quizId, user);

    return this.repo.inTransaction(async (txRepo) => {
      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const validIds = new Set(questions.map((q) => q.id));
      if (!validIds.has(questionId)) {
        throw new BadRequestException({
          code: 'QUESTION_IDS_INVALID',
          message: 'Câu hỏi không thuộc đề thi này',
        });
      }

      const total = questions.length;
      const result = await txRepo.findOrCreateLatestResult(
        user.id,
        quizId,
        total,
      );

      await txRepo.upsertUserAnswer(result.id, questionId, true);
      const doneCount = await txRepo.countDoneQuestions(result.id);
      await txRepo.updateQuizResultScores(
        result.id,
        doneCount,
        doneCount,
        total,
      );

      return {
        score: doneCount,
        correct_answers: doneCount,
        total_questions: total,
      };
    });
  }

  async unmarkQuestionDone(
    quizId: number,
    questionId: number,
    user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    await this.assertQuizAccessible(quizId, user);

    return this.repo.inTransaction(async (txRepo) => {
      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const validIds = new Set(questions.map((q) => q.id));
      if (!validIds.has(questionId)) {
        throw new BadRequestException({
          code: 'QUESTION_IDS_INVALID',
          message: 'Câu hỏi không thuộc đề thi này',
        });
      }

      const total = questions.length;
      const result = await txRepo.findLatestQuizResult(user.id, quizId);
      const resultIds = await txRepo.findAllResultIdsForQuiz(user.id, quizId);

      await txRepo.unmarkUserAnswer(resultIds, questionId);

      const doneCount = result ? await txRepo.countDoneQuestions(result.id) : 0;
      if (result) {
        await txRepo.updateQuizResultScores(
          result.id,
          doneCount,
          doneCount,
          total,
        );
      }

      return {
        score: doneCount,
        correct_answers: doneCount,
        total_questions: total,
      };
    });
  }

  async syncSession(
    quizId: number,
    questionIds: number[],
    user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    await this.assertQuizAccessible(quizId, user);

    return this.repo.inTransaction(async (txRepo) => {
      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const validIds = new Set(questions.map((q) => q.id));
      for (const qId of questionIds) {
        if (!validIds.has(qId)) {
          throw new BadRequestException({
            code: 'QUESTION_IDS_INVALID',
            message: 'Một hoặc nhiều câu hỏi không thuộc đề thi này',
          });
        }
      }

      const total = questions.length;
      const result = await txRepo.findOrCreateLatestResult(
        user.id,
        quizId,
        total,
      );

      for (const qId of questionIds) {
        await txRepo.upsertUserAnswer(result.id, qId, true);
      }

      const doneCount = await txRepo.countDoneQuestions(result.id);
      await txRepo.updateQuizResultScores(
        result.id,
        doneCount,
        doneCount,
        total,
      );

      return {
        score: doneCount,
        correct_answers: doneCount,
        total_questions: total,
      };
    });
  }

  async resetAll(
    quizId: number,
    user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    await this.assertQuizAccessible(quizId, user);

    return this.repo.inTransaction(async (txRepo) => {
      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const total = questions.length;
      const resultIds = await txRepo.findAllResultIdsForQuiz(user.id, quizId);

      await txRepo.resetAllForQuiz(resultIds);

      return {
        score: 0,
        correct_answers: 0,
        total_questions: total,
      };
    });
  }
}
