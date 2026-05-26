import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PlayCircle as PlayCircleLucide, Flame, ArrowRight, Trophy } from "lucide-react";
import { PlayCircle, ClipboardText, Star, BookBookmark } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";

// Count-up animation for premium feeling
const AnimatedCounter = ({ value, suffix = "", duration = 800 }: { value: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / (end || 1)), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}{suffix}</span>;
};

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
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // A1: Get last lesson progress to show Continue Learning widget
  const lastProgressLesson = useMemo(() => {
    if (!lessonProgress || lessonProgress.length === 0) return null;
    // Find the latest record
    return lessonProgress[0]; // ordered desc by created_at
  }, [lessonProgress]);

  // Fetch full details of the last progress lesson
  const { data: lastLessonDetails } = useQuery({
    queryKey: ["last-lesson-details", lastProgressLesson?.lesson_id],
    queryFn: async () => {
      if (!lastProgressLesson?.lesson_id) return null;
      const { data } = await supabase
        .from("lessons")
        .select("*, modules(*, courses(*))")
        .eq("id", lastProgressLesson.lesson_id)
        .maybeSingle();
      return data;
    },
    enabled: !!lastProgressLesson?.lesson_id,
  });

  // Fetch total lessons per course
  const { data: allLessons = [] } = useQuery({
    queryKey: ["dashboard-all-lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, modules!inner(course_id)")
        .eq("is_published", true);
      return data || [];
    },
  });

  const completedLessons = useMemo(() => lessonProgress?.filter((p: any) => p.is_completed).length || 0, [lessonProgress]);
  const totalQuizzes = quizResults?.length || 0;
  const avgScore = useMemo(() => {
    if (!quizResults || quizResults.length === 0) return 0;
    return Number((quizResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / quizResults.length).toFixed(1));
  }, [quizResults]);

  // A1: Calculate daily streak from progress records
  const streak = useMemo(() => {
    if (!lessonProgress || lessonProgress.length === 0) return 0;
    const completedDates = Array.from(new Set(
      lessonProgress
        .filter((p: any) => p.is_completed && p.created_at)
        .map((p: any) => new Date(p.created_at).toDateString())
    )).map(d => new Date(d));

    completedDates.sort((a, b) => b.getTime() - a.getTime());
    if (completedDates.length === 0) return 0;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDate = completedDates[0];
    latestDate.setHours(0,0,0,0);

    if (latestDate.getTime() !== today.getTime() && latestDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    let currentDate = latestDate;
    currentStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const nextDate = completedDates[i];
      nextDate.setHours(0,0,0,0);
      const diffTime = currentDate.getTime() - nextDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        currentDate = nextDate;
      } else if (diffDays > 1) {
        break;
      }
    }
    return currentStreak;
  }, [lessonProgress]);

  // D6: Map progress percentage
  const completedLessonIds = useMemo(() => new Set(lessonProgress?.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id) || []), [lessonProgress]);

  const courseProgressMap = useMemo(() => {
    const map: Record<number, { total: number; completed: number }> = {};
    allLessons.forEach((lesson: any) => {
      const courseId = lesson.modules?.course_id;
      if (!courseId) return;
      if (!map[courseId]) map[courseId] = { total: 0, completed: 0 };
      map[courseId].total++;
      if (completedLessonIds.has(lesson.id)) map[courseId].completed++;
    });
    return map;
  }, [allLessons, completedLessonIds]);

  const stats = [
    {
      Icon: PlayCircle,
      label: "Bài giảng đã xem",
      value: completedLessons,
      suffix: "",
      gradient: "from-emerald-500 to-teal-400",
      glow: "shadow-emerald-400/40",
    },
    {
      Icon: ClipboardText,
      label: "Bài thi đã làm",
      value: totalQuizzes,
      suffix: "",
      gradient: "from-blue-500 to-cyan-400",
      glow: "shadow-blue-400/40",
    },
    {
      Icon: Star,
      label: "Điểm trung bình",
      value: avgScore,
      suffix: "/10",
      gradient: "from-yellow-400 to-orange-400",
      glow: "shadow-yellow-400/40",
    },
    {
      Icon: BookBookmark,
      label: "Khóa đã đăng ký",
      value: enrollments?.length || 0,
      suffix: "",
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
        {/* Welcome banner & A1 Streak Widget */}
        <div className="card-duo p-0 overflow-hidden">
          <div className="bg-[var(--duo-correct)] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">Xin chào, {displayName}! 👋</h1>
              <p className="text-white/80 text-sm mt-1 font-bold">Chúc bạn một ngày học tập thật hiệu quả. 🦉</p>
            </div>
            
            {/* A1: Streak Counter Widget */}
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 border-2 border-white/10 animate-pulse">
              <Flame className="w-8 h-8 text-[var(--duo-orange)] fill-[var(--duo-orange)]" />
              <div className="text-left">
                <p className="text-white font-black text-xl leading-none">
                  <AnimatedCounter value={streak} /> ngày
                </p>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mt-0.5">Chuỗi học tập (Streak)</p>
              </div>
            </div>
          </div>
        </div>

        {/* A1: Continue Learning Widget */}
        {lastLessonDetails && (
          <div className="card-duo p-6 bg-gradient-to-r from-[var(--duo-blue)]/5 to-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--duo-blue)] flex items-center justify-center text-white text-2xl shrink-0 shadow-md">
                🎓
              </div>
              <div className="space-y-1">
                <span className="badge-duo badge-blue text-[9px] uppercase tracking-wider font-extrabold">Học tiếp bài học gần đây</span>
                <h3 className="font-extrabold text-foreground text-base leading-tight md:text-lg">{lastLessonDetails.title}</h3>
                <p className="text-xs text-muted-foreground font-bold">
                  Khóa học: <span className="text-foreground">{(lastLessonDetails.modules as any)?.courses?.title}</span>
                </p>
              </div>
            </div>
            <Link
              to={`/courses/${(lastLessonDetails.modules as any)?.course_id}/learn`}
              className="btn-3d btn-3d-primary py-3 px-6 text-sm font-extrabold flex items-center gap-2 self-stretch md:self-auto text-center justify-center"
            >
              Vào học tiếp <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card-duo p-4 space-y-3 hover:-translate-y-0.5 transition-transform">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.gradient} ${s.glow} shadow-lg flex items-center justify-center`}>
                <s.Icon size={26} weight="duotone" color="white" />
              </div>
              <p className="text-2xl font-extrabold text-foreground">
                <AnimatedCounter value={Number(s.value)} suffix={s.suffix} />
              </p>
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
              {enrollments.map((e: any) => {
                const progress = courseProgressMap[e.course_id];
                const progressPct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                const isCompleted = progressPct === 100 && progress && progress.total > 0;

                return (
                  <div key={e.id} className="card-duo flex flex-col h-full overflow-hidden hover:translate-y-[-2px] transition-transform">
                    <div className="aspect-video w-full bg-muted relative overflow-hidden">
                      {e.courses?.thumbnail_url ? (
                        <img src={e.courses.thumbnail_url} alt={e.courses.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs bg-gradient-to-br from-[var(--duo-correct)]/10 to-[var(--duo-blue)]/10">
                          {e.courses?.title?.substring(0, 20)}...
                        </div>
                      )}
                      
                      {/* D6: Completed badge */}
                      {isCompleted && (
                        <div className="absolute top-3 left-3">
                          <span className="badge-duo badge-green text-[9px]">✅ Hoàn thành</span>
                        </div>
                      )}
                    </div>

                    {/* D6: Progress Bar on Dashboard */}
                    {progress && progress.total > 0 && (
                      <div className="w-full bg-muted h-1.5">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: isCompleted ? 'var(--duo-correct)' : 'var(--duo-blue)'
                          }}
                        />
                      </div>
                    )}

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                           <span className="badge-duo badge-blue text-[9px] shrink-0">{courseTypeMap[e.courses?.course_type] || ""}</span>
                           {progress && progress.total > 0 && (
                             <span className="text-[10px] font-extrabold text-muted-foreground">{progressPct}% hoàn thành</span>
                           )}
                        </div>
                        <h3 className="font-extrabold text-foreground text-sm line-clamp-2 leading-tight">{e.courses?.title}</h3>
                      </div>
                      
                      <div className="pt-2 border-t-2 border-[var(--duo-gray)] mt-4">
                        <p className="text-[10px] text-muted-foreground font-bold">
                          {e.expires_at ? `📅 Hạn: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}` : "♾️ Vĩnh viễn"}
                        </p>
                        <Link to={e.courses?.course_type === 'flashcard' ? `/courses/${e.course_id}/vocab` : `/courses/${e.course_id}/learn`} className="btn-3d btn-3d-primary w-full py-2 text-xs mt-3 block text-center">
                          {isCompleted ? "Học lại 🔁" : "Tiếp tục học →"}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--duo-orange)]" /> Kết quả bài thi gần đây 📝
          </h2>
          {quizResults && quizResults.length > 0 ? (
            <div className="card-duo divide-y-2 divide-[var(--duo-gray)]">
              {quizResults.map((r: any) => {
                const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                const scoreColor = pct >= 80 ? "badge-green" : pct >= 50 ? "badge-yellow" : "badge-orange";
                return (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <span className="text-foreground font-bold text-sm">{r.quizzes?.title || `Quiz #${r.quiz_id}`}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-semibold">{new Date(r.completed_at).toLocaleDateString("vi-VN")}</span>
                      <span className={`badge-duo ${scoreColor}`}>{r.correct_answers}/{r.total_questions} đúng</span>
                    </div>
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
