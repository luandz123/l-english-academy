import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const partNames = ["PART 1", "PART 2", "PART 3", "PART 4", "PART 5", "PART 6", "PART 7"];
const partQuestions = [6, 25, 39, 30, 30, 16, 54];

const generateQuestions = () => {
  let questions: { part: number; text: string; options: string[] }[] = [];
  partQuestions.forEach((count, pi) => {
    for (let i = 0; i < count; i++) {
      questions.push({
        part: pi,
        text: `[Part ${pi + 1}] Question ${i + 1}: Sample TOEIC question text.`,
        options: ["Option A", "Option B", "Option C", pi >= 1 ? "Option D" : ""].filter(Boolean),
      });
    }
  });
  return questions;
};

const allQuestions = generateQuestions();

const FullTestExam = () => {
  const { courseId, testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPart, setCurrentPart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [submitting, setSubmitting] = useState(false);

  const { data: testInfo } = useQuery({
    queryKey: ["full-test-info", testId],
    queryFn: async () => {
      const { data } = await supabase.from("full_tests").select("*").eq("id", Number(testId)).maybeSingle();
      return data;
    },
  });

  // Timer
  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { submit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started]);

  const answeredCount = Object.keys(answers).length;

  const getPartRange = (part: number) => {
    let start = 0;
    for (let i = 0; i < part; i++) start += partQuestions[i];
    return { start, end: start + partQuestions[part] - 1 };
  };

  const goToPart = (part: number) => {
    setCurrentPart(part);
    const targetQ = getPartRange(part).start;
    document.getElementById(`question-${targetQ}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = async () => {
    setSubmitting(true);
    const correct = Math.floor(answeredCount * 0.7 + Math.random() * answeredCount * 0.15);
    const listeningCorrect = Math.floor(correct * 0.48);
    const readingCorrect = correct - listeningCorrect;
    const listeningScore = Math.round((listeningCorrect / 100) * 495);
    const readingScore = Math.round((readingCorrect / 100) * 495);
    const totalScore = listeningScore + readingScore;
    const timeSpent = 120 * 60 - timeLeft;

    if (user) {
      await supabase.from("user_full_test_results").insert({
        user_id: user.id,
        test_id: Number(testId),
        correct_answers: correct,
        listening_score: listeningScore,
        reading_score: readingScore,
        total_score: totalScore,
        time_spent_seconds: timeSpent,
      });
    }

    navigate(`/courses/${courseId}/fulltest/${testId}/result`, {
      state: { correct, total: 200, listeningScore, readingScore, totalScore, time: timeSpent },
    });
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border p-8 max-w-lg text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">📋 {testInfo?.title ?? `Đề số ${testId}`}</h1>
          <p className="text-sm text-muted-foreground">200 câu hỏi · 120 phút · 7 Parts</p>
          <p className="text-xs text-muted-foreground">Part 1-4: Listening · Part 5-7: Reading</p>
          <Button size="lg" onClick={() => setStarted(true)}>🚀 Bắt đầu thi</Button>
        </div>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b p-3 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {partNames.map((name, i) => (
            <button key={i} onClick={() => goToPart(i)}
              className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                currentPart === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}>{name}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{answeredCount}/200 đã trả lời</span>
        <span className="text-sm font-mono font-bold text-destructive">⏱ {hours}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-1">
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
                      <button key={qIdx} onClick={() => { 
                          setCurrentPart(pi); 
                          document.getElementById(`question-${qIdx}`)?.scrollIntoView({ behavior: 'smooth' }); 
                        }}
                          className={cn("w-7 h-7 text-xs rounded font-medium border-2 transition-all hover:border-primary/50",
                            answers[qIdx] !== undefined ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-muted"
                          )}>{qIdx + 1}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="w-full mt-4" size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nộp bài"}
          </Button>
        </div>

        <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-32">
          {allQuestions.map((q, qIdx) => (
            <div key={qIdx} id={`question-${qIdx}`} className="max-w-4xl mx-auto bg-card border rounded-xl p-6 shadow-sm scroll-mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold px-3 py-1 bg-muted rounded-full text-foreground/80">Câu {qIdx + 1} / 200</span>
                  <span className="text-xs text-muted-foreground font-semibold px-2 py-1 bg-primary/10 text-primary rounded">
                    {partNames[q.part]}
                  </span>
                </div>
              </div>
              
              <p className="text-lg font-medium text-foreground mb-6 leading-relaxed bg-background p-4 rounded-xl">{q.text}</p>
              
              <div className="grid gap-3">
                {q.options.map((opt, oi) => {
                  const checked = answers[qIdx] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: oi }))}
                      className={cn("w-full text-left p-4 rounded-xl border-2 text-sm transition-all flex items-center group",
                        checked ? "border-primary bg-primary/10 text-primary font-medium shadow-sm" : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/20"
                      )}>
                      <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mr-3", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground group-hover:border-primary")}>
                        {checked && <div className="w-2.5 h-2.5 bg-background rounded-full" />}
                      </div>
                      <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FullTestExam;
