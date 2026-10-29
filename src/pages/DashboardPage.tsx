import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyQuizResults,
  getAllFullTests,
  getStudyTimeLeaderboard,
} from "@/lib/api/assessment";
import { listCourses } from "@/lib/api/catalog";
import { listMyFullTestResults } from "@/lib/api/fullTest";
import { listMyProgressRows } from "@/lib/api/learning";
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
  Compass,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Check,
  Rocket,
  Layers,
  GraduationCap,
  TrendingUp,
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
      const { data, error } = await listCourses({ active: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch lesson progress for "Continue Learning"
  const { data: lessonProgress = [], isLoading: isProgressLoading } = useQuery({
    queryKey: ["dashboard-lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyProgressRows();
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

  // Next lesson identification
  const nextLesson = useMemo(() => {
    if (allCourseLessons.length === 0) return null;
    const uncompleted = allCourseLessons.find(
      (l: any) => !lessonProgress.some((p: any) => p.lesson_id === l.id && p.is_completed)
    );
    return uncompleted || allCourseLessons[0];
  }, [allCourseLessons, lessonProgress]);

  // 5. Quiz results count
  const { data: quizResults = [] } = useQuery({
    queryKey: ["dashboard-quiz-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyQuizResults();
      return data || [];
    },
    enabled: !!user,
  });

  // 6. User full test results (latest test completed)
  const { data: fullTestResults = [], isLoading: isFullTestLoading } = useQuery({
    queryKey: ["dashboard-full-tests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyFullTestResults();
      return data || [];
    },
    enabled: !!user,
  });

  // 7. All full tests
  const { data: allFullTests = [] } = useQuery({
    queryKey: ["dashboard-all-full-tests"],
    queryFn: async () => {
      const { data } = await getAllFullTests();
      return data || [];
    },
  });

  // Check for unfinished active draft test (Zeigarnik Effect)
  const activeDraft = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const prefix = `lenglish_fulltest_draft_v1_${user?.id || "guest"}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (parsed.savedAt && Date.now() - parsed.savedAt < TWENTY_FOUR_HOURS) {
            const answeredCount = parsed.answers ? Object.keys(parsed.answers).length : 0;
            if (answeredCount > 0) {
              const testId = parsed.testId || key.replace(prefix, "");
              return {
                testId: Number(testId),
                answeredCount,
                timeLeft: parsed.timeLeft ?? 120 * 60,
                elapsedTime: parsed.elapsedTime || 0,
                savedAt: parsed.savedAt,
              };
            }
          }
        }
      }
    } catch {}
    return null;
  }, [user?.id]);

  const activeDraftTest = useMemo(() => {
    if (!activeDraft) return null;
    return allFullTests.find((t: any) => t.id === activeDraft.testId) || null;
  }, [activeDraft, allFullTests]);

  // Determine current Part in TOEIC full test from answeredCount
  const draftPartInfo = useMemo(() => {
    if (!activeDraft) return null;
    const count = activeDraft.answeredCount;
    let part = 1;
    let partName = "Part 1 (Mô tả hình ảnh)";
    if (count > 146) {
      part = 7;
      partName = "Part 7 (Đọc hiểu văn bản)";
    } else if (count > 130) {
      part = 6;
      partName = "Part 6 (Điền đoạn văn)";
    } else if (count > 100) {
      part = 5;
      partName = "Part 5 (Điền câu đơn)";
    } else if (count > 70) {
      part = 4;
      partName = "Part 4 (Bài nói ngắn)";
    } else if (count > 31) {
      part = 3;
      partName = "Part 3 (Hội thoại ngắn)";
    } else if (count > 6) {
      part = 2;
      partName = "Part 2 (Hỏi - Đáp)";
    }
    const progressPercent = Math.min(100, Math.round((count / 200) * 100));
    const remainingMinutes = Math.max(1, Math.ceil(activeDraft.timeLeft / 60));
    return {
      part,
      partName,
      progressPercent,
      remainingMinutes,
    };
  }, [activeDraft]);

  const latestFullTest = fullTestResults[0];

  // Target next test for recommended training
  const nextRecommendedTest = useMemo(() => {
    if (latestFullTest?.full_tests) {
      const remainingTests = allFullTests.filter(
        (t: any) => !fullTestResults.some((r: any) => r.test_id === t.id)
      );
      if (remainingTests.length > 0) return remainingTests[0];
      return allFullTests[0];
    }
    return allFullTests[0] || null;
  }, [latestFullTest, allFullTests, fullTestResults]);

  // Is first-time user (No test taken, no draft, no progress)
  const isFirstTimeUser = useMemo(() => {
    return fullTestResults.length === 0 && !activeDraft && completedCourseLessonsCount === 0;
  }, [fullTestResults, activeDraft, completedCourseLessonsCount]);

  // 8. Study time leaderboard (aggregating real test & quiz time of all users)
  const { data: studyTimeLeaderboard = [] } = useQuery({
    queryKey: ["dashboard-study-leaderboard"],
    queryFn: async () => {
      const { data } = await getStudyTimeLeaderboard();
      return data || [];
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

      // Day is done if user has test, quiz, lesson, or is today with practice
      const hasLesson = lessonProgress.some((p: any) => (p.completed_at || p.created_at)?.startsWith(dateStr));
      const daysFromToday = currentDayOfWeek - index;
      const streakCovered = !isFuture && streak > 0 && daysFromToday > 0 && daysFromToday < streak;
      
      // For today: done if user actually completed study/practice today
      const isDone = !isFuture && (totalDaySecs > 0 || hasLesson || streakCovered);

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

  // Today's practice detection for Loss Aversion
  const hasTestToday = fullTestResults.some((r: any) => r.completed_at?.startsWith(todayStr));
  const hasQuizToday = quizResults.some((r: any) => r.completed_at?.startsWith(todayStr));
  const hasPracticeToday = hasTestToday || hasQuizToday || quests.some((q) => (q.id === "quest_practice" || q.id === "quest_dictation") && q.current > 0);

  // 3 Daily Quests mapping
  const displayQuests = useMemo(() => {
    return [
      {
        id: "quest_streak",
        title: "Đăng nhập hàng ngày",
        description: "Mở bàn học và duy trì chuỗi học tập",
        icon: Flame,
        current: 1,
        target: 1,
        xpReward: 10,
        actionUrl: "/dashboard",
        claimed: quests.find((q) => q.id === "quest_streak")?.claimed || false,
      },
      {
        id: "quest_practice",
        title: "Luyện 1 bài nghe hoặc đề thi",
        description: "Hoàn thành 1 bài nghe chép chính tả hoặc đề thi",
        icon: Headphones,
        current: hasPracticeToday ? 1 : (quests.find((q) => q.id === "quest_practice" || q.id === "quest_dictation")?.current || 0),
        target: 1,
        xpReward: 20,
        actionUrl: "/part2-coach",
        claimed: quests.find((q) => q.id === "quest_practice" || q.id === "quest_dictation")?.claimed || false,
      },
      {
        id: "quest_vocab",
        title: "Học 10 từ vựng TOEIC",
        description: "Chiến 1 trận Word Shooter hoặc học từ vựng mới",
        icon: Star,
        current: quests.find((q) => q.id === "quest_vocab")?.current || 0,
        target: 10,
        xpReward: 20,
        actionUrl: "/games/word-shooter",
        claimed: quests.find((q) => q.id === "quest_vocab")?.claimed || false,
      },
    ];
  }, [quests, hasPracticeToday]);

  const completedQuestsCount = useMemo(() => {
    return displayQuests.filter((q) => q.current >= q.target).length;
  }, [displayQuests]);

  const featuredTests = useMemo(() => {
    if (!allFullTests || allFullTests.length === 0) return [];
    return allFullTests.slice(0, 4).map((test: any, idx: number) => {
      const userResult = fullTestResults.find((r: any) => r.test_id === test.id);
      return {
        ...test,
        category: test.category || `ETS Full Test 0${idx + 1}`,
        bestScore: userResult?.total_score ?? null,
        isCompleted: !!userResult,
      };
    });
  }, [allFullTests, fullTestResults]);

  const maxStudyDay = useMemo(() => {
    if (weeklyStudyData.length === 0) return null;
    const sorted = [...weeklyStudyData].sort((a, b) => b.hours - a.hours);
    return sorted[0] && sorted[0].hours > 0 ? sorted[0] : null;
  }, [weeklyStudyData]);

  const avgStudyHours = (weekTotalHours / 7).toFixed(1);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/fulltests?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  return (
    <StudentLayout>
      <div className="w-full max-w-[1720px] mx-auto space-y-8 select-none font-sans">
        {/* ================= 1. HEADER METRIC BAR (THANH TRẠNG THÁI TINH GỌN & HERO WELCOME) ================= */}
        <div className="bg-[#070e1c]/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-cyan-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.08)] relative overflow-hidden group">
          <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Greeting + Cockpit Identity */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Phòng Điều Khiển Trung Tâm • L-English Cockpit
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white tracking-tight flex items-center gap-3">
                <span>Xin chào, {displayName}!</span>
                <img
                  src="/assets/hello-ghost.png"
                  alt="Chào mừng"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain inline-block transform hover:scale-110 hover:rotate-6 transition-all duration-300 drop-shadow-[0_4px_12px_rgba(255,255,255,0.2)] select-none"
                />
              </h1>
              <p className="text-sm sm:text-base text-slate-300 font-medium max-w-2xl leading-relaxed">
                Chào mừng bạn trở lại bàn học. Hôm nay hãy hoàn thành nhiệm vụ để duy trì chuỗi{" "}
                <span className="text-amber-400 font-bold">{streak || 1} ngày Streak</span> nhé!
              </p>
            </div>

            {/* Quick Search & Chest Action Button */}
            <div className="flex items-center gap-3 shrink-0">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm bài học, đề thi ETS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-2xl bg-[#030712]/90 border border-slate-700/80 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                />
              </form>

              {chestClaimedToday ? (
                <button
                  onClick={handleOpenChestClick}
                  className="h-11 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer active:scale-95 transition-all shrink-0"
                  title="Hôm nay bạn đã mở rương rồi (1 lần/ngày). Nhấn để xem lại."
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Rương Báu (Đã mở)</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenChestClick}
                  className="h-11 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all shrink-0"
                  title="Mở Rương Báu Mỗi Ngày (1 lần/ngày)"
                >
                  <Gift className="w-4 h-4 animate-bounce" />
                  <span className="hidden sm:inline">Rương Báu Hôm Nay</span>
                </button>
              )}
            </div>
          </div>

          {/* DẢI METRIC PILLS TINH GỌN (Header Metric Bar: Streak, XP, Level, Rank) */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {/* Pill 1: Streak ngọn lửa với subtle pulse */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold text-xs sm:text-sm shrink-0 shadow-sm">
              <Flame className="w-4 h-4 text-orange-400 fill-current animate-pulse" />
              <span>{streak || 1} ngày streak</span>
            </div>

            {/* Pill 2: XP Tích lũy */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm shrink-0 shadow-sm">
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              <span>{xp.toLocaleString()} XP</span>
            </div>

            {/* Pill 3: Level & Cấp bậc */}
            <button
              onClick={() => setLevelModalOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs sm:text-sm shrink-0 transition-all cursor-pointer shadow-sm group/lvl"
            >
              <Crown className="w-4 h-4 text-cyan-400" />
              <span>{levelInfo.title}</span>
              <span className="text-xs text-slate-300 font-medium">
                (còn {levelInfo.xpToNextLevel} XP lên hạng)
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400/70 group-hover/lvl:translate-x-0.5 transition-transform" />
            </button>

            {/* Pill 4: Bảng vàng xếp hạng */}
            <button
              onClick={() => setLeaderboardModalOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-bold text-xs sm:text-sm shrink-0 transition-all cursor-pointer shadow-sm group/rank"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Hạng #{userRank < 10 ? `0${userRank}` : userRank}</span>
              <ChevronRight className="w-3.5 h-3.5 text-yellow-400/70 group-hover/rank:translate-x-0.5 transition-transform" />
            </button>

            {/* Pill 5: Lịch sử bài làm */}
            <button
              onClick={() => setTestHistoryModalOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm shrink-0 transition-all cursor-pointer shadow-sm"
            >
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>{fullTestResults.length + quizResults.length} bài đã thi</span>
            </button>
          </div>
        </div>

        {/* ================= 2-COLUMN GRID (MAIN HUB 60-65% : COCKPIT RIGHT 35-40%) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          {/* ================= KHỐI CHÍNH (CỘT TRÁI - 7/12 HOẶC 8/12) ================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6 xl:space-y-8">
            {/* ================= 2. HERO ACTION CARD (ĐIỂM NEO HÀNH ĐỘNG DUY NHẤT & ZEIGARNIK EFFECT) ================= */}
            {isFullTestLoading || isCoursesLoading ? (
              <div className="p-6 rounded-2xl bg-[#070e1c]/90 border border-cyan-500/20 space-y-4">
                <Skeleton className="h-6 w-48 bg-slate-800" />
                <Skeleton className="h-10 w-full bg-slate-800/80" />
                <Skeleton className="h-4 w-3/4 bg-slate-800/60" />
                <Skeleton className="h-12 w-full bg-blue-900/40 rounded-xl" />
              </div>
            ) : isFirstTimeUser ? (
              /* ================= TRƯỜNG HỢP 1: TÂN HỌC VIÊN (EMPTY STATE / ACTIVATION LAUNCHPAD) ================= */
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#070e1c] via-[#09152e] to-[#041126] border-2 border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                <div className="absolute inset-x-8 -top-px h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs sm:text-sm font-bold">
                      <Compass className="w-4 h-4 text-cyan-300 animate-spin" style={{ animationDuration: "12s" }} />
                      Bệ Phóng Nhập Môn • Activation Launchpad
                    </span>
                    <span className="text-xs sm:text-sm text-amber-300 font-extrabold bg-amber-500/15 px-3 py-1 rounded-xl border border-amber-500/40">
                      ⚡ Miễn phí 100%
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      Góc học tập của bạn đã sẵn sàng! 🚀
                    </h2>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed mt-2 font-normal">
                      Hãy làm bài <strong>Test chẩn đoán trình độ 15 phút</strong> để hệ thống xác định chính xác điểm mạnh/yếu theo từng Part và gợi ý lộ trình TOEIC chuẩn nhất cho bạn.
                    </p>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-[#030712]/80 border border-slate-800 text-xs sm:text-sm text-slate-200 font-medium flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>15 phút tinh gọn</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#030712]/80 border border-slate-800 text-xs sm:text-sm text-slate-200 font-medium flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Đo lường band điểm</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#030712]/80 border border-slate-800 text-xs sm:text-sm text-slate-200 font-medium flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Lộ trình cá nhân hóa</span>
                    </div>
                  </div>

                  {/* PRIMARY HERO CTA BUTTON (#2563EB) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Link
                      to={allFullTests[0] ? `/fulltests/${allFullTests[0].id}` : "/fulltests"}
                      className="flex-1 py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.6)] active:scale-[0.98] transition-all cursor-pointer text-center"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Làm Bài Kiểm Tra Đầu Vào (15 Phút)</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/fulltests"
                      className="py-3.5 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>Xem kho đề</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : activeDraft ? (
              /* ================= TRƯỜNG HỢP 2: CÓ ĐỀ ĐANG LÀM DỞ (HIỆU ỨNG ZEIGARNIK ĐỈNH CAO) ================= */
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#070e1c] via-[#09152e] to-[#041126] border-2 border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                <div className="absolute inset-x-8 -top-px h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold animate-pulse">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Đang làm dở • Tự động lưu
                    </span>
                    <span className="text-xs sm:text-sm text-slate-300 font-medium">
                      ⏱ Còn lại: <strong className="text-cyan-300 font-bold">{draftPartInfo?.remainingMinutes} phút</strong>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      {activeDraftTest?.title || "ETS TOEIC 2024 - Đề thi thử"}
                    </h2>
                    <p className="text-sm sm:text-base text-cyan-200 font-medium mt-1.5 flex items-center gap-2">
                      <span>{draftPartInfo?.partName}</span>
                      <span>•</span>
                      <span>Đã làm: {activeDraft.answeredCount}/200 câu</span>
                    </p>
                  </div>

                  {/* Thanh tiến độ trực quan hóa Zeigarnik */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-slate-300">Tiến độ bài thi</span>
                      <span className="text-cyan-300 font-extrabold">{draftPartInfo?.progressPercent}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#030712] border border-slate-800 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)] transition-all duration-700"
                        style={{ width: `${draftPartInfo?.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* PRIMARY HERO CTA BUTTON (#2563EB) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Link
                      to={
                        activeDraftTest?.course_id
                          ? `/courses/${activeDraftTest.course_id}/fulltest/${activeDraft.testId}`
                          : `/fulltests/${activeDraft.testId}`
                      }
                      className="flex-1 py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.6)] active:scale-[0.98] transition-all cursor-pointer text-center"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Tiếp tục làm tiếp câu {activeDraft.answeredCount + 1}/200</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => setTestHistoryModalOpen(true)}
                      className="py-3.5 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                    >
                      <span>Lịch sử đề</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= TRƯỜNG HỢP 3: ĐÃ CÓ ĐỀ HOÀN THÀNH GẦN NHẤT & GỢI Ý ĐỀ TIẾP THEO ================= */
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#070e1c] via-[#09152e] to-[#041126] border-2 border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group">
                <div className="absolute inset-x-8 -top-px h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Vừa hoàn thành gần nhất
                    </span>
                    <span className="text-xs sm:text-sm text-amber-300 font-extrabold bg-amber-500/15 px-3 py-1 rounded-xl border border-amber-500/40">
                      Điểm đạt: {latestFullTest?.total_score || 0}/990 điểm
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight leading-snug">
                      Đề tiếp theo: {nextRecommendedTest?.title || "Full Test ETS TOEIC Mới"}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed mt-2 font-normal">
                      Kết quả đề gần nhất: <strong>{latestFullTest?.full_tests?.title || "ETS Test"}</strong> (Nghe: {latestFullTest?.listening_score || 0} • Đọc: {latestFullTest?.reading_score || 0}). Hãy làm tiếp đề mới để nâng điểm số mục tiêu!
                    </p>
                  </div>

                  {/* PRIMARY HERO CTA BUTTON (#2563EB) */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <Link
                      to={
                        nextRecommendedTest?.course_id
                          ? `/courses/${nextRecommendedTest.course_id}/fulltest/${nextRecommendedTest.id}`
                          : `/fulltests/${nextRecommendedTest?.id || 1}`
                      }
                      className="flex-1 py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.6)] active:scale-[0.98] transition-all cursor-pointer text-center"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Vào Luyện Đề Tiếp Theo Ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => setTestHistoryModalOpen(true)}
                      className="py-3.5 px-5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                    >
                      <span>Xem lại kết quả</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= 3. LỘ TRÌNH KHÓA HỌC ĐANG HỌC (SECONDARY ACTION CARD) ================= */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-500/40 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden group transition-all">
              <div className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors">
                      Lộ Trình Khóa Học: {ngheDocCourse?.title || "Luyện thi TOEIC Nghe-Đọc"}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                      {nextLesson ? `Bài tiếp theo: ${nextLesson.title}` : "Tiếp tục bài học trong lộ trình"}
                    </p>
                  </div>
                </div>

                <Link
                  to="/my-courses"
                  className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 shrink-0 transition-colors"
                >
                  Xem tất cả <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Tiến độ khóa học */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-300 font-medium">Tiến độ bài học</span>
                  <span className="text-white font-extrabold">
                    {courseProgressPercentage}% ({completedCourseLessonsCount}/{totalCourseLessonsCount || 48} bài)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#030712] border border-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                    style={{ width: `${courseProgressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-1 flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-slate-300 font-medium">
                  {completedCourseLessonsCount === 0 ? "Bắt đầu bài đầu tiên hôm nay" : "Đang duy trì tiến độ học đều đặn"}
                </span>
                <Link
                  to={`/courses/${ngheDocCourseId}/learn`}
                  className="py-2.5 px-4.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Học Bài Kế Tiếp</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* ================= 4. BIỂU ĐỒ THỜI GIAN HỌC TUẦN QUA ================= */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden group">
              <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Biểu Đồ Thời Gian Học Tập Tuần Này
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">
                    Ghi nhận tự động từ các bài thi Full Test và Quiz luyện tập của bạn.
                  </p>
                </div>
                <span className="text-xs sm:text-sm text-cyan-300 font-bold px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 self-start sm:self-auto">
                  Tuần {weekNumber}/4 • Tháng {currentMonth}
                </span>
              </div>

              {/* Stats Summary Pills Row */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#030712]/80 border border-slate-800 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">Tổng thời gian</span>
                  <span className="text-base sm:text-lg font-black text-cyan-400">
                    {weekTotalHours > 0 ? weekTotalHours.toFixed(1) : totalStudyHours}h
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#030712]/80 border border-slate-800 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">Trung bình ngày</span>
                  <span className="text-base sm:text-lg font-black text-amber-400">{avgStudyHours}h/ngày</span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#030712]/80 border border-slate-800 text-center">
                  <span className="text-xs font-bold text-slate-300 block mb-1">Tập trung nhất</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 truncate block">
                    {maxStudyDay ? `${maxStudyDay.label} (${maxStudyDay.hours}h)` : "Đang tính..."}
                  </span>
                </div>
              </div>

              {/* Chart container doubled in height */}
              <div className="h-56 sm:h-64 w-full pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyStudyData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#cbd5e1", fontSize: 13, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      domain={[0, 4]}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(6,182,212,0.08)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="px-3.5 py-2 rounded-xl bg-[#030712] border border-cyan-500/40 text-xs sm:text-sm shadow-2xl">
                              <span className="font-bold text-cyan-400">{item.label}: </span>
                              <span className="text-white font-extrabold">{item.hours} giờ học</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
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

          {/* ================= CỘT PHẢI (COCKPIT ĐỘNG LỰC & RETENTION) ================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 xl:space-y-8">
            {/* ================= 5. NHIỆM VỤ HÔM NAY (DAILY QUESTS VỚI KỸ THUẬT JUICE) ================= */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden group">
              <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-6 rounded-full bg-cyan-400" />
                  <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    Nhiệm Vụ Hôm Nay
                  </h3>
                </div>
                <span className="text-xs sm:text-sm text-cyan-300 font-bold px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40">
                  {completedQuestsCount}/3 Hoàn thành
                </span>
              </div>

              {/* Thanh tiến độ ngày tổng quát: Kích hoạt hiệu ứng Juice */}
              <div className="p-3.5 rounded-2xl bg-[#030712]/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-200 font-medium">
                    {completedQuestsCount === 3
                      ? "🎉 Hoàn thành xuất sắc toàn bộ nhiệm vụ ngày!"
                      : `Hoàn thành ${completedQuestsCount}/3 nhiệm vụ — Mở khóa hộp quà +50 XP!`}
                  </span>
                  <span className="text-amber-400 font-black">+{completedQuestsCount * 20} XP</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-500"
                    style={{ width: `${(completedQuestsCount / 3) * 100}%` }}
                  />
                </div>
              </div>

              {/* Danh sách nhiệm vụ với Tactile Micro-feedback */}
              <div className="space-y-3">
                {displayQuests.map((quest) => {
                  const isDone = quest.current >= quest.target;
                  return (
                    <div
                      key={quest.id}
                      className="p-4 sm:p-4.5 rounded-2xl bg-[#030712]/90 border border-slate-800/90 hover:border-cyan-500/40 flex items-center justify-between gap-3 text-xs sm:text-sm transition-all group/item"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox with tactile juice feedback */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                            isDone
                              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 scale-105"
                              : "bg-slate-800/80 border border-slate-700 text-slate-500"
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white truncate text-sm sm:text-base">{quest.title}</p>
                            <span className="text-xs sm:text-sm font-black text-amber-400 shrink-0">
                              +{quest.xpReward} XP
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-300 truncate mt-1 font-medium">
                            {quest.description}
                          </p>
                        </div>
                      </div>

                      {/* Action status */}
                      <div className="shrink-0">
                        {quest.claimed ? (
                          <span className="text-xs sm:text-sm font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            Đã nhận ✓
                          </span>
                        ) : isDone ? (
                          <button
                            onClick={() => claimQuest(quest.id, quest.xpReward)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer animate-bounce"
                          >
                            Nhận XP
                          </button>
                        ) : (
                          <Link
                            to={quest.actionUrl}
                            className="text-xs sm:text-sm font-bold text-cyan-400 hover:text-cyan-300 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 transition-colors inline-block"
                          >
                            Làm ngay →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ================= 6. LỊCH CHẤM CÔNG TUẦN (WEEKLY STREAK & LOSS AVERSION) ================= */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-4 relative overflow-hidden group">
              <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
              
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wide text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400 fill-current animate-pulse" />
                  Lịch Chấm Công Tuần (Weekly Streak)
                </h4>
                <span className="text-xs sm:text-sm text-amber-300 font-bold">Tháng {currentMonth}</span>
              </div>

              {/* Dải 7 ngày tròn (T2 -> CN) tối thiểu 44x44px */}
              <div className="grid grid-cols-7 gap-2 text-center">
                {weekDays.map((d) => {
                  const isTodayUnfinished = d.isToday && !hasPracticeToday;
                  return (
                    <div
                      key={d.label}
                      className={`min-h-[68px] py-3 px-1 rounded-2xl flex flex-col items-center justify-between transition-all ${
                        d.done
                          ? "bg-gradient-to-b from-amber-500/25 to-orange-500/20 border border-amber-500/40 text-amber-300 font-bold"
                          : isTodayUnfinished
                          ? "border-2 border-dashed border-orange-500/90 bg-orange-500/15 text-orange-300 animate-pulse font-extrabold"
                          : "bg-[#030712]/80 border border-slate-800 text-slate-500"
                      }`}
                    >
                      <span className="text-xs uppercase font-bold">{d.label}</span>
                      <div className="my-0.5">
                        {d.done ? (
                          <Flame className="w-4 h-4 fill-current text-orange-400" />
                        ) : isTodayUnfinished ? (
                          <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-black">{d.dateNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* THÔNG ĐIỆP TÂM LÝ HỌC: HIỆU ỨNG MẤT MÁT (LOSS AVERSION BANNER) */}
              {!hasPracticeToday ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 text-xs sm:text-sm text-orange-200 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
                  <p className="leading-snug">
                    <strong>Học ngay hôm nay</strong> để không bị gãy chuỗi{" "}
                    <span className="text-amber-300 font-bold">{streak || 1} ngày Streak</span>!
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="leading-snug">
                    Tuyệt vời! Bạn đã bảo vệ thành công chuỗi <strong>{streak || 1} ngày Streak</strong> hôm nay.
                  </p>
                </div>
              )}
            </div>

            {/* ================= 7. PHÍM TẮT TRUNG TÂM (QUICK SHORTCUTS: BẢNG VÀNG & TEST HISTORY) ================= */}
            <div className="grid grid-cols-2 gap-3">
              {/* Thẻ 1: Bảng vàng thành tích */}
              <div
                onClick={() => setLeaderboardModalOpen(true)}
                className="p-4 sm:p-5 rounded-2xl bg-[#070e1c]/90 hover:bg-[#09152e] backdrop-blur-xl border border-cyan-500/20 hover:border-yellow-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-1.5 relative overflow-hidden group transition-all cursor-pointer"
                title="Nhấn để xem bảng vàng học viên"
              >
                <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-300">
                  <span>Bảng vàng</span>
                  <Trophy className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-black text-white">
                  #{userRank < 10 ? `0${userRank}` : userRank}
                </div>
                <p className="text-xs sm:text-sm text-yellow-300 font-bold">Bấm xem xếp hạng →</p>
              </div>

              {/* Thẻ 2: Lịch sử bài tập & đề thi */}
              <div
                onClick={() => setTestHistoryModalOpen(true)}
                className="p-4 sm:p-5 rounded-2xl bg-[#070e1c]/90 hover:bg-[#09152e] backdrop-blur-xl border border-cyan-500/20 hover:border-emerald-500/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] space-y-1.5 relative overflow-hidden group transition-all cursor-pointer"
                title="Nhấn để xem chi tiết bài tập & đề thi đã làm"
              >
                <div className="absolute inset-x-4 -top-px h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-300">
                  <span>Bài tập & Test</span>
                  <FileCheck2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-2xl font-black text-white">
                  {fullTestResults.length + quizResults.length}
                </div>
                <p className="text-xs sm:text-sm text-emerald-300 font-bold">Xem lịch sử làm →</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 8. HỆ THỐNG TRỢ LÝ LUYỆN TẬP CẤP TỐC (4 CORE ACCELERATORS) ================= */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Hệ Thống Trợ Lý Luyện Thi Chuyên Sâu
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2.5 font-display">
                Trung Tâm Luyện Tập &amp; Bứt Phá Điểm Số
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Nghe Chép Chính Tả */}
            <div 
              onClick={() => navigate('/listening')}
              className="p-6 rounded-3xl bg-[#070e1c]/90 hover:bg-[#09152e] border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-md">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Bắt Âm Chuẩn
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                    Nghe Chép Chính Tả
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 line-clamp-2">
                    Luyện tai bắt âm nối, nuốt âm và chuẩn hóa chính tả từng câu TOEIC.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-cyan-400">
                <span>Bắt đầu nghe</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: Coach Luyện Nghe Part 2 */}
            <div 
              onClick={() => navigate('/part2-coach')}
              className="p-6 rounded-3xl bg-[#070e1c]/90 hover:bg-[#09152e] border border-amber-500/20 hover:border-amber-400/50 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shadow-md">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Phương Pháp 3 Bước
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    Coach Luyện Nghe Part 2
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 line-clamp-2">
                    Bẻ khóa bẫy gián tiếp, từ đồng âm và phản xạ hỏi - đáp không cần dịch nhẩm.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-amber-400">
                <span>Vào luyện ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Đấu Trường Game Từ Vựng */}
            <div 
              onClick={() => navigate('/games')}
              className="p-6 rounded-3xl bg-[#070e1c]/90 hover:bg-[#09152e] border border-fuchsia-500/20 hover:border-fuchsia-400/50 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition-transform shadow-md">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                    Học Qua Game
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-fuchsia-300 transition-colors">
                    Đấu Trường Từ Vựng
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 line-clamp-2">
                    Word Defense & Phi Cơ Diệt Từ Vựng - phản xạ 600 từ TOEIC cực cuốn.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-fuchsia-400">
                <span>Khám phá game</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4: Kho Đề Thi Full Test ETS */}
            <div 
              onClick={() => navigate('/fulltests')}
              className="p-6 rounded-3xl bg-[#070e1c]/90 hover:bg-[#09152e] border border-emerald-500/20 hover:border-emerald-400/50 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-md">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    ETS 2024 Chuẩn
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    Kho Đề Full Test ETS
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed mt-1.5 line-clamp-2">
                    200 câu thi thật, bấm giờ 120 phút, giải thích chi tiết & bảng điểm TOEIC tự động.
                  </p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-400">
                <span>Xem kho đề thi</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= 9. BỘ ĐỀ THI THỬ ETS TIÊU BIỂU DÀNH CHO BẠN ================= */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#070e1c]/90 backdrop-blur-xl border border-cyan-500/25 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
                Đề Thi Thử ETS Đề Xuất
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                Đề Thi Thử TOEIC Tiêu Biểu Dành Cho Bạn
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">
                Luyện đề có áp lực thời gian thực chiến để làm quen format đề thi thật trước khi vào phòng thi.
              </p>
            </div>

            <Link
              to="/fulltests"
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-cyan-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 self-start sm:self-auto transition-all cursor-pointer shrink-0"
            >
              <span>Xem tất cả ({allFullTests.length} đề thi)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4.5">
            {featuredTests.map((test: any, idx: number) => (
              <div
                key={test.id}
                className="p-5 rounded-2xl bg-[#030712]/80 border border-slate-800 hover:border-cyan-500/40 flex flex-col justify-between space-y-4 transition-all duration-200 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {test.category || `Đề thi 0${idx + 1}`}
                    </span>
                    {test.isCompleted ? (
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {test.bestScore}/990 điểm
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Chưa thi</span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {test.title}
                  </h4>

                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      120 phút
                    </span>
                    <span>•</span>
                    <span>200 câu hỏi</span>
                  </div>
                </div>

                <Link
                  to={`/fulltests/${test.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500 hover:to-blue-600 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 text-center"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{test.isCompleted ? "Làm Lại Đề" : "Vào Thi Thử"}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 10. BANNER ĐẤU TRƯỜNG TRÒ CHƠI HỌC TỪ VỰNG ================= */}
        <div className="relative overflow-hidden rounded-3xl border border-fuchsia-500/30 p-6 sm:p-8 md:p-10 shadow-2xl bg-gradient-to-r from-purple-950/80 via-slate-950 to-blue-950/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-3 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-xs sm:text-sm font-bold">
              <Gamepad2 className="w-4 h-4 text-fuchsia-400 animate-pulse" />
              Đấu Trường Game Học Từ Vựng TOEIC
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-display">
              Vừa Chiến Game Đỉnh Cao, Vừa Ghi Nhớ Từ Vựng Phản Xạ!
            </h3>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
              Bảo vệ khu vườn trong <strong>Word Defense</strong> hoặc điều khiển chiến cơ bắn từ rơi tự do trong <strong>Sky Strike Vocab</strong>. Tích hợp audio phát âm chuẩn bản xứ, leo rank và nhận rương quà hàng ngày.
            </p>
          </div>

          <button
            onClick={() => navigate('/games')}
            className="relative z-10 py-4 px-8 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:from-cyan-300 hover:to-teal-200 shadow-[0_0_25px_rgba(6,182,212,0.45)] inline-flex items-center gap-2 shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Rocket className="w-4 h-4" />
            <span>Vào Đấu Trường Game Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
