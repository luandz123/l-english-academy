import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotebookFilter {
  q?: string;
  sources?: string[];
  parts?: number[];
  levels?: string[];
  states?: string[];
  due?: boolean;
}

/**
 * Bảng của module: vocab_entries, user_vocab, user_vocab_reviews, user_vocab_settings.
 * Đọc chỉ-đọc: vocab_questions (từ trong bộ flashcard) để tra nghĩa, questions để gắn nhãn Part.
 */
@Injectable()
export class VocabularyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Kho từ ----------

  findEntriesByKeys(keys: string[]) {
    if (keys.length === 0) return Promise.resolve([]);
    return this.prisma.vocabEntry.findMany({
      where: { wordKey: { in: keys } },
    });
  }

  findEntriesByIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.vocabEntry.findMany({ where: { id: { in: ids } } });
  }

  /** Từ trong các bộ flashcard (kho nội dung khóa học) khớp từ cần tra. */
  findPackWords(keys: string[]) {
    if (keys.length === 0) return Promise.resolve([]);
    return this.prisma.$queryRaw<
      {
        id: number;
        word: string;
        phonetic: string | null;
        definition_vi: string | null;
        definition_en: string | null;
        example_sentence: string | null;
      }[]
    >`
      SELECT id, word, phonetic, definition_vi, definition_en, example_sentence
      FROM vocab_questions
      WHERE lower(trim(word)) = ANY(${keys}::text[])
      ORDER BY (definition_vi IS NULL), id
      LIMIT 5`;
  }

  findPackWordsByIds(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.vocabQuestion.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        word: true,
        phonetic: true,
        definitionVi: true,
        definitionEn: true,
        exampleSentence: true,
      },
    });
  }

  async listEntries(
    f: { parts?: number[]; levels?: string[]; q?: string },
    page: number,
    limit: number,
  ) {
    const where: Prisma.VocabEntryWhereInput = {};
    if (f.parts?.length) where.toeicPart = { in: f.parts };
    if (f.levels?.length) where.level = { in: f.levels };
    if (f.q) where.wordKey = { contains: f.q.toLowerCase() };
    const [total, items] = await Promise.all([
      this.prisma.vocabEntry.count({ where }),
      this.prisma.vocabEntry.findMany({
        where,
        orderBy: [
          { frequency: 'desc' },
          { displayOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, items };
  }

  async entryFacets() {
    const rows = await this.prisma.vocabEntry.groupBy({
      by: ['toeicPart', 'level'],
      _count: { _all: true },
    });
    return rows.map((r) => ({
      part: r.toeicPart,
      level: r.level,
      count: r._count._all,
    }));
  }

  allEntriesForTagging() {
    return this.prisma.vocabEntry.findMany({
      select: { id: true, wordKey: true, source: true, tagSource: true },
    });
  }

  /** Văn bản của câu đã gắn Part (câu hỏi, đoạn văn, transcript, đáp án) — để đếm tần suất từ. */
  questionTexts() {
    return this.prisma.$queryRaw<{ part: number; text: string }[]>`
      SELECT q.toeic_part::int AS part,
             concat_ws(' ', q.question_text, q.passage_text, q.transcript,
               (SELECT string_agg(a.answer_text, ' ') FROM answers a WHERE a.question_id = q.id)) AS text
      FROM questions q WHERE q.toeic_part IS NOT NULL`;
  }

  async untaggedEntryCount(): Promise<number> {
    return this.prisma.vocabEntry.count({ where: { taggedAt: null } });
  }

  async saveTags(
    rows: {
      id: number;
      part: number | null;
      level: string;
      frequency: number;
      keep: boolean;
    }[],
  ) {
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300);
      const values = Prisma.join(
        chunk.map(
          (r) =>
            Prisma.sql`(${r.id}::int, ${r.part}::smallint, ${r.level}::text, ${r.frequency}::int, ${r.keep}::boolean)`,
        ),
      );
      await this.prisma.$executeRaw`
        UPDATE vocab_entries AS e SET
          toeic_part = CASE WHEN v.keep THEN e.toeic_part ELSE v.part END,
          level = CASE WHEN v.keep THEN e.level ELSE v.level END,
          tag_source = CASE WHEN v.keep THEN e.tag_source ELSE 'auto' END,
          frequency = v.frequency,
          tagged_at = now()
        FROM (VALUES ${values}) AS v(id, part, level, frequency, keep)
        WHERE e.id = v.id`;
    }
  }

  updateEntry(id: number, data: Prisma.VocabEntryUncheckedUpdateInput) {
    return this.prisma.vocabEntry.update({ where: { id }, data });
  }

  createEntry(data: Prisma.VocabEntryUncheckedCreateInput) {
    return this.prisma.vocabEntry.create({ data });
  }

  findEntry(id: number) {
    return this.prisma.vocabEntry.findUnique({ where: { id } });
  }

  // ---------- Sổ từ ----------

  private notebookWhere(
    userId: string,
    f: NotebookFilter,
    now: Date,
  ): Prisma.UserVocabWhereInput {
    const where: Prisma.UserVocabWhereInput = { userId };
    if (f.q) {
      where.OR = [
        { wordKey: { contains: f.q.toLowerCase() } },
        { definitionVi: { contains: f.q, mode: 'insensitive' } },
      ];
    }
    if (f.sources?.length) where.source = { in: f.sources };
    if (f.parts?.length) where.toeicPart = { in: f.parts };
    if (f.levels?.length) where.level = { in: f.levels };
    if (f.states?.length) where.state = { in: f.states };
    if (f.due) where.AND = [{ state: { not: 'new' } }, { dueAt: { lte: now } }];
    return where;
  }

  async listNotebook(
    userId: string,
    f: NotebookFilter,
    page: number,
    limit: number,
    now: Date,
  ) {
    const where = this.notebookWhere(userId, f, now);
    const [total, items] = await Promise.all([
      this.prisma.userVocab.count({ where }),
      this.prisma.userVocab.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { total, items };
  }

  async notebookSummary(userId: string, now: Date, dayStart: Date) {
    const [
      total,
      newCount,
      learning,
      review,
      mastered,
      due,
      introducedToday,
      reviewedToday,
    ] = await Promise.all([
      this.prisma.userVocab.count({ where: { userId } }),
      this.prisma.userVocab.count({ where: { userId, state: 'new' } }),
      this.prisma.userVocab.count({ where: { userId, state: 'learning' } }),
      this.prisma.userVocab.count({ where: { userId, state: 'review' } }),
      this.prisma.userVocab.count({ where: { userId, state: 'mastered' } }),
      this.prisma.userVocab.count({
        where: { userId, state: { not: 'new' }, dueAt: { lte: now } },
      }),
      this.prisma.userVocab.count({
        where: { userId, introducedAt: { gte: dayStart } },
      }),
      this.prisma.userVocabReview.count({
        where: { reviewedAt: { gte: dayStart }, userVocab: { userId } },
      }),
    ]);
    return {
      total,
      newCount,
      learning,
      review,
      mastered,
      due,
      introducedToday,
      reviewedToday,
    };
  }

  savedKeys(userId: string) {
    return this.prisma.userVocab
      .findMany({ where: { userId }, select: { wordKey: true, id: true } })
      .then((r) => new Map(r.map((x) => [x.wordKey, x.id])));
  }

  findByKey(userId: string, key: string) {
    return this.prisma.userVocab.findUnique({
      where: { userId_wordKey: { userId, wordKey: key } },
    });
  }

  findOwn(userId: string, id: number) {
    return this.prisma.userVocab.findFirst({ where: { id, userId } });
  }

  async createMany(
    rows: Prisma.UserVocabUncheckedCreateInput[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const res = await this.prisma.userVocab.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return res.count;
  }

  create(row: Prisma.UserVocabUncheckedCreateInput) {
    return this.prisma.userVocab.create({ data: row });
  }

  update(id: number, data: Prisma.UserVocabUncheckedUpdateInput) {
    return this.prisma.userVocab.update({ where: { id }, data });
  }

  async delete(userId: string, id: number): Promise<number> {
    const { count } = await this.prisma.userVocab.deleteMany({
      where: { id, userId },
    });
    return count;
  }

  // ---------- SRS ----------

  dueCards(userId: string, now: Date, take: number) {
    return this.prisma.userVocab.findMany({
      where: { userId, state: { not: 'new' }, dueAt: { lte: now } },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  newCards(userId: string, take: number) {
    if (take <= 0) return Promise.resolve([]);
    return this.prisma.userVocab.findMany({
      where: { userId, state: 'new' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  /** Ghi kết quả một lần ôn + lịch sử trong một transaction. */
  review(
    id: number,
    data: Prisma.UserVocabUncheckedUpdateInput,
    log: { rating: string; intervalDays: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.userVocab.update({ where: { id }, data });
      await tx.userVocabReview.create({
        data: {
          userVocabId: id,
          rating: log.rating,
          intervalDays: log.intervalDays,
        },
      });
      return card;
    });
  }

  settings(userId: string) {
    return this.prisma.userVocabSettings.findUnique({ where: { userId } });
  }

  saveSettings(userId: string, newPerDay: number) {
    return this.prisma.userVocabSettings.upsert({
      where: { userId },
      create: { userId, newPerDay },
      update: { newPerDay },
    });
  }
}
