import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listCourses } from "@/lib/api/catalog";
import StudentLayout from "@/components/StudentLayout";
import { CourseCard, CourseRow } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Headphones, Layers, Zap } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import EmptyState from "@/components/EmptyState";

export const ListeningPage: React.FC = () => {
  const { data: courses = [], isLoading, isError, refetch } = useQuery<CourseRow[]>({
    queryKey: ["student-listening-courses"],
    queryFn: async () => {
      const { data, error } = await listCourses({ active: true, courseType: "listening" });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Chép Chính Tả"
          description="Nghe từng câu rồi điền từ khóa hoặc gõ lại cả câu. Có 3 cách làm: kéo thả, gõ từ khóa, gõ cả câu."
          icon={Headphones}
          iconBgColor="bg-purple-500/10"
          iconTextColor="text-purple-600 dark:text-purple-400"
          badge={`${courses.length} khóa`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/practice?skill=listening"
            className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors flex items-center gap-3 min-h-[64px]"
          >
            <Layers className="w-6 h-6 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Luyện nghe theo dạng câu hỏi</div>
              <div className="text-xs text-slate-400">Chọn Part 1–4 rồi chọn dạng: WH, Yes/No, câu hỏi lựa chọn…</div>
            </div>
          </Link>
          <Link
            to="/practice?tab=mini"
            className="p-4 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors flex items-center gap-3 min-h-[64px]"
          >
            <Zap className="w-6 h-6 text-violet-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Listening Mini Test</div>
              <div className="text-xs text-slate-400">10–30 câu nghe, làm nhanh trong vài phút</div>
            </div>
          </Link>
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
            title="Không tải được danh sách khóa chép chính tả"
            message="Không kết nối được máy chủ. Vui lòng thử lại."
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
            title="Chưa có khóa chép chính tả"
            description="Bạn có thể chuyển sang thử sức với các bài thi Full Test ETS hoặc luyện nghe từng bước Part 2 ngay bây giờ."
            actionLabel="Luyện nghe từng bước"
            onAction={() => window.location.href = "/part2-coach"}
          />
        )}
      </div>
    </StudentLayout>
  );
};

export default ListeningPage;
