import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, Lock, ChevronLeft, ChevronRight, Star, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const LearnPage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cId = Number(courseId);

  // Fetch modules with lessons
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

  // Fetch user progress
  const { data: progress = [] } = useQuery({
    queryKey: ["lesson-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_lesson_progress")
        .select("*")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["lesson-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("user_favorites").select("*").eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch user notes for current lesson
  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null);

  const { data: savedNotes = [] } = useQuery({
    queryKey: ["lesson-notes", user?.id, currentLessonId],
    queryFn: async () => {
      if (!user || !currentLessonId) return [];
      const { data } = await supabase
        .from("user_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", currentLessonId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && !!currentLessonId,
  });

  // Fetch materials for current lesson
  const { data: materials = [] } = useQuery({
    queryKey: ["lesson-materials", currentLessonId, cId],
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("*")
        .or(`lesson_id.eq.${currentLessonId},and(course_id.eq.${cId},lesson_id.is.null)`)
        .order("display_order");
      return data ?? [];
    },
    enabled: !!currentLessonId,
  });

  // Flatten all lessons
  const allLessons = useMemo(() => modules.flatMap((m: any) => m.lessons), [modules]);

  // Set initial lesson
  useEffect(() => {
    if (allLessons.length > 0 && !currentLessonId) {
      // Find first incomplete lesson or first lesson
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

  // Toggle completion
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

  // Toggle favorite
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

  // Save note
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Khóa học chưa có nội dung.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        {/* Video area */}
        <div className="flex-1 min-w-0">
          <div className="aspect-video bg-foreground">
            <iframe
              src={currentLesson.video_url || "about:blank"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentLesson.title}
            />
          </div>

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
            </div>
          </div>

          {/* Tabs */}
          <div className="p-4">
            <Tabs defaultValue="materials">
              <TabsList>
                <TabsTrigger value="materials">Tài liệu ({materials.length})</TabsTrigger>
                <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                <TabsTrigger value="discussion">Thảo luận</TabsTrigger>
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
                    placeholder="Nhập ghi chú của bạn..."
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
              <TabsContent value="discussion" className="mt-4">
                <p className="text-sm text-muted-foreground">Tính năng thảo luận sẽ được cập nhật sớm.</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Course sidebar */}
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
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setCurrentLessonId(lesson.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                            isCurrent ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                          } cursor-pointer`}
                        >
                          {done ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> : <PlayCircle className="w-3 h-3 shrink-0" />}
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
      </div>
    </div>
  );
};

export default LearnPage;
