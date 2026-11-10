import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PracticeSession } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { ANALYTICS_CONFIG } from '../analytics/analytics-config';
import {
  accuracy,
  aggregate,
  categoryLabel,
  estimateFromRows,
  levelOf,
  pickTopWeaknesses,
  type AnswerRow,
} from '../analytics/analytics-rules';
import { PracticeMapper } from './practice.mapper';
import { PracticeRepository } from './practice.repository';
import { shuffle } from './practice-rules';
import { QuestionTaggingService } from './question-tagging.service';

export const DIAGNOSTIC_SET_KEY = 'diagnostic_set';
export const DIAGNOSTIC_MINUTES = 40;

/** Cấu trúc bài kiểm tra trình độ (đặc tả P01 mục D, chủ dự án duyệt giữ nguyên). */
export const DIAGNOSTIC_STRUCTURE: {
  part: number;
  count: number;
  grouped: boolean;
}[] = [
  { part: 1, count: 3, grouped: false },
  { part: 2, count: 8, grouped: false },
  { part: 3, count: 9, grouped: true },
  { part: 4, count: 6, grouped: true },
  { part: 5, count: 10, grouped: false },
  { part: 6, count: 4, grouped: true },
  { part: 7, count: 10, grouped: true },
];

interface DiagnosticSet {
  question_ids: number[];
  generated_at: string;
  missing: { part: number; needed: number; got: number }[];
}

interface BankQuestion {
  id: number;
  part: number;
  groupKey: string | null;
  partIndex: number | null;
  category: string | null;
  sourceTestId: number | null;
}

/**
 * Chọn câu cho một Part: Part không nhóm → xoay vòng theo dạng câu để trải đều; Part có nhóm
 * (đoạn hội thoại / đoạn văn) → lấy nguyên nhóm, ưu tiên nhóm có dạng chưa có, tới khi đủ số câu
 * (Part 7 cho phép dư/thiếu 1–2 câu vì nhóm không chia nhỏ được).
 */
export function pickForPart(
  bank: BankQuestion[],
  count: number,
  grouped: boolean,
  random: () => number = Math.random,
): number[] {
  if (!grouped) {
    const byCat = new Map<string, BankQuestion[]>();
    for (const q of shuffle(bank, random)) {
      const k = q.category ?? 'other';
      byCat.set(k, [...(byCat.get(k) ?? []), q]);
    }
    const lists = [...byCat.values()];
    const out: number[] = [];
    for (
      let i = 0;
      out.length < count && lists.some((l) => l.length > i);
      i++
    ) {
      for (const l of lists) if (l[i] && out.length < count) out.push(l[i].id);
    }
    return out;
  }
  const groups = new Map<string, BankQuestion[]>();
  for (const q of bank) {
    const k = q.groupKey ?? `q${q.id}`;
    groups.set(k, [...(groups.get(k) ?? []), q]);
  }
  const out: number[] = [];
  const seenCats = new Set<string>();
  const pool = shuffle([...groups.values()], random);
  while (out.length < count && pool.length > 0) {
    const remaining = count - out.length;
    pool.sort((a, b) => {
      const newA = a.filter((q) => !seenCats.has(q.category ?? '')).length;
      const newB = b.filter((q) => !seenCats.has(q.category ?? '')).length;
      const fitA = a.length <= remaining + 1 ? 1 : 0;
      const fitB = b.length <= remaining + 1 ? 1 : 0;
      return fitB - fitA || newB - newA;
    });
    const g = pool.shift()!;
    if (g.length > remaining + 1 && out.length > 0) continue;
    for (const q of [...g].sort(
      (a, b) => (a.partIndex ?? 0) - (b.partIndex ?? 0),
    )) {
      out.push(q.id);
      seenCats.add(q.category ?? '');
    }
  }
  return out;
}

/**
 * Bài kiểm tra trình độ (P01). Bộ ~50 câu do hệ thống tự rút từ kho đã gắn nhãn (cố định cho mọi
 * người, admin tạo lại được), miễn phí cho mọi tài khoản. Làm như một lượt luyện chế độ Test.
 */
