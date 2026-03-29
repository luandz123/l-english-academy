import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const partNames = ["PART 1", "PART 2", "PART 3", "PART 4", "PART 5", "PART 6", "PART 7"];
const partQuestions = [6, 25, 39, 30, 30, 16, 54]; // = 200

const generateQuestions = () => {
  let questions: { part: number; text: string; options: string[] }[] = [];
  partQuestions.forEach((count, pi) => {
    for (let i = 0; i < count; i++) {
      questions.push({
        part: pi,
        text: `[Part ${pi + 1}] Question ${i + 1}: Sample TOEIC question text.`,
        options: ["Option A", "Option B", "Option C", pi < 1 ? "" : "Option D"].filter(Boolean),
      });
    }
  });
  return questions;
};

const allQuestions = generateQuestions();

const FullTestExam = () => {
  const { courseId, testId } = useParams();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPart, setCurrentPart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 2 hours

  const answeredCount = Object.keys(answers).length;

  const getPartRange = (part: number) => {
    let start = 0;
    for (let i = 0; i < part; i++) start += partQuestions[i];
    return { start, end: start + partQuestions[part] - 1 };
  };

  const goToPart = (part: number) => {
    setCurrentPart(part);
    setCurrentQ(getPartRange(part).start);
  };

  const submit = () => {
    const correct = Math.floor(answeredCount * 0.7 + Math.random() * answeredCount * 0.15);
    navigate(`/courses/${courseId}/fulltest/${testId}/result`, {
      state: { correct, total: 200, listening: 78, reading: 65, time: 120 * 60 - timeLeft },
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border p-8 max-w-lg text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">📋 Bộ đề 2026 - Đề số {testId}</h1>
          <p className="text-sm text-muted-foreground">200 câu hỏi · 120 phút · 7 Parts</p>
          <p className="text-xs text-muted-foreground">Part 1-4: Listening · Part 5-7: Reading</p>
          <Button size="lg" onClick={() => setStarted(true)}>🚀 Bắt đầu thi</Button>
        </div>
      </div>
    );
  }

  const q = allQuestions[currentQ];
  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <div className="bg-card border-b p-3 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {partNames.map((name, i) => (
            <button
              key={i}
              onClick={() => goToPart(i)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                currentPart === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{answeredCount}/200 đã trả lời</span>
        <span className="text-sm font-mono font-bold text-warning">⏱ {hours}:{String(mins).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-1">
        {/* Question navigator sidebar */}
        <div className="hidden lg:block w-64 border-r bg-card p-3 overflow-y-auto">
          <div className="space-y-3">
            {partNames.map((name, pi) => {
              const { start, end } = getPartRange(pi);
              return (
                <div key={pi}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{name}</p>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: end - start + 1 }, (_, i) => {
                      const qIdx = start + i;
                      return (
                        <button
                          key={qIdx}
                          onClick={() => { setCurrentQ(qIdx); setCurrentPart(pi); }}
                          className={cn(
                            "w-7 h-7 text-xs rounded font-medium",
                            currentQ === qIdx ? "bg-primary text-primary-foreground" :
                            answers[qIdx] !== undefined ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {qIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="w-full mt-4" size="sm" onClick={submit}>Nộp bài</Button>
        </div>

        {/* Main question */}
        <div className="flex-1 p-6 max-w-3xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Câu {currentQ + 1}/200</span>
              <span className="text-xs text-muted-foreground">({partNames[q.part]})</span>
            </div>
            <Progress value={((currentQ + 1) / 200) * 100} className="h-1.5" />
            <p className="text-base text-foreground">{q.text}</p>
            <div className="grid gap-3">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: oi }))}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 text-sm transition-all",
                    answers[currentQ] === oi
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  )}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => { setCurrentQ(prev => prev - 1); setCurrentPart(allQuestions[currentQ - 1]?.part ?? 0); }}>← Câu trước</Button>
              {currentQ < 199 ? (
                <Button onClick={() => { setCurrentQ(prev => prev + 1); setCurrentPart(allQuestions[currentQ + 1]?.part ?? 0); }}>Câu tiếp →</Button>
              ) : (
                <Button onClick={submit}>Nộp bài</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullTestExam;
