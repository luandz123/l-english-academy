import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  LayoutGrid, 
  Loader2, 
  Clock, 
  Zap, 
  Award, 
  RotateCcw, 
  Eye, 
  Sparkles, 
  BookOpen, 
  HelpCircle,
  Headphones,
  Check,
  X
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatAudioUrl } from "@/utils/audioUrl";
import { cn } from "@/lib/utils";
import { StickyPartAudioPlayer } from "@/components/audio/StickyPartAudioPlayer";

const QuizResult = () => {
  const { courseId, quizId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as any;

  const [showDetails, setShowDetails] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onlyShowIncorrect, setOnlyShowIncorrect] = useState(false);

  const qid = Number(quizId);

  // 1. Fetch questions fresh from DB
  const { data: questions = [], isLoading: loadingQ } = useQuery({
    queryKey: ["quiz-result-questions", qid],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("quiz_id", qid)
        .order("display_order");
      return (data || []).map((q: any) => ({
        ...q,
        audio_url: formatAudioUrl(q.audio_url),
        answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
    enabled: !!qid,
  });

  // 2. Fetch quiz details
  const { data: quiz } = useQuery({
    queryKey: ["quiz-result-quiz", qid],
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, audio_url, time_limit_seconds")
        .eq("id", qid)
        .single();
      if (data) {
        data.audio_url = formatAudioUrl(data.audio_url);
      }
      return data;
    },
    enabled: !!qid,
  });

  // 3. Fallback: Fetch latest result from DB if state is missing or reload happened
  const stateResultId = state?.resultId;
  const { data: latestResult } = useQuery({
    queryKey: ["latest-user-quiz-result", user?.id, qid, stateResultId],
    queryFn: async () => {
      if (stateResultId) {
        const { data } = await supabase
          .from("user_quiz_results")
          .select("*")
          .eq("id", stateResultId)
          .maybeSingle();
        if (data) return data;
      }
      if (!user) return null;
      const { data } = await supabase
        .from("user_quiz_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("quiz_id", qid)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!qid,
  });

  const activeResultId = stateResultId || latestResult?.id;

  // 4. Fetch user answers from DB if we have activeResultId
  const { data: dbUserAnswers = [] } = useQuery({
    queryKey: ["user-answers-result", activeResultId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_answers")
        .select("*")
        .eq("result_id", activeResultId);
      return data || [];
    },
    enabled: !!activeResultId,
  });

  // Build a lookup: questionId -> selectedAnswerId
  const selectedByQuestionId: Record<number, number | null> = useMemo(() => {
    const map: Record<number, number | null> = {};
    if (dbUserAnswers.length > 0) {
      dbUserAnswers.forEach((ua: any) => {
        map[ua.question_id] = ua.selected_answer_id;
      });
    }
    return map;
  }, [dbUserAnswers]);

  const stateAnswers = state?.answers ?? {};

  const getSelectedAnswerId = (qId: number, originalIdx: number): number | null => {
    if (selectedByQuestionId[qId] !== undefined) {
      return selectedByQuestionId[qId];
    }
    return stateAnswers[originalIdx] ?? null;
  };

  // Derive score, total, time spent
  const total = useMemo(() => {
    return state?.total || latestResult?.total_questions || questions.length || 0;
  }, [state?.total, latestResult?.total_questions, questions.length]);

  const score = useMemo(() => {
    if (state?.score !== undefined) return state.score;
    if (latestResult?.correct_answers !== undefined && latestResult?.correct_answers !== null) {
      return latestResult.correct_answers;
    }
    // calculate from questions & dbUserAnswers
    if (questions.length > 0 && dbUserAnswers.length > 0) {
      let count = 0;
      questions.forEach((q: any) => {
        const sId = selectedByQuestionId[q.id];
        if (sId && q.answers.find((a: any) => a.id === sId)?.is_correct) {
          count++;
        }
      });
      return count;
    }
    return 0;
  }, [state?.score, latestResult?.correct_answers, questions, dbUserAnswers, selectedByQuestionId]);

  const timeSpentSeconds = useMemo(() => {
    return state?.timeSpentSeconds || latestResult?.time_spent_seconds || 0;
  }, [state?.timeSpentSeconds, latestResult?.time_spent_seconds]);

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const scoreOutOf10 = total > 0 ? ((score / total) * 10).toFixed(1) : "0.0";
  const incorrectCount = Math.max(0, total - score);

  const speedPerQuestion = useMemo(() => {
    if (!total || !timeSpentSeconds || timeSpentSeconds <= 0) return null;
    return Math.round(timeSpentSeconds / total);
  }, [total, timeSpentSeconds]);

  const formatDuration = (sec: number) => {
    if (!sec || sec <= 0) return "--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m} phút`;
    return `${s} giây`;
  };

  const handleAudioPlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const current = e.currentTarget;
    const allAudios = document.getElementsByTagName("audio");
    for (let i = 0; i < allAudios.length; i++) {
      if (allAudios[i] !== current && !allAudios[i].paused) {
        allAudios[i].pause();
      }
    }
  };

  // Evaluation status
  const evaluation = useMemo(() => {
    if (percentage >= 85) {
      return {
        badge: "XUẤT SẮC",
        title: "Phong độ vượt trội!",
        desc: "Bạn đã làm chủ hoàn toàn các bẫy đề và kiến thức trong bài tập này. Sẵn sàng bứt phá mục tiêu 850+ TOEIC!",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        gradient: "from-cyan-400 to-emerald-400",
        icon: "🏆"
      };
    }
    if (percentage >= 70) {
      return {
        badge: "RẤT TỐT",
        title: "Nắm vững kiến thức!",
        desc: "Kết quả rất tích cực! Hãy bấm xem giải chi tiết các câu sai để chuẩn hóa hoàn toàn các điểm chưa tự tin.",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        gradient: "from-cyan-400 to-blue-500",
        icon: "⭐"
      };
    }
    if (percentage >= 50) {
      return {
        badge: "ĐẠT YÊU CẦU",
        title: "Tiến bộ rõ rệt!",
        desc: "Bạn đã vượt qua phần lớn bài tập. Hãy xem kỹ phần giải thích chi tiết và dịch nghĩa ở bên dưới để khắc phục lỗ hổng.",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        gradient: "from-amber-400 to-orange-500",
        icon: "🎯"
      };
    }
    return {
      badge: "CẦN CỐ GẮNG",
      title: "Đừng nản chí!",
      desc: "Học từ câu sai là cách ghi nhớ tốt nhất. Hãy xem kỹ từng lời giải thích bên dưới, sau đó bấm Làm lại bài để ghi điểm tuyệt đối nhé!",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/30",
      gradient: "from-rose-400 to-amber-500",
      icon: "💪"
    };
  }, [percentage]);

  // Grouping logic for review view
  const groupedQuestions = useMemo(() => {
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

      let shouldStartNew = false;
      if (!currentGroup) {
        shouldStartNew = true;
      } else if (isPart1) {
        if (q.audio_url && q.audio_url !== currentGroup.audio_url) {
          shouldStartNew = true;
        }
      } else if (isPart34) {
        if (q.audio_url && q.audio_url !== currentGroup.audio_url) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 3) {
          shouldStartNew = true;
        }
      } else if (isPart67) {
        if (passageText) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 4 && q.question_type === "part6") {
          shouldStartNew = true;
        }
      } else {
        shouldStartNew = true;
      }

      if (shouldStartNew) {
        currentGroup = {
          id: groups.length,
          type: q.question_type,
          passage: passageText,
          audio_url: q.audio_url,
          image_url: isPart1 ? null : q.image_url,
          questions: []
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, originalIdx: idx, cleanText: cleanQuestionText });
    });

    return groups;
  }, [questions]);

  const uniqueQuestionAudios = useMemo(() => {
    return new Set(questions?.map((q: any) => q.audio_url).filter(Boolean) || []);
  }, [questions]);

  const singleAudioUrl = useMemo(() => {
    if (quiz?.audio_url && quiz.audio_url !== "null") return quiz.audio_url;
    const audios = Array.from(uniqueQuestionAudios);
    if (audios.length === 1 && (questions?.length || 0) > 1) {
      return audios[0] as string;
    }
    return null;
  }, [quiz?.audio_url, uniqueQuestionAudios, questions?.length]);

  const hasSingleSharedAudio = !!singleAudioUrl;

  // Breakdown by Part/Type if questions contain question_type
  const partBreakdowns = useMemo(() => {
    if (!questions || questions.length === 0) return [];
    const map: Record<string, { total: number; correct: number }> = {};
    
    questions.forEach((q: any, idx: number) => {
      const typeKey = (q.question_type || "general").toUpperCase();
      if (!map[typeKey]) {
        map[typeKey] = { total: 0, correct: 0 };
      }
      map[typeKey].total++;
      const sId = getSelectedAnswerId(q.id, idx);
      if (sId && q.answers.find((a: any) => a.id === sId)?.is_correct) {
        map[typeKey].correct++;
      }
    });

    return Object.entries(map).map(([type, stats]) => ({
      type,
      total: stats.total,
      correct: stats.correct,
      pct: Math.round((stats.correct / stats.total) * 100),
    }));
  }, [questions, selectedByQuestionId, stateAnswers]);

  // Scroll to question helper
  const scrollToQuestion = (idx: number) => {
    setShowDetails(true);
    setTimeout(() => {
      const el = document.getElementById(`question-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  // Review View (showDetails === true)
  if (showDetails) {
    return (
      <div className="h-screen flex flex-col bg-[#050914] text-slate-100 overflow-hidden font-sans">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        {/* Sticky Header */}
        <header className="h-16 border-b border-cyan-500/20 shadow-soft-xs shrink-0 bg-[#070e1c]/95 backdrop-blur-xl z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowDetails(false)}
              className="rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5"/>
            </Button>
            <div>
              <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-sm text-white">
                {quiz?.title || "Bài tập"} - Chi tiết lời giải
              </h1>
              <p className="text-xs text-slate-400 font-semibold hidden sm:block">
                Đúng {score}/{total} câu ({percentage}%)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-rose-500/10 text-rose-300 px-3 py-1.5 sm:py-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/20 transition-all select-none">
              <input 
                type="checkbox" 
                checked={onlyShowIncorrect} 
                onChange={(e) => setOnlyShowIncorrect(e.target.checked)} 
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
              <span>Chỉ xem câu sai ❌</span>
            </label>

            <button 
              onClick={() => setShowDetails(false)} 
              className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-200 transition-all"
            >
              Đóng xem giải
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* Main Content: List of all questions */}
          <div className="flex-1 h-full overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 scroll-smooth pb-32">
            {hasSingleSharedAudio && singleAudioUrl && (
              <div className="max-w-4xl mx-auto">
                <StickyPartAudioPlayer
                  audioUrl={singleAudioUrl}
                  title={quiz?.title || "Audio bài nghe"}
                  subtitle="File nghe chung cho toàn bộ bài thi này"
                  questionRange={`Câu 1 - ${questions?.length || 0}`}
                />
              </div>
            )}

            {groupedQuestions.map((group: any, gIdx: number) => {
              const questionsToRender = group.questions.filter((q: any) => {
                const selectedId = getSelectedAnswerId(q.id, q.originalIdx);
                const selectedOpt = q.answers?.find((o: any) => o.id === selectedId);
                const isCorrect = !!selectedOpt?.is_correct;
                if (onlyShowIncorrect) {
                  return !isCorrect;
                }
                return true;
              });

              if (questionsToRender.length === 0) return null;

              return (
                <div key={gIdx} className="max-w-4xl mx-auto space-y-6 mb-10">
                  {/* Group context: Passage or shared Audio */}
                  {(group.passage || (group.audio_url && (!hasSingleSharedAudio || group.audio_url !== singleAudioUrl)) || group.image_url) && (
                    <div className="p-5 sm:p-7 bg-[#0b1329]/80 border border-cyan-500/20 rounded-2xl shadow-soft-sm space-y-5 backdrop-blur-md">
                      {group.image_url && (
                        <div className="w-full flex justify-center bg-slate-900/60 rounded-xl overflow-hidden p-2 border border-slate-800">
                          <img src={group.image_url} alt="Passage Context" className="max-w-full h-auto rounded-lg mx-auto object-contain image-safe max-h-[360px]" />
                        </div>
                      )}
                      {group.audio_url && (!hasSingleSharedAudio || group.audio_url !== singleAudioUrl) && (
                        <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-cyan-500/20 shadow-soft-xs">
                          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl shrink-0">
                            🎧
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-cyan-400 mb-1">Audio bài nghe</p>
                            <audio 
                              controls 
                              src={group.audio_url} 
                              className="w-full h-9" 
                              controlsList="nodownload" 
                              onPlay={handleAudioPlay}
                            />
                          </div>
                        </div>
                      )}
                      {group.passage && (
                        <div className="prose prose-invert prose-sm max-w-none text-slate-200 font-medium leading-relaxed bg-slate-900/60 p-5 rounded-xl border border-slate-800 whitespace-pre-wrap">
                          {group.passage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions in group */}
                  {questionsToRender.map((q: any) => {
                    const selectedId = getSelectedAnswerId(q.id, q.originalIdx);
                    const selectedOpt = q.answers?.find((o: any) => o.id === selectedId);
                    const correctOpt = q.answers?.find((o: any) => o.is_correct === true);
                    const isCorrect = !!selectedOpt?.is_correct;
                    
                    return (
                      <div 
                        key={q.id} 
                        id={`question-${q.originalIdx}`} 
                        className="p-5 sm:p-7 space-y-5 relative overflow-hidden bg-[#070e1c]/90 border border-cyan-500/20 rounded-2xl shadow-soft-sm backdrop-blur-md scroll-mt-6"
                      >
                        {/* Status ribbon */}
                        <div className={cn(
                          "absolute top-0 right-0 px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-bl-xl shadow-soft-xs",
                          selectedId 
                            ? (isCorrect ? "bg-emerald-500 text-slate-950 font-black" : "bg-rose-500 text-white font-black") 
                            : "bg-slate-800 text-slate-400"
                        )}>
                          {selectedId ? (isCorrect ? "Đúng ✓" : "Sai ✗") : "Chưa làm"}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-xs">
                            Câu {q.originalIdx + 1} / {total}
                          </span>
                          {q.question_type && (
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800/80 px-2.5 py-0.5 rounded-full mr-16">
                              {q.question_type}
                            </span>
                          )}
                        </div>

                        {q.image_url && q.image_url !== group.image_url && (
                          <div className="w-full flex justify-center bg-slate-900/60 rounded-xl overflow-hidden p-2 border border-slate-800 mb-3">
                            <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-lg object-contain image-safe max-h-[320px]" />
                          </div>
                        )}
                        {q.audio_url && q.audio_url !== group.audio_url && (!hasSingleSharedAudio || q.audio_url !== singleAudioUrl) && (
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-cyan-500/20 mb-3">
                            <audio 
                              controls 
                              src={q.audio_url} 
                              className="w-full h-9" 
                              controlsList="nodownload" 
                              onPlay={handleAudioPlay}
                            />
                          </div>
                        )}

                        {q.cleanText && (
                          <p className="text-base sm:text-lg font-bold text-white leading-relaxed p-4 bg-slate-900/50 rounded-xl border-l-4 border-cyan-400">
                            {q.cleanText}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {q.answers.map((opt: any, oi: number) => {
                            const isSelected = selectedId === opt.id;
                            const isOptCorrect = opt.is_correct;
                            const isPart2 = q.question_type === "part2";
                            const isListeningPart = q.question_type === "part1" || q.question_type === "part2" || q.question_type === "part3" || q.question_type === "part4";

                            if (isPart2 && oi === 3) return null;

                            let optClass = "border-slate-800 bg-slate-900/50 text-slate-300";
                            let indicatorClass = "border-slate-700 bg-slate-800 text-slate-400";
                            
                            if (isOptCorrect) {
                              optClass = "border-emerald-500/80 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                              indicatorClass = "border-emerald-400 bg-emerald-500 text-slate-950 font-black";
                            } else if (isSelected && !isOptCorrect) {
                              optClass = "border-rose-500/80 bg-rose-500/10 text-white shadow-[0_0_15px_rgba(244,63,94,0.15)]";
                              indicatorClass = "border-rose-400 bg-rose-500 text-white font-black";
                            }
                            
                            return (
                              <div key={opt.id} className={cn("flex items-center gap-3 w-full p-3.5 rounded-xl border transition-all", optClass)}>
                                <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center shrink-0 font-extrabold text-xs", indicatorClass)}>
                                  {isOptCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + oi)}
                                </div>
                                {isListeningPart && !opt.answer_text ? (
                                  <span className="text-sm flex-1 text-slate-600 italic font-medium select-none tracking-widest">
                                    ••••••••
                                  </span>
                                ) : (
                                  <span className={cn("text-sm sm:text-base flex-1 font-bold", (isOptCorrect || isSelected) ? "text-white" : "text-slate-300")}>
                                    {opt.answer_text}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 space-y-3 pt-4 border-t border-dashed border-slate-800">
                          {correctOpt?.explanation && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs sm:text-sm font-medium text-emerald-200 leading-relaxed">
                              <span className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-4 h-4 text-emerald-400" /> Giải thích chi tiết:
                              </span>
                              {correctOpt.explanation}
                            </div>
                          )}
                          {q.translation && (
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs sm:text-sm font-medium text-cyan-200 leading-relaxed">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5 mb-1">
                                🇻🇳 Dịch nghĩa:
                              </span>
                              {q.translation}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Right Sidebar: Grid (Desktop only) */}
          <div className="hidden lg:flex w-80 flex-col border-l border-cyan-500/20 bg-[#070e1c]/95 h-full relative z-10 shadow-soft-sm">
             <div className="p-5 border-b border-cyan-500/20">
                <h3 className="font-extrabold text-sm mb-3 flex items-center gap-2 text-white">
                  <LayoutGrid className="w-4 h-4 text-cyan-400"/> Danh sách câu hỏi
                </h3>
                <div className="flex flex-col gap-2 text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 
                      Đúng ({score})
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 block shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span> 
                      Sai ({incorrectCount})
                    </span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-2 content-start">
                {questions.map((q: any, i: number) => {
                   const selectedId = getSelectedAnswerId(q.id, i);
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   if (onlyShowIncorrect && isCorrect) return null;

                   let btnClass = "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-cyan-500/50";
                   if (isAnswered) {
                     if (isCorrect) {
                       btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
                     } else {
                       btnClass = "border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]";
                     }
                   }

                   return (
                      <button
                        key={i}
                        onClick={() => { document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center border hover:-translate-y-0.5 cursor-pointer",
                          btnClass
                        )}
                      >
                        {i + 1}
                      </button>
                   );
                })}
             </div>
          </div>
        </main>

        {/* Fixed Bottom Palette (Mobile only) */}
        <footer className="h-16 border-t border-cyan-500/20 shrink-0 bg-[#070e1c] z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
          <button 
            onClick={() => setPaletteOpen(!paletteOpen)} 
            className="w-full py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2"
          >
             <LayoutGrid className="w-4 h-4" />
             Xem bảng {total} câu hỏi
          </button>
        </footer>

        {/* Expandable Palette Drawer (Mobile) */}
        {paletteOpen && (
          <div className="absolute bottom-16 left-0 right-0 bg-[#070e1c]/95 backdrop-blur-xl border-t border-cyan-500/20 shadow-soft-2xl z-20 max-h-[50vh] overflow-y-auto p-5 animate-in slide-in-from-bottom-5 lg:hidden">
             <div className="max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="font-extrabold text-xs text-white">Chuyển nhanh đến câu</h3>
                   <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                     <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span> Đúng ({score})</span>
                     <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span> Sai ({incorrectCount})</span>
                   </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q: any, i: number) => {
                    const selectedId = getSelectedAnswerId(q.id, i);
                    const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                    const isAnswered = !!selectedId;
                    
                    if (onlyShowIncorrect && isCorrect) return null;

                    let btnClass = "border-slate-800 bg-slate-900 text-slate-400";
                    if (isAnswered) {
                      if (isCorrect) {
                        btnClass = "border-emerald-500 bg-emerald-500/20 text-emerald-300";
                      } else {
                        btnClass = "border-rose-500 bg-rose-500/20 text-rose-300";
                      }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => { 
                          const el = document.getElementById(`question-${i}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setPaletteOpen(false); 
                        }}
                        className={cn(
                          "w-9 h-9 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center border",
                          btnClass
                        )}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // Main Dashboard View
  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20 font-sans">
        
        {/* Hero Card with Glassmorphic Gradient Ring & Feedback */}
        <div className="relative overflow-hidden rounded-3xl bg-[#070e1c]/90 border border-cyan-500/30 p-6 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-xl">
          {/* Ambient header bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" />
          
          <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
            
            {/* Left: SVG Circular Gauge */}
            <div className="relative flex flex-col items-center shrink-0">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* Radial Glow */}
                <div className="absolute inset-0 bg-cyan-500/15 rounded-full blur-2xl" />
                
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                  <defs>
                    <linearGradient id="scoreGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <circle
                    cx="70"
                    cy="70"
                    r="58"
                    className="text-slate-800/80 stroke-current"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {/* Active Animated Arc */}
                  <circle
                    cx="70"
                    cy="70"
                    r="58"
                    stroke="url(#scoreGaugeGradient)"
                    strokeWidth="11"
                    strokeDasharray={364.42}
                    strokeDashoffset={364.42 - (364.42 * percentage) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black text-white tracking-tight">
                    {percentage}%
                  </span>
                  <span className="text-xs font-extrabold text-cyan-400 mt-0.5">
                    {scoreOutOf10} / 10 điểm
                  </span>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" /> Điểm số bài làm
              </span>
            </div>

            {/* Right: Feedback & Evaluation */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border",
                  evaluation.bg, evaluation.border, evaluation.color
                )}>
                  <span>{evaluation.icon}</span>
                  <span>{evaluation.badge}</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {quiz?.title || "Bài luyện tập"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {evaluation.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                {evaluation.desc}
              </p>

              {/* Progress overview bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                  <span>Tỉ lệ hoàn thành chính xác</span>
                  <span className="text-cyan-400 font-mono">{score}/{total} câu</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 4 Golden Metric Bento Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Correct answers */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#071324]/80 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)] backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số câu đúng</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {score} <span className="text-xs font-bold text-slate-400 font-sans">/ {total}</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Độ chính xác {percentage}%
              </p>
            </div>
          </div>

          {/* Card 2: Incorrect answers */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#071324]/80 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.06)] backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số câu sai</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-400">
                {incorrectCount} <span className="text-xs font-bold text-slate-400 font-sans">câu</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Cần rà soát lại lời giải
              </p>
            </div>
          </div>

          {/* Card 3: Completion time */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#071324]/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)] backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                {formatDuration(timeSpentSeconds)}
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5 truncate">
                {timeSpentSeconds > 0 ? "Đã ghi nhận lịch sử" : "Làm bài tự do"}
              </p>
            </div>
          </div>

          {/* Card 4: Average speed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#071324]/80 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.06)] backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tốc độ TB</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {speedPerQuestion ? `~${speedPerQuestion}s` : "--"}
                <span className="text-xs font-bold text-slate-400 font-sans"> / câu</span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5 truncate">
                {speedPerQuestion && speedPerQuestion <= 45 ? "Rất nhanh (chuẩn TOEIC)" : speedPerQuestion && speedPerQuestion <= 75 ? "Tốc độ ổn định" : "Luyện phản xạ nhanh hơn"}
              </p>
            </div>
          </div>

        </div>

        {/* Part Breakdown (if multiple parts present) */}
        {partBreakdowns.length > 1 && (
          <div className="p-6 rounded-2xl bg-[#070e1c]/80 border border-cyan-500/20 shadow-soft-sm space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" /> Đánh giá theo từng phần bài tập
            </h3>
            <div className="space-y-3">
              {partBreakdowns.map((part) => (
                <div key={part.type} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300 uppercase tracking-wider">{part.type}</span>
                    <span className="text-cyan-400">{part.correct}/{part.total} câu ({part.pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 rounded-full transition-all duration-700" 
                      style={{ width: `${part.pct}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Quick Answer Matrix */}
        <div className="p-6 rounded-2xl bg-[#070e1c]/80 border border-cyan-500/20 shadow-soft-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-cyan-400" /> Ma trận đáp án (Bấm vào câu để xem giải)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhấp vào từng ô để nhảy thẳng đến phần giải thích chi tiết của câu đó
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 block"></span> Đúng ({score})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 block"></span> Sai ({incorrectCount})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {questions.map((q: any, i: number) => {
              const selectedId = getSelectedAnswerId(q.id, i);
              const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
              const isAnswered = !!selectedId;

              let bubbleClass = "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-cyan-500/50";
              if (isAnswered) {
                if (isCorrect) {
                  bubbleClass = "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)] hover:bg-emerald-500/25";
                } else {
                  bubbleClass = "border-rose-500/70 bg-rose-500/15 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)] hover:bg-rose-500/25";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => scrollToQuestion(i)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xs font-black transition-all flex items-center justify-center border hover:-translate-y-0.5 cursor-pointer",
                    bubbleClass
                  )}
                  title={`Câu ${i + 1}: ${isAnswered ? (isCorrect ? "Đúng" : "Sai") : "Chưa làm"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to={`/courses/${courseId}/learn`}
            className="py-3 px-5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-sm font-bold text-slate-200 transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer inline-flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Về bài học
          </Link>
          
          <Link
            to={`/courses/${courseId}/quiz/${quizId}`}
            className="py-3 px-5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-bold transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Làm lại bài này
          </Link>

          {loadingQ ? (
            <button disabled className="py-3 px-6 rounded-xl border border-slate-700 bg-slate-800 text-sm font-bold opacity-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải giải...
            </button>
          ) : (
            <button
              onClick={() => setShowDetails(true)}
              className="btn-3d btn-3d-primary py-3 px-6 text-sm font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              <Eye className="w-4 h-4" /> Xem giải chi tiết
            </button>
          )}
        </div>

      </div>
    </StudentLayout>
  );
};

export default QuizResult;
