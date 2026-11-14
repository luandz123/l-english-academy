import type {
  GrammarExercise,
  GrammarFormula,
  GrammarTopic,
} from '../../generated/prisma/client';
import type { AdminExerciseDto, FormulaDto } from './dto/grammar.dto';
import { errorSegments } from './grammar-rules';

/** Chuyển bản ghi DB sang DTO (không trả entity thẳng ra ngoài). */
export function toFormulaDto(f: GrammarFormula): FormulaDto {
  const examples = Array.isArray(f.examples)
    ? (f.examples as { en?: unknown; vi?: unknown }[])
        .filter((e) => typeof e?.en === 'string')
        .map((e) => ({
          en: String(e.en),
          ...(typeof e.vi === 'string' && e.vi ? { vi: e.vi } : {}),
        }))
    : [];
  return {
    id: f.id,
    pattern: f.pattern,
    usage: f.usage,
    examples,
    sort_order: f.sortOrder,
  };
}

/** Câu bài tập cho học viên: KHÔNG có đáp án. */
export function toExerciseView(e: GrammarExercise) {
  return {
    id: e.id,
    kind: e.kind,
    level: e.level,
    prompt: e.prompt,
    options: e.kind === 'choice' ? e.options : [],
    segments: e.kind === 'error' ? errorSegments(e.prompt) : [],
  };
}

export function toAdminExercise(e: GrammarExercise): AdminExerciseDto {
  return {
    id: e.id,
    topic_id: e.topicId,
    kind: e.kind,
    level: e.level,
    prompt: e.prompt,
    options: e.options,
    answer_index: e.answerIndex,
    accepted_answers: e.acceptedAnswers,
    explanation: e.explanation,
    lesson_section: e.lessonSection,
    active: e.active,
  };
}

/** Đáp án đúng dạng chữ (cho Sổ lỗi ngữ pháp). */
export function correctText(e: GrammarExercise): string {
  if (e.kind === 'fill') return e.acceptedAnswers.join(' / ');
  if (e.kind === 'error')
    return errorSegments(e.prompt)[e.answerIndex ?? -1] ?? '';
  return e.options[e.answerIndex ?? -1] ?? '';
}

/** Câu trả lời đã lưu (chuỗi) → chữ hiển thị. */
export function responseText(e: GrammarExercise, response: string | null) {
  if (response === null) return null;
  if (e.kind === 'fill') return response;
  const i = Number(response);
  if (e.kind === 'error') return errorSegments(e.prompt)[i] ?? null;
  return e.options[i] ?? null;
}

export function lessonOf(t: GrammarTopic): Record<string, unknown> | null {
  return t.lesson && typeof t.lesson === 'object' && !Array.isArray(t.lesson)
    ? t.lesson
    : null;
}

/** Chủ điểm hiện với học viên: không ẩn và có bài học hoặc bài tập. */
export function isVisible(
  t: GrammarTopic & { _count?: { exercises: number } },
): boolean {
  return !t.hidden && (lessonOf(t) !== null || (t._count?.exercises ?? 0) > 0);
}
