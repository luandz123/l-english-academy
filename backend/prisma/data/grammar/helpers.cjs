/**
 * Cú pháp gọn để soạn nội dung ngữ pháp mẫu (D16). Sinh JSON đúng định dạng nhập của
 * POST /grammar/admin/import và migration 20261114000000_grammar.
 *   c(level, prompt, options, answerIndex, explanation, section)  — chọn đáp án
 *   f(level, prompt, acceptedAnswers, explanation, section)        — điền dạng đúng (có ___ và từ trong ngoặc)
 *   e(level, prompt, wrongIndex, explanation, section)             — tìm lỗi sai (4 phần [[...]])
 * level: B = Cơ bản, I = Trung cấp, A = Nâng cao.
 */
const LV = { B: 'basic', I: 'intermediate', A: 'advanced' };

const c = (level, prompt, options, answer_index, explanation, lesson_section = 'structure') => ({
  kind: 'choice',
  level: LV[level],
  prompt,
  options,
  answer_index,
  explanation,
  lesson_section,
});

const f = (level, prompt, accepted_answers, explanation, lesson_section = 'structure') => ({
  kind: 'fill',
  level: LV[level],
  prompt,
  accepted_answers,
  explanation,
  lesson_section,
});

const e = (level, prompt, answer_index, explanation, lesson_section = 'mistakes') => ({
  kind: 'error',
  level: LV[level],
  prompt,
  answer_index,
  explanation,
  lesson_section,
});

const ex = (en, vi) => ({ en, vi });
const mi = (wrong, right, note) => ({ wrong, right, note });
const fo = (pattern, usage, examples) => ({ pattern, usage, examples });

module.exports = { c, f, e, ex, mi, fo, LV };
