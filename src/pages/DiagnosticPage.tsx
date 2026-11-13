import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Headphones, PlayCircle, RotateCcw } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { getDiagnosticStatus, startDiagnostic } from "@/lib/api/analytics";
import { loadDraft, saveDraft } from "@/components/roadmap/roadmapDraft";

const PART_NAMES: Record<number, string> = {
  1: "Mô tả tranh",
  2: "Hỏi – đáp",
  3: "Đoạn hội thoại",
  4: "Bài nói ngắn",
  5: "Hoàn thành câu",
  6: "Hoàn thành đoạn văn",
  7: "Đọc hiểu",
};

/** Màn giới thiệu bài kiểm tra trình độ (P01). */
const DiagnosticPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const fromRoadmap = params.get("from") === "roadmap";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["diagnostic-status", user?.id],
    queryFn: getDiagnosticStatus,
    enabled: !!user,
    staleTime: 0,
  });
  const start = useMutation({
    mutationFn: (restart: boolean) => startDiagnostic(restart),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      navigate(`/practice/session/${s.id}${fromRoadmap ? "?from=roadmap" : ""}`);
    },
    onError: (err) => toast({ title: "Chưa bắt đầu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const applyFullTestScore = (score: number) => {
    const draft = loadDraft();
    saveDraft({
      step: 2,
      mode: "score",
      score: String(Math.round(score / 5) * 5),
      target: draft?.target ?? "",
      purpose: draft?.purpose ?? "job",
      timeframe: draft?.timeframe ?? "weeks",
      weeks: draft?.weeks ?? 12,
      examDate: draft?.examDate ?? "",
      minutes: draft?.minutes ?? 60,
      days: draft?.days ?? 5,
    });
    navigate("/roadmap");
  };

  return (
    <StudentLayout>
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-16 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-cyan-400" /> Kiểm tra trình độ
          </h1>
          <p className="text-sm text-slate-400 mt-1">Biết nhanh điểm Listening/Reading và Part nào đang yếu mà không cần làm đề 200 câu.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-3xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được bài kiểm tra" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : !data.available ? (
          <div className="p-8 rounded-3xl border border-slate-800 text-center text-slate-300">Bài kiểm tra trình độ đang được chuẩn bị. Vui lòng quay lại sau.</div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <div className="text-2xl font-black text-white">{data.total_questions}</div>
                <div className="text-xs text-slate-400">câu hỏi</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <div className="text-2xl font-black text-white">~{data.minutes}</div>
                <div className="text-xs text-slate-400">phút</div>
              </div>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                {data.structure.map((s) => (
                  <tr key={s.part}>
                    <td className="py-2 text-slate-300">
                      Part {s.part} · {PART_NAMES[s.part]}
                    </td>
                    <td className="py-2 text-right font-bold text-white">{s.count} câu</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="text-sm text-slate-300 space-y-1">
              <li className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-cyan-400" /> Cần tai nghe, làm một mạch: Listening trước rồi Reading, có đồng hồ.
              </li>
              <li>· Không hiện đúng/sai trong lúc làm. Thoát giữa chừng vẫn làm tiếp được.</li>
              <li>· Kết quả là ước lượng, không thay cho điểm thi thật.</li>
            </ul>

            {data.retake_warning && (
              <p className="text-xs text-amber-300">Bạn vừa làm bài này trong 7 ngày qua — sẽ gặp lại cùng câu hỏi, kết quả có thể cao hơn thực tế.</p>
            )}
            {data.latest && (
              <p className="text-sm text-slate-300">
                Lần trước ({data.latest.submitted_at ? new Date(data.latest.submitted_at).toLocaleDateString("vi-VN") : ""}):{" "}
                {data.latest.usable && data.latest.total ? `khoảng ${data.latest.total.min}–${data.latest.total.max} điểm` : "chưa đủ câu trả lời để ước lượng"} ·{" "}
                <Link to={`/diagnostic/result/${data.latest.session_id}`} className="text-cyan-400 font-bold">
                  Xem kết quả
                </Link>
              </p>
            )}
            {data.recent_full_test?.total_score != null && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Bạn đã có kết quả Full Test ngày{" "}
                  {data.recent_full_test.completed_at ? new Date(data.recent_full_test.completed_at).toLocaleDateString("vi-VN") : ""} (
                  {data.recent_full_test.total_score} điểm), có thể dùng luôn để tạo lộ trình.
                </span>
                <button
                  type="button"
                  onClick={() => applyFullTestScore(data.recent_full_test!.total_score!)}
                  className="min-h-[40px] px-3 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-xs"
                >
                  Dùng kết quả này
                </button>
              </div>
            )}

            {data.in_progress ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-200">
                  Bạn đang làm dở (câu {data.in_progress.answered_count}/{data.in_progress.total_questions}). Làm tiếp hay làm lại từ đầu?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => start.mutate(false)}
                    disabled={start.isPending}
                    className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" /> Làm tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => start.mutate(true)}
                    disabled={start.isPending}
                    className="min-h-[48px] px-5 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại từ đầu
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => start.mutate(false)}
                disabled={start.isPending}
                className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" /> {start.isPending ? "Đang chuẩn bị..." : "Bắt đầu"}
              </button>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default DiagnosticPage;
