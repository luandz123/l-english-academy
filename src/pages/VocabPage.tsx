import StudentLayout from "@/components/StudentLayout";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2, Undo2, LayoutGrid, Check, X as XIcon, Library, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/ErrorState";

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

  const { data: categories, isLoading, isError: isCategoriesError, refetch: refetchCategories } = useQuery({
    queryKey: ["vocab-categories", cid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocab_categories")
        .select("*")
        .eq("course_id", cid)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: quizzes, isError: isQuizzesError, refetch: refetchQuizzes } = useQuery({
    queryKey: ["vocab-quizzes", selectedCat],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocab_quizzes")
        .select("*")
        .eq("category_id", selectedCat!)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCat !== null,
  });

  const { data: vocabWords, isError: isWordsError, refetch: refetchWords } = useQuery({
    queryKey: ["vocab-words", selectedQuiz],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vocab_questions")
        .select("*")
        .eq("vocab_quiz_id", selectedQuiz!)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: selectedQuiz !== null,
  });

  const playAudio = (text: string, audioUrl?: string | null) => {
    if (audioUrl) {
       new Audio(audioUrl).play().catch(e => console.error("Audio block", e));
    } else {
       const utterance = new SpeechSynthesisUtterance(text);
       utterance.lang = "en-US";
       window.speechSynthesis.speak(utterance);
    }
  };

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
    }
  };

  const word = vocabWords?.[currentQ];
  if (word && view === "quiz" && !showResult && shuffledOptions.length === 0) {
    const opts = shuffleOptions(word);
    if (opts.length > 0) setShuffledOptions(opts);
  }

  const effectiveOptions = showResult ? shuffledOptions : (word ? shuffleOptions(word) : []);

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-2xl" /></StudentLayout>;

  if (isCategoriesError) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState onRetry={() => refetchCategories()} />
        </div>
      </StudentLayout>
    );
  }

  if ((view === "flashcard" || view === "quiz") && isWordsError) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState onRetry={() => refetchWords()} />
        </div>
      </StudentLayout>
    );
  }

  if (view === "result" && vocabWords) {
    const pct = Math.round((correctCount / vocabWords.length) * 100);
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-10 rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 flex items-center justify-center mx-auto text-2xl font-bold">
            🎉
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Hoàn thành bài tập!</h1>
            <p className="text-xs text-muted-foreground">Bạn đã ôn tập xong toàn bộ danh sách từ vựng này.</p>
          </div>
          <div className="bg-muted/40 p-4 rounded-xl border border-border">
            <p className="text-sm font-semibold text-muted-foreground">Kết quả đạt được:</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              <span className="text-emerald-600">{correctCount}</span> / {vocabWords.length} từ <span className="text-sm font-bold text-muted-foreground">({pct}%)</span>
            </p>
          </div>
          <div className="flex flex-col gap-2.5 justify-center pt-2">
            <button className="btn-3d btn-3d-primary py-2.5 text-sm" onClick={() => startLearning(selectedQuiz!, "flashcard")}>
              <RotateCcw className="w-4 h-4 mr-1.5 inline" /> Học lại Flashcard
            </button>
            <button className="btn-3d btn-3d-white py-2 text-xs" onClick={() => setView("days")}>
              Trở về danh sách bài học
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "flashcard" && word) {
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col relative">
        {/* Ambient background glows matching homepage */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        {/* Top Header */}
        <div className="h-16 px-6 border-b border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl flex items-center justify-between shadow-sm relative z-10">
          <span className="text-sm font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-cyan-400" /> Flashcards: {quizzes?.find(q => q.id === selectedQuiz)?.title}
          </span>
          <span className="badge-duo badge-blue font-bold">
            Từ {currentQ + 1}/{vocabWords!.length}
          </span>
          <Button size="icon" variant="ghost" className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white" onClick={() => setView("days")}>
            <XIcon className="w-5 h-5"/>
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1 relative z-10">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Flashcard Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative z-10">
          <div className="w-full rounded-3xl border border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl p-8 shadow-soft-lg flex flex-col items-center text-center space-y-6">
            <div className="w-full space-y-1">
              <h2 className="text-4xl font-black text-foreground">{word.word}</h2>
              {word.phonetic && (
                <span className="inline-block text-sm font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20 mt-2 shadow-soft-xs">
                  {word.phonetic}
                </span>
              )}
            </div>

            <button 
              className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all duration-120 border border-primary/20 shadow-soft-sm active:scale-95 cursor-pointer"
              onClick={() => playAudio(word.word, word.audio_male_url)}
              title="Phát âm"
            >
              <Volume2 className="w-6 h-6" />
            </button>

            <div className="w-12 h-0.5 bg-border/60 mx-auto"></div>
            
            <p className="text-xl font-bold text-foreground leading-relaxed">{word.definition_vi}</p>

            {word.example_sentence && (
              <div className="bg-muted/40 p-4 rounded-2xl border border-border/70 w-full text-left space-y-1 shadow-soft-xs">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ví dụ:</p>
                <p className="text-xs font-medium text-foreground italic leading-relaxed">"{word.example_sentence}"</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 w-full mt-6">
            <button
              className="btn-3d btn-3d-white flex-1 py-3 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 rounded-xl font-bold transition-all duration-120 active:scale-95"
              onClick={(e) => { e.stopPropagation(); nextQuestion(); }}
            >
              <XIcon className="w-4 h-4 mr-1.5 inline" /> Chưa thuộc
            </button>
            <button
              className="btn-3d btn-3d-primary flex-1 py-3 text-xs rounded-xl font-bold transition-all duration-120 active:scale-95"
              onClick={(e) => { e.stopPropagation(); setCorrectCount(prev=>prev+1); nextQuestion(); }}
            >
              <Check className="w-4 h-4 mr-1.5 inline" /> Đã thuộc
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "quiz" && word) {
    const options = effectiveOptions;
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col relative">
        {/* Ambient background glows matching homepage */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        <div className="h-16 px-6 border-b border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl flex items-center justify-between shadow-sm relative z-10">
          <span className="text-sm font-bold text-foreground">{quizzes?.find(q => q.id === selectedQuiz)?.title}</span>
          <span className="badge-duo badge-blue">Câu {currentQ + 1}/{vocabWords!.length}</span>
          <Button size="icon" variant="ghost" className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white" onClick={() => setView("days")}>
            <XIcon className="w-5 h-5"/>
          </Button>
        </div>
        <div className="w-full bg-slate-800 h-1 relative z-10">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="max-w-lg w-full space-y-6 text-center rounded-2xl border border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl p-6 md:p-8 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-foreground">{word.word}</h2>
              {word.phonetic && (
                <p className="text-xs text-muted-foreground font-semibold bg-muted/60 px-3 py-1 inline-block rounded-full border border-border">
                  {word.phonetic}
                </p>
              )}
            </div>

            <button
              onClick={() => playAudio(word.word, word.audio_male_url)}
              className="btn-3d btn-3d-white py-1.5 px-4 text-xs inline-flex items-center gap-1.5 text-primary"
            >
              <Volume2 className="w-4 h-4" /> Phát âm
            </button>

            {word.example_sentence && (
              <p className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-border">
                "{word.example_sentence}"
              </p>
            )}
            
            <p className="text-xs font-bold text-foreground text-left pt-2">Chọn nghĩa Tiếng Việt đúng nhất:</p>
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => !showResult && handleAnswer(opt!)}
                  disabled={showResult}
                  className={cn(
                    "p-4 rounded-xl border text-sm font-semibold transition-all duration-120 active:scale-95 text-left flex items-center gap-3 cursor-pointer shadow-soft-xs",
                    showResult && opt === word.definition_vi
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold shadow-soft-sm"
                      : showResult && opt === selectedAnswer && opt !== word.definition_vi
                      ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 font-bold shadow-soft-sm"
                      : !showResult
                      ? "border-border/70 bg-card text-foreground hover:border-primary/50 hover:bg-muted/40"
                      : "border-border/60 bg-card text-foreground opacity-50"
                  )}
                >
                  <span className="font-bold w-6 h-6 rounded-lg bg-muted text-foreground flex items-center justify-center text-xs shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span> 
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>

            {showResult && (
              <button onClick={nextQuestion} className="btn-3d btn-3d-primary w-full py-3 text-sm font-bold rounded-xl transition-all duration-120 active:scale-95 shadow-soft-sm">
                {currentQ >= vocabWords!.length - 1 ? "Xem kết quả 🎉" : "Câu tiếp theo →"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full pb-16">
        {/* Categories Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <div className="px-1 mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Library className="w-5 h-5 text-primary" /> Chủ đề Từ vựng
            </h2>
            <p className="text-xs text-muted-foreground">Chọn danh mục để luyện tập</p>
          </div>
          <div className="space-y-1.5">
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat.id); setView("days"); }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all duration-120 active:scale-95 cursor-pointer",
                  selectedCat === cat.id && view === "days"
                    ? "border-primary bg-primary text-primary-foreground shadow-soft-sm font-bold"
                    : "bg-card border-border/70 text-foreground hover:bg-muted shadow-soft-xs"
                )}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        {/* Days / Quiz list */}
        {view === "days" && isQuizzesError && (
          <div className="flex-1">
            <ErrorState onRetry={() => refetchQuizzes()} />
          </div>
        )}
        {view === "days" && !isQuizzesError && quizzes && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                {categories?.find(c => c.id === selectedCat)?.title}
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">{quizzes.length} bài học</span>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {quizzes.map((day) => (
                <div key={day.id} className="rounded-2xl border border-border/70 bg-card p-5 flex flex-col justify-between shadow-soft-sm hover:shadow-soft-md transition-all duration-150">
                  <div className="space-y-2 mb-4">
                    <h3 className="font-bold text-foreground text-base leading-snug">{day.title}</h3>
                    <span className="badge-duo badge-blue">{day.total_questions || 0} từ vựng</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
                    <button
                      className="btn-3d btn-3d-white text-xs py-2 text-center rounded-xl font-bold transition-all duration-120 active:scale-95"
                      onClick={() => startLearning(day.id, "flashcard")}
                    >
                      Flashcard
                    </button>
                    <button
                      className="btn-3d btn-3d-primary text-xs py-2 text-center rounded-xl font-bold transition-all duration-120 active:scale-95 shadow-soft-xs"
                      onClick={() => startLearning(day.id, "quiz")}
                    >
                      Làm bài tập
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {quizzes.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card">
                <p className="text-xs text-muted-foreground">Chuyên mục này chưa có từ vựng nào.</p>
              </div>
            )}
          </div>
        )}

        {view === "categories" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Undo2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Chưa chọn chủ đề</h3>
            <p className="text-xs text-muted-foreground max-w-sm">Chọn một chủ đề từ vựng ở cột bên trái để bắt đầu luyện Flashcard và làm bài tập trắc nghiệm.</p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
