import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Bookmark, BookX, CalendarCheck, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { getDailyChallenge, getMistakeSummary, listFavoriteExams, startDailyChallenge } from "@/lib/api/practice";
import { examStartUrl } from "./examUrl";

const CARD =
  "p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden";

const Title: React.FC<{ icon: React.ElementType; children: React.ReactNode; color?: string }> = ({ icon: Icon, children, color = "text-cyan-400" }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
    <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} />
      {children}
    </h3>
  </div>
);

/** Daily Challenge (E04 §5.2C): 5 câu nghe + 5 câu đọc mỗi ngày, riêng từng học viên. */
export const DailyChallengeCard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["practice-daily", user?.id],
    queryFn: getDailyChallenge,
    enabled: !!user,
  });
  const start = useMutation({
    mutationFn: startDailyChallenge,
    onSuccess: (s) => navigate(s.status === "submitted" ? `/practice/session/${s.id}/result` : `/practice/session/${s.id}`),
    onError: (err) => toast({ title: "Chưa tạo được Daily Challenge", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  if (isError) return null;
  const s = data?.session;
  return (
    <div className={CARD}>
      <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <Title icon={CalendarCheck}>Daily Challenge</Title>
        {data && data.streak > 0 && (
          <span className="text-xs font-bold text-orange-300 flex items-center gap-1">
            <Flame className="w-4 h-4" /> {data.streak} ngày liên tiếp
          </span>
        )}
      </div>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : (
        <>
          <p className="text-sm text-slate-300">
            {s?.status === "submitted"
              ? `Hôm nay bạn đã hoàn thành: ${s.correct_count ?? 0}/${s.total_questions} câu đúng. Quay lại vào ngày mai nhé!`
              : `10 câu hôm nay: 5 Listening (trọng tâm Part ${data.focus_listening_part}) + 5 Reading (trọng tâm Part ${data.focus_reading_part}), ưu tiên dạng bạn đang yếu.`}
          </p>
          <button
            type="button"
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
          >
            {s?.status === "submitted" ? "Xem kết quả hôm nay" : s ? `Tiếp tục (${s.answered_count}/${s.total_questions})` : "Làm Daily Challenge"}
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link to="/practice?tab=mini" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
            Hoặc làm Mini Test 5–30 câu <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}
    </div>
  );
};

/** Sổ câu sai trên Bàn học. */
export const MistakeNotebookCard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mistake-summary", user?.id],
    queryFn: getMistakeSummary,
    enabled: !!user,
  });
  if (isError) return null;
  return (
    <div className={CARD}>
      <Title icon={BookX} color="text-rose-400">Sổ câu sai</Title>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : data.total_wrong === 0 && data.bookmarked === 0 ? (
        <p className="text-sm text-slate-300">Chưa có câu sai nào. Câu bạn làm sai khi luyện đề sẽ tự được lưu ở đây để ôn lại.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xl font-black text-white">{data.total_wrong}</div>
            <div className="text-[11px] text-slate-400">Câu sai</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xl font-black text-emerald-300">{data.fixed}</div>
            <div className="text-[11px] text-slate-400">Đã sửa đúng</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xl font-black text-amber-300">{data.not_reviewed}</div>
            <div className="text-[11px] text-slate-400">Chưa ôn</div>
          </div>
        </div>
      )}
      <Link to="/mistakes" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
        Mở Sổ câu sai <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};

/** Đề yêu thích trên Bàn học (3 đề gần nhất). */
export const FavoriteExamsCard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["favorite-exams", user?.id, "all"],
    queryFn: () => listFavoriteExams(),
    enabled: !!user,
  });
  if (isError || (!isLoading && (!data || data.length === 0))) return null;
  return (
    <div className={CARD}>
      <Title icon={Bookmark} color="text-amber-400">Đề yêu thích</Title>
      {isLoading || !data ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 3).map((f) => (
            <li key={f.test_id}>
              {f.exam ? (
                <Link to={examStartUrl(f.exam)} className="block p-2.5 rounded-xl border border-slate-800 hover:border-cyan-500/40 text-sm text-white font-semibold truncate">
                  {f.title}
                </Link>
              ) : (
                <span className="block p-2.5 rounded-xl border border-slate-800 text-sm text-slate-500 truncate">{f.title} (không còn khả dụng)</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link to="/favorites" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 min-h-[40px]">
        Xem tất cả <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
};
