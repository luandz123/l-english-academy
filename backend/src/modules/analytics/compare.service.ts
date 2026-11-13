import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { LearningService } from '../learning/learning.service';
import { splitPassage } from '../practice/question-tagger';
import { PART_FIRST_NUMBER } from './analytics-config';
import {
  accuracy,
  categoryLabel,
  emptyStat,
  type Stat,
} from './analytics-rules';
import { AnalyticsRepository } from './analytics.repository';
import { isFullAttempt, selectedParts } from './analytics.service';
import type { CompareDto } from './dto/analytics.dto';

const LISTENING = [1, 2, 3, 4];
const READING = [5, 6, 7];
const MIN_CATEGORY_EACH = 5;

/** So sánh 2–3 lượt Full Test của chính học viên (E09). Chỉ đọc; điểm lấy đúng như lúc chấm. */
@Injectable()
export class CompareService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly learning: LearningService,
  ) {}

  async compare(user: AuthenticatedUser, ids: number[]): Promise<CompareDto> {
    const unique = [...new Set(ids)];
    if (unique.length < 2 || unique.length > 3) {
      throw new BadRequestException({
        code: 'INVALID_COMPARE',
        message: 'Chọn 2 hoặc 3 lượt khác nhau',
      });
    }
    const rows = await this.repo.resultsByIds(unique);
    // Lượt không phải của mình (kể cả admin xem hộ) → coi như không tồn tại
    if (
      rows.length !== unique.length ||
      rows.some((r) => r.userId !== user.id)
    ) {
      throw new NotFoundException({
        code: 'RESULT_NOT_FOUND',
        message: 'Không tìm thấy bài làm',
      });
    }
    rows.sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0) ||
        a.id - b.id,
    );

    const questionIds = [
      ...new Set(
        rows.flatMap((r) => r.fullTestAnswerDetails.map((d) => d.questionId)),
      ),
    ];
    const questions = await this.repo.questionsForCompare(questionIds);
    const qById = new Map(questions.map((q) => [q.id, q]));

    const attempts = rows.map((r) => {
      const parts =
        selectedParts(r.answersDetail) ??
        [
          ...new Set(r.fullTestAnswerDetails.map((d) => d.partNumber ?? 0)),
        ].filter(Boolean);
      const byPart = new Map<number, Stat>();
      for (const d of r.fullTestAnswerDetails) {
        const part = d.partNumber ?? qById.get(d.questionId)?.toeicPart ?? 0;
        const s = byPart.get(part) ?? emptyStat();
        s.answered++;
        if (d.isCorrect) s.correct++;
        if (d.selectedAnswerId === null) s.blank++;
        byPart.set(part, s);
      }
      return {
        id: r.id,
        test_id: r.testId,
        title: r.fullTest?.title ?? `Đề #${r.testId}`,
        course_id: r.fullTest?.courseId ?? null,
        completed_at: r.completedAt?.toISOString() ?? null,
        parts: [...parts].sort((a, b) => a - b),
        full: isFullAttempt(r.answersDetail),
        total_score: r.totalScore,
        listening_score: r.listeningScore,
        reading_score: r.readingScore,
        time_spent_seconds: r.timeSpentSeconds,
        blank: r.fullTestAnswerDetails.filter(
          (d) => d.selectedAnswerId === null,
        ).length,
        by_part: Object.fromEntries(
          [...byPart.entries()].map(([p, s]) => [
            p,
            { correct: s.correct, total: s.answered, accuracy: accuracy(s) },
          ]),
        ),
      };
    });

    const oldest = attempts[0];
    const newest = attempts[attempts.length - 1];
    const hasAll = (a: (typeof attempts)[number], set: number[]) =>
      set.every((p) => a.parts.includes(p));
    const diff = (x: number | null, y: number | null) =>
      x !== null && y !== null ? y - x : null;
    const scoreDiff = {
      total:
        oldest.full && newest.full
          ? diff(oldest.total_score, newest.total_score)
          : null,
      listening:
        hasAll(oldest, LISTENING) && hasAll(newest, LISTENING)
          ? diff(oldest.listening_score, newest.listening_score)
          : null,
      reading:
        hasAll(oldest, READING) && hasAll(newest, READING)
          ? diff(oldest.reading_score, newest.reading_score)
          : null,
    };

    const parts = [1, 2, 3, 4, 5, 6, 7].map((p) => {
      const cells = attempts.map((a) =>
        a.parts.includes(p) ? (a.by_part[p] ?? null) : null,
      );
      const first = cells[0];
      const last = cells[cells.length - 1];
      return {
        part: p,
        cells,
        diff:
          first && last && first.accuracy !== null && last.accuracy !== null
            ? last.accuracy - first.accuracy
            : null,
      };
    });

    // Dạng câu thay đổi nhiều nhất (≥ 5 câu ở cả hai lượt)
    const catStats = (r: (typeof rows)[number]) => {
      const m = new Map<string, Stat>();
      for (const d of r.fullTestAnswerDetails) {
        const q = qById.get(d.questionId);
        if (!q?.questionCategory || !q.toeicPart) continue;
        const key = `${q.toeicPart}:${q.questionCategory}`;
        const s = m.get(key) ?? emptyStat();
        s.answered++;
        if (d.isCorrect) s.correct++;
        m.set(key, s);
      }
      return m;
    };
    const a0 = catStats(rows[0]);
    const a1 = catStats(rows[rows.length - 1]);
    const changes: {
      part: number;
      category: string;
      label: string;
      before: number;
      after: number;
      delta: number;
    }[] = [];
    for (const [key, s0] of a0) {
      const s1 = a1.get(key);
      if (
        !s1 ||
        s0.answered < MIN_CATEGORY_EACH ||
        s1.answered < MIN_CATEGORY_EACH
      )
        continue;
      const [p, cat] = [
        Number(key.split(':')[0]),
        key.split(':').slice(1).join(':'),
      ];
      const before = accuracy(s0) ?? 0;
      const after = accuracy(s1) ?? 0;
      changes.push({
        part: p,
        category: cat,
        label: categoryLabel(p, cat),
        before,
        after,
        delta: after - before,
      });
    }
    const up = changes
      .filter((c) => c.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);
    const down = changes
      .filter((c) => c.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);

    const sameTest = new Set(rows.map((r) => r.testId)).size === 1;
    let questionsBlock: CompareDto['questions'] = null;
    if (sameTest) {
      const accessible = await this.learning.canAccessCourse(
        rows[0].fullTest?.courseId ?? null,
        user,
      );
      const detailMaps = rows.map(
        (r) => new Map(r.fullTestAnswerDetails.map((d) => [d.questionId, d])),
      );
      const groups = {
        fixed: [] as unknown[],
        regressed: [] as unknown[],
        still_wrong: [] as unknown[],
        still_right: [] as unknown[],
      };
      const commonIds = questionIds.filter(
        (qid) =>
          detailMaps[0].has(qid) && detailMaps[detailMaps.length - 1].has(qid),
      );
      const ordered = commonIds
        .map((qid) => qById.get(qid))
        .filter((q): q is NonNullable<typeof q> => !!q)
        .sort(
          (x, y) =>
            (x.toeicPart ?? 0) - (y.toeicPart ?? 0) ||
            (x.partIndex ?? 0) - (y.partIndex ?? 0) ||
            x.id - y.id,
        );
      for (const q of ordered) {
        const per = detailMaps.map((m) => m.get(q.id) ?? null);
        const first = per[0]!;
        const last = per[per.length - 1]!;
        const correctNow =
          q.answers.find((a) => a.isCorrect === true)?.id ?? null;
        const letter = (aid: number | null) => {
          const i = q.answers.findIndex((a) => a.id === aid);
          return i >= 0 ? String.fromCharCode(65 + i) : null;
        };
        const part = q.toeicPart ?? first.partNumber ?? 0;
        const item = {
          question_id: q.id,
          number:
            q.partIndex !== null && PART_FIRST_NUMBER[part]
              ? PART_FIRST_NUMBER[part] + q.partIndex
              : null,
          part,
          category: q.questionCategory,
          label: q.questionCategory
            ? categoryLabel(part, q.questionCategory)
            : null,
          picks: per.map((d) =>
            d
              ? {
                  letter: letter(d.selectedAnswerId),
                  correct: d.isCorrect === true,
                }
              : null,
          ),
          correct_letter: letter(correctNow),
          // Đáp án đúng đã đổi sau lượt này: kết quả chấm lúc nộp khác với đáp án hiện tại
          answer_updated: per.some(
            (d) =>
              d !== null &&
              d.selectedAnswerId !== null &&
              (d.isCorrect === true) !== (d.selectedAnswerId === correctNow),
          ),
          content: accessible
            ? {
                text: splitPassage(q.questionText).text || null,
                answers: q.answers.map((a, i) => ({
                  letter: String.fromCharCode(65 + i),
                  text: a.answerText,
                })),
                explanation:
                  q.explanation ??
                  q.answers.find((a) => a.isCorrect)?.explanation ??
                  null,
                transcript: q.transcript,
              }
            : null,
        };
        const was = first.isCorrect === true;
        const now = last.isCorrect === true;
        if (!was && now) groups.fixed.push(item);
        else if (was && !now) groups.regressed.push(item);
        else if (!was && !now) groups.still_wrong.push(item);
        else groups.still_right.push(item);
      }
      questionsBlock = { accessible, ...groups };
    }

    return {
      attempts,
      same_test: sameTest,
      score_diff: scoreDiff,
      parts,
      category_changes: { up, down },
      questions: questionsBlock,
    };
  }
}
