import StudentLayout from "@/components/StudentLayout";
import { Link } from "react-router-dom";
import { Flame, ArrowRight, Trophy, BookOpen, Headphones, FileText, Sparkles, CheckCircle2, Play } from "lucide-react";
import { PlayCircle, ClipboardText, Star, BookBookmark } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import OnboardingModal, { useOnboarding } from "@/components/OnboardingModal";
import { DailyQuestsWidget } from "@/components/DailyQuestsWidget";
import { AchievementsWidget } from "@/components/AchievementsWidget";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Bạn";
  const { shouldShow: showOnboarding, markDone: doneOnboarding } = useOnboarding();

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

  // Get last lesson progress to show Continue Learning widget
  const lastProgressLesson = useMemo(() => {
    if (!lessonProgress || lessonProgress.length === 0) return null;
    return lessonProgress[0];
  }, [lessonProgress]);

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

  // Calculate daily streak from progress records
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
      label: "Bài học hoàn thành",
      value: completedLessons,
      suffix: " bài",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      Icon: ClipboardText,
      label: "Bài thi đã làm",
      value: totalQuizzes,
      suffix: " đề",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      Icon: Star,
      label: "Điểm trung bình",
      value: avgScore,
      suffix: "/10",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      Icon: BookBookmark,
      label: "Khóa đã đăng ký",
      value: enrollments?.length || 0,
      suffix: " khóa",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
  ];

  const courseTypeMap: Record<string, string> = {
    video_quiz: "Khóa học Video",
    flashcard: "Kho Từ vựng",
    listening: "Luyện nghe Chép chính tả",
    speaking: "Speaking & Writing",
    fulltest: "Luyện đề Full Test",
  };

  return (
    <StudentLayout>
      {showOnboarding && <OnboardingModal onDone={doneOnboarding} />}

      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-5 sm:p-7 md:p-8 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chào mừng trở lại</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Xin chào, {displayName}!
            </h1>
            <p className="text-white/85 text-xs sm:text-sm font-normal">
              Tiếp tục hành trình chinh phục mục tiêu TOEIC hôm nay nhé.
            </p>
          </div>
          
          {/* Streak Widget */}
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black leading-none text-white">
                {streak} ngày
              </div>
              <p className="text-white/80 text-[10px] sm:text-[11px] font-medium mt-0.5">Chuỗi học tập</p>
            </div>
          </div>
        </div>

        {/* ⚡ TRUNG TÂM LUYỆN TẬP SIÊU TỐC - Quick Practice Hub */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Vào Luyện Tập Nhanh
              </h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
              Chọn chế độ luyện tập 1 chạm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Card 1: Luyện Đề Full Test */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="bg-emerald-500 text-white text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-2xs tracking-wider">
                    200 Câu • Bấm Giờ
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-foreground group-hover:text-emerald-600 transition-colors">
                    Luyện Đề Full Test TOEIC
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                    Bộ đề thi thử sát đề thật 2026/2025, bấm giờ làm bài 120 phút, chấm điểm Listening & Reading tự động kèm giải thích từng câu.
                  </p>
                </div>
              </div>

              <Link
                to="/courses?filter=fulltest"
                className="btn-3d btn-3d-green w-full py-3 sm:py-3.5 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-sm text-center"
              >
                <span>Vào Luyện Đề Ngay 🎯</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 2: Luyện Nghe Điền Từ (Dictation) */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--duo-blue)]/30 bg-gradient-to-br from-[var(--duo-blue)]/10 via-indigo-500/5 to-card p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:border-[var(--duo-blue)]/50 transition-all group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[var(--duo-blue)] text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <span className="bg-[var(--duo-blue)] text-white text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-2xs tracking-wider">
                    Kéo Thả Cảm Ứng
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-foreground group-hover:text-[var(--duo-blue)] transition-colors">
                    Luyện Nghe Điền Từ (Dictation)
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-1">
                    Luyện nghe chép chính tả chuyên sâu, kéo thả từ khóa mượt mà trên điện thoại, nhận diện phát âm nuốt âm, bứt phá điểm số.
                  </p>
                </div>
              </div>

              <Link
                to="/courses?filter=listening"
                className="btn-3d btn-3d-blue w-full py-3 sm:py-3.5 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-sm text-center"
              >
                <span>Vào Luyện Nghe Điền Từ 🎧</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Continue Learning Widget */}
        {lastLessonDetails && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-blue-300">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Học tiếp bài gần nhất
                </span>
                <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug truncate">
                  {lastLessonDetails.title}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  Khóa học: <span className="text-foreground font-medium">{(lastLessonDetails.modules as any)?.courses?.title}</span>
                </p>
              </div>
            </div>
            <Link
              to={`/courses/${(lastLessonDetails.modules as any)?.course_id}/learn`}
              className="btn-3d btn-3d-primary py-2.5 px-5 text-sm font-semibold flex items-center gap-2 self-stretch md:self-auto text-center justify-center shrink-0"
            >
              Vào học tiếp <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Daily Quests Widget */}
        <DailyQuestsWidget />

        {/* Achievements Widget */}
        <AchievementsWidget />

        {/* Quick Navigation Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/courses"
            className="p-4 rounded-xl border border-border bg-card hover:border-blue-300 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:text-blue-600 transition-colors">Tất cả khóa học</p>
              <p className="text-xs text-muted-foreground mt-0.5">Lộ trình 4 kỹ năng</p>
            </div>
          </Link>

          <Link
            to="/courses?filter=fulltest"
            className="p-4 rounded-xl border border-border bg-card hover:border-emerald-300 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:text-emerald-600 transition-colors">Luyện đề Full Test</p>
              <p className="text-xs text-muted-foreground mt-0.5">Thi thử bấm giờ</p>
            </div>
          </Link>

          <Link
            to="/courses?filter=flashcard"
            className="p-4 rounded-xl border border-border bg-card hover:border-purple-300 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:text-purple-600 transition-colors">Kho từ vựng</p>
              <p className="text-xs text-muted-foreground mt-0.5">Flashcard thông minh</p>
            </div>
          </Link>

          <Link
            to="/courses?filter=listening"
            className="p-4 rounded-xl border border-border bg-card hover:border-amber-300 hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:text-amber-600 transition-colors">Luyện nghe chép</p>
              <p className="text-xs text-muted-foreground mt-0.5">Điền từ chi tiết</p>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl ${s.bgColor} ${s.color} flex items-center justify-center shrink-0`}>
                <s.Icon size={22} weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground leading-tight">
                  {s.value}{s.suffix}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* My Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Khóa học của tôi</h2>
              <p className="text-xs text-muted-foreground">Các khóa học bạn đang theo học</p>
            </div>
            {enrollments && enrollments.length > 0 && (
              <Link to="/courses" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {enrollLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrollments.map((e: any) => {
                const progress = courseProgressMap[e.course_id];
                const progressPct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                const isCompleted = progressPct === 100 && progress && progress.total > 0;

                return (
                  <div key={e.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="aspect-video w-full bg-muted relative overflow-hidden">
                        {e.courses?.thumbnail_url ? (
                          <img src={e.courses.thumbnail_url} alt={e.courses.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-medium bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
                            {e.courses?.title?.substring(0, 20)}...
                          </div>
                        )}
                        
                        {isCompleted && (
                          <div className="absolute top-2.5 left-2.5">
                            <span className="badge-duo badge-green shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {progress && progress.total > 0 && (
                        <div className="w-full bg-muted h-1">
                          <div
                            className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="badge-duo badge-blue">{courseTypeMap[e.courses?.course_type] || "Khóa học"}</span>
                          {progress && progress.total > 0 && (
                            <span className="font-medium text-[11px]">{progressPct}% hoàn thành</span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground text-sm line-clamp-2 leading-snug">{e.courses?.title}</h3>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <Link 
                        to={e.courses?.course_type === 'flashcard' ? `/courses/${e.course_id}/vocab` : e.courses?.course_type === 'fulltest' ? `/courses/${e.course_id}/fulltest` : `/courses/${e.course_id}/learn`} 
                        className="btn-3d btn-3d-primary w-full py-2 text-xs text-center"
                      >
                        {isCompleted ? "Học lại bài học" : "Tiếp tục học →"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-foreground font-semibold text-base">Bạn chưa đăng ký khóa học nào</p>
              <p className="text-muted-foreground text-xs max-w-sm mx-auto">Khám phá các khóa học TOEIC 4 kỹ năng được thiết kế trực quan, bài bản để bắt đầu ngay.</p>
              <Link to="/courses" className="btn-3d btn-3d-primary py-2 px-4 inline-flex items-center gap-1.5 text-xs mt-2">
                Xem danh sách khóa học <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Quiz Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Kết quả bài thi gần đây
            </h2>
            <Link to="/profile" className="text-xs font-semibold text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>

          {quizResults && quizResults.length > 0 ? (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
              {quizResults.map((r: any) => {
                const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                const scoreColor = pct >= 80 ? "badge-green" : pct >= 50 ? "badge-yellow" : "badge-orange";
                return (
                  <div key={r.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="text-foreground font-semibold text-sm line-clamp-1">{r.quizzes?.title || `Bài tập #${r.quiz_id}`}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`badge-duo ${scoreColor}`}>{r.correct_answers}/{r.total_questions} đúng ({Math.round(pct)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-6 text-center bg-card">
              <p className="text-xs text-muted-foreground">Bạn chưa làm bài kiểm tra nào gần đây.</p>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
