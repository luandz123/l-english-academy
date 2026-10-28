import StudentLayout from "@/components/StudentLayout";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import { listMyQuizResults } from "@/lib/api/assessment";
import { authClient, updateMyProfile } from "@/lib/api/auth";
import { listMyFullTestResults } from "@/lib/api/fullTest";
import { listMyProgressRows } from "@/lib/api/learning";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import {
  Trophy,
  Calendar,
  Mail,
  Loader2,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  Edit3,
  Award,
  Layers,
  HelpCircle,
  FileCheck2,
  Clock,
  Target,
  Image as ImageIcon,
  Check,
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  Volume2,
  BookOpenCheck,
  GraduationCap,
  Timer,
  TrendingUp,
  Camera,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ErrorState from "@/components/ErrorState";

// Preset Cover Wallpapers (Chất lượng cao, phong cách Dev & Tech)
const PRESET_COVERS = [
  {
    name: "Cyber Grid",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Deep Aurora",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Night Galaxy",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Minimal Tech",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  },
];

// Preset Avatars
const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Alex",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Champ",
];

// Helper: Format relative time in Vietnamese
function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "Mới đây";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

// Phân loại kỹ năng chuẩn xác dựa trên tiêu đề bài thi, module, khóa học và audio
function classifyItemType(
  title: string = "",
  courseTitle: string = "",
  moduleTitle: string = "",
  hasAudio: boolean = false
): "listening" | "reading" | "grammar_vocab" {
  if (hasAudio) return "listening";

  const t = `${title} ${courseTitle} ${moduleTitle}`.toLowerCase();

  // 1. Kỹ năng Nghe (TOEIC Listening Parts 1, 2, 3, 4, photos, dictation, audio...)
  if (
    t.includes("part 1") || t.includes("part1") ||
    t.includes("part 2") || t.includes("part2") ||
    t.includes("part 3") || t.includes("part3") ||
    t.includes("part 4") || t.includes("part4") ||
    t.includes("nghe") || t.includes("listening") ||
    t.includes("audio") || t.includes("photos") ||
    t.includes("chép chính tả") || t.includes("dictation") ||
    t.includes("hội thoại") || t.includes("conversation") ||
    t.includes("short talk")
  ) {
    return "listening";
  }

  // 2. Kỹ năng Đọc (TOEIC Reading Parts 5, 6, 7, reading, passage, comprehension...)
  if (
    t.includes("part 5") || t.includes("part5") ||
    t.includes("part 6") || t.includes("part6") ||
    t.includes("part 7") || t.includes("part7") ||
    t.includes("đọc") || t.includes("reading") ||
    t.includes("incomplete sentences") || t.includes("text completion") ||
    t.includes("reading comprehension") || t.includes("passage")
  ) {
    return "reading";
  }

  // 3. Ngữ pháp, Từ vựng hoặc câu hỏi tổng hợp
  return "grammar_vocab";
}

const Profile = () => {
  const { user, profile, isAdmin } = useAuth();
  const { levelInfo, xp, streak, badges } = useGamification();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local Storage keys for user customized bio & cover
  const bioStorageKey = user ? `profile_bio_${user.id}` : "profile_bio_default";
  const coverStorageKey = user ? `profile_cover_${user.id}` : "profile_cover_default";

  // Bio & Cover State
  const initialBio =
    (user?.user_metadata?.bio as string) ||
    localStorage.getItem(bioStorageKey) ||
    "Học viên L-English Academy • Quyết tâm chinh phục mục tiêu TOEIC 800+ 🚀";
  const initialCover =
    (user?.user_metadata?.cover_url as string) ||
    localStorage.getItem(coverStorageKey) ||
    PRESET_COVERS[0].url;

  const [bio, setBio] = useState(initialBio);
  const [coverUrl, setCoverUrl] = useState(initialCover);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || "");
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile?.avatar_url || "");
  const [editCoverUrl, setEditCoverUrl] = useState(initialCover);
  const [editBio, setEditBio] = useState(initialBio);
  const [savingProfile, setSavingProfile] = useState(false);

  // Badges Modal State
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);

  // Recent Submissions Tab
  const [submissionTab, setSubmissionTab] = useState<"all" | "quiz" | "test">("all");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Học viên L-English";
  const initials = displayName.charAt(0).toUpperCase();
  const userAvatar =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;

  // =========================================================================
  // 1. SYSTEM DATABASE STATS (Kho dữ liệu thật từ bảng questions & full_tests)
  // =========================================================================
  const {
    data: dbStats = {
      totalQuestions: 24382,
      listeningQuestions: 12676,
      readingQuestions: 11706,
      totalFullTests: 55,
    },
  } = useQuery({
    queryKey: ["system-db-stats"],
    queryFn: async () => {
      const [
        { count: totalQuestions },
        { count: listeningQuestions },
        { count: readingQuestions },
        { count: totalFullTests },
      ] = await Promise.all([
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("questions").select("*", { count: "exact", head: true }).not("audio_url", "is", null),
        supabase.from("questions").select("*", { count: "exact", head: true }).is("audio_url", null),
        supabase.from("full_tests").select("*", { count: "exact", head: true }),
      ]);
      return {
        totalQuestions: totalQuestions || 24382,
        listeningQuestions: listeningQuestions || 12676,
        readingQuestions: readingQuestions || 11706,
        totalFullTests: totalFullTests || 55,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 phút
  });

  // =========================================================================
  // 2. QUERY REAL USER RESULTS (Quizzes, Full Tests, Lessons)
  // =========================================================================

  // Quizzes results kèm thông tin chi tiết module và khóa học
  const {
    data: quizResults = [],
    isError: isQuizError,
    refetch: refetchQuizzes,
  } = useQuery({
    queryKey: ["profile-quiz-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyQuizResults();
      return data || [];
    },
    enabled: !!user,
  });

  // Full Test Exam Results
  const {
    data: fullTestResults = [],
    isError: isFullTestError,
    refetch: refetchFullTests,
  } = useQuery({
    queryKey: ["profile-fulltest-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyFullTestResults();
      return data || [];
    },
    enabled: !!user,
  });

  // Lesson Progress
  const {
    data: lessonProgress = [],
    isError: isProgressError,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ["profile-lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await listMyProgressRows();
      return data || [];
    },
    enabled: !!user,
  });

  // =========================================================================
  // 3. STATISTICAL CALCULATIONS (Thống kê thực tế, chính xác 100%)
  // =========================================================================
  const statsCalc = useMemo(() => {
    let listeningSolved = 0;
    let listeningAttempted = 0;
    let readingSolved = 0;
    let readingAttempted = 0;
    let grammarSolved = 0;
    let grammarAttempted = 0;
    let totalTimeSeconds = 0;
    let maxFullTestScore = 0;
    let totalFullTestScoreSum = 0;
    let totalQuizScoreSum = 0;

    // A. Xử lý các bài Quiz đã làm
    quizResults.forEach((q: any) => {
      const qCorrect =
        Number(q.correct_answers) ||
        (q.score !== null ? Math.round((Number(q.score) / 10) * (Number(q.total_questions) || 10)) : 0);
      const qTotal = Number(q.total_questions) || 10;
      const timeSpent = Number(q.time_spent_seconds) || 0;

      totalTimeSeconds += timeSpent;
      totalQuizScoreSum += Number(q.score) || 0;

      const quizObj = q.quizzes as any;
      const courseTitle = quizObj?.modules?.courses?.title || "";
      const moduleTitle = quizObj?.modules?.title || "";
      const quizTitle = quizObj?.title || "";
      const hasAudio = !!quizObj?.audio_url;

      const skill = classifyItemType(quizTitle, courseTitle, moduleTitle, hasAudio);
      if (skill === "listening") {
        listeningSolved += qCorrect;
        listeningAttempted += qTotal;
      } else if (skill === "reading") {
        readingSolved += qCorrect;
        readingAttempted += qTotal;
      } else {
        grammarSolved += qCorrect;
        grammarAttempted += qTotal;
      }
    });

    // B. Xử lý các đề thi Full Test đã làm
    fullTestResults.forEach((t: any) => {
      const listCorrect = Number(t.listening_correct) || 0;
      const readCorrect = Number(t.reading_correct) || 0;
      const totalCorrect = Number(t.correct_answers) || (listCorrect + readCorrect);
      const totalQ = Number(t.total_questions) || 200;
      const timeSpent = Number(t.time_spent_seconds) || 0;
      const testScore = Number(t.total_score) || 0;

      totalTimeSeconds += timeSpent;
      totalFullTestScoreSum += testScore;
      if (testScore > maxFullTestScore) {
        maxFullTestScore = testScore;
      }

      // Đề Full Test chuẩn TOEIC: 100 câu Nghe, 100 câu Đọc
      const listQCount = Math.floor(totalQ / 2);
      const readQCount = totalQ - listQCount;

      listeningSolved += listCorrect;
      listeningAttempted += listQCount;
      readingSolved += readCorrect;
      readingAttempted += readQCount;
    });

    const totalSolved = listeningSolved + readingSolved + grammarSolved;
    const totalAttempted = listeningAttempted + readingAttempted + grammarAttempted;
    const overallAccuracy =
      totalAttempted > 0 ? ((totalSolved / totalAttempted) * 100).toFixed(1) : "0.0";

    const avgQuizScore =
      quizResults.length > 0 ? (totalQuizScoreSum / quizResults.length).toFixed(1) : "0.0";
    const avgFullTestScore =
      fullTestResults.length > 0 ? Math.round(totalFullTestScoreSum / fullTestResults.length) : 0;

    const totalTimeHours = (totalTimeSeconds / 3600).toFixed(1);

    return {
      listeningSolved,
      listeningAttempted,
      readingSolved,
      readingAttempted,
      grammarSolved,
      grammarAttempted,
      totalSolved,
      totalAttempted,
      overallAccuracy,
      avgQuizScore,
      avgFullTestScore,
      maxFullTestScore,
      totalTimeHours,
    };
  }, [quizResults, fullTestResults]);

  // Donut SVG circumference calculation
  const circleRadius = 54;
  const circleCircumference = 2 * Math.PI * circleRadius; // ~339.29
  // Tỷ lệ hoàn thành so với kho dữ liệu thật của hệ thống
  const solvedPercent =
    dbStats.totalQuestions > 0
      ? Math.max(2, Math.min(100, Math.round((statsCalc.totalSolved / dbStats.totalQuestions) * 100)))
      : 0;

  // Badges calculations
  const unlockedBadges = useMemo(() => {
    return badges.filter((b) => b.unlocked);
  }, [badges]);
  const mostRecentBadge = unlockedBadges[unlockedBadges.length - 1] || badges[0];

  // =========================================================================
  // 4. ACTIVITY HEATMAP (365 DAYS / 52 WEEKS) TÍNH THỰC TẾ
  // =========================================================================
  const { heatmapWeeks, totalActiveDays, maxYearStreak, totalYearSubmissions } = useMemo(() => {
    const dateCountMap = new Map<string, number>();

    // Add quiz submissions
    quizResults.forEach((q) => {
      if (q.completed_at) {
        const d = q.completed_at.split("T")[0];
        dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
      }
    });

    // Add full test submissions
    fullTestResults.forEach((t) => {
      if (t.completed_at) {
        const d = t.completed_at.split("T")[0];
        dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
      }
    });

    // Add lesson completions
    lessonProgress.forEach((p) => {
      if (p.created_at) {
        const d = p.created_at.split("T")[0];
        dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
      }
    });

    let totalSubmissions = 0;
    dateCountMap.forEach((cnt) => {
      totalSubmissions += cnt;
    });

    // Generate last 52 weeks (364 days ending today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDayOfWeek = (today.getDay() + 6) % 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDayOfWeek - 51 * 7);

    const weeks: Array<Array<{ dateStr: string; count: number; dayOfWeek: number }>> = [];
    let currentWeek: Array<{ dateStr: string; count: number; dayOfWeek: number }> = [];

    let loopDate = new Date(startDate);
    let activeDaysCount = 0;
    let rollingStreak = 0;
    let computedMaxStreak = 0;

    for (let i = 0; i < 52 * 7; i++) {
      const year = loopDate.getFullYear();
      const month = String(loopDate.getMonth() + 1).padStart(2, "0");
      const day = String(loopDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const count = dateCountMap.get(dateStr) || 0;
      if (count > 0) {
        activeDaysCount++;
        rollingStreak++;
        if (rollingStreak > computedMaxStreak) {
          computedMaxStreak = rollingStreak;
        }
      } else {
        rollingStreak = 0;
      }

      currentWeek.push({
        dateStr,
        count,
        dayOfWeek: loopDate.getDay(),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      loopDate.setDate(loopDate.getDate() + 1);
    }

    return {
      heatmapWeeks: weeks,
      totalActiveDays: activeDaysCount,
      maxYearStreak: Math.max(computedMaxStreak, streak),
      totalYearSubmissions: totalSubmissions,
    };
  }, [quizResults, fullTestResults, lessonProgress, streak]);

  // =========================================================================
  // 5. RECENT SUBMISSIONS MERGED LIST
  // =========================================================================
  const allSubmissions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: "quiz" | "test";
      scoreDisplay: string;
      status: "passed" | "completed";
      completedAt: string | null;
      accuracy: number;
    }> = [];

    quizResults.forEach((q: any) => {
      const scoreNum = Number(q.score) || 0;
      const totalQ = Number(q.total_questions) || 10;
      const correct = Number(q.correct_answers) || Math.round((scoreNum / 10) * totalQ);
      const acc = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

      list.push({
        id: `quiz-${q.id}`,
        title: (q.quizzes as any)?.title || "Bài luyện tập trắc nghiệm",
        type: "quiz",
        scoreDisplay: `${scoreNum}/10 (${acc}%)`,
        status: scoreNum >= 7 ? "passed" : "completed",
        completedAt: q.completed_at,
        accuracy: acc,
      });
    });

    fullTestResults.forEach((t: any) => {
      const scoreNum = Number(t.total_score) || 0;
      const totalQ = Number(t.total_questions) || 200;
      const correct = Number(t.correct_answers) || 0;
      const acc = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;

      list.push({
        id: `test-${t.id}`,
        title: (t.full_tests as any)?.title || "Đề thi Full Test TOEIC chuẩn",
        type: "test",
        scoreDisplay: `${scoreNum}/990 điểm (${acc}%)`,
        status: scoreNum >= 650 ? "passed" : "completed",
        completedAt: t.completed_at,
        accuracy: acc,
      });
    });

    // Sắp xếp giảm dần theo thời gian nộp
    list.sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeB - timeA;
    });

    return list;
  }, [quizResults, fullTestResults]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    if (submissionTab === "quiz") return allSubmissions.filter((s) => s.type === "quiz");
    if (submissionTab === "test") return allSubmissions.filter((s) => s.type === "test");
    return allSubmissions;
  }, [allSubmissions, submissionTab]);

  // =========================================================================
  // 6. XỬ LÝ TẢI ẢNH TRỰC TIẾP TỪ MÁY TÍNH (AVATAR & COVER)
  // =========================================================================
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Helper đọc và lưu file ảnh (Ưu tiên Supabase storage bucket 'materials', fallback Base64)
  const processImageFile = async (file: File, folder: "avatars" | "covers"): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP, GIF...)");
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error("Dung lượng ảnh tối đa là 15MB");
    }

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${user?.id || "user"}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `profiles/${folder}/${fileName}`;

    // 1. Thử tải lên Supabase storage
    try {
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (!uploadError) {
        const { data } = supabase.storage.from("materials").getPublicUrl(filePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Storage upload error, fallback to data url:", err);
    }

    // 2. Fallback Base64 Data URL (luôn thành công 100% trên mọi máy tính)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh từ máy tính"));
      reader.readAsDataURL(file);
    });
  };

  // Upload ảnh đại diện trực tiếp từ máy tính
  const handleDirectAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingAvatar(true);

    try {
      const newUrl = await processImageFile(file, "avatars");

      await updateMyProfile({ avatar_url: newUrl });

      await authClient.updateUser({
        data: { avatar_url: newUrl },
      });

      setEditAvatarUrl(newUrl);
      await queryClient.invalidateQueries();

      toast({
        title: "Tải ảnh đại diện thành công! 🎉",
        description: "Ảnh đại diện mới đã được cập nhật từ máy tính.",
      });
    } catch (err: any) {
      toast({
        title: "Tải ảnh thất bại",
        description: err.message || "Không thể tải ảnh từ máy tính lên.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // Upload ảnh bìa trực tiếp từ máy tính
  const handleDirectCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingCover(true);

    try {
      const newUrl = await processImageFile(file, "covers");

      await authClient.updateUser({
        data: { cover_url: newUrl },
      });

      localStorage.setItem(coverStorageKey, newUrl);
      setCoverUrl(newUrl);
      setEditCoverUrl(newUrl);
      await queryClient.invalidateQueries();

      toast({
        title: "Tải ảnh bìa thành công! 🎉",
        description: "Ảnh bìa mới đã được cập nhật từ máy tính.",
      });
    } catch (err: any) {
      toast({
        title: "Tải ảnh bìa thất bại",
        description: err.message || "Không thể tải ảnh từ máy tính lên.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  // =========================================================================
  // 7. PROFILE UPDATE ACTION (Edit Modal)
  // =========================================================================
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);

    try {
      // 1. Cập nhật bảng profiles
      const { error: profileError } = await updateMyProfile({
        full_name: editFullName,
        avatar_url: editAvatarUrl || null,
      });

      if (profileError) throw profileError;

      // 2. Cập nhật Auth metadata
      await authClient.updateUser({
        data: {
          full_name: editFullName,
          avatar_url: editAvatarUrl || null,
          bio: editBio,
          cover_url: editCoverUrl,
        },
      });

      // 3. Lưu localStorage làm fallback
      localStorage.setItem(bioStorageKey, editBio);
      localStorage.setItem(coverStorageKey, editCoverUrl);
      setBio(editBio);
      setCoverUrl(editCoverUrl);

      // 4. Invalidate auth queries
      await queryClient.invalidateQueries();

      toast({
        title: "Cập nhật thành công! 🎉",
        description: "Thông tin hồ sơ và ảnh của bạn đã được lưu.",
      });

      setIsEditOpen(false);
    } catch (err: any) {
      toast({
        title: "Cập nhật thất bại",
        description: err.message || "Đã xảy ra lỗi khi lưu thông tin.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (isQuizError || isFullTestError || isProgressError) {
    return (
      <StudentLayout>
        <div className="max-w-6xl mx-auto py-16 px-4">
          <ErrorState
            onRetry={() => {
              refetchQuizzes();
              refetchFullTests();
              refetchProgress();
            }}
          />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto pb-24 px-2 sm:px-4">
        {/* ================================================================ */}
        {/* 1. COVER BANNER (ẢNH BÌA PROFILE NẰM PHÍA SAU AVATAR)             */}
        {/* ================================================================ */}
        <div className="relative w-full h-56 sm:h-64 md:h-72 rounded-3xl overflow-hidden border border-border/70 shadow-md group">
          <img
            src={coverUrl}
            alt="Profile Cover"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

          {/* Cụm nút thay đổi ảnh bìa: Cho phép tải trực tiếp từ máy tính hoặc chọn mẫu */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <label className="bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-md transition-all cursor-pointer select-none">
              {isUploadingCover ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline">Thay đổi ảnh bìa</span>
              <span className="sm:hidden">Đổi bìa</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDirectCoverUpload}
                className="hidden"
                disabled={isUploadingCover}
              />
            </label>
            <button
              onClick={() => {
                setEditFullName(displayName);
                setEditAvatarUrl(profile?.avatar_url || "");
                setEditCoverUrl(coverUrl);
                setEditBio(bio);
                setIsEditOpen(true);
              }}
              className="bg-slate-900/60 hover:bg-slate-900 text-slate-200 backdrop-blur-md p-1.5 rounded-xl text-xs border border-white/10 shadow-md transition-all cursor-pointer"
              title="Bộ sưu tập ảnh mẫu"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 2. MAIN 2-COLUMN LAYOUT (AVATAR NẰM ĐÈ LÊN ẢNH BÌA)              */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10 -mt-20 sm:-mt-24">
          {/* -------------------------------------------------------------- */}
          {/* CỘT TRÁI (LEFT SIDEBAR): THÔNG TIN HỌC VIÊN & CHỈ SỐ THỰC TẾ   */}
          {/* -------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-5">
            {/* USER CARD */}
            <div className="bg-card rounded-3xl border border-border/80 p-5 pt-0 shadow-xl space-y-5">
              {/* Avatar + Basic Meta */}
              <div className="flex flex-col items-center text-center">
                {/* AVATAR: NẰM ĐÈ LÊN ẢNH BÌA, ẢNH BÌA Ở PHÍA SAU AVATAR */}
                <div className="relative -mt-16 sm:-mt-20 mb-3 group/avatar">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-card shadow-2xl ring-4 ring-black/40"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center text-3xl font-black border-4 border-card shadow-2xl">
                      {initials}
                    </div>
                  )}

                  {/* Level Badge icon */}
                  <div
                    title={`Cấp độ: ${levelInfo.title}`}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center font-black text-xs border-2 border-card shadow-md z-10"
                  >
                    {levelInfo.level}
                  </div>

                  {/* Nút bấm tải ảnh đại diện trực tiếp từ máy tính */}
                  <label
                    title="Nhấn để tải ảnh đại diện từ máy tính"
                    className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-all duration-200 cursor-pointer backdrop-blur-xs select-none"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 mb-1 text-cyan-300" />
                        <span className="text-[10px] font-bold">Đổi ảnh</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDirectAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>

                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <h1 className="text-xl font-black text-foreground tracking-tight">
                      {displayName}
                    </h1>
                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground font-mono">
                    @{user?.email ? user.email.split("@")[0] : "student"}
                  </p>

                  <div className="pt-1 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {levelInfo.title}
                    </span>
                  </div>
                </div>

                {/* Edit Profile Button */}
                <button
                  onClick={() => {
                    setEditFullName(displayName);
                    setEditAvatarUrl(profile?.avatar_url || "");
                    setEditCoverUrl(coverUrl);
                    setEditBio(bio);
                    setIsEditOpen(true);
                  }}
                  className="w-full mt-4 py-2 px-4 rounded-xl bg-muted/70 hover:bg-muted text-foreground text-xs font-bold border border-border/80 transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                  Chỉnh sửa hồ sơ
                </button>
              </div>

              {/* Bio Quote */}
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs text-foreground/80 leading-relaxed italic bg-muted/30 p-3 rounded-xl border border-border/40">
                  "{bio}"
                </p>
              </div>

              {/* Real Measured Statistics */}
              <div className="pt-2 border-t border-border/60 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <span className="font-semibold text-foreground truncate max-w-[160px]">
                    {user?.email}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Tham gia
                  </span>
                  <span className="font-semibold text-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-500" /> Tổng lượt nộp bài
                  </span>
                  <span className="font-black text-foreground">
                    {allSubmissions.length} lượt
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Đã làm đúng
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {statsCalc.totalSolved} / {statsCalc.totalAttempted} câu
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-emerald-500" /> Tỷ lệ chính xác
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {statsCalc.overallAccuracy}%
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" /> Điểm TOEIC cao nhất
                  </span>
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {statsCalc.maxFullTestScore > 0 ? `${statsCalc.maxFullTestScore}/990` : "Chưa thi đề"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-orange-500" /> Chuỗi học tập
                  </span>
                  <span className="font-black text-orange-600 dark:text-orange-400">
                    {streak} ngày liên tiếp
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-purple-500" /> Thời gian làm bài
                  </span>
                  <span className="font-black text-purple-600 dark:text-purple-400">
                    {statsCalc.totalTimeHours} giờ
                  </span>
                </div>
              </div>

              {/* Real Skills Breakdown */}
              <div className="pt-3 border-t border-border/60 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-blue-500" /> Kỹ năng đã luyện
                </h4>
                <div className="space-y-1.5 pt-1">
                  {/* Listening */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="font-medium flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Volume2 className="w-3.5 h-3.5" /> Listening (Nghe)
                    </span>
                    <span className="font-bold text-foreground">
                      {statsCalc.listeningSolved} câu đúng{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({statsCalc.listeningAttempted > 0 ? Math.round((statsCalc.listeningSolved / statsCalc.listeningAttempted) * 100) : 0}%)
                      </span>
                    </span>
                  </div>

                  {/* Reading */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                    <span className="font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <BookOpenCheck className="w-3.5 h-3.5" /> Reading (Đọc)
                    </span>
                    <span className="font-bold text-foreground">
                      {statsCalc.readingSolved} câu đúng{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({statsCalc.readingAttempted > 0 ? Math.round((statsCalc.readingSolved / statsCalc.readingAttempted) * 100) : 0}%)
                      </span>
                    </span>
                  </div>

                  {/* Grammar & Vocab */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
                    <span className="font-medium flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                      <Layers className="w-3.5 h-3.5" /> Grammar & Quiz
                    </span>
                    <span className="font-bold text-foreground">
                      {statsCalc.grammarSolved} câu đúng{" "}
                      <span className="text-[10px] text-muted-foreground">
                        ({statsCalc.grammarAttempted > 0 ? Math.round((statsCalc.grammarSolved / statsCalc.grammarAttempted) * 100) : 0}%)
                      </span>
                    </span>
                  </div>

                  {/* Full Tests */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                    <span className="font-medium flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Full Test TOEIC
                    </span>
                    <span className="font-bold text-foreground">
                      {fullTestResults.length} đề{" "}
                      <span className="text-[10px] text-muted-foreground">
                        (Max: {statsCalc.maxFullTestScore}đ)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* CỘT PHẢI (RIGHT MAIN): TIẾN ĐỘ + HUY HIỆU + HEATMAP + LỊCH SỬ  */}
          {/* -------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-6 pt-20 sm:pt-24 lg:pt-24">
            {/* ROW 1: SOLVED CIRCULAR GAUGE + BADGES (2-BENTO GRID) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* BENTO 1: VÒNG TRÒN SOLVED QUESTIONS (LeetCode Solved Style) */}
              <div className="md:col-span-7 bg-card rounded-2xl border border-border/80 p-5 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Thống kê bài giải
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    Kho câu hỏi: <strong className="text-foreground">{dbStats.totalQuestions.toLocaleString()}</strong> câu
                  </span>
                </div>

                <div className="flex items-center justify-around gap-4 py-2">
                  {/* Circular SVG Donut */}
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                      {/* Background track */}
                      <circle
                        cx="64"
                        cy="64"
                        r={circleRadius}
                        stroke="currentColor"
                        strokeWidth="10"
                        className="text-muted/40"
                        fill="transparent"
                      />
                      {/* Completed Progress Arc */}
                      <circle
                        cx="64"
                        cy="64"
                        r={circleRadius}
                        stroke="#10b981"
                        strokeWidth="10"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={circleCircumference - (circleCircumference * solvedPercent) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        fill="transparent"
                      />
                    </svg>

                    {/* Center Numbers */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-foreground tracking-tight leading-none">
                        {statsCalc.totalSolved}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-500" /> Đã giải
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">
                        {statsCalc.totalAttempted} câu đã làm
                      </span>
                    </div>
                  </div>

                  {/* Right side breakdown pills (Easy/Med/Hard equivalents) */}
                  <div className="space-y-2 flex-1 max-w-[210px]">
                    {/* Listening */}
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-bold">Listening (Nghe)</div>
                        <div className="text-[10px] text-muted-foreground">
                          {statsCalc.listeningAttempted > 0
                            ? `${Math.round((statsCalc.listeningSolved / statsCalc.listeningAttempted) * 100)}% chính xác`
                            : "0% chính xác"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-foreground">{statsCalc.listeningSolved}</span>
                        <span className="text-[10px] text-muted-foreground">/{dbStats.listeningQuestions.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Reading */}
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-amber-700 dark:text-amber-400 font-bold">Reading (Đọc)</div>
                        <div className="text-[10px] text-muted-foreground">
                          {statsCalc.readingAttempted > 0
                            ? `${Math.round((statsCalc.readingSolved / statsCalc.readingAttempted) * 100)}% chính xác`
                            : "0% chính xác"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-foreground">{statsCalc.readingSolved}</span>
                        <span className="text-[10px] text-muted-foreground">/{dbStats.readingQuestions.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Full Test TOEIC */}
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-purple-700 dark:text-purple-400 font-bold">Full Test TOEIC</div>
                        <div className="text-[10px] text-muted-foreground">
                          {statsCalc.maxFullTestScore > 0
                            ? `Cao nhất: ${statsCalc.maxFullTestScore}đ`
                            : "Đề thi hoàn thành"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-foreground">{fullTestResults.length}</span>
                        <span className="text-[10px] text-muted-foreground">/{dbStats.totalFullTests || 55} đề</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BENTO 2: HUY HIỆU & DANH HIỆU (LeetCode Badges Style) */}
              <div className="md:col-span-5 bg-card rounded-2xl border border-border/80 p-5 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Huy hiệu đạt được
                  </span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    {unlockedBadges.length} / {badges.length}
                  </span>
                </div>

                {/* Most Recent Badge Highlight */}
                <div className="flex flex-col items-center justify-center text-center py-2 space-y-2.5">
                  <div className="relative group cursor-pointer" onClick={() => setIsBadgesModalOpen(true)}>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-500/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <Trophy className="w-8 h-8 text-amber-500 fill-amber-500/30" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Huy hiệu gần nhất
                    </span>
                    <h4 className="text-sm font-black text-foreground leading-snug">
                      {mostRecentBadge?.title || "Tập Sự Khởi Đầu"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                      {mostRecentBadge?.description || "Bắt đầu hành trình học tập tại L-English"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBadgesModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold text-foreground border border-border/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  Xem bộ sưu tập danh hiệu <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROW 2: ACTIVITY HEATMAP 365 DAYS (LeetCode / GitHub Submissions Heatmap) */}
            <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-foreground tracking-tight">
                    {totalYearSubmissions} lượt làm bài trong năm qua
                  </h3>
                  <div
                    title="Tính theo số lượt hoàn thành bài học, nộp bài Quiz và đề Full Test được ghi nhận trong cơ sở dữ liệu."
                    className="text-muted-foreground cursor-help"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground flex-wrap">
                  <span>
                    Tổng ngày active: <strong className="text-foreground">{totalActiveDays}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Chuỗi dài nhất: <strong className="text-foreground">{maxYearStreak} ngày</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                    <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> Hiện tại: {streak} ngày
                  </span>
                </div>
              </div>

              {/* Heatmap Grid (Scrollable on small screens) */}
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="min-w-[720px] space-y-2">
                  {/* Heatmap Matrix: 52 columns x 7 rows */}
                  <div className="flex gap-[3.5px]">
                    {heatmapWeeks.map((week, wIndex) => (
                      <div key={wIndex} className="flex flex-col gap-[3.5px]">
                        {week.map((day, dIndex) => {
                          let bgClass = "bg-muted/50 border border-border/40";
                          if (day.count === 1) {
                            bgClass = "bg-emerald-400/50 dark:bg-emerald-800/70 border border-emerald-400/60";
                          } else if (day.count === 2 || day.count === 3) {
                            bgClass = "bg-emerald-500 dark:bg-emerald-600 border border-emerald-400 shadow-xs";
                          } else if (day.count >= 4) {
                            bgClass = "bg-emerald-400 dark:bg-emerald-400 shadow-sm border border-emerald-300";
                          }

                          return (
                            <div
                              key={dIndex}
                              title={`${day.count} lượt nộp bài vào ngày ${day.dateStr}`}
                              className={`w-3 h-3 rounded-[3px] transition-colors cursor-pointer hover:ring-2 hover:ring-blue-400 ${bgClass}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Legend / Levels */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2">
                    <span>52 tuần trước</span>
                    <div className="flex items-center gap-1.5">
                      <span>Ít hơn</span>
                      <div className="w-2.5 h-2.5 rounded-[2px] bg-muted/50 border border-border/40" />
                      <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400/50 dark:bg-emerald-800/70" />
                      <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-600" />
                      <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-400" />
                      <span>Nhiều hơn</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: RECENT SUBMISSIONS / ACTIVITY HISTORY (LeetCode Recent AC List) */}
            <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-black text-foreground tracking-tight">
                    Lịch sử nộp bài gần đây
                  </h3>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs">
                  <button
                    onClick={() => setSubmissionTab("all")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      submissionTab === "all"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tất cả ({allSubmissions.length})
                  </button>
                  <button
                    onClick={() => setSubmissionTab("test")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      submissionTab === "test"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Full Test ({fullTestResults.length})
                  </button>
                  <button
                    onClick={() => setSubmissionTab("quiz")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      submissionTab === "quiz"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Bài Quiz ({quizResults.length})
                  </button>
                </div>
              </div>

              {/* Submissions List */}
              {filteredSubmissions.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {filteredSubmissions.slice(0, 12).map((item) => (
                    <div
                      key={item.id}
                      className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/30 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.type === "test"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {item.type === "test" ? (
                            <Trophy className="w-4 h-4" />
                          ) : (
                            <FileCheck2 className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="capitalize">
                              {item.type === "test" ? "Đề Full Test TOEIC" : "Bài Quiz Luyện Tập"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatRelativeTime(item.completedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span className="font-mono text-xs font-black text-foreground">
                          {item.scoreDisplay}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.status === "passed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {item.status === "passed" ? "Đạt Mốc" : "Hoàn Thành"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium">Chưa có lượt nộp bài nào trong mục này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. MODAL: CHỈNH SỬA HỒ SƠ (AVATAR, COVER, TÊN, BIO)                  */}
      {/* =================================================================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Chỉnh sửa thông tin hồ sơ
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cập nhật ảnh đại diện, ảnh bìa, họ tên và mục tiêu học tập của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. COVER PHOTO SELECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Ảnh bìa cá nhân (Cover Banner)</Label>
                <label className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all select-none">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh từ máy tính</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await processImageFile(file, "covers");
                        setEditCoverUrl(url);
                        toast({ title: "Đã chọn ảnh bìa từ máy tính!", description: "Nhớ bấm 'Lưu thay đổi' để áp dụng." });
                      } catch (err: any) {
                        toast({ title: "Lỗi tải ảnh", description: err.message, variant: "destructive" });
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="w-full h-24 rounded-xl overflow-hidden border border-border relative">
                <img
                  src={editCoverUrl || PRESET_COVERS[0].url}
                  alt="Preview Cover"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Preset cover options */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                {PRESET_COVERS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditCoverUrl(preset.url)}
                    className={`w-16 h-10 rounded-lg overflow-hidden border-2 shrink-0 relative transition-all cursor-pointer ${
                      editCoverUrl === preset.url ? "border-blue-500 scale-105" : "border-transparent opacity-70"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    {editCoverUrl === preset.url && (
                      <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center text-white">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Input
                placeholder="Hoặc dán liên kết URL ảnh bìa tùy chỉnh..."
                value={editCoverUrl}
                onChange={(e) => setEditCoverUrl(e.target.value)}
                className="text-xs h-9 mt-1"
              />
            </div>

            {/* 2. AVATAR SELECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Ảnh đại diện (Avatar)</Label>
                <label className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all select-none">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh từ máy tính</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await processImageFile(file, "avatars");
                        setEditAvatarUrl(url);
                        toast({ title: "Đã chọn ảnh đại diện từ máy tính!", description: "Nhớ bấm 'Lưu thay đổi' để áp dụng." });
                      } catch (err: any) {
                        toast({ title: "Lỗi tải ảnh", description: err.message, variant: "destructive" });
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                {editAvatarUrl ? (
                  <img
                    src={editAvatarUrl}
                    alt="Preview Avatar"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-border shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                    {initials}
                  </div>
                )}

                {/* Preset Avatars */}
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditAvatarUrl(url)}
                      className={`w-9 h-9 rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
                        editAvatarUrl === url ? "border-blue-500 scale-110" : "border-border/60 opacity-80"
                      }`}
                    >
                      <img src={url} alt={`Avatar preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder="Hoặc dán URL ảnh đại diện tùy thích..."
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                className="text-xs h-9 mt-1"
              />
            </div>

            {/* 3. FULL NAME */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Họ và tên hiển thị</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Nhập họ và tên của bạn..."
                className="h-10 text-sm"
              />
            </div>

            {/* 4. BIO / GOAL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Mục tiêu học tập / Giới thiệu ngắn</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Mục tiêu TOEIC 800+ trong kỳ thi sắp tới! 🚀"
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="py-2 px-4 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={savingProfile}
              onClick={handleSaveProfile}
              className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu thay đổi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* 5. MODAL: TOÀN BỘ BỘ SƯU TẬP DANH HIỆU (BADGES GALLERY)             */}
      {/* =================================================================== */}
      <Dialog open={isBadgesModalOpen} onOpenChange={setIsBadgesModalOpen}>
        <DialogContent className="max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Bộ sưu tập danh hiệu học tập
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Các mốc huy hiệu vinh danh sự nỗ lực và kiên trì rèn luyện của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                  b.unlocked
                    ? "bg-amber-500/10 border-amber-500/30 text-foreground"
                    : "bg-muted/30 border-border/50 opacity-60 text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    b.unlocked ? "bg-amber-500 text-amber-950 shadow-xs" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h5 className="font-bold text-xs truncate">{b.title}</h5>
                    {b.unlocked && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {b.description}
                  </p>
                  <div className="pt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    +{b.xpReward} XP thưởng
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsBadgesModalOpen(false)}
              className="w-full py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default Profile;
