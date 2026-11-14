import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  GrammarExercise,
  GrammarMistake,
} from '../../generated/prisma/client';
import { nextMistakeState } from '../practice/practice-rules';
import type {
  MistakeGroupDto,
  MistakeItemDto,
  MistakesDto,
  MistakesQueryDto,
} from './dto/grammar.dto';
import { addDays, enterSchedule, vnDate } from './grammar-rules';
import { correctText, responseText } from './grammar.mapper';
import { GrammarRepository, type ToeicMistakeRow } from './grammar.repository';

export interface OpenInfo {
  open: number;
  earliest: Date | null;
  latest: Date | null;
}

/**
 * Sổ lỗi ngữ pháp (G07) và lịch ôn theo chủ điểm (G08). Câu TOEIC KHÔNG có bản thứ hai: đọc lại
 * từ sổ câu sai (practice). Lỗi bài tập chủ điểm theo đúng luật trạng thái của sổ câu sai.
 */
@Injectable()
export class GrammarMistakesService {
  constructor(private readonly repo: GrammarRepository) {}

  // ---------- Ghi lỗi bài tập chủ điểm ----------

  /** Sau mỗi câu bài tập: sai → lưu/tăng lỗi; đúng ở câu đang có lỗi → "Đã sửa đúng". Trả về true nếu vừa sửa xong. */
  async recordExercise(
    userId: string,
    ex: GrammarExercise,
    correct: boolean,
    response: string | null,
    now: Date,
  ): Promise<boolean> {
    const current = await this.repo.findMistake(userId, ex.id);
    const alive = current && !current.deletedAt ? current : null;
    if (!alive && correct) return false;
    if (alive) {
      const next = nextMistakeState(
        {
          wrongCount: alive.wrongCount,
          status: alive.status as 'not_reviewed' | 'improving' | 'fixed',
          reviewCount: alive.reviewCount,
          firstWrongAt: alive.firstWrongAt,
          lastWrongAt: alive.lastWrongAt,
          isBookmarked: alive.manual,
        },
        correct,
        now,
      )!;
      // Lỗi tự lưu (đúng do đoán, chưa từng sai): làm lại đúng → Đã sửa đúng
      const status =
        correct && alive.manual && alive.wrongCount === 0
          ? 'fixed'
          : next.status;
      await this.repo.updateMistake(alive.id, {
        wrongCount: next.wrongCount,
        status,
        reviewCount: next.reviewCount,
        firstWrongAt: next.firstWrongAt,
        lastWrongAt: next.lastWrongAt,
        lastResponse: response,
        answeredAt: now,
      });
      return correct && alive.status !== 'fixed' && status === 'fixed';
    }
    // Chưa có (hoặc đã xóa) và trả lời sai → tạo lỗi mới
    await this.repo.upsertMistake(userId, ex.id, {
      wrongCount: 1,
      status: 'not_reviewed',
      reviewCount: 0,
      firstWrongAt: now,
      lastWrongAt: now,
      lastResponse: response,
      answeredAt: now,
      manual: false,
      deletedAt: null,
      note: current?.note ?? null,
    });
    return false;
  }

  /** "Lưu lỗi này": câu đúng nhưng do đoán. Chỉ với câu học viên đã làm. */
  async saveManual(
    userId: string,
    exerciseId: number,
  ): Promise<{ saved: true }> {
    const ex = await this.repo.findExercise(exerciseId);
    if (!ex || !(await this.repo.hasAnsweredExercise(userId, exerciseId)))
      throw new NotFoundException({
        code: 'EXERCISE_NOT_FOUND',
        message: 'Không tìm thấy câu',
      });
    const current = await this.repo.findMistake(userId, exerciseId);
    if (current && !current.deletedAt) {
      if (current.status === 'fixed')
        await this.repo.updateMistake(current.id, {
          status: 'improving',
          manual: true,
        });
      return { saved: true };
    }
    await this.repo.upsertMistake(userId, exerciseId, {
      wrongCount: current?.wrongCount ?? 0,
      status: 'not_reviewed',
      reviewCount: current?.reviewCount ?? 0,
      manual: true,
      deletedAt: null,
      answeredAt: new Date(),
      note: current?.note ?? null,
    });
    return { saved: true };
  }

  async setExerciseNote(
    userId: string,
    mistakeExerciseId: number,
    note: string,
  ) {
    const m = await this.repo.findMistake(userId, mistakeExerciseId);
    if (!m || m.deletedAt)
      throw new NotFoundException({
        code: 'MISTAKE_NOT_FOUND',
        message: 'Không tìm thấy lỗi',
      });
    await this.repo.updateMistake(m.id, { note: note.trim() || null });
    return { ok: true as const };
  }

