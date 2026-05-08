import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StudentLayout from "@/components/StudentLayout";
import { Loader2, ArrowLeft, CheckCircle, ChevronRight, Volume2, SkipForward, Play, RefreshCcw, Library, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Utils for dictation checking
const normalizeChar = (c: string) => c.toLowerCase();
const isAlphanumeric = (c: string) => /[\p{L}0-9]/u.test(c);

const playSound = (type: "correct" | "error") => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};

const findErrorIndex = (input: string, expected: string): number => {
  let i = 0; // input index
  let j = 0; // expected index

  while (i < input.length && j < expected.length) {
    if (!isAlphanumeric(expected[j])) {
      j++;
      continue;
    }
    if (!isAlphanumeric(input[i])) {
      i++;
      continue;
    }
    if (normalizeChar(input[i]) !== normalizeChar(expected[j])) {
      return i; // found mismatch!
    }
    i++;
    j++;
  }
  
  if (i < input.length) {
    // excess characters in input when expected is already matched
    return i;
  }

  return -1; // incomplete or correct
};

const isFullMatch = (input: string, expected: string): boolean => {
  const normI = input.replace(/[^\p{L}0-9]/gu, "").toLowerCase();
  const normE = expected.replace(/[^\p{L}0-9]/gu, "").toLowerCase();
  return normI === normE;
};

