import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, PlayCircle, RotateCcw } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { GrammarRunner } from "@/components/grammar/GrammarRunner";
import { FormulaCard, LessonView } from "@/components/grammar/LessonView";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import { ApiError } from "@/lib/api/client";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  KIND_LABELS,
  LEVELS,
  LEVEL_LABELS,
  STATUS_LABELS,
  abandonGrammarSession,
  getGrammarSession,
  getGrammarTopic,
  markTopicProgress,
  retryWrongItems,
  setTopicLevel,
  startExerciseSession,
  startToeicSession,
  type ExerciseKind,
  type GrammarLevel,
  type GrammarResult,
  type GrammarSession,
  type TopicDetail,
  type TopicTab,
} from "@/lib/api/grammar";

const TABS: { key: TopicTab; label: string }[] = [
  { key: "lesson", label: "Bài học" },
  { key: "formulas", label: "Công thức" },
  { key: "exercises", label: "Bài tập" },
  { key: "toeic", label: "Bài tập TOEIC" },
];
const DIFF_OF: Record<GrammarLevel, "easy" | "medium" | "hard"> = { basic: "easy", intermediate: "medium", advanced: "hard" };
const DIFF_LABEL: Record<string, string> = { all: "Tất cả độ khó", easy: "Dễ", medium: "Trung bình", hard: "Khó" };

const Pill: React.FC<{ active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "min-h-[44px] px-3 rounded-xl border text-sm font-bold disabled:opacity-40",
      active ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 text-slate-300 hover:border-slate-500",
    )}
  >
    {children}
  </button>
);

const LoginGate: React.FC<{ text: string }> = ({ text }) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
      <Lock className="w-8 h-8 text-cyan-400 mx-auto" />
      <p className="text-sm text-slate-300">{text}</p>
      <button
        type="button"
        onClick={() => navigate("/login", { state: { from: { pathname: location.pathname, search: location.search } } })}
        className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm"
      >
        Bắt đầu
      </button>
    </div>
  );
};

// ---------- Tab Bài tập (G03) ----------

