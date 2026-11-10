import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyRoadmap } from "@/lib/api/roadmap";
import { STATUS_META } from "./roadmapLabels";

/** Thẻ lộ trình ở Bàn học: chưa có → mời tạo; có rồi → chặng hiện tại và tiến độ theo tuần. */
export const RoadmapSummaryCard: React.FC = () => {
  const { user } = useAuth();
  const { data: roadmap, isLoading, isError } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: getMyRoadmap,
    enabled: !!user,
  });

  if (isError) return null;

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden">
      <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
        <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-cyan-400" />
          Lộ Trình Của Bạn
        </h3>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : !roadmap ? (
        <>
          <p className="text-sm text-slate-300">
            Cho biết điểm hiện tại, mục tiêu và thời gian bạn có — hệ thống tính số giờ cần học và chia thành từng chặng.
          </p>
          <Link
            to="/roadmap"
            className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            Tạo lộ trình học <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      ) : (
        (() => {
          const s = roadmap.summary;
          const phase = roadmap.phases[s.current_phase_index];
          const percent = Math.round((s.current_week / s.total_weeks) * 100);
          const status = STATUS_META[s.status];
          return (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-white">
                    {roadmap.current_score} → {roadmap.target_score}+
                  </div>
                  {phase && <div className="text-sm text-slate-300 mt-0.5">Chặng: {phase.title}</div>}
                  {roadmap.personal && roadmap.personal.week.total > 0 && (
                    <div className="text-xs text-cyan-300 mt-0.5">
                      {roadmap.personal.week.completed >= roadmap.personal.week.total
                        ? "Đã xong việc tuần này"
                        : `Còn ${roadmap.personal.week.total - roadmap.personal.week.completed}/${roadmap.personal.week.total} việc tuần này`}
                    </div>
                  )}
                </div>
                <span className={cn("text-xs font-bold px-3 py-1 rounded-full border shrink-0", status.className)}>{status.label}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-300 font-medium">
                    Tuần {s.current_week}/{s.total_weeks}
                  </span>
                  <span className="text-white font-extrabold">{s.weekly_hours} giờ/tuần</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <Link
                to="/roadmap"
                className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]"
              >
                Xem lộ trình <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          );
        })()
      )}
    </div>
  );
};
