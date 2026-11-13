import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookA } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getVocabSummary } from "@/lib/api/vocabulary";

/** Thẻ "Từ vựng hôm nay" ở Bàn học: số thẻ đến hạn + từ mới, đã thuộc. */
export const VocabTodayCard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ["vocab-summary", user?.id], queryFn: getVocabSummary, enabled: !!user });
  if (isError) return null;
  const toReview = (data?.due ?? 0) + (data?.new_available ?? 0);
  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
        <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
          <BookA className="w-5 h-5 text-cyan-400" /> Từ vựng hôm nay
        </h3>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : data.total === 0 ? (
        <p className="text-sm text-slate-300">Chưa có từ nào trong sổ. Bấm vào từ trong transcript hoặc chọn từ theo Part để bắt đầu.</p>
      ) : (
        <p className="text-sm text-slate-300">
          {toReview > 0 ? (
            <>
              <b className="text-white">{toReview}</b> thẻ cần ôn ({data.due} đến hạn, {data.new_available} từ mới)
            </>
          ) : (
            "Hôm nay đã ôn xong."
          )}{" "}
          · Đã thuộc <b className="text-emerald-300">{data.mastered}</b>/{data.total} từ
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {toReview > 0 && (
          <Link to="/vocabulary/review" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
            Ôn ngay <ArrowRight className="w-4 h-4" />
          </Link>
        )}
        <Link to={data?.total ? "/vocabulary" : "/vocabulary/browse"} className="text-sm text-slate-300 hover:text-white font-bold inline-flex items-center gap-1 min-h-[40px]">
          {data?.total ? "Mở Sổ từ vựng" : "Từ theo Part"} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
