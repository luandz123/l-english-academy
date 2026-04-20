import StudentLayout from "@/components/StudentLayout";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2, Undo2, LayoutGrid, Check, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const VocabPage = () => {
  const { courseId } = useParams();
  const cid = Number(courseId);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [view, setView] = useState<"categories" | "days" | "quiz" | "flashcard" | "result">("categories");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

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

  const startLearning = (quizId: number, mode: "quiz" | "flashcard") => {
    setSelectedQuiz(quizId);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setIsFlipped(false);
    setView(mode);
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
      setIsFlipped(false);
    }
  };

  const word = vocabWords?.[currentQ];
  if (word && view === "quiz" && !showResult && shuffledOptions.length === 0) {
    const opts = shuffleOptions(word);
    if (opts.length > 0) setShuffledOptions(opts);
  }

  const effectiveOptions = showResult ? shuffledOptions : (word ? shuffleOptions(word) : []);

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl" /></StudentLayout>;

  if (view === "result" && vocabWords) {
    const pct = Math.round((correctCount / vocabWords.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto mt-12 bg-card rounded-xl border p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">🎉 Hoàn thành!</h1>
          <p className="text-lg text-foreground">Điểm: {correctCount}/{vocabWords.length} ({pct}%)</p>
          <p className="text-3xl">{"⭐".repeat(stars)}</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="outline" onClick={() => startLearning(selectedQuiz!, "flashcard")}>Học lại Flashcard</Button>
            <Button onClick={() => setView("days")}>Trở về danh sách</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "flashcard" && word) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Flashcards: {quizzes?.find(q => q.id === selectedQuiz)?.title}
          </span>
          <div className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">Câu {currentQ + 1}/{vocabWords!.length}</div>
          <Button size="icon" variant="ghost" onClick={() => setView("days")}><XIcon className="w-5 h-5"/></Button>
        </div>
        <Progress value={((currentQ + 1) / vocabWords!.length) * 100} className="h-1 rounded-none" />

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div 
            className="w-full max-w-sm aspect-[3/4] bg-card rounded-3xl border-2 shadow-xl cursor-pointer flex flex-col items-center justify-center p-8 text-center transition-all hover:border-primary/50 relative overflow-hidden group select-none" 
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {!isFlipped ? (
               <>
               <div className="absolute top-4 right-4 p-2 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                  <Volume2 className="w-5 h-5" />
               </div>
               <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{word.word}</h2>
               <div className="mt-8 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground animate-pulse">Chạm để lật thẻ</div>
               </>
            ) : (
               <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in-95 duration-300">
                 <h2 className="text-3xl font-bold text-primary mb-2">{word.word}</h2>
                 <p className="text-lg text-muted-foreground mb-6 font-mono bg-muted px-3 py-1 rounded-md">{word.phonetic}</p>
                 <div className="w-full h-px bg-border my-2"></div>
                 <p className="text-2xl font-bold text-foreground mb-6">{word.definition_vi}</p>
                 {word.example_sentence && (
                   <div className="bg-muted/50 p-4 rounded-xl border border-dashed border-primary/20 w-full mt-auto">
                      <p className="text-sm text-muted-foreground italic leading-relaxed">"{word.example_sentence}"</p>
                   </div>
                 )}
               </div>
            )}
          </div>
          
          <div className="flex gap-4 w-full max-w-sm mt-8">
             <Button variant="outline" className="flex-1 h-14 text-lg border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive group" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); nextQuestion(); }}>
                <XIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Chưa thuộc
             </Button>
             <Button variant="default" className="flex-1 h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md group" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCorrectCount(prev=>prev+1); nextQuestion(); }}>
                <Check className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" /> Đã thuộc
             </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "quiz" && word) {
    const options = [word.definition_vi, word.wrong_answer_1, word.wrong_answer_2, word.wrong_answer_3].filter(Boolean).sort(() => Math.random() - 0.5);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b bg-card flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{quizzes?.find(q => q.id === selectedQuiz)?.title}</span>
          <span className="text-sm text-muted-foreground font-bold">Câu {currentQ + 1}/{vocabWords!.length}</span>
          <Button size="sm" variant="ghost" onClick={() => setView("days")}><XIcon className="w-5 h-5"/></Button>
        </div>
        <Progress value={((currentQ + 1) / vocabWords!.length) * 100} className="h-1" />

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6 text-center">
            <div className="flex justify-center gap-3">
              <Button size="sm" variant="outline" className="rounded-full"><Volume2 className="w-4 h-4 mr-1" /> Phát âm</Button>
            </div>
            <h2 className="text-4xl font-bold text-foreground">{word.word}</h2>
            <p className="text-muted-foreground font-mono">{word.phonetic}</p>
            {word.example_sentence && <p className="text-sm text-muted-foreground italic">"{word.example_sentence}"</p>}
            
            <div className="w-12 h-1 bg-primary/20 mx-auto rounded-full my-6"></div>
            
            <p className="text-sm font-medium text-foreground mb-4">Chọn nghĩa Tiếng Việt chính xác nhất:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
              {options.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => !showResult && handleAnswer(opt!)}
                  disabled={showResult}
                  className={cn(
                    "p-4 rounded-xl border-2 text-sm font-medium transition-all text-left flex items-center gap-3",
                    showResult && opt === word.definition_vi ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-sm" :
                    showResult && opt === selectedAnswer && opt !== word.definition_vi ? "border-destructive bg-destructive/10 text-destructive" :
                    !showResult ? "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/30 hover:-translate-y-0.5" : "border-border bg-card text-foreground opacity-50"
                  )}
                >
                  <span className="font-bold flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{String.fromCharCode(65 + i)}</span> 
                  {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <Button onClick={nextQuestion} size="lg" className="w-full md:w-auto px-12 animate-in slide-in-from-bottom-2">
                {currentQ >= vocabWords!.length - 1 ? "Xem kết quả cuối cùng" : "Tiếp tục câu sau →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full">
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          <h2 className="text-lg font-bold text-foreground mb-4 px-1">📚 Kho từ vựng TOEIC</h2>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(cat.id); setView("days"); }}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group",
                selectedCat === cat.id && view === "days" ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/30"
              )}
            >
              <p className={cn("text-sm font-bold", selectedCat === cat.id && view === "days" ? "text-primary" : "text-foreground group-hover:text-primary")}>{cat.title}</p>
              {selectedCat === cat.id && view === "days" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
            </button>
          ))}
        </div>

        {view === "days" && quizzes && (
          <div className="flex-1 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-foreground mb-6 px-1 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-primary" />
              {categories?.find(c => c.id === selectedCat)?.title}
            </h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {quizzes.map((day) => (
                <div key={day.id} className="bg-card rounded-2xl border p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-foreground text-base mb-1">{day.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 font-medium bg-muted/50 w-fit px-2 py-0.5 rounded-full">{day.total_questions} từ vựng</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="w-full font-bold border-primary focus:bg-primary focus:text-white hover:bg-primary hover:text-white transition-colors" onClick={() => startLearning(day.id, "flashcard")}>
                      🗂️ Flashcard
                    </Button>
                    <Button size="sm" className="w-full font-bold" onClick={() => startLearning(day.id, "quiz")}>
                      📝 Bài tập
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {quizzes.length === 0 && (
               <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
                  Chuyên mục này chưa có từ vựng nào.
               </div>
            )}
          </div>
        )}

        {view === "categories" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card/50 rounded-2xl border border-dashed border-border/50">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
               <Undo2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Chưa chọn chuyên mục</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Vui lòng bấm chọn một phần từ vựng ở cột bên trái để bắt đầu học Flashcard hoặc làm bài tập.</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
