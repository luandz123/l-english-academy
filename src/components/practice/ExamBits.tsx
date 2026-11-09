import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Clock, Lock, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import {
  DIFFICULTY_LABELS,
  EXAM_TYPE_LABELS,
  setExamFavorite,
  type ExamCard as ExamCardData,
  type VerificationStatus,
} from "@/lib/api/practice";
import { examStartUrl } from "./examUrl";

/** Nhãn đề đã xác minh (E06). Verified chỉ chứng nhận nội dung đã kiểm duyệt, không phải đề ETS. */
export const VerifiedBadge: React.FC<{ status: VerificationStatus; verifiedAt?: string | null; withText?: boolean }> = ({
  status,
  verifiedAt,
  withText,
}) => {
  if (status === "verified") {
    return (
      <span
        title={`Đã kiểm duyệt nội dung${verifiedAt ? ` ngày ${new Date(verifiedAt).toLocaleDateString("vi-VN")}` : ""} — không đồng nghĩa với đề chính thức của ETS`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      >
        <ShieldCheck className="w-3.5 h-3.5" /> Verified
        {withText && verifiedAt && (
          <span className="font-medium text-emerald-400/80">· {new Date(verifiedAt).toLocaleDateString("vi-VN")}</span>
        )}
      </span>
    );
  }
  if (status === "needs_review" && withText) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300">
        <ShieldAlert className="w-3.5 h-3.5" /> Đang kiểm duyệt lại
      </span>
    );
  }
  return null;
};

/** Nút yêu thích đề (E07): bấm để lưu, bấm lại để bỏ. */
export const FavoriteButton: React.FC<{ testId: number; favorited: boolean; withLabel?: boolean; className?: string }> = ({
  testId,
  favorited,
  withLabel,
  className,
}) => {
  const [on, setOn] = useState(favorited);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useEffect(() => setOn(favorited), [favorited]);

  const mutation = useMutation({
    mutationFn: (next: boolean) => setExamFavorite(testId, next),
    onMutate: (next) => setOn(next),
    onSuccess: (_d, next) => {
      void queryClient.invalidateQueries({ queryKey: ["exam-library"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-exams"] });
      void queryClient.invalidateQueries({ queryKey: ["exam-card", testId] });
      toast({ title: next ? "Đã lưu vào đề yêu thích" : "Đã bỏ khỏi đề yêu thích" });
    },
    onError: (err, next) => {
      setOn(!next);
      toast({ title: "Không cập nhật được", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate(!on);
      }}
      disabled={mutation.isPending}
      aria-pressed={on}
      title={on ? "Bỏ yêu thích" : "Lưu đề yêu thích"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] px-2.5 rounded-xl border text-xs font-bold transition-colors",
        on ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800",
        className,
      )}
    >
      {on ? <BookmarkCheck className="w-4 h-4 fill-amber-400" /> : <Bookmark className="w-4 h-4" />}
      {withLabel && <span>{on ? "Đã lưu yêu thích" : "Lưu yêu thích"}</span>}
    </button>
  );
};


const STATUS_META: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Chưa làm", cls: "border-slate-700 text-slate-400" },
  in_progress: { label: "Đã làm", cls: "border-blue-500/40 bg-blue-500/10 text-blue-300" },
  completed: { label: "Đã hoàn thành", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
};

/** Thẻ đề trong Thư viện đề / Đề yêu thích (E05 §2.5). */
export const ExamCard: React.FC<{ exam: ExamCardData; footer?: React.ReactNode }> = ({ exam, footer }) => {
  const status = STATUS_META[exam.user_status];
  const locked = !exam.accessible;
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-[#070e1c]/90 hover:border-cyan-500/40 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-mono text-slate-500">{exam.code}</span>
            <VerifiedBadge status={exam.verification_status} verifiedAt={exam.verified_at} />
          </div>
          <h3 className="font-bold text-white text-sm sm:text-base leading-snug">{exam.title}</h3>
        </div>
        <FavoriteButton testId={exam.id} favorited={exam.favorited} />
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span className="px-2 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
          {EXAM_TYPE_LABELS[exam.test_type] ?? exam.test_type}
        </span>
        {exam.year && <span className="px-2 py-0.5 rounded-md border border-slate-700 text-slate-300">{exam.year}</span>}
        {exam.difficulty && (
          <span className="px-2 py-0.5 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-300">
            {DIFFICULTY_LABELS[exam.difficulty]}
          </span>
        )}
        {exam.topics.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-md border border-slate-700 text-slate-400">
            {t}
          </span>
        ))}
        <span
          className={cn(
            "px-2 py-0.5 rounded-md border",
            exam.is_free ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300",
          )}
        >
          {exam.is_free ? "Miễn phí" : "Premium"}
        </span>
        <span className={cn("px-2 py-0.5 rounded-md border", status.cls)}>{status.label}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} phút
        </span>
        <span>{exam.total_questions} câu</span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {exam.attempts} lượt làm
        </span>
        {exam.best_score !== null && <span className="text-emerald-300 font-bold">Điểm cao nhất: {exam.best_score}</span>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {!exam.released ? (
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Mở ngày {exam.release_date ? new Date(exam.release_date).toLocaleDateString("vi-VN") : ""}
          </span>
        ) : (
          <Link
            to={examStartUrl(exam)}
            className={cn(
              "min-h-[40px] px-4 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all",
              locked
                ? "border border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500",
            )}
          >
            {locked ? <Lock className="w-3.5 h-3.5" /> : exam.user_status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            {locked ? "Mở khóa để làm" : exam.user_status === "not_started" ? "Bắt đầu làm bài" : "Làm lại"}
            {!locked && <ArrowRight className="w-3.5 h-3.5" />}
          </Link>
        )}
        {footer}
      </div>
    </div>
  );
};
