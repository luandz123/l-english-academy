import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StudentLayout from "@/components/StudentLayout";
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Volume2, 
  SkipForward, 
  Play, 
  Pause,
  RotateCcw,
  RotateCw,
  RefreshCcw, 
  Library, 
  ArrowRight, 
  FileQuestion, 
  Eye,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/useSound";

// Web Speech API helper for clear TTS pronunciation
const speakText = (text: string) => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\[___\]/g, "blank");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

// Utils for dictation checking
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

// Responsive multiline dictation input component
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { playSound } = useSound();

  const [errorDetails, setErrorDetails] = useState<{ correctWord: string, inputWord?: string, isMissing?: boolean, isExtra?: boolean } | null>(null);

  // Auto-resize textarea height so entire sentence is always fully visible
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const getHintText = () => {
    if (errorDetails) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold">
              {errorDetails.isMissing ? (
                <>Gợi ý từ tiếp theo: <span className="text-[var(--duo-blue)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-blue)]/20 font-extrabold">"{errorDetails.correctWord}"</span></>
              ) : errorDetails.isExtra ? (
                <>Từ bị thừa: <span className="text-[var(--duo-red)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-red)]/20 line-through font-extrabold">"{errorDetails.inputWord}"</span></>
              ) : (
                <>Sửa <span className="text-[var(--duo-red)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-red)]/20 line-through font-extrabold">"{errorDetails.inputWord}"</span> thành <span className="text-[var(--duo-correct)] bg-white px-2 py-0.5 rounded-lg border-2 border-[var(--duo-correct)]/20 font-extrabold">"{errorDetails.correctWord}"</span></>
              )}
            </span>
          </div>
          <div className="text-xs font-extrabold border-t border-border pt-1.5 flex items-center gap-2">
            <span className="bg-muted-foreground/20 text-foreground px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Đáp án đầy đủ</span>
            <span className="text-sm font-bold">{fullExpected}</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="bg-[var(--duo-correct)] text-white px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Đáp án</span>
        <span className="text-sm sm:text-base font-bold">{fullExpected}</span>
      </div>
    );
  };

  const handleCheck = () => {
    const isTargetMiddle = isFullMatch(value, middleExpected);
    const isTargetFull = isFullMatch(value, fullExpected);

    if (isTargetMiddle || isTargetFull) {
      playSound("correct");
      setStatus("correct");
      setShowHint(false);
      setValue(fullExpected);
      onCorrect();
    } else {
      const errorInfo = getFirstErrorWordInfo(value, middleExpected);
      playSound("incorrect");
      setShake(true);
      setTimeout(() => setShake(false), 300);
      setMistakeCount(prev => prev + 1);
      if (errorInfo) {
        setErrorDetails({
          correctWord: errorInfo.correctWord,
          inputWord: errorInfo.inputWord,
          isMissing: errorInfo.isMissing,
          isExtra: errorInfo.isExtra
        });
      } else {
        setErrorDetails(null);
      }
      setShowHint(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.nativeEvent?.isComposing) return;
      e.preventDefault();
      handleCheck();
    }
  };

  useEffect(() => {
    if (autoFocus && textareaRef.current && status !== "correct") {
      textareaRef.current.focus();
    }
  }, [autoFocus, status]);

  useEffect(() => {
    if ((isFullMatch(value, middleExpected) || isFullMatch(value, fullExpected)) && status !== "correct") {
       playSound("correct");
       setStatus("correct");
       setValue(fullExpected);
       onCorrect();
    } else if (!isFullMatch(value, middleExpected) && !isFullMatch(value, fullExpected) && status === "correct") {
       setStatus("typing");
    }
  }, [value, middleExpected, fullExpected, status, onCorrect, playSound]);

  const containerClass = `w-full relative flex flex-col rounded-2xl border-2 transition-all shadow-sm ${
    status === "correct" 
      ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 text-foreground animate-[dictation-correct_0.5s_ease-in-out]" 
      : "border-border bg-white focus-within:border-[var(--duo-blue)] focus-within:ring-4 focus-within:ring-[var(--duo-blue)]/15"
  } ${shake ? "animate-[dictation-shake_0.3s_ease-in-out] border-[var(--duo-red)] bg-[var(--duo-red)]/5" : ""}`;

  return (
    <div className="w-full relative flex flex-col gap-2">
      <div className={containerClass}>
        {/* Top hint bar if prefix/suffix exists */}
        {(prefix || suffix) && status !== "correct" && (
          <div className="px-3.5 pt-2 pb-1 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-muted-foreground border-b border-border/50 bg-muted/20 rounded-t-2xl">
            {prefix && (
              <span className="flex items-center gap-1">
                <span>Bắt đầu bằng:</span>
                <span className="text-[var(--duo-blue)] bg-white px-2 py-0.5 rounded-md border shadow-2xs font-black">{prefix.trim()}</span>
              </span>
            )}
            {suffix && (
              <span className="flex items-center gap-1">
                <span>Kết thúc:</span>
                <span className="text-[var(--duo-blue)] bg-white px-2 py-0.5 rounded-md border shadow-2xs font-black">{suffix.trim()}</span>
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center p-3 sm:p-3.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (showHint) setShowHint(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Nghe và gõ câu trả lời (Enter để kiểm tra)..."}
            className={`w-full resize-none text-base sm:text-lg border-none bg-transparent shadow-none focus:outline-none focus-visible:ring-0 leading-relaxed font-bold ${
              status === "correct" ? "text-[var(--duo-correct)]" : "text-foreground"
            }`}
            readOnly={status === "correct"}
          />
          
          {status === "correct" ? (
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <button
                type="button"
                onClick={() => speakText(fullExpected)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-white transition-colors"
                title="Nghe phát âm câu này"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <CheckCircle className="w-5 h-5 text-[var(--duo-correct)]" />
            </div>
          ) : (
            <button 
              type="button"
              onClick={handleCheck}
              className="shrink-0 ml-2 px-3 py-1.5 rounded-xl bg-[var(--duo-blue)]/10 hover:bg-[var(--duo-blue)] text-[var(--duo-blue)] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1 shadow-2xs"
              title="Kiểm tra (Enter)"
            >
              Kiểm tra
            </button>
          )}
        </div>
      </div>

      {showHint && (
        <div className={cn(
          "text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 transition-all animate-in fade-in slide-in-from-top-1 shadow-sm",
          mistakeCount >= 3 ? "text-[var(--duo-orange)] bg-[var(--duo-orange)]/10 border-[var(--duo-orange)]/30" : "text-[var(--duo-red)] bg-[var(--duo-red)]/10 border-[var(--duo-red)]/30"
        )}>
          {getHintText()}
        </div>
      )}
    </div>
  );
};

// Keyword Dictation input
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
      setShake(true);
      setTimeout(() => setShake(false), 300);
      onCorrect();
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
  const { courseId, lessonId, quizId } = useParams<{ courseId: string; lessonId?: string; quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { playSound } = useSound();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [sessionDone, setSessionDone] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isKeywordMode, setIsKeywordMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<"all" | "uncompleted">("all");

  const audioRef = useRef<HTMLAudioElement>(null);
  const passedQuestionIds = location.state?.questionIds as number[] | undefined;

  // Fetch Quiz Data
  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["dictation-quiz", quizId],
    queryFn: async () => {
      const { data: quiz, error: qErr } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", Number(quizId))
        .single();
      if (qErr) throw qErr;

      const { data: questions, error: questErr } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          audio_url,
          translation,
          explanation,
          dictation_keywords,
          display_order,
          passage_text,
          transcript,
          image_url,
          answers(id, answer_text, is_correct, display_order)
        `)
        .eq("quiz_id", Number(quizId))
        .order("display_order", { ascending: true });

      if (questErr) throw questErr;

      const sortedQuestions = (questions || []).map((q: any) => ({
        ...q,
        answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order)
      }));

      return { quiz, questions: sortedQuestions };
    }
  });

  // Fetch linked vocabulary
  const { data: vocabWords = [] } = useQuery({
    queryKey: ["dictation-vocab", quizId],
    queryFn: async () => {
      if (!quizData?.questions || quizData.questions.length === 0) return [];
      const questionIds = quizData.questions.map((q: any) => q.id);
      
      const { data, error } = await supabase
        .from("vocab_questions")
        .select("*")
        .in("question_id", questionIds);
        
      if (error) {
        console.warn("Could not fetch question vocab:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!quizData?.questions && quizData.questions.length > 0
  });

  // Fetch or Create user quiz result for tracking
  const { data: userResult, isLoading: resultLoading } = useQuery({
    queryKey: ["dictation-result", quizId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: existing, error: findErr } = await supabase
        .from("user_quiz_results")
        .select("*")
        .eq("quiz_id", Number(quizId))
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) throw findErr;
      if (existing) return existing;

      const { data: created, error: createErr } = await supabase
        .from("user_quiz_results")
        .insert({
          quiz_id: Number(quizId),
          user_id: user.id,
          score: 0,
          total_questions: quizData?.questions.length || 0,
          correct_answers: 0
        })
        .select()
        .single();

      if (createErr) throw createErr;
      return created;
    },
    enabled: !!user && !!quizData
  });

  const targetResultId = userResult?.id;

  // Fetch already completed answers
  const { data: userAnswers = [] } = useQuery({
    queryKey: ["dictation-answers", targetResultId],
    queryFn: async () => {
      if (!targetResultId) return [];
      const { data, error } = await supabase
        .from("user_answers")
        .select("*")
        .eq("result_id", targetResultId)
        .eq("is_correct", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!targetResultId
  });

  // Save answer mutation
  const saveAnswerMutation = useMutation({
    onMutate: async (question_id: number) => {
      if (!targetResultId) return { previousAnswers: [] };
      await queryClient.cancelQueries({ queryKey: ["dictation-answers", targetResultId] });
      const previousAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      
      const newAnswer = {
        result_id: targetResultId,
        question_id,
        is_correct: true,
        selected_answer_id: null
      };
      
      const updated = previousAnswers.some(ua => ua.question_id === question_id)
        ? previousAnswers
        : [...previousAnswers, newAnswer];
        
      queryClient.setQueryData(["dictation-answers", targetResultId], updated);
      return { previousAnswers };
    },
    mutationFn: async (question_id: number) => {
      if (!targetResultId) return;
      const { data: existingAnswer } = await supabase
        .from("user_answers")
        .select("id")
        .eq("result_id", targetResultId)
        .eq("question_id", question_id)
        .maybeSingle();

      if (existingAnswer) {
        await supabase
          .from("user_answers")
          .update({ is_correct: true })
          .eq("id", existingAnswer.id);
      } else {
        await supabase.from("user_answers").insert({
          result_id: targetResultId,
          question_id,
          is_correct: true
        });
      }

      const currentAnswers = queryClient.getQueryData(["dictation-answers", targetResultId]) as any[] || [];
      await supabase
        .from("user_quiz_results")
        .update({
          correct_answers: currentAnswers.length,
          score: currentAnswers.length,
          total_questions: questions.length
        })
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
  const currentQuestionVocab = useMemo(() => {
    return vocabWords.filter((w: any) => w.question_id === currentQuestion?.id);
  }, [vocabWords, currentQuestion?.id]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  const seekRelative = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0, 
        Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds)
      );
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        togglePlayPause();
      }
      
      // Enter to next if current is done
      if (e.key === "Enter" && sessionDone.has(currentQuestion?.id)) {
        handleNext(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [currentQuestion?.id, sessionDone]);

  // Handle active questions initialization
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

  // Questions displayed in matrix according to filter
  const displayedQuestions = useMemo(() => {
    if (questionFilter === "uncompleted") {
      const uncompleted = activeQuestionIndices.filter(idx => !completedQuestionIds.has(questions[idx]?.id));
      return uncompleted.length > 0 ? uncompleted : activeQuestionIndices;
    }
    return activeQuestionIndices;
  }, [questionFilter, activeQuestionIndices, completedQuestionIds, questions]);

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

  const handlePrev = () => {
    const currentActiveIdx = activeQuestionIndices.indexOf(currentIndex);
    if (currentActiveIdx > 0) {
      setCurrentIndex(activeQuestionIndices[currentActiveIdx - 1]);
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

  // Pre-Start Setup Screen
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
          
          <div className="bg-muted/20 border-2 rounded-2xl p-5 sm:p-6 max-h-[50vh] overflow-y-auto">
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
                      Các câu đã chọn có {vocabWords.filter((w: any) => activeQuestionIndices.map(idx => questions[idx].id).includes(w.question_id)).length} từ vựng
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

  // Submitted / Summary Screen
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

  // Active Dictation Training Screen
  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between bg-white card-duo p-4 sm:p-5 border-2">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full shrink-0" onClick={() => setStarted(false)}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-foreground truncate">{quizData.quiz.title}</h1>
              <p className="text-xs font-bold text-[var(--duo-correct)] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[var(--duo-correct)] inline-block animate-pulse"></span>
                <span className="truncate">Luyện nghe điền từ • {completedQuestionIds.size}/{questions.length} câu hoàn thành</span>
              </p>
            </div>
          </div>

          {/* Mobile Sheet Trigger */}
          <div className="lg:hidden shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="btn-3d btn-3d-blue h-9 px-3 text-xs shadow-sm flex items-center gap-1.5 font-bold">
                  <FileQuestion className="w-4 h-4" /> Bảng câu & Từ vựng
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-t-4 border-[var(--duo-blue)] p-0 overflow-hidden bg-white">
                <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-[var(--duo-blue)]" /> Bảng câu & Từ vựng
                    </h3>
                    <SheetClose asChild>
                      <button className="text-xs font-bold text-muted-foreground hover:text-foreground">Đóng ✕</button>
                    </SheetClose>
                  </div>

                  {/* Question Grid on Mobile Sheet */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                        <FileQuestion className="w-4 h-4 text-[var(--duo-blue)]" /> Danh sách câu hỏi ({questions.length})
                      </h4>
                      <span className="text-xs font-extrabold text-[var(--duo-correct)]">
                        {completedQuestionIds.size}/{questions.length} đã làm
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {activeQuestionIndices.map((idx: number) => {
                        const q = questions[idx];
                        const isDone = completedQuestionIds.has(q.id);
                        const isCurrent = currentIndex === idx;
                        return (
                          <SheetClose asChild key={q.id}>
                            <button
                              onClick={() => setCurrentIndex(idx)}
                              className={cn(
                                "aspect-square flex items-center justify-center rounded-xl text-sm font-extrabold transition-all border-2",
                                isCurrent
                                  ? "border-[var(--duo-blue)] bg-[var(--duo-blue)] text-white shadow-[0_2px_0_#1899D6]"
                                  : isDone
                                  ? "bg-[var(--duo-correct)] border-[var(--duo-correct-dark)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]"
                                  : "bg-white border-border text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              {idx + 1}
                            </button>
                          </SheetClose>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vocab on Mobile Sheet */}
                  {currentQuestionVocab.length > 0 && (
                    <div className="space-y-2 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-xs text-[var(--duo-orange)] flex items-center gap-1.5">
                          <Library className="w-3.5 h-3.5" /> Từ vựng câu hiện tại ({currentQuestionVocab.length})
                        </h4>
                        {lessonId && (
                          <Link
                            to={`/courses/${courseId}/vocab-lesson/${lessonId}`}
                            state={{ questionIds: [currentQuestion?.id].filter(Boolean) }}
                            className="text-[11px] font-extrabold text-[var(--duo-blue)] hover:underline flex items-center gap-0.5"
                          >
                            Học Flashcard →
                          </Link>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                        {currentQuestionVocab.map((w: any) => (
                          <div key={w.id} className="p-2 bg-[var(--duo-orange)]/5 rounded-xl border border-[var(--duo-orange)]/20 space-y-1">
                            <div className="flex justify-between items-center gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-black text-[var(--duo-orange)] text-xs truncate">{w.word}</span>
                                <button
                                  type="button"
                                  onClick={() => speakText(w.word)}
                                  className="p-0.5 text-[var(--duo-orange)] hover:bg-white rounded"
                                >
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              </div>
                              {w.phonetic && <span className="text-[10px] text-muted-foreground font-mono bg-white px-1.5 py-0.5 rounded border">{w.phonetic}</span>}
                            </div>
                            <p className="text-foreground text-xs font-bold leading-tight">{w.definition_vi}</p>
                            {w.example_sentence && (
                              <p className="text-[10px] text-muted-foreground italic bg-white/80 p-1.5 rounded border truncate">"{w.example_sentence}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          
          {/* Main Dictation Workspace (8 Columns on Desktop) */}
          <div className="lg:col-span-8 card-duo p-5 sm:p-7 space-y-5 bg-white border-2">
            
            {/* Question Title & Sub-header */}
            <div className="flex justify-between items-center pb-3 border-b-2">
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-black text-[var(--duo-blue)]">
                  Câu {currentIndex + 1}
                </span>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg border">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border">
                <kbd className="px-1.5 py-0.5 bg-white rounded border shadow-2xs text-[11px] font-mono">Ctrl</kbd>
                Phát / Dừng Audio
              </div>
            </div>

            {/* Audio & Control Center Bar */}
            {currentQuestion.audio_url && (
              <div className="w-full bg-[var(--duo-blue)]/5 p-4 sm:p-5 rounded-2xl border-2 border-[var(--duo-blue)]/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                
                {/* Audio Buttons + Controls */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[var(--duo-blue)] text-white flex items-center justify-center shadow-[0_3px_0_#1899D6] hover:brightness-110 active:translate-y-0.5 transition-all shrink-0"
                    title="Phát / Tạm dừng (Ctrl hoặc Space)"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
                  </button>
                  
                  {/* Rewind 5s */}
                  <button
                    type="button"
                    onClick={() => seekRelative(-5)}
                    className="h-10 px-2.5 bg-white border-2 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 shadow-2xs shrink-0"
                    title="Lùi 5 giây"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> -5s
                  </button>

                  {/* Forward 5s */}
                  <button
                    type="button"
                    onClick={() => seekRelative(5)}
                    className="h-10 px-2.5 bg-white border-2 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 shadow-2xs shrink-0"
                    title="Tua tới 5 giây"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> +5s
                  </button>

                  {/* Audio native player */}
                  <audio
                    ref={audioRef}
                    src={currentQuestion.audio_url}
                    controls
                    className="flex-1 h-9 rounded-full min-w-[140px]"
                    autoPlay
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1 bg-white border-2 rounded-xl p-1 shadow-2xs shrink-0">
                  <span className="text-[10px] font-extrabold text-muted-foreground px-1.5 uppercase">Tốc độ:</span>
                  {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.playbackRate = speed;
                          setPlaybackRate(speed);
                        }
                      }}
                      className={cn(
                        "h-7 px-2 text-xs font-black rounded-lg transition-all",
                        playbackRate === speed
                          ? "bg-[var(--duo-blue)] text-white shadow-[0_2px_0_#1899D6]"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dictation Question and Options (Spacious & Wrapped) */}
            <div className="w-full pt-1">
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

            {/* Bottom Navigation & Actions */}
            <div className="pt-4 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button 
                   variant="outline"
                   onClick={handlePrev}
                   disabled={activeQuestionIndices.indexOf(currentIndex) === 0}
                   className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 text-xs sm:text-sm font-extrabold h-10 px-3 flex-1 sm:flex-none"
                 >
                   <ChevronLeft className="w-4 h-4 mr-1" /> Câu trước
                 </Button>
                 <span className="text-xs sm:text-sm font-extrabold text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-3 py-2 rounded-xl border border-[var(--duo-correct)]/20 text-center flex-1 sm:flex-none">
                   Đã làm {completedQuestionIds.size}/{questions.length}
                 </span>
               </div>

               <div className="flex flex-row gap-2 w-full sm:w-auto justify-end">
                 {sessionDone.has(currentQuestion.id) ? (
                   <Button 
                     onClick={() => handleNext(true)} 
                     className="btn-3d btn-3d-primary text-sm sm:text-base px-5 sm:px-7 py-2.5 h-10 sm:h-11 flex-1 sm:flex-none animate-in zoom-in-95 duration-300 font-extrabold"
                   >
                     Tiếp tục <ChevronRight className="w-4 h-4 ml-1.5" />
                   </Button>
                 ) : (
                   <Button className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 text-xs sm:text-sm px-4 py-2 h-10 flex-1 sm:flex-none font-extrabold" onClick={() => handleNext(false)}>
                     <SkipForward className="w-4 h-4 mr-1.5" /> Bỏ qua
                   </Button>
                 )}
                 <Button 
                   className="btn-3d btn-3d-blue text-xs sm:text-sm px-4 py-2 h-10 flex-1 sm:flex-none font-extrabold"
                   onClick={() => {
                     playSound("complete");
                     setIsSubmitted(true);
                   }}
                 >
                   <CheckCircle className="w-4 h-4 mr-1.5" /> Nộp bài
                 </Button>
               </div>
            </div>
          </div>

          {/* Right Column: Question Grid & Vocab Spotlight (4 Columns on Desktop) */}
          <div className="hidden lg:flex lg:flex-col lg:col-span-4 space-y-4">
            
            {/* Card 1: Question Navigator Matrix (Full Visibility - No Cramped Scroll) */}
            <div className="bg-white card-duo p-4 sm:p-5 border-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-[var(--duo-blue)]" />
                  <h3 className="font-black text-base text-foreground">Bảng câu hỏi</h3>
                </div>
                <span className="text-xs font-black text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-2.5 py-1 rounded-lg border border-[var(--duo-correct)]/20">
                  {completedQuestionIds.size}/{questions.length} ({Math.round((completedQuestionIds.size / (questions.length || 1)) * 100)}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-[var(--duo-correct)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(completedQuestionIds.size / (questions.length || 1)) * 100}%` }}
                />
              </div>

              {/* Filter Tabs: All vs Uncompleted */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border text-xs font-extrabold">
                <button
                  type="button"
                  onClick={() => setQuestionFilter("all")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-all text-center",
                    questionFilter === "all"
                      ? "bg-white text-[var(--duo-blue)] shadow-sm border border-[var(--duo-blue)]/20 font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tất cả ({questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionFilter("uncompleted")}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-all text-center",
                    questionFilter === "uncompleted"
                      ? "bg-white text-[var(--duo-orange)] shadow-sm border border-[var(--duo-orange)]/20 font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chưa làm ({questions.length - completedQuestionIds.size})
                </button>
              </div>

              {/* Matrix Grid: Full display without restrictive max-height / inner scrolling */}
              <div className="grid grid-cols-5 xl:grid-cols-6 gap-2">
                {displayedQuestions.map((idx: number) => {
                  const q = questions[idx];
                  const isDone = completedQuestionIds.has(q.id);
                  const isCurrent = currentIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center border-2 relative",
                        isCurrent
                          ? "border-[var(--duo-blue)] bg-[var(--duo-blue)] text-white shadow-[0_3px_0_#1899D6] scale-105 ring-2 ring-[var(--duo-blue)]/30 z-10"
                          : isDone
                          ? "bg-[var(--duo-correct)] border-[var(--duo-correct-dark)] text-white shadow-[0_2px_0_var(--duo-correct-dark)] hover:brightness-105"
                          : "bg-white border-border text-foreground hover:border-[var(--duo-blue)]/50 hover:bg-blue-50/50 shadow-sm"
                      )}
                      title={`Câu ${idx + 1}: ${isDone ? 'Đã làm' : 'Chưa làm'}`}
                    >
                      {idx + 1}
                      {isDone && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-[var(--duo-correct)] rounded-full flex items-center justify-center shadow-2xs text-[9px] font-black border border-[var(--duo-correct)]">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Compact Vocabulary Section for Current Question */}
            <div className="bg-white card-duo p-4 border-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Library className="w-4 h-4 text-[var(--duo-orange)]" />
                  <h3 className="font-black text-sm sm:text-base text-foreground">Từ vựng trong câu</h3>
                </div>
                <span className="text-[11px] font-black text-[var(--duo-orange)] bg-[var(--duo-orange)]/10 px-2 py-0.5 rounded-full border border-[var(--duo-orange)]/20">
                  {currentQuestionVocab.length} từ
                </span>
              </div>

              {currentQuestionVocab.length > 0 ? (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {currentQuestionVocab.map((w: any) => (
                    <div key={w.id} className="p-2 sm:p-2.5 bg-[var(--duo-orange)]/5 rounded-xl border border-[var(--duo-orange)]/20 space-y-1 hover:border-[var(--duo-orange)]/40 transition-colors">
                      <div className="flex justify-between items-center gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-[var(--duo-orange)] text-xs sm:text-sm truncate">{w.word}</span>
                          <button
                            type="button"
                            onClick={() => speakText(w.word)}
                            className="p-1 rounded-md text-[var(--duo-orange)] hover:bg-white hover:shadow-2xs transition-all shrink-0"
                            title="Nghe phát âm từ"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {w.phonetic && (
                          <span className="text-[10px] text-muted-foreground font-mono font-bold bg-white px-1.5 py-0.5 rounded-md border shadow-2xs shrink-0">
                            {w.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground text-xs font-bold leading-tight">{w.definition_vi}</p>
                      {w.example_sentence && (
                        <p className="text-[10px] font-medium text-muted-foreground italic bg-white/90 px-1.5 py-0.5 rounded border truncate leading-relaxed">
                          "{w.example_sentence}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2.5 px-3 bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground flex items-center justify-between">
                  <span className="font-medium">Không có từ vựng riêng câu này</span>
                  {lessonId && (
                    <Link
                      to={`/courses/${courseId}/vocab-lesson/${lessonId}`}
                      state={{ questionIds: [currentQuestion?.id].filter(Boolean) }}
                      className="text-[11px] font-extrabold text-[var(--duo-blue)] hover:underline inline-flex items-center gap-0.5"
                    >
                      Học trọn bộ →
                    </Link>
                  )}
                </div>
              )}

              {lessonId && currentQuestionVocab.length > 0 && (
                <div className="pt-1.5 border-t flex justify-end">
                  <Link
                    to={`/courses/${courseId}/vocab-lesson/${lessonId}`}
                    state={{ questionIds: [currentQuestion?.id].filter(Boolean) }}
                    className="text-[11px] font-extrabold text-[var(--duo-blue)] hover:underline flex items-center gap-0.5"
                  >
                    Luyện Flashcard bài này <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </StudentLayout>
  );
};

// Component managing dictation inputs and completed options
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

  const itemHasKeywords = useCallback((item: any) => {
    if (!isKeywordMode) return true;
    if (item.type === 'question' && item.text.includes('[___]')) return true;
    if (question.dictation_keywords?.trim()) return true;
    const questionVocab = (vocabWords ?? []).filter((w: any) => w.question_id === question.id);
    return questionVocab.length > 0;
  }, [isKeywordMode, question, vocabWords]);

  useEffect(() => {
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
        setFocusedIndex(idx + 1);
      }
      return next;
    });
  };

  const renderItem = (item: any, idx: number) => {
    const isCloze = item.type === 'question' && item.text.includes("[___]");
    const clozeParts = isCloze ? item.text.split("[___]") : [];
    const isQuestionType = item.type === 'question';
    const labelLetter = isQuestionType ? 'Q' : String.fromCharCode(65 + (idx - (expectedItems[0].type === 'question' ? 1 : 0)));
    const isDone = fields[idx];
    
    return (
      <div key={`field-${idx}`} className="flex items-start gap-3 sm:gap-4">
        {/* Letter Badge */}
        <div className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm sm:text-base border-2 shadow-sm transition-all mt-1",
          isDone
            ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct-dark)] shadow-[0_2px_0_var(--duo-correct-dark)]"
            : "bg-white text-[var(--duo-blue)] border-[var(--duo-blue)]/30 shadow-[0_2px_0_rgba(24,153,214,0.25)]"
        )}>
          {labelLetter}
        </div>
        
        {/* Input or Completed Content */}
        {isCloze ? (
          <div className="flex-1 bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.6] text-base sm:text-lg font-bold shadow-sm">
            {clozeParts.map((part: any, pIdx: number) => (
              <React.Fragment key={pIdx}>
                <span className="text-foreground">{part}</span>
                {pIdx < clozeParts.length - 1 && (
                  <span className="inline-block mx-1.5 align-middle">
                    {fields[idx + pIdx] ? (
                       <span className="text-[var(--duo-correct)] font-black border-b-2 border-[var(--duo-correct)] px-2 py-0.5 bg-[var(--duo-correct)]/10 rounded-md">
                         {question.answers[pIdx]?.answer_text}
                       </span>
                    ) : (
                       <div className="min-w-[100px] sm:min-w-[130px] inline-block -my-2">
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
          <div className="w-full flex-1 min-w-0">
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
               <div className="w-full p-3.5 sm:p-4.5 flex items-start justify-between gap-3 bg-[var(--duo-correct)]/10 text-foreground font-bold border-2 border-[var(--duo-correct)]/30 rounded-2xl shadow-sm animate-in fade-in duration-300">
                 <p className="text-base sm:text-lg font-bold leading-relaxed break-words flex-1 text-foreground">
                   {item.text}
                 </p>
                 <div className="flex items-center gap-2 shrink-0 pt-0.5">
                   <button
                     type="button"
                     onClick={() => speakText(item.text)}
                     className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-white transition-colors"
                     title="Nghe phát âm câu này"
                   >
                     <Volume2 className="w-4 h-4" />
                   </button>
                   <CheckCircle className="w-5 h-5 text-[var(--duo-correct)] shrink-0" />
                 </div>
               </div>
            ) : (
               <DictationInput 
                 expected={item.text} 
                 placeholder={item.placeholder || "Nghe và điền câu trả lời..."} 
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
    <div className="space-y-4 sm:space-y-5">
      {expectedItems.map((item, idx) => {
        const isFirstItemCloze = expectedItems[0].type === 'question' && expectedItems[0].text.includes("[___]");
        if (isFirstItemCloze && item.type === 'answer') return null;
        return renderItem(item, idx);
      })}
      
      {isCompleted && question.translation && (
        <div className="mt-5 p-4 sm:p-5 bg-[var(--duo-blue)]/5 rounded-2xl border-2 border-[var(--duo-blue)]/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-1.5">
          <p className="text-xs font-black text-[var(--duo-blue)] uppercase tracking-wider flex items-center gap-1.5">
            🇻🇳 Bản dịch nghĩa tiếng Việt:
          </p>
          <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed whitespace-pre-wrap">
            {question.translation}
          </p>
        </div>
      )}
      
      {isCompleted && (
        <div className="mt-4 flex justify-center">
          <Button className="btn-3d bg-white text-muted-foreground hover:text-foreground hover:bg-gray-50 border-gray-200 py-2 px-5 text-xs sm:text-sm font-extrabold" size="sm" onClick={onRedo}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Làm lại câu này
          </Button>
        </div>
      )}
    </div>
  );
};

const KeywordModeItem = ({ item, question, vocabWords, isDoneInSession, onComplete, autoFocus }: any) => {
  const [forceRevealAll, setForceRevealAll] = useState(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
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
      kw = question.dictation_keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    } else if (vocabWords && vocabWords.length > 0) {
      const questionVocab = vocabWords.filter((w: any) => w.question_id === question.id);
      kw = questionVocab.map((w: any) => w.word).filter(Boolean);
    }
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
    }).filter((p: any) => p.text);
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

  if (keywordIndices.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.5] text-base sm:text-lg font-medium shadow-sm">
        {item.text}
        <p className="text-sm text-[var(--duo-orange)] mt-3 font-bold bg-[var(--duo-orange)]/10 p-3 rounded-lg border border-[var(--duo-orange)]/20">
          ⚠️ Câu này chưa có từ vựng hoặc keyword. Hãy thêm từ vựng cho câu trong trang admin để bật chế độ điền keyword tự động.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.6] text-base sm:text-lg font-medium shadow-sm flex flex-col items-start gap-2 relative group">
      {!isDoneInSession && keywordIndices.length > 0 && !forceRevealAll && (
        <button 
          onClick={() => setForceRevealAll(true)}
          className="absolute right-3 top-3 z-10 text-[10px] font-black bg-muted/60 hover:bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border transition-colors shadow-2xs"
          title="Phím tắt: Alt + A"
        >
          <Eye className="w-3.5 h-3.5 inline mr-1" /> Xem đáp án (Alt+A)
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
