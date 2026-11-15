import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, CheckCircle2, PlayCircle } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { GrammarRunner } from "@/components/grammar/GrammarRunner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { getGrammarReview, getGrammarSession, startGrammarReview, type GrammarResult, type GrammarSession } from "@/lib/api/grammar";

const fmtDate = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("vi-VN") : "—");

/** Ôn ngữ pháp theo lịch (G08): tối đa 3 chủ điểm × 5 câu, nhắc công thức trước mỗi chủ điểm. */
const GrammarReviewPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addXp } = useGamification();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["grammar-review", user?.id],
    queryFn: getGrammarReview,
    enabled: !!user,
    staleTime: 0,
  });
  const [chosen, setChosen] = useState<Set<number> | null>(null);
  const [session, setSession] = useState<GrammarSession | null>(null);
  const [result, setResult] = useState<GrammarResult | null>(null);

  useEffect(() => {
    if (data && chosen === null) setChosen(new Set(data.due.slice(0, 3).map((d) => d.topic_id)));
  }, [data, chosen]);

  const start = useMutation({
    mutationFn: (extra: boolean) => startGrammarReview(extra ? { extra: true } : { topic_ids: [...(chosen ?? [])] }),
    onSuccess: (s) => {
      setResult(null);
      setSession(s);
    },
    onError: (err) => toast({ title: "Chưa bắt đầu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  const resume = useMutation({
    mutationFn: (id: string) => getGrammarSession(id),
    onSuccess: (s) => setSession(s),
  });

  // Mở từ thẻ "Ôn thêm" ở Bàn học
  useEffect(() => {
    if (params.get("extra") === "1" && data && data.due_count === 0 && data.extra_available && !session && !start.isPending && !result) start.mutate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const finished = (r: GrammarResult) => {
    if (r.xp_new && r.xp > 0) addXp(r.xp, `Ôn ngữ pháp (${r.correct}/${r.total} câu đúng)`);
    setSession(null);
    setResult(r);
    void queryClient.invalidateQueries({ queryKey: ["grammar-review"] });
    void queryClient.invalidateQueries({ queryKey: ["grammar-overview"] });
  };

  return (
    <StudentLayout>
      <div className="w-full max-w-3xl mx-auto space-y-5 pb-16 font-sans">
        <Link to="/grammar" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1.5 min-h-[40px]">
          <ArrowLeft className="w-4 h-4" /> Grammar Center
        </Link>
        <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
          <Brain className="w-7 h-7 text-cyan-400" /> Ôn ngữ pháp
        </h1>

        {session ? (
          <GrammarRunner key={session.id} session={session} onFinished={finished} />
        ) : result ? (
          <div className="p-5 sm:p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-white font-bold text-lg">
                Xong phiên ôn · {result.correct}/{result.total} câu đúng{result.xp > 0 && <> · +{result.xp} XP</>}
              </p>
              {result.fixed_count > 0 && <p className="text-sm text-emerald-200">{result.fixed_count} lỗi chuyển sang "Đã sửa đúng"</p>}
            </div>
            <ul className="space-y-2">
              {result.topics.map((t) => (
                <li key={t.topic_id} className="p-3 rounded-xl border border-slate-800 bg-[#070e1c]/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">
                    {t.name} {t.correct}/{t.total}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.graduated ? "Đã vững — rời lịch ôn" : t.next_due ? `Ôn tiếp ${fmtDate(t.next_due)}` : t.correct < t.total || !t.rescheduled ? "Chưa đổi lịch" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  void refetch();
                }}
                className="min-h-[48px] rounded-xl border border-slate-700 text-slate-200 font-bold text-sm"
              >
                Ôn thêm chủ điểm khác
              </button>
              <Link to="/grammar" className="min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center">
                Về Grammar Center
              </Link>
            </div>
          </div>
        ) : isLoading || !data ? (
          isError ? (
            <ErrorState title="Không tải được lịch ôn" message="Vui lòng thử lại." onRetry={() => refetch()} />
          ) : (
            <Skeleton className="h-64 w-full rounded-3xl" />
          )
        ) : !data.has_mistakes && data.due_count === 0 ? (
          <div className="p-8 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
            <p className="text-white font-bold">Chưa có lỗi ngữ pháp nào được lưu</p>
            <Link to="/grammar" className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center">
              Làm bài tập chủ điểm gợi ý
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data.active_session_id && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-amber-200">Bạn đang ôn dở một phiên.</p>
                <button
                  type="button"
                  onClick={() => resume.mutate(data.active_session_id!)}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-500/20 text-amber-100 font-bold text-sm"
                >
                  Làm tiếp
                </button>
              </div>
            )}
            {data.due_count === 0 ? (
              <div className="p-6 rounded-3xl border border-slate-800 bg-[#070e1c]/80 text-center space-y-3">
                <p className="text-white font-bold">Hôm nay không có chủ điểm cần ôn</p>
                {data.extra_available && (
                  <button
                    type="button"
                    disabled={start.isPending}
                    onClick={() => start.mutate(true)}
                    className="min-h-[48px] px-5 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm"
                  >
                    Ôn thêm
                  </button>
                )}
              </div>
            ) : (
              <div className="p-5 sm:p-6 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-4">
                <p className="text-sm text-slate-300">
                  Phiên này: tối đa 3 chủ điểm × 5 câu · khoảng {data.est_minutes} phút
                  {data.due_count > 3 && <> · còn {data.due_count} chủ điểm đến hạn</>}
                </p>
                <ul className="space-y-2">
                  {data.due.slice(0, 3).map((d) => {
                    const on = chosen?.has(d.topic_id) ?? true;
                    return (
                      <li key={d.topic_id}>
                        <label
                          className={cn(
                            "p-3 rounded-xl border flex items-center gap-3 cursor-pointer min-h-[56px]",
                            on ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800",
                            d.available === 0 && "opacity-60",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={on && d.available > 0}
                            disabled={d.available === 0}
                            onChange={() =>
                              setChosen((c) => {
                                const n = new Set(c ?? []);
                                if (n.has(d.topic_id)) n.delete(d.topic_id);
                                else n.add(d.topic_id);
                                return n;
                              })
                            }
                            className="w-4 h-4 accent-cyan-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-white">{d.name}</span>
                            <span className="block text-xs text-slate-400">
                              {d.open} lỗi chưa sửa · lần ôn trước {d.last_review_at ? new Date(d.last_review_at).toLocaleDateString("vi-VN") : "chưa có"}
                              {d.available === 0 && " · Không còn câu khả dụng (đề chưa mở khóa)"}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={start.isPending || !chosen?.size}
                  onClick={() => start.mutate(false)}
                  className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" /> Bắt đầu
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default GrammarReviewPage;
