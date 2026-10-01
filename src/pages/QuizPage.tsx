import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle, Bookmark, BookmarkCheck, AlertCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { useGamification, XP_REWARDS } from "@/hooks/useGamification";
import ErrorState from "@/components/ErrorState";

const QuizPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addXp } = useGamification();
  const qid = Number(quizId);

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [paletteFilter, setPaletteFilter] = useState<"all" | "done" | "flagged" | "todo">("all");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0);
  const { playSound } = useSound();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [savedDraftInfo, setSavedDraftInfo] = useState<{
    answeredCount: number;
    timeLeft: number | null;
    savedAt: number;
  } | null>(null);

  const DRAFT_KEY = `lenglish_quiz_draft_v1_${user?.id || 'guest'}_${qid}`;

  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Restore draft on mount with 24h expiry
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (!parsed.savedAt || Date.now() - parsed.savedAt > TWENTY_FOUR_HOURS) {
          localStorage.removeItem(DRAFT_KEY);
          setSavedDraftInfo(null);
          setShowDraftDialog(false);
          return;
        }
        if (parsed && parsed.answers && Object.keys(parsed.answers).length > 0) {
          setSavedDraftInfo({
            answeredCount: Object.keys(parsed.answers).length,
            timeLeft: parsed.timeLeft ?? null,
            savedAt: parsed.savedAt || Date.now(),
          });
          setShowDraftDialog(true);
        }
      }
    } catch (e) {
      console.error("Failed to parse quiz draft", e);
    }
  }, [DRAFT_KEY]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.flagged) setFlagged(new Set(parsed.flagged));
      if (parsed.timeLeft !== undefined && parsed.timeLeft !== null) setTimeLeft(parsed.timeLeft);
      setStarted(true);
      setShowDraftDialog(false);
      toast({
        title: "Đã khôi phục bài làm dở",
        description: `Đã khôi phục ${Object.keys(parsed.answers || {}).length} câu trả lời của bạn.`,
      });
    } catch (e) {
      console.error("Failed to restore quiz draft", e);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setSavedDraftInfo(null);
    setShowDraftDialog(false);
    toast({
      title: "Đã xóa bài làm dở",
      description: "Bạn có thể bắt đầu bài làm mới.",
    });
  };

  // Autosave draft on answers/flagged change (debounced ~1s)
  useEffect(() => {
    if (!started || submitting || Object.keys(answers).length === 0) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          quizId: qid,
          answers,
          flagged: Array.from(flagged),
          timeLeft,
          started: true,
          savedAt: Date.now(),
        }));
      } catch (e) {
        console.error("Failed to autosave quiz draft", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [answers, flagged, timeLeft, started, submitting, DRAFT_KEY, qid]);

  // Periodic autosave every 15s for clock
  useEffect(() => {
    if (!started || submitting || timeLeftRef.current === null || Object.keys(answersRef.current).length === 0) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          quizId: qid,
          answers: answersRef.current,
          flagged: Array.from(flaggedRef.current),
          timeLeft: timeLeftRef.current,
          started: true,
          savedAt: Date.now(),
        }));
      } catch (e) {
        console.error("Failed to periodic save quiz draft", e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [started, submitting, DRAFT_KEY, qid]);

  // BeforeUnload guard
  useEffect(() => {
    if (!started || submitting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Bạn có bài làm dở. Dữ liệu sẽ được lưu tự động nhưng hãy cẩn thận!";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [started, submitting]);

  // Popstate guard
  useEffect(() => {
    if (!started || submitting) return;
    window.history.pushState({ inQuiz: true }, "");
    const handlePopState = () => {
      window.history.pushState({ inQuiz: true }, "");
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [started, submitting]);

  const toggleFlag = (qIdx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qIdx)) {
        next.delete(qIdx);
      } else {
        next.add(qIdx);
      }
      return next;
    });
  };

  const { data: quiz, isError: isQuizError, refetch: refetchQuiz } = useQuery({
    queryKey: ["quiz", qid],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", qid).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: questions, isLoading, isError: isQuestionsError, refetch: refetchQuestions } = useQuery({
    queryKey: ["quiz-questions", qid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("quiz_id", qid)
        .order("display_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
  });

  useEffect(() => {
    if (started && quiz?.time_limit_seconds && timeLeft === null) {
      setTimeLeft(quiz.time_limit_seconds);
    }
  }, [started, quiz, timeLeft]);

  useEffect(() => {
    if (started && timeLeft !== null && timeLeft > 0 && !showConfirm) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (started && timeLeft === 0 && !submitting) {
      // Auto submit when time runs out
      submit();
    }
  }, [started, timeLeft, showConfirm, submitting]);

  const selectAnswer = (qIdx: number, answerId: number) => {
    playSound("click");
    setAnswers(prev => ({ ...prev, [qIdx]: answerId }));
  };

  const submit = async () => {
    if (!user || !questions) return;
    setSubmitting(true);
    playSound("complete");

    let correctCount = 0;
    questions.forEach((q: any, i: number) => {
      const selectedId = answers[i];
      const isCorrect = q.answers.find((a: any) => a.id === selectedId)?.is_correct;
      if (isCorrect) correctCount++;
    });

    const score = questions.length > 0 ? (correctCount / questions.length) * 10 : 0;

    const { data: result } = await supabase.from("user_quiz_results").insert({
      user_id: user.id,
      quiz_id: qid,
      score: Number(score.toFixed(2)),
      correct_answers: correctCount,
      total_questions: questions.length,
    }).select().single();

    if (result) {
      const userAnswers = questions.map((q: any, i: number) => ({
        result_id: result.id,
        question_id: q.id,
        selected_answer_id: answers[i] || null,
        is_correct: q.answers.find((a: any) => a.id === answers[i])?.is_correct || false,
      }));
      await supabase.from("user_answers").insert(userAnswers);
    }

    // Award XP only on first completion for this quiz
    const QUIZ_COMPLETED_KEY = `lenglish_quiz_completed_v1_${user.id}_${qid}`;
    let isFirstTime = !localStorage.getItem(QUIZ_COMPLETED_KEY);
    if (isFirstTime) {
      try {
        const { count } = await supabase
          .from("user_quiz_results")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("quiz_id", qid);
        // Note: we just inserted 1 result above, so if count <= 1 it's first submission
        if ((count || 0) > 1) {
          isFirstTime = false;
          localStorage.setItem(QUIZ_COMPLETED_KEY, "true");
        }
      } catch {}
    }

    if (isFirstTime) {
      const earnedXp = Math.max(XP_REWARDS.QUIZ_MIN, correctCount * XP_REWARDS.QUIZ_PER_CORRECT);
      addXp(earnedXp, `Hoàn thành bài tập (${correctCount}/${questions.length} câu đúng)`);
      localStorage.setItem(QUIZ_COMPLETED_KEY, "true");
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }

    setSubmitting(false);
    navigate(`/courses/${courseId}/quiz/${quizId}/result`, {
      replace: true,
      state: { score: correctCount, total: questions.length, answers, questions, resultId: result?.id },
    });
  };

  const uniqueQuestionAudios = new Set(
    questions?.map((q: any) => q.audio_url).filter(Boolean) || []
  );
  const showGlobalPlayer = !!(quiz?.audio_url && quiz.audio_url !== "null" && uniqueQuestionAudios.size <= 1);

  // Grouping logic
  const groupedQuestions = (() => {
    if (!questions) return [];
    const groups: any[] = [];
    let currentGroup: any = null;

    questions.forEach((q: any, idx: number) => {
      const isPart1 = q.question_type === "part1";
      const isPart34 = q.question_type === "part3" || q.question_type === "part4";
      const isPart67 = q.question_type === "part6" || q.question_type === "part7";
      
      let passageText = "";
      let cleanQuestionText = q.question_text || "";
      
      if (cleanQuestionText.includes("[PASSAGE]")) {
        const parts = cleanQuestionText.split("[ENDPASSAGE]");
        passageText = parts[0].replace("[PASSAGE]", "");
        cleanQuestionText = parts[1] || "";
      }

      // Logic to start a new group
      let shouldStartNew = false;
      if (!currentGroup) {
        shouldStartNew = true;
      } else if (isPart1) {
        // Part 1: group all questions sharing the same audio together (1 audio file covers all images)
        if (q.audio_url && q.audio_url !== currentGroup.audio_url) {
          shouldStartNew = true;
        }
        // else: same audio → stay in current group, each question shows its own image
      } else if (isPart34) {
        // New group if audio changes and is not null
        if (q.audio_url && q.audio_url !== currentGroup.audio_url) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 3) {
          // TOEIC Part 3/4 usually has 3 questions per audio
          shouldStartNew = true;
        }
      } else if (isPart67) {
        if (passageText) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 4 && q.question_type === "part6") {
          shouldStartNew = true;
        }
      } else {
        // Default: 1 question per group
        shouldStartNew = true;
      }

      if (shouldStartNew) {
        currentGroup = {
          id: groups.length,
          type: q.question_type,
          passage: passageText,
          audio_url: q.audio_url,
          // For Part 1, don't set a group-level image — each question renders its own image
          image_url: isPart1 ? null : q.image_url,
          questions: []
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, originalIdx: idx, cleanText: cleanQuestionText });
    });

    return groups;
  })();

  const currentGroup = groupedQuestions[currentGroupIdx];
  const hasGroupAudio = !!(currentGroup?.audio_url && (!showGlobalPlayer || currentGroup.audio_url !== quiz?.audio_url));
  const hasGroupContent = !!(currentGroup && (currentGroup.passage || currentGroup.image_url || hasGroupAudio));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;

  if (isQuizError || isQuestionsError) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState
            onRetry={() => {
              refetchQuiz();
              refetchQuestions();
            }}
          />
        </div>
      </StudentLayout>
    );
  }

  if (!isLoading && (!quiz || !questions || questions.length === 0)) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-card rounded-3xl border border-border shadow-sm space-y-4">
          <h3 className="text-xl font-black text-foreground">Chưa có câu hỏi</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Bài kiểm tra này hiện chưa có nội dung câu hỏi.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => navigate(courseId ? `/courses/${courseId}` : -1 as any)}
              className="rounded-xl font-bold"
            >
              Quay lại
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flagged.size;
  const totalQ = questions?.length || 0;
  const unanswered = totalQ - answeredCount;

  // Timer urgency style
  const timerStyle = (() => {
    if (timeLeft === null) return "bg-[#FFF0E0] border-[#FFCC80] text-[#CC7700]";
    if (timeLeft <= 60) return "bg-red-100 border-red-400 text-red-600 animate-pulse font-black";
    if (timeLeft <= 300) return "bg-amber-100 border-amber-400 text-amber-700 font-bold";
    return "bg-[#FFF0E0] border-[#FFCC80] text-[#CC7700]";
  })();

  const filterQuestionsByPalette = (i: number) => {
    if (paletteFilter === "done") return answers[i] !== undefined;
    if (paletteFilter === "flagged") return flagged.has(i);
    if (paletteFilter === "todo") return answers[i] === undefined;
    return true;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-16 border-b border-border/70 shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8 shadow-soft-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowExitConfirm(true)} className="rounded-xl hover:bg-muted" title="Thoát hoặc Tạm dừng">
            <ChevronLeft className="w-5 h-5"/>
          </Button>
          <div>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs text-foreground">{quiz?.title}</h1>
            <p className="text-xs text-muted-foreground font-semibold hidden sm:block">Đã làm {answeredCount}/{totalQ} câu</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-4">
          <div className={cn("flex items-center gap-2 border-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-mono font-extrabold text-sm sm:text-base transition-colors", timerStyle)}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <button onClick={() => setShowConfirm(true)} className="btn-3d btn-3d-primary py-2 px-4 text-xs sm:text-sm">
            Nộp bài
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
        
        {/* Main Content: Group-based view */}
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-background">
          {/* Scrollable Questions Container */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Global Quiz Audio Player */}
              {showGlobalPlayer && (
                <div className="bg-[#DDF4FF]/60 dark:bg-zinc-900/60 p-5 rounded-2xl border-2 border-[var(--duo-blue)]/20 flex items-center gap-4 shadow-sm backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-xl bg-[var(--duo-blue)] flex items-center justify-center text-white text-xl shrink-0 shadow-md">🎧</div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-[var(--duo-blue)] mb-1">Âm thanh toàn bài thi (Listening Track)</p>
                    <audio key={quiz.audio_url} controls src={quiz.audio_url} className="w-full h-9" controlsList="nodownload" />
                  </div>
                </div>
              )}

              {currentGroup && (
                <div className="space-y-6">
                  {/* Group context: Passage or shared Audio */}
                  {hasGroupContent && (
                    <div className="p-5 sm:p-8 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl shadow-soft-sm space-y-6">
                      {currentGroup.image_url && (
                        <div className="w-full flex justify-center bg-muted/20 rounded-xl overflow-hidden p-1 border border-border/50">
                          <img src={currentGroup.image_url} alt="Passage Context" className="max-w-full max-h-[320px] object-contain rounded-lg mx-auto image-safe" />
                        </div>
                      )}
                      {hasGroupAudio && (
                        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-soft-xs">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">🎧</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-primary mb-1">Nghe đoạn hội thoại / bài nói</p>
                            <audio key={currentGroup.audio_url} controls src={currentGroup.audio_url} className="w-full h-9" controlsList="nodownload" />
                          </div>
                        </div>
                      )}
                      {currentGroup.passage && (
                        <div className="prose prose-sm max-w-none text-foreground font-medium leading-relaxed bg-card p-6 rounded-xl border border-border/60 shadow-soft-xs whitespace-pre-wrap">
                          {currentGroup.passage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions in group */}
                  {currentGroup.questions.map((q: any) => {
                    const isFlagged = flagged.has(q.originalIdx);
                    return (
                      <div key={q.id} id={`question-${q.originalIdx}`} className="p-5 sm:p-7 space-y-5 bg-card border border-border/60 rounded-2xl shadow-soft-sm">
                        <div className="flex items-center justify-between border-b border-border/50 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="badge-duo badge-blue">Câu {q.originalIdx + 1} / {totalQ}</span>
                            {q.question_type && <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider bg-muted px-2.5 py-1 rounded-full">{q.question_type}</span>}
                          </div>
                          
                          {/* Flag for review button */}
                          <button
                            onClick={() => toggleFlag(q.originalIdx)}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer",
                              isFlagged
                                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-soft-xs"
                                : "border-border/70 text-muted-foreground hover:text-foreground hover:border-amber-500"
                            )}
                          >
                            {isFlagged ? <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> : <Bookmark className="w-3.5 h-3.5" />}
                            <span>{isFlagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}</span>
                          </button>
                        </div>

                        {q.image_url && (q.question_type === "part1" || q.image_url !== currentGroup.image_url) && (
                          <img src={q.image_url} alt="Question" className="image-safe max-w-full max-h-[260px] object-contain rounded-xl border border-border/70 shadow-soft-sm mb-4 mx-auto" />
                        )}
                        {q.audio_url && q.audio_url !== currentGroup.audio_url && (
                          <audio controls src={q.audio_url} className="w-full mb-4 animate-in fade-in" />
                        )}

                        {q.cleanText && q.question_type !== "part2" && (
                          <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed p-4 bg-muted/40 rounded-2xl border-l-4 border-primary">
                            {q.cleanText}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {q.answers.map((opt: any, oi: number) => {
                            const checked = answers[q.originalIdx] === opt.id;
                            const isPart2 = q.question_type === "part2";
                            
                            // Skip D for Part 2
                            if (isPart2 && oi === 3) return null;

                            // Hide text for Part 1 and Part 2 (force listening)
                            const isPart1ByTitle = quiz?.title?.toLowerCase().includes("part 1") || quiz?.title?.toLowerCase().includes("photos of people") || quiz?.title?.toLowerCase().includes("tranh");
                            const isPart2ByTitle = quiz?.title?.toLowerCase().includes("part 2") || quiz?.title?.toLowerCase().includes("hỏi đáp");
                            const hideText = 
                              q.question_type === "part1" || 
                              q.question_type === "part2" ||
                              (isPart1ByTitle && q.question_type === "multiple_choice") ||
                              (isPart2ByTitle && q.question_type === "multiple_choice") ||
                              (!!quiz?.audio_url && quiz.audio_url !== "null" && q.question_type === "multiple_choice" && !!q.image_url);

                            return (
                              <label
                                key={opt.id}
                                onClick={() => selectAnswer(q.originalIdx, opt.id)}
                                className={cn(
                                  "flex items-center gap-3 w-full p-4 rounded-xl border transition-all duration-120 cursor-pointer group select-none active:scale-95",
                                  checked
                                    ? "border-emerald-500 bg-emerald-500/10 shadow-soft-xs font-bold"
                                    : "border-border/70 bg-card hover:border-primary hover:bg-muted/20 shadow-soft-xs"
                                )}
                              >
                                <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors font-extrabold text-sm", checked ? "border-emerald-500 bg-emerald-500 text-white shadow-sm" : "border-border group-hover:border-primary")}>
                                  {checked ? "✓" : String.fromCharCode(65 + oi)}
                                </div>
                                {hideText ? (
                                  <span className="text-base flex-1 text-muted-foreground/30 italic font-medium select-none tracking-widest">••••••••</span>
                                ) : (
                                  <span className={cn("text-sm sm:text-base flex-1", checked ? "text-foreground font-extrabold" : "text-muted-foreground font-semibold")}>{opt.answer_text}</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="h-20 border-t border-border/70 bg-card shrink-0 z-20 flex items-center shadow-soft-sm">
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between px-4 sm:px-8">
              <Button 
                variant="ghost" 
                disabled={currentGroupIdx === 0} 
                onClick={() => {
                  setCurrentGroupIdx(prev => prev - 1);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-bold gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground rounded-xl"
              >
                <ChevronLeft className="w-5 h-5" /> Câu trước
              </Button>
              
              <div className="text-xs text-muted-foreground font-bold hidden sm:block">
                Nhóm {currentGroupIdx + 1} / {groupedQuestions.length}
              </div>

              {currentGroupIdx < groupedQuestions.length - 1 ? (
                <button 
                  onClick={() => {
                    setCurrentGroupIdx(prev => prev + 1);
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn-3d btn-3d-primary py-2.5 sm:py-3 px-6 sm:px-8 text-sm sm:text-base font-extrabold inline-flex items-center gap-1"
                >
                  Tiếp theo <ChevronRight className="w-5 h-5 inline ml-1" />
                </button>
              ) : (
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="btn-3d btn-3d-primary py-2.5 sm:py-3 px-6 sm:px-8 text-sm sm:text-base font-extrabold"
                >
                  Hoàn thành bài thi 🎉
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Grid (Desktop only) */}
        <div className="hidden lg:flex w-84 flex-col border-l border-border/70 bg-card h-full relative z-10 shadow-soft-sm">
           <div className="p-4 border-b border-border/70 space-y-3">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-emerald-500"/> Danh sách câu hỏi
              </h3>
              
              {/* Palette filter chips */}
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: `Tất cả (${totalQ})` },
                  { key: "done", label: `Đã làm (${answeredCount})` },
                  { key: "flagged", label: `🚩 (${flaggedCount})` },
                  { key: "todo", label: `Chưa làm (${unanswered})` },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setPaletteFilter(f.key as any)}
                    className={cn(
                      "text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all",
                      paletteFilter === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-transparent hover:border-border"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-2 content-start">
              {questions.map((_: any, i: number) => {
                 if (!filterQuestionsByPalette(i)) return null;
                 const isAnswered = answers[i] !== undefined;
                 const isFlagged = flagged.has(i);
                 return (
                    <button
                      key={i}
                      onClick={() => { 
                        const gIdx = groupedQuestions.findIndex(g => g.questions.some((q: any) => q.originalIdx === i));
                        if (gIdx !== -1) setCurrentGroupIdx(gIdx);
                        setTimeout(() => {
                          document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center border hover:-translate-y-0.5 relative cursor-pointer active:scale-95",
                        isFlagged ? "border-amber-500 ring-2 ring-amber-500/30" : "",
                        isAnswered ? "border-emerald-500 bg-emerald-500 text-white shadow-soft-xs" : "border-border/70 bg-card text-muted-foreground hover:border-primary shadow-soft-xs"
                      )}
                    >
                      {i + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                      )}
                    </button>
                 );
              })}
           </div>

           <div className="p-4 border-t border-border/70 space-y-2">
              <button className="btn-3d btn-3d-primary w-full py-3 text-sm" onClick={() => setShowConfirm(true)}>
                Nộp bài thi
              </button>
           </div>
        </div>
      </main>

      {/* Fixed Bottom Palette (Mobile only) */}
      <footer className="h-16 border-t border-border/70 shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0 shadow-soft-sm">
        <button onClick={() => setPaletteOpen(!paletteOpen)} className="btn-3d btn-3d-white w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2">
           <LayoutGrid className="w-4 h-4" />
           Danh sách câu hỏi ({answeredCount}/{totalQ})
           {flaggedCount > 0 && <span className="text-amber-500 font-black">🚩 {flaggedCount}</span>}
        </button>
      </footer>

      {/* Absolute Expandable Palette List (Mobile only) */}
      {paletteOpen && (
        <div className="fixed inset-x-0 bottom-16 bg-card border-t border-border/70 shadow-soft-2xl z-40 max-h-[60vh] overflow-y-auto p-5 animate-in slide-in-from-bottom-5 lg:hidden rounded-t-3xl">
           <div className="max-w-xl mx-auto space-y-4">
             <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <h3 className="font-extrabold text-sm text-foreground">Điều hướng câu hỏi</h3>
                <button onClick={() => setPaletteOpen(false)} className="text-xs font-bold text-muted-foreground hover:text-foreground">Đóng ✕</button>
             </div>

             <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: "all", label: `Tất cả (${totalQ})` },
                  { key: "done", label: `Đã làm (${answeredCount})` },
                  { key: "flagged", label: `🚩 (${flaggedCount})` },
                  { key: "todo", label: `Chưa làm (${unanswered})` },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setPaletteFilter(f.key as any)}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all",
                      paletteFilter === f.key
                        ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)]"
                        : "bg-muted text-muted-foreground border-transparent"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
             </div>

             <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto p-1">
               {questions.map((_: any, i: number) => {
                 if (!filterQuestionsByPalette(i)) return null;
                 const isAnswered = answers[i] !== undefined;
                 const isFlagged = flagged.has(i);
                 return (
                   <button
                     key={i}
                     onClick={() => { 
                       const gIdx = groupedQuestions.findIndex(g => g.questions.some((q: any) => q.originalIdx === i));
                       if (gIdx !== -1) setCurrentGroupIdx(gIdx);
                       setPaletteOpen(false);
                       setTimeout(() => {
                         const el = document.getElementById(`question-${i}`);
                         if (el) el.scrollIntoView({ behavior: 'smooth' });
                       }, 100);
                     }}
                     className={cn(
                       "w-11 h-11 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center border relative active:scale-95",
                       isFlagged ? "border-[var(--duo-orange)] ring-2 ring-[var(--duo-orange)]/30" : "",
                       isAnswered ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]" : 
                        "border-border/70 bg-card text-muted-foreground hover:border-primary shadow-soft-xs"
                     )}
                   >
                     {i + 1}
                     {isFlagged && (
                       <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--duo-orange)] border border-white" />
                     )}
                   </button>
                 );
               })}
             </div>
           </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 bg-card rounded-2xl border border-border/70 shadow-soft-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-soft-xs">
               <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-center text-foreground">Xác nhận nộp bài</h3>
            
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border/60 text-sm">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-muted-foreground">Đã trả lời:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{answeredCount}/{totalQ}</span>
              </div>
              {flaggedCount > 0 && (
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-muted-foreground">Đang đánh dấu xem lại:</span>
                  <span className="text-amber-500 font-bold">{flaggedCount} câu 🚩</span>
                </div>
              )}
              {unanswered > 0 && (
                <div className="pt-2 border-t border-border/60 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Còn {unanswered} câu chưa điền đáp án!</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 py-2.5 px-4 rounded-xl border border-border/70 bg-card hover:bg-muted font-bold text-xs sm:text-sm text-foreground transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer"
                onClick={() => setShowConfirm(false)}
              >
                Làm tiếp
              </button>
              <button
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all duration-120 active:scale-95 disabled:opacity-50 shadow-soft-sm cursor-pointer"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Đang nộp..." : "Nộp bài ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 bg-card rounded-2xl border border-border/70 shadow-soft-2xl text-center">
            <span className="text-4xl block">⏸</span>
            <h3 className="font-bold text-xl text-foreground">Tạm dừng hoặc Rời bài tập?</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Bạn đã làm được <b className="text-foreground">{answeredCount}/{totalQ} câu</b>. Bài làm của bạn đã được tự động lưu tạm trên trình duyệt.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all duration-120 active:scale-95 shadow-soft-sm cursor-pointer"
                onClick={() => {
                  setShowExitConfirm(false);
                  navigate(`/courses/${courseId}/quiz`, { replace: true });
                }}
              >
                💾 Tạm dừng &amp; Thoát (Lưu bài)
              </button>
              <button
                type="button"
                className="py-2 text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                onClick={() => {
                  try { localStorage.removeItem(DRAFT_KEY); } catch {}
                  setShowExitConfirm(false);
                  navigate(`/courses/${courseId}/quiz`, { replace: true });
                }}
              >
                Hủy bài tập này (Xóa nháp)
              </button>
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl border border-border/70 bg-card hover:bg-muted font-bold text-xs text-foreground transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer"
                onClick={() => setShowExitConfirm(false)}
              >
                Ở lại làm tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Resume Dialog */}
      {showDraftDialog && savedDraftInfo && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200 bg-card rounded-2xl border border-border/70 shadow-soft-2xl text-center">
            <span className="text-4xl block">⚡</span>
            <h3 className="font-bold text-xl text-foreground">Bạn có bài đang làm dở</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Bạn có bài đang làm dở ({savedDraftInfo.answeredCount} câu đã trả lời). Tiếp tục hay làm mới?
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-border/70"
                onClick={discardDraft}
              >
                Làm mới
              </Button>
              <Button
                type="button"
                className="flex-1 py-2 rounded-xl text-xs font-bold"
                onClick={restoreDraft}
              >
                Tiếp tục
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
