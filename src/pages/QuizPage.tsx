import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const QuizPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qid = Number(quizId);

  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    const { data: result, error } = await supabase.from("user_quiz_results").insert({
      user_id: user.id,
      quiz_id: qid,
      score: Number(score.toFixed(2)),
      correct_answers: correctCount,
      total_questions: questions.length,
    }).select().single();

    if (result) {
      // Save individual answers
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

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions?.length || 0;
  const unanswered = totalQ - answeredCount;

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-card rounded-xl border p-8 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">📝 {quiz?.title || "Bài thi"}</h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{totalQ} câu hỏi · {quiz?.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds / 60)} phút` : "Không giới hạn thời gian"}</p>
            </div>
            <Button size="lg" onClick={() => setStarted(true)}>🚀 Bắt đầu làm bài</Button>
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

  const q = questions[currentQ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Câu {currentQ + 1}/{totalQ}</span>
            </div>
            <Progress value={((currentQ + 1) / totalQ) * 100} className="h-2" />

            {q.image_url && (
              <img src={q.image_url} alt="Question" className="w-full max-w-md rounded-lg border" loading="lazy" />
            )}

            {q.audio_url && (
              <audio controls src={q.audio_url} className="w-full" />
            )}

            <p className="text-lg font-medium text-foreground">{q.question_text}</p>

            <div className="grid gap-3">
              {q.answers.map((opt: any, oi: number) => (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(currentQ, opt.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all text-sm",
                    answers[currentQ] === opt.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  )}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>
                  {opt.answer_text}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(prev => prev - 1)}>
                ← Câu trước
              </Button>
              {currentQ < totalQ - 1 ? (
                <Button onClick={() => setCurrentQ(prev => prev + 1)}>Câu tiếp →</Button>
              ) : (
                <Button onClick={() => setShowConfirm(true)}>Nộp bài</Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-64 border-l bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Câu hỏi</h3>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {questions.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={cn(
                  "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                  currentQ === i ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" :
                    answers[i] !== undefined ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mb-4">
            <p>● Đã trả lời: {answeredCount}</p>
            <p>○ Chưa trả lời: {unanswered}</p>
          </div>
          <Button className="w-full" onClick={() => setShowConfirm(true)}>Nộp bài</Button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-foreground">Xác nhận nộp bài</h3>
            {unanswered > 0 && (
              <p className="text-sm text-warning">Bạn còn {unanswered} câu chưa trả lời.</p>
            )}
            <p className="text-sm text-muted-foreground">Bạn có muốn nộp bài không?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Tiếp tục làm</Button>
              <Button className="flex-1" onClick={submit} disabled={submitting}>
                {submitting ? "Đang nộp..." : "Nộp bài ngay"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
