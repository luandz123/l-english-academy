import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, BookX, Bookmark, Headphones, History, Layers, PlayCircle, Zap } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { ApiError } from "@/lib/api/client";
import {
  DIFFICULTY_LABELS,
  abandonPracticeSession,
  createPracticeSession,
  getActivePracticeSession,
  getPracticeCatalog,
  type CatalogCount,
  type CreateSessionBody,
  type DifficultyFilter,
  type FeedbackMode,
  type PracticeMode,
  type SessionSummary,
  type Skill,
} from "@/lib/api/practice";
import { DailyChallengeCard } from "@/components/practice/DashboardPracticeCards";

const COUNT_OPTIONS = [5, 10, 15, 20];
const MINI_COUNTS = [5, 10, 15, 20, 30];
const DIFFS: DifficultyFilter[] = ["all", "easy", "medium", "hard"];

const Chip: React.FC<{ on: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; className?: string }> = ({
  on,
  disabled,
  onClick,
  children,
  className,
}) => (
  <button
    type="button"
    disabled={disabled}
    aria-pressed={on}
    onClick={onClick}
    className={cn(
      "min-h-[40px] px-3 rounded-xl border text-xs sm:text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
      on ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
      className,
    )}
  >
    {children}
  </button>
);

function sumCounts(
  counts: CatalogCount[],
  f: { parts: number[]; categories?: string[]; passageTypes?: string[]; difficulty: DifficultyFilter },
) {
  return counts
    .filter(
      (c) =>
        f.parts.includes(c.part) &&
        (!f.categories || f.categories.includes(c.category)) &&
        (!f.passageTypes?.length || (c.passage_type !== null && f.passageTypes.includes(c.passage_type))) &&
        (f.difficulty === "all" || c.difficulty === f.difficulty),
    )
    .reduce((n, c) => n + c.count, 0);
}

