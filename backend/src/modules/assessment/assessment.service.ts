import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { LearningService } from '../learning/learning.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import {
  LatestQuizResultResponseDto,
  QuestionDto,
  QuizDto,
  QuizResultDto,
  ReviewQuestionDto,
  SubmitQuizDto,
  SubmitQuizResponseDto,
  UserAnswerDto,
} from './dto';
import { AssessmentMapper } from './assessment.mapper';
import { AssessmentRepository } from './assessment.repository';
import { gradeQuiz, QuizGradingError } from './quiz-grading';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly mapper: AssessmentMapper,
    private readonly auth: AuthService,
    private readonly learning: LearningService,
  ) {}

  /** Thay `QuizPage.tsx:207`, `QuizResult.tsx:64`. */
  async getQuiz(quizId: number): Promise<QuizDto> {
    const quiz = await this.repo.findQuiz(quizId);
    if (!quiz) throw this.quizNotFound(quizId);
    return this.mapper.toQuizDto(quiz);
  }

  /**
   * Thay `QuizPage.tsx:219` (`select("*, answers(*)")`). Không trả `is_correct` và lời
   * giải: client cũ tải cả đáp án đúng xuống trước khi làm bài. Quiz không có → [].
   * Không có quyền làm quiz → 403 `QUIZ_LOCKED` (#22a).
   */
  async getQuestions(
    quizId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<QuestionDto[]> {
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    if (questions.length === 0) return [];
    await this.assertCanTake(quizId, user);
    return questions.map((q) => this.mapper.toQuestionDto(q));
  }

  /**
   * Thay `QuizPage.tsx:286-321`: chấm ở server, ghi `user_quiz_results` + `user_answers`
   * trong một transaction. Client chỉ gửi id đáp án đã chọn và thời gian làm bài.
   */
  async submit(
    user: AuthenticatedUser,
    quizId: number,
    dto: SubmitQuizDto,
  ): Promise<SubmitQuizResponseDto> {
    const quiz = await this.repo.findQuiz(quizId);
    if (!quiz) throw this.quizNotFound(quizId);
    await this.assertCanTake(quizId, user);

    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    let grade;
    try {
      grade = gradeQuiz(
        questions,
        dto.answers.map((a) => ({
          questionId: a.question_id,
          selectedAnswerId: a.selected_answer_id ?? null,
        })),
      );
    } catch (err) {
      if (err instanceof QuizGradingError) {
        throw new BadRequestException({
          code: 'INVALID_ANSWER',
          message: `Câu trả lời không hợp lệ (${err.reason}, câu ${err.questionId})`,
        });
      }
      throw err;
    }

    const { result, attempts } = await this.repo.createResult({
      userId: user.id,
      quizId,
      score: grade.score,
      correctAnswers: grade.correctAnswers,
      totalQuestions: grade.totalQuestions,
      timeSpentSeconds: dto.time_spent_seconds,
      answers: grade.answers,
    });
    return {
      result: this.mapper.toQuizResultDto(result),
      is_first_attempt: attempts === 1,
    };
  }

  /**
   * Thay `QuizResult.tsx:83` (theo `resultId`). RLS cũ: chủ kết quả hoặc admin; người
   * khác nhận 404 (không lộ là kết quả có tồn tại).
   */
  async getResult(
    user: AuthenticatedUser,
    resultId: number,
  ): Promise<QuizResultDto> {
    const result = await this.repo.findResult(resultId);
    if (!result || !(await this.canSeeResult(user, result.userId))) {
      throw new NotFoundException({
        code: 'RESULT_NOT_FOUND',
        message: `Không tìm thấy kết quả ${resultId}`,
      });
    }
    return this.mapper.toQuizResultDto(result);
  }

  /** Thay `QuizResult.tsx:91-98`: kết quả mới nhất của chính mình cho quiz. */
  async getLatestResult(
    userId: string,
    quizId: number,
  ): Promise<LatestQuizResultResponseDto> {
    const result = await this.repo.findLatestResult(userId, quizId);
    return { result: result ? this.mapper.toQuizResultDto(result) : null };
  }

  /** Thay `QuizResult.tsx:110`. Không phải của mình (và không phải admin) → [] như RLS. */
  async getResultAnswers(
    user: AuthenticatedUser,
    resultId: number,
  ): Promise<UserAnswerDto[]> {
    const result = await this.repo.findResult(resultId);
    if (!result || !(await this.canSeeResult(user, result.userId))) return [];
    const answers = await this.repo.findUserAnswers(resultId);
    return answers.map((a) => this.mapper.toUserAnswerDto(a));
  }

  /**
   * Thay `QuizResult.tsx:46` (đề kèm đáp án đúng + lời giải). Chỉ trả khi người dùng
   * đã nộp quiz này ít nhất một lần, hoặc là admin.
   */
  async getReview(
    user: AuthenticatedUser,
    quizId: number,
  ): Promise<ReviewQuestionDto[]> {
    const allowed =
      (await this.repo.hasResult(user.id, quizId)) ||
      (await this.isAdmin(user));
    if (!allowed) {
      throw new ForbiddenException({
        code: 'QUIZ_NOT_ATTEMPTED',
        message: 'Nộp bài trước khi xem đáp án',
      });
    }
    const questions = await this.repo.findQuestionsWithAnswers(quizId);
    return questions.map((q) => this.mapper.toReviewQuestionDto(q));
  }

  private async canSeeResult(
    user: AuthenticatedUser,
    ownerId: string,
  ): Promise<boolean> {
    return ownerId === user.id || this.isAdmin(user);
  }

  private isAdmin(user: AuthenticatedUser): Promise<boolean> {
    return this.auth.hasRole(user.id, 'admin');
  }

  private async assertCanTake(
    quizId: number,
    user: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!(await this.learning.canTakeQuiz(quizId, user))) {
      throw new ForbiddenException({
        code: 'QUIZ_LOCKED',
        message: 'Bạn chưa có quyền làm bài này',
      });
    }
  }

  private quizNotFound(quizId: number): NotFoundException {
    return new NotFoundException({
      code: 'QUIZ_NOT_FOUND',
      message: `Không tìm thấy quiz ${quizId}`,
    });
  }
}
