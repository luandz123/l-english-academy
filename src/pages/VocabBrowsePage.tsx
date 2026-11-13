import React, { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, Layers, Volume2 } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { LEVEL_LABELS, listVocabEntries, saveWordsBatch, type VocabLevel } from "@/lib/api/vocabulary";

const PART_NAMES: Record<number, string> = {
  1: "Mô tả tranh",
  2: "Hỏi – đáp",
  3: "Hội thoại",
  4: "Bài nói",
  5: "Hoàn thành câu",
  6: "Hoàn thành đoạn",
  7: "Đọc hiểu",
};

/** Từ vựng theo Part và cấp độ (V02/V04): kho 600 từ TOEIC + từ admin thêm, gắn nhãn theo tần suất trong đề. */
const VocabBrowsePage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [part, setPart] = useState<number | null>(null);
  const [level, setLevel] = useState<VocabLevel | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 40;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-entries", user?.id, part, level, q, page],
    queryFn: () => listVocabEntries({ parts: part ? [part] : undefined, levels: level ? [level] : undefined, q, page, limit }),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
  const save = useMutation({
    mutationFn: (ids: number[]) => saveWordsBatch({ entry_ids: ids }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["vocab-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
      toast({ title: r.added > 0 ? `Đã lưu ${r.added} từ vào sổ` : "Các từ này đã có trong sổ" });
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const count = (p: number | null, l: VocabLevel | null) =>
    (data?.facets ?? []).filter((f) => (p === null || f.part === p) && (l === null || f.level === l)).reduce((n, f) => n + f.count, 0);
  const unsaved = (data?.items ?? []).filter((e) => !e.saved).map((e) => e.id);

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-cyan-400" /> Từ vựng theo Part & cấp độ
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Part = nơi từ xuất hiện nhiều nhất trong kho đề; cấp độ theo độ phổ biến của từ. Lưu từ vào{" "}
            <Link to="/vocabulary" className="text-cyan-400 font-bold">Sổ từ vựng</Link> để ôn theo lịch.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[null, 1, 2, 3, 4, 5, 6, 7].map((p) => {
              const n = count(p, null);
              if (p !== null && n === 0) return null;
              return (
                <button
                  key={p ?? "all"}
                  type="button"
                  onClick={() => { setPart(p); setPage(1); }}
                  className={cn(
                    "min-h-[40px] px-3 rounded-xl border text-xs font-bold",
                    part === p ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
                  )}
                >
                  {p === null ? "Tất cả" : `Part ${p} · ${PART_NAMES[p]}`} <span className="text-slate-500 font-medium">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {(Object.keys(LEVEL_LABELS) as VocabLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { setLevel(level === l ? null : l); setPage(1); }}
                className={cn(
                  "min-h-[40px] px-3 rounded-xl border text-xs font-bold",
                  level === l ? "border-violet-500 bg-violet-500/15 text-violet-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
                )}
              >
                {LEVEL_LABELS[l]} <span className="text-slate-500 font-medium">{count(part, l)}</span>
              </button>
            ))}
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm từ" className="h-10 w-40" />
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được danh sách từ" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <p className="p-8 rounded-2xl border border-slate-800 text-center text-sm text-slate-400">Không có từ nào khớp lựa chọn.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-400">{data.total} từ</p>
              {unsaved.length > 0 && (
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate(unsaved)}
                  className="min-h-[40px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <BookmarkPlus className="w-4 h-4" /> Lưu {unsaved.length} từ trên trang này
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.items.map((e) => (
                <div key={e.id} className="p-3 rounded-2xl border border-slate-800 bg-[#070e1c]/90 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-white">{e.word}</span>
                      {e.phonetic && <span className="text-xs text-slate-500">{e.phonetic}</span>}
                    </div>
                    <p className="text-sm text-slate-300">{e.definition_vi}</p>
                    <p className="text-[11px] text-slate-500">
                      {e.part ? `Part ${e.part}` : "Chưa gặp trong đề"}
                      {e.level ? ` · ${LEVEL_LABELS[e.level]}` : ""}
                      {e.frequency > 0 ? ` · ${e.frequency} lần trong kho đề` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => void soundAudioPlayer.speakText(e.word)} className="w-10 h-10 rounded-xl border border-slate-700 text-cyan-300 flex items-center justify-center shrink-0" aria-label="Nghe phát âm">
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {e.saved ? (
                    <span className="w-10 h-10 rounded-xl border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0" title="Đã lưu">
                      <BookmarkCheck className="w-4 h-4" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={save.isPending}
                      onClick={() => save.mutate([e.id])}
                      className="w-10 h-10 rounded-xl border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shrink-0"
                      aria-label="Lưu vào sổ"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {data.total > limit && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30">Trước</button>
                <span className="text-sm text-slate-400">Trang {page}/{Math.ceil(data.total / limit)}</span>
                <button type="button" disabled={page * limit >= data.total} onClick={() => setPage(page + 1)} className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30">Sau</button>
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabBrowsePage;
