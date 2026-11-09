import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_DIFFICULTY } from './question-categories';
import { tagPart, type TaggerQuestion, yearFromTitle } from './question-tagger';

const CHUNK = 400;

/**
 * Chạy bộ gắn nhãn (question-tagger) trên các đề Full Test và ghi vào cột nhãn của `questions`.
 * - Tự chạy nền khi khởi động (trừ môi trường test) và trước khi đọc kho câu nếu còn câu chưa gắn.
 * - Câu admin đã sửa (`tag_source = 'admin'`) giữ nguyên dạng/độ khó; chỉ cập nhật Part, nhóm.
 */
@Injectable()
export class QuestionTaggingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuestionTaggingService.name);
  private running: Promise<number> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get<string>('NODE_ENV') === 'test') return;
    void this.ensureTagged().catch((err: unknown) =>
      this.logger.error(`Gắn nhãn nền lỗi: ${String(err)}`),
    );
  }

  /** Gắn nhãn các đề còn câu chưa gắn. Gọi đồng thời → dùng chung một lần chạy. */
  ensureTagged(): Promise<number> {
    this.running ??= this.tagPending().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Admin: gắn lại một đề (hoặc tất cả). overwrite = ghi đè cả nhãn tự động cũ (không đụng nhãn admin). */
  async retag(testId?: number): Promise<number> {
    const tests = testId
      ? await this.prisma.fullTest.findMany({
          where: { id: testId },
          select: { id: true, title: true, year: true },
        })
      : await this.prisma.fullTest.findMany({
          select: { id: true, title: true, year: true },
          orderBy: { id: 'asc' },
        });
    let n = 0;
    for (const t of tests) n += await this.tagTest(t);
    return n;
  }

  private async tagPending(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ test_id: number }[]>`
      SELECT DISTINCT s.test_id
      FROM full_test_sections s
      JOIN questions q ON q.quiz_id = s.quiz_id
      WHERE s.test_id IS NOT NULL AND q.tagged_at IS NULL
      ORDER BY s.test_id`;
    if (rows.length === 0) return 0;
    const tests = await this.prisma.fullTest.findMany({
      where: { id: { in: rows.map((r) => r.test_id) } },
      select: { id: true, title: true, year: true },
    });
    let n = 0;
    for (const t of tests) n += await this.tagTest(t);
    if (n > 0) this.logger.log(`Đã gắn nhãn ${n} câu hỏi (${tests.length} đề)`);
    return n;
  }

  private async tagTest(test: {
    id: number;
    title: string;
    year: number | null;
  }): Promise<number> {
    if (test.year === null) {
      const year = yearFromTitle(test.title);
      if (year)
        await this.prisma.fullTest.update({
          where: { id: test.id },
          data: { year },
        });
    }

    const sections = await this.prisma.fullTestSection.findMany({
      where: { testId: test.id, quizId: { not: null } },
      orderBy: { id: 'asc' },
    });
    const partByQuiz = new Map<number, number>();
    for (const s of sections) {
      if (s.quizId !== null && !partByQuiz.has(s.quizId))
        partByQuiz.set(s.quizId, s.partNumber);
    }
    if (partByQuiz.size === 0) return 0;

    const questions = await this.prisma.question.findMany({
      where: { quizId: { in: [...partByQuiz.keys()] } },
      select: {
        id: true,
        quizId: true,
        displayOrder: true,
        questionText: true,
        passageText: true,
        transcript: true,
        audioUrl: true,
        imageUrl: true,
        groupId: true,
        tagSource: true,
        sourceTestId: true,
        answers: { select: { id: true, answerText: true, isCorrect: true } },
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });

    // Câu đã thuộc đề khác (đề có id nhỏ hơn gắn trước) thì giữ đề nguồn cũ
    const own = questions.filter(
      (q) => q.sourceTestId === null || q.sourceTestId === test.id,
    );
    const audioShare = new Map<string, number>();
    for (const q of own) {
      if (q.audioUrl)
        audioShare.set(q.audioUrl, (audioShare.get(q.audioUrl) ?? 0) + 1);
    }
    const byPart = new Map<
      number,
      (TaggerQuestion & { tagSource: string | null })[]
    >();
    for (const q of own) {
      const part = partByQuiz.get(q.quizId!) ?? 5;
      if (!byPart.has(part)) byPart.set(part, []);
      byPart.get(part)!.push(q);
    }

    const updates: {
      id: number;
      part: number;
      groupKey: string;
      partIndex: number;
      category: string;
      passageType: string | null;
      eligible: boolean;
      keepLabels: boolean;
    }[] = [];
    for (const [part, qs] of byPart) {
      const adminIds = new Set(
        qs.filter((q) => q.tagSource === 'admin').map((q) => q.id),
      );
      for (const t of tagPart(test.id, part, qs, audioShare)) {
        updates.push({
          id: t.questionId,
          part: t.toeicPart,
          groupKey: t.groupKey,
          partIndex: t.partIndex,
          category: t.questionCategory,
          passageType: t.passageType,
          eligible: t.practiceEligible,
          keepLabels: adminIds.has(t.questionId),
        });
      }
    }

    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      const values = Prisma.join(
        chunk.map(
          (u) =>
            Prisma.sql`(${u.id}::int, ${u.part}::smallint, ${u.groupKey}::text, ${u.partIndex}::int, ${u.category}::text, ${u.passageType}::text, ${u.eligible}::boolean, ${u.keepLabels}::boolean)`,
        ),
      );
      await this.prisma.$executeRaw`
        UPDATE questions AS q SET
          toeic_part = v.part,
          source_test_id = ${test.id},
          group_key = v.group_key,
          part_index = v.part_index,
          question_category = CASE WHEN v.keep THEN q.question_category ELSE v.category END,
          passage_type = CASE WHEN v.keep THEN q.passage_type ELSE v.passage_type END,
          difficulty = COALESCE(q.difficulty, ${DEFAULT_DIFFICULTY}),
          tag_source = CASE WHEN v.keep THEN q.tag_source ELSE 'auto' END,
          practice_eligible = v.eligible,
          tagged_at = now()
        FROM (VALUES ${values}) AS v(id, part, group_key, part_index, category, passage_type, eligible, keep)
        WHERE q.id = v.id`;
    }
    return updates.length;
  }
}
