import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronUp, Headphones, Search, Target, Zap } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PASSAGE_LABELS } from "@/lib/practiceLabels";
import {
  getWeaknesses,
  LEVEL_CLASS,
  LEVEL_LABELS,
  WINDOW_LABELS,
  type PartAnalysis,
  type SkillFilter,
  type WindowKey,
} from "@/lib/api/analytics";
import { AccuracyBar, LevelChip, PracticeCategoryActions, TrendBadge, WeaknessCard } from "@/components/analysis/AnalysisBits";

const WINDOWS: WindowKey[] = ["7", "30", "90", "all"];
const SKILLS: { key: SkillFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
];
const STORE_KEY = "analysis-filters";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "");

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      "min-h-[40px] px-3 rounded-xl border text-xs sm:text-sm font-bold transition-colors",
      on ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
    )}
  >
    {children}
  </button>
);

const PartRow: React.FC<{ part: PartAnalysis; open: boolean; onToggle: () => void }> = ({ part, open, onToggle }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#070e1c]/90">
    <button type="button" onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left min-h-[56px]">
      <div className="w-16 shrink-0">
        <div className="text-sm font-black text-white">Part {part.part}</div>
        <div className="text-[11px] text-slate-500">{part.name}</div>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <AccuracyBar accuracy={part.accuracy} level={part.level} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{part.answered} câu</span>
          {part.level === "insufficient" ? (
            <span>Chưa đủ dữ liệu{part.answered > 0 ? ` (đã làm ${part.answered}/20 câu)` : ""}</span>
          ) : (
            <span className={LEVEL_CLASS[part.level].text}>
              {part.accuracy}% · {LEVEL_LABELS[part.level]}
            </span>
          )}
          <TrendBadge trend={part.trend} />
        </div>
      </div>
      {part.categories.length > 0 && (open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
    </button>
    {open && part.categories.length > 0 && (
      <div className="px-4 pb-4 space-y-2">
        {part.categories.map((c) => (
          <div key={c.category} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">{c.label}</span>
                <LevelChip level={c.level} />
                <TrendBadge trend={c.trend} />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {c.level === "insufficient"
                  ? `Chưa đủ dữ liệu (đã làm ${c.answered}/10 câu)`
                  : `${c.accuracy}% đúng · ${c.answered} câu · sai ${c.wrong}`}
                {c.flags.many_blanks ? " · Bỏ trống nhiều" : ""}
                {c.flags.slow ? ` · Làm chậm (${c.flags.avg_seconds}s/câu)` : ""}
              </div>
            </div>
            <PracticeCategoryActions item={c} />
          </div>
        ))}
        {part.part === 7 && part.passage_types.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-400 mb-1.5">Theo loại văn bản</div>
            <div className="flex flex-wrap gap-1.5">
              {part.passage_types.map((p) => (
                <span key={p.key} className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold", LEVEL_CLASS[p.level].chip)}>
                  {PASSAGE_LABELS[p.key] ?? p.key}: {p.level === "insufficient" ? `${p.answered} câu` : `${p.accuracy}%`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

/** Phân tích điểm yếu (P11): "Tôi đang mất điểm ở đâu, nên luyện gì trước?" */
const AnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const saved = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "{}") as { window?: WindowKey; skill?: SkillFilter };
    } catch {
      return {};
    }
  })();
  const [windowKey, setWindowKey] = useState<WindowKey>(saved.window ?? "30");
  const [skill, setSkill] = useState<SkillFilter>(saved.skill ?? "all");
  const initialPart = Number(params.get("part")) || null;
  const [openPart, setOpenPart] = useState<number | null>(initialPart);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ window: windowKey, skill }));
    } catch {
      /* trình duyệt chặn lưu trữ: bỏ qua */
    }
  }, [windowKey, skill]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["analysis-weaknesses", user?.id, windowKey, skill],
    queryFn: () => getWeaknesses(windowKey, skill),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (initialPart) document.getElementById(`part-${initialPart}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialPart, data]);

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <Search className="w-7 h-7 text-cyan-400" /> Phân tích điểm yếu
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gộp mọi bài đã nộp để chỉ ra dạng câu đang kéo điểm xuống và luyện ngay đúng dạng đó.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {WINDOWS.map((w) => (
              <Chip key={w} on={windowKey === w} onClick={() => setWindowKey(w)}>
                {WINDOW_LABELS[w]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <Chip key={s.key} on={skill === s.key} onClick={() => setSkill(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-3xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được phân tích" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.state === "empty" ? (
          <div className="p-8 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 text-center space-y-4">
            <Target className="w-10 h-10 text-cyan-400 mx-auto" />
            <p className="text-white font-bold text-lg">Cần ít nhất một bài làm để phân tích</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/diagnostic" className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center">
                Làm bài kiểm tra trình độ
              </Link>
              <Link to="/practice?tab=mini" className="min-h-[44px] px-5 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
                Làm Mini Test 20 câu
              </Link>
            </div>
          </div>
        ) : (
          <div className={cn("space-y-6", isFetching && "opacity-70 transition-opacity")}>
            <p className="text-sm text-slate-400">
              Dựa trên <b className="text-white">{data.summary.answered}</b> câu từ <b className="text-white">{data.summary.attempts}</b> lượt làm bài
              {data.summary.from && `, từ ngày ${fmtDate(data.summary.from)} đến ngày ${fmtDate(data.summary.to)}`}
              {data.summary.accuracy !== null && ` · tỉ lệ đúng chung ${data.summary.accuracy}%`}
              {data.summary.blank > 0 && ` · ${data.summary.blank} câu bỏ trống`}
            </p>

            {data.suggest_window && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>{WINDOW_LABELS[windowKey]} qua chưa đủ dữ liệu. Xem {WINDOW_LABELS[data.suggest_window].toLowerCase()}?</span>
                <button type="button" onClick={() => setWindowKey(data.suggest_window!)} className="min-h-[36px] px-3 rounded-lg bg-amber-500 text-slate-950 font-bold">
                  Xem {WINDOW_LABELS[data.suggest_window]}
                </button>
              </div>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                {data.top_mode === "lowest" ? "3 dạng có tỉ lệ đúng thấp nhất của bạn" : "3 điểm yếu cần ưu tiên"}
              </h2>
              {data.state === "insufficient" ? (
                <div className="p-5 rounded-2xl border border-slate-800 bg-[#070e1c]/90 space-y-3">
                  <p className="text-sm text-slate-300">
                    Bạn đã làm {data.summary.answered} câu. Cần thêm khoảng {data.needed?.more_needed ?? 10} câu cùng một dạng để có kết luận đầu tiên.
                  </p>
                  <Link to="/practice?tab=mini" className="min-h-[40px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Làm Mini Test
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.top.map((w) => (
                    <WeaknessCard key={`${w.part}-${w.category}`} item={w} />
                  ))}
                </div>
              )}
            </section>

            {skill === "all" && (data.skills.listening === 0 || data.skills.reading === 0) && (
              <div className="p-3 rounded-xl border border-slate-800 text-sm text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <span>{data.skills.listening === 0 ? "Chưa làm câu Listening nào trong khoảng này." : "Chưa làm câu Reading nào trong khoảng này."}</span>
                <Link
                  to={`/practice?skill=${data.skills.listening === 0 ? "listening" : "reading"}`}
                  className="min-h-[36px] px-3 rounded-lg border border-cyan-500/40 text-cyan-300 font-bold inline-flex items-center gap-1"
                >
                  {data.skills.listening === 0 ? <Headphones className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  Luyện {data.skills.listening === 0 ? "Listening" : "Reading"}
                </Link>
              </div>
            )}
            {skill !== "all" && data.summary.answered === 0 && (
              <p className="text-sm text-slate-400">Chưa làm câu {skill === "listening" ? "Listening" : "Reading"} nào trong khoảng này.</p>
            )}

            <section className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Theo Part</h2>
              {data.parts.map((p) => (
                <div key={p.part} id={`part-${p.part}`}>
                  <PartRow part={p} open={openPart === p.part} onToggle={() => setOpenPart(openPart === p.part ? null : p.part)} />
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default AnalysisPage;