@Injectable()
export class DiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PracticeRepository,
    private readonly mapper: PracticeMapper,
    private readonly tagging: QuestionTaggingService,
  ) {}

  async readSet(): Promise<DiagnosticSet | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: DIAGNOSTIC_SET_KEY },
    });
    if (!row?.value) return null;
    try {
      const parsed = JSON.parse(row.value) as DiagnosticSet;
      return Array.isArray(parsed.question_ids) &&
        parsed.question_ids.length > 0
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  /** Tạo (lại) bộ câu. Thiếu Part nào thì ghi vào `missing` để admin biết, không chặn. */
  async generate(): Promise<DiagnosticSet | null> {
    await this.tagging.ensureTagged();
    const bank = await this.prisma.question.findMany({
      where: {
        practiceEligible: true,
        toeicPart: { not: null },
        sourceTestId: { not: null },
      },
      select: {
        id: true,
        toeicPart: true,
        groupKey: true,
        partIndex: true,
        questionCategory: true,
        sourceTestId: true,
      },
    });
    const reviewTests = new Set(
      (
        await this.prisma.fullTest.findMany({
          where: { verificationStatus: 'needs_review' },
          select: { id: true },
        })
      ).map((t) => t.id),
    );
    const ids: number[] = [];
    const missing: DiagnosticSet['missing'] = [];
    for (const s of DIAGNOSTIC_STRUCTURE) {
      const partBank = bank
        .filter(
          (q) => q.toeicPart === s.part && !reviewTests.has(q.sourceTestId!),
        )
        .map((q) => ({
          id: q.id,
          part: q.toeicPart!,
          groupKey: q.groupKey,
          partIndex: q.partIndex,
          category: q.questionCategory,
          sourceTestId: q.sourceTestId,
        }));
      const picked = pickForPart(partBank, s.count, s.grouped);
      if (picked.length < s.count)
        missing.push({ part: s.part, needed: s.count, got: picked.length });
      ids.push(...picked);
    }
    if (ids.length === 0) return null;
    const set: DiagnosticSet = {
      question_ids: ids,
      generated_at: new Date().toISOString(),
      missing,
    };
    await this.prisma.platformSetting.upsert({
      where: { key: DIAGNOSTIC_SET_KEY },
      create: { key: DIAGNOSTIC_SET_KEY, value: JSON.stringify(set) },
      update: { value: JSON.stringify(set), updatedAt: new Date() },
    });
    return set;
  }

  /** Bộ câu hiện tại; chưa có thì tự tạo lần đầu (kho chưa có câu → null, ẩn mọi lối vào). */
  async ensureSet(): Promise<DiagnosticSet | null> {
    return (await this.readSet()) ?? (await this.generate());
  }

  async adminStatus() {
    const set = await this.readSet();
    return set
      ? this.describe(set)
      : {
          available: false,
          total_questions: 0,
          structure: [],
          missing: [],
          generated_at: null,
        };
  }

  private async describe(set: DiagnosticSet) {
    const qs = await this.repo.findQuestionSources(set.question_ids);
    const count = new Map<number, number>();
    for (const q of qs)
      count.set(q.toeicPart ?? 0, (count.get(q.toeicPart ?? 0) ?? 0) + 1);
    return {
      available: true,
      total_questions: qs.length,
      structure: DIAGNOSTIC_STRUCTURE.map((s) => ({
        part: s.part,
        count: count.get(s.part) ?? 0,
      })),
      missing: set.missing,
      generated_at: set.generated_at,
    };
  }

  async status(user: AuthenticatedUser) {
    const set = await this.ensureSet();
    if (!set) {
      return {
        available: false,
        total_questions: 0,
        minutes: DIAGNOSTIC_MINUTES,
        structure: [],
        in_progress: null,
        latest: null,
        retake_warning: false,
        recent_full_test: null,
      };
    }
    const info = await this.describe(set);
    const [inProgress, submitted, fullTest] = await Promise.all([
      this.prisma.practiceSession.findFirst({
        where: { userId: user.id, kind: 'diagnostic', status: 'in_progress' },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.practiceSession.findFirst({
        where: { userId: user.id, kind: 'diagnostic', status: 'submitted' },
        orderBy: { submittedAt: 'desc' },
      }),
      this.recentFullTest(user.id),
    ]);
    const latestReport = submitted
      ? await this.report(user, submitted.id)
      : null;
    const answered = inProgress
      ? ((await this.repo.countAnswered([inProgress.id]))[0]?._count._all ?? 0)
      : 0;
    return {
      available: true,
      total_questions: info.total_questions,
      minutes: DIAGNOSTIC_MINUTES,
      structure: info.structure,
      in_progress: inProgress
        ? this.mapper.toSummary(inProgress, answered)
        : null,
      latest: latestReport
        ? {
            session_id: submitted!.id,
            submitted_at: submitted!.submittedAt?.toISOString() ?? null,
            usable: latestReport.usable,
            total: latestReport.estimate.total,
          }
        : null,
      retake_warning:
        !!submitted?.submittedAt &&
        Date.now() - submitted.submittedAt.getTime() < 7 * 86_400_000,
      recent_full_test: fullTest,
    };
  }

  private async recentFullTest(userId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.userFullTestResult.findMany({
      where: { userId, completedAt: { gte: since } },
      orderBy: { completedAt: 'desc' },
      include: { fullTest: { select: { title: true, courseId: true } } },
      take: 10,
    });
    const full = rows.find((r) => {
      const meta = (
        r.answersDetail as { _meta?: { selected_parts?: unknown } } | null
      )?._meta;
      return (
        !meta ||
        !Array.isArray(meta.selected_parts) ||
        meta.selected_parts.length >= 7
      );
    });
    return full
      ? {
          result_id: full.id,
          test_id: full.testId,
          course_id: full.fullTest?.courseId ?? null,
          title: full.fullTest?.title ?? `Đề #${full.testId}`,
          total_score: full.totalScore,
          completed_at: full.completedAt?.toISOString() ?? null,
        }
      : null;
  }

  /** Bắt đầu (hoặc tiếp tục) bài chẩn đoán. `restart` = bỏ lượt dở và làm lại từ đầu. */
  async start(user: AuthenticatedUser, restart: boolean) {
    const set = await this.ensureSet();
    if (!set) {
      throw new NotFoundException({
        code: 'DIAGNOSTIC_UNAVAILABLE',
        message: 'Bài kiểm tra trình độ chưa sẵn sàng',
      });
    }
    const current = await this.prisma.practiceSession.findFirst({
      where: { userId: user.id, kind: 'diagnostic', status: 'in_progress' },
      orderBy: { startedAt: 'desc' },
    });
    if (current && !restart) {
      const answered =
        (await this.repo.countAnswered([current.id]))[0]?._count._all ?? 0;
      return this.mapper.toSummary(current, answered);
    }
    if (current)
      await this.repo.updateSession(current.id, { status: 'abandoned' });
    // Nghe trước rồi Đọc, theo thứ tự Part như đề thật
    const qs = await this.repo.findQuestionSources(set.question_ids);
    const partOf = new Map(qs.map((q) => [q.id, q.toeicPart ?? 5]));
    const ids = set.question_ids
      .filter((id) => partOf.has(id))
      .sort((a, b) => (partOf.get(a) ?? 5) - (partOf.get(b) ?? 5));
    const session = await this.repo.createSession({
      userId: user.id,
      kind: 'diagnostic',
      skill: 'mixed',
      mode: 'test',
      feedback: 'end',
      questionIds: ids,
      totalQuestions: ids.length,
      timeLimitSeconds: DIAGNOSTIC_MINUTES * 60,
      config: {
        title: 'Bài kiểm tra trình độ',
        parts: [...new Set(partOf.values())].sort(),
        order: 'sequential',
      },
    });
    return this.mapper.toSummary(session, 0);
  }

  async report(user: AuthenticatedUser, sessionId: string) {
    const s = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
    });
    if (!s || s.userId !== user.id || s.kind !== 'diagnostic') {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Không tìm thấy bài kiểm tra',
      });
    }
    if (s.status !== 'submitted') {
      throw new ForbiddenException({
        code: 'SESSION_NOT_SUBMITTED',
        message: 'Bài kiểm tra chưa nộp',
      });
    }
    return this.buildReport(s);
  }

  private async buildReport(s: PracticeSession) {
    const [answers, questions] = await Promise.all([
      this.repo.findAnswers(s.id),
      this.repo.findQuestionsContent(s.questionIds),
    ]);
    const qById = new Map(questions.map((q) => [q.id, q]));
    const aById = new Map(answers.map((a) => [a.questionId, a]));
    const rows: AnswerRow[] = s.questionIds
      .map((qid) => qById.get(qid))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map((q) => {
        const a = aById.get(q.id);
        return {
          source: 'practice' as const,
          attemptId: s.id,
          kind: 'diagnostic',
          at: s.submittedAt ?? s.startedAt,
          questionId: q.id,
          part: q.toeicPart ?? 5,
          category: q.questionCategory,
          passageType: q.passageType,
          blank: !a || a.selectedAnswerId === null,
          correct: a?.isCorrect === true,
          timeSeconds: a?.timeSeconds ?? null,
        };
      });
    const estimate = estimateFromRows(rows);
    const agg = aggregate(rows);
    const weak = pickTopWeaknesses(
      agg.byCategory,
      ANALYTICS_CONFIG.minAnswersPerCategoryDiagnostic,
    );
    return {
      session_id: s.id,
      submitted_at: s.submittedAt?.toISOString() ?? null,
      total_questions: rows.length,
      answered: rows.filter((r) => !r.blank).length,
      correct: rows.filter((r) => r.correct).length,
      blank: rows.filter((r) => r.blank).length,
      usable: estimate.usable,
      estimate: {
        listening: estimate.listening && {
          min: estimate.listening.min,
          max: estimate.listening.max,
          score: estimate.listening.score,
        },
        reading: estimate.reading && {
          min: estimate.reading.min,
          max: estimate.reading.max,
          score: estimate.reading.score,
        },
        total: estimate.total,
        margin: estimate.margin,
      },
      parts: [1, 2, 3, 4, 5, 6, 7].map((p) => {
        const st = agg.byPart.get(p);
        return {
          part: p,
          correct: st?.correct ?? 0,
          total: st?.answered ?? 0,
          accuracy: st ? accuracy(st) : null,
          level: st ? levelOf(st, 1) : 'insufficient',
        };
      }),
      weak: weak.items
        .filter((i) => (accuracy(i.stat) ?? 0) < ANALYTICS_CONFIG.goodFrom)
        .map((i) => ({
          part: i.part,
          category: i.category,
          label: categoryLabel(i.part, i.category),
          accuracy: accuracy(i.stat),
          answered: i.stat.answered,
        })),
    };
  }
}
