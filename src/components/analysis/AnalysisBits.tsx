import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock, Lock, Minus, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { createPracticeSession, DIFFICULTY_LABELS } from "@/lib/api/practice";
import {
  getRecommendations,
  LEVEL_CLASS,
  LEVEL_LABELS,
  skipRecommendation,
  type CategoryAnalysis,
  type ExamRecommendation,
  type Level,
  type OtherRecommendation,
  type Recommendation,
  type Trend,
} from "@/lib/api/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { examRecUrl } from "./recUrl";

export const TrendBadge: React.FC<{ trend: Trend | null }> = ({ trend }) => {
  if (!trend) return null;
  const meta = {
    up: { icon: ArrowUpRight, cls: "text-emerald-300", label: "cải thiện" },
    down: { icon: ArrowDownRight, cls: "text-rose-300", label: "giảm" },
    flat: { icon: Minus, cls: "text-slate-400", label: "giữ nguyên" },
  }[trend.direction];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", meta.cls)} title={`Cửa sổ trước: ${trend.previous_accuracy}%`}>
      <Icon className="w-3.5 h-3.5" /> {meta.label}
    </span>
  );
};

export const LevelChip: React.FC<{ level: Level }> = ({ level }) => (
  <span className={cn("px-2 py-0.5 rounded-md border text-[11px] font-bold", LEVEL_CLASS[level].chip)}>{LEVEL_LABELS[level]}</span>
);

export const AccuracyBar: React.FC<{ accuracy: number | null; level: Level }> = ({ accuracy, level }) => (
  <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
    <div className={cn("h-full rounded-full", LEVEL_CLASS[level].bar)} style={{ width: `${accuracy ?? 0}%` }} />
  </div>
);

/**
 * Nút "Luyện 10 câu dạng này": tạo thẳng lượt luyện (Practice, phản hồi ngay, chỉ câu chưa làm).
 * Hết câu mới → ôn câu sai; câu còn lại thuộc đề chưa mở khóa → báo cần mở khóa.
 */
