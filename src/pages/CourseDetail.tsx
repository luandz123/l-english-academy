import StudentLayout from "@/components/StudentLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, Lock, Headphones } from "lucide-react";
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
      const { data } = await supabase
        .from("modules")
        .select("*, lessons(*), quizzes(*)")
        .eq("course_id", cid)
        .order("display_order");
      return data || [];
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

  const handleEnroll = async () => {
    if (!user) return navigate("/login");
    const expiresAt = course?.duration_months
      ? new Date(Date.now() + course.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: cid,
      expires_at: expiresAt,
    });
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Đăng ký thành công!", description: `Bạn đã đăng ký ${course?.title}` });
      refetchEnrollment();
    }
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;
  if (!course) return <StudentLayout><p className="text-muted-foreground">Không tìm thấy khóa học.</p></StudentLayout>;

  const getLessonLink = () => {
    if (course.course_type === "flashcard") return `/courses/${cid}/vocab`;
    if (course.course_type === "fulltest") return `/courses/${cid}/fulltest`;
    
    // Auto-detect if this course ONLY has standalone quizzes and NO lessons
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
      <div className="space-y-6 max-w-4xl">
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="grid md:grid-cols-5 gap-0">
            <div className="md:col-span-2 aspect-video md:aspect-square bg-muted">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs">
                  Image placeholder
                </div>
              )}
            </div>
            <div className="md:col-span-3 p-6 space-y-4 flex flex-col justify-center">
              <div>
                <Badge variant="secondary" className="mb-2">{courseTypeMap[course.course_type] || course.course_type}</Badge>
                <h1 className="text-2xl font-bold text-foreground leading-tight">{course.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Giảng viên: <span className="text-foreground">{course.instructor}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thời hạn: {course.duration_months ? `${course.duration_months} tháng` : "Vĩnh viễn"}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                {enrollment ? (
                  <Button asChild className="shadow-sm"><Link to={getLessonLink()}>Tiếp tục học</Link></Button>
                ) : (
                  <Button onClick={handleEnroll} className="shadow-sm">Đăng ký khóa học</Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="materials">Tài liệu ({materials?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            {modules && modules.length > 0 ? (
              <Accordion type="multiple" defaultValue={["mod-0"]} className="space-y-2">
                {modules.map((mod: any, pi: number) => {
                  const lessons = (mod.lessons || []).sort((a: any, b: any) => a.display_order - b.display_order);
                  const quizzes = (mod.quizzes || []).sort((a: any, b: any) => a.display_order - b.display_order);
                  return (
                    <AccordionItem key={mod.id} value={`mod-${pi}`} className="bg-card rounded-lg border">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-sm text-foreground">{mod.title}</span>
                          <span className="text-xs text-muted-foreground">{lessons.length} bài giảng · {quizzes.length} bài thi</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="space-y-1">
                          {lessons.map((lesson: any) => {
                            const isTest = lesson.lesson_type === "exam" || lesson.lesson_type === "practice";
                            const isDictation = lesson.lesson_type === "dictation";
                            
                            const getDestUrl = () => {
                              if (!enrollment) return "#";
                              if (isTest) return `/courses/${cid}/quiz/${lesson.quiz_id || lesson.id}`;
                              if (isDictation) return `/courses/${cid}/dictation/${lesson.quiz_id || lesson.id}`;
                              return `/courses/${cid}/learn`;
                            };
                            
                            const destUrl = getDestUrl();
                            
                            const latestResult = (isTest || isDictation) ? quizResults?.find(r => r.quiz_id === (lesson.quiz_id || lesson.id)) : null;
                            
                            return (
                              <Link
                                key={`l-${lesson.id}`}
                                to={destUrl}
                                className={cn(
                                  "flex justify-between items-center px-4 py-3 rounded-xl border transition-all hover:bg-muted/50",
                                  (isTest || isDictation) ? "bg-muted/10 border-border" : "border-transparent hover:border-border"
                                )}
                              >
                                <div className="flex items-center gap-3 opacity-90">
                                  {isDictation ? (
                                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                      <Headphones className="w-4 h-4 text-purple-500" />
                                    </div>
                                  ) : isTest ? (
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4 text-orange-500" />
                                    </div>
                                  ) : (
                                    <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-sm text-foreground font-medium line-clamp-1">{lesson.title}</span>
                                    {isTest && <span className="text-xs text-muted-foreground">Bài {lesson.lesson_type === "exam" ? "thi online" : "luyện tập"}</span>}
                                    {isDictation && <span className="text-xs text-muted-foreground">Luyện nghe điền từ</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {(isTest || isDictation) ? (
                                    <>
                                      {latestResult ? (
                                        <div className="flex flex-col items-end hidden sm:flex">
                                          {isDictation ? (
                                            <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                              Đã làm: {latestResult.correct_answers || 0}
                                            </span>
                                          ) : (
                                            <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                              Điểm: {latestResult.score}/10
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline-block">
                                          Chưa làm
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-primary whitespace-nowrap ml-2">Tới bài</span>
                                    </>
                                  ) : (
                                    lesson.duration_seconds > 0 && (
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(lesson.duration_seconds / 60)}m</span>
                                    )
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                          {quizzes.length > 0 && (
                            <>
                              <div className="border-t my-2" />
                              <p className="text-xs font-semibold text-muted-foreground px-3 py-1">PHẦN THI ONLINE</p>
                            </>
                          )}
                          {quizzes.map((quiz: any) => {
                            const latestResult = quizResults?.find(r => r.quiz_id === quiz.id);

                            return (
                              <Link
                                key={`q-${quiz.id}`}
                                to={enrollment ? `/courses/${cid}/quiz/${quiz.id}` : "#"}
                                className="flex justify-between items-center px-4 py-3 bg-muted/20 hover:bg-muted/50 rounded-xl border transition-all"
                              >
                                <div className="flex items-center gap-3 opacity-90">
                                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-accent" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground line-clamp-1">{quiz.title}</span>
                                    <span className="text-xs text-muted-foreground">{quiz.total_questions} câu hỏi</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {latestResult ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                        Điểm: {latestResult.score}/10
                                      </span>
                                      <span className="text-[10px] text-muted-foreground mt-0.5">
                                        Đúng {latestResult.correct_answers}/{latestResult.total_questions}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                      Chưa làm
                                    </span>
                                  )}
                                  {enrollment && (
                                    <Button size="sm" variant={latestResult ? "outline" : "default"} className="text-xs h-7 ml-2">
                                      {latestResult ? "Làm lại" : "Làm bài"}
                                    </Button>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="bg-card rounded-xl border p-6 text-center">
                <p className="text-sm text-muted-foreground">Nội dung đang được cập nhật...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-bold text-foreground">Giới thiệu khóa học</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description || "Chưa có mô tả."}</p>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="mt-4">
            <div className="bg-card rounded-xl border p-6">
              {materials && materials.length > 0 ? (
                <div className="space-y-2">
                  {materials.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1 text-foreground">{m.title}</span>
                      <Button size="sm" variant="outline" asChild>
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer">Tải xuống</a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có tài liệu.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default CourseDetail;
