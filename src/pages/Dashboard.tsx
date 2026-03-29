import StudentLayout from "@/components/StudentLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlayCircle, ClipboardCheck, Star, Clock } from "lucide-react";
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
    { icon: PlayCircle, label: "Bài giảng đã xem", value: `${completedLessons}`, color: "text-primary" },
    { icon: ClipboardCheck, label: "Bài thi đã làm", value: `${totalQuizzes}`, color: "text-accent" },
    { icon: Star, label: "Điểm trung bình", value: `${avgScore}/10`, color: "text-warning" },
    { icon: Clock, label: "Khóa đã đăng ký", value: `${enrollments?.length || 0}`, color: "text-success" },
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
        {/* Welcome */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 text-primary-foreground">
          <h1 className="text-xl md:text-2xl font-bold">Xin chào, {displayName}! 👋</h1>
          <p className="text-primary-foreground/80 text-sm mt-1">Tiếp tục học nhé!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-xl border p-4 space-y-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* My courses */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Khóa học của tôi</h2>
          {enrollLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map((e: any) => (
                <div key={e.id} className="bg-card rounded-xl border p-5 space-y-3 card-hover">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{e.courses?.title}</h3>
                    <span className="text-xs">{courseTypeMap[e.courses?.course_type] || ""}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {e.expires_at ? `Hết hạn: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "Vĩnh viễn"}
                  </p>
                  <Button size="sm" className="w-full" asChild>
                    <Link to={`/courses/${e.course_id}`}>Tiếp tục học →</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-8 text-center">
              <p className="text-muted-foreground">Bạn chưa đăng ký khóa học nào.</p>
              <Button className="mt-3" asChild><Link to="/courses">Xem khóa học</Link></Button>
            </div>
          )}
        </div>

        {/* Recent quiz results */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Kết quả bài thi gần đây</h2>
          {quizResults && quizResults.length > 0 ? (
            <div className="bg-card rounded-xl border divide-y">
              {quizResults.map((r: any) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-foreground">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</span>
                  <span className="font-medium text-primary">{r.correct_answers}/{r.total_questions} đúng</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border p-6 text-center">
              <p className="text-sm text-muted-foreground">Bạn chưa làm bài thi nào.</p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
