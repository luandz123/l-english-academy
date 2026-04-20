import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle } from "lucide-react";

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
    setAnswers(prev => ({ ...prev, [qIdx]: answerId }));
  };

  const submit = async () => {
    if (!user || !questions) return;
    setSubmitting(true);

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions?.length || 0;
  const unanswered = totalQ - answeredCount;

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12 relative">
          <Button variant="ghost" size="sm" className="absolute -top-12 left-0 text-muted-foreground" onClick={() => navigate(`/courses/${courseId}`)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Quay lại khóa học
          </Button>
          <div className="bg-card rounded-xl border-2 p-8 text-center space-y-4 shadow-xl">
            <h1 className="text-2xl font-bold text-foreground">📝 {quiz?.title || "Bài thi TOEIC"}</h1>
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground border-y py-4">
              <p className="flex items-center gap-2"><LayoutGrid className="w-4 h-4"/> Tổng số: <b>{totalQ} câu hỏi</b></p>
              <p className="flex items-center gap-2"><Clock className="w-4 h-4"/> Thời gian: <b>{quiz?.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} phút` : "Không giới hạn"}</b></p>
              {quiz?.audio_url && <p className="flex items-center gap-2 text-blue-600">🎧 Bài thi có audio nghe</p>}
            </div>
            <Button size="lg" className="w-full text-lg h-12" onClick={() => setStarted(true)}>🚀 Bắt đầu làm bài</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12 bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">Bài thi này chưa có câu hỏi.</p>
        </div>
      </StudentLayout>
    );
  }



  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
      {/* Sticky Header */}
      <header className="h-16 border-b shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowConfirm(true)}><ChevronLeft className="w-5 h-5"/></Button>
          <h1 className="font-bold text-sm lg:text-base hidden sm:block truncate max-w-xs">{quiz?.title}</h1>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-6">
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg font-mono font-bold text-lg">
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <Button onClick={() => setShowConfirm(true)} variant="default" className="shadow-md">
            Nộp bài
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
        
        {/* Main Content: List of all questions */}
        <div className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-32">
          {/* Quiz-level audio player (1 audio for entire exam) */}
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
          {questions.map((q: any, i: number) => (
            <div key={q.id} id={`question-${i}`} className="max-w-4xl mx-auto bg-card border rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold px-3 py-1 bg-muted rounded-full text-foreground/80">Câu {i + 1} / {totalQ}</span>
              </div>

              {q.image_url && <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-lg shadow-sm border mb-6" loading="lazy" />}
              {q.audio_url && <audio controls src={q.audio_url} className="w-full mb-6 rounded-lg" />}

              <p className="text-lg font-medium text-foreground mb-6 leading-relaxed bg-background p-4 rounded-xl">{q.question_text}</p>

              <div className="space-y-3">
                {q.answers.map((opt: any, oi: number) => {
                  const checked = answers[i] === opt.id;
                  const isListeningMode = !!quiz?.audio_url;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => selectAnswer(i, opt.id)}
                      className={cn(
                        "flex items-center gap-4 w-full p-4 rounded-xl border-2 transition-all cursor-pointer group",
                        checked
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/20"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground group-hover:border-primary")}>
                        {checked && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                      </div>
                      <span className="font-bold text-foreground min-w-[24px]">{String.fromCharCode(65 + oi)}.</span>
                      {isListeningMode ? (
                        <span className="text-base flex-1 text-muted-foreground/40 italic select-none">•••••</span>
                      ) : (
                        <span className={cn("text-base flex-1", checked ? "text-foreground font-medium" : "text-muted-foreground")}>{opt.answer_text}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Sidebar: Grid (Desktop only) */}
        <div className="hidden lg:flex w-80 flex-col border-l bg-card h-full relative z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
           <div className="p-5 border-b bg-muted/20">
              <h3 className="font-bold text-base mb-3 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary"/> Danh sách câu hỏi</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary block"></span> Đã làm ({answeredCount})</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-muted-foreground block"></span> Chưa làm</span>
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-5 flex flex-wrap gap-2 content-start">
              {questions.map((_: any, i: number) => {
                 const isAnswered = answers[i] !== undefined;
                 return (
                    <button
                      key={i}
                      onClick={() => { document.getElementById(`question-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                      className={cn(
                        "w-11 h-11 rounded-xl text-sm font-bold transition-all flex items-center justify-center border-2 hover:-translate-y-0.5",
                        isAnswered ? "border-primary bg-primary text-primary-foreground shadow-sm hover:shadow-md" : "border-muted bg-card text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {i + 1}
                    </button>
                 );
              })}
           </div>
           <div className="p-5 border-t bg-muted/10">
              <Button className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all" size="lg" onClick={() => setShowConfirm(true)}>
                Nộp bài thi sơm
              </Button>
           </div>
        </div>
      </main>

      {/* Fixed Bottom Palette (Mobile only) */}
      <footer className="h-16 border-t shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
        <Button variant="secondary" onClick={() => setPaletteOpen(!paletteOpen)} className="font-medium gap-2 w-full justify-center h-10">
           <LayoutGrid className="w-4 h-4" />
           Danh sách câu hỏi
           <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs ml-1">{answeredCount}/{totalQ}</span>
        </Button>
      </footer>

      {/* Absolute Expandable Palette List (Mobile only) */}
      {paletteOpen && (
        <div className="absolute bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 max-h-[50vh] overflow-y-auto p-6 animate-in slide-in-from-bottom-5 lg:hidden">
           <div className="max-w-5xl mx-auto space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Điều hướng nhanh</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary block"></span> Đã làm ({answeredCount})</span>
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
                       const el = document.getElementById(`question-${i}`);
                       if (el) {
                         el.scrollIntoView({ behavior: 'smooth' });
                       }
                       setPaletteOpen(false); 
                     }}
                     className={cn(
                       "w-10 h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center border-2",
                       isAnswered ? "border-primary bg-primary text-primary-foreground shadow-sm" : 
                       "border-muted bg-card text-muted-foreground hover:border-primary/50"
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
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2 relative">
               <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-50"></div>
               <CheckCircle className="w-7 h-7 relative z-10" />
            </div>
            <h3 className="font-bold text-xl text-center text-foreground">Xác nhận nộp bài</h3>
            <div className="bg-muted/50 rounded-xl p-4 text-center space-y-2 border">
              <p className="text-sm font-medium">Đã trả lời: <span className="text-primary font-bold text-base">{answeredCount}/{totalQ}</span></p>
              {unanswered > 0 && <p className="text-xs font-semibold text-destructive px-3 py-1 bg-destructive/10 rounded-full inline-block">Bạn còn {unanswered} câu chưa làm!</p>}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setShowConfirm(false)}>Quay lại làm tiếp</Button>
              <Button className="flex-1 h-11 font-bold shadow-md hover:shadow-lg transition-all" onClick={submit} disabled={submitting}>
                {submitting ? "Đang nộp..." : "Chắc chắn nộp"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
