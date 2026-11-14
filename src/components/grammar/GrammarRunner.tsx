import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookmarkPlus, BookOpen, CheckCircle2, ListChecks, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";
import { FormulaCard, FormulaDialog, LessonSectionDialog } from "./LessonView";
import {
  KIND_LABELS,
  LEVEL_LABELS,
  answerGrammarItem,
  finishGrammarSession,
  saveExerciseMistake,
  splitErrorPrompt,
  type GrammarResult,
  type GrammarSession,
  type ItemFeedback,
  type LessonSection,
  type SessionItem,
} from "@/lib/api/grammar";

type Answer = { choice?: number; text?: string; answer_id?: number };
const LETTERS = ["A", "B", "C", "D"];

/** Một câu bài tập chủ điểm (chọn đáp án / điền từ / tìm lỗi sai), phản hồi ngay sau khi trả lời. */
const ExerciseBody: React.FC<{
  item: SessionItem;
  feedback: ItemFeedback | null;
  pending: boolean;
  onAnswer: (a: Answer) => void;
}> = ({ item, feedback, pending, onAnswer }) => {
  const ex = item.exercise!;
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chosen = feedback?.response !== null && feedback?.response !== undefined && ex.kind !== "fill" ? Number(feedback.response) : null;
  useEffect(() => {
    setText("");
    if (ex.kind === "fill") inputRef.current?.focus();
  }, [ex.id, ex.kind]);

  const optionCls = (i: number) =>
    cn(
      "w-full min-h-[48px] px-4 py-2 rounded-xl border text-left text-sm font-medium flex items-center gap-3 transition-colors",
      !feedback && "border-slate-700 bg-slate-900/60 hover:border-cyan-500/60 text-slate-100",
      feedback && i === feedback.correct_choice && "border-emerald-500/60 bg-emerald-500/10 text-emerald-100",
      feedback && i === chosen && i !== feedback.correct_choice && "border-rose-500/60 bg-rose-500/10 text-rose-100",
      feedback && i !== chosen && i !== feedback.correct_choice && "border-slate-800 text-slate-400",
    );

  if (ex.kind === "choice") {
    const parts = ex.prompt.split("___");
    return (
      <div className="space-y-4">
        <p className="text-base sm:text-lg text-white leading-relaxed">
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              {p}
              {i < parts.length - 1 && <span className="inline-block min-w-[64px] border-b-2 border-cyan-400 mx-1" />}
            </React.Fragment>
          ))}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {ex.options.map((o, i) => (
            <button key={i} type="button" disabled={!!feedback || pending} onClick={() => onAnswer({ choice: i })} className={optionCls(i)}>
              <span className="w-7 h-7 shrink-0 rounded-lg border border-current/40 flex items-center justify-center text-xs font-black">{LETTERS[i]}</span>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (ex.kind === "error") {
    return (
      <div className="space-y-4">
        <p className="text-xs text-slate-400">Chọn phần SAI trong câu (bấm vào phần gạch chân hoặc phím 1–4).</p>
        <p className="text-base sm:text-lg text-white leading-loose">
          {splitErrorPrompt(ex.prompt).map((p, i) =>
            p.seg === null ? (
              <React.Fragment key={i}>{p.text}</React.Fragment>
            ) : (
              <button
                key={i}
                type="button"
                disabled={!!feedback || pending}
                onClick={() => onAnswer({ choice: p.seg! })}
                className={cn(
                  "inline-flex items-baseline gap-1 px-1.5 rounded-md underline underline-offset-4 decoration-2 min-h-[36px]",
                  !feedback && "decoration-cyan-400 hover:bg-cyan-500/15",
                  feedback && p.seg === feedback.correct_choice && "decoration-emerald-400 bg-emerald-500/15 text-emerald-100",
                  feedback && p.seg === chosen && p.seg !== feedback.correct_choice && "decoration-rose-400 bg-rose-500/15 text-rose-100",
                  feedback && p.seg !== chosen && p.seg !== feedback.correct_choice && "decoration-slate-600",
                )}
              >
                {p.text}
                <sub className="text-[10px] font-black text-slate-400 no-underline">{LETTERS[p.seg!]}</sub>
              </button>
            ),
          )}
        </p>
      </div>
    );
  }

  // Điền từ
  const parts = ex.prompt.split("___");
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Gõ dạng đúng của từ trong ngoặc.</p>
      <p className="text-base sm:text-lg text-white leading-relaxed">
        {parts[0]}
        <span className="inline-block min-w-[64px] border-b-2 border-cyan-400 mx-1 text-cyan-200 font-bold">{feedback ? feedback.response : " "}</span>
        {parts.slice(1).join("___")}
      </p>
      {!feedback && (
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onAnswer({ text: text.trim() });
          }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder="Nhập câu trả lời…"
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-base focus:border-cyan-400 outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || pending}
            className="min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm disabled:opacity-50"
          >
            Kiểm tra
          </button>
        </form>
      )}
    </div>
  );
};

