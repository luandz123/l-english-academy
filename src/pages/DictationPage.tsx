import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StudentLayout from "@/components/StudentLayout";
import { Loader2, ArrowLeft, CheckCircle, ChevronRight, Volume2, SkipForward, Play, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus effect when moving
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return; // Prevent IME confirm from auto-filling
      
      const errIdx = findErrorIndex(value, expected);
      if (errIdx !== -1) {
        // has error -> show hint but DON'T auto-fill, as per user request to "điền và check đáp án bình thường"
        playSound("error");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setShowHint(true);
      } else if (isFullMatch(value, expected)) {
        playSound("correct");
        setStatus("correct");
        setShowHint(false);
        setValue(expected); // Auto-fill correct string with punctuation ONLY when actually correct
        onCorrect();
      } else {
        // incomplete -> show hint but DON'T auto-fill
        playSound("error");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setShowHint(true);
      }
    }
  };

  useEffect(() => {
    if (isFullMatch(value, expected)) {
       setStatus("correct");
       setValue(expected);
       onCorrect();
    } else {
       if (status === "correct") setStatus("typing");
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
            if (showHint) setShowHint(false);
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
        <div className="text-sm font-medium text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
          Gợi ý: <span className="font-bold">{expected}</span>
        </div>
      )}
    </div>
  );
};


const DictationPage = () => {
  const { courseId, quizId } = useParams();
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
      // Don't auto next immediately
      setTimeout(() => handleNext(true), 1500);
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

  // Ctrl to Play/Pause
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
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

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

  const questions = quizData.questions;
  const completedQuestionIds = new Set(userAnswers.map((ua: any) => ua.question_id));
  const currentQuestion = questions[currentIndex];

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
              <div className="w-full bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col items-center gap-3">
                <audio 
                  ref={audioRef} 
                  src={currentQuestion.audio_url} 
                  controls 
                  className="w-full max-w-md"
                  autoPlay
                />
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
            <div className="pt-4 border-t flex items-center justify-between gap-3 mt-auto">
               <span className="text-sm font-semibold text-emerald-600">
                 Đã xong {completedQuestionIds.size}/{questions.length} câu
               </span>
               <div className="flex gap-2">
                 <Button variant="outline" onClick={() => handleNext(false)}>
                   <SkipForward className="w-4 h-4 mr-2" /> Bỏ qua
                 </Button>
                 <Button 
                   variant="default" 
                   onClick={() => navigate(`/courses/${courseId}/quiz/${quizId}/result`, { state: { score: completedQuestionIds.size, total: questions.length, resultId: targetResultId } })}
                   className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                 >
                   <CheckCircle className="w-4 h-4 mr-2" /> Nộp bài
                 </Button>
               </div>
            </div>
          </div>

          {/* Sidebar - Question Navigator */}
          <div className="lg:col-span-1 bg-card rounded-xl border p-4 max-h-[80vh] overflow-y-auto">
             <h3 className="font-semibold text-sm mb-4 text-foreground">Danh sách câu hỏi</h3>
             <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2">
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
  // We need to track how many fields are correctly filled to mark the question as complete
  const [fields, setFields] = useState<boolean[]>([]);
  
  const expectedItems = useMemo(() => {
    const items = [];
    if (question.question_text?.trim() && question.question_text !== 'Audio dictation') {
       items.push({ type: 'question', text: question.question_text, placeholder: "Nhập nội dung câu hỏi..." });
    }
    // Answers
    question.answers.forEach((ans: any, idx: number) => {
       if (ans.answer_text?.trim()) {
          items.push({ type: 'answer', text: ans.answer_text, placeholder: `Nhập đáp án ${String.fromCharCode(65 + idx)}...` });
       }
    });
    return items;
  }, [question]);

  useEffect(() => {
    // Current session completion state is what determines if fields are filled/locked
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

  return (
    <div className="space-y-4">
      {expectedItems.map((item, idx) => (
         <div key={`field-${idx}`} className="flex gap-3 items-start">
           <div className={`mt-3 w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm
              ${fields[idx] ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}
           `}>
             {item.type === 'question' ? 'Q' : String.fromCharCode(65 + (idx - (expectedItems[0].type === 'question' ? 1 : 0)))}
           </div>
            {fields[idx] ? (
               <div className="w-full">
                 <Input
                   value={item.text}
                   className="w-full py-6 px-4 text-base bg-emerald-500/10 text-emerald-700 font-medium border-emerald-500"
                   readOnly
                 />
               </div>
            ) : (
               <DictationInput 
                 expected={item.text} 
                 placeholder={item.placeholder || "Nghe và điền..."} 
                 onCorrect={() => setFieldComplete(idx)}
               />
            )}
         </div>
      ))}
      
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

export default DictationPage;
