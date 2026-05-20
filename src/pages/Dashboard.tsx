import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlayCircle as PlayCircleLucide, Flame } from "lucide-react";
import { PlayCircle, ClipboardText, Star, BookBookmark } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Bạn";

  const { data: enrollments, isLoading: enrollLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: quizResults } = useQuery({
    queryKey: ["my-quiz-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*, quizzes(title)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: lessonProgress } = useQuery({
    queryKey: ["my-lesson-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_completed", true);
      return data || [];
    },
    enabled: !!user,
  });

  const completedLessons = lessonProgress?.length || 0;
  const totalQuizzes = quizResults?.length || 0;
  const avgScore = quizResults && quizResults.length > 0
    ? (quizResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / quizResults.length).toFixed(1)
    : "0";

  const stats = [
    {
      Icon: PlayCircle,
      label: "Bài giảng đã xem",
      value: `${completedLessons}`,
      gradient: "from-emerald-500 to-teal-400",
      glow: "shadow-emerald-400/40",
    },
    {
      Icon: ClipboardText,
      label: "Bài thi đã làm",
      value: `${totalQuizzes}`,
      gradient: "from-blue-500 to-cyan-400",
      glow: "shadow-blue-400/40",
    },
    {
      Icon: Star,
      label: "Điểm trung bình",
      value: `${avgScore}/10`,
      gradient: "from-yellow-400 to-orange-400",
      glow: "shadow-yellow-400/40",
    },
    {
      Icon: BookBookmark,
      label: "Khóa đã đăng ký",
      value: `${enrollments?.length || 0}`,
      gradient: "from-purple-500 to-fuchsia-400",
      glow: "shadow-purple-400/40",
    },
  ];

  const courseTypeMap: Record<string, string> = {
    video_quiz: "🎬 Video",
    flashcard: "🃏 Flashcard",
    listening: "🎧 Listening",
    speaking: "🗣️ Speaking",
    fulltest: "📋 Full Test",
  };

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Welcome banner */}
        <div className="card-duo p-0 overflow-hidden">
          <div className="bg-[var(--duo-correct)] p-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Xin chào, {displayName}! 👋</h1>
              <p className="text-white/80 text-sm mt-1 font-bold">Tiếp tục hành trình học tập nào! 🚀</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-2xl px-4 py-2">
              <Flame className="w-6 h-6 text-[var(--duo-yellow)]" />
              <span className="text-white font-extrabold text-lg">{completedLessons}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card-duo p-4 space-y-3 hover:-translate-y-0.5 transition-transform">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} ${s.glow} shadow-lg flex items-center justify-center`}>
                <s.Icon size={26} weight="duotone" color="white" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-xs font-bold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* My courses */}
        <div>
          <h2 className="text-lg font-extrabold text-foreground mb-4">Khóa học của tôi 📚</h2>
          {enrollLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((e: any) => (
                <div key={e.id} className="card-duo flex flex-col h-full">
                  <div className="aspect-video w-full bg-muted relative rounded-t-[14px] overflow-hidden">
                    {e.courses?.thumbnail_url ? (
                      <img src={e.courses.thumbnail_url} alt={e.courses.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs bg-gradient-to-br from-[var(--duo-correct)]/10 to-[var(--duo-blue)]/10">
                        {e.courses?.title?.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                       <h3 className="font-extrabold text-foreground text-sm line-clamp-2 flex-1 leading-tight">{e.courses?.title}</h3>
                       <span className="badge-duo badge-blue text-[9px] shrink-0">{courseTypeMap[e.courses?.course_type] || ""}</span>
                    </div>
                    <div className="mt-auto pt-2">
                      <p className="text-[10px] text-muted-foreground font-bold">
                        {e.expires_at ? `📅 Hạn: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "♾️ Vĩnh viễn"}
                      </p>
                      <Link to={`/courses/${e.course_id}`} className="btn-3d btn-3d-primary w-full py-2 text-xs mt-3 block text-center">
                        Tiếp tục học →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-duo p-8 text-center">
              <p className="text-muted-foreground font-medium">Bạn chưa đăng ký khóa học nào.</p>
              <Link to="/courses" className="btn-3d btn-3d-primary py-2.5 px-6 mt-4 inline-block text-sm">
                Xem khóa học
              </Link>
            </div>
          )}
        </div>

        {/* Recent quiz results */}
        <div>
          <h2 className="text-lg font-extrabold text-foreground mb-4">Kết quả bài thi gần đây 📝</h2>
          {quizResults && quizResults.length > 0 ? (
            <div className="card-duo divide-y-2 divide-[var(--duo-gray)]">
              {quizResults.map((r: any) => {
                const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                const scoreColor = pct >= 80 ? "badge-green" : pct >= 50 ? "badge-yellow" : "badge-orange";
                return (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between">
                    <span className="text-foreground font-bold text-sm">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</span>
                    <span className={`badge-duo ${scoreColor}`}>{r.correct_answers}/{r.total_questions} đúng</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-duo p-6 text-center">
              <p className="text-sm text-muted-foreground font-medium">Bạn chưa làm bài thi nào.</p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
