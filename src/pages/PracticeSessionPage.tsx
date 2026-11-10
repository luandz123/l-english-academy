import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, LogOut, Send } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
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
import { useGamification, XP_REWARDS } from "@/hooks/useGamification";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  abandonPracticeSession,
  getPracticeSession,
  savePracticeAnswer,
  submitPracticeSession,
  type QuestionFeedback,
} from "@/lib/api/practice";
import { PracticeQuestionCard } from "@/components/practice/PracticeQuestionCard";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Giao diện làm bài của một lượt luyện (theo dạng câu, Mini Test, Daily, câu sai). */
const PracticeSessionPage: React.FC = () => {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addXp } = useGamification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isLoading, isError, refetch } = useQuery({
    queryKey: ["practice-session", id, user?.id],
    queryFn: () => getPracticeSession(id),
    enabled: !!user && !!id,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [feedback, setFeedback] = useState<Record<number, QuestionFeedback>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const autoSubmitted = useRef(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (!session || initialised.current) return;
    if (session.status === "submitted") {
      navigate(`/practice/session/${session.id}/result`, { replace: true });
      return;
    }
    initialised.current = true;
    const a: Record<number, number | null> = {};
    const f: Record<number, QuestionFeedback> = {};
    session.questions.forEach((q) => {
      a[q.id] = q.selected_answer_id;
      if (q.feedback) f[q.id] = q.feedback;
    });
    setAnswers(a);
    setFeedback(f);
    setRemaining(session.remaining_seconds);
    // Tiếp tục: mở câu đầu tiên chưa trả lời
    const firstOpen = session.questions.findIndex((q) => q.selected_answer_id === null);
    setIndex(firstOpen >= 0 ? firstOpen : 0);
  }, [session, navigate]);

  const submit = useMutation({
    mutationFn: () => submitPracticeSession(id),
    onSuccess: (result) => {
      const correct = result.correct_count ?? 0;
      if (correct > 0 || result.total_questions > 0) {
        addXp(Math.max(XP_REWARDS.QUIZ_MIN, correct * XP_REWARDS.QUIZ_PER_CORRECT), `Hoàn thành lượt luyện (${correct}/${result.total_questions} câu đúng)`);
      }
      queryClient.setQueryData(["practice-result", id, user?.id], result);
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      void queryClient.invalidateQueries({ queryKey: ["practice-daily"] });
      void queryClient.invalidateQueries({ queryKey: ["mistake-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["practice-history"] });
      void queryClient.invalidateQueries({ queryKey: ["analysis-weaknesses"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      // Bài kiểm tra trình độ có trang kết quả riêng (khoảng điểm, bản đồ Part)
      navigate(result.kind === "diagnostic" ? `/diagnostic/result/${id}${window.location.search}` : `/practice/session/${id}/result`, { replace: true });
    },
    onError: (err) => {
      autoSubmitted.current = false;
      toast({ title: "Nộp bài chưa thành công", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  const abandon = useMutation({
    mutationFn: () => abandonPracticeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["practice-active"] });
      void queryClient.invalidateQueries({ queryKey: ["practice-daily"] });
      navigate("/practice");
    },
  });

  // Đồng hồ (chỉ khi lượt có giới hạn giờ) — hết giờ thì tự nộp
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      if (!autoSubmitted.current && !submit.isPending) {
        autoSubmitted.current = true;
        toast({ title: "Hết giờ!", description: "Bài làm được nộp tự động." });
        submit.mutate();
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = useCallback(
    async (questionId: number, answerId: number) => {
      if (!session || feedback[questionId]) return;
      const prev = answers[questionId] ?? null;
      setAnswers((a) => ({ ...a, [questionId]: answerId }));
      try {
        const res = await savePracticeAnswer(id, questionId, answerId);
        if (res.feedback) setFeedback((f) => ({ ...f, [questionId]: res.feedback! }));
      } catch (err) {
        setAnswers((a) => ({ ...a, [questionId]: prev }));
        toast({ title: "Chưa lưu được câu trả lời", description: getFriendlyErrorMessage(err), variant: "destructive" });
      }
    },
    [session, feedback, answers, id, toast],
  );

  const questions = session?.questions ?? [];
  const current = questions[index];
  const answeredCount = useMemo(() => Object.values(answers).filter((v) => v !== null && v !== undefined).length, [answers]);
  const unanswered = questions.length - answeredCount;

  // Phím tắt: ← → chuyển câu, 1-4 chọn đáp án
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      const n = Number(e.key);
      if (current && n >= 1 && n <= current.answers.length) void select(current.id, current.answers[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, questions.length, select]);

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-[480px] w-full max-w-5xl mx-auto rounded-3xl" />
      </StudentLayout>
    );
  }
  if (isError || !session) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState title="Không mở được lượt luyện" message="Lượt luyện không tồn tại hoặc đã bị xóa." onRetry={() => refetch()} />
        </div>
      </StudentLayout>
    );
  }
  if (session.status === "abandoned") {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border border-slate-800 text-center space-y-3">
          <p className="text-white font-bold">Lượt luyện này đã được bỏ.</p>
          <Link to="/practice" className="text-cyan-400 font-bold">Về trang luyện tập</Link>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-4 pb-24 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90">
          <div className="min-w-0">
            <div className="text-white font-bold truncate">{session.title}</div>
            <div className="text-xs text-slate-400">
              Mã lượt {session.code} · {session.mode === "test" ? "Chế độ Test" : "Chế độ Practice"} · đã làm {answeredCount}/{questions.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <span
                className={cn(
                  "min-h-[40px] px-3 rounded-xl border font-mono font-bold text-sm flex items-center gap-1.5",
                  remaining <= 60 ? "border-rose-500/60 text-rose-300" : "border-slate-700 text-white",
                )}
              >
                <Clock className="w-4 h-4" /> {fmt(Math.max(0, remaining))}
              </span>
            )}
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              className="min-h-[40px] px-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Thoát
            </button>
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              disabled={submit.isPending}
              className="min-h-[40px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> {submit.isPending ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </div>

        {current && (
          <PracticeQuestionCard
            key={current.id}
            index={index}
            question={current}
            selectedId={answers[current.id] ?? null}
            feedback={feedback[current.id] ?? null}
            disabled={submit.isPending}
            onSelect={(aid) => void select(current.id, aid)}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
            className="min-h-[44px] px-4 rounded-xl border border-slate-800 text-slate-200 font-bold text-sm flex items-center gap-1 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Câu trước
          </button>
          {index < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              className="min-h-[44px] px-4 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center gap-1"
            >
              Câu tiếp <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSubmit(true)}
              className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm"
            >
              Nộp bài
            </button>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/80">
          <div className="text-xs font-bold text-slate-400 mb-2">Danh sách câu</div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const f = feedback[q.id];
              const answered = answers[q.id] !== null && answers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "w-10 h-10 rounded-lg border text-xs font-bold",
                    i === index && "ring-2 ring-cyan-400",
                    f ? (f.is_correct ? "border-emerald-500 bg-emerald-500/20 text-emerald-200" : "border-rose-500 bg-rose-500/20 text-rose-200")
                      : answered ? "border-blue-500 bg-blue-500/20 text-blue-100" : "border-slate-700 text-slate-400",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nộp bài?</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0 ? `Bạn còn ${unanswered} câu chưa trả lời — các câu này sẽ được tính là chưa làm.` : "Bạn đã trả lời tất cả các câu."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Làm tiếp</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit.mutate()}>Nộp bài</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thoát lượt luyện?</AlertDialogTitle>
            <AlertDialogDescription>
              Câu trả lời đã được lưu. Bạn có thể quay lại làm tiếp sau{remaining !== null ? " (đồng hồ vẫn chạy)" : ""}, hoặc bỏ hẳn lượt này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate("/practice")}>Lưu & thoát</AlertDialogCancel>
            <AlertDialogAction onClick={() => abandon.mutate()} className="bg-rose-600 hover:bg-rose-500">
              Bỏ lượt này
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
};

export default PracticeSessionPage;
