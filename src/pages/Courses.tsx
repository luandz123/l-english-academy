import StudentLayout from "@/components/StudentLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, CheckCircle2, Lock, User, Clock, MessageSquare } from "lucide-react";

const courseTypeMap: Record<string, string> = {
  video_quiz: "Khóa học Video",
  flashcard: "Kho Từ vựng",
  listening: "Luyện nghe Chép chính tả",
  speaking: "Speaking & Writing",
  fulltest: "Luyện đề Full Test",
};

const filterTypes = [
  { key: "all", label: "Tất cả" },
  { key: "fulltest", label: "📝 Luyện đề Full Test", isHot: true },
  { key: "listening", label: "🎧 Luyện nghe Điền từ", isHot: true },
  { key: "flashcard", label: "🎴 Từ vựng Flashcard" },
  { key: "video_quiz", label: "🎬 Khóa học Video" },
  { key: "speaking", label: "🗣️ Speaking" },
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
    const canAccess = isEnrolled || isFree || isAdmin;
    const progress = courseProgressMap[c.id];
    const progressPct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    const isCompleted = progressPct === 100 && progress && progress.total > 0;

    return (
      <div
        key={c.id}
        className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group"
        onClick={() => handleCourseClick(c, isEnrolled)}
      >
        <div>
          <div className="aspect-video w-full bg-muted relative overflow-hidden">
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
                L-ENGLISH ACADEMY
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
              {isEnrolled && (
                <span className="badge-duo badge-green shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> {isCompleted ? "Hoàn thành" : "Đã đăng ký"}
                </span>
              )}
              {isFree && (
                <span className="badge-duo badge-blue shadow-sm">FREE</span>
              )}
            </div>
          </div>

          {/* Progress bar under thumbnail */}
          {isEnrolled && progress && progress.total > 0 && (
            <div className="w-full bg-muted h-1">
              <div
                className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="p-5 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="badge-duo badge-purple">{courseTypeMap[c.course_type] || c.course_type}</span>
                {isEnrolled && progress && progress.total > 0 && (
                  <span className={`text-[11px] font-semibold ${isCompleted ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {progress.completed}/{progress.total} bài
                  </span>
                )}
              </div>
              <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {c.title}
              </h3>
            </div>

            {c.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {c.subtitle}
              </p>
            )}

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-muted-foreground/70" /> {c.instructor || "L-English"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/70" /> {c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex items-center justify-between gap-3">
          <span className="font-bold text-sm text-foreground">
            {formatPrice(c.price)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCourseClick(c, isEnrolled);
            }}
            className={`btn-3d ${canAccess ? 'btn-3d-primary' : 'btn-3d-white'} text-xs py-2 px-4`}
          >
            {canAccess ? "Vào học ngay" : "Kích hoạt khóa học"}
          </button>
        </div>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="p-12 text-center max-w-md mx-auto space-y-3 col-span-full rounded-2xl border border-dashed border-border bg-card">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
        <Search className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-base text-foreground">Không tìm thấy khóa học</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      <button
        onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
        className="btn-3d btn-3d-white py-1.5 px-4 text-xs"
      >
        Xóa bộ lọc
      </button>
    </div>
  );

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Hệ thống Khóa học & Đề thi</h1>
          <p className="text-sm text-muted-foreground mt-1">Lộ trình học tập và kho đề luyện thi TOEIC chuẩn format</p>
        </div>

        {/* Search + Filter Bar */}
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khóa học..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills with smooth horizontal scrolling on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1.5 pt-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:flex-wrap">
            {filterTypes.map(f => {
              const isActive = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{f.label}</span>
                  {f.isHot && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (
          <Tabs defaultValue="my-courses" className="w-full space-y-6">
            <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto">
              <TabsTrigger
                value="my-courses"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 rounded-lg font-semibold text-xs transition-all"
              >
                Khóa học của tôi ({myCourses.length})
              </TabsTrigger>
              <TabsTrigger
                value="all-courses"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 rounded-lg font-semibold text-xs transition-all"
              >
                Tất cả khóa học ({courses?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-courses" className="mt-6 focus-visible:outline-none">
              {myCourses.length === 0 ? (
                <div className="p-12 text-center max-w-md mx-auto space-y-3 rounded-2xl border border-dashed border-border bg-card">
                  <h3 className="font-bold text-base text-foreground">Bạn chưa có khóa học nào</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Chuyển sang tab <strong>Tất cả khóa học</strong> để đăng ký và bắt đầu học ngay.
                  </p>
                </div>
              ) : filteredMyCourses.length === 0 ? (
                <EmptyState message={`Không tìm thấy khóa học nào khớp với "${searchQuery}".`} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMyCourses.map((c) => renderCourseCard(c))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-courses" className="mt-6 focus-visible:outline-none">
              {courses?.length === 0 ? (
                <div className="p-12 text-center max-w-md mx-auto rounded-2xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground">Hiện tại chưa có khóa học nào được xuất bản.</p>
                </div>
              ) : filteredAllCourses.length === 0 ? (
                <EmptyState message="Không tìm thấy khóa học nào khớp với bộ lọc." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAllCourses.map((c) => renderCourseCard(c))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Activation Modal */}
      <Dialog open={zaloDialogOpen} onOpenChange={setZaloDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl border border-border bg-card shadow-lg">
          <DialogHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Kích hoạt khóa học
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Bạn đang chọn khóa học: <strong className="text-foreground">{selectedCourseTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-muted/50 border border-border space-y-2.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> Hướng dẫn kích hoạt tài khoản:
            </p>
            <p className="leading-relaxed">
              Khóa học này thuộc chương trình chuyên sâu có bản quyền. Vui lòng liên hệ Admin qua Zalo để kích hoạt quyền truy cập đầy đủ bài giảng, tài liệu và đề thi.
            </p>
            <div className="pt-2 border-t border-border flex items-center justify-between font-semibold text-foreground">
              <span>Hotline / Zalo:</span>
              <span className="text-primary font-bold">0334729066</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="https://zalo.me/0334729066"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d btn-3d-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Liên hệ qua Zalo ngay
            </a>
            <button
              onClick={() => setZaloDialogOpen(false)}
              className="btn-3d btn-3d-white w-full py-2 text-xs"
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
