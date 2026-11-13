import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LineChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getProgress } from "@/lib/api/analytics";

/** Thẻ "Tiến độ của bạn" ở Bàn học (P10 rút gọn): điểm ước lượng hiện tại và thay đổi 30 ngày. */
export const ProgressSummaryCard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-progress", user?.id],
    queryFn: getProgress,
    enabled: !!user,
  });
  if (isError) return null;
  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
        <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
          <LineChart className="w-5 h-5 text-cyan-400" /> Tiến độ của bạn
        </h3>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : data.state === "empty" ? (
        <>
          <p className="text-sm text-slate-300">Làm một bài đầu tiên để bắt đầu theo dõi tiến độ.</p>
          <Link
            to="/diagnostic"
            className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5"
          >
            Làm bài kiểm tra trình độ <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      ) : (
        <>
          {data.estimate ? (
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">Điểm ước lượng</div>
                <div className="text-2xl font-black text-white">
                  {data.estimate.range ? `${data.estimate.range.min}–${data.estimate.range.max}` : data.estimate.total}
                </div>
              </div>
              {data.change_30d !== null && (
                <span className={cn("text-sm font-black", data.change_30d >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  {data.change_30d >= 0 ? "+" : ""}
                  {data.change_30d} / 30 ngày
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-300">
              Đã làm {data.last_30d.answered} câu trong 30 ngày. Làm Full Test hoặc bài kiểm tra trình độ để có điểm ước lượng.
            </p>
          )}
          <Link to="/progress" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
            Xem tiến độ đầy đủ <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
};
