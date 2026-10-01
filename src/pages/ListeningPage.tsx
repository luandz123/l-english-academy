import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { CourseCard, CourseRow } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Headphones } from "lucide-react";

import EmptyState from "@/components/EmptyState";

export const ListeningPage: React.FC = () => {
  const { data: courses = [], isLoading, isError, refetch } = useQuery<CourseRow[]>({
    queryKey: ["student-listening-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .eq("course_type", "listening")
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
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                <Headphones className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Luyện Nghe Điền Từ (Dictation)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pl-12.5 leading-relaxed">
              Luyện nghe chép chính tả Part 1–4, kéo thả từ khóa mượt mà, phản xạ nghe và ghi nhớ từ vựng tức thì.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold uppercase">
            {courses.length} Khóa Luyện
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
            title="Không thể tải danh sách khóa luyện nghe"
            message="Không thể kết nối đến máy chủ để lấy danh sách Dictation. Vui lòng thử lại."
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
            icon={<Headphones className="w-8 h-8 text-purple-600" />}
            title="Các bài luyện nghe đang được tổng hợp"
            description="Bạn có thể chuyển sang thử sức với các bài thi Full Test ETS hoặc luyện phản xạ Part 2 ngay bây giờ."
            actionLabel="Luyện Phản Xạ Part 2"
            onAction={() => window.location.href = "/part2-coach"}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default ListeningPage;
