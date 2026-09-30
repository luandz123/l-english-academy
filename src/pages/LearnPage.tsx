
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, CheckCircle, ChevronLeft, ChevronRight, Check, Loader2, FileQuestion, X, Headphones, PanelRightClose, PanelRight, Keyboard, Trophy, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import DictationPage from "./DictationPage";
import GamificationChips from "@/components/GamificationChips";
import ErrorState from "@/components/ErrorState";

const LearnPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cId = Number(courseId);

  const { data: enrollment } = useQuery({
    queryKey: ["learn-enrollment", user?.id, cId, isAdmin],
    queryFn: async () => {
      if (!user) return null;
      if (isAdmin) return { id: 0, user_id: user.id, course_id: cId, enrolled: true };
      const { data } = await supabase.from("enrollments").select("*").eq("user_id", user.id).eq("course_id", cId).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: course, isError: isCourseError, refetch: refetchCourse } = useQuery({
    queryKey: ["learn-course", cId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", cId).maybeSingle();
      return data;
    },
  });

  const { data: modules = [], isLoading, isError: isModulesError, refetch: refetchModules } = useQuery({
    queryKey: ["learn-modules", cId],
    queryFn: async () => {
      const { data } = await (supabase.from("modules") as any)
        .select("*, lessons(*)")
        .eq("course_id", cId)
        .order("display_order");

      if (!data) return [];

      return data
        .filter((m: any) => m.is_published !== false)
        .map((m: any) => ({
          ...m,
          lessons: (m.lessons ?? [])
            .filter((l: any) => l.is_published !== false)
            .sort((a: any, b: any) => a.display_order - b.display_order),
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

  const { data: quizResults = [] } = useQuery({
    queryKey: ["learn-quiz-results", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_quiz_results")
        .select("quiz_id, score, correct_answers, total_questions")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });
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
        .eq("lesson_id", currentLessonId)
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

  // B1: Sidebar collapse state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('learnpage-sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('learnpage-sidebar-collapsed', String(next)); } catch { /* ignore storage error */ }
    return next;
  });

  // A4: Module completion modal
  const [moduleCompleteModal, setModuleCompleteModal] = useState<{ moduleName: string; nextModuleName?: string } | null>(null);

  // A3: Exit confirm modal
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // A3: Keyboard shortcuts tooltip
  const [showShortcuts, setShowShortcuts] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      // A4: Check if this is the last lesson in a module
      const currentModule = modules.find((m: any) => m.lessons.some((l: any) => l.id === currentLessonId));
      const currentModuleIdx = modules.findIndex((m: any) => m.id === currentModule?.id);
      const isLastInModule = currentModule && currentModule.lessons[currentModule.lessons.length - 1]?.id === currentLessonId;
      const existing = progress.find((p: any) => p.lesson_id === currentLessonId);
      const wasCompleted = existing?.is_completed;
      if (isLastInModule && !wasCompleted) {
        const nextModule = modules[currentModuleIdx + 1];
        setModuleCompleteModal({ moduleName: currentModule.title, nextModuleName: nextModule?.title });
      }
    },
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

  // Restore draft note for current lesson
  useEffect(() => {
    if (!currentLessonId) return;
    try {
      const draft = localStorage.getItem(`lenglish_draft_note_${currentLessonId}_${user?.id || 'guest'}`);
      setNoteText(draft || "");
    } catch {
      setNoteText("");
    }
  }, [currentLessonId, user?.id]);

  // Handle note typing with draft autosave
  const handleNoteChange = (text: string) => {
    setNoteText(text);
    if (!currentLessonId) return;
    try {
      if (text.trim()) {
        localStorage.setItem(`lenglish_draft_note_${currentLessonId}_${user?.id || 'guest'}`, text);
      } else {
        localStorage.removeItem(`lenglish_draft_note_${currentLessonId}_${user?.id || 'guest'}`);
      }
    } catch {
      /* ignore storage error */
    }
  };

  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !currentLessonId || !noteText.trim()) return;
      await supabase.from("user_notes").insert({ user_id: user.id, lesson_id: currentLessonId, content: noteText.trim() });
    },
    onSuccess: () => {
      setNoteText("");
      try {
        localStorage.removeItem(`lenglish_draft_note_${currentLessonId}_${user?.id || 'guest'}`);
      } catch {
        /* ignore */
      }
      queryClient.invalidateQueries({ queryKey: ["lesson-notes"] });
      toast({ title: "Đã lưu ghi chú" });
    },
  });

  // A3: Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
      if (activePractice) return;
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentLessonId(allLessons[currentIndex - 1].id);
      } else if (e.key === 'ArrowRight' && currentIndex < allLessons.length - 1) {
        e.preventDefault();
        setCurrentLessonId(allLessons[currentIndex + 1].id);
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        completionMutation.mutate();
      } else if (e.key === 'Escape') {
        setShowExitConfirm(true);
      } else if (e.key === '?') {
        setShowShortcuts(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allLessons, activePractice, completionMutation]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[var(--duo-blue)]" /></div>;
  }

  if (isModulesError || isCourseError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ErrorState
          onRetry={() => {
            refetchModules();
            refetchCourse();
          }}
        />
      </div>
    );
  }

  if (!currentLesson) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-extrabold text-xl">🦉 Khóa học chưa có nội dung.</p></div>;
  }

  const isVideoLesson = (!currentLesson.lesson_type || currentLesson.lesson_type === "video") && currentLesson.video_url;
  const isPdfLesson = (!currentLesson.lesson_type || currentLesson.lesson_type === "video") && currentLesson.pdf_url;
  const isPracticeLesson = currentLesson.lesson_type === "practice" || currentLesson.lesson_type === "exam";
  const isDictationLesson = currentLesson.lesson_type === "dictation";

  // Convert any YouTube URL format to embeddable URL
  const getEmbedUrl = (url: string): string => {
    if (!url) return url;
    try {
      // Already an embed URL
      if (url.includes("youtube.com/embed/")) return url;
      // youtu.be/VIDEO_ID
      const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
      // youtube.com/watch?v=VIDEO_ID
      const watchMatch = url.match(/[?&]v=([^&]+)/);
      if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&]+)/);
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    } catch { /* ignore parsing error */ }
    return url;
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden relative bg-background">
      <div className="relative z-10 flex flex-col lg:flex-row h-full">
        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background">
          {/* Top Header */}
          <div className="h-16 px-4 lg:px-6 border-b-2 border-border bg-card flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-muted rounded-xl shrink-0 text-muted-foreground hover:text-foreground font-bold"
                onClick={() => setShowExitConfirm(true)}
                title="Thoát bài học"
                aria-label="Thoát bài học"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-bold">Thoát</span>
              </Button>
              <div className="w-px h-6 bg-border shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                  Bài {currentIndex + 1} / {allLessons.length}
                </span>
                <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate max-w-[150px] sm:max-w-[300px] md:max-w-[450px] lg:max-w-[600px]" title={currentLesson.title}>
                  {currentLesson.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <GamificationChips />
              {/* Sidebar toggle button */}
              <Button size="sm" variant="outline" className="btn-3d btn-3d-white flex items-center gap-2 text-xs sm:text-sm font-extrabold h-9 px-3" onClick={toggleSidebar}>
                {sidebarCollapsed ? <PanelRight className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                <span className="hidden sm:inline">{sidebarCollapsed ? "Hiện mục lục" : "Thu gọn mục lục"}</span>
                <span className="sm:hidden">Mục lục</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-background">
            {/* YouTube/PDF Player */}
            {(isVideoLesson || isPdfLesson) && (
              <div className="overflow-hidden rounded-2xl border-4 border-border bg-muted/10 max-w-4xl mx-auto w-full shadow-sm">
                {isVideoLesson && isPdfLesson ? (
                  <Tabs defaultValue="video" className="w-full">
                    <div className="bg-card border-b p-2">
                      <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="video" className="font-bold text-xs sm:text-sm">🎬 Xem Video</TabsTrigger>
                        <TabsTrigger value="pdf" className="font-bold text-xs sm:text-sm">📄 Đọc Tài liệu PDF</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="video" className="m-0 border-none outline-none focus-visible:ring-0">
                      <div className="aspect-video bg-black max-h-[70vh]">
                        <iframe
                          src={getEmbedUrl(currentLesson.video_url)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentLesson.title}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="pdf" className="m-0 border-none outline-none focus-visible:ring-0">
                      <div className="w-full h-[75vh] bg-muted">
                        <iframe
                          src={`${currentLesson.pdf_url}#toolbar=0`}
                          className="w-full h-full border-none"
                          title={currentLesson.title}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : isVideoLesson ? (
                  <div className="aspect-video bg-black max-h-[70vh]">
                    <iframe
                      src={getEmbedUrl(currentLesson.video_url)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={currentLesson.title}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[75vh] bg-muted">
                    <iframe
                      src={`${currentLesson.pdf_url}#toolbar=0`}
                      className="w-full h-full border-none"
                      title={currentLesson.title}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Banner for manual practices */}
            {practices.length > 0 && (
              <div className="bg-[var(--duo-orange)]/10 border-2 border-[var(--duo-orange)]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">📝</span>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-[var(--duo-orange)]">Bài tập thực hành đính kèm</h4>
                    <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-0.5">Hãy hoàn thành các bài tập này để tự đánh giá mức độ tiếp thu bài học nhé!</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  {practices.map((p: any) => (
                    <Button
                      key={p.id}
                      className="btn-3d bg-[var(--duo-orange)] hover:bg-[var(--duo-orange)]/90 text-white border-[#E58700] text-xs sm:text-sm font-extrabold py-2 px-4 h-10 w-full sm:w-auto shrink-0"
                      onClick={() => openPractice(p)}
                    >
                      {p.title || "Làm bài tập 🚀"}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isPracticeLesson && (() => {
              const quizId = currentLesson.quiz_id || currentLesson.id;
              const latestResult = quizResults.find((r: any) => r.quiz_id === quizId);

              return (
                <div className="p-4 flex items-center justify-center min-h-[40vh] max-w-4xl mx-auto w-full">
                  <div className="card-duo w-full text-center space-y-6 p-6 sm:p-8 bg-card shadow-sm border-2">
                    <div className="w-20 h-20 bg-[var(--duo-blue)]/10 rounded-full flex items-center justify-center mx-auto border-4 border-[var(--duo-blue)]/20">
                      <FileQuestion className="w-10 h-10 text-[var(--duo-blue)]" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">{currentLesson.title}</h2>
                    <p className="text-muted-foreground font-bold text-sm sm:text-base">Bài {currentLesson.lesson_type === "exam" ? "thi online 🏆" : "luyện tập 🎯"}</p>

                    {latestResult && (
                      <div className="flex flex-col items-center justify-center gap-1.5 mb-4">
                        <span className="text-base font-extrabold text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-5 py-2.5 rounded-xl border-2 border-[var(--duo-correct)]/20">
                          Điểm gần nhất: {latestResult.score}/10 ⭐
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          Đúng {latestResult.correct_answers}/{latestResult.total_questions} câu
                        </span>
                      </div>
                    )}

                    <Button className="btn-3d btn-3d-primary w-full sm:w-auto text-base px-8 py-4 h-auto" onClick={() => navigate(`/courses/${courseId}/quiz/${quizId}`)}>
                      {latestResult ? "Làm lại bài thi 🔄" : "Bắt đầu làm bài 🚀"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {isDictationLesson && (
              <div className="w-full max-w-5xl mx-auto">
                <DictationPage
                  embedded={true}
                  courseId={String(courseId)}
                  lessonId={String(currentLesson.id)}
                  quizId={String(currentLesson.quiz_id || currentLesson.id)}
                  onLessonComplete={() => completionMutation.mutate()}
                  onNextLesson={() => {
                    if (currentIndex < allLessons.length - 1) {
                      setCurrentLessonId(allLessons[currentIndex + 1].id);
                    }
                  }}
                />
              </div>
            )}

            {/* Tabs for Description, Materials, Notes */}
            <div className="max-w-4xl mx-auto w-full">
              <Tabs defaultValue="description" className="w-full bg-card rounded-2xl border-2 border-border shadow-sm overflow-hidden">
                <TabsList className="flex border-b bg-muted/20 p-0 h-11 rounded-none">
                  <TabsTrigger value="description" className="flex-1 font-extrabold text-xs sm:text-sm h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--duo-blue)] data-[state=active]:bg-card">
                    📖 Mô tả
                  </TabsTrigger>
                  <TabsTrigger value="materials" className="flex-1 font-extrabold text-xs sm:text-sm h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--duo-blue)] data-[state=active]:bg-card">
                    📎 Tài liệu ({materials.length})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1 font-extrabold text-xs sm:text-sm h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--duo-blue)] data-[state=active]:bg-card">
                    📝 Ghi chú ({savedNotes.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="description" className="p-5 sm:p-6 focus-visible:outline-none">
                  <p className="text-sm sm:text-base font-semibold text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {currentLesson.description || "Chưa có mô tả cho bài học này. 🤫"}
                  </p>
                </TabsContent>

                <TabsContent value="materials" className="p-5 sm:p-6 focus-visible:outline-none space-y-3">
                  {materials.length === 0 ? (
                    <p className="text-xs sm:text-sm font-bold text-muted-foreground text-center py-4">Bài học này chưa đính kèm tài liệu nào. 📁</p>
                  ) : (
                    <div className="grid gap-3">
                      {materials.map((m: any) => (
                        <a
                          key={m.id}
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl shrink-0">
                              {m.file_url?.endsWith(".pdf") ? "📄" : m.file_url?.match(/\.(mp3|wav|ogg)$/i) ? "🎵" : "🔗"}
                            </span>
                            <div className="min-w-0">
                              <p className="font-extrabold text-foreground text-xs sm:text-sm truncate">{m.title || "Tài liệu đính kèm"}</p>
                              {m.description && <p className="text-xs sm:text-xs text-muted-foreground font-semibold mt-0.5 truncate">{m.description}</p>}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="btn-3d btn-3d-white text-xs px-2.5 py-1 h-7 shrink-0">Tải xuống</Button>
                        </a>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="p-5 sm:p-6 focus-visible:outline-none space-y-4">
                  <div className="space-y-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      placeholder="Viết ghi chú của bạn cho bài học này tại đây..."
                      className="w-full min-h-[90px] p-3 rounded-xl border-2 border-border focus:border-[var(--duo-blue)] focus:outline-none font-bold text-xs sm:text-sm bg-background resize-y"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => noteMutation.mutate()}
                        disabled={!noteText.trim() || noteMutation.isPending}
                        className="btn-3d btn-3d-primary py-2 px-5 h-8 text-xs font-extrabold"
                      >
                        {noteMutation.isPending ? "Đang lưu..." : "Lưu ghi chú 💾"}
                      </Button>
                    </div>
                  </div>

                  {savedNotes.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <h4 className="text-xs font-extrabold text-foreground">Ghi chú đã lưu:</h4>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {savedNotes.map((note: any) => (
                          <div key={note.id} className="p-3 rounded-xl border bg-muted/10 relative group">
                            <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-pre-wrap">{note.content}</p>
                            <span className="text-xs text-muted-foreground font-bold mt-1.5 block">
                              {new Date(note.created_at).toLocaleDateString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Sticky Bottom Navigation Bar */}
          <div className="h-16 px-4 sm:px-6 border-t-2 border-border bg-card flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              className="btn-3d btn-3d-white text-xs sm:text-sm font-extrabold h-9 px-3 sm:px-4"
              disabled={currentIndex === 0}
              onClick={() => setCurrentLessonId(allLessons[currentIndex - 1].id)}
            >
              <ChevronLeft className="w-4 h-4 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Bài trước</span>
              <span className="sm:hidden">Trước</span>
            </Button>
            
            <Button
              className={cn(
                "btn-3d text-xs sm:text-sm font-extrabold h-9 px-4 sm:px-6 transition-all",
                isCompleted ? "btn-3d-green" : "btn-3d-primary"
              )}
              onClick={() => completionMutation.mutate()}
            >
              <Check className="w-4 h-4 mr-1 sm:mr-2" />
              {isCompleted ? (
                <>
                  <span className="hidden sm:inline">Bài học đã hoàn thành</span>
                  <span className="sm:hidden">Đã hoàn thành</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Hoàn thành bài học</span>
                  <span className="sm:hidden">Hoàn thành</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="btn-3d btn-3d-white text-xs sm:text-sm font-extrabold h-9 px-3 sm:px-4"
              disabled={currentIndex === allLessons.length - 1}
              onClick={() => setCurrentLessonId(allLessons[currentIndex + 1].id)}
            >
              <span className="hidden sm:inline">Bài tiếp theo</span>
              <span className="sm:hidden">Tiếp</span>
              <ChevronRight className="w-4 h-4 ml-0.5 sm:ml-1" />
            </Button>
          </div>
        </div>

        {/* Sidebar (B1: Conditionally collapsed with smooth transition properties) */}
        <div className={cn(
          "w-full lg:w-[350px] lg:border-l-2 border-border bg-card flex flex-col lg:h-full transition-all duration-300",
          sidebarCollapsed ? "lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-l-0" : "lg:w-[350px]"
        )}>
          <div className="h-16 px-6 border-b flex items-center bg-card sticky top-0 z-10 justify-between shrink-0">
            <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">📋 Nội dung khóa học</h2>
          </div>
          <div className="p-6 pt-2 border-b shrink-0 bg-card/50">
            <div className="flex items-center justify-between text-sm font-bold text-muted-foreground mb-2">
              <span>{completedCount}/{totalLessons} bài</span>
              <span className="text-[var(--duo-correct)]">{progressPct}%</span>
            </div>
            <div className="progress-duo h-3 bg-muted border-2">
              <div className="h-full bg-[var(--duo-correct)] transition-all rounded-full" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Accordion
              type="multiple"
              defaultValue={modules.reduce((acc: string[], mod: any, pi: number) => {
                if (mod.lessons.some((l: any) => l.id === currentLessonId)) acc.push(`part-${pi}`);
                return acc;
              }, [])}
              className="space-y-4"
            >
            {modules.map((mod: any, pi: number) => (
              <AccordionItem key={mod.id} value={`part-${pi}`} className="border-none bg-card rounded-2xl overflow-hidden shadow-[0_2px_0_var(--border)] border-2">
                <AccordionTrigger className="py-4 px-5 text-base font-extrabold hover:no-underline hover:bg-muted/30 transition-colors">
                  <span className="text-left">{mod.title}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 px-3">
                  {mod.lessons.length === 0 ? (
                    <p className="text-sm font-bold text-muted-foreground px-3 py-2">Đang cập nhật... ⏳</p>
                  ) : (
                    <div className="space-y-2 mt-2 relative">
                      {/* Vertical stepper timeline connector */}
                      <div className="absolute left-[30px] -translate-x-1/2 top-8 bottom-8 w-[3px] bg-muted-foreground/30 dark:bg-muted-foreground/50 z-0" />

                      {mod.lessons.map((lesson: any, lessonIdx: number) => {
                        const globalIdx = allLessons.findIndex((al: any) => al.id === lesson.id);
                        const done = progress.some((p: any) => p.lesson_id === lesson.id && p.is_completed);
                        const isCurrent = currentLessonId === lesson.id;
                        const isVideo = !lesson.lesson_type || lesson.lesson_type === "video";
                        const isDictation = lesson.lesson_type === "dictation";
                        const canStudy = enrollment || (course as any)?.is_free || mod.is_free || lesson.is_free;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              if (canStudy) {
                                  setCurrentLessonId(lesson.id);
                              } else {
                                toast({
                                  title: "Nội dung có phí 🔒",
                                  description: "Vui lòng đăng ký khóa học để xem bài học này.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className={`w-full flex items-start gap-3 px-3 py-3.5 rounded-xl text-sm font-bold transition-all text-left border-2 relative z-10 ${isCurrent
                                ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-[0_3px_0_var(--duo-blue-dark)] -translate-y-0.5"
                                : "text-muted-foreground border-transparent hover:bg-muted/50 hover:border-border/60 bg-card"
                              } cursor-pointer`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 text-[13px] font-black relative z-10 transition-all ${isCurrent
                                ? 'bg-white text-[var(--duo-blue)] border-white shadow-[0_2px_0_rgba(0,0,0,0.12)]'
                                : done
                                  ? 'bg-[var(--duo-correct)] text-white border-[var(--duo-correct-dark)] shadow-[0_2.5px_0_var(--duo-correct-dark)]'
                                  : 'bg-card border-muted-foreground/35 text-foreground shadow-[0_2.5px_0_var(--border)]'
                              }`}>
                              {done ? <Check className="w-4.5 h-4.5" strokeWidth={3.5} /> : (lessonIdx + 1).toString().padStart(2, '0')}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className={`block text-[15px] font-extrabold leading-snug truncate ${isCurrent ? 'text-white' : 'text-foreground'}`}>
                                {lesson.title}
                              </span>
                              <span className={`text-xs uppercase font-extrabold flex items-center gap-1.5 mt-0.5 ${isCurrent ? 'text-white/60' : 'text-muted-foreground'}`}>
                                {isVideo ? <PlayCircle className="w-3.5 h-3.5" /> : isDictation ? <Headphones className="w-3.5 h-3.5" /> : <FileQuestion className="w-3.5 h-3.5" />}
                                <span>Bài tổng thể {(globalIdx + 1).toString().padStart(2, '0')}</span>
                              </span>
                            </div>

                            {!canStudy ? (
                              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              canStudy && !enrollment && <span className="badge-duo text-xs py-0.5 px-1.5 shrink-0" style={{ backgroundColor: 'var(--duo-correct)', color: 'white', borderColor: 'var(--duo-correct-dark)' }}>FREE</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          </div>
        </div>
      </div>

      {/* Practice popup panel */}
        {activePractice && practiceQuestions.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm lg:items-stretch lg:justify-end">
            <div className="card-duo w-full max-w-xl lg:max-w-md lg:h-full lg:rounded-none max-h-[90vh] lg:max-h-screen flex flex-col p-0 overflow-hidden shadow-2xl">
              <div className="sticky top-0 bg-card border-b-2 p-5 flex items-center justify-between z-10">
                <h3 className="text-xl font-extrabold text-[var(--duo-orange)] flex items-center gap-2">📝 {activePractice.title || "Luyện tập nhanh"}</h3>
                <Button size="icon" variant="ghost" className="hover:bg-muted rounded-full" onClick={() => setActivePractice(null)}><X className="w-6 h-6 text-muted-foreground" /></Button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-muted/10">
                {!practiceSubmitted ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="progress-duo h-3 flex-1 bg-muted border-2">
                        <div className="h-full bg-[var(--duo-blue)] rounded-full transition-all" style={{ width: `${((practiceCurrentQ) / practiceQuestions.length) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[var(--duo-blue)]">{practiceCurrentQ + 1}/{practiceQuestions.length}</span>
                    </div>

                    {practiceQuestions[practiceCurrentQ]?.image_url && (
                      <img src={practiceQuestions[practiceCurrentQ].image_url} alt="" className="w-full rounded-2xl border-2 shadow-sm" />
                    )}
                    {practiceQuestions[practiceCurrentQ]?.audio_url && (
                      <audio controls src={practiceQuestions[practiceCurrentQ].audio_url} className="w-full rounded-full mt-4" />
                    )}

                    <h4 className="text-xl font-extrabold text-foreground leading-snug">{practiceQuestions[practiceCurrentQ]?.question_text}</h4>

                    <div className="space-y-3">
                      {practiceQuestions[practiceCurrentQ]?.answers.map((a: any, i: number) => (
                        <button key={a.id} onClick={() => setPracticeAnswers(prev => ({ ...prev, [practiceCurrentQ]: a.id }))}
                          className={cn("w-full text-left p-4 rounded-2xl border-2 text-base font-bold transition-all flex items-center gap-4 bg-card",
                            practiceAnswers[practiceCurrentQ] === a.id ? "border-[var(--duo-blue)] bg-[var(--duo-blue)]/5 text-[var(--duo-blue)] shadow-[0_4px_0_var(--duo-blue)] -translate-y-1" : "border-border hover:bg-muted/50 hover:border-border shadow-[0_4px_0_transparent]"
                          )}>
                          <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm border-2 shrink-0", practiceAnswers[practiceCurrentQ] === a.id ? "border-[var(--duo-blue)] bg-white" : "border-border bg-muted/50 text-muted-foreground")}>{String.fromCharCode(65 + i)}</span>
                          <span>{a.answer_text}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-6">
                      {practiceCurrentQ > 0 && <Button className="btn-3d btn-3d-white flex-1 py-6 text-base h-auto" onClick={() => setPracticeCurrentQ(p => p - 1)}>← Quay lại</Button>}
                      {practiceCurrentQ < practiceQuestions.length - 1 ? (
                        <Button className="btn-3d btn-3d-primary flex-1 py-6 text-base h-auto" onClick={() => setPracticeCurrentQ(p => p + 1)} disabled={!practiceAnswers[practiceCurrentQ]}>Tiếp tục →</Button>
                      ) : (
                        <Button className="btn-3d btn-3d-green flex-1 py-6 text-base h-auto" onClick={() => setPracticeSubmitted(true)} disabled={!practiceAnswers[practiceCurrentQ]}>Nộp bài 🏁</Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-3 mb-8">
                      <div className="w-24 h-24 bg-[var(--duo-correct)]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[var(--duo-correct)]/20 shadow-[0_4px_0_var(--duo-correct-dark)]/20">
                        <CheckCircle className="w-12 h-12 text-[var(--duo-correct)]" />
                      </div>
                      <h4 className="text-3xl font-extrabold text-foreground">Hoàn thành! 🎉</h4>
                      <p className="text-lg font-extrabold text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 inline-block px-6 py-3 rounded-2xl border-2 border-[var(--duo-correct)]/20 shadow-sm mt-2">
                        Đúng {practiceQuestions.filter((q: any, i: number) => practiceAnswers[i] === q.answers.find((a: any) => a.is_correct)?.id).length}/{practiceQuestions.length} câu
                      </p>
                    </div>

                    <div className="space-y-4">
                      {practiceQuestions.map((q: any, i: number) => {
                        const selected = practiceAnswers[i];
                        const correct = q.answers.find((a: any) => a.is_correct);
                        const isCorrect = selected === correct?.id;
                        return (
                          <div key={q.id} className={`p-5 rounded-2xl border-2 bg-card ${isCorrect ? "border-[var(--duo-correct)]/30" : "border-[var(--duo-red)]/30"}`}>
                            <p className="text-base font-extrabold mb-4 text-foreground">Câu {i + 1}: {q.question_text}</p>

                            <div className="space-y-3">
                              <p className="text-sm font-bold flex items-start gap-3 text-muted-foreground">
                                <span className="w-auto px-2 py-1 h-6 rounded-md bg-muted flex items-center justify-center border text-xs shrink-0">Bạn chọn</span>
                                <span className="flex-1 mt-0.5">{q.answers.find((a: any) => a.id === selected)?.answer_text || "Chưa chọn"}</span>
                                {isCorrect ? <Check className="w-5 h-5 text-[var(--duo-correct)] shrink-0" /> : <X className="w-5 h-5 text-[var(--duo-red)] shrink-0" />}
                              </p>
                              {!isCorrect && (
                                <p className="text-sm font-bold flex items-start gap-3 text-[var(--duo-correct)] bg-[var(--duo-correct)]/5 p-2 rounded-lg border border-[var(--duo-correct)]/10">
                                  <span className="w-auto px-2 py-1 h-6 rounded-md bg-[var(--duo-correct)]/10 border-[var(--duo-correct)]/20 flex items-center justify-center border text-xs text-[var(--duo-correct)] shrink-0">Đúng</span>
                                  <span className="flex-1 mt-0.5">{correct?.answer_text}</span>
                                </p>
                              )}
                            </div>

                            {(correct?.explanation || q.translation) && (
                              <div className="mt-4 pt-4 border-t-2 space-y-3">
                                {correct?.explanation && <p className="text-sm font-bold text-muted-foreground"><span className="text-[var(--duo-yellow)] mr-1">💡 Giải thích:</span> {correct.explanation}</p>}
                                {q.translation && <p className="text-sm font-bold text-[var(--duo-blue)]"><span className="mr-1">🇻🇳 Dịch:</span> {q.translation}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-6 border-t-2 mt-8">
                      <Button className="btn-3d btn-3d-primary w-full py-6 text-lg h-auto" onClick={() => setActivePractice(null)}>Đóng và học tiếp 🚀</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* A3: Exit Confirm Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="card-duo p-6 max-w-sm w-full space-y-4 bg-card text-center animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-xl text-foreground">Bạn muốn rời khỏi bài học?</h3>
            <p className="text-sm font-semibold text-muted-foreground">Tiến độ bài học hiện tại của bạn sẽ được lưu giữ tự động.</p>
            <div className="flex gap-3 pt-2">
              <Button className="btn-3d btn-3d-white flex-1 py-3 text-sm font-bold" onClick={() => setShowExitConfirm(false)}>Ở lại học</Button>
              <Button className="btn-3d btn-3d-primary flex-1 py-3 text-sm font-bold" onClick={() => navigate("/profile")}>Rời đi</Button>
            </div>
          </div>
        </div>
      )}

      {/* A4: Module Complete Modal */}
      {moduleCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="card-duo p-8 max-w-md w-full space-y-6 bg-card text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="text-6xl animate-bounce">🏆🎉</div>
            <h3 className="font-extrabold text-2xl text-foreground">Hoàn Thành Module!</h3>
            <p className="text-sm font-bold text-muted-foreground">
              Chúc mừng bạn đã chinh phục xong module:
              <span className="block text-foreground font-black text-lg mt-2 p-3 bg-muted rounded-2xl border-2">
                {moduleCompleteModal.moduleName}
              </span>
            </p>
            {moduleCompleteModal.nextModuleName ? (
              <p className="text-sm font-semibold text-muted-foreground">
                Tiếp theo: <strong className="text-foreground">{moduleCompleteModal.nextModuleName}</strong>
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Bạn đã hoàn thành module cuối cùng của khóa học này! 🥳</p>
            )}
            <div className="flex flex-col gap-3 pt-4">
              {moduleCompleteModal.nextModuleName ? (
                <Button
                  className="btn-3d btn-3d-green w-full py-4 text-base font-extrabold"
                  onClick={() => {
                    const currentModuleIdx = modules.findIndex((m: any) => m.title === moduleCompleteModal.moduleName);
                    const nextModule = modules[currentModuleIdx + 1];
                    if (nextModule?.lessons?.[0]) {
                      setCurrentLessonId(nextModule.lessons[0].id);
                    }
                    setModuleCompleteModal(null);
                  }}
                >
                  Học module tiếp theo →
                </Button>
              ) : (
                <Button
                  className="btn-3d btn-3d-primary w-full py-4 text-base font-extrabold"
                  onClick={() => {
                    setModuleCompleteModal(null);
                    navigate("/#section-video");
                  }}
                >
                  Về danh sách khóa học
                </Button>
              )}
              <button
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mt-2"
                onClick={() => setModuleCompleteModal(null)}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A3: Keyboard shortcuts helper button & panel */}
      <div className="fixed bottom-4 right-4 z-40 hidden md:block">
        <button
          onClick={() => setShowShortcuts(v => !v)}
          className="w-10 h-10 rounded-full bg-card border-2 border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Phím tắt bàn phím (?)"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        {showShortcuts && (
          <div className="absolute bottom-12 right-0 w-64 bg-card border-2 border-border p-4 rounded-2xl shadow-xl space-y-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm flex items-center gap-1.5"><Keyboard className="w-4 h-4 text-[var(--duo-blue)]" /> Phím tắt</span>
              <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bài tiếp theo</span>
                <kbd className="px-1.5 py-0.5 bg-muted border rounded shadow-sm">ArrowRight</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bài trước đó</span>
                <kbd className="px-1.5 py-0.5 bg-muted border rounded shadow-sm">ArrowLeft</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Đánh dấu xong</span>
                <kbd className="px-1.5 py-0.5 bg-muted border rounded shadow-sm">C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Thoát bài học</span>
                <kbd className="px-1.5 py-0.5 bg-muted border rounded shadow-sm">Esc</kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
