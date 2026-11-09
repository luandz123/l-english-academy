import { Injectable } from '@nestjs/common';
import type { PracticeSession } from '../../generated/prisma/client';
import type {
  MistakeItemDto,
  QuestionFeedbackDto,
  SessionQuestionDto,
  SessionSummaryDto,
} from './dto/practice.dto';
import { partDef } from './question-categories';
import { splitPassage } from './question-tagger';
import type { QuestionContent } from './practice.repository';

export interface GroupMate {
  id: number;
  groupKey: string | null;
  partIndex: number | null;
  questionText: string | null;
  passageText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  transcript: string | null;
}

export function categoryLabel(
  part: number | null,
  key: string | null,
): string | null {
  if (part === null || key === null) return null;
  return partDef(part)?.categories.find((c) => c.key === key)?.label ?? key;
}

/** Mã lượt luyện ngắn để hiển thị (8 ký tự đầu của uuid). */
export const sessionCode = (id: string) =>
  id.replace(/-/g, '').slice(0, 8).toUpperCase();

@Injectable()
export class PracticeMapper {
  /** Đoạn văn / audio / ảnh / transcript: của chính câu, nếu không có thì của nhóm. */
  context(q: QuestionContent, mates: GroupMate[]) {
    const own = splitPassage(q.questionText);
    const group = q.groupKey
      ? mates.filter((m) => m.groupKey === q.groupKey)
      : [];
    const firstOf = (pick: (m: GroupMate) => string | null | undefined) => {
      for (const m of group) {
        const v = pick(m);
        if (v) return v;
      }
      return null;
    };
    return {
      text: own.text || null,
      passage:
        q.passageText?.trim() ||
        own.passage ||
        firstOf(
          (m) => m.passageText?.trim() || splitPassage(m.questionText).passage,
        ),
      audioUrl: q.audioUrl || firstOf((m) => m.audioUrl),
      imageUrl: q.imageUrl || firstOf((m) => m.imageUrl),
      transcript: q.transcript || firstOf((m) => m.transcript),
    };
  }

  feedback(
    q: QuestionContent,
    selectedAnswerId: number | null,
    transcript: string | null,
  ): QuestionFeedbackDto {
    const correct = q.answers.find((a) => a.isCorrect === true);
    const answerExplanations: Record<string, string> = {};
    for (const a of q.answers)
      if (a.explanation) answerExplanations[String(a.id)] = a.explanation;
    return {
      is_correct: selectedAnswerId !== null && correct?.id === selectedAnswerId,
      selected_answer_id: selectedAnswerId,
      correct_answer_id: correct?.id ?? 0,
      explanation: q.explanation ?? correct?.explanation ?? null,
      answer_explanations: answerExplanations,
      transcript,
      translation: q.translation ?? null,
    };
  }

  toSessionQuestion(
    q: QuestionContent,
    mates: GroupMate[],
    titles: Map<number, string>,
    opts: {
      selectedAnswerId: number | null;
      reveal: boolean;
      bookmarked: boolean;
    },
  ): SessionQuestionDto {
    const ctx = this.context(q, mates);
    const part = q.toeicPart ?? 5;
    return {
      id: q.id,
      part,
      category: q.questionCategory,
      category_label: categoryLabel(part, q.questionCategory),
      passage_type: q.passageType,
      group_key: q.groupKey,
      question_text: ctx.text,
      passage: ctx.passage,
      audio_url: ctx.audioUrl,
      image_url: ctx.imageUrl,
      // Đáp án KHÔNG kèm is_correct/lời giải: chỉ trả qua `feedback` khi được xem
      answers: q.answers.map((a) => ({ id: a.id, answer_text: a.answerText })),
      source_test_id: q.sourceTestId,
      source_test_title:
        q.sourceTestId !== null ? (titles.get(q.sourceTestId) ?? null) : null,
      bookmarked: opts.bookmarked,
      selected_answer_id: opts.selectedAnswerId,
      feedback: opts.reveal
        ? this.feedback(q, opts.selectedAnswerId, ctx.transcript)
        : null,
    };
  }

  toSummary(s: PracticeSession, answeredCount: number): SessionSummaryDto {
    const config = (s.config ?? {}) as Record<string, unknown>;
    return {
      id: s.id,
      code: sessionCode(s.id),
      kind: s.kind,
      title: typeof config.title === 'string' ? config.title : 'Lượt luyện',
      skill: s.skill,
      mode: s.mode,
      feedback: s.feedback,
      status: s.status,
      total_questions: s.totalQuestions,
      answered_count: answeredCount,
      correct_count: s.correctCount,
      wrong_count: s.wrongCount,
      unanswered_count: s.unansweredCount,
      time_limit_seconds: s.timeLimitSeconds,
      time_spent_seconds: s.timeSpentSeconds,
      started_at: s.startedAt.toISOString(),
      submitted_at: s.submittedAt?.toISOString() ?? null,
      daily_date: s.dailyDate ? s.dailyDate.toISOString().slice(0, 10) : null,
      config,
    };
  }

  toMistakeItem(
    item: {
      id: number;
      questionId: number;
      wrongCount: number;
      status: string;
      reviewCount: number;
      isBookmarked: boolean;
      firstWrongAt: Date | null;
      lastWrongAt: Date | null;
      lastReviewedAt: Date | null;
      lastSelectedAnswerId: number | null;
      question: QuestionContent;
    },
    mates: GroupMate[],
    titles: Map<number, string>,
  ): MistakeItemDto {
    const q = item.question;
    const ctx = this.context(q, mates);
    const correct = q.answers.find((a) => a.isCorrect === true);
    return {
      id: item.id,
      question_id: item.questionId,
      part: q.toeicPart,
      category: q.questionCategory,
      category_label: categoryLabel(q.toeicPart, q.questionCategory),
      question_text: ctx.text,
      passage: ctx.passage,
      audio_url: ctx.audioUrl,
      image_url: ctx.imageUrl,
      transcript: ctx.transcript,
      answers: q.answers.map((a) => ({ id: a.id, answer_text: a.answerText })),
      selected_answer_id: item.lastSelectedAnswerId,
      correct_answer_id: correct?.id ?? null,
      explanation: q.explanation ?? correct?.explanation ?? null,
      source_test_id: q.sourceTestId,
      source_test_title:
        q.sourceTestId !== null ? (titles.get(q.sourceTestId) ?? null) : null,
      wrong_count: item.wrongCount,
      status: item.status,
      review_count: item.reviewCount,
      is_bookmarked: item.isBookmarked,
      first_wrong_at: item.firstWrongAt?.toISOString() ?? null,
      last_wrong_at: item.lastWrongAt?.toISOString() ?? null,
      last_reviewed_at: item.lastReviewedAt?.toISOString() ?? null,
    };
  }
}