/** Trang luyện tập: theo dạng câu hỏi (E03/L02/R02) và Mini Test (E04), dùng chung một bộ chọn. */
const PracticeHubPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "mini" ? "mini" : "type";
  const skill: Skill = params.get("skill") === "reading" ? "reading" : "listening";

  const { data: catalog, isLoading, isError, refetch } = useQuery({
    queryKey: ["practice-catalog", user?.id],
    queryFn: getPracticeCatalog,
    enabled: !!user,
  });
  const { data: active } = useQuery({
    queryKey: ["practice-active", user?.id],
    queryFn: getActivePracticeSession,
    enabled: !!user,
  });

  // ---- Luyện theo dạng câu ----
  const parts = useMemo(() => (catalog?.parts ?? []).filter((p) => p.skill === skill), [catalog, skill]);
  const [part, setPart] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [passageTypes, setPassageTypes] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [count, setCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [mode, setMode] = useState<PracticeMode>("practice");
  const [feedback, setFeedback] = useState<FeedbackMode>("immediate");
  const [order, setOrder] = useState<"random" | "sequential">("random");
  const [timed, setTimed] = useState(true);

  // ---- Mini Test ----
  const [miniTarget, setMiniTarget] = useState<string>("listening");
  const [miniCount, setMiniCount] = useState(10);
  const [miniDifficulty, setMiniDifficulty] = useState<DifficultyFilter>("all");
  const [miniMode, setMiniMode] = useState<PracticeMode>("test");
  const [miniMinutes, setMiniMinutes] = useState("");

  const [pending, setPending] = useState<CreateSessionBody | null>(null);

  const counts = useMemo(() => catalog?.counts ?? [], [catalog]);
  const partTotal = (p: number) => sumCounts(counts, { parts: [p], difficulty: "all" });

  useEffect(() => {
    const first = parts.find((p) => partTotal(p.part) > 0);
    setPart(first?.part ?? null);
    setCategories([]);
    setPassageTypes([]);
  }, [skill, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const partDef = parts.find((p) => p.part === part);
  const categoryCount = (key: string) =>
    part === null ? 0 : sumCounts(counts, { parts: [part], categories: [key], passageTypes, difficulty });
  const visibleCategories = (partDef?.categories ?? []).filter(
    (c) => part !== null && sumCounts(counts, { parts: [part], categories: [c.key], difficulty: "all" }) > 0,
  );
  const passageOptions = useMemo(() => {
    if (part !== 7 || !catalog) return [];
    return catalog.passage_types
      .map((pt) => ({ ...pt, count: counts.filter((c) => c.part === 7 && c.passage_type === pt.key).reduce((n, c) => n + c.count, 0) }))
      .filter((pt) => pt.count > 0);
  }, [part, catalog, counts]);

  const available =
    part === null || categories.length === 0
      ? 0
      : sumCounts(counts, { parts: [part], categories, passageTypes, difficulty });
  const wanted = customCount ? Math.max(1, Math.min(100, Number(customCount) || 0)) : count;

  const miniParts = miniTarget === "listening" ? [1, 2, 3, 4] : miniTarget === "reading" ? [5, 6, 7] : [Number(miniTarget)];
  const miniAvailable = sumCounts(counts, { parts: miniParts, difficulty: miniDifficulty });

  const create = useMutation({
    mutationFn: (body: CreateSessionBody) => createPracticeSession(body),
    onSuccess: (s: SessionSummary) => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      navigate(`/practice/session/${s.id}`);
    },
    onError: (err) => {
      const available = err instanceof ApiError ? (err.details as { available?: number } | undefined)?.available : undefined;
      toast({
        title: "Không tạo được lượt luyện",
        description:
          getFriendlyErrorMessage(err) + (available !== undefined && available > 0 ? ` (hiện có ${available} câu)` : ""),
        variant: "destructive",
      });
    },
  });

  const abandon = useMutation({
    mutationFn: (id: string) => abandonPracticeSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["practice-active"] }),
  });

  const start = (body: CreateSessionBody) => {
    if (active) setPending(body);
    else create.mutate(body);
  };

  const startQuestionType = () => {
    if (part === null) return;
    start({
      kind: "question_type",
      parts: [part],
      categories,
      passage_types: part === 7 ? passageTypes : undefined,
      difficulty,
      count: wanted,
      mode,
      feedback: mode === "practice" ? feedback : undefined,
      order,
      time_limit_minutes: mode === "test" && !timed ? 0 : undefined,
    });
  };

  const startMini = () => {
    const isSkill = miniTarget === "listening" || miniTarget === "reading";
    start({
      kind: "mini_test",
      skill: isSkill ? (miniTarget as Skill) : undefined,
      parts: isSkill ? undefined : [Number(miniTarget)],
      count: miniCount,
      difficulty: miniDifficulty,
      mode: miniMode,
      feedback: miniMode === "practice" ? "immediate" : undefined,
      time_limit_minutes: miniMinutes ? Math.max(1, Math.min(180, Number(miniMinutes) || 0)) : undefined,
    });
  };

  const setSkill = (s: Skill) => {
    const next = new URLSearchParams(params);
    next.set("skill", s);
    setParams(next, { replace: true });
  };
  const setTab = (t: "type" | "mini") => {
    const next = new URLSearchParams(params);
    if (t === "mini") next.set("tab", "mini");
    else next.delete("tab");
    setParams(next, { replace: true });
  };

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-6 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-cyan-400" /> Luyện tập TOEIC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chọn đúng dạng câu hỏi bạn muốn luyện, hoặc làm một Mini Test ngắn. Câu sai được tự lưu vào Sổ câu sai.
          </p>
        </div>

        {active && (
          <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-amber-200">Bạn có một lượt đang làm dở</div>
              <div className="text-xs text-amber-100/80">
                {active.title} · đã trả lời {active.answered_count}/{active.total_questions} câu · mã {active.code}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/practice/session/${active.id}`}
                className="min-h-[40px] px-4 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" /> Tiếp tục
              </Link>
              <button
                type="button"
                onClick={() => abandon.mutate(active.id)}
                disabled={abandon.isPending}
                className="min-h-[40px] px-4 rounded-xl border border-amber-500/40 text-amber-200 font-bold text-sm"
              >
                Bỏ lượt này
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DailyChallengeCard />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
            <Link to="/mistakes" className="p-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 flex items-center gap-2 min-h-[56px] text-sm font-bold text-white">
              <BookX className="w-5 h-5 text-rose-400 shrink-0" /> <span>Sổ câu sai</span>
            </Link>
            <Link to="/favorites" className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 flex items-center gap-2 min-h-[56px] text-sm font-bold text-white">
              <Bookmark className="w-5 h-5 text-amber-400 shrink-0" /> <span>Đề yêu thích</span>
            </Link>
            <Link to="/practice/history" className="p-3 rounded-2xl border border-slate-700 hover:bg-slate-800/60 flex items-center gap-2 min-h-[56px] text-sm font-bold text-white">
              <History className="w-5 h-5 text-slate-300 shrink-0" /> <span>Lịch sử luyện</span>
            </Link>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-800">
          {[
            { k: "type" as const, label: "Luyện theo dạng câu hỏi", icon: Layers },
            { k: "mini" as const, label: "Mini Test", icon: Zap },
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={cn(
                "min-h-[44px] px-4 -mb-px border-b-2 text-sm font-bold flex items-center gap-1.5",
                tab === t.k ? "border-cyan-400 text-white" : "border-transparent text-slate-400 hover:text-white",
              )}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-3xl" />
        ) : isError || !catalog ? (
          <ErrorState title="Không tải được kho câu hỏi" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : tab === "type" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-5">
              <div className="flex gap-2">
                {(["listening", "reading"] as Skill[]).map((s) => (
                  <Chip key={s} on={skill === s} onClick={() => setSkill(s)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5">
                    {s === "listening" ? <Headphones className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    {s === "listening" ? "Listening" : "Reading"}
                  </Chip>
                ))}
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">1. Chọn Part</div>
                <div className="flex flex-wrap gap-2">
                  {parts.map((p) => {
                    const total = partTotal(p.part);
                    return (
                      <Chip
                        key={p.part}
                        on={part === p.part}
                        disabled={total === 0}
                        onClick={() => {
                          setPart(p.part);
                          setCategories([]);
                          setPassageTypes([]);
                        }}
                      >
                        Part {p.part} · {p.name} <span className="text-slate-500 font-medium">{total}</span>
                      </Chip>
                    );
                  })}
                </div>
              </div>

              {partDef && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      2. Chọn dạng câu hỏi — {partDef.name}
                    </div>
                    {visibleCategories.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-bold text-cyan-400 min-h-[32px]"
                        onClick={() =>
                          setCategories(categories.length === visibleCategories.length ? [] : visibleCategories.map((c) => c.key))
                        }
                      >
                        {categories.length === visibleCategories.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    )}
                  </div>
                  {visibleCategories.length === 0 ? (
                    <p className="text-sm text-slate-400">Part này chưa có câu hỏi luyện riêng được.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visibleCategories.map((c) => {
                        const on = categories.includes(c.key);
                        const n = categoryCount(c.key);
                        return (
                          <label
                            key={c.key}
                            className={cn(
                              "p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors min-h-[56px]",
                              on ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 hover:bg-slate-800/50",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setCategories(on ? categories.filter((k) => k !== c.key) : [...categories, c.key])}
                              className="mt-1 w-4 h-4 accent-cyan-500"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-bold text-white">{c.label}</span>
                              <span className="block text-xs text-slate-400">{c.description}</span>
                            </span>
                            <span className="text-xs font-bold text-slate-300 shrink-0">{n} câu</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {part === 7 && passageOptions.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-bold text-slate-400 mb-2">Loại văn bản (không bắt buộc)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {passageOptions.map((pt) => (
                          <Chip
                            key={pt.key}
                            on={passageTypes.includes(pt.key)}
                            onClick={() =>
                              setPassageTypes(
                                passageTypes.includes(pt.key) ? passageTypes.filter((k) => k !== pt.key) : [...passageTypes, pt.key],
                              )
                            }
                          >
                            {pt.label} <span className="text-slate-500 font-medium">{pt.count}</span>
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-4 h-fit lg:sticky lg:top-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Thiết lập buổi luyện</div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Số câu</div>
                <div className="flex flex-wrap gap-1.5">
                  {COUNT_OPTIONS.map((n) => (
                    <Chip key={n} on={!customCount && count === n} onClick={() => { setCount(n); setCustomCount(""); }}>
                      {n}
                    </Chip>
                  ))}
                  <Input
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    placeholder="Tùy chỉnh"
                    inputMode="numeric"
                    className="h-10 w-24"
                    aria-label="Số câu tùy chỉnh"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Độ khó</div>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFS.map((d) => (
                    <Chip
                      key={d}
                      on={difficulty === d}
                      disabled={d !== "all" && part !== null && sumCounts(counts, { parts: [part], difficulty: d }) === 0}
                      onClick={() => setDifficulty(d)}
                    >
                      {d === "all" ? "Tất cả" : DIFFICULTY_LABELS[d]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Chế độ</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Chip on={mode === "practice"} onClick={() => setMode("practice")}>Practice</Chip>
                  <Chip on={mode === "test"} onClick={() => setMode("test")}>Test</Chip>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {mode === "practice"
                    ? "Làm từng câu, xem giải thích theo lựa chọn bên dưới."
                    : "Làm liên tục, không hiện đáp án tới khi nộp bài."}
                </p>
              </div>
              {mode === "practice" ? (
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Xem giải thích</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Chip on={feedback === "immediate"} onClick={() => setFeedback("immediate")}>Sau mỗi câu</Chip>
                    <Chip on={feedback === "end"} onClick={() => setFeedback("end")}>Khi nộp bài</Chip>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm text-slate-300 min-h-[40px]">
                  <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                  Bấm giờ (tự động theo số câu)
                </label>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Thứ tự</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Chip on={order === "sequential"} onClick={() => setOrder("sequential")}>Theo thứ tự</Chip>
                  <Chip on={order === "random"} onClick={() => setOrder("random")}>Ngẫu nhiên</Chip>
                </div>
              </div>

              {categories.length > 0 && available < wanted && (
                <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 space-y-2">
                  <p>
                    {available === 0
                      ? "Chưa có câu hỏi phù hợp với lựa chọn này. Thử đổi độ khó hoặc chọn thêm dạng câu."
                      : `Chỉ có ${available} câu phù hợp.`}
                  </p>
                  {available > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomCount(String(available))}
                      className="min-h-[36px] px-3 rounded-lg bg-amber-500 text-slate-950 font-bold"
                    >
                      Luyện {available} câu
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={startQuestionType}
                disabled={categories.length === 0 || available < wanted || create.isPending}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
              >
                {create.isPending ? "Đang tạo..." : categories.length === 0 ? "Chọn ít nhất một dạng câu" : `Bắt đầu luyện ${wanted} câu`}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-5 max-w-3xl">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Kỹ năng hoặc Part</div>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={miniTarget === "listening"} onClick={() => setMiniTarget("listening")}>Listening</Chip>
                <Chip on={miniTarget === "reading"} onClick={() => setMiniTarget("reading")}>Reading</Chip>
                {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                  <Chip key={p} on={miniTarget === String(p)} disabled={partTotal(p) === 0} onClick={() => setMiniTarget(String(p))}>
                    Part {p}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Số câu</div>
                <div className="flex flex-wrap gap-1.5">
                  {MINI_COUNTS.map((n) => (
                    <Chip key={n} on={miniCount === n} disabled={miniAvailable < n} onClick={() => setMiniCount(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Độ khó</div>
                <div className="flex flex-wrap gap-1.5">
                  {DIFFS.map((d) => (
                    <Chip
                      key={d}
                      on={miniDifficulty === d}
                      disabled={d !== "all" && sumCounts(counts, { parts: miniParts, difficulty: d }) === 0}
                      onClick={() => setMiniDifficulty(d)}
                    >
                      {d === "all" ? "Hỗn hợp" : DIFFICULTY_LABELS[d]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Chế độ</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Chip on={miniMode === "practice"} onClick={() => setMiniMode("practice")}>Practice</Chip>
                  <Chip on={miniMode === "test"} onClick={() => setMiniMode("test")}>Test</Chip>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Thời gian (phút)</div>
                <Input
                  value={miniMinutes}
                  onChange={(e) => setMiniMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="Tự động theo số câu"
                  inputMode="numeric"
                  className="h-10"
                  aria-label="Thời gian làm bài (phút)"
                />
              </div>
            </div>
            {miniAvailable < miniCount && (
              <p className="text-xs text-amber-300">
                {miniAvailable === 0
                  ? "Chưa có câu hỏi cho lựa chọn này."
                  : `Chỉ có ${miniAvailable} câu phù hợp — hãy chọn số câu thấp hơn.`}
              </p>
            )}
            <button
              type="button"
              onClick={startMini}
              disabled={miniAvailable < miniCount || create.isPending}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
            >
              {create.isPending ? "Đang tạo..." : `Bắt đầu Mini Test ${miniCount} câu`}
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn đang có lượt làm dở</AlertDialogTitle>
            <AlertDialogDescription>
              Bắt đầu lượt mới sẽ bỏ lượt "{active?.title}". Các câu đã trả lời ở lượt đó sẽ không được chấm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => active && navigate(`/practice/session/${active.id}`)}>Tiếp tục lượt cũ</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const body = pending;
                setPending(null);
                if (active) await abandon.mutateAsync(active.id);
                if (body) create.mutate(body);
              }}
            >
              Bỏ lượt cũ & bắt đầu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
};

export default PracticeHubPage;
