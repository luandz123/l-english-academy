import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StudentLayout from "@/components/StudentLayout";
import { Loader2, ArrowLeft, CheckCircle, ChevronRight, Volume2, SkipForward, Play, RefreshCcw, Library, ArrowRight, FileQuestion, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/useSound";
// Utils for dictation checking
const normalizeChar = (c: string) => c.toLowerCase();
const isAlphanumeric = (c: string) => /[\p{L}0-9]/u.test(c);



const getWords = (text: string) => {
  const words = [];
  const regex = /[\p{L}0-9]+/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return words;
};

const getFirstErrorWordInfo = (input: string, expected: string) => {
  const inputWords = getWords(input);
  const expectedWords = getWords(expected);

  for (let i = 0; i < expectedWords.length; i++) {
    const eWord = expectedWords[i];
    const iWord = inputWords[i];

    if (!iWord) {
      return {
        endIndex: input.length,
        correctWord: eWord.text,
        isMissing: true
      };
    }

    if (iWord.text.toLowerCase() !== eWord.text.toLowerCase()) {
      return {
        endIndex: iWord.end,
        correctWord: eWord.text,
        inputWord: iWord.text,
        isMissing: false
      };
    }
  }

  if (inputWords.length > expectedWords.length) {
    return {
      endIndex: inputWords[expectedWords.length].end,
      correctWord: "",
      inputWord: inputWords[expectedWords.length].text,
      isExtra: true
    };
  }

  return null;
};

const isFullMatch = (input: string, expected: string): boolean => {
  const normI = input.replace(/[^\p{L}0-9]/gu, "").toLowerCase();
  const normE = expected.replace(/[^\p{L}0-9]/gu, "").toLowerCase();
  return normI === normE;
};

const DictationInput = ({ 
  expected, 
  placeholder, 
  onCorrect,
  autoFocus
}: { 
  expected: string, 
  placeholder: string,
  onCorrect: () => void,
  autoFocus?: boolean
}) => {
  const { prefix, suffix, middleExpected, fullExpected } = useMemo(() => {
    const words = getWords(expected);
    if (words.length <= 2) {
      return { prefix: "", suffix: "", middleExpected: expected, fullExpected: expected };
    }
    
    const prefixStr = expected.substring(0, words[1].start);
    const suffixStr = expected.substring(words[words.length - 2].end);
    const middleStr = expected.substring(words[1].start, words[words.length - 2].end);
    
    return { prefix: prefixStr, suffix: suffixStr, middleExpected: middleStr, fullExpected: expected };
  }, [expected]);

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"typing" | "correct">("typing");
  const [mistakeCount, setMistakeCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playSound } = useSound();

  const [errorDetails, setErrorDetails] = useState<{ correctWord: string, inputWord?: string, isMissing?: boolean, isExtra?: boolean } | null>(null);

  const getHintText = () => {
    if (errorDetails) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">
              {errorDetails.isMissing ? (
                <>Gợi ý từ tiếp theo: <span className="text-[var(--duo-blue)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-blue)]/20 font-bold">"{errorDetails.correctWord}"</span></>
              ) : errorDetails.isExtra ? (
                <>Từ bị thừa: <span className="text-[var(--duo-red)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-red)]/20 line-through">"{errorDetails.inputWord}"</span></>
              ) : (
                <>Sửa <span className="text-[var(--duo-red)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-red)]/20 line-through">"{errorDetails.inputWord}"</span> thành <span className="text-[var(--duo-correct)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-correct)]/20 font-bold">"{errorDetails.correctWord}"</span></>
              )}
            </span>
          </div>
          <div className="text-xs opacity-80 font-extrabold border-t border-border pt-2 flex items-center gap-2">
            <span className="bg-muted-foreground/20 text-foreground px-1.5 py-0.5 rounded text-[10px] uppercase">Đáp án đầy đủ</span>
            <span className="text-sm">{fullExpected}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="bg-[var(--duo-correct)] text-white px-1.5 py-0.5 rounded text-[10px] uppercase">Đáp án</span>
        <span className="text-base">{fullExpected}</span>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return;
      
      const errorInfo = getFirstErrorWordInfo(value, middleExpected);
      if (errorInfo) {
        playSound("incorrect");
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setMistakeCount(prev => prev + 1);
        setErrorDetails({
          correctWord: errorInfo.correctWord,
          inputWord: errorInfo.inputWord,
          isMissing: errorInfo.isMissing,
          isExtra: errorInfo.isExtra
        });
        setShowHint(true);
        
        // Jump cursor to end of error word
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(errorInfo.endIndex, errorInfo.endIndex);
          }
        }, 0);
      } else {
        if (!isFullMatch(value, middleExpected)) {
           playSound("incorrect");
           setShake(true);
           setTimeout(() => setShake(false), 300);
           setMistakeCount(prev => prev + 1);
           setErrorDetails(null); // Reset error word to show full answer only
           setShowHint(true);
           return;
        }
        playSound("correct");
        setStatus("correct");
        setShowHint(false);
        setValue(middleExpected);
        onCorrect();
      }
    }
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isFullMatch(value, middleExpected) && status !== "correct") {
       playSound("correct");
       setStatus("correct");
       setValue(middleExpected);
       onCorrect();
    } else if (!isFullMatch(value, middleExpected) && status === "correct") {
       setStatus("typing");
    }
  }, [value, middleExpected, status, onCorrect, playSound]);

  const containerClass = `w-full relative flex items-center rounded-2xl border-2 transition-all shadow-sm ${
    status === "correct" 
      ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 text-[var(--duo-correct)] animate-[dictation-correct_0.5s_ease-in-out]" 
      : "border-border bg-white focus-within:border-[var(--duo-blue)] focus-within:ring-4 focus-within:ring-[var(--duo-blue)]/20"
  } ${shake ? "animate-[dictation-shake_0.3s_ease-in-out] border-[var(--duo-red)] bg-[var(--duo-red)]/5 text-[var(--duo-red)]" : ""}`;

  return (
    <div className="w-full relative flex flex-col gap-2">
      <div className={containerClass}>
        {prefix && (
          <span className={`pl-4 sm:pl-5 text-base sm:text-lg font-bold whitespace-pre ${status === 'correct' ? 'text-[var(--duo-correct)]' : 'text-muted-foreground'}`}>
            {prefix}
          </span>
        )}
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (showHint) setShowHint(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 py-4 sm:py-6 ${prefix ? 'pl-0' : 'pl-4 sm:pl-5'} ${suffix ? 'pr-0' : 'pr-4 sm:pr-5'} text-base sm:text-lg border-none bg-transparent shadow-none focus-visible:ring-0 ${
            status === "correct" ? "font-extrabold text-[var(--duo-correct)]" : "font-bold"
          }`}
          readOnly={status === "correct"}
        />
        {suffix && (
          <span className={`pr-10 sm:pr-12 text-base sm:text-lg font-bold whitespace-pre ${status === 'correct' ? 'text-[var(--duo-correct)]' : 'text-muted-foreground'}`}>
            {suffix}
          </span>
        )}
        {status === "correct" && (
          <CheckCircle className="w-6 h-6 text-[var(--duo-correct)] absolute right-4 top-1/2 -translate-y-1/2" />
        )}
      </div>
      {showHint && (
        <div className={cn(
          "text-sm font-extrabold px-4 py-3 rounded-xl border-2 transition-all animate-in fade-in slide-in-from-top-1 shadow-sm",
          mistakeCount >= 3 ? "text-[var(--duo-orange)] bg-[var(--duo-orange)]/10 border-[var(--duo-orange)]/30" : "text-[var(--duo-red)] bg-[var(--duo-red)]/10 border-[var(--duo-red)]/30"
        )}>
          {getHintText()}
        </div>
      )}
    </div>
  );
};

const KeywordDictationInput = ({ 
  expected, 
  onCorrect,
  isDoneInSession,
  autoFocus,
  forceReveal
}: { 
  expected: string, 
  onCorrect: () => void,
  isDoneInSession: boolean,
  autoFocus?: boolean,
  forceReveal?: boolean
}) => {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"typing" | "correct" | "error">(isDoneInSession ? "correct" : "typing");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playSound } = useSound();

  useEffect(() => {
    if (forceReveal) {
      setStatus("correct");
      setValue(expected);
    } else if (isDoneInSession) {
      // Nếu đã làm xong (hoặc vừa check xong), giữ nguyên trạng thái lỗi nếu đang lỗi
      setStatus(prev => prev === "error" ? "error" : "correct");
      setValue(prev => prev ? prev : expected);
    }
  }, [isDoneInSession, forceReveal, expected]);

  useEffect(() => {
    if (autoFocus && inputRef.current && status !== "correct") {
      inputRef.current.focus();
    }
  }, [autoFocus, status]);

  const handleCheck = () => {
    if (isFullMatch(value, expected)) {
      playSound("correct");
      setStatus("correct");
      setValue(expected);
      onCorrect();
    } else {
      playSound("incorrect");
      setStatus("error");
      // Keep value as what user typed
      setShake(true);
      setTimeout(() => setShake(false), 300);
      onCorrect(); // Đánh dấu hoàn thành để chuyển focus
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return;
      handleCheck();
    }
  };

  const containerClass = `inline-block align-middle mx-1 sm:mx-1.5 min-w-[70px] transition-all relative ${
    status === "correct" 
      ? "animate-[dictation-correct_0.5s_ease-in-out]" 
      : ""
  } ${shake ? "animate-[dictation-shake_0.3s_ease-in-out]" : ""}`;

  return (
    <div className={containerClass}>
      <div className="relative flex items-center justify-center group">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            setValue(val);
            if (status === "error") setStatus("typing");
            
            // Auto check
            if (isFullMatch(val, expected)) {
              playSound("correct");
              setStatus("correct");
              setValue(expected);
              onCorrect();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="..."
          className={`w-full text-center px-2 py-1 h-auto text-sm sm:text-base border-2 shadow-sm focus-visible:ring-0 ${
            status === "correct" 
              ? "font-bold text-[var(--duo-correct)] border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 pr-6" 
              : status === "error"
              ? "font-bold text-[var(--duo-red)] border-[var(--duo-red)] bg-[var(--duo-red)]/10 pr-6"
              : "font-bold border-border bg-white focus-visible:border-[var(--duo-blue)] focus-visible:ring-[var(--duo-blue)]/20 pr-6"
          }`}
          readOnly={status === "correct" || status === "error"}
          style={{ width: `${Math.max(70, Math.max(expected.length, value.length) * 10 + 26)}px` }}
        />
        {status === "correct" && (
          <CheckCircle className="w-3.5 h-3.5 text-[var(--duo-correct)] absolute right-2 top-1/2 -translate-y-1/2" />
        )}
        {status === "error" && (
          <>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--duo-red)] select-none">
              !
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 pointer-events-none">
              <div className="bg-white border-2 border-[var(--duo-correct)] text-[var(--duo-correct)] text-xs font-bold px-2 py-1 rounded-md shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                {expected}
              </div>
            </div>
          </>
        )}
        {status === "typing" && (
          <button 
            onClick={handleCheck}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] rounded flex items-center justify-center opacity-100 hover:bg-[var(--duo-blue)] hover:text-white transition-colors"
            title="Kiểm tra (Enter)"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};


const DictationPage = () => {
  const { courseId, quizId } = useParams();
  const location = useLocation();
  const passedQuestionIds = location.state?.questionIds as number[] | undefined;
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
        @keyframes dictation-correct {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [started, setStarted] = useState(false);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isKeywordMode, setIsKeywordMode] = useState(false);
  const { playSound } = useSound();

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
      if (passedQuestionIds && passedQuestionIds.length > 0) {
        const indices = qs
          .map((q, i) => passedQuestionIds.includes(q.id) ? i : -1)
          .filter(i => i !== -1);
        
        if (indices.length > 0) {
          setActiveQuestionIndices(indices);
          setCurrentIndex(indices[0]);
          setStarted(true);
        } else {
          setActiveQuestionIndices(qs.map((_, i) => i));
        }
      } else {
        setActiveQuestionIndices(qs.map((_, i) => i));
      }
    }
  }, [quizData?.questions, started, passedQuestionIds]);

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
          <Button onClick={() => navigate(`/courses/${courseId}`)}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
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
        <div className="max-w-3xl mx-auto card-duo p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 bg-white">
          <div className="flex items-center gap-4 border-b-2 pb-4 sm:pb-6">
            <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft className="w-6 h-6 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{quizData.quiz.title} 🎧</h1>
              <p className="text-base font-bold text-muted-foreground mt-1">Chọn các câu hỏi bạn muốn luyện tập hôm nay</p>
            </div>
          </div>
          
          <div className="bg-muted/20 border-2 rounded-2xl p-6 max-h-[50vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
                <span className="font-extrabold text-lg">Danh sách câu hỏi ({questions.length} câu)</span>
                 <div className="flex gap-3">
                    {completedQuestionIds.size > 0 && (
                      <Button size="sm" className="btn-3d bg-white text-[var(--duo-red)] hover:bg-red-50 border-[var(--duo-red)]/30 font-bold" onClick={() => resetAllMutation.mutate()}>
                        <RefreshCcw className="w-4 h-4 mr-2" /> Làm lại từ đầu
                      </Button>
                    )}
                    <Button className="btn-3d bg-white text-[var(--duo-blue)] hover:bg-blue-50 border-[var(--duo-blue)]/30 font-bold" size="sm" onClick={() => setActiveQuestionIndices(activeQuestionIndices.length === questions.length ? [] : questions.map((_, i) => i))}>
                      {activeQuestionIndices.length === questions.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </Button>
                 </div>
              </div>

              <div className="flex items-center justify-between mb-6 p-4 bg-muted/30 rounded-2xl border-2 shadow-sm">
                 <div className="space-y-0.5">
                   <Label className="text-base font-extrabold text-foreground">Chế độ luyện nghe Keyword</Label>
                   <p className="text-sm font-medium text-muted-foreground">Chỉ điền các từ khóa quan trọng thay vì cả đoạn dài.</p>
                 </div>
                 <Switch 
                   checked={isKeywordMode} 
                   onCheckedChange={setIsKeywordMode} 
                   className="data-[state=checked]:bg-[var(--duo-blue)]"
                 />
              </div>
              
              {/* Filtered Vocab Info */}
              {activeQuestionIndices.length > 0 && (
                <div className="mb-6 p-4 bg-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/20 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 text-[var(--duo-blue)]">
                    <Library className="w-5 h-5" />
                    <span className="text-base font-extrabold">
                      Các câu đã chọn có {vocabWords.filter(w => activeQuestionIndices.map(idx => questions[idx].id).includes(w.question_id)).length} từ vựng
                    </span>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-[var(--duo-blue)] font-extrabold text-base hover:text-[var(--duo-blue)]/80 p-0"
                    onClick={() => {
                      const selectedIds = activeQuestionIndices.map(idx => questions[idx].id);
                      if (lessonId) {
                        navigate(`/courses/${courseId}/vocab-lesson/${lessonId}`, { state: { questionIds: selectedIds } });
                      } else {
                        toast({ title: "Đang tải dữ liệu...", description: "Vui lòng thử lại sau giây lát." });
                      }
                    }}
                  >
                    Học từ vựng ngay <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              )}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
               {questions.map((q: any, idx: number) => (
                 <label key={q.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${activeQuestionIndices.includes(idx) ? 'bg-[var(--duo-blue)]/10 border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5' : 'bg-white border-border hover:bg-muted/50 hover:border-border/80'}`}>
                   <Checkbox 
                     checked={activeQuestionIndices.includes(idx)}
                     onCheckedChange={() => handleToggleQuestion(idx)}
                     className={activeQuestionIndices.includes(idx) ? "data-[state=checked]:bg-[var(--duo-blue)] data-[state=checked]:border-[var(--duo-blue)]" : ""}
                   />
                   <span className="text-base font-bold text-foreground">Câu số {idx + 1} {completedQuestionIds.has(q.id) && <CheckCircle className="w-4 h-4 text-[var(--duo-correct)] inline ml-1" />}</span>
                 </label>
               ))}
             </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t-2">
             <Button onClick={startDictation} disabled={activeQuestionIndices.length === 0} className="btn-3d btn-3d-primary text-lg px-8 py-6 h-auto w-full sm:w-auto">
               <Play className="w-5 h-5 mr-2" /> Bắt đầu luyện ({activeQuestionIndices.length} câu)
             </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (isSubmitted) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="card-duo p-6 sm:p-10 text-center space-y-5 sm:space-y-6 bg-white">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--duo-correct)]/10 rounded-full mx-auto flex items-center justify-center border-4 border-[var(--duo-correct)]/20 shadow-sm">
              <CheckCircle className="w-12 h-12 text-[var(--duo-correct)]" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-foreground">Tuyệt vời! 🎉</h1>
            <p className="text-lg font-bold text-muted-foreground">Bạn đã hoàn thành phiên luyện nghe.</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t-2">
              <Button 
                className="btn-3d bg-[var(--duo-orange)] hover:bg-[var(--duo-orange)]/90 border-[#E58700] text-white py-6 px-8 text-lg h-auto"
                onClick={() => {
                  if (lessonId) {
                    navigate(`/courses/${courseId}/vocab-lesson/${lessonId}`, { state: { questionIds: activeQuestionIndices.map(idx => questions[idx].id) } });
                  }
                }}
              >
                <Library className="w-5 h-5 mr-2" /> Học từ vựng các câu này
              </Button>
              <Button 
                className="btn-3d btn-3d-blue py-6 px-8 text-lg h-auto"
                onClick={() => {
                   setIsSubmitted(false);
                   setCurrentIndex(activeQuestionIndices[0]);
                }}
              >
                <RefreshCcw className="w-5 h-5 mr-2" /> Luyện nghe tiếp
              </Button>
              <Button 
                className="btn-3d bg-white text-foreground hover:bg-gray-50 border-border py-6 px-8 text-lg h-auto"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                Quay về khóa học
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold px-2 text-foreground">Chi tiết đáp án 📖</h2>
            {activeQuestionIndices.map((idx) => {
              const q = questions[idx];
              return (
                <div key={q.id} className="card-duo p-6 space-y-5 bg-white border-2">
                  <div className="flex items-center justify-between border-b-2 pb-4">
                    <span className="text-xl font-extrabold text-[var(--duo-blue)]">Câu {idx + 1}</span>
                    {q.audio_url && (
                      <audio 
                        src={q.audio_url} 
                        controls 
                        className="h-10 max-w-[200px] sm:max-w-[250px]"
                        onPlay={(e) => {
                          const audios = document.getElementsByTagName('audio');
                          for (let i = 0; i < audios.length; i++) {
                            if (audios[i] !== e.currentTarget) {
                              audios[i].pause();
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="p-5 bg-muted/20 rounded-2xl border-2 text-lg font-medium text-foreground leading-relaxed">
                      {q.question_text?.replace("[___]", "_____")}
                    </div>
                    <div className="grid gap-3">
                      {q.answers.map((ans: any, aIdx: number) => (
                        <div key={ans.id} className="flex gap-4 items-center p-4 bg-[var(--duo-correct)]/10 border-2 border-[var(--duo-correct)]/20 rounded-xl">
                          <span className="w-8 h-8 rounded-lg bg-white border-2 border-[var(--duo-correct)] text-[var(--duo-correct)] flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0">
                            {String.fromCharCode(65 + aIdx)}
                          </span>
                          <span className="text-foreground font-bold text-lg">{ans.answer_text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </StudentLayout>
    );
  }

  // State per dictation page
  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Back */}
        <div className="flex items-center justify-between bg-white card-duo p-4 sm:p-5 border-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full shrink-0" onClick={() => setStarted(false)}>
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-foreground truncate">{quizData.quiz.title}</h1>
              <p className="text-xs sm:text-sm font-bold text-[var(--duo-correct)] flex items-center gap-1.5 mt-0.5 sm:mt-1">
                <span className="w-2 h-2 rounded-full bg-[var(--duo-correct)] inline-block animate-pulse"></span>
                <span className="truncate">Luyện nghe điền từ • {completedQuestionIds.size}/{questions.length} hoàn thành</span>
              </p>
            </div>
          </div>

          {/* D4: Mobile Sheet Trigger right inside header to avoid floating bottom blocks */}
          <div className="lg:hidden shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="btn-3d btn-3d-blue h-9 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm shadow-sm flex items-center gap-1.5">
                  <Library className="w-4 h-4" /> Danh sách & Từ vựng
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t-4 border-[var(--duo-blue)] p-0 overflow-hidden bg-muted/10">
                <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-white">
                  <QuestionVocabSidebar vocabWords={vocabWords} currentQuestionId={currentQuestion?.id} />
                  
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-lg sm:text-xl text-foreground flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-[var(--duo-blue)]" /> Danh sách câu hỏi
                    </h3>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-1">
                      {activeQuestionIndices.map((idx: number) => {
                        const q = questions[idx];
                        const isDone = completedQuestionIds.has(q.id);
                        const isCurrent = currentIndex === idx;
                        return (
                          <SheetClose asChild key={q.id}>
                            <button
                              onClick={() => setCurrentIndex(idx)}
                              className={`aspect-square flex items-center justify-center rounded-xl text-sm font-extrabold transition-all border-2
                                ${isCurrent ? 'border-[var(--duo-blue)] bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5' : ''}
                                ${isDone && !isCurrent ? 'bg-[var(--duo-correct)] border-[var(--duo-correct-dark)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]' : ''}
                                ${!isDone && !isCurrent ? 'bg-white border-border text-muted-foreground hover:bg-muted/50' : ''}
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-230px)] lg:overflow-hidden">
          
          {/* Main Workspace */}
          <div className="lg:col-span-3 card-duo p-4 sm:p-6 md:p-8 flex flex-col space-y-4 sm:space-y-6 bg-white h-full lg:overflow-hidden">
            
            <div className="flex justify-between items-center pb-3 sm:pb-5 border-b-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--duo-blue)]">Câu {currentIndex + 1}</h2>
              <div className="hidden sm:flex items-center gap-3 text-sm font-bold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg border">
                <kbd className="px-2 py-0.5 bg-white rounded border shadow-sm text-xs font-mono">Ctrl</kbd>
                Phát / Dừng Audio
              </div>
            </div>

            {/* Audio Block */}
            {currentQuestion.audio_url && (
              <div className="w-full bg-[var(--duo-blue)]/5 p-3 sm:p-6 rounded-2xl border-2 border-[var(--duo-blue)]/20 flex flex-col items-center gap-3 sm:gap-4">
                <audio 
                  ref={audioRef} 
                  src={currentQuestion.audio_url} 
                  controls 
                  className="w-full max-w-lg h-10 sm:h-12 rounded-full shadow-sm"
                  autoPlay
                />
                <div className="flex flex-wrap justify-center items-center gap-1.5 bg-white border-2 rounded-xl p-1 shadow-sm">
                  {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                    <Button
                      key={speed}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm font-extrabold rounded-lg transition-colors",
                        audioRef.current?.playbackRate === speed ? "bg-[var(--duo-blue)] text-white shadow-[0_2px_0_#1899D6]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
            <div className="space-y-4 sm:space-y-6 overflow-y-auto w-full max-w-3xl mx-auto flex-1 pr-1">
              <QuestionDictationSection 
                key={`q-${currentQuestion.id}-${sessionDone.has(currentQuestion.id)}`}
                question={currentQuestion} 
                isCompleted={completedQuestionIds.has(currentQuestion.id)}
                isDoneInSession={sessionDone.has(currentQuestion.id)}
                onComplete={() => saveAnswerMutation.mutate(currentQuestion.id)}
                onRedo={() => resetAnswerMutation.mutate(currentQuestion.id)}
                isKeywordMode={isKeywordMode}
                vocabWords={vocabWords}
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 sm:pt-6 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-auto">
               <span className="text-xs sm:text-base font-extrabold text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-[var(--duo-correct)]/20 w-full sm:w-auto text-center">
                 Đã xong {completedQuestionIds.size}/{questions.length} câu
               </span>
               <div className="flex flex-row gap-2 w-full sm:w-auto justify-end">
                 {sessionDone.has(currentQuestion.id) ? (
                   <Button 
                     onClick={() => handleNext(true)} 
                     className="btn-3d btn-3d-primary text-sm sm:text-lg px-4 sm:px-8 py-2.5 sm:py-6 h-10 sm:h-auto flex-1 sm:flex-none animate-in zoom-in-95 duration-300"
                   >
                     Tiếp tục <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                   </Button>
                 ) : (
                   <Button className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 text-sm sm:text-lg px-4 py-2.5 sm:py-6 h-10 sm:h-auto flex-1 sm:flex-none" onClick={() => handleNext(false)}>
                     <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Bỏ qua
                   </Button>
                 )}
                 <Button 
                   className="btn-3d btn-3d-blue text-sm sm:text-lg px-4 py-2.5 sm:py-6 h-10 sm:h-auto flex-1 sm:flex-none"
                   onClick={() => {
                     playSound("complete");
                     setIsSubmitted(true);
                   }}
                 >
                   <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Nộp bài
                 </Button>
               </div>
            </div>
          </div>

          {/* Sidebar - Question Navigator (Desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:col-span-1 space-y-6 h-full lg:overflow-hidden">
             <QuestionVocabSidebar vocabWords={vocabWords} currentQuestionId={currentQuestion?.id} />
             
             <div className="card-duo p-5 bg-white flex-1 overflow-y-auto">
                <h3 className="font-extrabold text-lg mb-5 text-foreground flex items-center gap-2"><FileQuestion className="w-5 h-5 text-[var(--duo-blue)]" /> Câu hỏi</h3>
                <div className="grid grid-cols-4 gap-3">
                  {activeQuestionIndices.map((idx: number) => {
                    const q = questions[idx];
                    const isDone = completedQuestionIds.has(q.id);
                    const isCurrent = currentIndex === idx;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`aspect-square flex items-center justify-center rounded-xl text-lg font-extrabold transition-all border-2
                          ${isCurrent ? 'border-[var(--duo-blue)] bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5' : ''}
                          ${isDone && !isCurrent ? 'bg-[var(--duo-correct)] border-[var(--duo-correct-dark)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]' : ''}
                          ${!isDone && !isCurrent ? 'bg-white border-border text-muted-foreground hover:bg-muted/50 hover:shadow-sm' : ''}
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
  onRedo,
  isKeywordMode,
  vocabWords
}: { 
  question: any, 
  isCompleted: boolean, 
  isDoneInSession: boolean,
  onComplete: () => void, 
  onRedo: () => void,
  isKeywordMode?: boolean,
  vocabWords?: any[]
}) => {
  const [fields, setFields] = useState<boolean[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  
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

  // Helper: detect if an item in keyword mode has no keywords (manual or vocab)
  const itemHasKeywords = useCallback((item: any) => {
    if (!isKeywordMode) return true;
    // Cloze items are not affected by keyword mode
    if (item.type === 'question' && item.text.includes('[___]')) return true;
    // Has manually set keywords?
    if (question.dictation_keywords?.trim()) return true;
    // Has vocab words for this question?
    const questionVocab = (vocabWords ?? []).filter((w: any) => w.question_id === question.id);
    return questionVocab.length > 0;
  }, [isKeywordMode, question, vocabWords]);

  useEffect(() => {
    // Pre-mark no-keyword items as true so they don't block other items
    setFields(expectedItems.map(item => isDoneInSession || (isKeywordMode ? !itemHasKeywords(item) : false)));
    setFocusedIndex(0);
  }, [expectedItems.length, isDoneInSession, isKeywordMode]);

  const setFieldComplete = (idx: number) => {
    setFields(prev => {
      const next = [...prev];
      next[idx] = true;
      if (next.every(Boolean) && !isCompleted) {
        onComplete();
      } else {
        // Move focus to next field if current is done
        setFocusedIndex(idx + 1);
      }
      return next;
    });
  };

  const renderItem = (item: any, idx: number) => {
    const isCloze = item.type === 'question' && item.text.includes("[___]");
    const clozeParts = isCloze ? item.text.split("[___]") : [];
    
    return (
      <div key={`field-${idx}`} className="flex gap-3 sm:gap-4 items-start">
        <div className={`mt-2 sm:mt-4 w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-extrabold text-base border-2
           ${fields[idx] ? 'bg-[var(--duo-correct)] text-white border-[var(--duo-correct-dark)] shadow-[0_2px_0_var(--duo-correct-dark)]' : 'bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] border-[var(--duo-blue)]/20 shadow-sm'}
        `}>
          {item.type === 'question' ? 'Q' : String.fromCharCode(65 + (idx - (expectedItems[0].type === 'question' ? 1 : 0)))}
        </div>
        
        {isCloze ? (
          <div className="flex-1 bg-white p-4 sm:p-6 rounded-2xl border-2 leading-[2.5] sm:leading-[3] text-lg sm:text-xl font-bold shadow-sm">
            {clozeParts.map((part: any, pIdx: number) => (
              <React.Fragment key={pIdx}>
                {part}
                {pIdx < clozeParts.length - 1 && (
                  <span className="inline-block mx-2 align-middle">
                    {fields[idx + pIdx] ? (
                       <span className="text-[var(--duo-correct)] font-black border-b-4 border-[var(--duo-correct)] px-1 sm:px-2">{question.answers[pIdx]?.answer_text}</span>
                    ) : (
                       <div className="min-w-[100px] sm:min-w-[120px] inline-block -my-3">
                         <DictationInput 
                           expected={question.answers[pIdx]?.answer_text || ""} 
                           placeholder="..." 
                           onCorrect={() => setFieldComplete(idx + pIdx)}
                           autoFocus={focusedIndex === idx + pIdx}
                         />
                       </div>
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="w-full flex-1">
            {isKeywordMode ? (
               <KeywordModeItem 
                 item={item} 
                 question={question}
                 vocabWords={vocabWords}
                 isDoneInSession={fields[idx]}
                 onComplete={() => setFieldComplete(idx)}
                 autoFocus={focusedIndex === idx}
               />
            ) : fields[idx] ? (
               <Input
                 value={item.text}
                 className="w-full py-4 sm:py-6 px-4 sm:px-5 text-base sm:text-lg bg-[var(--duo-correct)]/10 text-[var(--duo-correct)] font-extrabold border-2 border-[var(--duo-correct)] rounded-2xl"
                 readOnly
               />
            ) : (
               <DictationInput 
                 expected={item.text} 
                 placeholder={item.placeholder || "Nghe và điền..."} 
                 onCorrect={() => setFieldComplete(idx)}
                 autoFocus={focusedIndex === idx}
               />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {expectedItems.map((item, idx) => {
        const isFirstItemCloze = expectedItems[0].type === 'question' && expectedItems[0].text.includes("[___]");
        if (isFirstItemCloze && item.type === 'answer') return null;
        return renderItem(item, idx);
      })}
      
      {isCompleted && question.translation && (
        <div className="mt-8 p-5 bg-[var(--duo-blue)]/5 rounded-2xl border-2 border-[var(--duo-blue)]/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-extrabold text-[var(--duo-blue)] mb-2 uppercase tracking-wide">🇻🇳 Dịch nghĩa:</p>
          <p className="text-lg font-bold text-foreground whitespace-pre-wrap">{question.translation}</p>
        </div>
      )}
      
      {isCompleted && (
        <div className="mt-8 flex justify-center">
          <Button className="btn-3d bg-white text-muted-foreground hover:text-foreground hover:bg-gray-50 border-gray-200" size="sm" onClick={onRedo}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Làm lại câu này
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
    <div className="card-duo p-5 bg-[var(--duo-orange)]/5 border-2 border-[var(--duo-orange)]/20 shadow-sm">
      <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2 text-[var(--duo-orange)]">
        <Library className="w-5 h-5" /> Từ vựng trong câu
      </h3>
      <div className="space-y-4">
        {currentVocab.map(w => (
          <div key={w.id} className="text-sm border-b-2 border-[var(--duo-orange)]/10 pb-3 last:border-0 bg-white p-3 rounded-xl shadow-sm">
            <div className="flex justify-between items-baseline gap-2 mb-1">
              <span className="font-extrabold text-[var(--duo-orange)] text-base">{w.word}</span>
              <span className="text-xs text-muted-foreground font-mono font-bold bg-muted px-1.5 py-0.5 rounded-md">{w.phonetic}</span>
            </div>
            <p className="text-foreground text-sm font-bold">{w.definition_vi}</p>
            {w.example_sentence && (
              <p className="text-xs font-medium text-muted-foreground italic mt-2 bg-muted/50 p-2 rounded-lg border">"{w.example_sentence}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const KeywordModeItem = ({ item, question, vocabWords, isDoneInSession, onComplete, autoFocus }: any) => {
  const [forceRevealAll, setForceRevealAll] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Shortcut Alt+A to reveal
      if (e.altKey && e.key.toLowerCase() === 'a') {
        setForceRevealAll(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const keywords = useMemo(() => {
    let kw: string[] = [];
    if (question.dictation_keywords?.trim()) {
      // Use explicitly set keywords first
      kw = question.dictation_keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    } else if (vocabWords && vocabWords.length > 0) {
      // Fallback: auto-use vocab words linked to this question as keywords
      const questionVocab = vocabWords.filter((w: any) => w.question_id === question.id);
      kw = questionVocab.map((w: any) => w.word).filter(Boolean);
    }
    // Sort keywords by length descending to match longest first
    return kw.sort((a, b) => b.length - a.length);
  }, [question, vocabWords]);

  const parts = useMemo(() => {
    if (keywords.length === 0) return [{ text: item.text, isKeyword: false }];
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b(${keywords.map(escapeRegExp).join('|')})\\b`, 'gi');
    const splitRes = item.text.split(pattern);
    
    return splitRes.map((part: string) => {
      const isKw = keywords.some(k => k.toLowerCase() === part.toLowerCase());
      return { text: part, isKeyword: isKw };
    }).filter((p: any) => p.text); // remove empty strings
  }, [item.text, keywords]);

  const keywordIndices = useMemo(() => parts.map((p: any, i: number) => p.isKeyword ? i : -1).filter((i: number) => i !== -1), [parts]);
  const [completedKeywords, setCompletedKeywords] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isDoneInSession || forceRevealAll) {
      setCompletedKeywords(new Set(keywordIndices));
    }
  }, [isDoneInSession, forceRevealAll, keywordIndices]);

  useEffect(() => {
    if (keywordIndices.length > 0 && completedKeywords.size === keywordIndices.length && !isDoneInSession) {
      onComplete();
    }
  }, [completedKeywords.size, keywordIndices.length, isDoneInSession, onComplete]);

  // NOTE: When no keywords, we do NOT auto-complete. The parent pre-marks
  // this item as non-blocking so other items are unaffected.

  if (keywordIndices.length === 0) {
    return (
      <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.5] text-base sm:text-lg font-medium shadow-sm">
        {item.text}
        <p className="text-sm text-[var(--duo-orange)] mt-3 font-bold bg-[var(--duo-orange)]/10 p-2 sm:p-3 rounded-lg border border-[var(--duo-orange)]/20">
          ⚠️ Câu này chưa có từ vựng hoặc keyword. Hãy thêm từ vựng cho câu trong trang admin để bật chế độ điền keyword tự động.
        </p>
      </div>
    );
  }


  return (
    <div className="bg-white p-3 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.5] text-base sm:text-lg font-medium shadow-sm flex flex-col items-start gap-2 relative group">
      {!isDoneInSession && keywordIndices.length > 0 && !forceRevealAll && (
        <button 
          onClick={() => setForceRevealAll(true)}
          className="absolute right-2 top-2 z-10 text-[10px] font-bold bg-muted/50 hover:bg-muted text-muted-foreground px-2 py-1 rounded-md transition-colors"
          title="Phím tắt: Alt + A"
        >
          <Eye className="w-3 h-3 inline mr-1" /> Xem đáp án (Alt+A)
        </button>
      )}
      <div className="flex flex-wrap items-center pt-2 sm:pt-0 w-full">
        {parts.map((part: any, idx: number) => (
          part.isKeyword ? (
            <KeywordDictationInput 
              key={idx}
              expected={part.text}
              forceReveal={forceRevealAll}
              isDoneInSession={completedKeywords.has(idx) || isDoneInSession}
              onCorrect={() => {
                setCompletedKeywords(prev => {
                  const next = new Set(prev);
                  next.add(idx);
                  return next;
                });
              }}
              autoFocus={autoFocus && !completedKeywords.has(idx) && idx === keywordIndices.find(i => !completedKeywords.has(i))}
            />
          ) : (
            <span key={idx} className="whitespace-pre-wrap">{part.text}</span>
          )
        ))}
      </div>
    </div>
  );
};
export default DictationPage;
