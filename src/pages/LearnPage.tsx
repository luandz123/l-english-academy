
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, ChevronLeft, ChevronRight, Star, Check, Loader2, FileQuestion, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LearnPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cId = Number(courseId);

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ["learn-modules", cId],
    queryFn: async () => {
      const { data } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", cId)
        .order("display_order");
      return (data ?? []).map((m: any) => ({
        ...m,
        lessons: (m.lessons ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_lesson_progress").select("*").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["lesson-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_favorites").select("*").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null);

  const { data: savedNotes = [] } = useQuery({
    queryKey: ["lesson-notes", user?.id, currentLessonId],
    queryFn: async () => {
      if (!user || !currentLessonId) return [];
      const { data } = await supabase.from("user_notes").select("*").eq("user_id", user.id).eq("lesson_id", currentLessonId).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && !!currentLessonId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["lesson-materials", currentLessonId, cId],
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*")
        .or(`lesson_id.eq.${currentLessonId},and(course_id.eq.${cId},lesson_id.is.null)`)
        .order("display_order");
      return data ?? [];
    },
    enabled: !!currentLessonId,
  });

  // Fetch lesson practices (popup quizzes)
  const { data: practices = [] } = useQuery({
    queryKey: ["lesson-practices-student", currentLessonId],
    queryFn: async () => {
      if (!currentLessonId) return [];
      const { data } = await supabase.from("lesson_practices")
        .select("*, quizzes(id, title, total_questions)")
        .eq("lesson_id", currentLessonId)
        .order("trigger_at_seconds");
      return data ?? [];
    },
    enabled: !!currentLessonId,
  });

  // Popup practice state
  const [activePractice, setActivePractice] = useState<any>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [practiceCurrentQ, setPracticeCurrentQ] = useState(0);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [triggeredPractices, setTriggeredPractices] = useState<Set<number>>(new Set());
  const videoTimeRef = useRef(0);

  // Simulate video time tracking (since YouTube API is complex, use interval)
  useEffect(() => {
    if (!currentLessonId || practices.length === 0) return;
    const interval = setInterval(() => {
      videoTimeRef.current += 1;
      // Check if any practice should trigger
      for (const p of practices) {
        if (p.trigger_at_seconds > 0 && videoTimeRef.current >= p.trigger_at_seconds && !triggeredPractices.has(p.id)) {
          setTriggeredPractices(prev => new Set(prev).add(p.id));
          openPractice(p);
          break;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLessonId, practices, triggeredPractices]);

  // Reset triggers when lesson changes
  useEffect(() => {
    videoTimeRef.current = 0;
    setTriggeredPractices(new Set());
    setActivePractice(null);
  }, [currentLessonId]);

  const openPractice = async (practice: any) => {
    if (!practice.quiz_id) return;
    const { data } = await supabase.from("questions").select("*, answers(*)").eq("quiz_id", practice.quiz_id).order("display_order");
    const qs = (data ?? []).map((q: any) => ({ ...q, answers: (q.answers ?? []).sort((a: any, b: any) => a.display_order - b.display_order) }));
    setPracticeQuestions(qs);
    setPracticeAnswers({});
    setPracticeCurrentQ(0);
    setPracticeSubmitted(false);
    setActivePractice(practice);
  };

  const allLessons = useMemo(() => modules.flatMap((m: any) => m.lessons), [modules]);

  useEffect(() => {
    if (allLessons.length > 0 && !currentLessonId) {
      const completedIds = new Set(progress.filter((p: any) => p.is_completed).map((p: any) => p.lesson_id));
      const firstIncomplete = allLessons.find((l: any) => !completedIds.has(l.id));
      setCurrentLessonId(firstIncomplete?.id ?? allLessons[0].id);
    }
  }, [allLessons, progress, currentLessonId]);

  const currentLesson = allLessons.find((l: any) => l.id === currentLessonId);
  const currentIndex = allLessons.findIndex((l: any) => l.id === currentLessonId);
  const isCompleted = progress.some((p: any) => p.lesson_id === currentLessonId && p.is_completed);
  const isFavorited = favorites.some((f: any) => f.lesson_id === currentLessonId);

  const completedCount = progress.filter((p: any) => p.is_completed).length;
  const totalLessons = allLessons.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const completionMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentLessonId) return;
      const existing = progress.find((p: any) => p.lesson_id === currentLessonId);
      if (existing) {
        await supabase.from("user_lesson_progress").update({ is_completed: !existing.is_completed }).eq("id", existing.id);
      } else {
        await supabase.from("user_lesson_progress").insert({ user_id: user.id, lesson_id: currentLessonId, is_completed: true });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-progress"] }),
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentLessonId) return;
      if (isFavorited) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("lesson_id", currentLessonId);
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, lesson_id: currentLessonId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-favorites"] }),
  });

  const [noteText, setNoteText] = useState("");
  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentLessonId || !noteText.trim()) return;
      await supabase.from("user_notes").insert({ user_id: user.id, lesson_id: currentLessonId, content: noteText.trim() });
    },
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["lesson-notes"] });
      toast({ title: "Đã lưu ghi chú" });
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!currentLesson) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Khóa học chưa có nội dung.</p></div>;
  }

  const isVideoLesson = !currentLesson.lesson_type || currentLesson.lesson_type === "video";
  const isPracticeLesson = currentLesson.lesson_type === "practice" || currentLesson.lesson_type === "exam";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isVideoLesson && (
            <div className="aspect-video bg-foreground">
              <iframe
                src={currentLesson.video_url || "about:blank"}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentLesson.title}
              />
            </div>
          )}

          {isPracticeLesson && (
            <div className="p-6 bg-muted/20">
              <div className="max-w-2xl mx-auto text-center space-y-4">
                <FileQuestion className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-xl font-bold text-foreground">{currentLesson.title}</h2>
                <p className="text-muted-foreground">Bài {currentLesson.lesson_type === "exam" ? "thi online" : "luyện tập"}</p>
                <Button onClick={() => navigate(`/courses/${courseId}/quiz/${currentLessonId}`)}>
                  Bắt đầu làm bài
                </Button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-b">
            <h1 className="text-lg font-bold text-foreground mb-3">{currentLesson.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={currentIndex === 0}
                onClick={() => setCurrentLessonId(allLessons[currentIndex - 1].id)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Bài trước
              </Button>
              <Button size="sm" variant="outline" disabled={currentIndex === allLessons.length - 1}
                onClick={() => setCurrentLessonId(allLessons[currentIndex + 1].id)}>
                Bài tiếp <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button size="sm" variant={isCompleted ? "default" : "outline"} onClick={() => completionMutation.mutate()}>
                <Check className="w-4 h-4 mr-1" />
                {isCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
              </Button>
              <Button size="sm" variant={isFavorited ? "default" : "outline"} onClick={() => favoriteMutation.mutate()}>
                <Star className={`w-4 h-4 mr-1 ${isFavorited ? "fill-current" : ""}`} />
                Yêu thích
              </Button>
              {/* Manual practice buttons */}
              {practices.length > 0 && (
                <div className="flex gap-1 ml-2">
                  {practices.map((p: any) => (
                    <Button key={p.id} size="sm" variant="outline" onClick={() => openPractice(p)} className="text-xs">
                      📝 {p.title || "Luyện tập"}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="p-4">
            <Tabs defaultValue="materials">
              <TabsList>
                <TabsTrigger value="materials">Tài liệu ({materials.length})</TabsTrigger>
                <TabsTrigger value="notes">Ghi chú</TabsTrigger>
              </TabsList>
              <TabsContent value="materials" className="mt-4">
                <div className="space-y-2">
                  {materials.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1">{m.title}</span>
                      <Button size="sm" variant="outline" asChild>
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer">Tải xuống</a>
                      </Button>
                    </div>
                  ))}
                  {materials.length === 0 && <p className="text-sm text-muted-foreground">Chưa có tài liệu cho bài này.</p>}
                </div>
              </TabsContent>
              <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Nhập ghi chú..."
                    className="flex-1 min-h-[80px] rounded-lg border bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={() => noteMutation.mutate()} disabled={noteMutation.isPending}>Lưu</Button>
                </div>
                {savedNotes.map((n: any) => (
                  <div key={n.id} className="p-3 bg-card rounded-lg border">
                    <p className="text-sm text-foreground">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("vi-VN")}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 border-l bg-card overflow-y-auto max-h-screen">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold text-foreground">📋 Nội dung khóa học</p>
            <p className="text-xs text-muted-foreground mt-1">{completedCount}/{totalLessons} bài hoàn thành ({progressPct}%)</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <Accordion type="multiple" defaultValue={modules.map((_: any, i: number) => `part-${i}`)} className="px-2 py-1">
            {modules.map((mod: any, pi: number) => (
              <AccordionItem key={mod.id} value={`part-${pi}`} className="border-none">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  {mod.title}
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  {mod.lessons.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">Đang cập nhật...</p>
                  ) : (
                    mod.lessons.map((lesson: any) => {
                      const done = progress.some((p: any) => p.lesson_id === lesson.id && p.is_completed);
                      const isCurrent = currentLessonId === lesson.id;
                      const isVideo = !lesson.lesson_type || lesson.lesson_type === "video";
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setCurrentLessonId(lesson.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                            isCurrent ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                          } cursor-pointer`}
                        >
                          {done ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> :
                            isVideo ? <PlayCircle className="w-3 h-3 shrink-0" /> : <FileQuestion className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{lesson.title}</span>
                        </button>
                      );
                    })
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Practice popup panel */}
        {activePractice && practiceQuestions.length > 0 && (
          <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4 lg:items-stretch lg:justify-end">
            <div className="bg-card rounded-xl w-full max-w-lg lg:max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
                <h3 className="font-bold text-foreground text-sm">📝 {activePractice.title || "Luyện tập"}</h3>
                <Button size="icon" variant="ghost" onClick={() => setActivePractice(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-4 space-y-4">
                {!practiceSubmitted ? (
                  <>
                    <p className="text-xs text-muted-foreground">Câu {practiceCurrentQ + 1}/{practiceQuestions.length}</p>
                    {practiceQuestions[practiceCurrentQ]?.image_url && (
                      <img src={practiceQuestions[practiceCurrentQ].image_url} alt="" className="w-full rounded-lg border" />
                    )}
                    {practiceQuestions[practiceCurrentQ]?.audio_url && (
                      <audio controls src={practiceQuestions[practiceCurrentQ].audio_url} className="w-full" />
                    )}
                    <p className="text-sm font-medium text-foreground">{practiceQuestions[practiceCurrentQ]?.question_text}</p>
                    <div className="space-y-2">
                      {practiceQuestions[practiceCurrentQ]?.answers.map((a: any, i: number) => (
                        <button key={a.id} onClick={() => setPracticeAnswers(prev => ({ ...prev, [practiceCurrentQ]: a.id }))}
                          className={cn("w-full text-left p-3 rounded-lg border text-sm transition-all",
                            practiceAnswers[practiceCurrentQ] === a.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                          )}>
                          {String.fromCharCode(65 + i)}. {a.answer_text}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {practiceCurrentQ > 0 && <Button size="sm" variant="outline" onClick={() => setPracticeCurrentQ(p => p - 1)}>← Trước</Button>}
                      {practiceCurrentQ < practiceQuestions.length - 1 ? (
                        <Button size="sm" onClick={() => setPracticeCurrentQ(p => p + 1)}>Tiếp →</Button>
                      ) : (
                        <Button size="sm" onClick={() => setPracticeSubmitted(true)}>Xem kết quả</Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-bold text-foreground">Kết quả</h4>
                    {practiceQuestions.map((q: any, i: number) => {
                      const selected = practiceAnswers[i];
                      const correct = q.answers.find((a: any) => a.is_correct);
                      const isCorrect = selected === correct?.id;
                      return (
                        <div key={q.id} className={`p-3 rounded-lg border ${isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                          <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                          <p className="text-xs mt-1">
                            {isCorrect ? "✅ Đúng" : `❌ Sai — Đáp án đúng: ${correct?.answer_text}`}
                          </p>
                          {correct?.explanation && <p className="text-xs text-muted-foreground mt-1">💡 {correct.explanation}</p>}
                        </div>
                      );
                    })}
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {practiceQuestions.filter((q: any, i: number) => practiceAnswers[i] === q.answers.find((a: any) => a.is_correct)?.id).length}/{practiceQuestions.length} đúng
                      </p>
                      <Button size="sm" className="mt-2" onClick={() => setActivePractice(null)}>Đóng</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