  async setQuestionNote(userId: string, questionId: number, note: string) {
    const rows = await this.repo.toeicMistakes(userId);
    if (!rows.some((r) => r.questionId === questionId))
      throw new NotFoundException({
        code: 'MISTAKE_NOT_FOUND',
        message: 'Không tìm thấy lỗi',
      });
    if (note.trim())
      await this.repo.upsertQuestionNote(userId, questionId, note.trim());
    else await this.repo.deleteQuestionNote(userId, questionId);
    return { ok: true as const };
  }

  /** Xóa lỗi bài tập chủ điểm (xóa mềm để "Hoàn tác"). */
  async removeExercise(userId: string, exerciseId: number) {
    const m = await this.repo.findMistake(userId, exerciseId);
    if (!m || m.deletedAt)
      throw new NotFoundException({
        code: 'MISTAKE_NOT_FOUND',
        message: 'Không tìm thấy lỗi',
      });
    await this.repo.updateMistake(m.id, { deletedAt: new Date() });
  }

  async restoreExercise(userId: string, exerciseId: number) {
    const m = await this.repo.findMistake(userId, exerciseId);
    if (!m)
      throw new NotFoundException({
        code: 'MISTAKE_NOT_FOUND',
        message: 'Không tìm thấy lỗi',
      });
    await this.repo.updateMistake(m.id, { deletedAt: null });
    return { ok: true as const };
  }

  // ---------- Lỗi chưa sửa theo chủ điểm + lịch ôn ----------

  async openByTopic(userId: string): Promise<{
    info: Map<number, OpenInfo>;
    ex: (GrammarMistake & { exercise: GrammarExercise })[];
    toeic: ToeicMistakeRow[];
  }> {
    const [ex, toeic] = await Promise.all([
      this.repo.exerciseMistakes(userId),
      this.repo.toeicMistakes(userId),
    ]);
    const info = new Map<number, OpenInfo>();
    const add = (topicId: number, at: Date | null) => {
      const cur = info.get(topicId) ?? {
        open: 0,
        earliest: null,
        latest: null,
      };
      cur.open++;
      if (at && (!cur.earliest || at < cur.earliest)) cur.earliest = at;
      if (at && (!cur.latest || at > cur.latest)) cur.latest = at;
      info.set(topicId, cur);
    };
    for (const m of ex) {
      if (m.status !== 'fixed' && (m.wrongCount > 0 || m.manual))
        add(m.exercise.topicId, m.lastWrongAt ?? m.createdAt);
    }
    for (const m of toeic) {
      if (m.status !== 'fixed') add(m.topicId, m.lastWrongAt ?? m.createdAt);
    }
    return { info, ex, toeic };
  }

  /**
   * Chủ điểm có lỗi chưa sửa mà chưa vào lịch → vào lịch, hạn đầu tiên = ngày hôm sau lỗi đầu tiên.
   * Chủ điểm đã "Đã vững" mà có lỗi mới (sau lần ôn cuối) → về nấc 1 ngày.
   */
  async syncSchedule(userId: string, info?: Map<number, OpenInfo>) {
    const open = info ?? (await this.openByTopic(userId)).info;
    const userTopics = new Map(
      (await this.repo.userTopics(userId)).map((u) => [u.topicId, u]),
    );
    for (const [topicId, o] of open) {
      if (o.open === 0) continue;
      const u = userTopics.get(topicId);
      const state = {
        step: u?.reviewStep ?? null,
        due: u?.reviewDue ? u.reviewDue.toISOString().slice(0, 10) : null,
        goodStreak: u?.reviewGoodStreak ?? 0,
        graduated: u?.reviewGraduated ?? false,
      };
      let from: Date | null = null;
      if (state.step === null && !state.graduated) from = o.earliest;
      else if (
        state.graduated &&
        o.latest &&
        (!u?.reviewLastAt || o.latest > u.reviewLastAt)
      )
        from = o.latest;
      if (!from) continue;
      const next = enterSchedule(
        { ...state, step: null, graduated: true },
        true,
        vnDate(from),
      )!;
      await this.repo.upsertUserTopic(userId, topicId, {
        reviewStep: next.step,
        reviewDue: next.due ? new Date(`${next.due}T00:00:00Z`) : null,
        reviewGoodStreak: 0,
        reviewGraduated: false,
      });
    }
  }

  // ---------- Danh sách sổ ----------

