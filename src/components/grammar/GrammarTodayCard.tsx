import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, PenLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getGrammarReview } from "@/lib/api/grammar";

/** Thẻ "Ôn ngữ pháp hôm nay" ở Bàn học (G08). Chưa có lỗi ngữ pháp nào thì không hiện. */
export const GrammarTodayCard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ["grammar-review", user?.id], queryFn: getGrammarReview, enabled: !!user });
  if (isError || (!isLoading && data && !data.has_mistakes && data.due_count === 0)) return null;
  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
        <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
          <PenLine className="w-5 h-5 text-cyan-400" /> Ôn ngữ pháp hôm nay
        </h3>
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : data.due_count > 0 ? (
        <p className="text-sm text-slate-300">
          <b className="text-white">{Math.min(3, data.due_count)} chủ điểm</b> · khoảng {data.est_minutes} phút
          {data.due_count > 3 && <span className="block text-xs text-slate-400 mt-1">Còn {data.due_count} chủ điểm đến hạn</span>}
        </p>
      ) : (
        <p className="text-sm text-slate-300">Hôm nay không có chủ điểm cần ôn.</p>
      )}
      <div className="flex flex-wrap gap-3">
        {data && data.due_count > 0 ? (
          <Link to="/grammar/review" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
            Bắt đầu ôn <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          data?.extra_available && (
            <Link to="/grammar/review?extra=1" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
              Ôn thêm <ArrowRight className="w-4 h-4" />
            </Link>
          )
        )}
        <Link to="/grammar" className="text-sm text-slate-300 hover:text-white font-bold inline-flex items-center gap-1 min-h-[40px]">
          Vào Grammar Center <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
