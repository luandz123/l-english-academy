import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listCourses } from "@/lib/api/catalog";
import StudentLayout from "@/components/StudentLayout";
import { CourseCard, CourseRow } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { BookOpen, Search, X } from "lucide-react";
import { matchesSearch } from "@/utils/searchText";

import { PageHeader } from "@/components/ui/PageHeader";
import EmptyState from "@/components/EmptyState";

export const LibraryPage: React.FC = () => {
  const { data: courses = [], isLoading, isError, refetch } = useQuery<CourseRow[]>({
    queryKey: ["student-library-courses"],
    queryFn: async () => {
      const { data, error } = await listCourses({ active: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Ô tìm kiếm đồng bộ với ?search= (Bàn học và trang chủ chuyển tới đây kèm từ khóa)
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);
  const updateQuery = (value: string) => {
    setQuery(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("search", value);
    else next.delete("search");
    setSearchParams(next, { replace: true });
  };
  const filteredCourses = useMemo(
    () => courses.filter((c) => matchesSearch(query, [c.title, c.subtitle, c.description, c.category_name])),
    [courses, query]
  );
  const hasQuery = query.trim().length > 0;

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

        {/* Tìm kiếm khóa học */}
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="library-search"
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Tìm khóa học, bộ đề, chủ đề..."
            aria-label="Tìm khóa học"
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#030712]/80 border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => updateQuery("")}
              aria-label="Xóa từ khóa"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasQuery && !isLoading && !isError && (
          <p className="text-sm text-slate-400">
            {filteredCourses.length > 0
              ? `${filteredCourses.length} khóa học khớp với "${query.trim()}"`
              : `Không tìm thấy khóa học nào khớp với "${query.trim()}". Thử từ khóa khác, ví dụ "ETS", "nghe", "từ vựng".`}
          </p>
        )}

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
        ) : hasQuery && filteredCourses.length === 0 ? null : courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCourses.map((c) => (
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
