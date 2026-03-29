import StudentLayout from "@/components/StudentLayout";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

const categories = [
  { id: 1, title: "Từ Vựng Nghe Hiểu", topics: 10, progress: 88 },
  { id: 2, title: "Từ Vựng Đọc Hiểu", topics: 16, progress: 45 },
  { id: 3, title: "Từ Vựng Part 7", topics: 10, progress: 20 },
  { id: 4, title: "Từ Vựng Theo Chủ Đề", topics: 11, progress: 60 },
  { id: 5, title: "1000 Từ Trọng Điểm 2025", topics: 20, progress: 0 },
  { id: 6, title: "1600 Từ Trọng Điểm 2026", topics: 32, progress: 0 },
  { id: 7, title: "1000 Từ Nâng Cao 850-990", topics: 20, progress: 0 },
  { id: 8, title: "1500 Từ Quan Trọng Nhất", topics: 30, progress: 0 },
];

const mockWords = [
  { word: "ABANDON", phonetic: "/əˈbændən/", example: "They had to abandon the project.", correct: "Từ bỏ, bỏ rơi", wrongs: ["Chấp nhận", "Tiếp tục", "Cải thiện"] },
  { word: "ACHIEVE", phonetic: "/əˈtʃiːv/", example: "She achieved her goal.", correct: "Đạt được", wrongs: ["Mất đi", "Từ chối", "Bỏ qua"] },
  { word: "ALLOCATE", phonetic: "/ˈæləkeɪt/", example: "We need to allocate resources.", correct: "Phân bổ", wrongs: ["Thu thập", "Loại bỏ", "Tích lũy"] },
  { word: "ANNUAL", phonetic: "/ˈænjuəl/", example: "The annual report is due.", correct: "Hàng năm", wrongs: ["Hàng tháng", "Hàng tuần", "Hàng ngày"] },
  { word: "APPROACH", phonetic: "/əˈproʊtʃ/", example: "We need a new approach.", correct: "Tiếp cận, phương pháp", wrongs: ["Rời xa", "Từ chối", "Trì hoãn"] },
];

const days = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  title: `Day ${i + 1} - Part 1`,
  questions: 49 + Math.floor(Math.random() * 10),
  progress: Math.max(0, 88 - i * 15),
}));

type ViewState = "categories" | "days" | "quiz" | "result";

const VocabPage = () => {
  const { courseId } = useParams();
  const [selectedCat, setSelectedCat] = useState(0);
  const [view, setView] = useState<ViewState>("categories");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const word = mockWords[currentQ % mockWords.length];
  const allOptions = [word.correct, ...word.wrongs].sort(() => Math.random() - 0.5);

  const handleAnswer = (ans: string) => {
    setSelectedAnswer(ans);
    setShowResult(true);
    if (ans === word.correct) setCorrectCount(prev => prev + 1);
  };

  const nextQuestion = () => {
    if (currentQ >= mockWords.length - 1) {
      setView("result");
    } else {
      setCurrentQ(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setView("quiz");
  };

  if (view === "result") {
    const pct = Math.round((correctCount / mockWords.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto mt-12 bg-card rounded-xl border p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">🎉 Hoàn thành!</h1>
          <p className="text-lg text-foreground">Điểm: {correctCount}/{mockWords.length} ({pct}%)</p>
          <p className="text-3xl">{"⭐".repeat(stars)}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={resetQuiz}>Làm lại</Button>
            <Button onClick={() => setView("days")}>Quay lại</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "quiz") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Day 1 – Part 1</span>
          <span className="text-sm text-muted-foreground">Câu {currentQ + 1}/{mockWords.length}</span>
          <Button size="sm" variant="ghost" onClick={() => setView("days")}>✕</Button>
        </div>
        <Progress value={((currentQ + 1) / mockWords.length) * 100} className="h-1" />

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6 text-center">
            <div className="flex justify-center gap-3">
              <Button size="sm" variant="outline"><Volume2 className="w-4 h-4 mr-1" /> Nam</Button>
              <Button size="sm" variant="outline"><Volume2 className="w-4 h-4 mr-1" /> Nữ</Button>
            </div>
            <h2 className="text-3xl font-bold text-foreground">{word.word}</h2>
            <p className="text-muted-foreground">{word.phonetic}</p>
            <p className="text-sm text-muted-foreground italic">"{word.example}"</p>
            <p className="text-sm font-medium text-foreground">Chọn nghĩa đúng của từ trên:</p>
            <div className="grid grid-cols-2 gap-3">
              {allOptions.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && handleAnswer(opt)}
                  disabled={showResult}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all",
                    showResult && opt === word.correct ? "border-success bg-success/10 text-success" :
                    showResult && opt === selectedAnswer && opt !== word.correct ? "border-destructive bg-destructive/10 text-destructive" :
                    !showResult && "border-border bg-card text-foreground hover:border-primary"
                  )}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <Button onClick={nextQuestion} size="lg">
                {currentQ >= mockWords.length - 1 ? "Xem kết quả" : "Tiếp tục →"}
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
        {/* Category sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          <h2 className="text-lg font-bold text-foreground mb-3">📚 Phần từ vựng</h2>
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(i); setView("days"); }}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedCat === i && view === "days" ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
              )}
            >
              <p className="text-sm font-medium text-foreground">{cat.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={cat.progress} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">{cat.progress}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{cat.topics} chuyên đề</p>
            </button>
          ))}
        </div>

        {/* Days grid */}
        {view === "days" && (
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground mb-4">{categories[selectedCat].title}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {days.map((day) => (
                <div key={day.id} className="bg-card rounded-xl border p-4 space-y-3 card-hover">
                  <h3 className="font-semibold text-foreground text-sm">{day.title}</h3>
                  <p className="text-xs text-muted-foreground">{day.questions} câu hỏi</p>
                  <div className="flex items-center gap-2">
                    <Progress value={day.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{day.progress}%</span>
                  </div>
                  <Button size="sm" className="w-full" onClick={resetQuiz}>
                    {day.progress > 0 ? "Tiếp tục" : "Bắt đầu"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
