import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ChevronLeft, LayoutGrid, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const QuizResult = () => {
  const { courseId, quizId } = useParams();
  const location = useLocation();
  const state = location.state as any;

  const score = state?.score ?? 0;
  const total = state?.total ?? 0;
  const resultId = state?.resultId ?? null;
  // userAnswers from state: { [questionIndex]: answerId }
  const stateAnswers = state?.answers ?? {};
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  
  const [showDetails, setShowDetails] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  
  // D8: Toggle to show only incorrect answers
  const [onlyShowIncorrect, setOnlyShowIncorrect] = useState(false);

  const qid = Number(quizId);

  // Always fetch questions fresh from DB so answers/is_correct are always available
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
        answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
    },
    enabled: !!qid,
  });

  const { data: quiz } = useQuery({
    queryKey: ["quiz-result-quiz", qid],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("title, audio_url").eq("id", qid).single();
      return data;
    },
    enabled: !!qid,
  });

  // Fetch user answers from DB if we have resultId
  const { data: dbUserAnswers = [] } = useQuery({
    queryKey: ["user-answers-result", resultId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_answers")
        .select("*")
        .eq("result_id", resultId);
      return data || [];
    },
    enabled: !!resultId,
  });

  // Build a lookup: questionId -> selectedAnswerId
  const selectedByQuestionId: Record<number, number | null> = {};
  if (dbUserAnswers.length > 0) {
    dbUserAnswers.forEach((ua: any) => {
      selectedByQuestionId[ua.question_id] = ua.selected_answer_id;
    });
  }

  const totalQ = questions.length;

  // Grouping logic (Shared with QuizPage)
  const groupedQuestions = (() => {
    if (!questions) return [];
    const groups: any[] = [];
    let currentGroup: any = null;

    questions.forEach((q: any, idx: number) => {
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
          image_url: q.image_url,
          questions: []
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, originalIdx: idx, cleanText: cleanQuestionText });
    });

    return groups;
  })();

  if (showDetails) {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
        {/* Sticky Header */}
        <header className="h-16 border-b-2 border-[var(--duo-gray)] shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)}>
              <ChevronLeft className="w-5 h-5"/>
            </Button>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">{quiz?.title} - Chi tiết giải</h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            {/* D8: Toggle Only Show Incorrect Answers */}
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-red-50 text-[var(--duo-red)] px-3 py-2 rounded-full border-2 border-red-200 hover:bg-red-100/50 transition-all select-none">
              <input 
                type="checkbox" 
                checked={onlyShowIncorrect} 
                onChange={(e) => setOnlyShowIncorrect(e.target.checked)} 
                className="w-4 h-4 rounded accent-[var(--duo-red)] cursor-pointer"
              />
              <span>Chỉ xem câu sai ❌</span>
            </label>

            <button onClick={() => setShowDetails(false)} className="btn-3d btn-3d-white py-2 px-4 text-sm">
              Đóng xem giải
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* Main Content: List of all questions */}
          <div className="flex-1 h-full overflow-y-auto p-3 sm:p-4 lg:p-8 space-y-5 sm:space-y-8 scroll-smooth pb-32">
            {groupedQuestions.map((group: any, gIdx: number) => {
              // D8: Filter questions to only show incorrect ones if selected
              const questionsToRender = group.questions.filter((q: any) => {
                const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[q.originalIdx];
                const selectedOpt = q.answers?.find((o: any) => o.id === selectedId);
                const isCorrect = !!selectedOpt?.is_correct;
                if (onlyShowIncorrect) {
                  return !isCorrect;
                }
                return true;
              });

              if (questionsToRender.length === 0) return null;

              return (
                <div key={gIdx} className="max-w-4xl mx-auto space-y-6 mb-12">
                  {/* Group context: Passage or shared Audio */}
                  {(group.passage || group.audio_url || group.image_url) && (
                    <div className="card-duo p-5 sm:p-8 bg-[#DDF4FF]/30 border-[#A8E0FD] space-y-6">
                      {group.image_url && (
                        <img src={group.image_url} alt="Passage Context" className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] mx-auto" />
                      )}
                      {group.audio_url && (
                        <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border-2 border-[var(--duo-blue)]/20 shadow-sm">
                          <div className="w-12 h-12 rounded-xl bg-[var(--duo-blue)] flex items-center justify-center text-white text-xl shrink-0">🎧</div>
                          <div className="flex-1">
                            <p className="text-sm font-extrabold text-[var(--duo-blue)] mb-1">Audio hội thoại / bài nói</p>
                            <audio 
                              controls 
                              src={group.audio_url} 
                              className="w-full h-9" 
                              controlsList="nodownload" 
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
                        </div>
                      )}
                      {group.passage && (
                        <div className="prose prose-sm max-w-none text-foreground font-medium leading-relaxed bg-white/50 p-6 rounded-2xl border-2 border-[var(--duo-gray)] shadow-inner whitespace-pre-wrap">
                          {group.passage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions in group */}
                  {questionsToRender.map((q: any) => {
                    const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[q.originalIdx];
                    const selectedOpt = q.answers?.find((o: any) => o.id === selectedId);
                    const correctOpt = q.answers?.find((o: any) => o.is_correct === true);
                    const isCorrect = !!selectedOpt?.is_correct;
                    
                    return (
                      <div key={q.id} id={`question-${q.originalIdx}`} className="card-duo p-5 sm:p-7 space-y-6 relative overflow-hidden">
                        {/* Status ribbon */}
                        <div className={cn(
                          "absolute top-0 right-0 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-bl-xl",
                          selectedId ? (isCorrect ? "bg-[var(--duo-correct)] text-white" : "bg-[var(--duo-red)] text-white") : "bg-muted text-muted-foreground"
                        )}>
                          {selectedId ? (isCorrect ? "Đúng" : "Sai") : "Chưa làm"}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="badge-duo badge-blue">Câu {q.originalIdx + 1} / {totalQ}</span>
                          {q.question_type && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full mr-12">{q.question_type}</span>}
                        </div>

                        {q.image_url && q.image_url !== group.image_url && (
                          <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] mb-4" />
                        )}
                        {q.audio_url && q.audio_url !== group.audio_url && (
                          <audio 
                            controls 
                            src={q.audio_url} 
                            className="w-full mb-4" 
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

                        {q.cleanText && (
                          <p className="text-lg font-bold text-foreground leading-relaxed p-4 bg-muted/40 rounded-2xl border-l-4 border-[var(--duo-blue)]">
                            {q.cleanText}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.answers.map((opt: any, oi: number) => {
                            const isSelected = selectedId === opt.id;
                            const isOptCorrect = opt.is_correct;
                            const isPart2 = q.question_type === "part2";
                            const isListeningPart = q.question_type === "part1" || q.question_type === "part2" || q.question_type === "part3" || q.question_type === "part4";

                            if (isPart2 && oi === 3) return null;

                            let optClass = "border-[var(--duo-gray)] bg-white shadow-[0_2px_0_var(--duo-gray)]";
                            let indicatorClass = "border-[var(--duo-gray-dark)] text-muted-foreground";
                            
                            if (isOptCorrect) {
                              optClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 shadow-[0_3px_0_var(--duo-correct-dark)]/20";
                              indicatorClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white";
                            } else if (isSelected && !isOptCorrect) {
                              optClass = "border-[var(--duo-red)] bg-red-50 shadow-[0_3px_0_#FFB3B3]";
                              indicatorClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white";
                            }
                            
                            return (
                              <div key={opt.id} className={cn("flex items-center gap-3 w-full p-4 rounded-xl border-2 transition-all", optClass)}>
                                <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 font-extrabold text-sm", indicatorClass)}>
                                  {isOptCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + oi)}
                                </div>
                                {isListeningPart && !opt.answer_text ? (
                                  <span className="text-base flex-1 text-muted-foreground/30 italic font-medium select-none tracking-widest">••••••••</span>
                                ) : (
                                  <span className={cn("text-base flex-1 font-bold", (isOptCorrect || isSelected) ? "text-foreground" : "text-muted-foreground")}>{opt.answer_text}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 space-y-3 pt-4 border-t border-dashed border-[var(--duo-gray)]">
                          {correctOpt?.explanation && (
                            <div className="p-4 bg-[var(--duo-correct)]/5 border-2 border-[var(--duo-correct)]/20 rounded-xl text-sm font-medium text-foreground">
                              💡 <strong>Giải thích:</strong> {correctOpt.explanation}
                            </div>
                          )}
                          {q.translation && (
                            <div className="p-4 bg-[#DDF4FF]/50 border-2 border-[#A8E0FD]/50 rounded-xl text-sm font-medium text-[var(--duo-blue-dark)]">
                              🇻🇳 <strong>Dịch nghĩa:</strong> {q.translation}
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
          <div className="hidden lg:flex w-80 flex-col border-l-2 border-[var(--duo-gray)] bg-card h-full relative z-10">
             <div className="p-5 border-b-2 border-[var(--duo-gray)]">
                <h3 className="font-extrabold text-base mb-3 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-[var(--duo-correct)]"/> Danh sách câu hỏi</h3>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--duo-correct)] block"></span> Đúng ({score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--duo-red)] block"></span> Sai ({totalQ - score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-muted-foreground block"></span> Chưa làm</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-5 flex flex-wrap gap-2 content-start">
                {questions.map((q: any, i: number) => {
                   const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   // D8: Filter out correct button indicators in sidebar if onlyShowIncorrect is active
                   if (onlyShowIncorrect && isCorrect) return null;

                   let btnClass = "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]";
                   if (isAnswered) {
                       if (isCorrect) {
                           btnClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white shadow-[0_3px_0_var(--duo-correct-dark)]";
                       } else {
                           btnClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white shadow-[0_3px_0_#CC3333]";
                       }
                   }

                   return (
                      <button
                        key={i}
                        onClick={() => { document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={cn(
                          "w-11 h-11 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center border-2 hover:-translate-y-0.5",
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
        <footer className="h-16 border-t-2 border-[var(--duo-gray)] shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
          <button onClick={() => setPaletteOpen(!paletteOpen)} className="btn-3d btn-3d-white w-full py-2.5 text-sm flex items-center justify-center gap-2">
             <LayoutGrid className="w-4 h-4" />
             Danh sách câu hỏi
          </button>
        </footer>

        {/* Absolute Expandable Palette List (Mobile only) */}
        {paletteOpen && (
          <div className="absolute bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t-2 border-[var(--duo-gray)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 max-h-[50vh] overflow-y-auto p-6 animate-in slide-in-from-bottom-5 lg:hidden">
             <div className="max-w-5xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="font-extrabold text-sm">Điều hướng nhanh</h3>
                   <div className="flex flex-col gap-1 text-xs text-muted-foreground font-bold">
                     <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--duo-correct)] block"></span> Đúng ({score})</span>
                     <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--duo-red)] block"></span> Sai ({totalQ - score})</span>
                   </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q: any, i: number) => {
                    const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                    const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                    const isAnswered = !!selectedId;
                    
                    // D8: Filter out correct buttons
                    if (onlyShowIncorrect && isCorrect) return null;

                    let btnClass = "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]";
                    if (isAnswered) {
                        if (isCorrect) {
                            btnClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white shadow-[0_2px_0_var(--duo-correct-dark)]";
                        } else {
                            btnClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white shadow-[0_2px_0_#CC3333]";
                        }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => { 
                          const el = document.getElementById(`question-${i}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          setPaletteOpen(false); 
                        }}
                        className={cn(
                          "w-10 h-10 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center border-2",
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

  // Determine score emoji and message
  const getScoreDisplay = () => {
    if (percentage >= 80) return { emoji: "🏆", text: "Xuất sắc!", color: "text-[var(--duo-correct)]", bg: "bg-[var(--duo-correct)]/10", border: "border-[var(--duo-correct)]/20" };
    if (percentage >= 60) return { emoji: "👍", text: "Khá tốt!", color: "text-[var(--duo-blue)]", bg: "bg-[#DDF4FF]", border: "border-[#A8E0FD]" };
    if (percentage >= 40) return { emoji: "💪", text: "Cố gắng thêm!", color: "text-[var(--duo-yellow)]", bg: "bg-[#FFF8E0]", border: "border-[#FFE680]" };
    return { emoji: "📚", text: "Hãy ôn tập lại!", color: "text-[var(--duo-orange)]", bg: "bg-[#FFF0E0]", border: "border-[#FFCC80]" };
  };

  const scoreDisplay = getScoreDisplay();

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <div className="card-duo p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
          <div className="text-6xl mb-2">{scoreDisplay.emoji}</div>
          <h1 className="text-2xl font-extrabold text-foreground">KẾT QUẢ BÀI THI</h1>
          <p className={`text-lg font-extrabold ${scoreDisplay.color}`}>{scoreDisplay.text}</p>
          <div className={`text-5xl font-extrabold ${scoreDisplay.color}`}>{score} / {total}</div>
          <div className="progress-duo max-w-xs mx-auto">
            <div className="progress-duo-fill" style={{ width: `${percentage}%` }} />
          </div>
          <p className="text-lg font-extrabold text-foreground">{percentage}%</p>
          <div className="flex justify-center gap-4 sm:gap-6 text-sm font-bold">
            <span className="badge-duo badge-green">✅ Đúng: {score}</span>
            <span className="badge-duo badge-orange">❌ Sai: {total - score}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to={`/courses/${courseId}/learn`} className="btn-3d btn-3d-white py-2.5 px-5 text-sm inline-block">
            ← Quay về bài học
          </Link>
          <Link to={`/courses/${courseId}/quiz/${quizId}`} className="btn-3d btn-3d-blue py-2.5 px-5 text-sm inline-block">
            🔄 Làm lại
          </Link>
          {loadingQ ? (
            <button disabled className="btn-3d btn-3d-white py-2.5 px-5 text-sm opacity-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải giải...
            </button>
          ) : questions.length > 0 ? (
            <button onClick={() => setShowDetails(true)} className="btn-3d btn-3d-primary py-2.5 px-5 text-sm">
              👁 Xem giải chi tiết
            </button>
          ) : null}
        </div>
      </div>
    </StudentLayout>
  );
};

export default QuizResult;
