import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, CheckCircle2, Volume2 } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { getReviewQueue, reviewCard, type Rating, type ReviewCard } from "@/lib/api/vocabulary";

const BUTTONS: { rating: Rating; label: string; cls: string; key: string }[] = [
  { rating: "again", label: "Quên", cls: "border-rose-500/50 text-rose-300 hover:bg-rose-500/10", key: "1" },
  { rating: "hard", label: "Khó", cls: "border-amber-500/50 text-amber-300 hover:bg-amber-500/10", key: "2" },
  { rating: "good", label: "Nhớ", cls: "border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10", key: "3" },
  { rating: "easy", label: "Dễ", cls: "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10", key: "4" },
];
const XP_PER_CARD = 2;

/** Ôn từ vựng theo SRS SM-2 (V06): thẻ đến hạn + từ mới trong giới hạn ngày. */
const VocabReviewPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addXp } = useGamification();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-queue", user?.id],
    queryFn: getReviewQueue,
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    if (data && queue === null) setQueue(data.cards);
  }, [data, queue]);

  const current = queue?.[0];
  const rate = useMutation({
    mutationFn: (r: Rating) => reviewCard(current!.id, r),
    onSuccess: (card, r) => {
      setDone((d) => d + 1);
      setFlipped(false);
      // "Quên" → hỏi lại cuối hàng trong phiên này
      setQueue((q) => (q ? [...q.slice(1), ...(r === "again" ? [card] : [])] : q));
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
    },
    onError: (err) => {
      setQueue((q) => (q ? q.slice(1) : q));
      toast({ title: "Không lưu được kết quả ôn", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  // Hết thẻ: cộng XP một lần cho phiên
  useEffect(() => {
    if (queue && queue.length === 0 && done > 0 && !awarded) {
      setAwarded(true);
      addXp(Math.max(10, done * XP_PER_CARD), `Ôn ${done} thẻ từ vựng`);
      void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
    }
  }, [queue, done, awarded, addXp, queryClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current || rate.isPending) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped(true);
      }
      const b = BUTTONS.find((x) => x.key === e.key);
      if (b && flipped) rate.mutate(b.rating);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flipped, rate]);

  return (
    <StudentLayout>
      <div className="w-full max-w-2xl mx-auto space-y-6 pb-16 font-sans">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-cyan-400" /> Ôn từ vựng
          </h1>
          {queue && <span className="text-sm text-slate-400">Còn {queue.length} thẻ · đã ôn {done}</span>}
        </div>

        {isLoading || queue === null ? (
          <Skeleton className="h-80 w-full rounded-3xl" />
        ) : isError ? (
          <ErrorState title="Không tải được thẻ ôn" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : !current ? (
          <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-white font-bold text-lg">{done > 0 ? `Xong! Bạn đã ôn ${done} thẻ hôm nay.` : "Hôm nay không còn thẻ nào cần ôn."}</p>
            <p className="text-sm text-slate-400">Lưu thêm từ mới từ bài nghe, bài đọc hoặc danh sách theo Part.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/vocabulary" className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center">Sổ từ vựng</Link>
              <Link to="/vocabulary/browse" className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">Từ theo Part</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="w-full min-h-[260px] p-6 rounded-3xl border border-cyan-500/30 bg-[#070e1c]/90 flex flex-col items-center justify-center gap-3 text-center"
            >
              {current.state === "new" && <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Từ mới</span>}
              <span className="text-3xl sm:text-4xl font-black text-white">{current.word}</span>
              {current.phonetic && <span className="text-sm text-slate-400">{current.phonetic}</span>}
              {flipped ? (
                <div className="space-y-2 pt-2 border-t border-slate-800 w-full">
                  <p className="text-lg text-cyan-100 font-bold">{current.definition_vi}</p>
                  {current.example && <p className="text-sm text-slate-400 italic">"{current.example}"</p>}
                  {current.note && <p className="text-xs text-amber-200">Ghi chú: {current.note}</p>}
                </div>
              ) : (
                <span className="text-xs text-slate-500">Nhớ nghĩa rồi bấm để lật thẻ (phím cách)</span>
              )}
            </button>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void soundAudioPlayer.speakText(current.word)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-700 text-cyan-300 text-sm font-bold inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Nghe phát âm
              </button>
            </div>
            {flipped ? (
              <div className="grid grid-cols-4 gap-2">
                {BUTTONS.map((b) => (
                  <button
                    key={b.rating}
                    type="button"
                    disabled={rate.isPending}
                    onClick={() => rate.mutate(b.rating)}
                    className={cn("min-h-[56px] rounded-xl border font-bold text-sm flex flex-col items-center justify-center", b.cls)}
                  >
                    {b.label}
                    <span className="text-[11px] font-medium opacity-80">{current.intervals[b.rating]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm"
              >
                Lật thẻ
              </button>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabReviewPage;
