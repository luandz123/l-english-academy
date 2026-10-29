import {
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

  async getDictationQuiz(
    quizId: number,
    user?: AuthenticatedUser,
  ): Promise<DictationQuizDetailDto> {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('QUIZ_NOT_FOUND');
    }

    const canTake = await this.learning.canTakeQuiz(quizId, user);
    if (!canTake) {
      throw new ForbiddenException('QUIZ_LOCKED');
    }

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
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('QUIZ_NOT_FOUND');
    }

    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    const total = quiz.totalQuestions || questions.length;
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
    const resultIds = await this.repo.findAllResultIdsForQuiz(user.id, quizId);
    const answers = await this.repo.findCompletedAnswers(resultIds);
    return answers.map((a) => this.dictationMapper.toDictationUserAnswerDto(a));
  }

  async markQuestionDone(
    quizId: number,
    questionId: number,
    user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    return this.repo.inTransaction(async (txRepo) => {
      const quiz = await txRepo.findQuizById(quizId);
      if (!quiz) {
        throw new NotFoundException('QUIZ_NOT_FOUND');
      }

      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const total = quiz.totalQuestions || questions.length;
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
    return this.repo.inTransaction(async (txRepo) => {
      const quiz = await txRepo.findQuizById(quizId);
      if (!quiz) {
        throw new NotFoundException('QUIZ_NOT_FOUND');
      }

      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const total = quiz.totalQuestions || questions.length;
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
    return this.repo.inTransaction(async (txRepo) => {
      const quiz = await txRepo.findQuizById(quizId);
      if (!quiz) {
        throw new NotFoundException('QUIZ_NOT_FOUND');
      }

      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const total = quiz.totalQuestions || questions.length;
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
    return this.repo.inTransaction(async (txRepo) => {
      const quiz = await txRepo.findQuizById(quizId);
      if (!quiz) {
        throw new NotFoundException('QUIZ_NOT_FOUND');
      }

      const questions = await txRepo.findQuestionsWithAnswers(quizId);
      const total = quiz.totalQuestions || questions.length;
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
