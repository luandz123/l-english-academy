import StudentLayout from "@/components/StudentLayout";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";

const courseTypeMap: Record<string, string> = {
  video_quiz: "🎬 Video + Bài Thi",
  flashcard: "🃏 Flashcard",
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking & Writing",
  fulltest: "📋 Full Test",
};

const filterTypes = [
  { key: "all", label: "Tất cả" },
  { key: "video_quiz", label: "🎬 Video" },
  { key: "flashcard", label: "🃏 Flashcard" },
  { key: "listening", label: "🎧 Listening" },
  { key: "speaking", label: "🗣️ Speaking" },
  { key: "fulltest", label: "📋 Full Test" },
];

const Courses = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [zaloDialogOpen, setZaloDialogOpen] = useState(false);
  const [selectedCourseTitle, setSelectedCourseTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get("filter") || "all");

  useEffect(() => {
    const filterFromUrl = searchParams.get("filter");
    if (filterFromUrl && filterTypes.some(f => f.key === filterFromUrl)) {
      setActiveFilter(filterFromUrl);
    }
  }, [searchParams]);

  const handleFilterChange = (filterKey: string) => {
    setActiveFilter(filterKey);
    if (filterKey === "all") {
      searchParams.delete("filter");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), filter: filterKey });
    }
  };

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments-ids", user?.id, isAdmin, courses?.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!user) return [];
      if (isAdmin && courses) {
        return courses.map(c => c.id);
      }
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      return data?.map(e => e.course_id) || [];
    },
    enabled: !!user,
  });

  // D6: Fetch lesson progress per course for progress bar
  const { data: lessonProgressData = [] } = useQuery({
    queryKey: ["all-lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_lesson_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user.id)
        .eq("is_completed", true);
      return data || [];
    },
    enabled: !!user,
  });

  // D6: Fetch total lessons per course
  const { data: courseLessonCounts = [] } = useQuery({
    queryKey: ["course-lesson-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, modules!inner(course_id)")
        .eq("is_published", true);
      return data || [];
    },
  });

  const enrolledIds = new Set(enrollments || []);
  const completedLessonIds = new Set(lessonProgressData.map((p: any) => p.lesson_id));

  // Build a map: courseId -> { total, completed }
  const courseProgressMap = useMemo(() => {
    const map: Record<number, { total: number; completed: number }> = {};
    courseLessonCounts.forEach((lesson: any) => {
      const courseId = lesson.modules?.course_id;
      if (!courseId) return;
      if (!map[courseId]) map[courseId] = { total: 0, completed: 0 };
      map[courseId].total++;
      if (completedLessonIds.has(lesson.id)) map[courseId].completed++;
    });
    return map;
  }, [courseLessonCounts, completedLessonIds]);

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  const getLessonLink = (c: any) => {
    if (c.course_type === "flashcard") return `/courses/${c.id}/vocab`;
    if (c.course_type === "fulltest") return `/courses/${c.id}/fulltest`;
    return `/courses/${c.id}/learn`;
  };

  const handleCourseClick = (c: any, isEnrolled: boolean) => {
    const canAccess = isEnrolled || c.is_free || !c.price || c.price === 0 || isAdmin;
    if (canAccess) {
      navigate(getLessonLink(c));
    } else {
      setSelectedCourseTitle(c.title);
      setZaloDialogOpen(true);
    }
  };

  // A2: filter logic
  const filterCourses = (list: any[]) => {
    return list.filter(c => {
      const matchSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = activeFilter === "all" || c.course_type === activeFilter;
      return matchSearch && matchType;
    });
  };

  const myCourses = courses?.filter(c => {
    const isEnrolled = enrolledIds.has(c.id);
    const isFree = c.is_free || !c.price || c.price === 0;
    return isEnrolled || isFree;
  }) || [];

  const filteredMyCourses = filterCourses(myCourses);
  const filteredAllCourses = filterCourses(courses || []);

  const renderCourseCard = (c: any) => {
    const isEnrolled = enrolledIds.has(c.id);
    const isFree = c.is_free || !c.price || c.price === 0;
    const canAccess = isEnrolled || isFree;
    const progress = courseProgressMap[c.id];
    const progressPct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    const isCompleted = progressPct === 100 && progress && progress.total > 0;

    return (
      <div
        key={c.id}
        className="card-duo flex flex-col h-full cursor-pointer hover:translate-y-[-4px] transition-transform duration-300"
        onClick={() => handleCourseClick(c, isEnrolled)}
      >
        <div className="aspect-video w-full bg-muted relative overflow-hidden rounded-t-[14px]">
          {c.thumbnail_url ? (
            <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs bg-gradient-to-br from-[var(--duo-green)]/10 to-[var(--duo-blue)]/10">
               L-ENGLISH
            </div>
          )}
          {/* D6: badges */}
          {isEnrolled && (
            <div className="absolute top-3 left-3">
              {isCompleted
                ? <span className="badge-duo badge-green">✅ Hoàn thành</span>
                : <span className="badge-duo badge-green">✅ Đã đăng ký</span>
              }
            </div>
          )}
          {isFree && (
            <div className="absolute top-3 right-3">
              <span className="badge-duo badge-green">FREE</span>
            </div>
          )}
        </div>

        {/* D6: Progress bar under thumbnail */}
        {isEnrolled && progress && progress.total > 0 && (
          <div className="px-0">
            <div className="h-1.5 bg-muted w-full">
              <div
                className="h-full transition-all duration-700 rounded-none"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: isCompleted ? 'var(--duo-correct)' : 'var(--duo-blue)'
                }}
              />
            </div>
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="badge-duo badge-blue">{courseTypeMap[c.course_type] || c.course_type}</span>
              {/* D6: progress text */}
              {isEnrolled && progress && progress.total > 0 && (
                <span className={`text-[10px] font-extrabold ${isCompleted ? 'text-[var(--duo-correct)]' : 'text-muted-foreground'}`}>
                  {progress.completed}/{progress.total} bài
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-foreground leading-tight text-base line-clamp-2">{c.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1 font-medium">{c.subtitle}</p>
          <div className="pt-2 border-t-2 border-[var(--duo-gray)] mt-auto">
            <p className="text-[10px] text-muted-foreground font-bold">
              Giảng viên: <span className="text-foreground">{c.instructor}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
              Hạn: {c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}
            </p>
          </div>
        </div>
        <div className="px-5 pb-5 flex items-center justify-between">
          <span className="font-extrabold text-sm text-[var(--duo-correct)]">{formatPrice(c.price)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCourseClick(c, isEnrolled);
            }}
            className={`btn-3d ${canAccess ? 'btn-3d-primary' : 'btn-3d-secondary'} text-xs py-2 px-4`}
          >
            {canAccess ? "Vào học ngay 🚀" : "Kích hoạt khóa học 🔒"}
          </button>
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="card-duo p-12 text-center max-w-xl mx-auto space-y-4 col-span-full">
      <div className="text-5xl">🔍</div>
      <h3 className="font-extrabold text-lg text-foreground">Không tìm thấy kết quả</h3>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
      <button
        onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
        className="btn-3d btn-3d-white py-2 px-5 text-sm"
      >
        Xóa bộ lọc
      </button>
    </div>
  );

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Hệ Thống Luyện Thi 📚</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Khám phá kho đề thi và lộ trình luyện TOEIC chuyên sâu</p>
        </div>

        {/* A2: Search + Filter bar */}
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-[var(--duo-gray)] bg-card text-sm font-medium focus:outline-none focus:border-[var(--duo-blue)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {filterTypes.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-4 py-1.5 rounded-full border-2 text-xs font-extrabold transition-all cursor-pointer ${
                  activeFilter === f.key
                    ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-[0_2px_0_var(--duo-blue-dark)]"
                    : "bg-card border-[var(--duo-gray)] text-muted-foreground hover:border-[var(--duo-blue)]/50 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="my-courses" className="w-full space-y-6">
            <TabsList className="bg-transparent p-0 h-auto gap-2 flex-wrap border-b-2 border-[var(--duo-gray)] pb-3 w-full justify-start rounded-none">
              <TabsTrigger
                value="my-courses"
                className="data-[state=active]:bg-[var(--duo-correct)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-correct-dark)] px-6 py-3 rounded-xl font-extrabold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-correct)] transition-all"
              >
                📚 Khóa học của tôi
              </TabsTrigger>
              <TabsTrigger
                value="all-courses"
                className="data-[state=active]:bg-[var(--duo-blue)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-blue-dark)] px-6 py-3 rounded-xl font-extrabold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-blue)] transition-all"
              >
                🔍 Tất cả khóa học
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-courses" className="mt-6 focus-visible:outline-none">
              {myCourses.length === 0 ? (
                <div className="card-duo p-12 text-center max-w-xl mx-auto space-y-4">
                  <div className="text-4xl">📚</div>
                  <h3 className="font-extrabold text-lg text-foreground">Bạn chưa đăng ký khóa học nào</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    Hãy nhấn sang tab <strong>Tất cả khóa học</strong> để xem danh sách các lộ trình học và đề thi TOEIC cực chất từ L-English!
                  </p>
                </div>
              ) : filteredMyCourses.length === 0 ? (
                <div className="grid grid-cols-1">
                  <EmptyState message={`Không có khóa học nào khớp với "${searchQuery || activeFilter}". Thử tìm kiếm khác hoặc xóa bộ lọc.`} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMyCourses.map((c) => renderCourseCard(c))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-courses" className="mt-6 focus-visible:outline-none">
              {courses?.length === 0 ? (
                <div className="card-duo p-12 text-center max-w-xl mx-auto">
                  <p className="text-sm text-muted-foreground font-medium">Hiện tại chưa có khóa học nào được phát hành.</p>
                </div>
              ) : filteredAllCourses.length === 0 ? (
                <div className="grid grid-cols-1">
                  <EmptyState message={`Không có khóa học nào khớp với tìm kiếm của bạn. Thử từ khóa khác hoặc xóa bộ lọc.`} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredAllCourses.map((c) => renderCourseCard(c))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={zaloDialogOpen} onOpenChange={setZaloDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl border-4 border-[var(--duo-gray)] dark:border-zinc-800 bg-card text-center shadow-[0_8px_0_var(--duo-gray)] dark:shadow-[0_8px_0_rgba(0,0,0,0.5)]">
          <DialogHeader className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-[var(--duo-orange)]/10 flex items-center justify-center text-4xl shadow-[0_4px_0_rgba(240,140,0,0.2)] animate-bounce mt-2">
              🔒
            </div>
            <DialogTitle className="text-2xl font-extrabold text-foreground leading-tight tracking-tight">
              Khóa Học Chưa Được Kích Hoạt!
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-muted-foreground pt-1">
              Bạn đang yêu cầu truy cập khóa học:
              <span className="block text-foreground font-extrabold text-base mt-1.5 p-2 bg-muted rounded-xl border-2 border-[var(--duo-gray)] dark:border-zinc-800">
                {selectedCourseTitle}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 p-4 rounded-xl bg-[var(--duo-blue)]/5 dark:bg-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/10 dark:border-[var(--duo-blue)]/20 text-left space-y-3">
            <h4 className="font-extrabold text-sm text-[var(--duo-blue-dark)] dark:text-[var(--duo-blue)] flex items-center gap-1.5">
              <span className="text-base">💡</span> Hướng dẫn kích hoạt:
            </h4>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Khóa học này yêu cầu kích hoạt bản quyền từ quản trị viên. Vui lòng liên hệ Admin qua Zalo để được cấp tài khoản học và nhận đầy đủ tài liệu, lộ trình ôn tập TOEIC hiệu quả nhất!
            </p>
            <div className="pt-1 flex items-center justify-between text-xs font-bold text-foreground">
              <span>📞 Hotline / Zalo:</span>
              <span className="text-[var(--duo-blue-dark)] dark:text-[var(--duo-blue)]">0334729066</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="https://zalo.me/0334729066"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d w-full py-4 text-sm font-extrabold text-white text-center bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 inline-block rounded-xl shadow-[0_4px_0_#0F766E] border-2 border-emerald-600"
            >
              💬 LIÊN HỆ QUA ZALO ADMIN NGAY
            </a>
            <button
              onClick={() => setZaloDialogOpen(false)}
              className="btn-3d btn-3d-white w-full py-3 text-xs"
            >
              Đóng lại
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
};

export default Courses;