const DictationInput = ({ 
  expected, 
  placeholder, 
  onCorrect 
}: { 
  expected: string, 
  placeholder: string,
  onCorrect: () => void 
}) => {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"typing" | "correct">("typing");
  const [mistakeCount, setMistakeCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getHintText = () => {
    if (mistakeCount === 1) {
      return `Gợi ý: Bắt đầu bằng chữ "${expected[0]}"`;
    }
    if (mistakeCount === 2) {
      const halfLen = Math.ceil(expected.length / 2);
      return `Gợi ý: ${expected.substring(0, halfLen)}${".".repeat(expected.length - halfLen)}`;
    }
    return `Đáp án: ${expected}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return;
      
      const errIdx = findErrorIndex(value, expected);
      if (errIdx !== -1 || !isFullMatch(value, expected)) {
        playSound("error");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setMistakeCount(prev => prev + 1);
        setShowHint(true);
      } else {
        playSound("correct");
        setStatus("correct");
        setShowHint(false);
        setValue(expected);
        onCorrect();
      }
    }
  };

  useEffect(() => {
    if (isFullMatch(value, expected)) {
       setStatus("correct");
       setValue(expected);
       onCorrect();
    } else if (status === "correct") {
       setStatus("typing");
    }
  }, [value, expected]);

  return (
    <div className="w-full relative flex flex-col gap-1">
      <div className="w-full relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (showHint && mistakeCount < 3) setShowHint(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full py-6 px-4 text-base transition-colors ${
            status === "correct" 
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 font-medium" 
              : "border-primary/20 bg-background"
          } ${shake ? "animate-[dictation-shake_0.3s_ease-in-out]" : ""}`}
          readOnly={status === "correct"}
        />
        {status === "correct" && (
          <CheckCircle className="w-5 h-5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>
      {showHint && (
        <div className={cn(
          "text-sm font-medium px-3 py-2 rounded-lg border transition-all animate-in fade-in slide-in-from-top-1",
          mistakeCount >= 3 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-500 bg-red-500/10 border-red-500/20"
        )}>
          {getHintText()}
        </div>
      )}
    </div>
  );
};


const DictationPage = () => {
  const { courseId, quizId } = useParams();
  // Get lessonId for navigation
  const { data: lessonData } = useQuery({
    queryKey: ["lesson-from-quiz", quizId],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("id").eq("quiz_id", Number(quizId)).single();
      return data;
    }
  });
  const lessonId = lessonData?.id;
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-inject animation style
  useEffect(() => {
    if (!document.getElementById("dictation-shake-style")) {
      const style = document.createElement("style");
      style.id = "dictation-shake-style";
      style.innerHTML = `
        @keyframes dictation-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [started, setStarted] = useState(false);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState<Set<number>>(new Set());

  // 1. Fetch Quiz data (list of questions & answers)
  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["dictation-quiz", quizId],
    queryFn: async () => {
      const { data: qz } = await supabase.from("quizzes").select("*").eq("id", Number(quizId)).single();
      const { data: qs } = await supabase.from("questions").select("*, answers(*)").eq("quiz_id", Number(quizId)).order("display_order");
      return {
        quiz: qz,
        questions: (qs || []).map((q: any) => ({
          ...q,
          answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order)
        }))
      };
    }
  });

  // 2. Fetch or create Result Tracking
  const { data: targetResultId, isLoading: resultLoading } = useQuery({
    queryKey: ["dictation-result", quizId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Find existing
      const { data: existing } = await supabase.from("user_quiz_results")
        .select("id")
        .eq("user_id", user.id)
        .eq("quiz_id", Number(quizId))
        .single();
      
      if (existing) return existing.id;

      // Create new
      const { data: newResult } = await supabase.from("user_quiz_results")
        .insert({
          user_id: user.id,
          quiz_id: Number(quizId),
          total_questions: quizData?.questions.length || 0,
          score: 0,
        }).select("id").single();
      return newResult?.id;
    },
    enabled: !!user && !!quizData,
  });

  // 3. Fetch completed progress (user_answers)
  const { data: userAnswers = [] } = useQuery({
    queryKey: ["dictation-answers", targetResultId],
    queryFn: async () => {
      if (!targetResultId) return [];
      const { data } = await supabase.from("user_answers")
        .select("*")
        .eq("result_id", targetResultId)
        .eq("is_correct", true);
      return data || [];
    },
    enabled: !!targetResultId,
  });
  
  // 4. Fetch Vocabulary for current lesson/questions
  const { data: vocabWords = [] } = useQuery({
    queryKey: ["dictation-vocab", quizId],
    queryFn: async () => {
      const { data: qz } = await supabase.from("vocab_quizzes").select("id").eq("lesson_id", quizData?.quiz?.module_id ? (await supabase.from("lessons").select("id").eq("quiz_id", Number(quizId)).single()).data?.id : 0).maybeSingle();
      // Actually, a better way to get lessonId is from the quiz module or directly
      const { data: lesson } = await supabase.from("lessons").select("id").eq("quiz_id", Number(quizId)).maybeSingle();
      if (!lesson) return [];
      const { data: vq } = await supabase.from("vocab_quizzes").select("id").eq("lesson_id", lesson.id).maybeSingle();
      if (!vq) return [];
      const { data } = await supabase.from("vocab_questions").select("*").eq("vocab_quiz_id", vq.id);
      return data || [];
    },
    enabled: !!quizData
  });

  const saveAnswerMutation = useMutation({
    onMutate: async (question_id: number) => {
      if (!targetResultId) return { previousAnswers: [] };
      await queryClient.cancelQueries({ queryKey: ["dictation-answers", targetResultId] });
      const previousAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      if (!previousAnswers.find(ua => ua.question_id === question_id)) {
        queryClient.setQueryData(["dictation-answers", targetResultId], [...previousAnswers, { question_id, is_correct: true }]);
      }
      return { previousAnswers };
    },
    mutationFn: async (question_id: number) => {
      if (!targetResultId) return;
      // Get latest from queryClient rather than closure
      const currentAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      const existing = currentAnswers.filter((ua: any) => ua.question_id === question_id).length > 1; // It was optimistically added, so length > 1 means it actually existed before
      if (existing) return;
      
      // Instead of depending on UPSERT or DELETE, check existing and update or insert
      const { data: existingRecords } = await supabase.from("user_answers")
        .select("id")
        .eq("result_id", targetResultId)
        .eq("question_id", question_id)
        .limit(1);
      
      const existingDb = existingRecords?.[0];

      let fetchCount = 0;
      if (existingDb) {
        const { error } = await supabase.from("user_answers")
          .update({ is_correct: true })
          .eq("id", existingDb.id);
        if (error) console.error("Update error:", error);
      } else {
        const { error } = await supabase.from("user_answers").insert({
          result_id: targetResultId,
          question_id,
          is_correct: true
        });
        if (error) console.error("Insert error:", error);
      }
      
      // Update result count
      const newCorrectCount = currentAnswers.length; // because we optimistically added it, the length is the target count
      await supabase.from("user_quiz_results")
        .update({ correct_answers: newCorrectCount, score: newCorrectCount })
        .eq("id", targetResultId);
    },
    onError: (err, question_id, context: any) => {
      if (context?.previousAnswers) {
        queryClient.setQueryData(["dictation-answers", targetResultId], context.previousAnswers);
      }
    },
    onSuccess: (_, question_id) => {
      queryClient.invalidateQueries({ queryKey: ["dictation-answers", targetResultId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
      setSessionDone(prev => {
        const next = new Set(prev);
        next.add(question_id);
        return next;
      });
    }
  });
 
  const resetAnswerMutation = useMutation({
    onMutate: async (question_id: number) => {
      if (!targetResultId) return { previousAnswers: [] };
      await queryClient.cancelQueries({ queryKey: ["dictation-answers", targetResultId] });
      const previousAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      const updated = previousAnswers.filter(ua => ua.question_id !== question_id);
      queryClient.setQueryData(["dictation-answers", targetResultId], updated);
      return { previousAnswers };
    },
    mutationFn: async (question_id: number) => {
      if (!targetResultId) return;
      const { error } = await supabase.from("user_answers").update({ is_correct: false })
        .eq("result_id", targetResultId)
        .eq("question_id", question_id);
      if (error) throw new Error(error.message);
      
      const currentAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      await supabase.from("user_quiz_results")
        .update({ correct_answers: currentAnswers.length, score: currentAnswers.length })
        .eq("id", targetResultId);
    },
    onError: (err, question_id, context: any) => {
      if (context?.previousAnswers) {
        queryClient.setQueryData(["dictation-answers", targetResultId], context.previousAnswers);
      }
      toast({ title: "Lỗi làm lại", description: err.message, variant: "destructive" });
    },
    onSuccess: (_, question_id) => {
      queryClient.invalidateQueries({ queryKey: ["dictation-answers", targetResultId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
      setSessionDone(prev => {
        const next = new Set(prev);
        next.delete(question_id);
        return next;
      });
      toast({ title: "Đã reset câu hỏi, bạn có thể làm lại!" });
    }
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      if (!targetResultId) return;
      // Mark all correct answers as incorrect to "reset" the quiz
      const { error } = await supabase.from("user_answers")
        .update({ is_correct: false })
        .eq("result_id", targetResultId);
        
      if (error) throw new Error(error.message);
      
      await supabase.from("user_quiz_results")
        .update({ correct_answers: 0, score: 0 })
        .eq("id", targetResultId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dictation-answers", targetResultId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
      setSessionDone(new Set());
      toast({ title: "Đã reset toàn bộ tiến trình!", description: "Bạn có thể bắt đầu luyện tập lại từ đầu." });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi reset", description: err.message, variant: "destructive" });
    }
  });

  const questions = quizData?.questions ?? [];
  const completedQuestionIds = new Set(userAnswers.map((ua: any) => ua.question_id));
  const currentQuestion = questions[currentIndex];

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        }
      }
      
      // Enter to next if current is done
      if (e.key === "Enter" && sessionDone.has(currentQuestion?.id)) {
        handleNext(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [currentQuestion?.id, sessionDone]);

  // Fix React Hooks rule: move this above any early returns
  useEffect(() => {
    const qs = quizData?.questions || [];
    if (qs.length > 0 && activeQuestionIndices.length === 0 && !started) {
      setActiveQuestionIndices(qs.map((_, i) => i));
    }
  }, [quizData?.questions?.length, started]);

  if (quizLoading || resultLoading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </StudentLayout>
    );
  }

  if (!quizData || quizData.questions.length === 0) {
    return (
      <StudentLayout>
        <div className="text-center p-8 bg-card rounded-xl border">
          <p className="text-muted-foreground mb-4">Bài luyện nghe này chưa có câu hỏi.</p>
          <Button onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
        </div>
      </StudentLayout>
    );
  }

  const handleNext = (auto = false) => {
    const currentActiveIdx = activeQuestionIndices.indexOf(currentIndex);
    if (currentActiveIdx < activeQuestionIndices.length - 1) {
      setCurrentIndex(activeQuestionIndices[currentActiveIdx + 1]);
    } else if (!auto) {
      toast({ title: "Đã hết câu hỏi!", description: "Bạn đã hoàn thành các câu đã chọn." });
    }
  };

  const handleToggleQuestion = (index: number) => {
    setActiveQuestionIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index).sort((a,b) => a-b);
      }
      return [...prev, index].sort((a,b) => a-b);
    });
  };

  const startDictation = () => {
    if (activeQuestionIndices.length === 0) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ít nhất 1 câu để luyện tập.", variant: "destructive" });
      return;
    }
    setCurrentIndex(activeQuestionIndices[0]);
    setStarted(true);
  };

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto bg-card rounded-xl border p-8 space-y-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bắt đầu: {quizData.quiz.title}</h1>
              <p className="text-sm text-muted-foreground">Chọn các câu hỏi bạn muốn luyện tập hôm nay</p>
            </div>
          </div>
          
          <div className="bg-muted/30 border rounded-lg p-4 max-h-[50vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-sm">Danh sách câu hỏi ({questions.length} câu)</span>
                 <div className="flex gap-2">
                    {completedQuestionIds.size > 0 && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => resetAllMutation.mutate()}>
                        <RefreshCcw className="w-4 h-4 mr-2" /> Làm lại từ đầu
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setActiveQuestionIndices(activeQuestionIndices.length === questions.length ? [] : questions.map((_, i) => i))}>
                      {activeQuestionIndices.length === questions.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </Button>
                 </div>
              </div>
              
              {/* Filtered Vocab Info */}
              {activeQuestionIndices.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Library className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Các câu đã chọn có {vocabWords.filter(w => activeQuestionIndices.map(idx => questions[idx].id).includes(w.question_id)).length} từ vựng
                    </span>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-blue-700 font-bold"
                    onClick={() => {
                      const selectedIds = activeQuestionIndices.map(idx => questions[idx].id);
                      if (lessonId) {
                        navigate(`/courses/${courseId}/vocab-lesson/${lessonId}`, { state: { questionIds: selectedIds } });
                      } else {
                        toast({ title: "Đang tải dữ liệu...", description: "Vui lòng thử lại sau giây lát." });
                      }
                    }}
                  >
                    Học từ vựng của các câu này <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
               {questions.map((q: any, idx: number) => (
                 <label key={q.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${activeQuestionIndices.includes(idx) ? 'bg-primary/5 border-primary/50' : 'bg-background hover:bg-muted'}`}>
                   <Checkbox 
                     checked={activeQuestionIndices.includes(idx)}
                     onCheckedChange={() => handleToggleQuestion(idx)}
                   />
                   <span className="text-sm font-medium">Câu số {idx + 1} {completedQuestionIds.has(q.id) && <CheckCircle className="w-3 h-3 text-emerald-500 inline ml-1" />}</span>
                 </label>
               ))}
             </div>
          </div>
          
          <div className="flex justify-end pt-4">
             <Button onClick={startDictation} disabled={activeQuestionIndices.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
               <Play className="w-4 h-4 mr-2" /> Bắt đầu luyện ({activeQuestionIndices.length} câu)
             </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!currentQuestion) return null;

  // State per dictation page
  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header & Back */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{quizData.quiz.title}</h1>
              <p className="text-sm text-muted-foreground">Luyện nghe điền từ • {completedQuestionIds.size}/{questions.length} hoàn thành</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Workspace */}
          <div className="lg:col-span-3 bg-card rounded-xl border p-6 flex flex-col space-y-6">
            
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="text-lg font-bold text-foreground">Câu {currentIndex + 1}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <kbd className="px-2 py-1 bg-muted rounded border text-xs">Ctrl</kbd>
                Phát / Dừng Audio
              </div>
            </div>

            {/* Audio Block */}
            {currentQuestion.audio_url && (
              <div className="w-full bg-primary/5 p-6 rounded-xl border border-primary/20 flex flex-col items-center gap-4">
                <audio 
                  ref={audioRef} 
                  src={currentQuestion.audio_url} 
                  controls 
                  className="w-full max-w-md h-10"
                  autoPlay
                />
                <div className="flex items-center gap-2 bg-background border rounded-lg p-1">
                  {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                    <Button
                      key={speed}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs font-bold",
                        audioRef.current?.playbackRate === speed ? "bg-primary text-primary-foreground" : ""
                      )}
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.playbackRate = speed;
                          // Force re-render to show active speed
                          const currentSpeed = audioRef.current.playbackRate;
                          (e: any) => {}; 
                        }
                      }}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Dictation Inputs */}
            <div className="space-y-6 overflow-y-auto w-full max-w-2xl mx-auto flex-1">
              <QuestionDictationSection 
                key={`q-${currentQuestion.id}-${sessionDone.has(currentQuestion.id)}`}
                question={currentQuestion} 
                isCompleted={completedQuestionIds.has(currentQuestion.id)}
                isDoneInSession={sessionDone.has(currentQuestion.id)}
                onComplete={() => saveAnswerMutation.mutate(currentQuestion.id)}
                onRedo={() => resetAnswerMutation.mutate(currentQuestion.id)}
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t flex items-center justify-between gap-3 mt-auto flex-wrap">
               <span className="text-sm font-semibold text-emerald-600">
                 Đã xong {completedQuestionIds.size}/{questions.length} câu
               </span>
               <div className="flex gap-2">
                 {sessionDone.has(currentQuestion.id) ? (
                   <Button 
                     onClick={() => handleNext(true)} 
                     className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg animate-in zoom-in-95 duration-300"
                   >
                     Tiếp tục câu sau <ChevronRight className="w-4 h-4 ml-2" />
                   </Button>
                 ) : (
                   <Button variant="outline" onClick={() => handleNext(false)}>
                     <SkipForward className="w-4 h-4 mr-2" /> Bỏ qua
                   </Button>
                 )}
                 <Button 
                   variant="secondary" 
                   onClick={() => navigate(`/courses/${courseId}/quiz/${quizId}/result`, { state: { score: completedQuestionIds.size, total: questions.length, resultId: targetResultId } })}
                   className="shadow-sm border font-medium"
                 >
                   <CheckCircle className="w-4 h-4 mr-2" /> Nộp bài
                 </Button>
               </div>
            </div>
          </div>

          {/* Sidebar - Question Navigator (Desktop) */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
             <QuestionVocabSidebar vocabWords={vocabWords} currentQuestionId={currentQuestion?.id} />
             
             <div className="bg-card rounded-xl border p-4 max-h-[80vh] overflow-y-auto">
                <h3 className="font-semibold text-sm mb-4 text-foreground">Danh sách câu hỏi</h3>
                <div className="grid grid-cols-4 gap-2">
                  {activeQuestionIndices.map((idx: number) => {
                    const q = questions[idx];
                    const isDone = completedQuestionIds.has(q.id);
                    const isCurrent = currentIndex === idx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`aspect-square flex items-center justify-center rounded-lg text-sm font-semibold transition-all
                          ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                          ${isDone ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}
                        `}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Mobile Navigator Trigger */}
          <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="rounded-full shadow-2xl px-6 h-12 bg-primary text-primary-foreground font-bold border-4 border-background">
                  <Library className="w-4 h-4 mr-2" /> Danh sách câu & Từ vựng
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl border-t-0 p-0 overflow-hidden bg-background">
                <div className="h-full overflow-y-auto p-6 space-y-6">
                  <QuestionVocabSidebar vocabWords={vocabWords} currentQuestionId={currentQuestion?.id} />
                  
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg text-foreground">Danh sách câu hỏi</h3>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {activeQuestionIndices.map((idx: number) => {
                        const q = questions[idx];
                        const isDone = completedQuestionIds.has(q.id);
                        const isCurrent = currentIndex === idx;
                        return (
                          <SheetClose asChild key={q.id}>
                            <button
                              onClick={() => setCurrentIndex(idx)}
                              className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all
                                ${isCurrent ? 'ring-2 ring-primary ring-offset-4 ring-offset-background' : ''}
                                ${isDone ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}
                              `}
                            >
                              {idx + 1}
                            </button>
                          </SheetClose>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

// Extracted component to manage inputs state for one question
const QuestionDictationSection = ({ 
  question, 
  isCompleted, 
  isDoneInSession,
  onComplete, 
  onRedo 
}: { 
  question: any, 
  isCompleted: boolean, 
  isDoneInSession: boolean,
  onComplete: () => void, 
  onRedo: () => void 
}) => {
  const [fields, setFields] = useState<boolean[]>([]);
  
  const expectedItems = useMemo(() => {
    const items = [];
    if (question.question_text?.trim() && question.question_text !== 'Audio dictation') {
       items.push({ type: 'question', text: question.question_text, placeholder: "Nhập nội dung câu hỏi..." });
    }
    question.answers.forEach((ans: any, idx: number) => {
       if (ans.answer_text?.trim()) {
          items.push({ type: 'answer', text: ans.answer_text, placeholder: `Nhập đáp án ${String.fromCharCode(65 + idx)}...` });
       }
    });
    return items;
  }, [question]);

  useEffect(() => {
    setFields(new Array(expectedItems.length).fill(isDoneInSession));
  }, [expectedItems.length, isDoneInSession]);

  const setFieldComplete = (idx: number) => {
    setFields(prev => {
      const next = [...prev];
      next[idx] = true;
      if (next.every(Boolean) && !isCompleted) {
        onComplete();
      }
      return next;
    });
  };

  const renderItem = (item: any, idx: number) => {
    const isCloze = item.type === 'question' && item.text.includes("[___]");
    const clozeParts = isCloze ? item.text.split("[___]") : [];
    
    return (
      <div key={`field-${idx}`} className="flex gap-3 items-start">
        <div className={`mt-3 w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm
           ${fields[idx] ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}
        `}>
          {item.type === 'question' ? 'Q' : String.fromCharCode(65 + (idx - (expectedItems[0].type === 'question' ? 1 : 0)))}
        </div>
        
        {isCloze ? (
          <div className="flex-1 bg-muted/30 p-6 rounded-xl border leading-loose text-lg font-medium">
            {clozeParts.map((part: any, pIdx: number) => (
              <React.Fragment key={pIdx}>
                {part}
                {pIdx < clozeParts.length - 1 && (
                  <span className="inline-block mx-1">
                    {fields[idx + pIdx] ? (
                       <span className="text-emerald-600 font-bold border-b-2 border-emerald-500 px-2">{question.answers[pIdx]?.answer_text}</span>
                    ) : (
                       <DictationInput 
                         expected={question.answers[pIdx]?.answer_text || ""} 
                         placeholder="..." 
                         onCorrect={() => setFieldComplete(idx + pIdx)}
                       />
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="w-full">
            {fields[idx] ? (
               <Input
                 value={item.text}
                 className="w-full py-6 px-4 text-base bg-emerald-500/10 text-emerald-700 font-medium border-emerald-500"
                 readOnly
               />
            ) : (
               <DictationInput 
                 expected={item.text} 
                 placeholder={item.placeholder || "Nghe và điền..."} 
                 onCorrect={() => setFieldComplete(idx)}
               />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {expectedItems.map((item, idx) => {
        const isFirstItemCloze = expectedItems[0].type === 'question' && expectedItems[0].text.includes("[___]");
        if (isFirstItemCloze && item.type === 'answer') return null;
        return renderItem(item, idx);
      })}
      
      {isCompleted && question.translation && (
        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="text-sm font-semibold text-primary mb-2">🇻🇳 Dịch nghĩa:</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{question.translation}</p>
        </div>
      )}
      
      {isCompleted && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="sm" onClick={onRedo} className="text-muted-foreground">
            <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Làm lại câu này
          </Button>
        </div>
      )}
    </div>
  );
};

const QuestionVocabSidebar = ({ vocabWords, currentQuestionId }: { vocabWords: any[], currentQuestionId?: number }) => {
  const currentVocab = useMemo(() => {
    return vocabWords.filter(w => w.question_id === currentQuestionId);
  }, [vocabWords, currentQuestionId]);

  if (currentVocab.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm border-primary/20 bg-primary/5">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-primary">
        <Library className="w-4 h-4" /> Từ vựng trong câu
      </h3>
      <div className="space-y-3">
        {currentVocab.map(w => (
          <div key={w.id} className="text-sm border-b border-primary/10 pb-2 last:border-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-bold text-primary">{w.word}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{w.phonetic}</span>
            </div>
            <p className="text-foreground text-xs">{w.definition_vi}</p>
            {w.example_sentence && (
              <p className="text-[10px] text-muted-foreground italic mt-1 bg-background/50 p-1 rounded">"{w.example_sentence}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DictationPage;
