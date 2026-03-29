import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const mockQuestions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  text: i === 0 ? "Look at the picture. What is the man doing?" :
    i === 1 ? "Where is the meeting taking place?" :
    i === 2 ? "What does the woman suggest?" :
    `Sample question ${i + 1} for the TOEIC practice test.`,
  imageUrl: i === 0 ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop" : undefined,
  options: [
    { id: i * 4 + 1, text: "He is sitting at a desk.", isCorrect: i % 4 === 0 },
    { id: i * 4 + 2, text: "He is standing near a window.", isCorrect: i % 4 === 1 },
    { id: i * 4 + 3, text: "He is walking outside.", isCorrect: i % 4 === 2 },
    { id: i * 4 + 4, text: "He is reading a book.", isCorrect: i % 4 === 3 },
  ],
}));

const QuizPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const selectAnswer = (qIdx: number, optId: number) => {
    setAnswers(prev => ({ ...prev, [qIdx]: optId }));
  };

  const submit = () => {
    const correct = mockQuestions.filter((q, i) => {
      const selectedId = answers[i];
      return q.options.find(o => o.id === selectedId)?.isCorrect;
    }).length;
    navigate(`/courses/${courseId}/quiz/${quizId}/result`, {
      state: { score: correct, total: mockQuestions.length, answers, questions: mockQuestions },
    });
  };

  const answeredCount = Object.keys(answers).length;
  const unanswered = mockQuestions.length - answeredCount;

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-card rounded-xl border p-8 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">📝 Thi Online: Photos of People (Đề 01)</h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>10 câu hỏi · Không giới hạn thời gian</p>
              <p>1 tài liệu đính kèm</p>
            </div>
            <Button size="lg" onClick={() => setStarted(true)}>🚀 Bắt đầu làm bài</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const q = mockQuestions[currentQ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        {/* Question area */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Câu {currentQ + 1}/{mockQuestions.length}</span>
            </div>
            <Progress value={((currentQ + 1) / mockQuestions.length) * 100} className="h-2" />

            {q.imageUrl && (
              <img src={q.imageUrl} alt="Question" className="w-full max-w-md rounded-lg border" loading="lazy" />
            )}

            <p className="text-lg font-medium text-foreground">{q.text}</p>

            <div className="grid gap-3">
              {q.options.map((opt, oi) => (
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
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(prev => prev - 1)}>
                ← Câu trước
              </Button>
              {currentQ < mockQuestions.length - 1 ? (
                <Button onClick={() => setCurrentQ(prev => prev + 1)}>Câu tiếp →</Button>
              ) : (
                <Button onClick={() => setShowConfirm(true)}>Nộp bài</Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigator */}
        <div className="w-full lg:w-64 border-l bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Câu hỏi</h3>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {mockQuestions.map((_, i) => (
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

      {/* Confirm modal */}
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
              <Button className="flex-1" onClick={submit}>Nộp bài ngay</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPage;
