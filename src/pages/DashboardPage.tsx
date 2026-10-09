import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import StudentLayout from "@/components/StudentLayout";
import {
  Flame,
  Target,
  Trophy,
  Play,
  ArrowRight,
  BookOpen,
  FileCheck2,
  Headphones,
  Zap,
  Gamepad2,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Star,
  Award,
  ChevronRight,
  Gift,
  Crown,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { MysteryChestModal } from "@/components/MysteryChestModal";
import { LevelDetailsModal } from "@/components/LevelDetailsModal";
import { TestHistoryModal } from "@/components/TestHistoryModal";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { useToast } from "@/hooks/use-toast";

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { levelInfo, xp, streak, quests, claimQuest } = useGamification();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [chestModalOpen, setChestModalOpen] = useState(false);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [testHistoryModalOpen, setTestHistoryModalOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);

  // Local date calculation (YYYY-MM-DD) avoiding timezone skew
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const [chestClaimedToday, setChestClaimedToday] = useState(() => {
    return typeof window !== "undefined" && localStorage.getItem("lenglish_last_chest_date") === todayStr;
  });

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Học viên";
  const initials = displayName.charAt(0).toUpperCase();

  // 1. Fetch courses
  const { data: courses = [], isLoading: isCoursesLoading } = useQuery({
    queryKey: ["dashboard-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch lesson progress for "Continue Learning"
  const { data: lessonProgress = [] } = useQuery({
    queryKey: ["dashboard-lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 3. Enrollments with course details
  const { data: enrollments = [] } = useQuery({
    queryKey: ["dashboard-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 4. Khóa học Nghe - Đọc (Listening & Reading)
  const ngheDocCourse = useMemo(() => {
    return (
      courses.find((c: any) => c.id === 1) ||
      courses.find((c: any) => {
        const title = (c.title || "").toLowerCase();
        return (
          (title.includes("nghe") && title.includes("đọc")) ||
          title.includes("nghe-đọc") ||
          title.includes("nghe - đọc")
        );
      }) ||
      enrollments.find((e: any) => {
        const title = (e.courses?.title || "").toLowerCase();
        return e.course_id === 1 || (title.includes("nghe") && title.includes("đọc"));
      })?.courses ||
      courses[0]
    );
  }, [courses, enrollments]);

  const ngheDocCourseId = (ngheDocCourse?.id as number) || 1;

  const { data: courseModules = [] } = useQuery({
    queryKey: ["dashboard-course-modules", ngheDocCourseId],
    queryFn: async () => {
      if (!ngheDocCourseId) return [];
      const { data } = await (supabase.from("modules") as any)
        .select("id, title, lessons(id, title)")
        .eq("course_id", ngheDocCourseId);
      return data || [];
    },
    enabled: !!ngheDocCourseId,
  });

  const allCourseLessons = useMemo(() => {
    return courseModules.flatMap((m: any) => m.lessons || []);
  }, [courseModules]);

  const totalCourseLessonsCount = allCourseLessons.length || 0;
  const completedCourseLessonsCount = useMemo(() => {
    if (allCourseLessons.length === 0) {
      return lessonProgress.filter((p: any) => p.is_completed).length;
    }
    return allCourseLessons.filter((l: any) =>
      lessonProgress.some((p: any) => p.lesson_id === l.id && p.is_completed)
    ).length;
  }, [allCourseLessons, lessonProgress]);

  const courseProgressPercentage = totalCourseLessonsCount > 0
    ? Math.min(100, Math.round((completedCourseLessonsCount / totalCourseLessonsCount) * 100))
    : 0;

  // 5. Quiz results count
  const { data: quizResults = [] } = useQuery({
    queryKey: ["dashboard-quiz-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_quiz_results")
        .select("id, quiz_id, score, total_questions, correct_answers, time_spent_seconds, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 6. User full test results (latest test completed)
  const { data: fullTestResults = [] } = useQuery({
    queryKey: ["dashboard-full-tests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_full_test_results")
        .select("*, full_tests(*)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 7. All full tests
  const { data: allFullTests = [] } = useQuery({
    queryKey: ["dashboard-all-full-tests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("full_tests")
        .select("id, title, category, display_order, course_id")
        .order("display_order", { ascending: true });
      return data || [];
    },
  });

  const latestFullTest = fullTestResults[0];

  // Đề thi gần nhất đã làm (hoặc đề mặc định nếu chưa làm đề nào)
  const targetRecentTest = useMemo(() => {
    if (latestFullTest?.full_tests) {
      return {
        id: latestFullTest.test_id,
        course_id: latestFullTest.full_tests.course_id,
        title: latestFullTest.full_tests.title,
        score: latestFullTest.total_score,
        isCompleted: true,
      };
    }
    const fallback = allFullTests[0];
    return fallback
      ? {
          id: fallback.id,
          course_id: fallback.course_id,
          title: fallback.title,
          score: null,
          isCompleted: false,
        }
      : null;
  }, [latestFullTest, allFullTests]);

  const recentTestTitle = targetRecentTest?.title || latestFullTest?.full_tests?.title || allFullTests[0]?.title || "ETS TOEIC 2024 - Test 01";
  const recentTestScore = latestFullTest
    ? `${latestFullTest.total_score || 0}/990 điểm`
    : "Chưa làm bài";

  const recentTestUrl = useMemo(() => {
    if (!targetRecentTest) return "/fulltests";
    if (targetRecentTest.course_id && targetRecentTest.id) {
      return `/courses/${targetRecentTest.course_id}/fulltest/${targetRecentTest.id}`;
    }
    return `/fulltests/${targetRecentTest.id}`;
  }, [targetRecentTest]);

  // 8. Study time leaderboard (aggregating real test & quiz time of all users)
  const { data: studyTimeLeaderboard = [] } = useQuery({
    queryKey: ["dashboard-study-leaderboard"],
    queryFn: async () => {
      const [testsRes, quizzesRes] = await Promise.all([
        supabase.from("user_full_test_results").select("user_id, time_spent_seconds"),
        supabase.from("user_quiz_results").select("user_id, time_spent_seconds"),
      ]);
      const userTimes: Record<string, number> = {};
      (testsRes.data || []).forEach((r: any) => {
        if (r.user_id && r.time_spent_seconds) {
          userTimes[r.user_id] = (userTimes[r.user_id] || 0) + r.time_spent_seconds;
        }
      });
      (quizzesRes.data || []).forEach((r: any) => {
        if (r.user_id && r.time_spent_seconds) {
          userTimes[r.user_id] = (userTimes[r.user_id] || 0) + r.time_spent_seconds;
        }
      });
      return Object.entries(userTimes).sort((a, b) => b[1] - a[1]);
    },
  });

  const totalStudySeconds = useMemo(() => {
    const testSecs = fullTestResults.reduce((acc: number, r: any) => acc + (r.time_spent_seconds || 0), 0);
    const quizSecs = quizResults.reduce((acc: number, r: any) => acc + (r.time_spent_seconds || 0), 0);
    return testSecs + quizSecs;
  }, [fullTestResults, quizResults]);

  const totalStudyHours = (totalStudySeconds > 0 ? totalStudySeconds / 3600 : 0.0).toFixed(1);

  const userRank = useMemo(() => {
    if (!user) return 1;
    const rankIndex = studyTimeLeaderboard.findIndex(([uid]) => uid === user.id);
    if (rankIndex !== -1) return rankIndex + 1;
    if (totalStudySeconds > 0) {
      const betterCount = studyTimeLeaderboard.filter(([, s]) => s > totalStudySeconds).length;
      return betterCount + 1;
    }
    return Math.max(1, studyTimeLeaderboard.length + 1);
  }, [studyTimeLeaderboard, user, totalStudySeconds]);

  // Calendar Days calculation for Weekly Streak (Mon to Sun)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  const weekDays = useMemo(() => {
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const fullLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

    return labels.map((label, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
      const isToday = index === currentDayOfWeek;
      const isFuture = index > currentDayOfWeek;

      // Real test and quiz time on this date
      const dayTestSecs = fullTestResults
        .filter((r: any) => r.completed_at?.startsWith(dateStr))
        .reduce((sum: number, r: any) => sum + (r.time_spent_seconds || 0), 0);

      const dayQuizSecs = quizResults
        .filter((r: any) => r.completed_at?.startsWith(dateStr))
        .reduce((sum: number, r: any) => sum + (r.time_spent_seconds || 0), 0);

      const totalDaySecs = dayTestSecs + dayQuizSecs;
      const hours = Number((totalDaySecs / 3600).toFixed(1));

      // Day is done if user has test, quiz, lesson, or is today (logged in), or covered by active streak
      const hasLesson = lessonProgress.some((p: any) => (p.completed_at || p.created_at)?.startsWith(dateStr));
      const daysFromToday = currentDayOfWeek - index;
      const streakCovered = !isFuture && streak > 0 && daysFromToday >= 0 && daysFromToday < streak;
      const isDone = !isFuture && (totalDaySecs > 0 || hasLesson || isToday || streakCovered);

      return {
        label,
        full: fullLabels[index],
        dateNum: dayDate.getDate(),
        dateStr,
        isToday,
        isFuture,
        done: isDone,
        hours,
        totalDaySecs,
      };
    });
  }, [monday, currentDayOfWeek, fullTestResults, quizResults, lessonProgress, streak]);

  const weeklyStudyData = useMemo(() => {
    return weekDays.map((d) => ({
      day: d.label,
      hours: d.hours,
      label: d.full,
      isCurrent: d.isToday,
    }));
  }, [weekDays]);

  const weekTotalSeconds = useMemo(() => {
    return weekDays.reduce((acc, d) => acc + d.totalDaySecs, 0);
  }, [weekDays]);

  const weekTotalHours = Number((weekTotalSeconds / 3600).toFixed(1));
  const weekNumber = Math.min(4, Math.max(1, Math.ceil(now.getDate() / 7)));

  // Today's practice detection
  const hasTestToday = fullTestResults.some((r: any) => r.completed_at?.startsWith(todayStr));
  const hasQuizToday = quizResults.some((r: any) => r.completed_at?.startsWith(todayStr));
  const hasPracticeToday = hasTestToday || hasQuizToday || quests.some((q) => q.id === "quest_practice" && q.current > 0);

  // 3 Daily Quests mapping
  const displayQuests = useMemo(() => {
    return [
      {
        id: "quest_streak",
        title: "Đăng nhập hàng ngày (+10 XP)",
        description: "Đăng nhập vào bàn học và duy trì chuỗi học tập",
        icon: Flame,
        current: 1,
        target: 1,
        xpReward: 10,
        claimed: quests.find((q) => q.id === "quest_streak")?.claimed || false,
      },
      {
        id: "quest_practice",
        title: "Làm 1 bài luyện nghe hoặc đề thi (+20 XP)",
        description: "Hoàn thành 1 bài nghe chép chính tả hoặc đề thi",
        icon: Headphones,
        current: hasPracticeToday ? 1 : (quests.find((q) => q.id === "quest_practice")?.current || 0),
        target: 1,
        xpReward: 20,
        claimed: quests.find((q) => q.id === "quest_practice" || q.id === "quest_dictation")?.claimed || false,
      },
      {
        id: "quest_vocab",
        title: "Học 10 từ vựng TOEIC (+20 XP)",
        description: "Học 10 từ vựng trong kho từ vựng hoặc trò chơi",
        icon: Star,
        current: quests.find((q) => q.id === "quest_vocab")?.current || 0,
        target: 10,
        xpReward: 20,
        claimed: quests.find((q) => q.id === "quest_vocab")?.claimed || false,
      },
    ];
  }, [quests, hasPracticeToday]);

  const completedQuestsCount = useMemo(() => {
    return displayQuests.filter((q) => q.current >= q.target).length;
  }, [displayQuests]);

  const handleOpenChestClick = () => {
    if (chestClaimedToday) {
      toast({
        title: "🎁 Bạn đã mở rương hôm nay rồi!",
        description: "Mỗi ngày chỉ được mở 1 lần. Hãy quay lại vào ngày mai (sau 00:00) nhé!",
      });
      setChestModalOpen(true);
      return;
    }
    setChestModalOpen(true);
  };


  return (
    <StudentLayout>
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* ================= 1. THANH CHÀO MỪNG TRÊN CÙNG (WELCOME HEADER) ================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#070e1c]/90 backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] relative overflow-hidden group">
          <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Bàn Học Cá Nhân • L-English
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Xin chào, {displayName}!</span>
              <img
                src="/assets/hello-ghost.png"
                alt="Chào mừng"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain inline-block transform hover:scale-110 hover:rotate-6 transition-all duration-300 drop-shadow-[0_4px_12px_rgba(255,255,255,0.2)] select-none"
              />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
              Chào mừng bạn trở lại bàn học. Hôm nay bạn có mục tiêu luyện đề và duy trì chuỗi{" "}
              <span className="text-amber-400 font-bold">{streak || 1} ngày Streak</span> nhé!
            </p>
          </div>

          {/* Quick Search & Chest Button */}
          <div className="relative z-10 flex items-center gap-3 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bài học, đề thi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#030712]/80 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
            {chestClaimedToday ? (
              <button
                onClick={handleOpenChestClick}
                className="h-10 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                title="Hôm nay bạn đã mở rương rồi (1 lần/ngày). Nhấn để xem lại."
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Rương Báu (Đã mở)</span>
              </button>
            ) : (
              <button
                onClick={handleOpenChestClick}
                className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-all shrink-0"
                title="Mở Rương Báu Mỗi Ngày (1 lần/ngày)"
              >
                <Gift className="w-4 h-4 animate-bounce" />
                <span className="hidden sm:inline">Rương Báu</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Grid (Center Content: 7 cols, Right Study Desk: 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= CENTER COLUMN (7 COLS) ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* ================= 2. KHỐI "TIẾP TỤC BÀI HỌC" (CONTINUE LEARNING) ================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                  <h2 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight">
                    Tiếp Tục Bài Học{" "}
                  </h2>
                </div>
                <Link
                  to="/my-courses"
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thẻ 1: Khóa học Nghe - Đọc */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.12)] space-y-3 relative group flex flex-col justify-between">
                  <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#030712]/90 text-amber-400 border border-slate-800 uppercase tracking-wide">
                        TOEIC
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                        Khóa Học: {ngheDocCourse?.title || "Luyện thi TOEIC Nghe-Đọc"}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {ngheDocCourse?.description || "Khóa luyện thi TOEIC Nghe-Đọc (Listening & Reading) toàn diện"}
                      </p>
                    </div>

                    {/* Tiến độ bài học */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Tiến độ bài học</span>
                        <span className="text-white font-bold">
                          {courseProgressPercentage}% ({completedCourseLessonsCount}/{totalCourseLessonsCount} bài)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm transition-all duration-500"
                          style={{ width: `${courseProgressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nút bấm nhảy vào bài học của khóa nghe-đọc */}
                  <Link
                    to={`/courses/${ngheDocCourseId}/learn`}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer mt-2"
                  >
                    <span>Học tiếp ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Thẻ 2: Đề thi gần nhất đã làm */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.12)] space-y-3 relative group flex flex-col justify-between">
                  <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#030712]/90 text-cyan-300 border border-slate-800 uppercase tracking-wide">
                        Thi Thử 120p
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {latestFullTest ? "Đề Thi Gần Nhất Đã Làm" : "Đề thi Toeic chuẩn format theo các năm"}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {recentTestTitle}
                      </p>
                    </div>

                    {/* Tiến độ / Đề gần đây */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>đề làm gần đây</span>
                        <span className="text-white font-bold truncate max-w-[170px]">
                          {recentTestTitle} • {recentTestScore}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm"
                          style={{ width: latestFullTest ? "100%" : "35%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nút bấm nhảy vào đề thi gần nhất đã làm */}
                  <Link
                    to={recentTestUrl}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#030712]/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer mt-2"
                  >
                    <span>{latestFullTest ? "Vào làm đề gần nhất" : "Làm đề thi ngay"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Nhiệm Vụ Hôm Nay (Daily Quests) */}
            <div className="p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-3 relative overflow-hidden group">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-cyan-400" />
                  <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Nhiệm Vụ Hôm Nay
                  </h3>
                </div>
                <span className="text-xs text-cyan-300 font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                  {completedQuestsCount}/3 Hoàn thành
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {displayQuests.map((quest) => {
                  const isDone = quest.current >= quest.target;
                  return (
                    <div
                      key={quest.id}
                      className="p-3.5 rounded-xl bg-[#030712]/80 border border-slate-800/80 flex flex-col justify-between gap-2.5 text-xs relative group/q hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-white truncate">{quest.title}</p>
                          <span className="text-[10px] font-bold text-amber-400 shrink-0">+{quest.xpReward} XP</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {quest.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {quest.current}/{quest.target}
                        </span>
                        {quest.claimed ? (
                          <span className="text-[11px] font-semibold text-emerald-400 shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            Đã nhận ✓
                          </span>
                        ) : isDone ? (
                          <button
                            onClick={() => claimQuest(quest.id, quest.xpReward)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                          >
                            Nhận XP
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 shrink-0 px-1.5 py-0.5 rounded-md bg-slate-800/40 border border-slate-700/50">
                            Chưa xong
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Biểu Đồ Thời Gian Học */}
            <div className="p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-3 relative overflow-hidden group">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                    Thời Gian Học Tuần Qua
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tổng: {weekTotalHours > 0 ? weekTotalHours.toFixed(1) : totalStudyHours} giờ học tập
                  </p>
                </div>
                <span className="text-[11px] text-cyan-400 font-semibold">Tuần {weekNumber}/4</span>
              </div>

              <div className="h-36 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStudyData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      domain={[0, 4]}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(6,182,212,0.05)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="px-2.5 py-1.5 rounded-lg bg-[#030712] border border-cyan-500/30 text-xs shadow-xl">
                              <span className="font-bold text-cyan-400">{item.label}: </span>
                              <span className="text-white">{item.hours} giờ</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {weeklyStudyData.map((entry) => (
                        <Cell
                          key={entry.day}
                          fill={entry.isCurrent ? "#06b6d4" : "#1e293b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ================= RIGHT STUDY DESK (5 COLS) ================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* 6.1. Thẻ Học Viên & 3 Hộp Chỉ Số */}
            <div className="p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden group">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/40"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-cyan-500/20">
                      {initials}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base text-white">{displayName}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-cyan-300">
                        {levelInfo.title}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
                  {xp} XP
                </div>
              </div>

              {/* Nút xem chi tiết cấp bậc & mốc XP */}
              <button
                onClick={() => setLevelModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span>Xem chi tiết cấp bậc & mốc XP</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* 3 Hộp Chỉ Số */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                {/* Hộp 1: Ngày Streak */}
                <div className="p-2.5 rounded-xl bg-[#030712]/80 border border-slate-800/80">
                  <div className="w-6 h-6 mx-auto rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400 mb-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="font-extrabold text-sm text-white">{streak || 1}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Ngày Streak</div>
                </div>

                {/* Hộp 2: Mục Tiêu */}
                <div className="p-2.5 rounded-xl bg-[#030712]/80 border border-slate-800/80">
                  <div className="w-6 h-6 mx-auto rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400 mb-1">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    {completedQuestsCount}/3
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Mục Tiêu</div>
                </div>

                {/* Hộp 3: Bảng Vàng */}
                <div
                  onClick={() => setLeaderboardModalOpen(true)}
                  className="p-2.5 rounded-xl bg-[#030712]/80 border border-slate-800/80 hover:border-yellow-500/40 cursor-pointer transition-colors"
                  title="Nhấn để xem bảng vàng thời gian làm bài của học viên"
                >
                  <div className="w-6 h-6 mx-auto rounded-full bg-yellow-500/15 flex items-center justify-center text-yellow-400 mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-extrabold text-sm text-white">
                    #{userRank < 10 ? `0${userRank}` : userRank}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Bảng Vàng</div>
                </div>
              </div>
            </div>

            {/* 6.2. Lịch Chấm Công Tuần (Weekly Streak) */}
            <div className="p-5 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-3 relative overflow-hidden group">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400 fill-current" />
                  Lịch Chấm Công Tuần (Weekly Streak)
                </h4>
                <span className="text-[11px] text-amber-400 font-semibold">Tháng {currentMonth}</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {weekDays.map((d) => {
                  return (
                    <div
                      key={d.label}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-between transition-all ${
                        d.done
                          ? "bg-gradient-to-b from-amber-500/25 to-orange-500/20 border border-amber-500/40 text-amber-300 font-bold"
                          : "bg-[#030712]/80 border border-slate-800 text-slate-500"
                      } ${d.isToday ? "ring-2 ring-cyan-400 shadow-xs" : ""}`}
                    >
                      <span className="text-[10px] uppercase font-bold">{d.label}</span>
                      <div className="my-1">
                        {d.done ? (
                          <Flame className="w-3.5 h-3.5 fill-current text-orange-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" />
                        )}
                      </div>
                      <span className="text-[11px] font-extrabold">{d.dateNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6.3. Tổng Quan Khóa Học */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/my-courses"
                className="p-4 rounded-2xl bg-[#070e1c]/90 hover:bg-[#09152e] backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-1 relative overflow-hidden group transition-all cursor-pointer"
                title="Nhấn để xem chi tiết khóa học"
              >
                <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Khóa đang học</span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-xl font-extrabold text-white">
                  {enrollments.length > 0 ? enrollments.length : 1}
                </div>
                <p className="text-[11px] text-cyan-400 font-medium">Đang duy trì tiến độ</p>
              </Link>

              <div
                onClick={() => setTestHistoryModalOpen(true)}
                className="p-4 rounded-2xl bg-[#070e1c]/90 hover:bg-[#09152e] backdrop-blur-xl border border-cyan-500/20 hover:border-emerald-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-1 relative overflow-hidden group transition-all cursor-pointer"
                title="Nhấn để xem chi tiết bài tập & đề thi đã làm"
              >
                <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Bài tập & Test</span>
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-xl font-extrabold text-white">
                  {fullTestResults.length + quizResults.length}
                </div>
                <p className="text-[11px] text-emerald-400 font-medium flex items-center justify-between">
                  <span>Đã hoàn thành</span>
                  <span className="text-[10px] text-slate-400 underline group-hover:text-emerald-300">Chi tiết →</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mystery Chest Modal (1 open/day) */}
      <MysteryChestModal
        isOpen={chestModalOpen}
        onClose={() => setChestModalOpen(false)}
        onRewardClaimed={() => setChestClaimedToday(true)}
      />

      {/* Level Details Modal */}
      <LevelDetailsModal
        isOpen={levelModalOpen}
        onClose={() => setLevelModalOpen(false)}
        currentXp={xp}
        levelInfo={levelInfo}
      />

      {/* Test & Quiz History Modal */}
      <TestHistoryModal
        isOpen={testHistoryModalOpen}
        onClose={() => setTestHistoryModalOpen(false)}
        fullTests={fullTestResults}
        quizzes={quizResults}
        totalStudyHours={totalStudyHours}
      />

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={leaderboardModalOpen}
        onClose={() => setLeaderboardModalOpen(false)}
        userRank={userRank}
        totalStudyHours={totalStudyHours}
        leaderboardData={studyTimeLeaderboard}
        currentUserId={user?.id}
        currentUserName={displayName}
      />
    </StudentLayout>
  );
};

export default DashboardPage;
