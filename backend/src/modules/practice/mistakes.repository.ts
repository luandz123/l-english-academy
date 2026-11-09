import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUESTION_CONTENT_SELECT } from './practice.repository';
import type { MistakeState } from './practice-rules';

export interface MistakeFilter {
  skill?: 'listening' | 'reading';
  parts?: number[];
  categories?: string[];
  statuses?: string[];
  recentDays?: number;
  minWrong?: number;
  bookmarked?: boolean;
}

export type Tx = Prisma.TransactionClient;

/** Bảng mistake_notebook_items + mistake_attempts. */
@Injectable()
export class MistakesRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findItems(tx: Tx, userId: string, questionIds: number[]) {
    return tx.mistakeNotebookItem.findMany({
      where: { userId, questionId: { in: questionIds } },
    });
  }

  async saveState(
    tx: Tx,
    userId: string,
    questionId: number,
    existingId: number | null,
    state: MistakeState,
    selectedAnswerId: number | null,
    isCorrect: boolean,
    reviewedAt: Date | null,
  ): Promise<number> {
    const data = {
      wrongCount: state.wrongCount,
      status: state.status,
      reviewCount: state.reviewCount,
      firstWrongAt: state.firstWrongAt,
      lastWrongAt: state.lastWrongAt,
      ...(isCorrect ? {} : { lastSelectedAnswerId: selectedAnswerId }),
      ...(reviewedAt ? { lastReviewedAt: reviewedAt } : {}),
    };
    if (existingId !== null) {
      await tx.mistakeNotebookItem.update({ where: { id: existingId }, data });
      return existingId;
    }
    const row = await tx.mistakeNotebookItem.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: { userId, questionId, ...data },
      update: data,
    });
    return row.id;
  }

  addAttempt(
    tx: Tx,
    itemId: number,
    data: {
      selectedAnswerId: number | null;
      isCorrect: boolean;
      source: string;
      sourceId: string | null;
    },
  ) {
    return tx.mistakeAttempt.create({ data: { itemId, ...data } });
  }

  private where(
    userId: string,
    f: MistakeFilter,
  ): Prisma.MistakeNotebookItemWhereInput {
    const and: Prisma.MistakeNotebookItemWhereInput[] = [{ userId }];
    const q: Prisma.QuestionWhereInput = {};
    if (f.skill === 'listening') q.toeicPart = { in: [1, 2, 3, 4] };
    if (f.skill === 'reading') q.toeicPart = { in: [5, 6, 7] };
    if (f.parts?.length) {
      q.AND = [{ toeicPart: { in: f.parts } }];
    }
    if (f.categories?.length) q.questionCategory = { in: f.categories };
    if (Object.keys(q).length) and.push({ question: q });
    if (f.statuses?.length)
      and.push({ status: { in: f.statuses }, wrongCount: { gt: 0 } });
    if (f.recentDays) {
      and.push({
        lastWrongAt: { gte: new Date(Date.now() - f.recentDays * 86_400_000) },
      });
    }
    if (f.minWrong) and.push({ wrongCount: { gte: f.minWrong } });
    if (f.bookmarked === true) and.push({ isBookmarked: true });
    // Không lọc bookmark → chỉ hiện câu từng sai hoặc đã bookmark (dòng rỗng không tồn tại)
    and.push({ OR: [{ wrongCount: { gt: 0 } }, { isBookmarked: true }] });
    return { AND: and };
  }

  async list(userId: string, f: MistakeFilter, page: number, limit: number) {
    const where = this.where(userId, f);
    const [total, items] = await Promise.all([
      this.prisma.mistakeNotebookItem.count({ where }),
      this.prisma.mistakeNotebookItem.findMany({
        where,
        orderBy: [
          { lastWrongAt: { sort: 'desc', nulls: 'last' } },
          { bookmarkedAt: 'desc' },
          { id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: { question: { select: QUESTION_CONTENT_SELECT } },
      }),
    ]);
    return { total, items };
  }

  findQuestionIds(userId: string, f: MistakeFilter): Promise<number[]> {
    return this.prisma.mistakeNotebookItem
      .findMany({
        where: this.where(userId, f),
        select: { questionId: true },
        take: 500,
      })
      .then((rows) => rows.map((r) => r.questionId));
  }

  async summary(userId: string) {
    const rows = await this.prisma.$queryRaw<
      {
        total_wrong: bigint;
        fixed: bigint;
        improving: bigint;
        not_reviewed: bigint;
        bookmarked: bigint;
        listening: bigint;
        reading: bigint;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE m.wrong_count > 0) AS total_wrong,
        COUNT(*) FILTER (WHERE m.wrong_count > 0 AND m.status = 'fixed') AS fixed,
        COUNT(*) FILTER (WHERE m.wrong_count > 0 AND m.status = 'improving') AS improving,
        COUNT(*) FILTER (WHERE m.wrong_count > 0 AND m.status = 'not_reviewed') AS not_reviewed,
        COUNT(*) FILTER (WHERE m.is_bookmarked) AS bookmarked,
        COUNT(*) FILTER (WHERE q.toeic_part BETWEEN 1 AND 4) AS listening,
        COUNT(*) FILTER (WHERE q.toeic_part BETWEEN 5 AND 7) AS reading
      FROM mistake_notebook_items m
      JOIN questions q ON q.id = m.question_id
      WHERE m.user_id = ${userId}::uuid AND (m.wrong_count > 0 OR m.is_bookmarked)`;
    const r = rows[0];
    const n = (v: bigint | undefined) => Number(v ?? 0);
    return {
      total_wrong: n(r?.total_wrong),
      fixed: n(r?.fixed),
      improving: n(r?.improving),
      not_reviewed: n(r?.not_reviewed),
      bookmarked: n(r?.bookmarked),
      listening: n(r?.listening),
      reading: n(r?.reading),
    };
  }

  findItem(userId: string, id: number) {
    return this.prisma.mistakeNotebookItem.findFirst({ where: { id, userId } });
  }

  findAttempts(itemId: number) {
    return this.prisma.mistakeAttempt.findMany({
      where: { itemId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async setBookmark(
    userId: string,
    questionIds: number[],
    bookmarked: boolean,
  ): Promise<void> {
    if (bookmarked) {
      const now = new Date();
      await this.prisma.$transaction(
        questionIds.map((questionId) =>
          this.prisma.mistakeNotebookItem.upsert({
            where: { userId_questionId: { userId, questionId } },
            create: {
              userId,
              questionId,
              isBookmarked: true,
              bookmarkedAt: now,
            },
            update: { isBookmarked: true, bookmarkedAt: now },
          }),
        ),
      );
      return;
    }
    // Bỏ bookmark: giữ dòng nếu từng sai (lịch sử), xóa nếu chỉ là bookmark
    await this.prisma.$transaction([
      this.prisma.mistakeNotebookItem.updateMany({
        where: { userId, questionId: { in: questionIds } },
        data: { isBookmarked: false, bookmarkedAt: null },
      }),
      this.prisma.mistakeNotebookItem.deleteMany({
        where: {
          userId,
          questionId: { in: questionIds },
          wrongCount: 0,
          isBookmarked: false,
        },
      }),
    ]);
  }

  async bookmarkedIds(userId: string): Promise<number[]> {
    const rows = await this.prisma.mistakeNotebookItem.findMany({
      where: { userId, isBookmarked: true },
      select: { questionId: true },
    });
    return rows.map((r) => r.questionId);
  }

  findQuestionSources(ids: number[]) {
    return this.prisma.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, sourceTestId: true },
    });
  }
}
