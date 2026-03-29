import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronDown } from "lucide-react";
import { useState } from "react";

const QuizResult = () => {
  const { courseId, quizId } = useParams();
  const location = useLocation();
  const state = location.state as any;

  const score = state?.score ?? 8;
  const total = state?.total ?? 10;
  const questions = state?.questions ?? [];
  const userAnswers = state?.answers ?? {};
  const percentage = Math.round((score / total) * 100);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">🏆 KẾT QUẢ BÀI THI</h1>
          <div className="text-4xl font-extrabold text-primary">{score} / {total}</div>
          <Progress value={percentage} className="h-3 max-w-xs mx-auto" />
          <p className="text-lg font-semibold text-foreground">{percentage}%</p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-success">✅ Đúng: {score}</span>
            <span className="text-destructive">❌ Sai: {total - score}</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to={`/courses/${courseId}`}>← Quay về khóa học</Link>
          </Button>
          <Button asChild>
            <Link to={`/courses/${courseId}/quiz/${quizId}`}>🔄 Làm lại</Link>
          </Button>
        </div>

        {/* Answer review */}
        {questions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">📋 Xem lại bài</h2>
            {questions.map((q: any, i: number) => {
              const selectedId = userAnswers[i];
              const selectedOpt = q.options.find((o: any) => o.id === selectedId);
              const correctOpt = q.options.find((o: any) => o.isCorrect);
              const isCorrect = selectedOpt?.isCorrect;

              return (
                <div key={i} className="bg-card rounded-xl border p-4">
                  <button
                    onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground flex-1">Câu {i + 1}: {q.text}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedQ === i ? "rotate-180" : ""}`} />
                  </button>
                  {expandedQ === i && (
                    <div className="mt-3 space-y-2 pl-8">
                      {q.options.map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg text-sm ${
                            opt.isCorrect ? "bg-success/10 text-success border border-success/30" :
                            opt.id === selectedId && !opt.isCorrect ? "bg-destructive/10 text-destructive border border-destructive/30" :
                            "text-muted-foreground"
                          }`}
                        >
                          {opt.text} {opt.isCorrect && "✅"} {opt.id === selectedId && !opt.isCorrect && "❌"}
                        </div>
                      ))}
                      <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                        💡 Đáp án đúng: {correctOpt?.text}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default QuizResult;
