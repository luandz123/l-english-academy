import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, PlayCircle, Route as RouteIcon } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { getDiagnosticReport, LEVEL_CLASS, LEVEL_LABELS } from "@/lib/api/analytics";
import { createPracticeSession } from "@/lib/api/practice";
import { getMyRoadmap } from "@/lib/api/roadmap";
import { loadDraft, saveDraft } from "@/components/roadmap/roadmapDraft";

/** Kết quả bài kiểm tra trình độ (P01): khoảng điểm, bản đồ 7 Part, dạng yếu sơ bộ. */
const DiagnosticResultPage: React.FC = () => {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: r, isLoading, isError, refetch } = useQuery({
    queryKey: ["diagnostic-report", id, user?.id],
    queryFn: () => getDiagnosticReport(id),
    enabled: !!user && !!id,
  });
  const { data: roadmap } = useQuery({ queryKey: ["roadmap", user?.id], queryFn: getMyRoadmap, enabled: !!user });
  const fromRoadmap = params.get("from") === "roadmap" || loadDraft()?.mode === "placement";

  const practice = useMutation({
    mutationFn: (w: { part: number; category: string }) =>
      createPracticeSession({ kind: "question_type", parts: [w.part], categories: [w.category], count: 10, mode: "practice", feedback: "immediate" }),
    onSuccess: (s) => navigate(`/practice/session/${s.id}`),
    onError: (err) => toast({ title: "Chưa tạo được lượt luyện", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const toRoadmap = () => {
    // Điểm xuất phát do server đọc từ lượt chẩn đoán (chế độ "placement")
    const draft = loadDraft();
    saveDraft({
      step: 2,
      mode: "placement",
      score: "",
      target: draft?.target ?? "",
      purpose: draft?.purpose ?? "job",
      timeframe: draft?.timeframe ?? "weeks",
      weeks: draft?.weeks ?? 12,
      examDate: draft?.examDate ?? "",
      minutes: draft?.minutes ?? 60,
      days: draft?.days ?? 5,
    });
    void queryClient.invalidateQueries({ queryKey: ["roadmap-placement"] });
    navigate(roadmap && !fromRoadmap ? "/roadmap?edit=1" : "/roadmap");
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-[480px] w-full max-w-4xl mx-auto rounded-3xl" />
      </StudentLayout>
    );
  }
  if (isError || !r) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState title="Không tải được kết quả" message="Bài kiểm tra chưa nộp hoặc không tồn tại." onRetry={() => refetch()} />
        </div>
      </StudentLayout>
    );
  }

  const e = r.estimate;
  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 font-sans">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
          <ClipboardCheck className="w-7 h-7 text-cyan-400" /> Kết quả kiểm tra trình độ
        </h1>

        <div className="p-6 sm:p-8 rounded-3xl border border-cyan-500/25 bg-[#070e1c]/90 space-y-4">
          {r.usable && e.total ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Listening</div>
                  <div className="text-2xl font-black text-white">{e.listening ? `${e.listening.min}–${e.listening.max}` : "—"}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400">Reading</div>
                  <div className="text-2xl font-black text-white">{e.reading ? `${e.reading.min}–${e.reading.max}` : "—"}</div>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40">
                  <div className="text-xs text-cyan-200">Tổng</div>
                  <div className="text-2xl font-black text-white">
                    {e.total.min}–{e.total.max}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Ước lượng từ {r.total_questions} câu (đúng {r.correct}, bỏ trống {r.blank}), sai số khoảng ±{e.margin ?? 0} điểm. Không thay cho điểm thi thật.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-white font-bold">Chưa đủ câu trả lời để ước lượng</p>
              <p className="text-sm text-slate-400">Bạn đã bỏ trống {r.blank}/{r.total_questions} câu. Hãy làm lại để có kết quả dùng được.</p>
              <Link to="/diagnostic" className="min-h-[44px] px-5 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
                Làm lại
              </Link>
            </div>
          )}
        </div>

        <div className="p-5 rounded-3xl border border-slate-800 bg-[#070e1c]/90">
          <h2 className="text-sm font-black uppercase tracking-wider text-white mb-3">Bản đồ 7 Part</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {r.parts.map((p) => (
              <div key={p.part} className={cn("p-3 rounded-xl border text-center", LEVEL_CLASS[p.level].chip)}>
                <div className="text-xs font-bold">Part {p.part}</div>
                <div className="text-lg font-black">{p.total ? `${p.correct}/${p.total}` : "—"}</div>
                <div className="text-[11px]">{p.total ? LEVEL_LABELS[p.level] : "Không có câu"}</div>
              </div>
            ))}
          </div>
        </div>

        {r.weak.length > 0 && (
          <div className="p-5 rounded-3xl border border-rose-500/25 bg-[#070e1c]/90 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Dạng yếu phát hiện được</h2>
            <p className="text-xs text-slate-400">Kết luận sơ bộ, sẽ chính xác hơn khi bạn luyện thêm.</p>
            {r.weak.map((w) => (
              <div key={`${w.part}-${w.category}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-white font-bold">
                  Part {w.part} · {w.label} <span className="text-rose-300">({w.accuracy ?? 0}%, {w.answered} câu)</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {r.usable && e.total && (
            <button
              type="button"
              onClick={toRoadmap}
              className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm inline-flex items-center gap-2"
            >
              <RouteIcon className="w-4 h-4" />
              {fromRoadmap ? "Dùng kết quả này để tạo lộ trình" : roadmap ? "Cập nhật lộ trình" : "Tạo lộ trình từ kết quả này"}
            </button>
          )}
          <Link to={`/practice/session/${r.session_id}/result`} className="min-h-[48px] px-5 rounded-xl border border-slate-700 text-slate-200 font-bold text-sm inline-flex items-center">
            Xem giải thích từng câu
          </Link>
          {r.weak[0] && (
            <button
              type="button"
              disabled={practice.isPending}
              onClick={() => practice.mutate(r.weak[0])}
              className="min-h-[48px] px-5 rounded-xl border border-rose-500/40 text-rose-300 font-bold text-sm inline-flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Luyện ngay dạng yếu nhất
            </button>
          )}
          <Link to="/analysis" className="min-h-[48px] px-5 rounded-xl border border-cyan-500/40 text-cyan-300 font-bold text-sm inline-flex items-center">
            Xem phân tích đầy đủ
          </Link>
        </div>
      </div>
    </StudentLayout>
  );
};

export default DiagnosticResultPage;
