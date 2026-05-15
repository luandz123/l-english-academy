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
        <div className="max-w-md mx-auto mt-12 card-duo p-10 text-center space-y-6 bg-white border-2">
          <h1 className="text-3xl font-black text-foreground">🎉 Hoàn thành!</h1>
          <div className="bg-muted/30 p-6 rounded-2xl border-2">
             <p className="text-xl font-bold text-foreground">Điểm: <span className="text-[var(--duo-correct)] font-black">{correctCount}/{vocabWords.length}</span> ({pct}%)</p>
          </div>
          <p className="text-5xl tracking-widest drop-shadow-sm">{"⭐".repeat(stars)}</p>
          <div className="flex flex-col gap-3 justify-center mt-6">
            <Button className="btn-3d btn-3d-blue text-lg py-6 h-auto" onClick={() => startLearning(selectedQuiz!, "flashcard")}>Học lại Flashcard</Button>
            <Button className="btn-3d bg-white text-muted-foreground border-gray-200 py-6 h-auto text-lg hover:bg-gray-50 hover:text-foreground" onClick={() => setView("days")}>Trở về danh sách</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "flashcard" && word) {
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <div className="p-4 border-b-2 bg-white flex items-center justify-between shadow-sm">
          <span className="text-base font-extrabold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[var(--duo-blue)]" /> Flashcards: {quizzes?.find(q => q.id === selectedQuiz)?.title}
          </span>
          <div className="text-sm font-black bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] px-4 py-1.5 rounded-full border-2 border-[var(--duo-blue)]/20">Câu {currentQ + 1}/{vocabWords!.length}</div>
          <Button size="icon" variant="ghost" className="hover:bg-muted/50 rounded-full" onClick={() => setView("days")}><XIcon className="w-6 h-6 text-muted-foreground"/></Button>
        </div>
        <div className="w-full bg-border h-3">
          <div className="h-full bg-[var(--duo-correct)] transition-all duration-500 ease-out rounded-r-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div 
            className="w-full max-w-sm aspect-[3/4] card-duo bg-white border-4 border-border shadow-[0_8px_0_var(--border)] cursor-pointer flex flex-col items-center justify-center p-8 text-center transition-all hover:-translate-y-1 hover:shadow-[0_12px_0_var(--border)] relative overflow-hidden group select-none active:translate-y-2 active:shadow-none" 
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {!isFlipped ? (
               <>
               <div className="absolute top-5 right-5 p-3 bg-muted/50 rounded-full hover:bg-[var(--duo-blue)] hover:text-white transition-colors border-2 border-transparent hover:border-[var(--duo-blue)]" onClick={(e) => { e.stopPropagation(); }}>
                  <Volume2 className="w-6 h-6" />
               </div>
               <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 drop-shadow-sm">{word.word}</h2>
               <div className="mt-12 px-6 py-2 bg-muted/30 border-2 rounded-full text-sm font-bold text-muted-foreground animate-pulse">Chạm để lật thẻ</div>
               </>
            ) : (
               <div className="flex flex-col items-center justify-center w-full h-full animate-in fade-in zoom-in-95 duration-300">
                 <h2 className="text-3xl font-black text-[var(--duo-blue)] mb-3">{word.word}</h2>
                 <p className="text-xl text-muted-foreground mb-6 font-mono font-bold bg-muted/50 border-2 px-4 py-1.5 rounded-xl">{word.phonetic}</p>
                 <div className="w-16 h-1.5 rounded-full bg-border my-2"></div>
                 <p className="text-2xl font-extrabold text-foreground mb-6 mt-4">{word.definition_vi}</p>
                 {word.example_sentence && (
                   <div className="bg-[var(--duo-blue)]/5 p-5 rounded-2xl border-2 border-dashed border-[var(--duo-blue)]/30 w-full mt-auto">
                      <p className="text-base font-bold text-foreground italic leading-relaxed">"{word.example_sentence}"</p>
                   </div>
                 )}
               </div>
            )}
          </div>
          
          <div className="flex gap-4 w-full max-w-sm mt-10">
             <Button className="btn-3d bg-white flex-1 h-16 text-lg border-2 border-[var(--duo-red)]/30 text-[var(--duo-red)] hover:bg-[var(--duo-red)]/5 group font-extrabold" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); nextQuestion(); }}>
                <XIcon className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" /> Chưa thuộc
             </Button>
             <Button className="btn-3d btn-3d-green flex-1 h-16 text-lg group font-extrabold" onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setCorrectCount(prev=>prev+1); nextQuestion(); }}>
                <Check className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" /> Đã thuộc
             </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "quiz" && word) {
    const options = effectiveOptions;
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <div className="p-4 border-b-2 bg-white flex items-center justify-between">
          <span className="text-base font-extrabold text-foreground">{quizzes?.find(q => q.id === selectedQuiz)?.title}</span>
          <span className="text-sm text-muted-foreground font-black">Câu {currentQ + 1}/{vocabWords!.length}</span>
          <Button size="icon" variant="ghost" className="hover:bg-muted/50 rounded-full" onClick={() => setView("days")}><XIcon className="w-6 h-6 text-muted-foreground"/></Button>
        </div>
        <div className="w-full bg-border h-3">
          <div className="h-full bg-[var(--duo-blue)] transition-all duration-500 ease-out rounded-r-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full space-y-8 text-center bg-white card-duo p-10 border-2">
            <div className="flex justify-center gap-3">
              <Button size="sm" className="btn-3d bg-white text-[var(--duo-blue)] border-[var(--duo-blue)]/30 font-bold hover:bg-[var(--duo-blue)]/5 rounded-xl h-10 px-4"><Volume2 className="w-5 h-5 mr-2" /> Phát âm</Button>
            </div>
            <div>
               <h2 className="text-5xl font-black text-foreground drop-shadow-sm">{word.word}</h2>
               <p className="text-muted-foreground font-mono font-bold mt-3 text-lg bg-muted/30 px-4 py-1 inline-block rounded-xl border-2">{word.phonetic}</p>
            </div>
            {word.example_sentence && <p className="text-base font-bold text-foreground italic bg-[var(--duo-blue)]/5 p-4 rounded-xl border-2 border-[var(--duo-blue)]/20">"{word.example_sentence}"</p>}
            
            <div className="w-16 h-1.5 bg-border mx-auto rounded-full my-8"></div>
            
            <p className="text-base font-extrabold text-foreground mb-6 text-left">Chọn nghĩa Tiếng Việt chính xác nhất:</p>
            <div className="grid grid-cols-1 gap-4 pb-4">
              {options.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => !showResult && handleAnswer(opt!)}
                  disabled={showResult}
                  className={cn(
                    "p-5 rounded-2xl border-2 text-lg font-bold transition-all text-left flex items-center gap-4",
                    showResult && opt === word.definition_vi ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 text-[var(--duo-correct)] shadow-[0_4px_0_var(--duo-correct)] -translate-y-1" :
                    showResult && opt === selectedAnswer && opt !== word.definition_vi ? "border-[var(--duo-red)] bg-[var(--duo-red)]/10 text-[var(--duo-red)] shadow-[0_4px_0_var(--duo-red)] -translate-y-1" :
                    !showResult ? "border-border bg-white text-foreground hover:border-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/5 hover:shadow-[0_4px_0_var(--duo-blue)] hover:-translate-y-1 shadow-[0_4px_0_var(--border)] active:translate-y-0 active:shadow-none" : "border-border bg-white text-foreground opacity-50 shadow-[0_4px_0_var(--border)]"
                  )}
                >
                  <span className="font-black flex-shrink-0 w-8 h-8 rounded-xl border-2 border-current bg-transparent flex items-center justify-center text-sm">{String.fromCharCode(65 + i)}</span> 
                  {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <Button onClick={nextQuestion} size="lg" className="w-full btn-3d btn-3d-green h-16 text-xl animate-in slide-in-from-bottom-2">
                {currentQ >= vocabWords!.length - 1 ? "Xem kết quả cuối cùng" : "Tiếp tục câu sau"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto w-full">
        <div className="w-full lg:w-72 shrink-0 space-y-3">
          <h2 className="text-xl font-extrabold text-foreground mb-6 px-2 flex items-center gap-2">
            <Library className="w-6 h-6 text-[var(--duo-blue)]" /> 
            Kho từ vựng TOEIC
          </h2>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCat(cat.id); setView("days"); }}
              className={cn(
                "w-full text-left p-5 rounded-2xl border-2 transition-all relative overflow-hidden group",
                selectedCat === cat.id && view === "days" ? "border-[var(--duo-blue)] bg-[var(--duo-blue)]/10 shadow-[0_4px_0_var(--duo-blue)] -translate-y-1" : "bg-white border-border hover:bg-muted/30 hover:border-border/80 shadow-[0_2px_0_var(--border)]"
              )}
            >
              <p className={cn("text-base font-extrabold", selectedCat === cat.id && view === "days" ? "text-[var(--duo-blue)]" : "text-foreground group-hover:text-foreground/80")}>{cat.title}</p>
            </button>
          ))}
        </div>

        {view === "days" && quizzes && (
          <div className="flex-1 animate-in fade-in duration-300">
            <h2 className="text-2xl font-black text-[var(--duo-blue)] mb-8 px-1 flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-[var(--duo-blue)]" />
              {categories?.find(c => c.id === selectedCat)?.title}
            </h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {quizzes.map((day) => (
                <div key={day.id} className="card-duo p-6 flex flex-col h-full bg-white border-2 hover:-translate-y-1 transition-transform duration-200">
                  <h3 className="font-black text-foreground text-xl mb-2">{day.title}</h3>
                  <p className="text-sm text-foreground font-bold bg-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/20 w-fit px-3 py-1 rounded-xl mb-6">{day.total_questions} từ vựng</p>
                  
                  <div className="grid grid-cols-1 gap-3 mt-auto">
                    <Button className="btn-3d bg-[var(--duo-yellow)] hover:bg-[#E5A800] border-[#E5A800] text-black font-extrabold h-12 text-base" onClick={() => startLearning(day.id, "flashcard")}>
                      🗂️ Lật Flashcard
                    </Button>
                    <Button className="btn-3d btn-3d-blue font-extrabold h-12 text-base" onClick={() => startLearning(day.id, "quiz")}>
                      📝 Làm bài tập
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {quizzes.length === 0 && (
               <div className="text-center py-16 text-muted-foreground card-duo border-dashed bg-white">
                  <p className="font-bold text-lg">Chuyên mục này chưa có từ vựng nào.</p>
               </div>
            )}
          </div>
        )}

        {view === "categories" && (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center card-duo border-dashed bg-muted/10">
            <div className="w-20 h-20 bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] rounded-full flex items-center justify-center mb-6 border-4 border-[var(--duo-blue)]/20">
               <Undo2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-3">Chưa chọn chuyên mục</h3>
            <p className="text-muted-foreground font-bold text-base max-w-sm">Vui lòng bấm chọn một phần từ vựng ở cột bên trái để bắt đầu học Flashcard hoặc làm bài tập.</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
