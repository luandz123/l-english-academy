import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import {
  BookmarkedIdsDto,
  ListMistakesQueryDto,
  MistakeAttemptDto,
  MistakeFilterDto,
  MistakeListDto,
  MistakeSummaryDto,
} from './dto/practice.dto';
import {
  MistakesRepository,
  type MistakeFilter,
  type Tx,
} from './mistakes.repository';
import { PracticeAccessService } from './practice-access.service';
import { PracticeMapper } from './practice.mapper';
import { PracticeRepository } from './practice.repository';
import {
  nextMistakeState,
  type MistakeState,
  type MistakeStatus,
} from './practice-rules';

export interface GradedAnswer {
  questionId: number;
  selectedAnswerId: number | null;
  isCorrect: boolean;
}

/**
 * Sổ câu sai (R07 + L09 dùng chung). Server tự ghi khi chấm bài (Full Test, lượt luyện); học viên
 * chỉ bookmark/bỏ bookmark. Mỗi (học viên, câu) một dòng; lịch sử từng lần ở mistake_attempts.
 */
@Injectable()
export class MistakesService {
  constructor(
    private readonly repo: MistakesRepository,
    private readonly practiceRepo: PracticeRepository,
    private readonly access: PracticeAccessService,
    private readonly mapper: PracticeMapper,
  ) {}

  /**
   * Ghi kết quả chấm vào sổ câu sai. Chỉ câu có chọn đáp án (bỏ trống không phải "trả lời sai").
   * `tx` có thì chạy chung transaction của nơi gọi.
   */
  async recordAnswers(
    userId: string,
    answers: GradedAnswer[],
    source: { source: 'full_test' | 'practice'; sourceId: string },
    tx?: Tx,
  ): Promise<void> {
    const answered = answers.filter((a) => a.selectedAnswerId !== null);
    if (answered.length === 0) return;
    const run = async (t: Tx) => {
      const existing = await this.repo.findItems(
        t,
        userId,
        answered.map((a) => a.questionId),
      );
      const byQuestion = new Map(existing.map((e) => [e.questionId, e]));
      const now = new Date();
      for (const a of answered) {
        const row = byQuestion.get(a.questionId) ?? null;
        const current: MistakeState | null = row
          ? {
              wrongCount: row.wrongCount,
              status: row.status as MistakeStatus,
              reviewCount: row.reviewCount,
              firstWrongAt: row.firstWrongAt,
              lastWrongAt: row.lastWrongAt,
              isBookmarked: row.isBookmarked,
            }
          : null;
        const next = nextMistakeState(current, a.isCorrect, now);
        if (!next) continue;
        const reviewed = row !== null && row.wrongCount > 0 ? now : null;
        const itemId = await this.repo.saveState(
          t,
          userId,
          a.questionId,
          row?.id ?? null,
          next,
          a.selectedAnswerId,
          a.isCorrect,
          reviewed,
        );
        await this.repo.addAttempt(t, itemId, {
          selectedAnswerId: a.selectedAnswerId,
          isCorrect: a.isCorrect,
          source: source.source,
          sourceId: source.sourceId,
        });
      }
    };
    if (tx) await run(tx);
    else await this.repo.transaction(run);
  }

  async summary(userId: string): Promise<MistakeSummaryDto> {
    return this.repo.summary(userId);
  }

  async list(userId: string, q: ListMistakesQueryDto): Promise<MistakeListDto> {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const { total, items } = await this.repo.list(
      userId,
      toFilter(q),
      page,
      limit,
    );
    const groupKeys = [
      ...new Set(
        items.map((i) => i.question.groupKey).filter((k): k is string => !!k),
      ),
    ];
    const testIds = [
      ...new Set(
        items
          .map((i) => i.question.sourceTestId)
          .filter((k): k is number => k !== null),
      ),
    ];
    const [mates, titles] = await Promise.all([
      this.practiceRepo.findGroupMates(groupKeys),
      this.practiceRepo.findTestTitles(testIds),
    ]);
    const titleById = new Map(titles.map((t) => [t.id, t.title]));
    return {
      total,
      page,
      limit,
      items: items.map((i) => this.mapper.toMistakeItem(i, mates, titleById)),
    };
  }

  async history(userId: string, itemId: number): Promise<MistakeAttemptDto[]> {
    const item = await this.repo.findItem(userId, itemId);
    if (!item) {
      throw new NotFoundException({
        code: 'MISTAKE_NOT_FOUND',
        message: 'Không tìm thấy câu trong sổ',
      });
    }
    const rows = await this.repo.findAttempts(item.id);
    return rows.map((r) => ({
      id: r.id,
      selected_answer_id: r.selectedAnswerId,
      is_correct: r.isCorrect,
      source: r.source,
      source_id: r.sourceId,
      created_at: r.createdAt.toISOString(),
    }));
  }

  /** Bookmark chỉ cho câu thuộc đề học viên đang có quyền (không lộ câu của đề khóa). */
  async setBookmark(
    user: AuthenticatedUser,
    questionIds: number[],
    bookmarked: boolean,
  ): Promise<void> {
    const ids = [...new Set(questionIds)];
    if (bookmarked) {
      const sources = await this.repo.findQuestionSources(ids);
      if (sources.length !== ids.length) {
        throw new NotFoundException({
          code: 'QUESTION_NOT_FOUND',
          message: 'Không tìm thấy câu hỏi',
        });
      }
      const allowed = await this.access.accessibleTestIds(user);
      if (
        sources.some(
          (s) => s.sourceTestId === null || !allowed.has(s.sourceTestId),
        )
      ) {
        throw new ForbiddenException({
          code: 'QUESTION_LOCKED',
          message: 'Bạn chưa có quyền với câu hỏi này',
        });
      }
    }
    await this.repo.setBookmark(user.id, ids, bookmarked);
  }

  async bookmarkedIds(userId: string): Promise<BookmarkedIdsDto> {
    return { question_ids: await this.repo.bookmarkedIds(userId) };
  }

  questionIdsFor(userId: string, f: MistakeFilterDto): Promise<number[]> {
    return this.repo.findQuestionIds(userId, toFilter(f));
  }
}

function toFilter(q: MistakeFilterDto): MistakeFilter {
  return {
    skill: q.skill,
    parts: q.parts,
    categories: q.categories,
    statuses: q.statuses,
    recentDays: q.recent_days,
    minWrong: q.min_wrong,
    bookmarked: q.bookmarked,
  };
}
