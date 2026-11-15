import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, BookX, Brain, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToastAction } from "@/components/ui/toast";
import { GrammarRunner } from "@/components/grammar/GrammarRunner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  KIND_LABELS,
  MISTAKE_STATUS_LABELS,
  deleteExerciseMistake,
  getGrammarMistakes,
  restoreExerciseMistake,
  retryGrammarMistake,
  setMistakeNote,
  splitErrorPrompt,
  type GrammarMistake,
  type GrammarSession,
  type MistakeFilter,
  type MistakeStatus,
} from "@/lib/api/grammar";

const STATUS_CLS: Record<MistakeStatus, string> = {
  not_reviewed: "bg-rose-500/15 text-rose-300",
  improving: "bg-amber-500/15 text-amber-300",
  fixed: "bg-emerald-500/15 text-emerald-300",
};

const NoteBox: React.FC<{ m: GrammarMistake }> = ({ m }) => {
  const [note, setNote] = useState(m.note ?? "");
  const { toast } = useToast();
  const save = useMutation({
    mutationFn: () => setMistakeNote(m.type, m.ref_id, note),
    onError: (err) => toast({ title: "Chưa lưu được ghi chú", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  return (
    <textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => note !== (m.note ?? "") && save.mutate()}
      maxLength={1000}
      rows={2}
      placeholder="Ghi chú của bạn (vd. hay nhầm since/for)…"
      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-cyan-400 outline-none"
    />
  );
};

const MistakeRow: React.FC<{ m: GrammarMistake; onRetry: () => void; onDelete: () => void }> = ({ m, onRetry, onDelete }) => (
  <div className="p-4 rounded-2xl border border-slate-800 bg-[#030712]/80 space-y-3">
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
      <span className={cn("px-2 py-0.5 rounded-md", STATUS_CLS[m.status])}>{MISTAKE_STATUS_LABELS[m.status]}</span>
      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{m.source_label}</span>
      {m.kind && <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{KIND_LABELS[m.kind]}</span>}
      {m.wrong_count > 0 && <span className="text-slate-400">Sai {m.wrong_count} lần</span>}
      {m.manual && m.wrong_count === 0 && <span className="text-amber-300">Tự lưu</span>}
      {m.updated && <span className="text-cyan-300">Câu đã được cập nhật</span>}
      {m.unavailable && <span className="text-slate-500">Câu không còn khả dụng</span>}
    </div>
    {m.passage && <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-line">{m.passage}</p>}
    <p className="text-sm text-white leading-relaxed">
      {m.kind === "error" ? splitErrorPrompt(m.prompt).map((p, i) => (p.seg === null ? p.text : <u key={i} className="decoration-cyan-400">{p.text}</u>)) : m.prompt}
    </p>
    {m.options.length > 0 && m.kind !== "error" && <p className="text-xs text-slate-400">{m.options.map((o, i) => `${"ABCD"[i]}. ${o}`).join("   ")}</p>}
    <div className="grid sm:grid-cols-2 gap-2 text-sm">
      {m.chosen && (
        <p className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-200">
          Bạn chọn: <b>{m.chosen}</b>
        </p>
      )}
      {m.correct && (
        <p className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-200">
          Đáp án đúng: <b>{m.correct}</b>
        </p>
      )}
    </div>
    {m.explanation && <p className="text-xs text-emerald-200 whitespace-pre-line">{m.explanation}</p>}
    <NoteBox m={m} />
    <div className="flex flex-wrap gap-2">
      {!m.unavailable && (
        <button type="button" onClick={onRetry} className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" /> Làm lại
        </button>
      )}
      {m.type === "ex" && (
        <button type="button" onClick={onDelete} className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" /> Xóa
        </button>
      )}
    </div>
  </div>
);

/** Sổ lỗi ngữ pháp (G07): lỗi bài tập chủ điểm + câu TOEIC (từ Sổ câu sai) nhóm theo chủ điểm. */
const GrammarMistakesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MistakeFilter>({});
  const [open, setOpen] = useState<Set<string>>(new Set(location.hash ? [location.hash.slice(1)] : []));
  const [retry, setRetry] = useState<GrammarSession | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["grammar-mistakes", user?.id, filter],
    queryFn: () => getGrammarMistakes(filter),
    enabled: !!user,
  });

  useEffect(() => {
    if (location.hash) document.getElementById(`g-${location.hash.slice(1)}`)?.scrollIntoView({ behavior: "smooth" });
  }, [location.hash, data]);

  const startRetry = useMutation({
    mutationFn: (m: GrammarMistake) => retryGrammarMistake(m.type, m.ref_id),
    onSuccess: (s) => setRetry(s),
    onError: (err) => toast({ title: "Không mở được câu", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (m: GrammarMistake) => deleteExerciseMistake(m.ref_id),
    onSuccess: (_r, m) => {
      void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] });
      toast({
        title: "Đã xóa lỗi khỏi sổ",
        action: (
          <ToastAction
            altText="Hoàn tác"
            onClick={() => void restoreExerciseMistake(m.ref_id).then(() => queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] }))}
          >
            Hoàn tác
          </ToastAction>
        ),
      });
    },
    onError: (err) => toast({ title: "Chưa xóa được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const chip = (active: boolean) =>
    cn("min-h-[40px] px-3 rounded-xl border text-xs font-bold whitespace-nowrap", active ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 text-slate-300");
  const set = (patch: Partial<MistakeFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto space-y-5 pb-16 font-sans">
        <Link to="/grammar" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1.5 min-h-[40px]">
          <ArrowLeft className="w-4 h-4" /> Grammar Center
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
            <BookX className="w-7 h-7 text-cyan-400" /> Lỗi ngữ pháp của tôi
          </h1>
          <Link to="/mistakes" className="text-sm text-slate-300 hover:text-white font-bold min-h-[40px] inline-flex items-center">
            Mở Sổ câu sai
          </Link>
        </div>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được Sổ lỗi ngữ pháp" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.total === 0 ? (
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
            <p className="text-white font-bold">Chưa có lỗi ngữ pháp nào được lưu</p>
            <Link to="/grammar" className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center">
              Làm bài tập chủ điểm gợi ý
            </Link>
          </div>
        ) : (
          <>
            <div className="p-5 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-white font-bold">
                {data.open} lỗi chưa sửa · {data.topics_with_mistakes} chủ điểm có lỗi
              </p>
              <Link to="/grammar/review" className="min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2">
                <Brain className="w-4 h-4" /> Ôn ngay
              </Link>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={chip(!filter.source)} onClick={() => set({ source: undefined })}>
                  Mọi nguồn
                </button>
                <button type="button" className={chip(filter.source === "exercise")} onClick={() => set({ source: "exercise" })}>
                  Bài tập chủ điểm
                </button>
                <button type="button" className={chip(filter.source === "toeic")} onClick={() => set({ source: "toeic" })}>
                  Câu TOEIC
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={chip(!filter.status)} onClick={() => set({ status: undefined })}>
                  Mọi trạng thái
                </button>
                {(Object.keys(MISTAKE_STATUS_LABELS) as MistakeStatus[]).map((s) => (
                  <button key={s} type="button" className={chip(filter.status === s)} onClick={() => set({ status: s })}>
                    {MISTAKE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={chip(!filter.days)} onClick={() => set({ days: undefined })}>
                  Toàn bộ
                </button>
                <button type="button" className={chip(filter.days === 7)} onClick={() => set({ days: 7 })}>
                  7 ngày
                </button>
                <button type="button" className={chip(filter.days === 30)} onClick={() => set({ days: 30 })}>
                  30 ngày
                </button>
                <button type="button" className={chip(!!filter.repeated)} onClick={() => set({ repeated: !filter.repeated })}>
                  Sai ≥ 2 lần
                </button>
              </div>
            </div>
            {data.groups.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Không có lỗi nào khớp bộ lọc.</p>
            ) : (
              data.groups.map((g) => {
                const isOpen = open.has(g.topic.slug);
                return (
                  <section key={g.topic.slug} id={`g-${g.topic.slug}`} className="rounded-3xl border border-slate-800 bg-[#070e1c]/90 scroll-mt-24">
                    <button
                      type="button"
                      onClick={() =>
                        setOpen((o) => {
                          const n = new Set(o);
                          if (n.has(g.topic.slug)) n.delete(g.topic.slug);
                          else n.add(g.topic.slug);
                          return n;
                        })
                      }
                      className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left min-h-[64px]"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-bold text-white">
                          {g.topic.name}
                          {g.topic.hidden && <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-400">Chủ điểm tạm ẩn</span>}
                        </p>
                        <p className="text-xs text-slate-400">
                          {g.open} chưa sửa / {g.total}
                          {g.last_wrong_at && <> · sai gần nhất {new Date(g.last_wrong_at).toLocaleDateString("vi-VN")}</>}
                          {g.next_review && <> · ôn tiếp {new Date(`${g.next_review}T00:00:00`).toLocaleDateString("vi-VN")}</>}
                        </p>
                      </div>
                      <ChevronDown className={cn("w-5 h-5 text-slate-400 shrink-0 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {!g.topic.hidden && (
                            <>
                              <Link to="/grammar/review" className="min-h-[40px] px-3 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5">
                                <Brain className="w-4 h-4" /> Ôn chủ điểm này
                              </Link>
                              <Link to={`/grammar/${g.topic.slug}?tab=lesson`} className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" /> Xem bài học
                              </Link>
                            </>
                          )}
                        </div>
                        {g.items.map((m) => (
                          <MistakeRow
                            key={m.key}
                            m={m}
                            onRetry={() => startRetry.mutate(m)}
                            onDelete={() => remove.mutate(m)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </>
        )}
      </div>
      <Dialog open={!!retry} onOpenChange={(o) => !o && (setRetry(null), void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Làm lại</DialogTitle>
          </DialogHeader>
          {retry && (
            <GrammarRunner
              key={retry.id}
              session={retry}
              compact
              onFinished={() => {
                setRetry(null);
                void queryClient.invalidateQueries({ queryKey: ["grammar-mistakes"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default GrammarMistakesPage;
