import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bookmark } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { listFavoriteExams, type ExamSkill } from "@/lib/api/practice";
import { ExamCard, FavoriteButton } from "@/components/practice/ExamBits";

const TABS: { key: ExamSkill | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "full", label: "Full Test" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
];

/** Đề yêu thích (E07 §4.3). Đề bị xóa vẫn hiện với thông báo thay vì biến mất âm thầm. */
const FavoritesPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<ExamSkill | "all">("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["favorite-exams", user?.id, tab],
    queryFn: () => listFavoriteExams(tab === "all" ? undefined : tab),
    enabled: !!user,
  });

  return (
    <StudentLayout>
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-amber-400" /> Đề yêu thích
          </h1>
          <p className="text-sm text-slate-400 mt-1">Những đề bạn đã lưu để làm sau hoặc luyện lại. Bỏ yêu thích không ảnh hưởng lịch sử làm bài.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "min-h-[40px] px-4 rounded-xl border text-sm font-bold",
                tab === t.key ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được đề yêu thích" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
            <p className="text-white font-bold">Chưa có đề yêu thích</p>
            <p className="text-sm text-slate-400">Bấm biểu tượng Bookmark trên thẻ đề để lưu đề muốn làm sau.</p>
            <Link to="/fulltests" className="inline-flex min-h-[40px] items-center px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-sm font-bold">
              Mở thư viện đề
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((f) =>
              f.exam ? (
                <ExamCard
                  key={f.test_id}
                  exam={f.exam}
                  footer={<span className="text-[11px] text-slate-500 ml-auto">Đã lưu {new Date(f.favorited_at).toLocaleDateString("vi-VN")}</span>}
                />
              ) : (
                <div key={f.test_id} className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm">{f.title}</h3>
                    <FavoriteButton testId={f.test_id} favorited />
                  </div>
                  <p className="text-xs text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Đề này không còn khả dụng (đã bị gỡ khỏi thư viện).
                  </p>
                  <p className="text-[11px] text-slate-500">Đã lưu {new Date(f.favorited_at).toLocaleDateString("vi-VN")}</p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default FavoritesPage;
