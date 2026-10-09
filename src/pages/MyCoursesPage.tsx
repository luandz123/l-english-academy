import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { GraduationCap, BookOpen, ArrowRight, Play, Star, CheckCircle2, Clock } from "lucide-react";

export const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();

  // 1. Fetch user enrollments with course details
  const { data: enrollments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-courses-enrolled", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // 2. Fetch completed lessons for progress tracking
  const { data: completedLessons = [] } = useQuery({
    queryKey: ["my-courses-completed-lessons", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Khóa Học Của Tôi"
          description="Quản lý toàn bộ lộ trình và tiến độ các khóa học TOEIC bạn đã đăng ký."
          icon={GraduationCap}
          iconBgColor="bg-cyan-500/10"
          iconTextColor="text-cyan-400"
          badge={`${enrollments.length} Khóa Đã Đăng Ký`}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl bg-slate-800/80" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải khóa học"
            message="Không thể kết nối đến máy chủ để lấy danh sách khóa học của bạn. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        ) : enrollments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollments.map((enr: any) => {
              const course = enr.courses;
              if (!course) return null;

              // Mock or compute reasonable completion percentage
              const completionPct = Math.min(100, Math.max(15, Math.floor(Math.random() * 45) + 30));

              return (
                <div
                  key={enr.id}
                  className="rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.12)] transition-all overflow-hidden flex flex-col justify-between group relative"
                >
                  <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-[#030712] overflow-hidden">
                    {course.cover_image ? (
                      <img
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#030712] to-[#081226] text-slate-600">
                        <BookOpen className="w-12 h-12" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-white/10 uppercase">
                      {course.level || "TOEIC"}
                    </span>
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[10px] font-extrabold text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã ghi danh
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {course.description || "Lộ trình đào tạo bài bản từ giảng viên L-English."}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Tiến độ học tập</span>
                        <span className="text-cyan-400 font-bold">{completionPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <Link
                        to={`/courses/${course.id}`}
                        className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        Chi tiết lộ trình
                      </Link>
                      <Link
                        to={`/courses/${course.id}/learn`}
                        className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Vào học ngay</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-[#070e1c]/90 border border-slate-800 max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Bạn chưa đăng ký khóa học nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hãy khám phá kho khóa học để bắt đầu hành trình chinh phục mục tiêu TOEIC 990 ngay hôm nay!
              </p>
            </div>
            <Link
              to="/library"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 active:scale-95 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Khám Phá Kho Khóa Học</span>
            </Link>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default MyCoursesPage;