const ExercisesTab: React.FC<{ topic: TopicDetail; onSwitch: (t: TopicTab) => void }> = ({ topic, onSwitch }) => {
  const { toast } = useToast();
  const { addXp } = useGamification();
  const queryClient = useQueryClient();
  const counts = topic.exercise_counts;
  const levelsWith = LEVELS.filter((l) => Object.values(counts[l]).some((n) => n > 0));
  const p = topic.progress!;
  const wanted = (p.chosen_level ?? p.suggested_level) as GrammarLevel;
  const nearest = levelsWith.includes(wanted)
    ? wanted
    : ([...levelsWith].sort((a, b) => Math.abs(LEVELS.indexOf(a) - LEVELS.indexOf(wanted)) - Math.abs(LEVELS.indexOf(b) - LEVELS.indexOf(wanted)))[0] ?? "basic");
  const [level, setLevel] = useState<GrammarLevel>(nearest);
  const [count, setCount] = useState(10);
  const [kind, setKind] = useState<"all" | ExerciseKind>("all");
  const [session, setSession] = useState<GrammarSession | null>(null);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [resume, setResume] = useState(p.active_session);
  const [short, setShort] = useState<number | null>(null);

  const available = kind === "all" ? Object.values(counts[level]).reduce((s, n) => s + n, 0) : counts[level][kind];

  const start = useMutation({
    mutationFn: (allowLess: boolean) => startExerciseSession(topic.slug, { level, count, kind, allow_less: allowLess }),
    onSuccess: (s) => {
      setShort(null);
      setResult(null);
      setResume(null);
      setSession(s);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_QUESTIONS") {
        const n = (err.details as { available?: number } | undefined)?.available ?? 0;
        setShort(n);
        return;
      }
      toast({ title: "Chưa bắt đầu được", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });
  const cont = useMutation({
    mutationFn: (id: string) => getGrammarSession(id),
    onSuccess: (s) => {
      setResume(null);
      setSession(s);
    },
  });
  const restart = useMutation({
    mutationFn: (id: string) => abandonGrammarSession(id),
    onSuccess: () => setResume(null),
  });
  const retry = useMutation({
    mutationFn: (id: string) => retryWrongItems(id),
    onSuccess: (s) => {
      setResult(null);
      setSession(s);
    },
    onError: (err) => toast({ title: "Không tạo được lượt", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const pickLevel = (l: GrammarLevel) => {
    setLevel(l);
    void setTopicLevel(topic.slug, l).then(() => queryClient.invalidateQueries({ queryKey: ["grammar-topic", topic.slug] }));
  };

  if (levelsWith.length === 0) {
    return (
      <div className="p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
        <p className="text-sm text-slate-300">Chủ điểm này chưa có bài tập.</p>
        <button type="button" onClick={() => onSwitch("toeic")} className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm">
          Làm câu TOEIC
        </button>
      </div>
    );
  }

  if (result) {
    const hint = result.level_hint;
    return (
      <div className="p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-4">
        <div className="text-center space-y-1">
          <p className="text-4xl font-black text-white">
            {result.correct}/{result.total}
          </p>
          <p className="text-sm text-slate-400">
            {result.percent}% · {Math.floor(result.time_seconds / 60)} phút {result.time_seconds % 60} giây{result.xp > 0 && <> · +{result.xp} XP</>}
          </p>
        </div>
        {hint?.type === "up" && hint.to && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-emerald-200">
              Bạn đã vững cấp {LEVEL_LABELS[hint.from]}. Thử cấp {LEVEL_LABELS[hint.to]}?
            </p>
            <button
              type="button"
              onClick={() => {
                pickLevel(hint.to!);
                setResult(null);
              }}
              className="min-h-[44px] px-4 rounded-xl bg-emerald-500/20 text-emerald-100 font-bold text-sm"
            >
              Làm cấp {LEVEL_LABELS[hint.to]}
            </button>
          </div>
        )}
        {hint?.type === "down" && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <p className="text-sm text-amber-200">Câu ở cấp này đang khó. Ôn lại bài học{hint.to && <> hoặc làm cấp {LEVEL_LABELS[hint.to]}</>}?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onSwitch("lesson")} className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 text-amber-100 font-bold text-sm">
                Ôn lại bài học
              </button>
              {hint.to && (
                <button
                  type="button"
                  onClick={() => {
                    pickLevel(hint.to!);
                    setResult(null);
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 text-amber-100 font-bold text-sm"
                >
                  Làm cấp {LEVEL_LABELS[hint.to]}
                </button>
              )}
            </div>
          </div>
        )}
        {result.wrong_indexes.length > 0 && session && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-slate-400">Câu sai</p>
            <ul className="space-y-1.5">
              {result.wrong_indexes.map((i) => (
                <li key={i} className="text-sm text-slate-300">
                  Câu {i + 1}: {session.items[i]?.exercise?.prompt.replace(/\[\[|\]\]/g, "")}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-2">
          {result.wrong_indexes.length > 0 && (
            <button
              type="button"
              disabled={retry.isPending}
              onClick={() => retry.mutate(result.id)}
              className="min-h-[48px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại câu sai
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setSession(null);
            }}
            className="min-h-[48px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm"
          >
            Làm lượt mới
          </button>
          <button
            type="button"
            onClick={() => onSwitch("toeic")}
            className="min-h-[48px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-1.5"
          >
            Sang Bài tập TOEIC <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <GrammarRunner
        key={session.id}
        session={session}
        onFinished={(r) => {
          if (r.xp_new && r.xp > 0) addXp(r.xp, `Bài tập ngữ pháp (${r.correct}/${r.total} câu đúng)`);
          setResult(r);
        }}
      />
    );
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-5">
      {resume && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-200">
            Bạn đang làm dở (câu {Math.min(resume.answered + 1, resume.total)}/{resume.total}). Làm tiếp hay bắt đầu lại?
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => cont.mutate(resume.id)} className="min-h-[44px] px-4 rounded-xl bg-amber-500/20 text-amber-100 font-bold text-sm">
              Làm tiếp
            </button>
            <button type="button" onClick={() => restart.mutate(resume.id)} className="min-h-[44px] px-4 rounded-xl border border-amber-500/40 text-amber-100 font-bold text-sm">
              Bắt đầu lại
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Cấp độ</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => {
            const n = Object.values(counts[l]).reduce((s, x) => s + x, 0);
            return (
              <Pill key={l} active={level === l} disabled={n === 0} onClick={() => pickLevel(l)}>
                {LEVEL_LABELS[l]} ({n})
              </Pill>
            );
          })}
        </div>
        {!levelsWith.includes(wanted) && <p className="text-xs text-slate-400">Chủ điểm này chưa có câu cấp {LEVEL_LABELS[wanted]}.</p>}
        {p.exhausted_levels.includes(level) && <p className="text-xs text-amber-200">Bạn đã làm hết câu mới ở cấp này. Lượt mới sẽ trộn lại câu đã làm, ưu tiên câu từng sai.</p>}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Loại câu</p>
        <div className="flex flex-wrap gap-2">
          <Pill active={kind === "all"} onClick={() => setKind("all")}>
            Tất cả ({Object.values(counts[level]).reduce((s, x) => s + x, 0)})
          </Pill>
          {(Object.keys(KIND_LABELS) as ExerciseKind[]).map((k) => (
            <Pill key={k} active={kind === k} disabled={counts[level][k] === 0} onClick={() => setKind(k)}>
              {KIND_LABELS[k]} ({counts[level][k]})
            </Pill>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Số câu</p>
        <div className="flex flex-wrap gap-2">
          {[10, 15, 20].map((n) => (
            <Pill key={n} active={count === n} onClick={() => setCount(n)}>
              {n} câu
            </Pill>
          ))}
        </div>
      </div>
      {short !== null && short > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-amber-200">Chỉ có {short} câu.</p>
          <button type="button" onClick={() => start.mutate(true)} className="min-h-[40px] px-3 rounded-xl bg-amber-500/20 text-amber-100 font-bold text-sm">
            Luyện {short} câu
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={start.isPending || available === 0}
        onClick={() => start.mutate(false)}
        className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <PlayCircle className="w-5 h-5" /> Bắt đầu
      </button>
    </div>
  );
};

// ---------- Tab Bài tập TOEIC (G04) ----------

const ToeicTab: React.FC<{ topic: TopicDetail }> = ({ topic }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const p = topic.progress!;
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">(DIFF_OF[(p.chosen_level ?? p.suggested_level) as GrammarLevel]);
  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [unseen, setUnseen] = useState(true);
  const [short, setShort] = useState<number | null>(null);
  const start = useMutation({
    mutationFn: (n: number) => startToeicSession(topic.slug, { count: n, difficulty, mode, unseen_first: unseen }),
    onSuccess: (s) => navigate(`/practice/session/${s.id}`),
    onError: (err) => {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_QUESTIONS") {
        setShort((err.details as { available?: number } | undefined)?.available ?? 0);
        return;
      }
      toast({ title: "Chưa bắt đầu được", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  if (topic.toeic.total_tagged === 0) {
    return <div className="p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center text-sm text-slate-300">Chưa có câu TOEIC cho chủ điểm này.</div>;
  }
  if (topic.toeic.available === 0) {
    return (
      <div className="p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
        <p className="text-sm text-slate-300">Cần mở khóa đề để luyện thêm câu TOEIC của chủ điểm này.</p>
        <Link to="/fulltests" className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
          Xem đề luyện
        </Link>
      </div>
    );
  }
  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/90 space-y-5">
      <p className="text-sm text-slate-300">
        <b className="text-white">{topic.toeic.available} câu</b> từ {topic.toeic.tests} đề · đã làm {topic.toeic.answered} câu
        {topic.toeic.accuracy !== null && <> · đúng {topic.toeic.accuracy}% (10 câu gần nhất)</>}
      </p>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Số câu</p>
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20].map((n) => (
            <Pill key={n} active={count === n} onClick={() => setCount(n)}>
              {n} câu
            </Pill>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Độ khó</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "easy", "medium", "hard"] as const).map((d) => (
            <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFF_LABEL[d]}
            </Pill>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase text-slate-400">Chế độ</p>
        <div className="flex flex-wrap gap-2">
          <Pill active={mode === "practice"} onClick={() => setMode("practice")}>
            Practice
          </Pill>
          <Pill active={mode === "test"} onClick={() => setMode("test")}>
            Test
          </Pill>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300 min-h-[40px] cursor-pointer w-fit">
        <input type="checkbox" checked={unseen} onChange={(e) => setUnseen(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
        Ưu tiên câu chưa làm
      </label>
      {short !== null && short > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-amber-200">Chỉ có {short} câu.</p>
          <button type="button" onClick={() => start.mutate(Math.min(short, 20))} className="min-h-[40px] px-3 rounded-xl bg-amber-500/20 text-amber-100 font-bold text-sm">
            Luyện {short} câu
          </button>
        </div>
      )}
      {short === 0 && <p className="text-sm text-amber-200">Chưa có câu phù hợp với lựa chọn này.</p>}
      <button
        type="button"
        disabled={start.isPending}
        onClick={() => start.mutate(count)}
        className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <PlayCircle className="w-5 h-5" /> Bắt đầu
      </button>
    </div>
  );
};

/** Trang chủ điểm (G01–G04): 4 bước Bài học · Công thức · Bài tập · Bài tập TOEIC. */
const GrammarTopicPage: React.FC = () => {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["grammar-topic", slug, user?.id ?? "guest"],
    queryFn: () => getGrammarTopic(slug),
    enabled: !!slug,
  });
  const urlTab = params.get("tab") as TopicTab | null;
  const [tab, setTab] = useState<TopicTab | null>(urlTab);
  const opened = useRef(false);

  // Lần đầu mở → tab Bài học; các lần sau mở tab đang dở
  useEffect(() => {
    if (!data || tab) return;
    setTab(urlTab ?? data.progress?.last_tab ?? (data.has_lesson ? "lesson" : "exercises"));
  }, [data, tab, urlTab]);

  const mark = useMutation({
    mutationFn: (body: Parameters<typeof markTopicProgress>[1]) => markTopicProgress(slug, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grammar-topic", slug] });
      void queryClient.invalidateQueries({ queryKey: ["grammar-overview"] });
    },
  });

  useEffect(() => {
    if (!user || !data || !tab) return;
    if (!opened.current || tab !== data.progress?.last_tab) {
      opened.current = true;
      mark.mutate({ action: "open", tab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data?.slug, tab]);

  const switchTab = (t: TopicTab) => {
    setTab(t);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("tab", t);
      return n;
    }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notFound = error instanceof ApiError && error.status === 404;
  const steps = data?.progress?.steps;
  const remembered = new Set(data?.progress?.remembered ?? []);

  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto space-y-5 pb-16 font-sans">
        <Link to="/grammar" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1.5 min-h-[40px]">
          <ArrowLeft className="w-4 h-4" /> Grammar Center
        </Link>
        {isLoading ? (
          <Skeleton className="h-72 w-full rounded-3xl" />
        ) : notFound ? (
          <ErrorState title="Không tìm thấy chủ điểm" message="Chủ điểm không tồn tại hoặc đang tạm ẩn." />
        ) : isError || !data ? (
          <ErrorState title="Không tải được chủ điểm" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : (
          <>
            <div className="p-5 sm:p-6 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{data.group}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{LEVEL_LABELS[data.level]}</span>
                  {data.status && <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300">{STATUS_LABELS[data.status]}</span>}
                  {data.needs_review && <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300">Cần ôn lại</span>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-black text-white">{data.name}</h1>
                {data.summary && <p className="text-sm text-slate-400">{data.summary}</p>}
              </div>
              {steps && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TABS.map((t) => (
                    <div
                      key={t.key}
                      className={cn(
                        "min-h-[40px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5",
                        steps[t.key] ? "border-emerald-500/40 text-emerald-300" : "border-slate-800 text-slate-400",
                      )}
                    >
                      {steps[t.key] ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-4 h-4 rounded-full border border-slate-600" />}
                      {t.label}
                    </div>
                  ))}
                </div>
              )}
              {!!data.open_mistakes && (
                <p className="text-sm text-rose-200">
                  Bạn có {data.open_mistakes} lỗi chưa sửa ở chủ điểm này ·{" "}
                  <Link to={`/grammar/mistakes#${data.slug}`} className="font-bold text-cyan-400 hover:text-cyan-300">
                    Xem
                  </Link>
                </p>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 sticky top-0 z-10 bg-[#030712]/90 backdrop-blur py-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={cn(
                    "min-h-[44px] px-4 rounded-xl text-sm font-bold whitespace-nowrap border",
                    tab === t.key ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:border-slate-600",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "lesson" &&
              (data.lesson ? (
                <div className="space-y-4">
                  {data.video_url && (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black">
                      <iframe src={data.video_url} title={data.name} className="w-full h-full" allowFullScreen />
                    </div>
                  )}
                  <LessonView lesson={data.lesson} />
                  {user ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!steps?.lesson) mark.mutate({ action: "lesson_done" });
                        switchTab("exercises");
                      }}
                      className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
                    >
                      Đã đọc xong, làm bài tập <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchTab("exercises")}
                      className="w-full min-h-[52px] rounded-xl border border-slate-700 text-slate-200 font-bold text-sm"
                    >
                      Sang phần bài tập
                    </button>
                  )}
                </div>
              ) : (
                <p className="p-6 rounded-3xl border border-slate-800 text-sm text-slate-400 text-center">Chủ điểm này chưa có bài học.</p>
              ))}

            {tab === "formulas" && (
              <div className="space-y-3">
                {data.formulas.length === 0 ? (
                  <p className="p-6 rounded-3xl border border-slate-800 text-sm text-slate-400 text-center">Chủ điểm này chưa có công thức.</p>
                ) : (
                  data.formulas.map((f) => (
                    <FormulaCard
                      key={f.id}
                      formula={f}
                      action={
                        user ? (
                          <button
                            type="button"
                            onClick={() => mark.mutate({ action: remembered.has(f.id) ? "formula_unset" : "formula", formula_id: f.id })}
                            className={cn(
                              "shrink-0 min-h-[40px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1",
                              remembered.has(f.id) ? "border-emerald-500/40 text-emerald-300" : "border-slate-700 text-slate-300",
                            )}
                          >
                            {remembered.has(f.id) && <Check className="w-4 h-4" />} Tôi nhớ rồi
                          </button>
                        ) : undefined
                      }
                    />
                  ))
                )}
                <Link to="/grammar/formulas" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
                  Bảng công thức tổng hợp <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {tab === "exercises" &&
              (user && data.progress ? <ExercisesTab topic={data} onSwitch={switchTab} /> : <LoginGate text="Đăng nhập để làm bài tập chủ điểm và lưu tiến độ." />)}

            {tab === "toeic" && (user && data.progress ? <ToeicTab topic={data} /> : <LoginGate text="Đăng nhập để luyện câu TOEIC của chủ điểm này." />)}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default GrammarTopicPage;
