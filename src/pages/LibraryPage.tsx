import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/StudentLayout";
import { CourseCard, CourseRow } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { BookOpen } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import EmptyState from "@/components/EmptyState";

export const LibraryPage: React.FC = () => {
  const { data: courses = [], isLoading, isError, refetch } = useQuery<CourseRow[]>({
    queryKey: ["student-library-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Kho Khóa Học & Bài Giảng"
          description="Toàn bộ hệ thống khóa học video bài giảng, luyện đề thi thử, từ vựng và ngữ pháp TOEIC trọng điểm."
          icon={BookOpen}
          iconBgColor="bg-primary/10"
          iconTextColor="text-primary"
          badge={`${courses.length} Khóa Học`}
        />

        {/* Content Body */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải kho khóa học"
            message="Không thể kết nối đến máy chủ để lấy danh sách khóa học. Vui lòng thử lại."
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
            icon={<BookOpen className="w-8 h-8 text-primary" />}
            title="Kho khóa học đang được cập nhật"
            description="Bạn có thể khám phá thêm các đề thi Full Test hoặc tham gia luyện nghe chép chính tả ngay hôm nay."
            actionLabel="Luyện Đề Full Test Ngay"
            onAction={() => window.location.href = "/fulltests"}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default LibraryPage;
