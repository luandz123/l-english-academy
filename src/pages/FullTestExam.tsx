import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="card-duo p-8 max-w-lg text-center space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-[var(--duo-blue)] shadow-[0_4px_0_var(--duo-blue-dark)] flex items-center justify-center mx-auto">
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-xl font-extrabold text-foreground">{testInfo?.title ?? `Đề số ${testId}`}</h1>
          <p className="text-sm text-muted-foreground font-bold">200 câu hỏi · 120 phút · 7 Parts</p>
          <p className="text-xs text-muted-foreground font-medium">Part 1-4: Listening · Part 5-7: Reading</p>
          <button className="btn-3d btn-3d-green w-full py-3.5 text-base" onClick={() => setStarted(true)}>🚀 BẮT ĐẦU THI</button>
        </div>
      </div>
    );
  }

  const hours = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b-2 border-[var(--duo-gray)] p-3 flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          {partNames.map((name, i) => (
            <button key={i} onClick={() => goToPart(i)}
              className={cn("px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all border-2",
                currentPart === i 
                  ? "bg-[var(--duo-green)] text-white border-[var(--duo-green)] shadow-[0_2px_0_var(--duo-green-dark)]" 
                  : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
              )}>{name}</button>
          ))}
        </div>
        <span className="text-xs font-bold text-muted-foreground ml-auto">{answeredCount}/200 đã trả lời</span>
        <span className="text-sm font-mono font-extrabold text-[var(--duo-red)] bg-red-50 border-2 border-red-200 px-3 py-1 rounded-xl">⏱ {hours}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
      </div>

      <div className="flex flex-1">
        <div className="hidden lg:block w-64 border-r-2 border-[var(--duo-gray)] bg-card p-3 overflow-y-auto">
          <div className="space-y-3">
            {partNames.map((name, pi) => {
              const { start, end } = getPartRange(pi);
              return (
                <div key={pi}>
                  <p className="text-xs font-extrabold text-muted-foreground mb-1">{name}</p>
                  <div className="grid grid-cols-6 gap-1">
                    {Array.from({ length: end - start + 1 }, (_, i) => {
                      const qIdx = start + i;
                      return (
                      <button key={qIdx} onClick={() => { 
                          setCurrentPart(pi); 
                          document.getElementById(`question-${qIdx}`)?.scrollIntoView({ behavior: 'smooth' }); 
                        }}
                          className={cn("w-7 h-7 text-xs rounded-lg font-extrabold border-2 transition-all hover:border-[var(--duo-blue)]",
                            answers[qIdx] !== undefined 
                              ? "bg-[var(--duo-green)] text-white border-[var(--duo-green)] shadow-[0_2px_0_var(--duo-green-dark)]" 
                              : "bg-white text-muted-foreground border-[var(--duo-gray)]"
                          )}>{qIdx + 1}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn-3d btn-3d-green w-full py-2.5 mt-4 text-sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Nộp bài"}
          </button>
        </div>

        <div className="flex-1 h-[calc(100vh-120px)] overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-32">
          {allQuestions.map((q, qIdx) => (
            <div key={qIdx} id={`question-${qIdx}`} className="max-w-4xl mx-auto card-duo p-6 scroll-mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-duo badge-blue">Câu {qIdx + 1} / 200</span>
                  <span className="badge-duo badge-green text-[10px]">
                    {partNames[q.part]}
                  </span>
                </div>
              </div>
              
              <p className="text-lg font-bold text-foreground mb-6 leading-relaxed bg-muted p-4 rounded-xl">{q.text}</p>
              
              <div className="grid gap-3">
                {q.options.map((opt, oi) => {
                  const checked = answers[qIdx] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: oi }))}
                      className={cn("w-full text-left p-4 rounded-xl border-2 text-sm transition-all flex items-center group",
                        checked 
                          ? "border-[var(--duo-green)] bg-[#E8F8D4] shadow-[0_3px_0_#C8EDA0] font-bold" 
                          : "border-[var(--duo-gray)] bg-white text-foreground hover:border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-gray)]"
                      )}>
                      <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mr-3 font-extrabold text-sm", checked ? "border-[var(--duo-green)] bg-[var(--duo-green)] text-white" : "border-[var(--duo-gray-dark)] group-hover:border-[var(--duo-blue)]")}>
                        {checked ? "✓" : String.fromCharCode(65 + oi)}
                      </div>
                      <span className="flex-1 font-bold">{opt}</span>
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
