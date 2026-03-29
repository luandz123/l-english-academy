import StudentLayout from "@/components/StudentLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
    return `/courses/${cid}/learn`;
  };

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <Badge variant="secondary">{courseTypeMap[course.course_type] || course.course_type}</Badge>
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            Giảng viên: {course.instructor} · Thời hạn: {course.duration_months ? `${course.duration_months} tháng` : "Vĩnh viễn"}
          </p>
          <div className="flex gap-3">
            {enrollment ? (
              <Button asChild><Link to={getLessonLink()}>Tiếp tục học</Link></Button>
            ) : (
              <Button onClick={handleEnroll}>Đăng ký khóa học</Button>
            )}
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
                          {lessons.map((lesson: any) => (
                            <Link
                              key={`l-${lesson.id}`}
                              to={enrollment ? `/courses/${cid}/learn` : "#"}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm text-foreground flex-1">{lesson.title}</span>
                              {lesson.duration_seconds && (
                                <span className="text-xs text-muted-foreground">{Math.round(lesson.duration_seconds / 60)}m</span>
                              )}
                            </Link>
                          ))}
                          {quizzes.length > 0 && (
                            <>
                              <div className="border-t my-2" />
                              <p className="text-xs font-semibold text-muted-foreground px-3 py-1">PHẦN THI ONLINE</p>
                            </>
                          )}
                          {quizzes.map((quiz: any) => (
                            <Link
                              key={`q-${quiz.id}`}
                              to={enrollment ? `/courses/${cid}/quiz/${quiz.id}` : "#"}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-accent shrink-0" />
                              <span className="text-sm text-foreground flex-1">{quiz.title}</span>
                              <span className="text-xs text-muted-foreground">{quiz.total_questions} câu</span>
                              {enrollment && (
                                <Button size="sm" variant="outline" className="text-xs h-7">Làm bài</Button>
                              )}
                            </Link>
                          ))}
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
