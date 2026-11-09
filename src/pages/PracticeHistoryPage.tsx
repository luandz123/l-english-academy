import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { listPracticeHistory } from "@/lib/api/practice";

const KIND_LABELS: Record<string, string> = {
  question_type: "Theo dạng câu",
  mini_test: "Mini Test",
  daily: "Daily Challenge",
  mistakes: "Câu sai",
  retry: "Luyện lại",
};

/** Lịch sử lượt luyện (mỗi lượt có mã riêng, lưu như một lượt thi). */
const PracticeHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["practice-history", user?.id],
    queryFn: () => listPracticeHistory(50),
    enabled: !!user,
  });
  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-16 font-sans">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
          <History className="w-7 h-7 text-cyan-400" /> Lịch sử luyện tập
        </h1>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : isError || !data ? (
          <ErrorState title="Không tải được lịch sử" message="Vui lòng thử lại." onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-800 text-center text-slate-300 text-sm">
            Chưa có lượt luyện nào. <Link to="/practice" className="text-cyan-400 font-bold">Bắt đầu luyện tập</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/practice/session/${s.id}/result`}
                  className="p-4 rounded-2xl border border-slate-800 bg-[#070e1c]/90 hover:border-cyan-500/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{s.title}</div>
                    <div className="text-xs text-slate-400">
                      {KIND_LABELS[s.kind] ?? s.kind} · mã {s.code} · {s.submitted_at ? new Date(s.submitted_at).toLocaleString("vi-VN") : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-white">
                      {s.correct_count ?? 0}/{s.total_questions}
                    </div>
                    <div className="text-[11px] text-slate-400">câu đúng</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StudentLayout>
  );
};

export default PracticeHistoryPage;
