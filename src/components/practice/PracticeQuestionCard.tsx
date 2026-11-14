import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerOption, QuestionFeedback } from "@/lib/api/practice";
import { AudioBox } from "./AudioBox";
import { BookmarkButton } from "./BookmarkButton";
import { ReportIssueButton } from "./ReportIssueButton";
import { InteractiveTranscript } from "@/components/vocabulary/InteractiveTranscript";
import { SelectionSaver } from "@/components/vocabulary/SelectionSaver";

export interface QuestionView {
  id: number;
  part: number | null;
  category_label: string | null;
  question_text: string | null;
  passage: string | null;
  audio_url: string | null;
  image_url: string | null;
  answers: AnswerOption[];
  source_test_title?: string | null;
  bookmarked?: boolean;
}

/**
 * Một câu hỏi luyện tập: giữ nguyên đoạn văn/audio/ảnh gốc của nhóm (không hiện câu đứng một mình
 * khi nó phụ thuộc passage). Đáp án đúng chỉ tô khi có `feedback` (server trả sau khi chốt / nộp).
 */
export const PracticeQuestionCard: React.FC<{
  index: number;
  question: QuestionView;
  selectedId: number | null;
  feedback: QuestionFeedback | null;
  disabled?: boolean;
  onSelect?: (answerId: number) => void;
  showContext?: boolean;
  transcript?: string | null;
}> = ({ index, question: q, selectedId, feedback, disabled, onSelect, showContext = true, transcript }) => {
  const isListening = (q.part ?? 5) <= 4;
  const hidePart2D = q.part === 2 && q.answers.length === 4;
  const hasPassage = showContext && !!q.passage;
  const correctId = feedback?.correct_answer_id ?? null;
  const shownTranscript = feedback?.transcript ?? transcript ?? null;

  return (
    <div className={cn("grid gap-4", hasPassage && "lg:grid-cols-2")}>
      {showContext && (q.passage || q.image_url || (isListening && q.audio_url)) && (
        <div
          className={cn(
            "p-4 sm:p-5 bg-[#070e1c] border border-slate-800 rounded-2xl space-y-4",
            hasPassage && "lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto",
          )}
        >
          {isListening && q.audio_url && <AudioBox src={q.audio_url} />}
          {q.image_url && (
            <div className="w-full flex justify-center bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 p-2">
              <img src={q.image_url} alt="Hình của câu hỏi" className="max-w-full h-auto rounded-lg max-h-[320px] object-contain" />
            </div>
          )}
          {q.passage &&
            (feedback ? (
              // Sau khi chốt câu: bôi đen từ trong đoạn văn để lưu vào Sổ từ vựng (V11)
              <SelectionSaver sourceRef={String(q.id)}>
                <div
                  className="prose prose-invert prose-slate max-w-[65ch] text-slate-200 text-base leading-[1.6] overflow-x-hidden"
                  dangerouslySetInnerHTML={{ __html: q.passage }}
                />
              </SelectionSaver>
            ) : (
              <div
                className="prose prose-invert prose-slate max-w-[65ch] text-slate-200 text-base leading-[1.6] overflow-x-hidden"
                dangerouslySetInnerHTML={{ __html: q.passage }}
              />
            ))}
        </div>
      )}

      <div className="p-4 sm:p-5 bg-[#070e1c] border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black text-xs">
              Câu {index + 1}
            </span>
            {q.part && (
              <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                Part {q.part}
              </span>
            )}
            {q.category_label && <span className="text-[11px] text-cyan-300 font-semibold">{q.category_label}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <BookmarkButton questionId={q.id} bookmarked={!!q.bookmarked} compact />
            <ReportIssueButton questionId={q.id} compact />
          </div>
        </div>

        {q.question_text && (
          <p className="text-base text-white font-semibold leading-relaxed whitespace-pre-line">{q.question_text}</p>
        )}

        <div className="space-y-2.5">
          {q.answers.map((opt, oi) => {
            if (hidePart2D && oi === 3) return null;
            const isSelected = selectedId === opt.id;
            const isCorrect = correctId === opt.id;
            let cls = "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700";
            let badge = "border-slate-700 bg-slate-800 text-slate-300";
            if (feedback) {
              if (isCorrect) {
                cls = "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-bold";
                badge = "border-emerald-500 bg-emerald-500 text-slate-950";
              } else if (isSelected) {
                cls = "border-rose-500 bg-rose-500/15 text-rose-200 font-bold";
                badge = "border-rose-500 bg-rose-500 text-white";
              } else {
                cls = "border-slate-800 bg-slate-900/40 text-slate-400";
              }
            } else if (isSelected) {
              cls = "border-[#2563EB] bg-[#1E3A8A]/30 text-blue-100 font-bold ring-1 ring-[#2563EB]/40";
              badge = "border-[#2563EB] bg-[#2563EB] text-white";
            }
            const explanation = feedback?.answer_explanations[String(opt.id)];
            return (
              <div key={opt.id} className="space-y-1">
                <button
                  type="button"
                  disabled={disabled || !!feedback}
                  onClick={() => onSelect?.(opt.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 min-h-[48px] rounded-xl border transition-all flex items-center select-none active:scale-[0.98] disabled:cursor-default",
                    cls,
                  )}
                >
                  <span className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mr-3.5 font-black text-xs", badge)}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="flex-1 text-sm font-semibold leading-relaxed">
                    {opt.answer_text ? (
                      opt.answer_text
                    ) : (
                      <span className="text-slate-600 italic font-normal tracking-widest">••••••••</span>
                    )}
                  </span>
                  {feedback && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {feedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
                {feedback && explanation && (isSelected || isCorrect) && (
                  <p className="text-xs text-slate-400 pl-12">{explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className="pt-3 border-t border-dashed border-slate-800 space-y-2.5">
            <div
              className={cn(
                "text-sm font-black flex items-center gap-2",
                feedback.selected_answer_id === null ? "text-slate-400" : feedback.is_correct ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {feedback.selected_answer_id === null ? "Chưa trả lời" : feedback.is_correct ? "Chính xác!" : "Chưa đúng"}
            </div>
            {feedback.translation && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
                <b className="text-white">Dịch nghĩa:</b> {feedback.translation}
              </div>
            )}
            {feedback.explanation && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 whitespace-pre-line">
                <b>Giải thích:</b> {feedback.explanation}
              </div>
            )}
            {shownTranscript && (
              <details className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-200">
                <summary className="font-bold cursor-pointer select-none">Xem transcript</summary>
                <InteractiveTranscript text={shownTranscript} sourceRef={String(q.id)} className="mt-2" />
              </details>
            )}
          </div>
        )}
        {q.source_test_title && <p className="text-[11px] text-slate-500">Nguồn: {q.source_test_title}</p>}
      </div>
    </div>
  );
};
