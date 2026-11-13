import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, ClipboardCheck, Crosshair, ListChecks, Lock, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { advanceRoadmap, type Roadmap } from "@/lib/api/roadmap";
import { createPracticeSession } from "@/lib/api/practice";

const card =
  "p-5 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)]";

const FOCUS_ROWS = [
  { key: "listening", label: "Nghe", color: "bg-cyan-400" },
  { key: "reading", label: "Đọc", color: "bg-blue-500" },
  { key: "grammar", label: "Ngữ pháp", color: "bg-amber-400" },
  { key: "vocab", label: "Từ vựng", color: "bg-emerald-400" },
] as const;

/** Phần cá nhân hóa của lộ trình (P03): trọng tâm theo điểm yếu, tỉ trọng điều chỉnh, việc tuần này. */
export const RoadmapPersonalPanel: React.FC<{ roadmap: Roadmap }> = ({ roadmap }) => {
  const p = roadmap.personal;
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const advance = useMutation({
    mutationFn: advanceRoadmap,
    onSuccess: (data) => {
      queryClient.setQueryData(["roadmap", user?.id], data);
      toast({ title: "Đã chuyển sang chặng mới" });
    },
    onError: (err) => toast({ title: "Chưa chuyển được chặng", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const practice = useMutation({
    mutationFn: (f: { part: number; category: string; available: number }) =>
      createPracticeSession({
        kind: "question_type",
        parts: [f.part],
        categories: [f.category],
        count: Math.min(10, f.available),
        mode: "practice",
        feedback: "immediate",
        unseen_only: true,
      }),
    onSuccess: (s) => navigate(`/practice/session/${s.id}`),
    onError: (err) => toast({ title: "Chưa tạo được lượt luyện", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  if (!p) return null;
  const phase = roadmap.phases[roadmap.summary.current_phase_index];

  return (
    <div className="space-y-4">
      {p.notices.map((n) => (
        <div
          key={n.type}
          className={cn(
            "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm",
            n.type === "score_exceeded" || n.type === "phase_done"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/40 bg-amber-500/10 text-amber-100",
          )}
        >
          <span className="flex items-start gap-2">
            <BellRing className="w-4 h-4 shrink-0 mt-0.5" /> {n.message}
          </span>
          {n.action?.kind === "advance" ? (
            <button
              type="button"
              disabled={advance.isPending}
              onClick={() => advance.mutate()}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shrink-0"
            >
              {n.action.label}
            </button>
          ) : n.action?.url ? (
            <Link to={n.action.url} className="min-h-[40px] px-4 rounded-xl border border-emerald-500/50 font-bold text-xs inline-flex items-center shrink-0">
              {n.action.label}
            </Link>
          ) : null}
        </div>
      ))}

      <div className={cn(card, "space-y-4")}>
        <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-rose-400" /> Trọng tâm của bạn{phase ? ` · chặng ${phase.title}` : ""}
        </h3>
        {p.focus_source === null ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Chưa có dữ liệu điểm yếu, lộ trình đang chia đều theo chặng. Làm bài kiểm tra trình độ để cá nhân hóa.</p>
            <Link to="/diagnostic" className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> Làm bài kiểm tra trình độ
            </Link>
          </div>
        ) : p.focus.length === 0 ? (
          <p className="text-sm text-slate-300">Các dạng yếu hiện nằm ngoài phạm vi chặng này.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {p.focus.map((f) => (
              <div key={`${f.part}-${f.category}`} className="p-4 rounded-2xl border border-slate-800 bg-[#030712]/90 space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400">Part {f.part}</div>
                <div className="text-sm font-black text-white">{f.label}</div>
                <div className={cn("text-sm font-bold", f.achieved ? "text-emerald-300" : "text-rose-300")}>
                  hiện {f.accuracy}% → cần {f.required}%
                </div>
                {f.achieved ? (
                  <span className="text-xs text-emerald-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã đạt
                  </span>
                ) : f.practice.action === "practice" ? (
                  <button
                    type="button"
                    disabled={practice.isPending}
                    onClick={() => practice.mutate({ part: f.part, category: f.category, available: f.practice.available })}
                    className="min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" /> Luyện dạng này
                  </button>
                ) : f.practice.action === "review" ? (
                  <Link to={`/mistakes?parts=${f.part}&categories=${f.category}`} className="min-h-[40px] px-3 rounded-xl border border-rose-500/40 text-rose-300 text-xs font-bold inline-flex items-center">
                    Ôn lại câu đã sai
                  </Link>
                ) : f.practice.action === "locked" ? (
                  <Link to="/fulltests?access=premium" className="min-h-[40px] px-3 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Cần mở khóa đề
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">Chưa có câu mới cho dạng này</span>
                )}
              </div>
            ))}
          </div>
        )}
        {p.deferred.length > 0 && <p className="text-xs text-slate-500">Để dành cho chặng sau: {p.deferred.join(", ")}</p>}

        {p.adjustment_note && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400">Tỉ trọng đã điều chỉnh</div>
            {FOCUS_ROWS.map((row) => (
              <div key={row.key} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-slate-300">{row.label}</span>
                <div className="flex-1 h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                  <div className={cn("h-full", row.color)} style={{ width: `${p.adjusted_focus[row.key]}%` }} />
                </div>
                <span className="w-9 text-right text-white font-bold">{p.adjusted_focus[row.key]}%</span>
              </div>
            ))}
            <p className="text-xs text-cyan-300">{p.adjustment_note}</p>
          </div>
        )}
      </div>

      <div className={cn(card, "space-y-3")}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cyan-400" /> Việc tuần này
          </h3>
          <span className="text-xs font-bold text-slate-300">
            {p.week.completed}/{p.week.total} việc
          </span>
        </div>
        <ul className="space-y-2">
          {p.week.tasks.map((t) => {
            const done = t.done >= t.target;
            return (
              <li key={t.key} className="p-3 rounded-xl border border-slate-800 bg-[#030712]/80 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className={cn("text-sm font-bold flex items-center gap-1.5", done ? "text-emerald-300" : "text-white")}>
                    {done && <CheckCircle2 className="w-4 h-4" />} {t.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${Math.round((t.done / t.target) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {t.done}/{t.target} {t.unit}
                    </span>
                  </div>
                </div>
                {!done && (
                  <Link to={t.url} className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center justify-center shrink-0">
                    Làm ngay
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-slate-500">Tiến độ tự cập nhật từ bài đã nộp. Tuần mới bắt đầu thứ Hai.</p>
      </div>
    </div>
  );
};
