import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import StudentLayout from "@/components/StudentLayout";
import { MysteryChestModal } from "@/components/MysteryChestModal";
import { ComboCounter } from "@/components/ComboCounter";
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
  Sparkles, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Award, 
  HelpCircle, 
  Filter,
  Clock
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

// Helper to shuffle array for word bank
export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Helpers to get keywords and check if question has keywords
export const getQuestionKeywords = (question: any, vocabWords: any[] = []): string[] => {
  let kw: string[] = [];
  if (question?.dictation_keywords?.trim()) {
    kw = question.dictation_keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
  } else if (vocabWords && vocabWords.length > 0) {
    const questionVocab = vocabWords.filter((w: any) => w.question_id === question?.id);
    kw = questionVocab.map((w: any) => w.word?.trim()).filter(Boolean);
  }
  return kw.sort((a, b) => b.length - a.length);
};

export const checkQuestionHasKeywords = (question: any, vocabWords: any[] = []): boolean => {
  if (!question) return false;
  if (question.question_text?.includes('[___]')) return true;

  const keywords = getQuestionKeywords(question, vocabWords);
  if (keywords.length === 0) return false;

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b(${keywords.map(escapeRegExp).join('|')})\\b`, 'i');

  if (question.question_text && question.question_text !== 'Audio dictation') {
    if (pattern.test(question.question_text)) return true;
  }

  if (question.answers && Array.isArray(question.answers)) {
    for (const ans of question.answers) {
      if (ans.answer_text && pattern.test(ans.answer_text)) {
        return true;
      }
    }
  }

  return false;
};

export const getQuestionKeywordStats = (
  question: any,
  vocabWords: any[] = [],
  isDone: boolean = false,
  userCorrectSet?: Set<string>
) => {
  const keywords = getQuestionKeywords(question, vocabWords);
  const totalWords = keywords.length;

  if (totalWords === 0) {
    return {
      totalWords: 0,
      correctWords: 0,
      incorrectWords: 0,
      isAuto: true,
      keywords: [],
      correctKeywordList: [],
      missingKeywordList: []
    };
  }

  if (isDone) {
    return {
      totalWords,
      correctWords: totalWords,
      incorrectWords: 0,
      isAuto: false,
      keywords,
      correctKeywordList: [...keywords],
      missingKeywordList: []
    };
  }

  const correctSet = userCorrectSet || new Set<string>();
  const correctKeywordList = keywords.filter(k => correctSet.has(k.toLowerCase().trim()));
  const missingKeywordList = keywords.filter(k => !correctSet.has(k.toLowerCase().trim()));

  return {
    totalWords,
    correctWords: correctKeywordList.length,
    incorrectWords: missingKeywordList.length,
    isAuto: false,
    keywords,
    correctKeywordList,
    missingKeywordList
  };
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
  const { recordDictationProgress, addXp } = useGamification();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeQuestionIndices, setActiveQuestionIndices] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [sessionDone, setSessionDone] = useState<Set<number>>(new Set());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [combo, setCombo] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [dictationMode, setDictationMode] = useState<"drag" | "keyword" | "full">("drag");
  const isKeywordMode = dictationMode === "drag" || dictationMode === "keyword";
  const [isPlaying, setIsPlaying] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<"all" | "uncompleted">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "correct" | "skipped" | "auto">("all");
  const [correctKeywordsMap, setCorrectKeywordsMap] = useState<Record<number, Set<string>>>({});
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(0);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  const handleKeywordCorrect = useCallback((questionId: number, word: string) => {
    setCorrectKeywordsMap(prev => {
      const existing = prev[questionId] ? new Set(prev[questionId]) : new Set<string>();
      existing.add(word.toLowerCase().trim());
      return { ...prev, [questionId]: existing };
    });
  }, []);

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

  // Fetch lesson associated with this quiz
  const { data: lessonData } = useQuery({
    queryKey: ["dictation-lesson-id", quizId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id")
        .eq("quiz_id", Number(quizId))
        .maybeSingle();
      return data;
    },
    enabled: !!quizId
  });

  const effectiveLessonId = lessonId || lessonData?.id || quizId;

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

  // Questions array
  const questions = quizData?.questions ?? [];
  const completedQuestionIds = useMemo(() => new Set(userAnswers.map((ua: any) => ua.question_id)), [userAnswers]);

  // Check if a question is considered auto-completed in Keyword Mode (has no keywords)
  const isQuestionNoKeyword = useCallback((q: any) => {
    if (!q) return false;
    return !checkQuestionHasKeywords(q, vocabWords);
  }, [vocabWords]);

  // Check if a question is considered completed in current session
  const isQuestionDone = useCallback((qId: number) => {
    if (sessionDone.has(qId)) return true;
    if (isKeywordMode && vocabWords.length > 0) {
      const q = questions.find((item: any) => item.id === qId);
      if (q && isQuestionNoKeyword(q)) return true;
    }
    return false;
  }, [sessionDone, isKeywordMode, vocabWords.length, questions, isQuestionNoKeyword]);

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
      setCorrectKeywordsMap(prev => {
        const next = { ...prev };
        delete next[question_id];
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
      setCorrectKeywordsMap({});
      toast({ title: "Đã reset toàn bộ tiến trình!", description: "Bạn có thể bắt đầu luyện tập lại từ đầu." });
    },
    onError: (err: any) => {
      toast({ title: "Lỗi reset", description: err.message, variant: "destructive" });
    }
  });

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

  // Keyboard Shortcuts: Ctrl (Play/Pause), Alt+Left/Right (Seek -5s/+5s), Alt+[/]
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Play/Pause toggle with Ctrl or Alt+Space
      if (e.key === "Control" || (e.altKey && e.code === "Space")) {
        togglePlayPause();
      }

      // Rewind audio: Alt + Left Arrow or Alt + [
      if ((e.altKey && e.key === "ArrowLeft") || (e.altKey && e.key === "[")) {
        e.preventDefault();
        seekRelative(-5);
      }

      // Fast forward audio: Alt + Right Arrow or Alt + ]
      if ((e.altKey && e.key === "ArrowRight") || (e.altKey && e.key === "]")) {
        e.preventDefault();
        seekRelative(5);
      }
      
      // Enter to next if current is done
      if (e.key === "Enter" && currentQuestion && isQuestionDone(currentQuestion.id)) {
        handleNext(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [currentQuestion?.id, isQuestionDone]);

  // Quick preset selectors for questions
  const selectPresetCount = (count: number) => {
    const uncompletedIndices = questions
      .map((q, idx) => (!isQuestionDone(q.id) ? idx : -1))
      .filter(idx => idx !== -1);

    let selected: number[] = [];
    if (uncompletedIndices.length >= count) {
      selected = uncompletedIndices.slice(0, count);
    } else {
      const otherIndices = questions
        .map((_, idx) => idx)
        .filter(idx => !uncompletedIndices.includes(idx));
      selected = [...uncompletedIndices, ...otherIndices].slice(0, count);
    }
    setActiveQuestionIndices(selected.sort((a, b) => a - b));
    toast({ title: `Đã chọn ${selected.length} câu`, description: "Sẵn sàng để bắt đầu luyện tập." });
  };

  const selectUncompletedOnly = () => {
    const uncompleted = questions
      .map((q, idx) => (!isQuestionDone(q.id) ? idx : -1))
      .filter(idx => idx !== -1);
    if (uncompleted.length === 0) {
      toast({ title: "Đã hoàn thành tất cả!", description: "Tất cả các câu đã được làm xong. Chọn tất cả để luyện lại." });
      setActiveQuestionIndices(questions.map((_, idx) => idx));
    } else {
      setActiveQuestionIndices(uncompleted);
      toast({ title: `Đã chọn ${uncompleted.length} câu chưa làm` });
    }
  };

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

  // Completed question count across active or total
  const completedTotalCount = useMemo(() => {
    return questions.filter((q: any) => isQuestionDone(q.id)).length;
  }, [questions, isQuestionDone]);

  // Questions displayed in matrix according to filter
  const displayedQuestions = useMemo(() => {
    if (questionFilter === "uncompleted") {
      const uncompleted = activeQuestionIndices.filter(idx => !isQuestionDone(questions[idx]?.id));
      return uncompleted.length > 0 ? uncompleted : activeQuestionIndices;
    }
    return activeQuestionIndices;
  }, [questionFilter, activeQuestionIndices, isQuestionDone, questions]);

  // Submit and grading calculation
  const handleSubmitQuiz = async () => {
    playSound("complete");

    // Sync all completed & auto-completed questions to user_answers in DB
    if (targetResultId && questions.length > 0) {
      try {
        const doneQuestions = activeQuestionIndices
          .map(idx => questions[idx])
          .filter(q => q && isQuestionDone(q.id));

        for (const q of doneQuestions) {
          const { data: existingAnswer } = await supabase
            .from("user_answers")
            .select("id")
            .eq("result_id", targetResultId)
            .eq("question_id", q.id)
            .maybeSingle();

          if (existingAnswer) {
            await supabase.from("user_answers").update({ is_correct: true }).eq("id", existingAnswer.id);
          } else {
            await supabase.from("user_answers").insert({
              result_id: targetResultId,
              question_id: q.id,
              is_correct: true
            });
          }
        }

        const totalDone = questions.filter(q => isQuestionDone(q.id)).length;
        await supabase.from("user_quiz_results").update({
          correct_answers: totalDone,
          score: totalDone,
          total_questions: questions.length
        }).eq("id", targetResultId);

        queryClient.invalidateQueries({ queryKey: ["dictation-answers", targetResultId] });
        queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
      } catch (e) {
        console.warn("Could not sync all answers to DB:", e);
      }
    }

    const sessionDoneCount = activeQuestionIndices.filter(idx => isQuestionDone(questions[idx]?.id)).length;
    recordDictationProgress(sessionDoneCount || 1);
    
    // Calculate total keywords correct for XP reward
    let earnedXp = sessionDoneCount * 10;
    if (isKeywordMode) {
      let kwCount = 0;
      activeQuestionIndices.forEach(idx => {
        const q = questions[idx];
        const st = getQuestionKeywordStats(q, vocabWords, isQuestionDone(q.id), correctKeywordsMap[q.id]);
        kwCount += st.correctWords;
      });
      earnedXp = Math.max(10, kwCount * 5 + (sessionDoneCount > 0 ? 5 : 0));
    }
    
    addXp(earnedXp, "Hoàn thành bài luyện nghe Dictation!");
    setIsSubmitted(true);
    setShowChestModal(true);
  };

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
      toast({ title: "Đã hết câu hỏi!", description: "Bạn đã hoàn thành các câu đã chọn trong phiên này." });
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
    if (timeLimitMinutes > 0) {
      setTimeLeftSeconds(timeLimitMinutes * 60);
    } else {
      setTimeLeftSeconds(null);
    }
    setStarted(true);
    setIsSubmitted(false);
  };

  // Countdown timer effect
  useEffect(() => {
    if (!started || isSubmitted || timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) {
      playSound("complete");
      toast({ title: "⏰ Hết thời gian làm bài!", description: "Hệ thống đang tự động nộp bài và chấm điểm..." });
      handleSubmitQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, isSubmitted, timeLeftSeconds]);

  // Pre-Start Setup Screen
  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto card-duo p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 bg-white border-2">
          <div className="flex items-center gap-4 border-b-2 pb-4 sm:pb-6">
            <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full" onClick={() => navigate(`/courses/${courseId}`)}>
              <ArrowLeft className="w-6 h-6 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{quizData.quiz.title} 🎧</h1>
              <p className="text-base font-bold text-muted-foreground mt-1">Chọn số lượng hoặc các câu hỏi bạn muốn luyện tập</p>
            </div>
          </div>
          
          <div className="bg-muted/20 border-2 rounded-2xl p-5 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
             
             {/* Header with Quick Presets (5 questions, 10 questions, all, uncompleted) */}
             <div className="space-y-3 pb-4 border-b-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-black text-lg text-foreground">
                    Chọn nhanh số lượng câu ({activeQuestionIndices.length}/{questions.length} câu đã chọn)
                  </span>
                  {completedTotalCount > 0 && (
                    <Button size="sm" className="btn-3d bg-white text-[var(--duo-red)] hover:bg-red-50 border-[var(--duo-red)]/30 font-bold self-start sm:self-auto" onClick={() => resetAllMutation.mutate()}>
                      <RefreshCcw className="w-4 h-4 mr-2" /> Làm lại từ đầu
                    </Button>
                  )}
                </div>

                {/* Preset Buttons Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground mr-1">Chế độ chọn:</span>
                  
                  {/* Preset 5 */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectPresetCount(5)}
                    className={cn(
                      "btn-3d font-black text-xs sm:text-sm h-9 px-3.5",
                      activeQuestionIndices.length === 5 && questions.length >= 5
                        ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/90"
                        : "bg-white text-foreground hover:bg-blue-50 border-border"
                    )}
                  >
                    ⚡ Luyện 5 câu
                  </Button>

                  {/* Preset 10 */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => selectPresetCount(10)}
                    className={cn(
                      "btn-3d font-black text-xs sm:text-sm h-9 px-3.5",
                      activeQuestionIndices.length === 10 && questions.length >= 10
                        ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/90"
                        : "bg-white text-foreground hover:bg-blue-50 border-border"
                    )}
                  >
                    🔥 Luyện 10 câu
                  </Button>

                  {/* Uncompleted Only */}
                  {questions.length - completedTotalCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={selectUncompletedOnly}
                      className="btn-3d font-black text-xs sm:text-sm h-9 px-3.5 bg-white text-[var(--duo-orange)] hover:bg-orange-50 border-[var(--duo-orange)]/30"
                    >
                      🎯 Chỉ câu chưa làm ({questions.length - completedTotalCount})
                    </Button>
                  )}

                  {/* All Questions */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveQuestionIndices(activeQuestionIndices.length === questions.length ? [] : questions.map((_, i) => i))}
                    className={cn(
                      "btn-3d font-black text-xs sm:text-sm h-9 px-3.5",
                      activeQuestionIndices.length === questions.length
                        ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct)] hover:bg-[var(--duo-correct)]/90"
                        : "bg-white text-foreground hover:bg-gray-50 border-border"
                    )}
                  >
                    {activeQuestionIndices.length === questions.length ? "Bỏ chọn tất cả" : `Toàn bộ (${questions.length} câu)`}
                  </Button>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="p-4 sm:p-5 bg-muted/30 rounded-2xl border-2 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--duo-blue)]" />
                    <span className="text-base font-extrabold text-foreground">Chế độ luyện tập</span>
                  </div>
                  <span className="text-xs font-black text-[var(--duo-blue)] bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                    {dictationMode === "drag" ? "🎯 Kéo thả từ khóa" : dictationMode === "keyword" ? "✍️ Gõ từ khóa" : "📝 Chép chính tả cả câu"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode 1: Drag & Drop */}
                  <button
                    type="button"
                    onClick={() => setDictationMode("drag")}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer",
                      dictationMode === "drag"
                        ? "bg-[var(--duo-blue)]/10 border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5"
                        : "bg-white border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm sm:text-base text-foreground flex items-center gap-1.5">
                          🎯 Kéo thả từ khóa
                        </span>
                        <span className="bg-[var(--duo-blue)] text-white text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full">
                          Mới
                        </span>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        Kéo hoặc chạm các từ khóa (keys trong câu) vào chỗ trống. Nhanh & trực quan.
                      </p>
                    </div>
                  </button>

                  {/* Mode 2: Keyword Typing */}
                  <button
                    type="button"
                    onClick={() => setDictationMode("keyword")}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer",
                      dictationMode === "keyword"
                        ? "bg-[var(--duo-blue)]/10 border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5"
                        : "bg-white border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm sm:text-base text-foreground flex items-center gap-1.5">
                          ✍️ Gõ từ khóa
                        </span>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        Tự nhập bàn phím các từ khóa còn thiếu vào từng ô trống.
                      </p>
                    </div>
                  </button>

                  {/* Mode 3: Full Dictation */}
                  <button
                    type="button"
                    onClick={() => setDictationMode("full")}
                    className={cn(
                      "p-3.5 sm:p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer",
                      dictationMode === "full"
                        ? "bg-[var(--duo-blue)]/10 border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5"
                        : "bg-white border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm sm:text-base text-foreground flex items-center gap-1.5">
                          📝 Gõ cả câu
                        </span>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        Luyện nghe nâng cao và tự gõ lại toàn bộ câu đầy đủ.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Time Limit Setting */}
              <div className="p-4 bg-muted/30 rounded-2xl border-2 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--duo-orange)]" />
                    <span className="text-base font-extrabold text-foreground">Thời gian làm bài</span>
                  </div>
                  <span className="text-xs font-black text-[var(--duo-orange)] bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200">
                    {timeLimitMinutes === 0 ? "Không giới hạn" : `${timeLimitMinutes} phút`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: "Không giới hạn", value: 0 },
                    { label: "5 phút", value: 5 },
                    { label: "10 phút", value: 10 },
                    { label: "15 phút", value: 15 },
                    { label: "20 phút", value: 20 },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setTimeLimitMinutes(opt.value)}
                      className={cn(
                        "btn-3d font-black text-xs sm:text-sm h-9 px-3.5",
                        timeLimitMinutes === opt.value
                          ? "bg-[var(--duo-orange)] text-white border-[#E58700] hover:bg-[var(--duo-orange)]/90 shadow-sm"
                          : "bg-white text-foreground hover:bg-orange-50 border-border"
                      )}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Filtered Vocab Info */}
              {activeQuestionIndices.length > 0 && (
                <div className="p-4 bg-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/20 rounded-2xl flex items-center justify-between shadow-sm">
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
                      if (effectiveLessonId) {
                        navigate(`/courses/${courseId}/vocab-lesson/${effectiveLessonId}`, { state: { questionIds: selectedIds } });
                      } else {
                        toast({ title: "Đang tải dữ liệu...", description: "Vui lòng thử lại sau giây lát." });
                      }
                    }}
                  >
                    Học từ vựng ngay <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              )}

             {/* Individual Question Checkbox Matrix */}
             <div className="space-y-2 pt-1">
               <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                 <span>Hoặc tùy chọn từng câu bên dưới:</span>
                 <span>Đã chọn {activeQuestionIndices.length} câu</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                 {questions.map((q: any, idx: number) => {
                   const isDone = isQuestionDone(q.id);
                   const isAuto = isKeywordMode && isQuestionNoKeyword(q);
                   return (
                     <label key={q.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${activeQuestionIndices.includes(idx) ? 'bg-[var(--duo-blue)]/10 border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue)] -translate-y-0.5' : 'bg-white border-border hover:bg-muted/50 hover:border-border/80'}`}>
                       <Checkbox 
                         checked={activeQuestionIndices.includes(idx)}
                         onCheckedChange={() => handleToggleQuestion(idx)}
                         className={activeQuestionIndices.includes(idx) ? "data-[state=checked]:bg-[var(--duo-blue)] data-[state=checked]:border-[var(--duo-blue)]" : ""}
                       />
                       <div className="flex flex-col">
                         <span className="text-base font-bold text-foreground">
                           Câu số {idx + 1} 
                           {isDone && <CheckCircle className="w-4 h-4 text-[var(--duo-correct)] inline ml-1.5" />}
                         </span>
                         {isAuto && (
                           <span className="text-[10px] font-extrabold text-[var(--duo-blue)]">Tự động hoàn thành (Không có keyword)</span>
                         )}
                       </div>
                     </label>
                   );
                 })}
               </div>
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

  // ==========================================
  // Submitted / Detailed Grading Summary Screen
  // ==========================================
  if (isSubmitted) {
    const totalPracticed = activeQuestionIndices.length;
    const correctIndices = activeQuestionIndices.filter(idx => isQuestionDone(questions[idx]?.id));
    const autoCompletedIndices = activeQuestionIndices.filter(idx => isKeywordMode && isQuestionNoKeyword(questions[idx]));
    const skippedIndices = activeQuestionIndices.filter(idx => !correctIndices.includes(idx));

    // Word level stats calculation for each question
    const wordStatsByQuestion = activeQuestionIndices.map(idx => {
      const q = questions[idx];
      const isDone = isQuestionDone(q?.id);
      const stats = getQuestionKeywordStats(q, vocabWords, isDone, correctKeywordsMap[q?.id]);
      return {
        idx,
        question: q,
        stats
      };
    });

    const totalKeywordsCount = wordStatsByQuestion.reduce((sum, item) => sum + item.stats.totalWords, 0);
    const correctKeywordsCount = wordStatsByQuestion.reduce((sum, item) => sum + item.stats.correctWords, 0);
    const skippedKeywordsCount = wordStatsByQuestion.reduce((sum, item) => sum + item.stats.incorrectWords, 0);

    // Score calculation
    let accuracy = 0;
    let scoreOutOf10 = 0;
    let xpEarned = 0;

    if (isKeywordMode && totalKeywordsCount > 0) {
      accuracy = Math.round((correctKeywordsCount / totalKeywordsCount) * 100);
      scoreOutOf10 = Number(((correctKeywordsCount / totalKeywordsCount) * 10).toFixed(1));
      xpEarned = Math.max(10, correctKeywordsCount * 5 + autoCompletedIndices.length * 5);
    } else {
      accuracy = totalPracticed > 0 ? Math.round((correctIndices.length / totalPracticed) * 100) : 0;
      scoreOutOf10 = totalPracticed > 0 ? Number(((correctIndices.length / totalPracticed) * 10).toFixed(1)) : 0;
      xpEarned = correctIndices.length * 10;
    }

    // Filter questions for review list
    const filteredReviewIndices = activeQuestionIndices.filter(idx => {
      const q = questions[idx];
      const isDone = isQuestionDone(q?.id);
      const isAuto = isKeywordMode && isQuestionNoKeyword(q);

      if (reviewFilter === "correct") return isDone;
      if (reviewFilter === "skipped") return !isDone;
      if (reviewFilter === "auto") return isAuto;
      return true;
    });

    const isPerfect = accuracy === 100;
    const isGreat = accuracy >= 80;
    const isGood = accuracy >= 50;

    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
          
          {/* Top Header Card / Score Trophy */}
          <div className="card-duo p-6 sm:p-10 text-center space-y-6 bg-white border-2">
            <div className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto flex items-center justify-center border-4 shadow-sm animate-in zoom-in-75 duration-300",
              isPerfect 
                ? "bg-amber-100 border-amber-400 text-amber-500" 
                : isGreat 
                ? "bg-[var(--duo-correct)]/15 border-[var(--duo-correct)] text-[var(--duo-correct)]" 
                : isGood 
                ? "bg-[var(--duo-blue)]/15 border-[var(--duo-blue)] text-[var(--duo-blue)]" 
                : "bg-orange-100 border-orange-400 text-orange-500"
            )}>
              {isPerfect ? (
                <Trophy className="w-12 h-12" />
              ) : isGreat ? (
                <CheckCircle className="w-12 h-12" />
              ) : isGood ? (
                <Award className="w-12 h-12" />
              ) : (
                <AlertCircle className="w-12 h-12" />
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-foreground">
                {isPerfect ? "Xuất sắc! Điểm tuyệt đối! 🎉" : isGreat ? "Làm rất tốt! 🌟" : isGood ? "Khá tốt! Tiếp tục cố gắng! 👏" : "Hãy cố gắng thêm nhé! 💪"}
              </h1>
              <p className="text-base sm:text-lg font-bold text-muted-foreground">
                Kết quả luyện nghe bài: <span className="text-foreground">{quizData.quiz.title}</span>
                {dictationMode === "drag" ? (
                  <span className="ml-2 text-xs bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] px-2.5 py-1 rounded-full font-black border border-[var(--duo-blue)]/20">
                    🎯 Kéo thả từ khóa • Chấm theo từ đúng/sai
                  </span>
                ) : dictationMode === "keyword" ? (
                  <span className="ml-2 text-xs bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] px-2.5 py-1 rounded-full font-black border border-[var(--duo-blue)]/20">
                    ✍️ Gõ từ khóa • Chấm theo từ đúng/sai
                  </span>
                ) : (
                  <span className="ml-2 text-xs bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] px-2.5 py-1 rounded-full font-black border border-[var(--duo-blue)]/20">
                    📝 Chép chính tả cả câu
                  </span>
                )}
              </p>
            </div>

            {/* KPI Score Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
              
              {/* Score / Accuracy */}
              <div className="p-4 rounded-2xl border-2 bg-muted/20 border-border flex flex-col items-center justify-center space-y-1">
                <span className="text-xs font-black uppercase text-muted-foreground">Điểm số</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--duo-blue)]">{scoreOutOf10}</span>
                  <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                </div>
                <span className="text-xs font-bold text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-2 py-0.5 rounded-md">
                  Đúng {accuracy}% {isKeywordMode ? "từ khóa" : ""}
                </span>
              </div>

              {/* Correct Count */}
              <div className="p-4 rounded-2xl border-2 bg-[var(--duo-correct)]/10 border-[var(--duo-correct)]/30 flex flex-col items-center justify-center space-y-1">
                <span className="text-xs font-black uppercase text-[var(--duo-correct)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isKeywordMode ? "Từ khóa Đúng" : "Đúng / Hoàn thành"}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[var(--duo-correct)]">
                  {isKeywordMode ? `${correctKeywordsCount}` : `${correctIndices.length}`} 
                  <span className="text-xs font-bold text-muted-foreground">
                    / {isKeywordMode ? `${totalKeywordsCount} từ` : `${totalPracticed} câu`}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {correctIndices.length}/{totalPracticed} câu đã hoàn tất
                </span>
              </div>

              {/* Skipped / Incomplete Count */}
              <div className="p-4 rounded-2xl border-2 bg-red-50 border-red-200 flex flex-col items-center justify-center space-y-1">
                <span className="text-xs font-black uppercase text-[var(--duo-red)] flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {isKeywordMode ? "Từ khóa Chưa đúng" : "Bỏ qua / Chưa làm"}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[var(--duo-red)]">
                  {isKeywordMode ? `${skippedKeywordsCount}` : `${skippedIndices.length}`}
                  {isKeywordMode && <span className="text-xs font-bold text-muted-foreground"> từ</span>}
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {skippedIndices.length > 0 ? `${skippedIndices.length} câu chưa xong` : "Đã hoàn tất"}
                </span>
              </div>

              {/* XP Gained */}
              <div className="p-4 rounded-2xl border-2 bg-amber-50 border-amber-200 flex flex-col items-center justify-center space-y-1">
                <span className="text-xs font-black uppercase text-amber-700 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Kinh nghiệm
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600">
                  +{xpEarned} <span className="text-xs font-bold">XP</span>
                </span>
                <span className="text-[11px] font-bold text-amber-600">
                  Thưởng luyện tập
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-4 border-t-2">
              {skippedIndices.length > 0 && (
                <Button 
                  className="btn-3d bg-[var(--duo-orange)] hover:bg-[var(--duo-orange)]/90 border-[#E58700] text-white py-5 px-6 text-base font-extrabold h-auto shadow-md"
                  onClick={() => {
                    setActiveQuestionIndices(skippedIndices);
                    setCurrentIndex(skippedIndices[0]);
                    setIsSubmitted(false);
                    toast({ title: "Luyện lại các câu chưa hoàn thành", description: `Bắt đầu luyện lại ${skippedIndices.length} câu.` });
                  }}
                >
                  <RefreshCcw className="w-4 h-4 mr-2" /> Luyện lại {skippedIndices.length} câu chưa xong
                </Button>
              )}
              
              {effectiveLessonId && (
                <Button 
                  className="btn-3d bg-white text-[var(--duo-blue)] border-[var(--duo-blue)]/30 hover:bg-blue-50 py-5 px-6 text-base font-extrabold h-auto"
                  onClick={() => {
                    navigate(`/courses/${courseId}/vocab-lesson/${effectiveLessonId}`, { 
                      state: { questionIds: activeQuestionIndices.map(idx => questions[idx].id) } 
                    });
                  }}
                >
                  <Library className="w-4 h-4 mr-2" /> Học từ vựng các câu này
                </Button>
              )}

              <Button 
                className="btn-3d btn-3d-blue py-5 px-6 text-base font-extrabold h-auto"
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentIndex(activeQuestionIndices[0]);
                }}
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Luyện lại từ đầu
              </Button>

              <Button 
                className="btn-3d bg-white text-foreground hover:bg-gray-50 border-border py-5 px-6 text-base font-extrabold h-auto"
                onClick={() => navigate(`/courses/${courseId}`)}
              >
                Quay về khóa học
              </Button>
            </div>
          </div>

          {/* Detailed Question Review Breakdown */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                <span>Chi tiết đáp án & Chấm điểm</span>
                <span className="text-sm font-extrabold text-muted-foreground bg-muted px-2.5 py-1 rounded-xl border">
                  {filteredReviewIndices.length}/{totalPracticed} câu
                </span>
              </h2>

              {/* Review Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border text-xs font-black">
                <button
                  type="button"
                  onClick={() => setReviewFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    reviewFilter === "all" ? "bg-white text-[var(--duo-blue)] shadow-sm border border-[var(--duo-blue)]/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tất cả ({totalPracticed})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("correct")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    reviewFilter === "correct" ? "bg-white text-[var(--duo-correct)] shadow-sm border border-[var(--duo-correct)]/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Đúng ({correctIndices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter("skipped")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    reviewFilter === "skipped" ? "bg-white text-[var(--duo-red)] shadow-sm border border-[var(--duo-red)]/20" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Bỏ qua / Chưa xong ({skippedIndices.length})
                </button>
                {autoCompletedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewFilter("auto")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all",
                      reviewFilter === "auto" ? "bg-white text-[var(--duo-blue)] shadow-sm border border-[var(--duo-blue)]/20" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Tự động ({autoCompletedIndices.length})
                  </button>
                )}
              </div>
            </div>

            {/* List of Question Review Cards */}
            <div className="space-y-4">
              {filteredReviewIndices.map((idx) => {
                const q = questions[idx];
                const isDone = isQuestionDone(q.id);
                const isAuto = isKeywordMode && isQuestionNoKeyword(q);
                const qVocab = vocabWords.filter((w: any) => w.question_id === q.id);
                const qKeywords = getQuestionKeywords(q, vocabWords);
                const qStats = getQuestionKeywordStats(q, vocabWords, isDone, correctKeywordsMap[q.id]);

                return (
                  <div key={q.id} className={cn(
                    "card-duo p-5 sm:p-6 space-y-4 bg-white border-2 transition-all",
                    isDone 
                      ? isAuto 
                        ? "border-[var(--duo-blue)]/30 hover:border-[var(--duo-blue)]/60" 
                        : "border-[var(--duo-correct)]/40 hover:border-[var(--duo-correct)]" 
                      : qStats.correctWords > 0 
                      ? "border-amber-300 bg-amber-50/20 hover:border-amber-400"
                      : "border-red-300 bg-red-50/20 hover:border-red-400"
                  )}>
                    
                    {/* Header Row: Number + Status Badge + Audio Player */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl font-black text-foreground">
                          Câu {idx + 1}
                        </span>
                        
                        {/* Status Badge */}
                        {isDone ? (
                          isAuto ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-2.5 py-1 rounded-xl border border-[var(--duo-blue)]/30">
                              <Sparkles className="w-3.5 h-3.5" /> Tự động hoàn thành (Không có từ khóa)
                            </span>
                          ) : isKeywordMode ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-2.5 py-1 rounded-xl border border-[var(--duo-correct)]/30">
                              <CheckCircle className="w-3.5 h-3.5" /> Đúng đủ {qStats.totalWords}/{qStats.totalWords} từ khóa (+{qStats.totalWords * 5} XP)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--duo-correct)] bg-[var(--duo-correct)]/10 px-2.5 py-1 rounded-xl border border-[var(--duo-correct)]/30">
                              <CheckCircle className="w-3.5 h-3.5" /> Chính xác (+10 XP)
                            </span>
                          )
                        ) : isKeywordMode && qStats.correctWords > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--duo-orange)] bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Đúng {qStats.correctWords}/{qStats.totalWords} từ (Thiếu {qStats.incorrectWords} từ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--duo-red)] bg-red-100 px-2.5 py-1 rounded-xl border border-red-300">
                            <XCircle className="w-3.5 h-3.5" /> Bỏ qua / Chưa hoàn thành {isKeywordMode && qStats.totalWords > 0 && `(0/${qStats.totalWords} từ)`}
                          </span>
                        )}
                      </div>

                      {/* Question Audio Player */}
                      {q.audio_url && (
                        <div className="flex items-center gap-2">
                          <audio 
                            src={q.audio_url} 
                            controls 
                            className="h-9 max-w-[220px] sm:max-w-[260px]"
                            onPlay={(e) => {
                              const audios = document.getElementsByTagName('audio');
                              for (let i = 0; i < audios.length; i++) {
                                if (audios[i] !== e.currentTarget) {
                                  audios[i].pause();
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Question Content & Answers */}
                    <div className="space-y-3.5">
                      
                      {/* Transcript / Text */}
                      {q.question_text && q.question_text !== 'Audio dictation' && (
                        <div className="p-4 bg-muted/20 rounded-2xl border-2 text-base sm:text-lg font-bold text-foreground leading-relaxed">
                          {q.question_text?.replace("[___]", "_____")}
                        </div>
                      )}

                      {/* Answers with Keyword highlighting */}
                      <div className="grid gap-2.5">
                        {q.answers.map((ans: any, aIdx: number) => (
                          <div key={ans.id} className={cn(
                            "flex gap-3 sm:gap-4 items-center p-3.5 sm:p-4 rounded-xl border-2 transition-all",
                            isDone 
                              ? "bg-[var(--duo-correct)]/10 border-[var(--duo-correct)]/20" 
                              : "bg-white border-border"
                          )}>
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shadow-sm shrink-0 border-2",
                              isDone ? "bg-white border-[var(--duo-correct)] text-[var(--duo-correct)]" : "bg-muted border-border text-muted-foreground"
                            )}>
                              {String.fromCharCode(65 + aIdx)}
                            </span>
                            <div className="flex-1 flex items-center justify-between gap-2">
                              <span className="text-foreground font-bold text-base sm:text-lg leading-relaxed">
                                {ans.answer_text}
                              </span>
                              <button
                                type="button"
                                onClick={() => speakText(ans.answer_text)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-white transition-colors shrink-0"
                                title="Nghe phát âm"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Keywords list with accurate correct / incorrect indicator */}
                      {qKeywords.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-extrabold text-muted-foreground">Từ khóa cần điền:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {qKeywords.map((kw: string, kIdx: number) => {
                              const isKwCorrect = qStats.correctKeywordList.some(k => k.toLowerCase() === kw.toLowerCase());
                              return (
                                <span 
                                  key={kIdx} 
                                  className={cn(
                                    "text-xs font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-2xs",
                                    isKwCorrect
                                      ? "bg-[var(--duo-correct)]/10 text-[var(--duo-correct)] border-[var(--duo-correct)]/30"
                                      : "bg-red-50 text-[var(--duo-red)] border-red-300 border-dashed"
                                  )}
                                >
                                  {isKwCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                  <span>{kw}</span>
                                  <span className="text-[10px] font-bold opacity-80">
                                    {isKwCorrect ? "(Đúng)" : "(Chưa điền)"}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Vietnamese Translation */}
                      {q.translation && (
                        <div className="p-3.5 bg-[var(--duo-blue)]/5 rounded-xl border border-[var(--duo-blue)]/20 text-sm font-bold text-foreground space-y-1">
                          <span className="text-[11px] font-black uppercase text-[var(--duo-blue)] tracking-wider">
                            🇻🇳 Bản dịch tiếng Việt:
                          </span>
                          <p className="leading-relaxed whitespace-pre-wrap">{q.translation}</p>
                        </div>
                      )}

                      {/* Linked Vocabularies */}
                      {qVocab.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-extrabold text-[var(--duo-orange)] flex items-center gap-1">
                            <Library className="w-3.5 h-3.5" /> Từ vựng trong câu:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {qVocab.map((w: any) => (
                              <div key={w.id} className="inline-flex items-center gap-1.5 bg-[var(--duo-orange)]/10 border border-[var(--duo-orange)]/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                                <span className="font-black text-[var(--duo-orange)]">{w.word}</span>
                                {w.phonetic && <span className="text-muted-foreground font-mono text-[10px]">{w.phonetic}</span>}
                                <span className="text-foreground">({w.definition_vi})</span>
                                <button type="button" onClick={() => speakText(w.word)} className="p-0.5 hover:bg-white rounded text-[var(--duo-orange)]">
                                  <Volume2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // ==========================================
  // Active Dictation Training Screen
  // ==========================================
  const isCurrentAuto = isKeywordMode && isQuestionNoKeyword(currentQuestion);
  const isCurrentDone = currentQuestion ? isQuestionDone(currentQuestion.id) : false;

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
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-foreground truncate">{quizData.quiz.title}</h1>
                {dictationMode === "drag" ? (
                  <span className="bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-[var(--duo-blue)]/20 shrink-0">
                    🎯 Kéo thả từ khóa
                  </span>
                ) : dictationMode === "keyword" ? (
                  <span className="bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-[var(--duo-blue)]/20 shrink-0">
                    ✍️ Gõ từ khóa
                  </span>
                ) : (
                  <span className="bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-[var(--duo-blue)]/20 shrink-0">
                    📝 Gõ cả câu
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-[var(--duo-correct)] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[var(--duo-correct)] inline-block animate-pulse"></span>
                <span className="truncate">Luyện nghe điền từ • {completedTotalCount}/{questions.length} câu hoàn thành</span>
              </p>
            </div>
          </div>

          {/* Right Header Status & Timer & Mobile Sheet */}
          <div className="flex items-center gap-2.5">
            {/* Countdown Timer Badge */}
            {timeLeftSeconds !== null && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-black text-xs sm:text-sm transition-all shadow-2xs",
                timeLeftSeconds <= 60
                  ? "bg-red-50 text-[var(--duo-red)] border-red-300 animate-pulse"
                  : timeLeftSeconds <= 180
                  ? "bg-amber-50 text-amber-600 border-amber-300"
                  : "bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] border-[var(--duo-blue)]/30"
              )}>
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  {Math.floor(timeLeftSeconds / 60).toString().padStart(2, '0')}:{(timeLeftSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Mobile Sheet Trigger */}
            <div className="lg:hidden shrink-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="btn-3d btn-3d-blue h-9 px-3 text-xs shadow-sm flex items-center gap-1.5 font-bold">
                    <FileQuestion className="w-4 h-4" /> Bảng câu ({completedTotalCount}/{questions.length})
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
                        {completedTotalCount}/{questions.length} đã làm
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {activeQuestionIndices.map((idx: number) => {
                        const q = questions[idx];
                        const isDone = isQuestionDone(q.id);
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
                        {effectiveLessonId && (
                          <Link
                            to={`/courses/${courseId}/vocab-lesson/${effectiveLessonId}`}
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
                {isCurrentAuto && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-2.5 py-0.5 rounded-full border border-[var(--duo-blue)]/20">
                    <Sparkles className="w-3.5 h-3.5" /> Tự động hoàn thành
                  </span>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border shadow-2xs text-[11px] font-mono">Ctrl</kbd>
                  <span>Phát/Dừng</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border shadow-2xs text-[11px] font-mono">Alt + ← / →</kbd>
                  <span>Tua 5s</span>
                </span>
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
                    title="Phát / Tạm dừng (Ctrl hoặc Alt+Space)"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
                  </button>
                  
                  {/* Rewind 5s */}
                  <button
                    type="button"
                    onClick={() => seekRelative(-5)}
                    className="h-10 px-2.5 bg-white border-2 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 shadow-2xs shrink-0"
                    title="Lùi 5 giây (Alt + ← hoặc Alt + [)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> -5s
                  </button>

                  {/* Forward 5s */}
                  <button
                    type="button"
                    onClick={() => seekRelative(5)}
                    className="h-10 px-2.5 bg-white border-2 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 shadow-2xs shrink-0"
                    title="Tua tới 5 giây (Alt + → hoặc Alt + ])"
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
                key={`q-${currentQuestion.id}`}
                question={currentQuestion} 
                isCompleted={completedQuestionIds.has(currentQuestion.id)}
                isDoneInSession={isCurrentDone}
                onComplete={() => saveAnswerMutation.mutate(currentQuestion.id)}
                onRedo={() => resetAnswerMutation.mutate(currentQuestion.id)}
                onKeywordCorrect={(word) => handleKeywordCorrect(currentQuestion.id, word)}
                dictationMode={dictationMode}
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
                   Đã làm {completedTotalCount}/{questions.length}
                 </span>
               </div>

               <div className="flex flex-row gap-2 w-full sm:w-auto justify-end">
                 {isCurrentDone ? (
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
                   className="btn-3d btn-3d-blue text-xs sm:text-sm px-4 py-2 h-10 flex-1 sm:flex-none font-extrabold shadow-sm"
                   onClick={handleSubmitQuiz}
                 >
                   <CheckCircle className="w-4 h-4 mr-1.5" /> Nộp bài & Chấm điểm
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
                  {completedTotalCount}/{questions.length} ({Math.round((completedTotalCount / (questions.length || 1)) * 100)}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-[var(--duo-correct)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(completedTotalCount / (questions.length || 1)) * 100}%` }}
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
                  Chưa làm ({questions.length - completedTotalCount})
                </button>
              </div>

              {/* Matrix Grid: Full display without restrictive max-height / inner scrolling */}
              <div className="grid grid-cols-5 xl:grid-cols-6 gap-2">
                {displayedQuestions.map((idx: number) => {
                  const q = questions[idx];
                  const isDone = isQuestionDone(q.id);
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
                      title={`Câu ${idx + 1}: ${isDone ? 'Đã làm / Tự động hoàn thành' : 'Chưa làm'}`}
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
                  {effectiveLessonId && (
                    <Link
                      to={`/courses/${courseId}/vocab-lesson/${effectiveLessonId}`}
                      state={{ questionIds: [currentQuestion?.id].filter(Boolean) }}
                      className="text-[11px] font-extrabold text-[var(--duo-blue)] hover:underline inline-flex items-center gap-0.5"
                    >
                      Học trọn bộ →
                    </Link>
                  )}
                </div>
              )}

              {effectiveLessonId && currentQuestionVocab.length > 0 && (
                <div className="pt-1.5 border-t flex justify-end">
                  <Link
                    to={`/courses/${courseId}/vocab-lesson/${effectiveLessonId}`}
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
      <MysteryChestModal isOpen={showChestModal} onClose={() => setShowChestModal(false)} />
      <ComboCounter combo={combo} />
    </StudentLayout>
  );
};

// Component managing dictation inputs, drag & drop, and completed options
const QuestionDictationSection = ({ 
  question, 
  isCompleted, 
  isDoneInSession, 
  onComplete, 
  onRedo,
  onKeywordCorrect,
  dictationMode = "drag",
  vocabWords
}: { 
  question: any, 
  isCompleted: boolean, 
  isDoneInSession: boolean, 
  onComplete: () => void, 
  onRedo: () => void,
  onKeywordCorrect?: (word: string) => void,
  dictationMode?: "drag" | "keyword" | "full",
  vocabWords?: any[]
}) => {
  const isKeywordMode = dictationMode === "drag" || dictationMode === "keyword";
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

  const hasKeywords = useMemo(() => {
    return checkQuestionHasKeywords(question, vocabWords);
  }, [question, vocabWords]);

  const isCloze = useMemo(() => {
    return expectedItems[0]?.type === 'question' && expectedItems[0]?.text?.includes("[___]");
  }, [expectedItems]);

  const clozeParts = useMemo(() => {
    return isCloze ? expectedItems[0].text.split("[___]") : [];
  }, [isCloze, expectedItems]);

  useEffect(() => {
    // If keyword/drag mode and question has no keywords, it's auto-completed!
    const autoDone = isKeywordMode && !hasKeywords;
    setFields(expectedItems.map(() => isDoneInSession || autoDone));
    setFocusedIndex(0);

    if (autoDone && !isDoneInSession) {
      onComplete();
    }
  }, [expectedItems.length, isDoneInSession, isKeywordMode, hasKeywords, onComplete]);

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
    const isQuestionType = item.type === 'question';
    const labelLetter = isQuestionType ? 'Q' : String.fromCharCode(65 + (idx - (expectedItems[0].type === 'question' ? 1 : 0)));
    const isDone = fields[idx] || isDoneInSession || (isKeywordMode && !hasKeywords);
    
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
          <div className="w-full flex-1 min-w-0">
            {dictationMode === "drag" ? (
              <DragDropClozeSection 
                question={question}
                clozeParts={clozeParts}
                isCompleted={isCompleted}
                isDoneInSession={isDone}
                onComplete={() => setFieldComplete(idx)}
                onKeywordCorrect={onKeywordCorrect}
                onRedo={onRedo}
              />
            ) : (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.6] text-base sm:text-lg font-bold shadow-sm">
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
                              onCorrect={() => {
                                setFieldComplete(idx + pIdx);
                                onKeywordCorrect?.(question.answers[pIdx]?.answer_text || "");
                              }}
                              autoFocus={focusedIndex === idx + pIdx}
                            />
                          </div>
                        )}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex-1 min-w-0">
            {dictationMode === "drag" ? (
              <DragDropKeywordItem 
                item={item} 
                question={question}
                vocabWords={vocabWords}
                isDoneInSession={isDone}
                onComplete={() => setFieldComplete(idx)}
                onKeywordCorrect={onKeywordCorrect}
                autoFocus={focusedIndex === idx}
              />
            ) : dictationMode === "keyword" ? (
              <KeywordModeItem 
                item={item} 
                question={question}
                vocabWords={vocabWords}
                isDoneInSession={isDone}
                onComplete={() => setFieldComplete(idx)}
                onKeywordCorrect={onKeywordCorrect}
                autoFocus={focusedIndex === idx}
              />
            ) : isDone ? (
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

// =========================================================================
// Drag & Drop / Word Bank item for sentences and QA answers
// =========================================================================
const DragDropKeywordItem = ({
  item,
  question,
  vocabWords,
  isDoneInSession,
  onComplete,
  onKeywordCorrect,
  autoFocus
}: any) => {
  const [forceRevealAll, setForceRevealAll] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "error">(isDoneInSession ? "correct" : "idle");
  const [wrongBlanks, setWrongBlanks] = useState<Set<number>>(new Set());
  const [hoveredBlankIdx, setHoveredBlankIdx] = useState<number | null>(null);
  const { playSound } = useSound();

  // Extract keywords in question
  const keywords = useMemo(() => {
    return getQuestionKeywords(question, vocabWords);
  }, [question, vocabWords]);

  // Parse text into parts
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

  // Expected keyword blanks
  const expectedBlanks = useMemo(() => {
    const blanks: { blankIdx: number; expectedWord: string; partIdx: number }[] = [];
    let bIdx = 0;
    parts.forEach((p: any, pIdx: number) => {
      if (p.isKeyword) {
        blanks.push({ blankIdx: bIdx, expectedWord: p.text, partIdx: pIdx });
        bIdx++;
      }
    });
    return blanks;
  }, [parts]);

  // Shuffled word bank tokens
  const bankTokens = useMemo(() => {
    const tokens = expectedBlanks.map((b, i) => ({
      id: `token-${i}-${b.expectedWord}`,
      word: b.expectedWord,
      expectedBlankIdx: b.blankIdx
    }));
    return shuffleArray(tokens);
  }, [expectedBlanks]);

  // Placed map: blankIdx -> token | null
  const [placedMap, setPlacedMap] = useState<Record<number, { id: string; word: string; expectedBlankIdx?: number } | null>>({});

  // Keyboard shortcut Alt + A
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        handleRevealAll();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [expectedBlanks]);

  // Auto-complete if no keywords
  useEffect(() => {
    if (expectedBlanks.length === 0) {
      onComplete();
    }
  }, [expectedBlanks.length, onComplete]);

  // If question is done in session, reveal all correctly
  useEffect(() => {
    if (isDoneInSession && status !== "correct") {
      setStatus("correct");
      const correctPlaced: Record<number, any> = {};
      expectedBlanks.forEach((b) => {
        correctPlaced[b.blankIdx] = { id: `auto-${b.blankIdx}`, word: b.expectedWord, expectedBlankIdx: b.blankIdx };
      });
      setPlacedMap(correctPlaced);
    }
  }, [isDoneInSession, status, expectedBlanks]);

  const handleRevealAll = () => {
    setForceRevealAll(true);
    setStatus("correct");
    setWrongBlanks(new Set());
    const correctPlaced: Record<number, any> = {};
    expectedBlanks.forEach((b) => {
      correctPlaced[b.blankIdx] = { id: `reveal-${b.blankIdx}`, word: b.expectedWord, expectedBlankIdx: b.blankIdx };
      onKeywordCorrect?.(b.expectedWord);
    });
    setPlacedMap(correctPlaced);
    playSound("correct");
    onComplete();
  };

  // Available tokens remaining in bank (not placed in any blank)
  const placedTokenIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(placedMap).forEach(tok => {
      if (tok) ids.add(tok.id);
    });
    return ids;
  }, [placedMap]);

  const availableBankTokens = useMemo(() => {
    return bankTokens.filter(t => !placedTokenIds.has(t.id));
  }, [bankTokens, placedTokenIds]);

  // Validate answers
  const checkAnswers = (currentPlacedMap: Record<number, any>) => {
    let allCorrect = true;
    const wrong = new Set<number>();

    expectedBlanks.forEach(b => {
      const placed = currentPlacedMap[b.blankIdx];
      if (!placed || !isFullMatch(placed.word, b.expectedWord)) {
        allCorrect = false;
        wrong.add(b.blankIdx);
      }
    });

    if (allCorrect) {
      playSound("correct");
      setStatus("correct");
      setWrongBlanks(new Set());
      expectedBlanks.forEach(b => onKeywordCorrect?.(b.expectedWord));
      onComplete();
    } else {
      playSound("incorrect");
      setStatus("error");
      setWrongBlanks(wrong);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, token: { id: string; word: string; expectedBlankIdx?: number }, fromBlankIdx?: number) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ token, fromBlankIdx }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, blankIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredBlankIdx !== blankIdx) {
      setHoveredBlankIdx(blankIdx);
    }
  };

  const handleDragLeave = (e: React.DragEvent, blankIdx: number) => {
    if (hoveredBlankIdx === blankIdx) {
      setHoveredBlankIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetBlankIdx: number) => {
    e.preventDefault();
    setHoveredBlankIdx(null);
    if (status === "correct") return;

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const { token, fromBlankIdx } = JSON.parse(dataStr);

      setPlacedMap(prev => {
        const next = { ...prev };
        
        // If target already had a token and dragged from another blank, swap them!
        const existingTargetToken = next[targetBlankIdx];
        if (fromBlankIdx !== undefined && fromBlankIdx !== null && fromBlankIdx !== targetBlankIdx) {
          next[fromBlankIdx] = existingTargetToken || null;
        } else if (fromBlankIdx !== undefined && fromBlankIdx !== null && fromBlankIdx === targetBlankIdx) {
          return prev;
        }

        next[targetBlankIdx] = token;

        // Auto check if all filled
        const filledCount = Object.values(next).filter(Boolean).length;
        if (filledCount === expectedBlanks.length) {
          setTimeout(() => checkAnswers(next), 150);
        }

        return next;
      });

      setWrongBlanks(prev => {
        const next = new Set(prev);
        next.delete(targetBlankIdx);
        if (fromBlankIdx !== undefined) next.delete(fromBlankIdx);
        return next;
      });
      if (status === "error") setStatus("idle");

    } catch (err) {
      console.warn("Drop error:", err);
    }
  };

  // Click / Tap token from Word Bank -> Fills first empty blank
  const handleTokenClick = (token: { id: string; word: string; expectedBlankIdx?: number }) => {
    if (status === "correct") return;

    // Find first empty blank
    const emptyBlank = expectedBlanks.find(b => !placedMap[b.blankIdx]);
    if (!emptyBlank) return;

    setPlacedMap(prev => {
      const next = { ...prev, [emptyBlank.blankIdx]: token };
      
      // Auto check if all filled
      const filledCount = Object.values(next).filter(Boolean).length;
      if (filledCount === expectedBlanks.length) {
        setTimeout(() => checkAnswers(next), 150);
      }
      return next;
    });

    setWrongBlanks(prev => {
      const next = new Set(prev);
      next.delete(emptyBlank.blankIdx);
      return next;
    });
    if (status === "error") setStatus("idle");
  };

  // Click / Tap placed blank -> Returns token to word bank
  const handleBlankClick = (blankIdx: number) => {
    if (status === "correct") return;
    if (!placedMap[blankIdx]) return;

    setPlacedMap(prev => {
      const next = { ...prev };
      delete next[blankIdx];
      return next;
    });

    setWrongBlanks(prev => {
      const next = new Set(prev);
      next.delete(blankIdx);
      return next;
    });
    if (status === "error") setStatus("idle");
  };

  // Reset all placed tokens back to bank
  const handleReset = () => {
    if (status === "correct") return;
    setPlacedMap({});
    setWrongBlanks(new Set());
    setStatus("idle");
  };

  if (expectedBlanks.length === 0) {
    return (
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.6] text-base sm:text-lg font-medium shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-3 py-1.5 rounded-xl border border-[var(--duo-blue)]/20 w-fit">
          <Sparkles className="w-4 h-4 text-[var(--duo-blue)]" />
          <span>Câu này không có từ khóa cần điền — Tự động tính hoàn thành ✓</span>
        </div>
        <div className="flex items-start justify-between gap-3 text-foreground font-bold">
          <p className="text-base sm:text-lg leading-relaxed flex-1">{item.text}</p>
          <button
            type="button"
            onClick={() => speakText(item.text)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-muted transition-colors shrink-0"
            title="Nghe phát âm câu này"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  let blankCounter = 0;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 shadow-sm flex flex-col gap-4 relative group">
      
      {/* Top Bar Hint & Status */}
      <div className="flex items-center justify-between w-full border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-2.5 py-1 rounded-lg border border-[var(--duo-blue)]/20 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Kéo hoặc chạm từ để điền vào chỗ trống
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isDoneInSession && status !== "correct" && Object.keys(placedMap).length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-extrabold text-muted-foreground hover:text-[var(--duo-red)] bg-muted/50 hover:bg-red-50 px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1"
              title="Đặt lại các từ đã chọn"
            >
              <RotateCcw className="w-3 h-3" /> Đặt lại
            </button>
          )}

          {!isDoneInSession && status !== "correct" && !forceRevealAll && (
            <button 
              type="button"
              onClick={handleRevealAll}
              className="text-[11px] font-black bg-muted/60 hover:bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border transition-colors shadow-2xs flex items-center gap-1"
              title="Phím tắt: Alt + A"
            >
              <Eye className="w-3.5 h-3.5" /> Xem đáp án (Alt+A)
            </button>
          )}

          {status === "correct" && (
            <button
              type="button"
              onClick={() => speakText(item.text)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-muted transition-colors"
              title="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Sentence with Drop Zones */}
      <div className="leading-loose sm:leading-[3.2] text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-y-2">
        {parts.map((part: any, idx: number) => {
          if (!part.isKeyword) {
            return <span key={idx} className="whitespace-pre-wrap">{part.text}</span>;
          }

          const currentBlankIdx = blankCounter++;
          const placedToken = placedMap[currentBlankIdx];
          const isWrong = wrongBlanks.has(currentBlankIdx);
          const isHovered = hoveredBlankIdx === currentBlankIdx;
          const isCorrect = status === "correct";

          return (
            <div
              key={idx}
              onDragOver={(e) => handleDragOver(e, currentBlankIdx)}
              onDragLeave={(e) => handleDragLeave(e, currentBlankIdx)}
              onDrop={(e) => handleDrop(e, currentBlankIdx)}
              onClick={() => handleBlankClick(currentBlankIdx)}
              className={cn(
                "inline-flex items-center justify-center mx-1.5 px-3 py-1 min-w-[90px] min-h-[38px] rounded-xl border-2 transition-all cursor-pointer select-none text-center font-black text-sm sm:text-base align-middle shadow-2xs",
                // Empty blank state
                !placedToken && !isHovered && "border-dashed border-border/90 bg-muted/30 text-muted-foreground/50 hover:border-[var(--duo-blue)]/50 hover:bg-blue-50/30",
                // Hovering over blank state
                !placedToken && isHovered && "border-solid border-[var(--duo-blue)] bg-[var(--duo-blue)]/15 scale-105 shadow-sm text-[var(--duo-blue)]",
                // Filled correct state
                placedToken && isCorrect && "border-[var(--duo-correct)] bg-[var(--duo-correct)]/15 text-[var(--duo-correct-dark)] shadow-[0_2px_0_var(--duo-correct)] animate-[dictation-correct_0.4s_ease-in-out]",
                // Filled wrong state
                placedToken && isWrong && "border-[var(--duo-red)] bg-[var(--duo-red)]/15 text-[var(--duo-red)] shadow-[0_2px_0_var(--duo-red)] animate-[dictation-shake_0.3s_ease-in-out]",
                // Filled active state
                placedToken && !isCorrect && !isWrong && "border-[var(--duo-blue)] bg-white text-[var(--duo-blue)] shadow-[0_2px_0_#1899D6] hover:bg-red-50 hover:border-red-300 hover:text-red-600 group/blank"
              )}
              draggable={!!placedToken && status !== "correct"}
              onDragStart={(e) => placedToken && handleDragStart(e, placedToken, currentBlankIdx)}
              title={placedToken && status !== "correct" ? "Nhấp hoặc kéo để gỡ từ này" : "Ô trống cần điền từ"}
            >
              {placedToken ? (
                <span className="flex items-center gap-1">
                  <span>{placedToken.word}</span>
                  {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 inline ml-0.5 text-[var(--duo-correct)]" />}
                  {isWrong && <span className="text-xs font-black text-[var(--duo-red)] ml-0.5">✕</span>}
                  {!isCorrect && !isWrong && (
                    <span className="text-[10px] text-muted-foreground group-hover/blank:text-red-500 opacity-60 ml-0.5">✕</span>
                  )}
                </span>
              ) : (
                <span className="text-xs font-bold text-muted-foreground/60 tracking-wider">
                  [ chỗ trống {currentBlankIdx + 1} ]
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Word Bank Area */}
      {status !== "correct" && (
        <div className="mt-2 pt-3 border-t-2 border-dashed border-border/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground uppercase flex items-center gap-1">
              <span>Ngân hàng từ khóa ({availableBankTokens.length}/{bankTokens.length}):</span>
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              Nhấp hoặc kéo từ vào ô trống
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-h-[44px] p-2.5 bg-muted/20 rounded-xl border border-border">
            {availableBankTokens.length === 0 ? (
              <span className="text-xs font-bold text-muted-foreground italic py-1">
                Đã đặt hết tất cả các từ vào ô trống. Nhấn "Kiểm tra" nếu chưa tự động chấm.
              </span>
            ) : (
              availableBankTokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, token)}
                  onClick={() => handleTokenClick(token)}
                  className="btn-3d px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-foreground hover:text-[var(--duo-blue)] border-2 border-border hover:border-[var(--duo-blue)] text-sm sm:text-base font-black shadow-sm active:scale-95 transition-all cursor-grab active:cursor-grabbing flex items-center gap-1.5"
                  title="Nhấp để điền nhanh hoặc kéo vào ô trống"
                >
                  <span>{token.word}</span>
                </button>
              ))
            )}
          </div>

          {/* Action Check Bar */}
          {Object.keys(placedMap).length > 0 && status !== "correct" && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-bold">
                {status === "error" ? (
                  <span className="text-[var(--duo-red)] flex items-center gap-1 font-black">
                    <XCircle className="w-3.5 h-3.5" /> Có vị trí chưa chính xác, hãy nhấp vào từ sai để đổi lại nhé!
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Đã điền {Object.keys(placedMap).length}/{expectedBlanks.length} chỗ trống
                  </span>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => checkAnswers(placedMap)}
                disabled={Object.keys(placedMap).length === 0}
                className="btn-3d btn-3d-primary font-black text-xs sm:text-sm h-9 px-4 shadow-sm"
              >
                Kiểm tra đáp án
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Correct Celebration Card */}
      {status === "correct" && (
        <div className="p-3 bg-[var(--duo-correct)]/10 rounded-xl border border-[var(--duo-correct)]/30 flex items-center justify-between text-xs sm:text-sm font-black text-[var(--duo-correct-dark)] animate-in fade-in slide-in-from-bottom-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[var(--duo-correct)]" />
            Chính xác tuyệt đối! Đã hoàn thành các từ khóa của câu này.
          </span>
          <span className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-[var(--duo-correct)]/30 shadow-2xs">
            +{expectedBlanks.length * 5} XP
          </span>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Cloze Drag & Drop Component for questions containing [___]
// =========================================================================
const DragDropClozeSection = ({
  question,
  clozeParts,
  isCompleted,
  isDoneInSession,
  onComplete,
  onKeywordCorrect,
  onRedo
}: any) => {
  const [forceRevealAll, setForceRevealAll] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "error">(isDoneInSession || isCompleted ? "correct" : "idle");
  const [wrongBlanks, setWrongBlanks] = useState<Set<number>>(new Set());
  const [hoveredBlankIdx, setHoveredBlankIdx] = useState<number | null>(null);
  const { playSound } = useSound();

  const expectedAnswers = useMemo(() => {
    return (question.answers || []).map((ans: any, idx: number) => ({
      blankIdx: idx,
      expectedWord: ans.answer_text,
      ansId: ans.id
    }));
  }, [question.answers]);

  // Shuffled word bank tokens
  const bankTokens = useMemo(() => {
    const tokens = expectedAnswers.map((b: any, i: number) => ({
      id: `cloze-tok-${i}-${b.expectedWord}`,
      word: b.expectedWord,
      expectedBlankIdx: b.blankIdx
    }));
    return shuffleArray(tokens);
  }, [expectedAnswers]);

  // Placed map: blankIdx -> token | null
  const [placedMap, setPlacedMap] = useState<Record<number, { id: string; word: string; expectedBlankIdx?: number } | null>>({});

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        handleRevealAll();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [expectedAnswers]);

  useEffect(() => {
    if ((isDoneInSession || isCompleted) && status !== "correct") {
      setStatus("correct");
      const correctPlaced: Record<number, any> = {};
      expectedAnswers.forEach((b: any) => {
        correctPlaced[b.blankIdx] = { id: `auto-${b.blankIdx}`, word: b.expectedWord, expectedBlankIdx: b.blankIdx };
      });
      setPlacedMap(correctPlaced);
    }
  }, [isDoneInSession, isCompleted, status, expectedAnswers]);

  const handleRevealAll = () => {
    setForceRevealAll(true);
    setStatus("correct");
    setWrongBlanks(new Set());
    const correctPlaced: Record<number, any> = {};
    expectedAnswers.forEach((b: any) => {
      correctPlaced[b.blankIdx] = { id: `reveal-${b.blankIdx}`, word: b.expectedWord, expectedBlankIdx: b.blankIdx };
      onKeywordCorrect?.(b.expectedWord);
    });
    setPlacedMap(correctPlaced);
    playSound("correct");
    onComplete();
  };

  const placedTokenIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(placedMap).forEach(tok => {
      if (tok) ids.add(tok.id);
    });
    return ids;
  }, [placedMap]);

  const availableBankTokens = useMemo(() => {
    return bankTokens.filter(t => !placedTokenIds.has(t.id));
  }, [bankTokens, placedTokenIds]);

  const checkAnswers = (currentPlacedMap: Record<number, any>) => {
    let allCorrect = true;
    const wrong = new Set<number>();

    expectedAnswers.forEach((b: any) => {
      const placed = currentPlacedMap[b.blankIdx];
      if (!placed || !isFullMatch(placed.word, b.expectedWord)) {
        allCorrect = false;
        wrong.add(b.blankIdx);
      }
    });

    if (allCorrect) {
      playSound("correct");
      setStatus("correct");
      setWrongBlanks(new Set());
      expectedAnswers.forEach((b: any) => onKeywordCorrect?.(b.expectedWord));
      onComplete();
    } else {
      playSound("incorrect");
      setStatus("error");
      setWrongBlanks(wrong);
    }
  };

  const handleDragStart = (e: React.DragEvent, token: any, fromBlankIdx?: number) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ token, fromBlankIdx }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, blankIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredBlankIdx !== blankIdx) setHoveredBlankIdx(blankIdx);
  };

  const handleDragLeave = (e: React.DragEvent, blankIdx: number) => {
    if (hoveredBlankIdx === blankIdx) setHoveredBlankIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetBlankIdx: number) => {
    e.preventDefault();
    setHoveredBlankIdx(null);
    if (status === "correct") return;

    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const { token, fromBlankIdx } = JSON.parse(dataStr);

      setPlacedMap(prev => {
        const next = { ...prev };
        const existingTarget = next[targetBlankIdx];
        if (fromBlankIdx !== undefined && fromBlankIdx !== null && fromBlankIdx !== targetBlankIdx) {
          next[fromBlankIdx] = existingTarget || null;
        } else if (fromBlankIdx === targetBlankIdx) {
          return prev;
        }
        next[targetBlankIdx] = token;

        const filledCount = Object.values(next).filter(Boolean).length;
        if (filledCount === expectedAnswers.length) {
          setTimeout(() => checkAnswers(next), 150);
        }
        return next;
      });

      setWrongBlanks(prev => {
        const next = new Set(prev);
        next.delete(targetBlankIdx);
        if (fromBlankIdx !== undefined) next.delete(fromBlankIdx);
        return next;
      });
      if (status === "error") setStatus("idle");
    } catch (err) {
      console.warn("Drop error:", err);
    }
  };

  const handleTokenClick = (token: any) => {
    if (status === "correct") return;
    const emptyBlank = expectedAnswers.find((b: any) => !placedMap[b.blankIdx]);
    if (!emptyBlank) return;

    setPlacedMap(prev => {
      const next = { ...prev, [emptyBlank.blankIdx]: token };
      const filledCount = Object.values(next).filter(Boolean).length;
      if (filledCount === expectedAnswers.length) {
        setTimeout(() => checkAnswers(next), 150);
      }
      return next;
    });

    setWrongBlanks(prev => {
      const next = new Set(prev);
      next.delete(emptyBlank.blankIdx);
      return next;
    });
    if (status === "error") setStatus("idle");
  };

  const handleBlankClick = (blankIdx: number) => {
    if (status === "correct") return;
    if (!placedMap[blankIdx]) return;

    setPlacedMap(prev => {
      const next = { ...prev };
      delete next[blankIdx];
      return next;
    });

    setWrongBlanks(prev => {
      const next = new Set(prev);
      next.delete(blankIdx);
      return next;
    });
    if (status === "error") setStatus("idle");
  };

  const handleReset = () => {
    if (status === "correct") return;
    setPlacedMap({});
    setWrongBlanks(new Set());
    setStatus("idle");
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 shadow-sm flex flex-col gap-4">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between w-full border-b border-border/60 pb-2.5">
        <span className="text-xs font-black uppercase text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-2.5 py-1 rounded-lg border border-[var(--duo-blue)]/20 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Kéo hoặc chạm từ để điền vào chỗ trống
        </span>

        <div className="flex items-center gap-2">
          {!isDoneInSession && !isCompleted && status !== "correct" && Object.keys(placedMap).length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-extrabold text-muted-foreground hover:text-[var(--duo-red)] bg-muted/50 hover:bg-red-50 px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Đặt lại
            </button>
          )}

          {!isDoneInSession && !isCompleted && status !== "correct" && !forceRevealAll && (
            <button 
              type="button"
              onClick={handleRevealAll}
              className="text-[11px] font-black bg-muted/60 hover:bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border transition-colors shadow-2xs flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Xem đáp án (Alt+A)
            </button>
          )}
        </div>
      </div>

      {/* Cloze Text with Drop Zones */}
      <div className="leading-loose sm:leading-[3.2] text-base sm:text-lg font-bold text-foreground flex flex-wrap items-center gap-y-2">
        {clozeParts.map((part: string, pIdx: number) => {
          const hasBlankAfter = pIdx < clozeParts.length - 1;
          const currentBlankIdx = pIdx;
          const placedToken = placedMap[currentBlankIdx];
          const isWrong = wrongBlanks.has(currentBlankIdx);
          const isHovered = hoveredBlankIdx === currentBlankIdx;
          const isCorrect = status === "correct";

          return (
            <React.Fragment key={pIdx}>
              <span className="whitespace-pre-wrap">{part}</span>
              {hasBlankAfter && (
                <div
                  onDragOver={(e) => handleDragOver(e, currentBlankIdx)}
                  onDragLeave={(e) => handleDragLeave(e, currentBlankIdx)}
                  onDrop={(e) => handleDrop(e, currentBlankIdx)}
                  onClick={() => handleBlankClick(currentBlankIdx)}
                  className={cn(
                    "inline-flex items-center justify-center mx-1.5 px-3 py-1 min-w-[90px] min-h-[38px] rounded-xl border-2 transition-all cursor-pointer select-none text-center font-black text-sm sm:text-base align-middle shadow-2xs",
                    !placedToken && !isHovered && "border-dashed border-border/90 bg-muted/30 text-muted-foreground/50 hover:border-[var(--duo-blue)]/50 hover:bg-blue-50/30",
                    !placedToken && isHovered && "border-solid border-[var(--duo-blue)] bg-[var(--duo-blue)]/15 scale-105 shadow-sm text-[var(--duo-blue)]",
                    placedToken && isCorrect && "border-[var(--duo-correct)] bg-[var(--duo-correct)]/15 text-[var(--duo-correct-dark)] shadow-[0_2px_0_var(--duo-correct)] animate-[dictation-correct_0.4s_ease-in-out]",
                    placedToken && isWrong && "border-[var(--duo-red)] bg-[var(--duo-red)]/15 text-[var(--duo-red)] shadow-[0_2px_0_var(--duo-red)] animate-[dictation-shake_0.3s_ease-in-out]",
                    placedToken && !isCorrect && !isWrong && "border-[var(--duo-blue)] bg-white text-[var(--duo-blue)] shadow-[0_2px_0_#1899D6] hover:bg-red-50 hover:border-red-300 hover:text-red-600 group/blank"
                  )}
                  draggable={!!placedToken && status !== "correct"}
                  onDragStart={(e) => placedToken && handleDragStart(e, placedToken, currentBlankIdx)}
                  title={placedToken && status !== "correct" ? "Nhấp hoặc kéo để gỡ từ này" : "Ô trống cần điền"}
                >
                  {placedToken ? (
                    <span className="flex items-center gap-1">
                      <span>{placedToken.word}</span>
                      {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 inline ml-0.5 text-[var(--duo-correct)]" />}
                      {isWrong && <span className="text-xs font-black text-[var(--duo-red)] ml-0.5">✕</span>}
                      {!isCorrect && !isWrong && (
                        <span className="text-[10px] text-muted-foreground group-hover/blank:text-red-500 opacity-60 ml-0.5">✕</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground/60 tracking-wider">
                      [ ô trống {currentBlankIdx + 1} ]
                    </span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Word Bank for Cloze */}
      {status !== "correct" && (
        <div className="mt-2 pt-3 border-t-2 border-dashed border-border/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-muted-foreground uppercase">
              Ngân hàng từ ({availableBankTokens.length}/{bankTokens.length}):
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">
              Nhấp hoặc kéo từ vào ô trống
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-h-[44px] p-2.5 bg-muted/20 rounded-xl border border-border">
            {availableBankTokens.length === 0 ? (
              <span className="text-xs font-bold text-muted-foreground italic py-1">
                Đã đặt hết các từ vào ô trống. Nhấn "Kiểm tra" để chấm điểm.
              </span>
            ) : (
              availableBankTokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, token)}
                  onClick={() => handleTokenClick(token)}
                  className="btn-3d px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-foreground hover:text-[var(--duo-blue)] border-2 border-border hover:border-[var(--duo-blue)] text-sm sm:text-base font-black shadow-sm active:scale-95 transition-all cursor-grab active:cursor-grabbing"
                >
                  <span>{token.word}</span>
                </button>
              ))
            )}
          </div>

          {Object.keys(placedMap).length > 0 && status !== "correct" && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs font-bold">
                {status === "error" ? (
                  <span className="text-[var(--duo-red)] flex items-center gap-1 font-black">
                    <XCircle className="w-3.5 h-3.5" /> Có từ chưa đúng vị trí, hãy thử đổi lại nhé!
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Đã điền {Object.keys(placedMap).length}/{expectedAnswers.length} ô trống
                  </span>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => checkAnswers(placedMap)}
                className="btn-3d btn-3d-primary font-black text-xs sm:text-sm h-9 px-4 shadow-sm"
              >
                Kiểm tra đáp án
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Correct Cloze Indicator */}
      {status === "correct" && (
        <div className="p-3 bg-[var(--duo-correct)]/10 rounded-xl border border-[var(--duo-correct)]/30 flex items-center justify-between text-xs sm:text-sm font-black text-[var(--duo-correct-dark)] animate-in fade-in slide-in-from-bottom-1">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[var(--duo-correct)]" />
            Chính xác! Bạn đã hoàn thành câu này.
          </span>
          <span className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-[var(--duo-correct)]/30 shadow-2xs">
            +{expectedAnswers.length * 5} XP
          </span>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Keyword Mode Item (Typing Mode)
// =========================================================================
const KeywordModeItem = ({ item, question, vocabWords, isDoneInSession, onComplete, onKeywordCorrect, autoFocus }: any) => {
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
    return getQuestionKeywords(question, vocabWords);
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

  // Auto-complete if no keywords exist
  useEffect(() => {
    if (keywordIndices.length === 0) {
      onComplete();
    }
  }, [keywordIndices.length, onComplete]);

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
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 leading-loose sm:leading-[2.6] text-base sm:text-lg font-medium shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[var(--duo-blue)] bg-[var(--duo-blue)]/10 px-3 py-1.5 rounded-xl border border-[var(--duo-blue)]/20 w-fit">
          <Sparkles className="w-4 h-4 text-[var(--duo-blue)]" />
          <span>Câu này không có từ khóa cần điền — Tự động tính hoàn thành ✓</span>
        </div>
        <div className="flex items-start justify-between gap-3 text-foreground font-bold">
          <p className="text-base sm:text-lg leading-relaxed flex-1">{item.text}</p>
          <button
            type="button"
            onClick={() => speakText(item.text)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--duo-blue)] hover:bg-muted transition-colors shrink-0"
            title="Nghe phát âm câu này"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
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
                onKeywordCorrect?.(part.text);
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

