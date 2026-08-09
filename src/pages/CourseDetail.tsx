import StudentLayout from "@/components/StudentLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, Lock, Headphones, BookA, Clock, ChevronRight, User, Download, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const courseTypeMap: Record<string, string> = {
  video_quiz: "Khóa học Video + Bài tập",
  flashcard: "Kho từ vựng Flashcard",
  listening: "Luyện nghe Chép chính tả",
  speaking: "Speaking & Writing",
  fulltest: "Luyện đề Full Test",
};

const CourseDetail = () => {
  const { courseId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cid = Number(courseId);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", cid],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", cid).single();
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["modules", cid],
    queryFn: async () => {
      const { data } = await (supabase.from("modules") as any)
        .select("*, lessons(*), quizzes(*)")
        .eq("course_id", cid)
        .order("display_order");
      
      if (!data) return [];
      
      return data
        .filter((mod: any) => mod.is_published !== false)
        .map((mod: any) => ({
          ...mod,
          lessons: (mod.lessons || []).filter((l: any) => l.is_published !== false),
          quizzes: (mod.quizzes || []).filter((q: any) => q.is_published !== false)
        }));
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", cid, user?.id, isAdmin],
    queryFn: async () => {
      if (!user) return null;
      if (isAdmin) return { id: 0, user_id: user.id, course_id: cid, enrolled: true };
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", cid)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: materials } = useQuery({
    queryKey: ["course-materials", cid],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").eq("course_id", cid);
      return data || [];
    },
  });

  const { data: quizResults } = useQuery({
    queryKey: ["quiz-results", cid, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_quiz_results")
        .select("quiz_id, score, correct_answers, total_questions")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: vocabQuizzes } = useQuery({
    queryKey: ["course-vocab-quizzes", cid],
    queryFn: async () => {
      const lessonIds = modules?.flatMap((m: any) => m.lessons?.map((l: any) => l.id) || []) || [];
      if (lessonIds.length === 0) return [];
      const { data } = await supabase.from("vocab_quizzes").select("lesson_id, total_questions").in("lesson_id", lessonIds);
      return data || [];
    },
    enabled: !!modules && modules.length > 0,
  });

  const handleEnroll = async () => {
    if (!user) return navigate("/login");
    toast({ 
      title: "Kích hoạt khóa học", 
      description: "Khóa học này thuộc chương trình VIP. Vui lòng liên hệ Admin qua Zalo 0334729066 để kích hoạt quyền truy cập!", 
      variant: "default",
      duration: 5000,
    });
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;
  if (!course) return <StudentLayout><p className="text-muted-foreground font-medium">Không tìm thấy thông tin khóa học.</p></StudentLayout>;

  const getLessonLink = () => {
    if (course.course_type === "flashcard") return `/courses/${cid}/vocab`;
    if (course.course_type === "fulltest") return `/courses/${cid}/fulltest`;
    
    let hasLessons = false;
    let firstQuizId: number | null = null;
    
    if (modules && modules.length > 0) {
      for (const mod of modules) {
        if (mod.lessons && mod.lessons.length > 0) hasLessons = true;
        if (!firstQuizId && mod.quizzes && mod.quizzes.length > 0) {
          firstQuizId = mod.quizzes[0].id;
        }
      }
    }
    
    if (!hasLessons && firstQuizId) {
      return `/courses/${cid}/quiz/${firstQuizId}`;
    }
    
    return `/courses/${cid}/learn`;
  };

  const totalLessonsCount = modules?.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0) || 0;

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Course Hero Banner */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid md:grid-cols-12 gap-0">
            <div className="md:col-span-5 aspect-video md:aspect-auto bg-muted overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center text-primary font-bold text-sm">
                  L-ENGLISH ACADEMY
                </div>
              )}
            </div>
            
            <div className="md:col-span-7 p-6 md:p-8 space-y-4 flex flex-col justify-center">
              <div>
                <span className="badge-duo badge-blue mb-3 inline-block">
                  {courseTypeMap[course.course_type] || course.course_type}
                </span>
                <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                  {course.title}
                </h1>
                {course.subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {course.subtitle}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>Giảng viên: <strong className="text-foreground font-semibold">{course.instructor || "L-English"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Thời lượng: <strong className="text-foreground font-semibold">{course.duration_months ? `${course.duration_months} tháng` : "Vĩnh viễn"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>{totalLessonsCount} bài học</span>
                </div>
              </div>
              
              <div className="pt-2">
                {enrollment || (course as any).is_free || isAdmin ? (
                  <Link to={getLessonLink()} className="btn-3d btn-3d-primary py-2.5 px-6 text-sm font-semibold inline-flex items-center gap-2">
                    {enrollment ? "Tiếp tục học ngay" : "Bắt đầu học miễn phí"} <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button onClick={handleEnroll} className="btn-3d btn-3d-primary py-2.5 px-6 text-sm font-semibold inline-flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Kích hoạt khóa học
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <Tabs defaultValue="content" className="w-full space-y-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border inline-flex h-auto">
            <TabsTrigger
              value="content"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 rounded-lg font-semibold text-xs transition-all"
            >
              Nội dung khóa học ({totalLessonsCount})
            </TabsTrigger>
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 rounded-lg font-semibold text-xs transition-all"
            >
              Giới thiệu
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm px-5 py-2 rounded-lg font-semibold text-xs transition-all"
            >
              Tài liệu đính kèm ({materials?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Content */}
          <TabsContent value="content" className="mt-4 focus-visible:outline-none space-y-4">
            {modules && modules.length > 0 ? (
              <Accordion type="multiple" defaultValue={modules.map((_, i) => `mod-${i}`)} className="space-y-3">
                {modules.map((mod: any, pi: number) => {
                  const lessons = (mod.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order);

                  return (
                    <AccordionItem key={mod.id} value={`mod-${pi}`} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between gap-4 text-left w-full pr-2">
                          <div className="space-y-0.5">
                            <span className="font-bold text-sm text-foreground">{mod.title}</span>
                            <p className="text-xs text-muted-foreground font-normal">{lessons.length} bài học</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-1">
                        <div className="space-y-1.5">
                          {lessons.map((lesson: any) => {
                            const isTest = lesson.lesson_type === "exam" || lesson.lesson_type === "practice";
                            const isDictation = lesson.lesson_type === "dictation";
                            
                            const canAccess = enrollment || (course as any).is_free || mod.is_free || lesson.is_free || isAdmin;
                            const getDestUrl = () => {
                              if (!canAccess) return "#";
                              if (isTest) return `/courses/${cid}/quiz/${lesson.quiz_id || lesson.id}`;
                              if (isDictation) return `/courses/${cid}/dictation/${lesson.quiz_id || lesson.id}`;
                              return `/courses/${cid}/learn`;
                            };
                            
                            const destUrl = getDestUrl();
                            const latestResult = (isTest || isDictation) ? quizResults?.find(r => r.quiz_id === (lesson.quiz_id || lesson.id)) : null;
                            
                            return (
                              <div
                                key={`l-${lesson.id}`}
                                onClick={() => {
                                  if (!canAccess) {
                                    toast({
                                      title: "Khóa học trả phí",
                                      description: "Vui lòng kích hoạt khóa học để xem nội dung bài học này.",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  navigate(destUrl);
                                }}
                                className={cn(
                                  "flex justify-between items-center px-4 py-3 rounded-lg border transition-all cursor-pointer group",
                                  canAccess 
                                    ? "border-border/60 bg-muted/20 hover:bg-card hover:border-primary/40 hover:shadow-sm" 
                                    : "border-border/40 bg-muted/10 opacity-75"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {isDictation ? (
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                      <Headphones className="w-4 h-4" />
                                    </div>
                                  ) : isTest ? (
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                      <PlayCircle className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs md:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                      {lesson.title}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {isDictation ? "Luyện nghe chép chính tả" : isTest ? (lesson.lesson_type === "exam" ? "Bài thi đánh giá" : "Bài tập luyện tập") : "Bài giảng lý thuyết"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0 ml-3">
                                  {vocabQuizzes?.find(vq => vq.lesson_id === lesson.id && vq.total_questions > 0) && (
                                    <button
                                      className="badge-duo badge-purple text-[10px] hidden sm:inline-flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/courses/${cid}/vocab-lesson/${lesson.id}`);
                                      }}
                                    >
                                      <BookA className="w-3 h-3" /> Từ vựng
                                    </button>
                                  )}

                                  {!canAccess ? (
                                    <span className="badge-duo badge-yellow flex items-center gap-1">
                                      <Lock className="w-3 h-3" /> VIP
                                    </span>
                                  ) : (
                                    <>
                                      {(lesson.is_free || mod.is_free || (course as any).is_free) && (
                                        <span className="badge-duo badge-blue">FREE</span>
                                      )}
                                      {latestResult && (
                                        <span className="badge-duo badge-green">
                                          <CheckCircle2 className="w-3 h-3" /> {latestResult.score}/10
                                        </span>
                                      )}
                                      {lesson.duration_seconds > 0 && (
                                        <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline-block">
                                          {Math.round(lesson.duration_seconds / 60)} phút
                                        </span>
                                      )}
                                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card">
                <p className="text-xs text-muted-foreground">Nội dung bài học đang được cập nhật...</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Overview */}
          <TabsContent value="overview" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BookA className="w-4 h-4 text-primary" /> Về khóa học này
              </h3>
              <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Materials */}
          <TabsContent value="materials" className="mt-4 focus-visible:outline-none">
            <div className="rounded-xl border border-border bg-card p-6">
              {materials && materials.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {materials.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs md:text-sm text-foreground truncate">{m.title}</p>
                          <p className="text-[11px] text-muted-foreground">Tài liệu học tập đính kèm</p>
                        </div>
                      </div>
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-3d btn-3d-white py-1.5 px-3 text-xs inline-flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải về
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  Chưa có tài liệu đính kèm cho khóa học này.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default CourseDetail;
