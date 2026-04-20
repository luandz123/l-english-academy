import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

  if (showDetails) {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
        {/* Sticky Header */}
        <header className="h-16 border-b shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)}>
              <ChevronLeft className="w-5 h-5"/>
            </Button>
            <h1 className="font-bold text-sm lg:text-base hidden sm:block truncate max-w-xs">{quiz?.title} - Chi tiết giải</h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <Button onClick={() => setShowDetails(false)} variant="outline" className="shadow-sm">
              Đóng xem giải
            </Button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* Main Content: List of all questions */}
          <div className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-32">
            {quiz?.audio_url && (
              <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-xl p-4 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-lg">🎧</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground mb-1">Audio bài thi</p>
                    <audio controls src={quiz.audio_url} className="w-full h-8" controlsList="nodownload" />
                  </div>
                </div>
              </div>
            )}
            
            {questions.map((q: any, i: number) => {
                 const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                 const selectedOpt = q.answers?.find((o: any) => o.id === selectedId);
                 const correctOpt = q.answers?.find((o: any) => o.is_correct === true);
                 const isCorrect = !!selectedOpt?.is_correct;
                 
                 return (
                  <div key={q.id} id={`question-${i}`} className="max-w-4xl mx-auto bg-card border rounded-xl p-6 shadow-sm scroll-mt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-bold px-3 py-1 bg-muted rounded-full text-foreground/80">Câu {i + 1} / {totalQ}</span>
                      {selectedId ? (
                          isCorrect ? (
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full"><CheckCircle className="w-4 h-4" /> Đúng</span>
                          ) : (
                              <span className="flex items-center gap-1.5 text-sm font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full"><XCircle className="w-4 h-4" /> Sai</span>
                          )
                      ) : (
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">Chưa làm</span>
                      )}
                    </div>

                    {q.image_url && <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-lg shadow-sm border mb-6" loading="lazy" />}
                    {q.audio_url && <audio controls src={q.audio_url} className="w-full mb-6 rounded-lg" />}

                    <p className="text-lg font-medium text-foreground mb-6 leading-relaxed bg-background p-4 rounded-xl">{q.question_text}</p>

                    <div className="space-y-3">
                      {q.answers.map((opt: any, oi: number) => {
                        const isSelected = selectedId === opt.id;
                        const isOptCorrect = opt.is_correct;
                        
                        let optClass = "border-border bg-card";
                        let indicatorClass = "border-muted-foreground";
                        
                        if (isOptCorrect) {
                           optClass = "border-success bg-success/5 shadow-sm";
                           indicatorClass = "border-success bg-success text-success-foreground";
                        } else if (isSelected && !isOptCorrect) {
                           optClass = "border-destructive bg-destructive/5 shadow-sm";
                           indicatorClass = "border-destructive bg-destructive text-destructive-foreground";
                        }
                        
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all group",
                              optClass
                            )}
                          >
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0", indicatorClass)}>
                              {(isOptCorrect || isSelected) && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                            </div>
                            <span className="font-bold text-foreground min-w-[24px]">{String.fromCharCode(65 + oi)}.</span>
                            <span className={cn("text-base flex-1", (isOptCorrect || isSelected) ? "font-medium" : "text-muted-foreground")}>{opt.answer_text}</span>
                            {isOptCorrect && <span className="text-sm font-bold text-success ml-2">✅ Đáp án</span>}
                            {isSelected && !isOptCorrect && <span className="text-sm font-bold text-destructive ml-2">❌ Bạn chọn</span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 space-y-3">
                        {correctOpt?.explanation && (
                          <div className="p-4 bg-muted/50 border rounded-xl text-sm italic text-foreground">
                            💡 <strong>Giải thích:</strong> {correctOpt.explanation}
                          </div>
                        )}

                        {q.translation && (
                          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm text-blue-700 dark:text-blue-400">
                            🇻🇳 <strong>Dịch nghĩa:</strong> {q.translation}
                          </div>
                        )}
                    </div>
                  </div>
                 );
            })}
          </div>

          {/* Right Sidebar: Grid (Desktop only) */}
          <div className="hidden lg:flex w-80 flex-col border-l bg-card h-full relative z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
             <div className="p-5 border-b bg-muted/20">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary"/> Danh sách câu hỏi</h3>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success block"></span> Đúng ({score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive block"></span> Sai ({totalQ - score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-muted-foreground block"></span> Chưa làm</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-5 flex flex-wrap gap-2 content-start">
                {questions.map((q: any, i: number) => {
                   const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   let btnClass = "border-muted bg-card text-muted-foreground hover:border-primary/50";
                   if (isAnswered) {
                       if (isCorrect) {
                           btnClass = "border-success bg-success text-success-foreground shadow-sm hover:shadow-md";
                       } else {
                           btnClass = "border-destructive bg-destructive text-destructive-foreground shadow-sm hover:shadow-md";
                       }
                   }

                   return (
                      <button
                        key={i}
                        onClick={() => { document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={cn(
                          "w-11 h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center border-2 hover:-translate-y-0.5",
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
        <footer className="h-16 border-t shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
          <Button variant="secondary" onClick={() => setPaletteOpen(!paletteOpen)} className="font-medium gap-2 w-full justify-center h-10">
             <LayoutGrid className="w-4 h-4" />
             Danh sách câu hỏi
          </Button>
        </footer>

        {/* Absolute Expandable Palette List (Mobile only) */}
        {paletteOpen && (
          <div className="absolute bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 max-h-[50vh] overflow-y-auto p-6 animate-in slide-in-from-bottom-5 lg:hidden">
             <div className="max-w-5xl mx-auto space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Điều hướng nhanh</h3>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-success block"></span> Đúng ({score})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive block"></span> Sai ({totalQ - score})</span>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {questions.map((q: any, i: number) => {
                   const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   let btnClass = "border-muted bg-card text-muted-foreground hover:border-primary/50";
                   if (isAnswered) {
                       if (isCorrect) {
                           btnClass = "border-success bg-success text-success-foreground shadow-sm";
                       } else {
                           btnClass = "border-destructive bg-destructive text-destructive-foreground shadow-sm";
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
                         "w-10 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center border-2",
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

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-card rounded-xl border p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">🏆 KẾT QUẢ BÀI THI</h1>
          <div className="text-4xl font-extrabold text-primary">{score} / {total}</div>
          <Progress value={percentage} className="h-3 max-w-xs mx-auto" />
          <p className="text-lg font-semibold text-foreground">{percentage}%</p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-success font-medium">✅ Đúng: {score}</span>
            <span className="text-destructive font-medium">❌ Sai: {total - score}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to={`/courses/${courseId}`}>← Quay về khóa học</Link>
          </Button>
          <Button variant="default" asChild>
            <Link to={`/courses/${courseId}/quiz/${quizId}`}>🔄 Làm lại</Link>
          </Button>
          {loadingQ ? (
            <Button disabled variant="secondary">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải giải...
            </Button>
          ) : questions.length > 0 ? (
            <Button onClick={() => setShowDetails(true)} variant="secondary" className="shadow-sm">
              👁 Xem giải chi tiết
            </Button>
          ) : null}
        </div>
      </div>
    </StudentLayout>
  );
};

export default QuizResult;
