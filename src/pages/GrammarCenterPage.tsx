import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookX, Brain, ListChecks, PenLine, Search, Sparkles } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { LevelPromptDialog } from "@/components/grammar/LevelPromptDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  LEVELS,
  LEVEL_LABELS,
  STATUS_LABELS,
  foldVi,
  getGrammarOverview,
  updateGrammarSettings,
  type GrammarLevel,
  type TopicCard,
  type TopicStatus,
} from "@/lib/api/grammar";

const STATUS_CLS: Record<TopicStatus, string> = {
  not_started: "bg-slate-800 text-slate-300",
  learning: "bg-amber-500/15 text-amber-300",
  learned: "bg-cyan-500/15 text-cyan-300",
  mastered: "bg-emerald-500/15 text-emerald-300",
};

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "min-h-[40px] px-3 rounded-xl border text-xs font-bold whitespace-nowrap",
      active ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 text-slate-300 hover:border-slate-500",
    )}
  >
    {children}
  </button>
);

const TopicTile: React.FC<{ t: TopicCard; loggedIn: boolean }> = ({ t, loggedIn }) => (
  <Link
    to={`/grammar/${t.slug}`}
    className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/80 hover:border-cyan-500/50 transition-colors flex flex-col gap-2 min-h-[120px]"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm font-bold text-white leading-snug">{t.name}</span>
      <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">{LEVEL_LABELS[t.level]}</span>
    </div>
    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
      {loggedIn && t.status && <span className={cn("px-2 py-0.5 rounded-md", STATUS_CLS[t.status])}>{STATUS_LABELS[t.status]}</span>}
      {t.needs_review && <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300">Cần ôn lại</span>}
      {t.foundation && <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300">Nền tảng nên nắm</span>}
    </div>
    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
      {t.toeic_accuracy !== null && <span>Câu TOEIC đúng {t.toeic_accuracy}%</span>}
      {!!t.open_mistakes && <span className="text-rose-300">{t.open_mistakes} lỗi chưa sửa</span>}
      {!t.has_lesson && <span>Chỉ có bài tập</span>}
    </div>
  </Link>
);

/** Grammar Center (G01–G05): chủ điểm theo nhóm, gợi ý, cấp gợi ý, lọc theo cấp/trạng thái, tìm không dấu. */
const GrammarCenterPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["grammar-overview", user?.id ?? "guest"], queryFn: getGrammarOverview });
  const [level, setLevel] = useState<GrammarLevel | "mine" | "all">("mine");
  const [status, setStatus] = useState<TopicStatus | "all">("all");
  const [q, setQ] = useState("");
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    if (data?.level?.needs_prompt) setPrompt(true);
  }, [data?.level?.needs_prompt]);

  const settings = useMutation({
    mutationFn: updateGrammarSettings,
    onSuccess: () => {
      setPrompt(false);
      void queryClient.invalidateQueries({ queryKey: ["grammar-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["grammar-topic"] });
    },
  });

  const myLevel = data?.level?.level ?? null;
  const topics = useMemo(() => {
    if (!data) return [];
    const needle = foldVi(q.trim());
    return data.topics.filter((t) => {
      if (needle && !foldVi(t.name).includes(needle)) return false;
      if (status !== "all" && t.status !== status) return false;
      if (level === "all") return true;
      if (level === "mine") return !myLevel || t.level === myLevel || t.foundation;
      return t.level === level;
    });
  }, [data, q, status, level, myLevel]);

  const loggedIn = !!user;
  const lv = data?.level;

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 font-sans">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
              <PenLine className="w-7 h-7 text-cyan-400" /> Ngữ pháp
            </h1>
            <p className="text-sm text-slate-400 mt-1">Bài học, công thức, bài tập theo chủ điểm và câu TOEIC thật của từng chủ điểm.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/grammar/formulas" className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center gap-1.5">
              <ListChecks className="w-4 h-4" /> Bảng công thức tổng hợp
            </Link>
            {loggedIn && (
              <Link to="/grammar/mistakes" className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center gap-1.5">
                <BookX className="w-4 h-4" /> Lỗi ngữ pháp của tôi ({data?.open_mistakes ?? 0})
              </Link>
            )}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được Grammar Center" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : (
          <>
            {loggedIn && data.progress && (
              <div className="p-5 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-white font-bold">
                    Đã học {data.progress.learned}/{data.progress.total} chủ điểm · Thành thạo {data.progress.mastered}
                  </p>
                  {lv && (
                    <p className="text-xs text-slate-400">
                      Cấp gợi ý: <b className="text-cyan-300">{lv.label}</b>
                      {lv.source === "estimate" && lv.score !== null && lv.date && <> (từ điểm {lv.score} ngày {new Date(lv.date).toLocaleDateString("vi-VN")})</>}
                      {lv.source === "roadmap" && lv.score !== null && <> (từ điểm xuất phát lộ trình {lv.score})</>}
                      {lv.source === "manual" && <> (bạn tự chọn)</>}
                      {" · "}
                      <button type="button" onClick={() => setPrompt(true)} className="text-cyan-400 font-bold underline-offset-2 hover:underline min-h-[32px]">
                        Đổi
                      </button>
                    </p>
                  )}
                  {lv?.changed_from && (
                    <p className="text-xs text-amber-200">
                      Cấp gợi ý đã đổi sang {lv.label} theo kết quả {lv.date ? `ngày ${new Date(lv.date).toLocaleDateString("vi-VN")}` : "mới nhất"}.{" "}
                      <button type="button" className="font-bold underline min-h-[32px]" onClick={() => settings.mutate({ ack_level_change: true })}>
                        Đã hiểu
                      </button>
                    </p>
                  )}
                </div>
                {data.resume && (
                  <Link
                    to={`/grammar/${data.resume.slug}${data.resume.tab ? `?tab=${data.resume.tab}` : ""}`}
                    className="min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
                  >
                    {data.resume.started ? "Học tiếp" : "Bắt đầu"}: {data.resume.name} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {loggedIn && data.suggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Gợi ý cho bạn
                </h2>
                <div className="grid md:grid-cols-3 gap-3">
                  {data.suggestions.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/grammar/${s.slug}`}
                      className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400 transition-colors space-y-1 min-h-[88px]"
                    >
                      <p className="text-sm font-bold text-white">{s.name}</p>
                      <p className="text-xs text-cyan-200">{s.reason}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {loggedIn && (
              <Link
                to="/grammar/review"
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-bold min-h-[40px] w-fit"
              >
                <Brain className="w-4 h-4" /> Ôn ngữ pháp theo lịch
              </Link>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm chủ điểm (không cần dấu)…"
                  className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-400 outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {loggedIn && myLevel && (
                  <Chip active={level === "mine"} onClick={() => setLevel("mine")}>
                    Cấp độ của bạn ({LEVEL_LABELS[myLevel]})
                  </Chip>
                )}
                <Chip active={level === "all" || (!myLevel && level === "mine")} onClick={() => setLevel("all")}>
                  Tất cả cấp độ
                </Chip>
                {LEVELS.map((l) => (
                  <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                    {LEVEL_LABELS[l]}
                  </Chip>
                ))}
              </div>
              {loggedIn && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Chip active={status === "all"} onClick={() => setStatus("all")}>
                    Mọi trạng thái
                  </Chip>
                  {(Object.keys(STATUS_LABELS) as TopicStatus[]).map((s) => (
                    <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                      {STATUS_LABELS[s]}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {topics.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Không có chủ điểm nào khớp bộ lọc.</p>
            ) : (
              data.groups
                .filter((g) => topics.some((t) => t.group === g))
                .map((g) => (
                  <section key={g} className="space-y-3">
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">{g}</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {topics
                        .filter((t) => t.group === g)
                        .map((t) => (
                          <TopicTile key={t.slug} t={t} loggedIn={loggedIn} />
                        ))}
                    </div>
                  </section>
                ))
            )}
          </>
        )}
      </div>
      {loggedIn && (
        <LevelPromptDialog
          open={prompt}
          onChoose={(l) => settings.mutate({ level: l })}
          onDismiss={() => {
            setPrompt(false);
            if (data?.level?.needs_prompt) settings.mutate({ dismiss_prompt: true });
          }}
        />
      )}
    </StudentLayout>
  );
};

export default GrammarCenterPage;
