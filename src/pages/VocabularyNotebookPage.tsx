import React, { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookA, Brain, Layers, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import {
  LEVEL_LABELS,
  SOURCE_LABELS,
  STATE_LABELS,
  deleteWord,
  getVocabSummary,
  listNotebook,
  saveVocabSettings,
  saveWord,
  updateWord,
  type SavedWord,
  type VocabSource,
  type VocabState,
} from "@/lib/api/vocabulary";

const STATE_CLS: Record<VocabState, string> = {
  new: "border-slate-700 text-slate-300",
  learning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  review: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  mastered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
};

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      "min-h-[40px] px-3 rounded-xl border text-xs font-bold transition-colors",
      on ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
    )}
  >
    {children}
  </button>
);

const WordEditor: React.FC<{ word: SavedWord | "new"; onClose: () => void }> = ({ word, onClose }) => {
  const isNew = word === "new";
  const [w, setW] = useState(isNew ? "" : word.word);
  const [meaning, setMeaning] = useState(isNew ? "" : (word.definition_vi ?? ""));
  const [phonetic, setPhonetic] = useState(isNew ? "" : (word.phonetic ?? ""));
  const [example, setExample] = useState(isNew ? "" : (word.example ?? ""));
  const [note, setNote] = useState(isNew ? "" : (word.note ?? ""));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const r = await saveWord({ word: w, source: "manual", definition_vi: meaning || undefined, phonetic: phonetic || undefined, example: example || undefined, note: note || undefined });
        return r.already ? "Từ này đã có trong sổ" : "Đã thêm từ";
      }
      await updateWord(word.id, { definition_vi: meaning, phonetic, example, note });
      return "Đã lưu thay đổi";
    },
    onSuccess: (msg) => {
      void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
      toast({ title: msg });
      onClose();
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Thêm từ vào sổ" : `Sửa "${word.word}"`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {isNew && <Input value={w} onChange={(e) => setW(e.target.value)} placeholder="Từ / cụm từ tiếng Anh" maxLength={60} autoFocus />}
          <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder={isNew ? "Nghĩa (để trống nếu từ có sẵn trong kho)" : "Nghĩa"} maxLength={300} />
          <Input value={phonetic} onChange={(e) => setPhonetic(e.target.value)} placeholder="Phiên âm" maxLength={80} />
          <Input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Câu ví dụ" maxLength={400} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" maxLength={500} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || (isNew ? !w.trim() : !meaning.trim())}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Sổ từ vựng cá nhân (V07). */
const VocabularyNotebookPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<VocabSource | null>(null);
  const [state, setState] = useState<VocabState | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SavedWord | "new" | null>(null);

  const { data: summary } = useQuery({ queryKey: ["vocab-summary", user?.id], queryFn: getVocabSummary, enabled: !!user });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-notebook", user?.id, q, source, state, page],
    queryFn: () => listNotebook({ q, sources: source ? [source] : undefined, states: state ? [state] : undefined, page, limit: 30 }),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteWord(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-saved-keys"] });
    },
    onError: (err) => toast({ title: "Không xóa được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const settings = useMutation({
    mutationFn: (n: number) => saveVocabSettings(n),
    onSuccess: (s) => queryClient.setQueryData(["vocab-summary", user?.id], s),
  });

  const toReview = (summary?.due ?? 0) + (summary?.new_available ?? 0);
  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16 font-sans">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
              <BookA className="w-7 h-7 text-cyan-400" /> Sổ từ vựng
            </h1>
            <p className="text-sm text-slate-400 mt-1">Từ bạn lưu từ bài nghe, bài đọc, flashcard hoặc tự thêm. Ôn theo lịch lặp lại ngắt quãng.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/vocabulary/browse" className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Từ theo Part & cấp độ
            </Link>
            <button type="button" onClick={() => setEditing("new")} className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-sm font-bold inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Thêm từ
            </button>
          </div>
        </div>

        <div className="p-5 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="grid grid-cols-4 gap-3 flex-1">
            {[
              { label: "Đến hạn", value: summary?.due, cls: "text-amber-300" },
              { label: "Mới hôm nay", value: summary?.new_available, cls: "text-cyan-300" },
              { label: "Đã thuộc", value: summary?.mastered, cls: "text-emerald-300" },
              { label: "Tổng số từ", value: summary?.total, cls: "text-white" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={cn("text-2xl font-black", s.cls)}>{s.value ?? "–"}</div>
                <div className="text-[11px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="text-xs text-slate-400 flex items-center gap-2">
              Từ mới/ngày
              <select
                value={summary?.new_per_day ?? 20}
                onChange={(e) => settings.mutate(Number(e.target.value))}
                className="h-10 rounded-lg bg-slate-900 border border-slate-700 text-white px-2"
              >
                {[0, 5, 10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <Link
              to="/vocabulary/review"
              className={cn(
                "min-h-[48px] px-6 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2",
                toReview > 0 ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "border border-slate-700 text-slate-400 pointer-events-none",
              )}
            >
              <Brain className="w-4 h-4" /> {toReview > 0 ? `Ôn ngay (${toReview} thẻ)` : "Hôm nay đã ôn xong"}
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Tìm từ hoặc nghĩa" className="h-11 max-w-md" />
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!source} onClick={() => { setSource(null); setPage(1); }}>Mọi nguồn</Chip>
            {(Object.keys(SOURCE_LABELS) as VocabSource[]).map((s) => (
              <Chip key={s} on={source === s} onClick={() => { setSource(source === s ? null : s); setPage(1); }}>{SOURCE_LABELS[s]}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATE_LABELS) as VocabState[]).map((s) => (
              <Chip key={s} on={state === s} onClick={() => { setState(state === s ? null : s); setPage(1); }}>{STATE_LABELS[s]}</Chip>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được sổ từ" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.items.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 text-center text-sm text-slate-300 space-y-2">
            <p>{summary?.total ? "Không có từ nào khớp bộ lọc." : "Sổ còn trống."}</p>
            {!summary?.total && (
              <p className="text-slate-400">
                Bấm vào một từ trong transcript, bôi đen từ trong đoạn văn, lưu từ ở bộ flashcard hoặc{" "}
                <Link to="/vocabulary/browse" className="text-cyan-400 font-bold">chọn từ theo Part</Link>.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{data.total} từ</p>
            {data.items.map((w) => (
              <div key={w.id} className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90 flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-black text-white">{w.word}</span>
                    {w.phonetic && <span className="text-xs text-slate-400">{w.phonetic}</span>}
                    <button type="button" onClick={() => void soundAudioPlayer.speakText(w.word)} className="w-8 h-8 rounded-lg border border-slate-700 text-cyan-300 flex items-center justify-center" aria-label="Nghe phát âm">
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className={cn("px-2 py-0.5 rounded-md border text-[11px] font-bold", STATE_CLS[w.state])}>{STATE_LABELS[w.state]}</span>
                  </div>
                  <p className="text-sm text-slate-200">{w.definition_vi}</p>
                  {w.example && <p className="text-xs text-slate-400 italic">"{w.example}"</p>}
                  {w.note && <p className="text-xs text-amber-200">Ghi chú: {w.note}</p>}
                  <p className="text-[11px] text-slate-500">
                    {SOURCE_LABELS[w.source]}
                    {w.part ? ` · Part ${w.part}` : ""}
                    {w.level ? ` · ${LEVEL_LABELS[w.level]}` : ""}
                    {w.due_at && w.state !== "new" ? ` · ôn lại ${new Date(w.due_at).toLocaleDateString("vi-VN")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => setEditing(w)} className="w-10 h-10 rounded-xl border border-slate-700 text-slate-300 flex items-center justify-center" aria-label="Sửa">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Xóa "${w.word}" khỏi sổ? Lịch ôn của từ này cũng bị xóa.`) && remove.mutate(w.id)}
                    className="w-10 h-10 rounded-xl border border-slate-700 text-rose-300 flex items-center justify-center"
                    aria-label="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {data.total > data.limit && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30">Trước</button>
                <span className="text-sm text-slate-400">Trang {page}/{Math.ceil(data.total / data.limit)}</span>
                <button type="button" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)} className="min-h-[40px] px-4 rounded-xl border border-slate-800 text-sm text-slate-200 disabled:opacity-30">Sau</button>
              </div>
            )}
          </div>
        )}
      </div>
      {editing && <WordEditor word={editing} onClose={() => setEditing(null)} />}
    </StudentLayout>
  );
};

export default VocabularyNotebookPage;
