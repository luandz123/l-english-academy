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
        <header className="h-16 border-b-2 border-[var(--duo-gray)] shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowDetails(false)}>
              <ChevronLeft className="w-5 h-5"/>
            </Button>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">{quiz?.title} - Chi tiết giải</h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <button onClick={() => setShowDetails(false)} className="btn-3d btn-3d-white py-2 px-4 text-sm">
              Đóng xem giải
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* Main Content: List of all questions */}
          <div className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-32">
            {quiz?.audio_url && (
              <div className="max-w-4xl mx-auto bg-[#DDF4FF] border-2 border-[#A8E0FD] rounded-2xl p-4 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--duo-blue)] shadow-[0_3px_0_var(--duo-blue-dark)] flex items-center justify-center shrink-0">
                    <span className="text-lg">🎧</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-foreground mb-1">Audio bài thi</p>
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
                  <div key={q.id} id={`question-${i}`} className="max-w-4xl mx-auto card-duo p-6 scroll-mt-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="badge-duo badge-blue">Câu {i + 1} / {totalQ}</span>
                      {selectedId ? (
                          isCorrect ? (
                              <span className="badge-duo badge-green flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đúng</span>
                          ) : (
                              <span className="badge-duo badge-orange flex items-center gap-1"><XCircle className="w-4 h-4" /> Sai</span>
                          )
                      ) : (
                          <span className="badge-duo badge-yellow">Chưa làm</span>
                      )}
                    </div>

                    {q.image_url && <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] mb-6" loading="lazy" />}
                    {q.audio_url && <audio controls src={q.audio_url} className="w-full mb-6 rounded-lg" />}

                    <p className="text-lg font-bold text-foreground mb-6 leading-relaxed bg-muted p-4 rounded-xl">{q.question_text}</p>

                    <div className="space-y-3">
                      {q.answers.map((opt: any, oi: number) => {
                        const isSelected = selectedId === opt.id;
                        const isOptCorrect = opt.is_correct;
                        
                        let optClass = "border-[var(--duo-gray)] bg-white shadow-[0_2px_0_var(--duo-gray)]";
                        let indicatorClass = "border-[var(--duo-gray-dark)] text-muted-foreground";
                        
                        if (isOptCorrect) {
                           optClass = "border-[var(--duo-green)] bg-[#E8F8D4] shadow-[0_3px_0_#C8EDA0]";
                           indicatorClass = "border-[var(--duo-green)] bg-[var(--duo-green)] text-white";
                        } else if (isSelected && !isOptCorrect) {
                           optClass = "border-[var(--duo-red)] bg-red-50 shadow-[0_3px_0_#FFB3B3]";
                           indicatorClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white";
                        }
                        
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all group",
                              optClass
                            )}
                          >
                            <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 font-extrabold text-sm", indicatorClass)}>
                              {isOptCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + oi)}
                            </div>
                            <span className={cn("text-base flex-1 font-bold", (isOptCorrect || isSelected) ? "text-foreground" : "text-muted-foreground")}>{opt.answer_text}</span>
                            {isOptCorrect && <span className="badge-duo badge-green text-[10px]">✅ Đáp án</span>}
                            {isSelected && !isOptCorrect && <span className="badge-duo badge-orange text-[10px]">❌ Bạn chọn</span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 space-y-3">
                        {correctOpt?.explanation && (
                          <div className="p-4 bg-[#E8F8D4] border-2 border-[#C8EDA0] rounded-xl text-sm font-medium text-foreground">
                            💡 <strong>Giải thích:</strong> {correctOpt.explanation}
                          </div>
                        )}

                        {q.translation && (
                          <div className="p-4 bg-[#DDF4FF] border-2 border-[#A8E0FD] rounded-xl text-sm font-medium text-[var(--duo-blue-dark)]">
                            🇻🇳 <strong>Dịch nghĩa:</strong> {q.translation}
                          </div>
                        )}
                    </div>
                  </div>
                 );
            })}
          </div>

          {/* Right Sidebar: Grid (Desktop only) */}
          <div className="hidden lg:flex w-80 flex-col border-l-2 border-[var(--duo-gray)] bg-card h-full relative z-10">
             <div className="p-5 border-b-2 border-[var(--duo-gray)]">
                <h3 className="font-extrabold text-base mb-3 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-[var(--duo-green)]"/> Danh sách câu hỏi</h3>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--duo-green)] block"></span> Đúng ({score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[var(--duo-red)] block"></span> Sai ({totalQ - score})</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-muted-foreground block"></span> Chưa làm</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-5 flex flex-wrap gap-2 content-start">
                {questions.map((q: any, i: number) => {
                   const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   let btnClass = "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]";
                   if (isAnswered) {
                       if (isCorrect) {
                           btnClass = "border-[var(--duo-green)] bg-[var(--duo-green)] text-white shadow-[0_3px_0_var(--duo-green-dark)]";
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
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--duo-green)] block"></span> Đúng ({score})</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--duo-red)] block"></span> Sai ({totalQ - score})</span>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {questions.map((q: any, i: number) => {
                   const selectedId = dbUserAnswers.length > 0 ? selectedByQuestionId[q.id] : stateAnswers[i];
                   const isCorrect = q.answers?.find((o: any) => o.id === selectedId)?.is_correct;
                   const isAnswered = !!selectedId;
                   
                   let btnClass = "border-[var(--duo-gray)] bg-white text-muted-foreground hover:border-[var(--duo-blue)]";
                   if (isAnswered) {
                       if (isCorrect) {
                           btnClass = "border-[var(--duo-green)] bg-[var(--duo-green)] text-white shadow-[0_2px_0_var(--duo-green-dark)]";
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
    if (percentage >= 80) return { emoji: "🏆", text: "Xuất sắc!", color: "text-[var(--duo-green)]", bg: "bg-[#E8F8D4]", border: "border-[#C8EDA0]" };
    if (percentage >= 60) return { emoji: "👍", text: "Khá tốt!", color: "text-[var(--duo-blue)]", bg: "bg-[#DDF4FF]", border: "border-[#A8E0FD]" };
    if (percentage >= 40) return { emoji: "💪", text: "Cố gắng thêm!", color: "text-[var(--duo-yellow)]", bg: "bg-[#FFF8E0]", border: "border-[#FFE680]" };
    return { emoji: "📚", text: "Hãy ôn tập lại!", color: "text-[var(--duo-orange)]", bg: "bg-[#FFF0E0]", border: "border-[#FFCC80]" };
  };

  const scoreDisplay = getScoreDisplay();

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <div className="card-duo p-8 text-center space-y-5">
          <div className="text-6xl mb-2">{scoreDisplay.emoji}</div>
          <h1 className="text-2xl font-extrabold text-foreground">KẾT QUẢ BÀI THI</h1>
          <p className={`text-lg font-extrabold ${scoreDisplay.color}`}>{scoreDisplay.text}</p>
          <div className={`text-5xl font-extrabold ${scoreDisplay.color}`}>{score} / {total}</div>
          <div className="progress-duo max-w-xs mx-auto">
            <div className="progress-duo-fill" style={{ width: `${percentage}%` }} />
          </div>
          <p className="text-lg font-extrabold text-foreground">{percentage}%</p>
          <div className="flex justify-center gap-6 text-sm font-bold">
            <span className="badge-duo badge-green">✅ Đúng: {score}</span>
            <span className="badge-duo badge-orange">❌ Sai: {total - score}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to={`/courses/${courseId}`} className="btn-3d btn-3d-white py-2.5 px-5 text-sm inline-block">
            ← Quay về khóa học
          </Link>
          <Link to={`/courses/${courseId}/quiz/${quizId}`} className="btn-3d btn-3d-blue py-2.5 px-5 text-sm inline-block">
            🔄 Làm lại
          </Link>
          {loadingQ ? (
            <button disabled className="btn-3d btn-3d-white py-2.5 px-5 text-sm opacity-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải giải...
            </button>
          ) : questions.length > 0 ? (
            <button onClick={() => setShowDetails(true)} className="btn-3d btn-3d-green py-2.5 px-5 text-sm">
              👁 Xem giải chi tiết
            </button>
          ) : null}
        </div>
      </div>
    </StudentLayout>
  );
};

export default QuizResult;