export const PracticeCategoryActions: React.FC<{ item: CategoryAnalysis; compact?: boolean }> = ({ item, compact }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const count = Math.min(10, item.practice.available);
  const start = useMutation({
    mutationFn: () =>
      createPracticeSession({
        kind: "question_type",
        parts: [item.part],
        categories: [item.category],
        count,
        mode: "practice",
        feedback: "immediate",
        unseen_only: true,
      }),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      navigate(`/practice/session/${s.id}`);
    },
    onError: (err) => toast({ title: "Chưa tạo được lượt luyện", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const mistakesUrl = `/mistakes?parts=${item.part}&categories=${item.category}`;
  const btn = "min-h-[40px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap gap-2">
      {item.practice.action === "practice" ? (
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={start.isPending}
          className={cn(btn, "bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-60")}
        >
          <PlayCircle className="w-4 h-4" /> {count >= 10 ? "Luyện 10 câu dạng này" : `Luyện ${count} câu`}
        </button>
      ) : item.practice.action === "review" ? (
        <Link to={mistakesUrl} className={cn(btn, "bg-gradient-to-r from-rose-500 to-orange-500 text-white")}>
          Ôn lại câu đã sai
        </Link>
      ) : item.practice.action === "locked" ? (
        <Link to="/fulltests?access=premium" className={cn(btn, "border border-amber-500/40 text-amber-300")}>
          <Lock className="w-3.5 h-3.5" /> Cần mở khóa đề để luyện thêm dạng này
        </Link>
      ) : (
        <span className="text-xs text-slate-500 self-center">Chưa có câu mới cho dạng này</span>
      )}
      {!compact && item.wrong > 0 && item.practice.action !== "review" && (
        <Link to={mistakesUrl} className={cn(btn, "border border-slate-700 text-slate-300 hover:bg-slate-800")}>
          Xem câu đã sai
        </Link>
      )}
    </div>
  );
};

/** Thẻ một điểm yếu (dùng ở Phân tích, Tiến độ, Kết quả chẩn đoán). */
export const WeaknessCard: React.FC<{ item: CategoryAnalysis; compact?: boolean }> = ({ item, compact }) => (
  <div className="p-4 rounded-2xl border border-rose-500/25 bg-[#070e1c]/90 space-y-3 flex flex-col">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Part {item.part}</div>
        <div className="text-base font-black text-white leading-snug">{item.label}</div>
      </div>
      <LevelChip level={item.level} />
    </div>
    <div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-black", LEVEL_CLASS[item.level].text)}>{item.accuracy ?? 0}%</span>
        {item.gap !== null && item.gap < 0 && <span className="text-xs text-slate-400">thấp hơn mức chung {Math.abs(item.gap)} điểm %</span>}
      </div>
      <AccuracyBar accuracy={item.accuracy} level={item.level} />
    </div>
    {!compact && (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>
          {item.answered} câu · sai {item.wrong}
        </span>
        <TrendBadge trend={item.trend} />
        {item.flags.many_blanks && <span className="text-amber-300 font-bold">Bỏ trống nhiều</span>}
        {item.flags.slow && (
          <span className="text-amber-300 font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Làm chậm ({item.flags.avg_seconds}s/câu)
          </span>
        )}
      </div>
    )}
    {item.recent_practice && (
      <p className="text-xs text-cyan-300">
        Vừa luyện: {item.recent_practice.correct}/{item.recent_practice.total} đúng
      </p>
    )}
    <div className="mt-auto">
      <PracticeCategoryActions item={item} compact={compact} />
    </div>
  </div>
);


const RecLine: React.FC<{ rec: Recommendation; onSkip?: () => void; skipping?: boolean }> = ({ rec, onSkip, skipping }) => {
  if (rec.type !== "exam") {
    return (
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{rec.title}</div>
          <div className="text-xs text-slate-400">{rec.reasons.join(" · ")}</div>
        </div>
        <Link to={rec.url} className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center shrink-0">
          Bắt đầu
        </Link>
      </div>
    );
  }
  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white truncate">
          {rec.title} {rec.locked && <Lock className="inline w-3.5 h-3.5 text-amber-300" />}
        </div>
        <div className="text-xs text-slate-400">
          {rec.mode.full ? "Làm đủ đề" : `Làm Part ${rec.mode.parts.join(" + ")}`} · khoảng {rec.mode.minutes} phút
          {rec.reasons[0] ? ` · ${rec.reasons[0]}` : ""}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {rec.locked ? (
          <Link to={examRecUrl(rec)} className="min-h-[40px] px-3 rounded-xl border border-amber-500/40 text-amber-300 text-xs font-bold inline-flex items-center">
            Cần mở khóa
          </Link>
        ) : (
          <Link to={examRecUrl(rec)} className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center">
            Bắt đầu
          </Link>
        )}
        {onSkip && (
          <button type="button" onClick={onSkip} disabled={skipping} className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold">
            Không phải lúc này
          </button>
        )}
      </div>
    </div>
  );
};

/** Đề xuất đề tiếp theo (E10): đề chính + chế độ + lý do, "Xem đề khác", "Không phải lúc này". */
export const RecommendationCard: React.FC<{ title?: string; className?: string }> = ({ title = "Đề nên làm tiếp", className }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showMore, setShowMore] = React.useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["exam-recommendations", user?.id],
    queryFn: getRecommendations,
    enabled: !!user,
  });
  const skip = useMutation({
    mutationFn: (testId: number) => skipRecommendation(testId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exam-recommendations"] }),
  });
  if (isError) return null;
  if (isLoading || !data) return <Skeleton className={cn("h-40 w-full rounded-3xl", className)} />;
  const p = data.primary;
  return (
    <div className={cn("p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-[#070e1c]/90 space-y-4", className)}>
      <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-cyan-400" /> {title}
      </h3>
      {data.kind === "all_done" && <p className="text-sm text-slate-300">Bạn đã làm hết đề hiện có trong 30 ngày qua. Thử luyện dạng yếu hoặc mở thêm đề mới:</p>}
      {p && p.type === "exam" ? (
        <div className="space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="font-mono text-slate-500">{p.code}</span>
              {p.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              <span className={cn("px-2 py-0.5 rounded-md border", p.is_free ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/40 text-amber-300")}>
                {p.is_free ? "Miễn phí" : "Premium"}
              </span>
              {p.difficulty && <span className="px-2 py-0.5 rounded-md border border-violet-500/30 text-violet-300">{DIFFICULTY_LABELS[p.difficulty]}</span>}
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">{p.title}</div>
            <div className="text-sm text-cyan-200 font-semibold mt-1">
              {p.mode.full ? `Làm đủ ${p.mode.parts.length === 7 ? "200 câu" : "đề"} (${p.mode.minutes} phút)` : `Làm Part ${p.mode.parts.join(" + ")} (khoảng ${p.mode.minutes} phút)`}
            </div>
          </div>
          <ul className="text-sm text-slate-300 space-y-1">
            {p.reasons.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link
              to={examRecUrl(p)}
              className="min-h-[44px] px-5 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold text-sm inline-flex items-center gap-2"
            >
              Bắt đầu <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              disabled={skip.isPending}
              onClick={() => skip.mutate(p.test_id)}
              className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold"
            >
              Không phải lúc này
            </button>
            {data.alternatives.length > 0 && (
              <button type="button" onClick={() => setShowMore((v) => !v)} className="min-h-[44px] px-3 text-sm font-bold text-cyan-400">
                {showMore ? "Ẩn đề khác" : "Xem đề khác"}
              </button>
            )}
          </div>
        </div>
      ) : p ? (
        <div className="space-y-3">
          <div className="text-lg font-black text-white">{p.title}</div>
          <p className="text-sm text-slate-300">{p.reasons.join(" · ")}</p>
          <Link to={(p as OtherRecommendation).url} className="min-h-[44px] px-5 rounded-xl bg-[#2563EB] text-white font-extrabold text-sm inline-flex items-center gap-2">
            Bắt đầu {(p as OtherRecommendation).minutes ? `(~${(p as OtherRecommendation).minutes} phút)` : ""} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : null}
      {(showMore || !p) && data.alternatives.length > 0 && (
        <div className="space-y-2">
          {data.alternatives.map((a, i) => (
            <RecLine
              key={a.type === "exam" ? a.test_id : `${a.type}-${i}`}
              rec={a}
              onSkip={a.type === "exam" && !a.locked ? () => skip.mutate(a.test_id) : undefined}
              skipping={skip.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};
