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
import { Clock, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle } from "lucide-react";
import { useSound } from "@/hooks/useSound";

const QuizPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qid = Number(quizId);

  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0);
  const { playSound } = useSound();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: quiz } = useQuery({
    queryKey: ["quiz", qid],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", qid).single();
      return data;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions", qid],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("quiz_id", qid)
        .order("display_order");
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

    setSubmitting(false);
    navigate(`/courses/${courseId}/quiz/${quizId}/result`, {
      state: { score: correctCount, total: questions.length, answers, questions, resultId: result?.id },
    });
  };

  // Grouping logic
  const groupedQuestions = (() => {
    if (!questions) return [];
    const groups: any[] = [];
    let currentGroup: any = null;

    questions.forEach((q: any, idx: number) => {
      const isPart34 = q.question_type === "part3" || q.question_type === "part4";
      const isPart67 = q.question_type === "part6" || q.question_type === "part7";
      
      let passageText = "";
      let cleanQuestionText = q.question_text;
      
      if (q.question_text.includes("[PASSAGE]")) {
        const parts = q.question_text.split("[ENDPASSAGE]");
        passageText = parts[0].replace("[PASSAGE]", "");
        cleanQuestionText = parts[1] || "";
      }

      // Logic to start a new group
      let shouldStartNew = false;
      if (!currentGroup) {
        shouldStartNew = true;
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
          image_url: q.image_url,
          questions: []
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, originalIdx: idx, cleanText: cleanQuestionText });
    });

    return groups;
  })();

  const currentGroup = groupedQuestions[currentGroupIdx];

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions?.length || 0;
  const unanswered = totalQ - answeredCount;

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-6 sm:mt-12 px-4 sm:px-0 relative">
          <button className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors" onClick={() => navigate(`/courses/${courseId}`)}>
            <ChevronLeft className="w-4 h-4" /> Quay lại khóa học
          </button>
          <div className="card-duo p-5 sm:p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-[var(--duo-orange)] shadow-[0_4px_0_#CC7700] flex items-center justify-center mx-auto">
              <span className="text-3xl">📝</span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">{quiz?.title || "Bài thi TOEIC"}</h1>
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground border-y-2 border-[var(--duo-gray)] py-4 font-bold">
              <p className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-[var(--duo-blue)]"/> Tổng số: <b className="text-foreground">{totalQ} câu hỏi</b></p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--duo-orange)]"/> Thời gian: <b className="text-foreground">{quiz?.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} phút` : "Không giới hạn"}</b></p>
              {quiz?.audio_url && <p className="flex items-center gap-2 text-[var(--duo-blue)]">🎧 Bài thi có audio nghe</p>}
            </div>
            <button className="btn-3d btn-3d-primary w-full py-3.5 text-base" onClick={() => setStarted(true)}>🚀 BẮT ĐẦU LÀM BÀI</button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12 card-duo p-8 text-center">
          <p className="text-muted-foreground font-medium">Bài thi này chưa có câu hỏi.</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-16 border-b-2 border-[var(--duo-gray)] shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowConfirm(true)}><ChevronLeft className="w-5 h-5"/></Button>
          <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">{quiz?.title}</h1>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-2 bg-[#FFF0E0] border-2 border-[#FFCC80] text-[#CC7700] px-4 py-2 rounded-xl font-mono font-extrabold text-lg">
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <button onClick={() => setShowConfirm(true)} className="btn-3d btn-3d-primary py-2 px-4 text-sm">
            Nộp bài
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
        
        {/* Main Content: Group-based view */}
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-background">
          {/* Scrollable Questions Container */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 space-y-5 sm:space-y-8 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Global Quiz Audio Player */}
              {quiz?.audio_url && quiz.audio_url !== "null" && (
                <div className="bg-[#DDF4FF]/40 dark:bg-zinc-900/40 p-5 rounded-2xl border-2 border-[var(--duo-blue)]/20 flex items-center gap-4 shadow-sm backdrop-blur-sm">
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
                  {(currentGroup.passage || currentGroup.audio_url || currentGroup.image_url) && (
                    <div className="card-duo p-5 sm:p-8 bg-[#DDF4FF]/30 border-[#A8E0FD] space-y-6">
                      {currentGroup.image_url && (
                        <img src={currentGroup.image_url} alt="Passage Context" className="max-w-full max-h-[320px] object-contain rounded-xl border-2 border-[var(--duo-gray)] mx-auto shadow-sm" />
                      )}
                      {currentGroup.audio_url && (
                        <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border-2 border-[var(--duo-blue)]/20 shadow-sm">
                          <div className="w-12 h-12 rounded-xl bg-[var(--duo-blue)] flex items-center justify-center text-white text-xl shrink-0">🎧</div>
                          <div className="flex-1">
                            <p className="text-sm font-extrabold text-[var(--duo-blue)] mb-1">Nghe đoạn hội thoại / bài nói</p>
                            <audio key={currentGroup.audio_url} controls src={currentGroup.audio_url} className="w-full h-9" controlsList="nodownload" />
                          </div>
                        </div>
                      )}
                      {currentGroup.passage && (
                        <div className="prose prose-sm max-w-none text-foreground font-medium leading-relaxed bg-white/50 p-6 rounded-2xl border-2 border-[var(--duo-gray)] shadow-inner whitespace-pre-wrap">
                          {currentGroup.passage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions in group */}
                  {currentGroup.questions.map((q: any) => (
                    <div key={q.id} id={`question-${q.originalIdx}`} className="card-duo p-5 sm:p-7 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="badge-duo badge-blue">Câu {q.originalIdx + 1} / {totalQ}</span>
                        {q.question_type && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">{q.question_type}</span>}
                      </div>

                      {q.image_url && q.image_url !== currentGroup.image_url && (
                        <img src={q.image_url} alt="Question" className="max-w-full max-h-[260px] object-contain rounded-xl border-2 border-[var(--duo-gray)] mb-4 mx-auto" />
                      )}
                      {q.audio_url && q.audio_url !== currentGroup.audio_url && (
                        <audio controls src={q.audio_url} className="w-full mb-4 animate-in fade-in" />
                      )}

                      {q.cleanText && q.question_type !== "part2" && (
                        <p className="text-lg font-bold text-foreground leading-relaxed p-4 bg-muted/40 rounded-2xl border-l-4 border-[var(--duo-blue)]">
                          {q.cleanText}
                        </p>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                "flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all cursor-pointer group",
                                checked
                                  ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 shadow-[0_3px_0_var(--duo-correct-dark)]/20"
                                  : "border-[var(--duo-gray)] bg-white hover:border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-gray)]"
                              )}
                            >
                              <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors font-extrabold text-sm", checked ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)] group-hover:border-[var(--duo-blue)]")}>
                                {checked ? "✓" : String.fromCharCode(65 + oi)}
                              </div>
                              {hideText ? (
                                <span className="text-base flex-1 text-muted-foreground/30 italic font-medium select-none tracking-widest">••••••••</span>
                              ) : (
                                <span className={cn("text-base flex-1 font-bold", checked ? "text-foreground" : "text-muted-foreground")}>{opt.answer_text}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="h-20 border-t-2 border-[var(--duo-gray)] bg-card shrink-0 z-20 flex items-center shadow-md">
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between px-4 sm:px-8">
              <Button 
                variant="ghost" 
                disabled={currentGroupIdx === 0} 
                onClick={() => {
                  setCurrentGroupIdx(prev => prev - 1);
                  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="font-bold gap-2 text-base text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" /> Câu trước
              </Button>
              
              {currentGroupIdx < groupedQuestions.length - 1 ? (
                <button 
                  onClick={() => {
                    setCurrentGroupIdx(prev => prev + 1);
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn-3d btn-3d-primary py-3 px-8 text-base font-extrabold"
                >
                  Tiếp theo <ChevronRight className="w-5 h-5 inline ml-1" />
                </button>
              ) : (
                <button 
                  onClick={() => setShowConfirm(true)}
                  className="btn-3d btn-3d-correct py-3 px-8 text-base font-extrabold"
                >
                  Hoàn thành bài thi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Grid (Desktop only) */}
        <div className="hidden lg:flex w-80 flex-col border-l-2 border-[var(--duo-gray)] bg-card h-full relative z-10">
           <div className="p-5 border-b-2 border-[var(--duo-gray)]">
              <h3 className="font-extrabold text-base mb-3 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-[var(--duo-correct)]"/> Danh sách câu hỏi</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--duo-correct)] block"></span> Đã làm ({answeredCount})</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-muted-foreground block"></span> Chưa làm</span>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-5 flex flex-wrap gap-2 content-start">
              {questions.map((_: any, i: number) => {
                 const isAnswered = answers[i] !== undefined;
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
                        "w-11 h-11 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center border-2 hover:-translate-y-0.5",
                        isAnswered ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white shadow-[0_3px_0_var(--duo-correct-dark)]" : "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]"
                      )}
                    >
                      {i + 1}
                    </button>
                 );
              })}
           </div>
           <div className="p-5 border-t-2 border-[var(--duo-gray)]">
              <button className="btn-3d btn-3d-primary w-full py-3 text-sm" onClick={() => setShowConfirm(true)}>
                Nộp bài thi sớm
              </button>
           </div>
        </div>
      </main>

      {/* Fixed Bottom Palette (Mobile only) */}
      <footer className="h-16 border-t-2 border-[var(--duo-gray)] shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
        <button onClick={() => setPaletteOpen(!paletteOpen)} className="btn-3d btn-3d-white w-full py-2.5 text-sm flex items-center justify-center gap-2">
           <LayoutGrid className="w-4 h-4" />
           Danh sách câu hỏi
           <span className="bg-[var(--duo-correct)] text-white px-2 py-0.5 rounded-full text-xs font-extrabold ml-1">{answeredCount}/{totalQ}</span>
        </button>
      </footer>

      {/* Absolute Expandable Palette List (Mobile only) */}
      {paletteOpen && (
        <div className="absolute bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t-2 border-[var(--duo-gray)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 max-h-[50vh] overflow-y-auto p-6 animate-in slide-in-from-bottom-5 lg:hidden">
           <div className="max-w-5xl mx-auto space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm">Điều hướng nhanh</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--duo-correct)] block"></span> Đã làm ({answeredCount})</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 block"></span> Chưa làm</span>
                </div>
             </div>
             <div className="flex flex-wrap gap-2">
               {questions.map((_: any, i: number) => {
                 const isAnswered = answers[i] !== undefined;
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
                       "w-10 h-10 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center border-2",
                       isAnswered ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]" : 
                       "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]"
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

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="card-duo p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[var(--duo-correct)] shadow-[0_4px_0_var(--duo-correct-dark)] flex items-center justify-center mx-auto mb-2">
               <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-extrabold text-xl text-center text-foreground">Xác nhận nộp bài</h3>
            <div className="bg-muted rounded-xl p-4 text-center space-y-2 border-2 border-[var(--duo-gray)]">
              <p className="text-sm font-bold">Đã trả lời: <span className="text-[var(--duo-correct)] font-extrabold text-base">{answeredCount}/{totalQ}</span></p>
              {unanswered > 0 && <p className="badge-duo badge-orange inline-block">Bạn còn {unanswered} câu chưa làm!</p>}
            </div>
            <div className="flex gap-3 pt-4">
              <button className="btn-3d btn-3d-white flex-1 py-3 text-sm" onClick={() => setShowConfirm(false)}>Làm tiếp</button>
              <button className="btn-3d btn-3d-primary flex-1 py-3 text-sm" onClick={submit} disabled={submitting}>
                {submitting ? "Đang nộp..." : "Chắc chắn nộp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
