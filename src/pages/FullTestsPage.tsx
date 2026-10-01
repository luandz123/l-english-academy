import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { CourseCard, CourseRow } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { FileCheck2 } from "lucide-react";

import EmptyState from "@/components/EmptyState";

export const FullTestsPage: React.FC = () => {
  const { data: courses = [], isLoading, isError, refetch } = useQuery<CourseRow[]>({
    queryKey: ["student-fulltest-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .eq("course_type", "fulltest")
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-soft-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Phòng Thi Thử Full Test (ETS)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pl-12.5 leading-relaxed">
              Luyện thi thử TOEIC 200 câu Listening &amp; Reading chuẩn format ETS, bấm giờ thật 120 phút, chấm điểm tự động.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase">
            {courses.length} Bộ Đề
          </span>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải danh sách đề thi"
            message="Không thể kết nối đến máy chủ để lấy danh sách Full Test. Vui lòng thử lại."
            onRetry={() => refetch()}
          />
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileCheck2 className="w-8 h-8 text-emerald-600" />}
            title="Các bộ đề thi đang chuẩn bị xuất bản"
            description="Bạn có thể tranh thủ ôn tập lại từ vựng hoặc rèn kỹ năng nghe chép chính tả trong khi chờ bộ đề mới."
            actionLabel="Luyện Nghe Chép Chính Tả"
            onAction={() => window.location.href = "/listening"}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default FullTestsPage;