/**
 * Làm một lượt bài tập chủ điểm / phiên ôn / làm lại lỗi: mỗi màn một câu, phản hồi ngay.
 * Phiên ôn: trước câu đầu tiên của mỗi chủ điểm có màn nhắc công thức.
 */
export const GrammarRunner: React.FC<{
  session: GrammarSession;
  onFinished: (r: GrammarResult) => void;
  compact?: boolean;
}> = ({ session, onFinished, compact }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<Record<number, ItemFeedback>>(() =>
    Object.fromEntries(session.items.filter((i) => i.feedback).map((i) => [i.index, i.feedback!])),
  );
  const [saved, setSaved] = useState<Set<number>>(() => new Set(session.items.filter((i) => i.saved && i.exercise).map((i) => i.exercise!.id)));
  const firstOpen = session.items.findIndex((i) => !i.feedback);
  const [index, setIndex] = useState(firstOpen === -1 ? Math.max(0, session.items.length - 1) : firstOpen);
  const [recapSeen, setRecapSeen] = useState<Set<number>>(
    () => new Set(session.items.filter((i) => i.feedback).map((i) => i.topic_id)),
  );
  const [lesson, setLesson] = useState<{ slug: string; section: LessonSection | null } | null>(null);
  const [formulaFor, setFormulaFor] = useState<number | null>(null);
  const item = session.items[index];
  const fb = item ? feedback[item.index] ?? null : null;
  const isReview = session.kind === "review";
  const showRecap = isReview && item && !recapSeen.has(item.topic_id) && !fb;
  const answeredCount = Object.keys(feedback).length;
  const correctCount = Object.values(feedback).filter((f) => f.correct).length;

  const answer = useMutation({
    mutationFn: (a: Answer) => answerGrammarItem(session.id, { index: item.index, ...a }),
    onSuccess: (res) => {
      setFeedback((f) => ({ ...f, [item.index]: res }));
      void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] });
    },
    onError: (err) => toast({ title: "Chưa ghi được câu trả lời", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const finish = useMutation({
    mutationFn: () => finishGrammarSession(session.id),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["grammar-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["grammar-topic"] });
      void queryClient.invalidateQueries({ queryKey: ["grammar-review"] });
      void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] });
      onFinished(r);
    },
    onError: (err) => toast({ title: "Chưa nộp được lượt", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const save = useMutation({
    mutationFn: (exerciseId: number) => saveExerciseMistake(exerciseId),
    onSuccess: (_r, exerciseId) => {
      setSaved((s) => new Set(s).add(exerciseId));
      void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] });
      toast({ title: "Đã lưu vào Sổ lỗi ngữ pháp" });
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const isLast = index >= session.items.length - 1;
  const next = () => {
    if (isLast) finish.mutate();
    else setIndex((i) => i + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (!item || answer.isPending || finish.isPending) return;
      if (showRecap) {
        if (e.key === "Enter") setRecapSeen((s) => new Set(s).add(item.topic_id));
        return;
      }
      if (fb && e.key === "Enter") {
        e.preventDefault();
        next();
        return;
      }
      const n = Number(e.key);
      if (!fb && n >= 1 && n <= 4 && item.type === "ex" && item.exercise!.kind !== "fill") answer.mutate({ choice: n - 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const recap = item ? session.recap[String(item.topic_id)] : undefined;
  const topicCount = useMemo(() => new Set(session.items.map((i) => i.topic_id)).size, [session.items]);

  if (!item) return <p className="text-sm text-slate-400">Lượt này không có câu nào.</p>;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Câu {index + 1}/{session.items.length}
              {isReview && topicCount > 1 && <> · {item.topic_name}</>}
            </span>
            <span>
              Đúng {correctCount}/{answeredCount}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(answeredCount / session.items.length) * 100}%` }} />
          </div>
        </div>
      )}

      {showRecap ? (
        <div className="p-5 rounded-3xl border border-cyan-500/30 bg-[#070e1c]/90 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Nhắc lại công thức</p>
            <h2 className="text-xl font-black text-white">{item.topic_name}</h2>
          </div>
          <div className="space-y-3">
            {recap?.formulas.map((f) => <FormulaCard key={f.id} formula={f} />)}
            {!!recap?.mistakes.length && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Lỗi hay gặp</p>
                {recap.mistakes.map((m, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    <span className="text-rose-300 line-through">{m.wrong}</span> → <span className="text-emerald-300">{m.right}</span>
                  </p>
                ))}
              </div>
            )}
            {!!recap?.notes.length && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Ghi chú của bạn</p>
                {recap.notes.map((n, i) => (
                  <p key={i} className="text-sm text-amber-200">• {n}</p>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setRecapSeen((s) => new Set(s).add(item.topic_id))}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            Làm câu <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={cn("space-y-4", !compact && "p-4 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90")}>
          {item.type === "ex" && item.exercise ? (
            <>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300">Bài tập chủ điểm · {KIND_LABELS[item.exercise.kind]}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{LEVEL_LABELS[item.exercise.level]}</span>
              </div>
              <ExerciseBody item={item} feedback={fb} pending={answer.isPending} onAnswer={(a) => answer.mutate(a)} />
            </>
          ) : item.question ? (
            <>
              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[11px] font-bold">Câu TOEIC · Part {item.question.part}</span>
              <PracticeQuestionCard
                index={index}
                question={item.question}
                selectedId={fb?.response ? Number(fb.response) : null}
                feedback={fb?.toeic ?? null}
                disabled={!!fb || answer.isPending}
                onSelect={(id) => !fb && answer.mutate({ answer_id: id })}
              />
            </>
          ) : (
            <p className="text-sm text-slate-400">Câu không còn khả dụng.</p>
          )}

          {fb && (
            <div className="pt-3 border-t border-dashed border-slate-800 space-y-3">
              <p className={cn("text-sm font-black flex items-center gap-2", fb.correct ? "text-emerald-400" : "text-rose-400")}>
                {fb.correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {fb.correct ? "Chính xác!" : "Chưa đúng"}
              </p>
              {item.type === "ex" && !fb.correct && fb.accepted.length > 0 && (
                <p className="text-sm text-slate-300">
                  Đáp án đúng: <b className="text-emerald-300">{fb.accepted.join(" / ")}</b>
                </p>
              )}
              {item.type === "ex" && fb.explanation && (
                <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200 whitespace-pre-line">
                  <b>Giải thích:</b> {fb.explanation}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {item.type === "ex" && (
                  <button
                    type="button"
                    onClick={() => setLesson({ slug: item.topic_slug, section: fb.lesson_section })}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" /> Xem lại phần này trong bài học
                  </button>
                )}
                {isReview && !fb.correct && (
                  <button
                    type="button"
                    onClick={() => setFormulaFor(item.topic_id)}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <ListChecks className="w-4 h-4" /> Xem lại công thức
                  </button>
                )}
                {item.type === "ex" && fb.correct && session.kind !== "retry" && (
                  <button
                    type="button"
                    disabled={saved.has(item.exercise!.id) || save.isPending}
                    onClick={() => save.mutate(item.exercise!.id)}
                    className="min-h-[40px] px-3 rounded-xl border border-amber-500/40 text-amber-200 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <BookmarkPlus className="w-4 h-4" /> {saved.has(item.exercise!.id) ? "Đã lưu vào sổ" : "Lưu lỗi này"}
                  </button>
                )}
              </div>
              {!compact && (
                <button
                  type="button"
                  onClick={next}
                  disabled={finish.isPending}
                  className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLast ? "Xem kết quả" : "Câu tiếp"} <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {compact && (
                <button
                  type="button"
                  onClick={() => finish.mutate()}
                  disabled={finish.isPending}
                  className="w-full min-h-[44px] rounded-xl border border-slate-700 text-slate-200 font-bold text-sm"
                >
                  Xong
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <LessonSectionDialog slug={lesson?.slug ?? null} section={lesson?.section ?? null} onClose={() => setLesson(null)} />
      <FormulaDialog
        title={formulaFor !== null ? session.items.find((i) => i.topic_id === formulaFor)?.topic_name ?? "" : null}
        formulas={formulaFor !== null ? session.recap[String(formulaFor)]?.formulas ?? [] : []}
        onClose={() => setFormulaFor(null)}
      />
    </div>
  );
};