  async list(userId: string, q: MistakesQueryDto): Promise<MistakesDto> {
    const { info, ex, toeic } = await this.openByTopic(userId);
    await this.syncSchedule(userId, info);
    const [topics, userTopics, notes] = await Promise.all([
      this.repo.listTopics(true),
      this.repo.userTopics(userId),
      this.repo.questionNotes(userId),
    ]);
    const topicById = new Map(topics.map((t) => [t.id, t]));
    const utById = new Map(userTopics.map((u) => [u.topicId, u]));
    const noteOf = new Map(notes.map((n) => [n.questionId, n.note]));

    const questions = await this.repo.toeicQuestions(
      toeic.map((m) => m.questionId),
    );
    const qById = new Map(questions.map((x) => [x.id, x]));
    const titles = new Map(
      (
        await this.repo.testTitles([
          ...new Set(
            questions
              .map((x) => x.sourceTestId)
              .filter((x): x is number => x !== null),
          ),
        ])
      ).map((t) => [t.id, t.title]),
    );

    const items: (MistakeItemDto & { topicId: number; at: Date | null })[] = [];
    for (const m of ex) {
      if (m.wrongCount === 0 && !m.manual) continue;
      const e = m.exercise;
      items.push({
        topicId: e.topicId,
        at: m.lastWrongAt ?? m.createdAt,
        key: `ex-${e.id}`,
        type: 'ex',
        ref_id: e.id,
        source_label: `Bài tập chủ điểm · ${levelLabel(e.level)}`,
        level: e.level,
        status: m.status,
        wrong_count: m.wrongCount,
        last_wrong_at: m.lastWrongAt?.toISOString() ?? null,
        note: m.note,
        manual: m.manual,
        updated: !!m.answeredAt && e.updatedAt > m.answeredAt,
        unavailable: !e.active,
        kind: e.kind,
        prompt: e.prompt,
        passage: null,
        options: e.kind === 'choice' ? e.options : [],
        chosen: responseText(e, m.lastResponse),
        correct: correctText(e),
        explanation: e.explanation,
      });
    }
    for (const m of toeic) {
      const qq = qById.get(m.questionId);
      if (!qq) continue;
      const chosen = qq.answers.find((a) => a.id === m.lastSelectedAnswerId);
      const right = qq.answers.find((a) => a.isCorrect);
      const title = qq.sourceTestId ? titles.get(qq.sourceTestId) : null;
      items.push({
        topicId: m.topicId,
        at: m.lastWrongAt ?? m.createdAt,
        key: `q-${m.questionId}`,
        type: 'q',
        ref_id: m.questionId,
        source_label: [
          title ?? 'Câu TOEIC',
          qq.toeicPart ? `Part ${qq.toeicPart}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        level: null,
        status: m.status,
        wrong_count: m.wrongCount,
        last_wrong_at: m.lastWrongAt?.toISOString() ?? null,
        note: noteOf.get(m.questionId) ?? null,
        manual: m.isBookmarked && m.wrongCount === 0,
        updated: false,
        unavailable: false,
        kind: null,
        prompt: qq.questionText ?? '',
        passage: qq.passageText,
        options: qq.answers.map((a) => a.answerText ?? ''),
        chosen: chosen?.answerText ?? null,
        correct: m.wrongCount > 0 ? (right?.answerText ?? null) : null,
        explanation: m.wrongCount > 0 ? qq.explanation : null,
      });
    }

    const since = q.days ? Date.now() - q.days * 86_400_000 : null;
    const filtered = items.filter(
      (i) =>
        (!q.source ||
          (q.source === 'exercise' ? i.type === 'ex' : i.type === 'q')) &&
        (!q.status || i.status === q.status) &&
        (!since || (i.at && i.at.getTime() >= since)) &&
        (!q.repeated || i.wrong_count >= 2),
    );

    const groups = new Map<number, typeof filtered>();
    for (const i of filtered) {
      const list = groups.get(i.topicId) ?? [];
      list.push(i);
      groups.set(i.topicId, list);
    }
    const out: MistakeGroupDto[] = [];
    for (const [topicId, list] of groups) {
      const t = topicById.get(topicId);
      if (!t) continue;
      const u = utById.get(topicId);
      list.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
      out.push({
        topic: { id: t.id, slug: t.slug, name: t.name, hidden: t.hidden },
        open: list.filter((i) => i.status !== 'fixed').length,
        total: list.length,
        last_wrong_at:
          list
            .map((i) => i.last_wrong_at)
            .filter((x): x is string => !!x)
            .sort()
            .reverse()[0] ?? null,
        next_review:
          !t.hidden &&
          u?.reviewStep !== null &&
          u?.reviewStep !== undefined &&
          !u.reviewGraduated &&
          u.reviewDue
            ? u.reviewDue.toISOString().slice(0, 10)
            : null,
        items: list.map(stripInternal),
      });
    }
    out.sort((a, b) => b.open - a.open || b.total - a.total);
    const openTotal = [...info.values()].reduce((s, o) => s + o.open, 0);
    return {
      open: openTotal,
      topics_with_mistakes: [...info.values()].filter((o) => o.open > 0).length,
      total: items.length,
      groups: out,
    };
  }

  todayVn(now = new Date()): string {
    return vnDate(now);
  }

  tomorrowVn(now = new Date()): string {
    return addDays(vnDate(now), 1);
  }
}

function stripInternal(
  i: MistakeItemDto & { topicId?: number; at?: Date | null },
): MistakeItemDto {
  const out = { ...i };
  delete out.topicId;
  delete out.at;
  return out;
}

function levelLabel(l: string) {
  return l === 'basic' ? 'Cơ bản' : l === 'advanced' ? 'Nâng cao' : 'Trung cấp';
}
