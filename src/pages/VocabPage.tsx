import StudentLayout from "@/components/StudentLayout";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const VocabPage = () => {
  const { courseId } = useParams();
  const cid = Number(courseId);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [view, setView] = useState<"categories" | "days" | "quiz" | "result">("categories");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["vocab-categories", cid],
    queryFn: async () => {
      const { data } = await supabase
        .from("vocab_categories")
        .select("*")
        .eq("course_id", cid)
        .order("display_order");
      return data || [];
    },
  });

  const { data: quizzes } = useQuery({
    queryKey: ["vocab-quizzes", selectedCat],
    queryFn: async () => {
      const { data } = await supabase
        .from("vocab_quizzes")
        .select("*")
        .eq("category_id", selectedCat!)
        .order("display_order");
      return data || [];
    },
    enabled: selectedCat !== null,
  });

  const { data: vocabWords } = useQuery({
    queryKey: ["vocab-words", selectedQuiz],
    queryFn: async () => {
      const { data } = await supabase
        .from("vocab_questions")
        .select("*")
        .eq("vocab_quiz_id", selectedQuiz!)
        .order("display_order");
      return data || [];
    },
    enabled: selectedQuiz !== null,
  });

  const shuffleOptions = (word: any) => {
    const opts = [word.definition_vi, word.wrong_answer_1, word.wrong_answer_2, word.wrong_answer_3].filter(Boolean);
    return opts.sort(() => Math.random() - 0.5);
  };

  const startQuiz = (quizId: number) => {
    setSelectedQuiz(quizId);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setView("quiz");
  };

  const handleAnswer = (ans: string) => {
    if (!vocabWords) return;
    setSelectedAnswer(ans);
    setShowResult(true);
    if (ans === vocabWords[currentQ].definition_vi) setCorrectCount(prev => prev + 1);
  };

  const nextQuestion = () => {
    if (!vocabWords) return;
    if (currentQ >= vocabWords.length - 1) {
      setView("result");
    } else {
      setCurrentQ(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  // Set shuffled options when question changes
  const word = vocabWords?.[currentQ];
  if (word && view === "quiz" && !showResult && shuffledOptions.length === 0) {
    const opts = shuffleOptions(word);
    if (opts.length > 0) setShuffledOptions(opts);
  }

  // Reset shuffled options when moving to next question
  const effectiveOptions = showResult ? shuffledOptions : (word ? shuffleOptions(word) : []);

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;

  if (view === "result" && vocabWords) {
    const pct = Math.round((correctCount / vocabWords.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto mt-12 bg-card rounded-xl border p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">🎉 Hoàn thành!</h1>
          <p className="text-lg text-foreground">Điểm: {correctCount}/{vocabWords.length} ({pct}%)</p>
          <p className="text-3xl">{"⭐".repeat(stars)}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => startQuiz(selectedQuiz!)}>Làm lại</Button>
            <Button onClick={() => setView("days")}>Quay lại</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "quiz" && word) {
    const options = [word.definition_vi, word.wrong_answer_1, word.wrong_answer_2, word.wrong_answer_3].filter(Boolean).sort(() => Math.random() - 0.5);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{quizzes?.find(q => q.id === selectedQuiz)?.title}</span>
          <span className="text-sm text-muted-foreground">Câu {currentQ + 1}/{vocabWords!.length}</span>
          <Button size="sm" variant="ghost" onClick={() => setView("days")}>✕</Button>
        </div>
        <Progress value={((currentQ + 1) / vocabWords!.length) * 100} className="h-1" />

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6 text-center">
            <div className="flex justify-center gap-3">
              <Button size="sm" variant="outline"><Volume2 className="w-4 h-4 mr-1" /> Nam</Button>
              <Button size="sm" variant="outline"><Volume2 className="w-4 h-4 mr-1" /> Nữ</Button>
            </div>
            <h2 className="text-3xl font-bold text-foreground">{word.word}</h2>
            <p className="text-muted-foreground">{word.phonetic}</p>
            {word.example_sentence && <p className="text-sm text-muted-foreground italic">"{word.example_sentence}"</p>}
            <p className="text-sm font-medium text-foreground">Chọn nghĩa đúng của từ trên:</p>
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => !showResult && handleAnswer(opt!)}
                  disabled={showResult}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all",
                    showResult && opt === word.definition_vi ? "border-success bg-success/10 text-success" :
                    showResult && opt === selectedAnswer && opt !== word.definition_vi ? "border-destructive bg-destructive/10 text-destructive" :
                    !showResult ? "border-border bg-card text-foreground hover:border-primary" : "border-border bg-card text-foreground"
                  )}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <Button onClick={nextQuestion} size="lg">
                {currentQ >= vocabWords!.length - 1 ? "Xem kết quả" : "Tiếp tục →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl">
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          <h2 className="text-lg font-bold text-foreground mb-3">📚 Phần từ vựng</h2>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(cat.id); setView("days"); }}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedCat === cat.id && view === "days" ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
              )}
            >
              <p className="text-sm font-medium text-foreground">{cat.title}</p>
            </button>
          ))}
        </div>

        {view === "days" && quizzes && (
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {categories?.find(c => c.id === selectedCat)?.title}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((day) => (
                <div key={day.id} className="bg-card rounded-xl border p-4 space-y-3 card-hover">
                  <h3 className="font-semibold text-foreground text-sm">{day.title}</h3>
                  <p className="text-xs text-muted-foreground">{day.total_questions} câu hỏi</p>
                  <Button size="sm" className="w-full" onClick={() => startQuiz(day.id)}>
                    Bắt đầu
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "categories" && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">← Chọn một phần từ vựng để bắt đầu</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
