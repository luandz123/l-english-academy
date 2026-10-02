import StudentLayout from "@/components/StudentLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  User,
  BookOpen,
  Trophy,
  KeyRound,
  Calendar,
  Mail,
  CheckCircle2,
  Loader2,
  Flame,
  ArrowRight,
  Play,
  PlayCircle,
  ClipboardCheck,
  Star,
  BookmarkCheck,
  Headphones,
  FileText,
  Sparkles,
  Zap,
  Target,
} from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { DailyQuestsWidget } from "@/components/DailyQuestsWidget";
import { AchievementsWidget } from "@/components/AchievementsWidget";
import ErrorState from "@/components/ErrorState";

const Profile = () => {
  const { user, profile, isAdmin } = useAuth();
  const { levelInfo, xp } = useGamification();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();

  // 1. Quizzes results
  const { data: quizResults, isError: isQuizError, refetch: refetchQuizzes } = useQuery({
    queryKey: ["profile-quiz-results", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*, quizzes(title)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 2. Enrollments
  const { data: enrollments, isError: isEnrollmentsError, refetch: refetchEnrollments } = useQuery({
    queryKey: ["profile-enrollments", user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin) {
        const { data: courses } = await supabase.from("courses").select("*").eq("is_active", true);
        return (courses || []).map((c) => ({
          id: `admin-${c.id}`,
          course_id: c.id,
          expires_at: null,
          courses: c,
        }));
      }
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // 3. Lesson Progress
  const { data: lessonProgress, isError: isProgressError, refetch: refetchProgress } = useQuery({
    queryKey: ["profile-lesson-progress", user?.id],
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

  // 4. Last lesson for "Continue Learning"
  const lastProgressLesson = useMemo(() => {
    if (!lessonProgress || lessonProgress.length === 0) return null;
    return lessonProgress[0];
  }, [lessonProgress]);

  const { data: lastLessonDetails } = useQuery({
    queryKey: ["profile-last-lesson-details", lastProgressLesson?.lesson_id],
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

  // 5. All lessons for course progress calculation
  const { data: allLessons = [] } = useQuery({
    queryKey: ["profile-all-lessons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, modules!inner(course_id)")
        .eq("is_published", true);
      return data || [];
    },
  });

  // Stats calculations
  const completedLessons = useMemo(
    () => lessonProgress?.filter((p: any) => p.is_completed).length || 0,
    [lessonProgress]
  );
  const completedLessonIds = useMemo(
    () => new Set(lessonProgress?.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id) || []),
    [lessonProgress]
  );
  const totalQuizzes = quizResults?.length || 0;
  const avgScore = useMemo(() => {
    if (!quizResults || quizResults.length === 0) return 0;
    return Number(
      (quizResults.reduce((sum, r) => sum + (Number(r.score) || 0), 0) / quizResults.length).toFixed(1)
    );
  }, [quizResults]);

  // Streak calculation
  const streak = useMemo(() => {
    if (!lessonProgress || lessonProgress.length === 0) return 0;
    const completedDates = Array.from(
      new Set(
        lessonProgress
          .filter((p: any) => p.is_completed && p.created_at)
          .map((p: any) => new Date(p.created_at).toDateString())
      )
    ).map((d) => new Date(d));

    completedDates.sort((a, b) => b.getTime() - a.getTime());
    if (completedDates.length === 0) return 0;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDate = completedDates[0];
    latestDate.setHours(0, 0, 0, 0);

    if (latestDate.getTime() !== today.getTime() && latestDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    let currentDate = latestDate;
    currentStreak = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const nextDate = completedDates[i];
      nextDate.setHours(0, 0, 0, 0);
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

  // Course progress calculation
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

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Cập nhật thất bại", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Đã cập nhật!", description: "Thông tin cá nhân đã được lưu thành công." });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Mật khẩu không khớp", description: "Mật khẩu xác nhận phải giống mật khẩu mới.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Mật khẩu quá ngắn", description: "Mật khẩu mới phải có ít nhất 6 ký tự.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Đổi mật khẩu thất bại", description: getFriendlyErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Thành công!", description: "Mật khẩu đã được đổi thành công." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const stats = [
    {
      Icon: PlayCircle,
      label: "Bài học đã hoàn thành",
      value: completedLessons,
      suffix: " bài",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      borderColor: "border-blue-200 dark:border-blue-900/50",
    },
    {
      Icon: ClipboardCheck,
      label: "Bài thi / Quiz đã làm",
      value: totalQuizzes,
      suffix: " đề",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-emerald-200 dark:border-emerald-900/50",
    },
    {
      Icon: Star,
      label: "Điểm trung bình",
      value: avgScore,
      suffix: "/10",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-amber-200 dark:border-amber-900/50",
    },
    {
      Icon: BookmarkCheck,
      label: "Khóa học đã đăng ký",
      value: enrollments?.length || 0,
      suffix: " khóa",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      borderColor: "border-purple-200 dark:border-purple-900/50",
    },
  ];

  if (isEnrollmentsError || isProgressError || isQuizError) {
    return (
      <StudentLayout>
        <div className="max-w-5xl mx-auto py-16 px-4">
          <ErrorState
            onRetry={() => {
              refetchQuizzes();
              refetchEnrollments();
              refetchProgress();
            }}
          />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* ======================================================== */}
        {/* 1. HERO HEADER: HỒ SƠ HỌC VIÊN + STREAK + GAMIFICATION */}
        {/* ======================================================== */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-5 sm:p-6 md:p-7 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-white/30 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white/30 shadow-md">
                {initials}
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  {displayName}
                </h1>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-black uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-white/85 text-xs flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {user?.email}
              </p>
              <div className="flex items-center gap-3 text-xs text-white/80 pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> Tham gia:{" "}
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <Zap className="w-3.5 h-3.5 fill-amber-300" /> Cấp {levelInfo?.level || 1}: {levelInfo?.title || "Tập sự"}
                </span>
              </div>
            </div>
          </div>

          {/* Gamification Streak & XP Badge */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end shrink-0">
            <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-md rounded-xl px-3.5 py-2.5 border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
                <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black leading-none text-white">
                  {streak} ngày
                </div>
                <p className="text-white/80 text-xs font-medium mt-0.5">Chuỗi học tập</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-md rounded-xl px-3.5 py-2.5 border border-white/20">
              <div className="w-9 h-9 rounded-lg bg-emerald-400/20 flex items-center justify-center text-emerald-300">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black leading-none text-white">
                  {xp} XP
                </div>
                <p className="text-white/80 text-xs font-medium mt-0.5">Kinh nghiệm</p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. STATS OVERVIEW: 4 THẺ THỐNG KÊ TIẾN ĐỘ HỌC TẬP         */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border ${stat.borderColor} bg-card hover:shadow-sm transition-all flex flex-col justify-between gap-3`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground line-clamp-1">
                  {stat.label}
                </span>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.color} shrink-0`}>
                  <stat.Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-foreground">
                  {stat.value}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {stat.suffix}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ======================================================== */}
        {/* 3. CONTINUE LEARNING WIDGET (Nếu có bài học đang dở)      */}
        {/* ======================================================== */}
        {lastLessonDetails && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-blue-300 shadow-2xs">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Tiếp tục bài học gần nhất
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
              className="btn-3d btn-3d-primary py-2.5 px-5 text-xs sm:text-sm font-bold flex items-center gap-2 self-stretch sm:self-auto text-center justify-center shrink-0"
            >
              Vào học tiếp <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. SHORTCUTS LUYỆN TẬP NHANH (1 Chạm)                   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/#section-fulltest"
            className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                  Luyện Đề Full Test TOEIC
                </h4>
                <p className="text-xs text-muted-foreground">
                  200 câu chuẩn format ETS, bấm giờ 120 phút
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/#section-listening"
            className="p-3.5 sm:p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                  Luyện Nghe Điền Từ (Dictation)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Nghe chép chính tả, kéo thả từ khóa cảm ứng
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ======================================================== */}
        {/* 5. TABS: KHÓA HỌC • LỊCH SỬ THI • THÀNH TÍCH • TÀI KHOẢN  */}
        {/* ======================================================== */}
        <Tabs defaultValue="courses" className="w-full space-y-4 pt-2">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto flex-wrap gap-1">
            <TabsTrigger
              value="courses"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Khóa học của tôi ({enrollments?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Lịch sử làm bài ({quizResults?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="quests"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-purple-600" /> Nhiệm vụ & Danh hiệu
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" /> Thông tin cá nhân
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" /> Đổi mật khẩu
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: KHÓA HỌC CỦA TÔI */}
          <TabsContent value="courses" className="mt-4 focus-visible:outline-none space-y-3">
            {enrollments && enrollments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrollments.map((e: any) => {
                  const progress = courseProgressMap[e.course_id] || { total: 0, completed: 0 };
                  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

                  return (
                    <div
                      key={e.id}
                      className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-blue-300 transition-all group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                            {e.courses?.title}
                          </h4>
                          <span className="badge-duo badge-green text-xs shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Đã đăng ký
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {e.courses?.description || "Khóa học chất lượng cao bám sát format đề thi TOEIC."}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Tiến độ hoàn thành:</span>
                            <span className="text-blue-600 font-bold">{percent}% ({progress.completed}/{progress.total} bài)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          {e.expires_at
                            ? `Hạn dùng: ${new Date(e.expires_at).toLocaleDateString("vi-VN")}`
                            : "Thời hạn: Vĩnh viễn"}
                        </span>
                        <Link
                          to={`/courses/${e.course_id}/learn`}
                          className="btn-3d btn-3d-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5"
                        >
                          Vào học ngay <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-10 text-center bg-card space-y-3">
                <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">Bạn chưa đăng ký khóa học nào</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hãy tham khảo kho khóa học TOEIC đa dạng hoặc bắt đầu luyện đề miễn phí ngay!
                  </p>
                </div>
                <Link to="/#section-video" className="btn-3d btn-3d-primary py-2 px-5 text-xs font-bold inline-flex items-center gap-2">
                  Khám phá khóa học <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: LỊCH SỬ BÀI THI */}
          <TabsContent value="history" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {quizResults && quizResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                        <th className="text-left p-3.5 font-bold">Tên bài thi / bài tập</th>
                        <th className="text-center p-3.5 font-bold">Điểm số</th>
                        <th className="text-center p-3.5 font-bold">Số câu đúng</th>
                        <th className="text-right p-3.5 font-bold">Ngày làm bài</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quizResults.map((r: any) => {
                        const pct = r.total_questions > 0 ? (r.correct_answers / r.total_questions) * 100 : 0;
                        return (
                          <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3.5 font-bold text-foreground">
                              {r.quizzes?.title || `Bài luyện tập #${r.quiz_id}`}
                            </td>
                            <td className="p-3.5 text-center">
                              <span
                                className={`badge-duo font-bold ${
                                  pct >= 80 ? "badge-green" : pct >= 50 ? "badge-yellow" : "badge-orange"
                                }`}
                              >
                                {Number(r.score).toFixed(1)}/10
                              </span>
                            </td>
                            <td className="p-3.5 text-center text-muted-foreground font-semibold">
                              {r.correct_answers}/{r.total_questions} câu
                            </td>
                            <td className="p-3.5 text-right text-muted-foreground">
                              {new Date(r.completed_at).toLocaleDateString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-muted-foreground space-y-2">
                  <Trophy className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p>Chưa có lịch sử làm bài thi nào. Hãy làm thử một bài kiểm tra ngay!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: NHIỆM VỤ & DANH HIỆU */}
          <TabsContent value="quests" className="mt-4 focus-visible:outline-none space-y-5">
            <DailyQuestsWidget />
            <AchievementsWidget />
          </TabsContent>

          {/* TAB 4: THÔNG TIN CÁ NHÂN */}
          <TabsContent value="info" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-lg shadow-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Họ và tên</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập họ và tên..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Địa chỉ Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-10 rounded-lg border-border text-sm bg-muted/60 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">Email đăng nhập tài khoản không thể thay đổi.</p>
              </div>
              <button
                onClick={handleUpdateProfile}
                disabled={saving}
                className="btn-3d btn-3d-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
              </button>
            </div>
          </TabsContent>

          {/* TAB 5: ĐỔI MẬT KHẨU */}
          <TabsContent value="password" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-lg shadow-sm">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập ít nhất 6 ký tự..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Xác nhận mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 rounded-lg border-border text-sm"
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="btn-3d btn-3d-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
              >
                {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingPassword ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}</span>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default Profile;
