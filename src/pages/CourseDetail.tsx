import StudentLayout from "@/components/StudentLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, Lock, Headphones, BookA, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const courseTypeMap: Record<string, string> = {
  video_quiz: "🎬 Video + Bài Thi",
  flashcard: "🃏 Flashcard",
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking & Writing",
  fulltest: "📋 Full Test",
};

const CourseDetail = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
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
      
      // Filter unpublished modules, lessons and quizzes
      return data
        .filter((mod: any) => mod.is_published !== false)
        .map((mod: any) => ({
          ...mod,
          lessons: (mod.lessons || []).filter((l: any) => l.is_published !== false),
          quizzes: (mod.quizzes || []).filter((q: any) => q.is_published !== false)
        }));
    },
  });

  const { data: enrollment, refetch: refetchEnrollment } = useQuery({
    queryKey: ["enrollment", cid, user?.id],
    queryFn: async () => {
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
      title: "Bản quyền khóa học", 
      description: "Khóa học này trả phí. Vui lòng liên hệ Admin để đăng ký toàn bộ khóa học!", 
      variant: "default",
      duration: 5000,
    });
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;
  if (!course) return <StudentLayout><p className="text-muted-foreground font-medium">Không tìm thấy khóa học.</p></StudentLayout>;

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

  return (
    <StudentLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-24">
        {/* Hero Section */}
        <div className="card-duo p-0 overflow-hidden">
          <div className="grid md:grid-cols-12 gap-0">
            <div className="md:col-span-5 aspect-[4/3] bg-muted overflow-hidden">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover transition-transform hover:scale-105 duration-700" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--duo-green)]/10 to-[var(--duo-blue)]/10 flex items-center justify-center text-muted-foreground uppercase font-bold text-xs tracking-widest">
                  L-English
                </div>
              )}
            </div>
            
            <div className="md:col-span-7 p-6 md:p-8 space-y-5 flex flex-col justify-center">
              <div>
                <span className="badge-duo badge-blue mb-4 inline-block">
                  {courseTypeMap[course.course_type] || course.course_type}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-4">
                  {course.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-bold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--duo-green)] flex items-center justify-center text-white shadow-[0_2px_0_var(--duo-green-dark)]">
                      <span className="font-extrabold text-xs">{course.instructor?.charAt(0) || "I"}</span>
                    </div>
                    <span>{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--duo-blue)]" />
                    <span>{course.duration_months ? `${course.duration_months} tháng` : "Vĩnh viễn"}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                {enrollment || (course as any).is_free ? (
                  <Link to={getLessonLink()} className="btn-3d btn-3d-green text-base px-8 py-3.5 inline-block">
                    {enrollment ? "Tiếp tục học 🚀" : "Vào học miễn phí ✨"}
                  </Link>
                ) : (
                  <button onClick={handleEnroll} className="btn-3d btn-3d-green text-base px-8 py-3.5">
                    Đăng ký khóa học 🔓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto gap-2 flex-wrap">
            <TabsTrigger value="content" className="data-[state=active]:bg-[var(--duo-green)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-green-dark)] px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-green)]">
              📖 Nội dung
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-[var(--duo-blue)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-blue-dark)] px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-blue)]">
              ℹ️ Tổng quan
            </TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-[var(--duo-yellow)] data-[state=active]:text-white data-[state=active]:shadow-[0_3px_0_var(--duo-yellow-dark)] px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[var(--duo-gray)] data-[state=active]:border-[var(--duo-yellow)]">
              📎 Tài liệu ({materials?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6">
            {modules && modules.length > 0 ? (
              <Accordion type="multiple" defaultValue={["mod-0"]} className="space-y-4">
                {modules.map((mod: any, pi: number) => {
                  const lessons = (mod.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order);
                  const quizzes = (mod.quizzes || []).sort((a: any, b: any) => a.display_order - b.display_order);
                  
                  const lessonQuizIds = new Set(lessons.map((l: any) => l.quiz_id).filter(Boolean));
                  const standaloneQuizzes = quizzes.filter((q: any) => !lessonQuizIds.has(q.id));
                  return (
                    <AccordionItem key={mod.id} value={`mod-${pi}`} className="card-duo border-2 border-[var(--duo-gray)] overflow-hidden">
                      <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-start gap-1.5 text-left">
                          <span className="font-extrabold text-lg text-foreground leading-tight">{mod.title}</span>
                          <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            {lessons.length} bài học
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6 pt-2">
                        <div className="space-y-2">
                          {lessons.map((lesson: any) => {
                            const isTest = lesson.lesson_type === "exam" || lesson.lesson_type === "practice";
                            const isDictation = lesson.lesson_type === "dictation";
                            
                            const canAccess = enrollment || (course as any).is_free || mod.is_free || lesson.is_free;
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
                                        title: "Nội dung có phí",
                                        description: "Vui lòng đăng ký khóa học để xem nội dung bài học này.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    navigate(destUrl);
                                  }}
                                  className={cn(
                                    "flex justify-between items-center px-4 py-3.5 rounded-xl transition-all cursor-pointer group",
                                    (isTest || isDictation) 
                                      ? "border-2 border-[var(--duo-gray)] bg-white hover:border-[var(--duo-green)] shadow-[0_2px_0_var(--duo-gray)] hover:shadow-[0_3px_0_var(--duo-gray)]" 
                                      : "hover:bg-muted/50 border-2 border-transparent"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {isDictation ? (
                                      <div className="w-10 h-10 rounded-xl bg-[var(--duo-purple)] flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--duo-purple-dark)] group-hover:scale-110 transition-transform">
                                        <Headphones className="w-5 h-5 text-white" />
                                      </div>
                                    ) : isTest ? (
                                      <div className="w-10 h-10 rounded-xl bg-[var(--duo-orange)] flex items-center justify-center shrink-0 shadow-[0_3px_0_#CC7700] group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-xl bg-[var(--duo-blue)] flex items-center justify-center shrink-0 shadow-[0_3px_0_var(--duo-blue-dark)] group-hover:scale-110 transition-transform">
                                        <PlayCircle className="w-5 h-5 text-white" />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-[15px] text-foreground font-bold group-hover:text-[var(--duo-green)] transition-colors line-clamp-1">{lesson.title}</span>
                                      {isTest && <span className="text-xs font-bold text-muted-foreground mt-0.5">Bài {lesson.lesson_type === "exam" ? "thi online" : "luyện tập"}</span>}
                                      {isDictation && <span className="text-xs font-bold text-muted-foreground mt-0.5">Luyện nghe điền từ</span>}
                                    </div>
                                  </div>
                                   <div className="flex items-center gap-3 shrink-0">
                                  {vocabQuizzes?.find(vq => vq.lesson_id === lesson.id && vq.total_questions > 0) && (
                                    <button
                                      className="badge-duo badge-purple text-[10px] hover:scale-105 transition-transform flex items-center gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/courses/${cid}/vocab-lesson/${lesson.id}`);
                                      }}
                                    >
                                      <BookA className="w-3 h-3" /> Từ vựng
                                    </button>
                                  )}
                                  {!canAccess ? (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Lock className="w-3 h-3 text-[var(--duo-yellow)]" />
                                      <span className="badge-duo badge-yellow">VIP</span>
                                    </div>
                                  ) : (
                                    <>
                                      {(lesson.is_free || mod.is_free || (course as any).is_free) && (
                                        <span className="badge-duo badge-green">FREE</span>
                                      )}
                                      {(isTest || isDictation) ? (
                                        <>
                                          {latestResult ? (
                                            <div className="flex flex-col items-end gap-1.5 hidden sm:flex">
                                              {isDictation ? (
                                                <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                                                  <div className="flex justify-between w-full text-[11px] font-extrabold text-[var(--duo-purple)] uppercase tracking-wider">
                                                    <span>Tiến độ</span>
                                                    <span>{Math.round(((latestResult.correct_answers || 0) / (latestResult.total_questions || 1)) * 100)}%</span>
                                                  </div>
                                                  <div className="progress-duo w-full h-2">
                                                    <div 
                                                      className="progress-duo-fill" 
                                                      style={{ width: `${((latestResult.correct_answers || 0) / (latestResult.total_questions || 1)) * 100}%`, background: 'linear-gradient(90deg, var(--duo-purple), var(--duo-purple-dark))' }}
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="badge-duo badge-green">
                                                  Điểm: {latestResult.score}/10
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="badge-duo badge-orange hidden sm:inline-block">
                                              Chưa học
                                            </span>
                                          )}
                                          <div className="ml-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-[var(--duo-green)] group-hover:text-white text-muted-foreground transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                          </div>
                                        </>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          {lesson.duration_seconds > 0 && (
                                            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{Math.round(lesson.duration_seconds / 60)} phút</span>
                                          )}
                                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-[var(--duo-green)] transition-colors">
                                            <ChevronRight className="w-4 h-4" />
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {/* Removed standalone quizzes per user request */}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="card-duo p-6 text-center">
                <p className="text-sm text-muted-foreground font-medium">Nội dung đang được cập nhật...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-6">
            <div className="card-duo p-8 max-w-3xl">
              <h3 className="font-extrabold text-xl text-foreground mb-6 flex items-center gap-2">
                <BookA className="w-5 h-5 text-[var(--duo-green)]" /> Về khóa học này
              </h3>
              <div className="prose prose-slate max-w-none text-[15px] leading-relaxed text-muted-foreground">
                {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <div className="card-duo p-6">
              {materials && materials.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {materials.map((m: any) => (
                    <div key={m.id} className="flex items-start gap-4 p-4 rounded-xl border-2 border-[var(--duo-gray)] bg-white hover:border-[var(--duo-blue)] hover:shadow-[0_3px_0_var(--duo-gray)] transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-[var(--duo-blue)] flex items-center justify-center shrink-0 text-white shadow-[0_3px_0_var(--duo-blue-dark)]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="font-extrabold text-sm text-foreground line-clamp-1 mb-2 group-hover:text-[var(--duo-blue)] transition-colors">{m.title}</h4>
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="btn-3d btn-3d-white text-xs py-1.5 px-3 inline-block">
                          Tải xuống
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-[15px] text-muted-foreground font-medium">Chưa có tài liệu đính kèm cho khóa học này.</p>
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
