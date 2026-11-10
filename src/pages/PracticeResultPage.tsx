import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Clock, Layers, RotateCcw, Sparkles, Target, Timer } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  bookmarkQuestions,
  createPracticeSession,
  getPracticeResult,
  type CreateSessionBody,
  type SessionResult,
} from "@/lib/api/practice";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";

const fmtTime = (s: number | null) => (s === null ? "—" : `${Math.floor(s / 60)} phút ${s % 60} giây`);

/** Lặp lại cấu hình lượt cũ để "Làm một lượt mới". */
function sameConfig(r: SessionResult): CreateSessionBody | null {
  const c = r.config as Record<string, unknown>;
  const base = { mode: r.mode, feedback: r.feedback, difficulty: (c.difficulty as CreateSessionBody["difficulty"]) ?? "all" };
  if (r.kind === "question_type") {
    return {
      ...base,
      kind: "question_type",
      parts: c.parts as number[],
      categories: c.categories as string[],
      passage_types: (c.passage_types as string[]) ?? [],
      count: r.total_questions,
      order: (c.order as "random" | "sequential") ?? "random",
    };
  }
  if (r.kind === "mini_test") {
    return {
      ...base,
      kind: "mini_test",
      skill: (c.skill as "listening" | "reading" | null) ?? undefined,
      parts: c.skill ? undefined : (c.parts as number[]),
      count: r.total_questions,
      time_limit_minutes: (c.time_limit_minutes as number | null) ?? undefined,
    };
  }
  if (r.kind === "mistakes") {
    return { ...base, kind: "mistakes", mistake_filter: (c.mistake_filter as CreateSessionBody["mistake_filter"]) ?? {} };
  }
  return null;
}

const PracticeResultPage: React.FC = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "wrong" | "unanswered" | "correct">("all");

  const { data: r, isLoading, isError, refetch } = useQuery({
    queryKey: ["practice-result", id, user?.id],
    queryFn: () => getPracticeResult(id),
    enabled: !!user && !!id,
  });

  const create = useMutation({
    mutationFn: (body: CreateSessionBody) => createPracticeSession(body),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      navigate(`/practice/session/${s.id}`);
    },
    onError: (err) => toast({ title: "Không tạo được lượt mới", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const wrongIds = useMemo(
    () => (r?.questions ?? []).filter((q) => q.selected_answer_id !== null && q.feedback && !q.feedback.is_correct).map((q) => q.id),
    [r],
  );
  const saveWrong = useMutation({
    mutationFn: () => bookmarkQuestions(wrongIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["practice-result", id] });
      void queryClient.invalidateQueries({ queryKey: ["mistake-summary"] });
      toast({ title: `Đã lưu ${wrongIds.length} câu sai vào Sổ câu sai` });
    },
    onError: (err) => toast({ title: "Không lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-[480px] w-full max-w-5xl mx-auto rounded-3xl" />
      </StudentLayout>
    );
  }
  if (isError || !r) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState title="Không tải được kết quả" message="Lượt luyện chưa nộp bài hoặc không tồn tại." onRetry={() => refetch()} />
        </div>
      </StudentLayout>
    );
  }

  const retryCount = (r.wrong_count ?? 0) + (r.unanswered_count ?? 0);
  const again = sameConfig(r);
  const shown = r.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => {
      const status = q.selected_answer_id === null ? "unanswered" : q.feedback?.is_correct ? "correct" : "wrong";
      return filter === "all" || filter === status;
    });
  const weakest = [...r.by_category].filter((c) => c.wrong + c.unanswered > 0).sort((a, b) => b.wrong - a.wrong)[0];

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        <div className="p-6 sm:p-8 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-5">
          <div>
            <div className="text-xs text-slate-400">Kết quả · mã lượt {r.code}</div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{r.title}</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Điểm</div>
              <div className="text-2xl font-black text-white">{r.correct_count ?? 0}/{r.total_questions}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400">Tỷ lệ chính xác</div>
              <div className={cn("text-2xl font-black", r.accuracy >= 70 ? "text-emerald-300" : r.accuracy >= 40 ? "text-amber-300" : "text-rose-300")}>
                {r.accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Thời gian</div>
              <div className="text-sm font-bold text-white mt-1">{fmtTime(r.time_spent_seconds)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> TB mỗi câu</div>
              <div className="text-sm font-bold text-white mt-1">
                {r.average_seconds_per_question === null ? "—" : `${r.average_seconds_per_question} giây`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">Đúng {r.correct_count ?? 0}</span>
            <span className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">Sai {r.wrong_count ?? 0}</span>
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold">Chưa trả lời {r.unanswered_count ?? 0}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {retryCount > 0 && (
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate({ kind: "retry", source_session_id: r.id, mode: "practice", feedback: "immediate" })}
                className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Luyện lại {retryCount} câu sai
              </button>
            )}
            {wrongIds.length > 0 && (
              <button
                type="button"
                disabled={saveWrong.isPending}
                onClick={() => saveWrong.mutate()}
                className="min-h-[44px] px-4 rounded-xl border border-amber-500/50 text-amber-300 font-bold text-sm flex items-center gap-1.5"
              >
                <BookmarkPlus className="w-4 h-4" /> Lưu câu sai
              </button>
            )}
            {again && (
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate(again)}
                className="min-h-[44px] px-4 rounded-xl border border-cyan-500/50 text-cyan-300 font-bold text-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Làm một lượt mới
              </button>
            )}
            <Link to="/analysis" className="min-h-[44px] px-4 rounded-xl border border-cyan-500/50 text-cyan-300 font-bold text-sm flex items-center gap-1.5">
              <Target className="w-4 h-4" /> {r.kind === "question_type" ? "Quay lại phân tích điểm yếu" : "Xem điểm yếu tổng hợp"}
            </Link>
            <Link to="/practice" className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Luyện dạng khác
            </Link>
          </div>
          <p className="text-xs text-slate-500">Câu trả lời sai đã được tự lưu vào <Link to="/mistakes" className="text-cyan-400 font-bold">Sổ câu sai</Link>.</p>
        </div>

        {(r.by_part.length > 1 || r.by_category.length > 1) && (
          <div className="p-5 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Phân tích kết quả</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {r.by_part.map((p) => (
                  <div key={p.part}>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span className="font-bold">Part {p.part}</span>
                      <span>{p.correct}/{p.total} đúng</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(p.correct / p.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {r.by_category.map((c) => (
                  <div key={`${c.part}-${c.category}`} className="flex justify-between text-xs text-slate-300 border-b border-slate-800/70 py-1">
                    <span>Part {c.part} · {c.label}</span>
                    <span className={cn("font-bold", c.wrong > 0 ? "text-rose-300" : "text-emerald-300")}>{c.correct}/{c.total}</span>
                  </div>
                ))}
              </div>
            </div>
            {weakest && <p className="text-xs text-amber-300">Gợi ý: luyện thêm dạng "{weakest.label}" (Part {weakest.part}).</p>}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ["all", `Tất cả (${r.questions.length})`],
              ["wrong", `Sai (${r.wrong_count ?? 0})`],
              ["unanswered", `Chưa làm (${r.unanswered_count ?? 0})`],
              ["correct", `Đúng (${r.correct_count ?? 0})`],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "min-h-[40px] px-3 rounded-xl border text-xs font-bold",
                  filter === k ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {shown.map(({ q, i }) => (
            <PracticeQuestionCard key={q.id} index={i} question={q} selectedId={q.selected_answer_id} feedback={q.feedback} disabled />
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default PracticeResultPage;
