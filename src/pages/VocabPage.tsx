import StudentLayout from "@/components/StudentLayout";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Volume2,
  Undo2,
  LayoutGrid,
  Check,
  X as XIcon,
  Library,
  RotateCcw,
  BookA,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { listCourses } from "@/lib/api/catalog";
import { listVocabCategories, listVocabQuizzes, listVocabWords } from "@/lib/api/vocab";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/ErrorState";
import { SavePackWordButton } from "@/components/vocabulary/SavePackWordButton";

const VocabPage = () => {
  const { courseId } = useParams();
  const parsedCourseId = courseId ? Number(courseId) : NaN;
  const hasExplicitCourseId = Number.isInteger(parsedCourseId) && parsedCourseId > 0;

  const {
    data: flashcardCourses,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ["flashcard-courses"],
    queryFn: async () => {
      const { data, error } = await listCourses({ active: true, courseType: "flashcard" });
      if (error) throw error;
      return data || [];
    },
    enabled: !hasExplicitCourseId,
  });

  const cid = hasExplicitCourseId ? parsedCourseId : (flashcardCourses?.[0]?.id ?? null);

  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [view, setView] = useState<"categories" | "days" | "quiz" | "flashcard" | "result">("categories");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [imgFailedWordId, setImgFailedWordId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["vocab-categories", cid],
    queryFn: async () => {
      const { data, error } = await listVocabCategories(cid!);
      if (error) throw error;
      return data || [];
    },
    enabled: cid !== null,
  });

  useEffect(() => {
    if (categories && categories.length > 0 && selectedCat === null) {
      setSelectedCat(categories[0].id);
      setView("days");
    }
  }, [categories, selectedCat]);

  const { data: quizzes, isError: isQuizzesError, refetch: refetchQuizzes } = useQuery({
    queryKey: ["vocab-quizzes", selectedCat],
    queryFn: async () => {
      const { data, error } = await listVocabQuizzes(selectedCat!);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedCat !== null,
  });

  const { data: vocabWords, isError: isWordsError, refetch: refetchWords } = useQuery({
    queryKey: ["vocab-words", selectedQuiz],
    queryFn: async () => {
      const { data, error } = await listVocabWords(selectedQuiz!);
      if (error) throw error;
      return data || [];
    },
    enabled: selectedQuiz !== null,
  });

  const playAudio = (text: string, audioUrl?: string | null, lang: "en-US" | "en-GB" = "en-US") => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch((e) => console.error("Audio block", e));
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
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
    if (ans === vocabWords[currentQ].definition_vi) setCorrectCount((prev) => prev + 1);
  };

  const nextQuestion = () => {
    if (!vocabWords) return;
    if (currentQ >= vocabWords.length - 1) {
      setView("result");
    } else {
      setCurrentQ((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const prevQuestion = () => {
    if (currentQ > 0) {
      setCurrentQ((prev) => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const word = vocabWords?.[currentQ];

  const quizOptions = useMemo(() => {
    if (!word) return [];
    const opts = [
      word.definition_vi,
      word.wrong_answer_1,
      word.wrong_answer_2,
      word.wrong_answer_3,
    ].filter((x): x is string => Boolean(x));
    return [...opts].sort(() => Math.random() - 0.5);
  }, [word]);

  const isLoading = (!hasExplicitCourseId && isCoursesLoading) || isCategoriesLoading;

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </StudentLayout>
    );
  }

  if (!hasExplicitCourseId && isCoursesError) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16">
          <ErrorState onRetry={() => refetchCourses()} />
        </div>
      </StudentLayout>
    );
  }

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
    const pct = Math.round((correctCount / Math.max(1, vocabWords.length)) * 100);
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
              <span className="text-emerald-600">{correctCount}</span> / {vocabWords.length} từ{" "}
              <span className="text-sm font-bold text-muted-foreground">({pct}%)</span>
            </p>
          </div>
          <div className="flex flex-col gap-2.5 justify-center pt-2">
            <button
              className="btn-3d btn-3d-primary min-h-[44px] py-2.5 text-sm"
              onClick={() => startLearning(selectedQuiz!, "flashcard")}
            >
              <RotateCcw className="w-4 h-4 mr-1.5 inline" /> Học lại Flashcard
            </button>
            <button
              className="btn-3d btn-3d-white min-h-[44px] py-2 text-xs"
              onClick={() => setView("days")}
            >
              Trở về danh sách bài học
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (view === "flashcard" && word) {
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    const noteParts = word.definition_en
      ? word.definition_en.split(" | ").filter(Boolean)
      : [];
    const hasUsAudio = Boolean(word.audio_male_url);
    const hasUkAudio = Boolean(word.audio_female_url && word.audio_female_url !== word.audio_male_url);

    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col relative">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        {/* Top Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl flex items-center justify-between gap-2 shadow-sm relative z-10">
          <span className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
            <LayoutGrid className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Flashcards: {quizzes?.find((q) => q.id === selectedQuiz)?.title}</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge-duo badge-blue font-bold">
              Từ {currentQ + 1}/{vocabWords!.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white min-w-[40px] min-h-[40px]"
              onClick={() => setView("days")}
              aria-label="Đóng"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1 relative z-10">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Flashcard Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full relative z-10">
          <div className="w-full rounded-3xl border border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl p-6 sm:p-8 shadow-soft-lg flex flex-col items-center text-center space-y-5">
            {word.image_url && imgFailedWordId !== word.id && (
              <div className="w-full max-w-[240px] aspect-[4/3] rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-900/60 shadow-soft-sm">
                <img
                  src={word.image_url}
                  alt={word.word}
                  loading="lazy"
                  onError={() => setImgFailedWordId(word.id)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="w-full space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-black text-white break-words">{word.word}</h2>
              {word.phonetic && (
                <span className="inline-block text-xs sm:text-sm font-semibold text-cyan-300 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/25 shadow-soft-xs">
                  {word.phonetic}
                </span>
              )}
            </div>

            {/* Pronunciation & Save Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasUsAudio || !word.audio_female_url ? (
                <button
                  type="button"
                  className="min-h-[40px] px-4 rounded-xl bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 transition-all duration-120 border border-cyan-500/30 shadow-soft-xs active:scale-95 inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  onClick={() => playAudio(word.word, word.audio_male_url, "en-US")}
                  title="Phát âm US"
                >
                  <Volume2 className="w-4 h-4" /> Phát âm US
                </button>
              ) : null}
              {(hasUkAudio || (!hasUsAudio && word.audio_female_url)) && (
                <button
                  type="button"
                  className="min-h-[40px] px-4 rounded-xl bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 transition-all duration-120 border border-blue-500/30 shadow-soft-xs active:scale-95 inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  onClick={() => playAudio(word.word, word.audio_female_url, "en-GB")}
                  title="Phát âm UK"
                >
                  <Volume2 className="w-4 h-4" /> Phát âm UK
                </button>
              )}
              <SavePackWordButton
                packWordId={word.id}
                word={word.word}
                className="border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
              />
            </div>

            <div className="w-12 h-0.5 bg-slate-800 mx-auto" />

            <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">{word.definition_vi}</p>

            {word.example_sentence && (
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 w-full text-left space-y-1 shadow-soft-xs">
                <p className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider">Ví dụ ngữ cảnh:</p>
                <p className="text-xs sm:text-sm font-medium text-slate-200 italic leading-relaxed">
                  "{word.example_sentence}"
                </p>
              </div>
            )}

            {noteParts.length > 0 && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80 w-full text-left space-y-1.5">
                <p className="text-[11px] font-bold uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Mở rộng & Mẹo TOEIC
                </p>
                <div className="space-y-1">
                  {noteParts.map((part, i) => (
                    <p key={i} className="text-xs text-slate-300 leading-relaxed">
                      {part}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 w-full mt-5">
            <button
              type="button"
              disabled={currentQ === 0}
              onClick={prevQuestion}
              className="min-h-[44px] px-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 disabled:opacity-30 inline-flex items-center justify-center"
              aria-label="Từ trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-white flex-1 min-h-[44px] py-3 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 rounded-xl font-bold transition-all duration-120 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                nextQuestion();
              }}
            >
              <XIcon className="w-4 h-4 mr-1 inline" /> Chưa thuộc
            </button>
            <button
              type="button"
              className="btn-3d btn-3d-primary flex-1 min-h-[44px] py-3 text-xs rounded-xl font-bold transition-all duration-120 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setCorrectCount((prev) => prev + 1);
                nextQuestion();
              }}
            >
              <Check className="w-4 h-4 mr-1 inline" /> Đã thuộc
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              className="min-h-[44px] px-3 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 inline-flex items-center justify-center"
              aria-label="Từ tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "quiz" && word) {
    const options = quizOptions;
    const progress = ((currentQ + 1) / vocabWords!.length) * 100;
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col relative">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        <div className="h-16 px-4 sm:px-6 border-b border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl flex items-center justify-between gap-2 shadow-sm relative z-10">
          <span className="text-sm font-bold text-foreground truncate">
            {quizzes?.find((q) => q.id === selectedQuiz)?.title}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge-duo badge-blue">
              Câu {currentQ + 1}/{vocabWords!.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full hover:bg-slate-800 text-slate-400 hover:text-white min-w-[40px] min-h-[40px]"
              onClick={() => setView("days")}
              aria-label="Đóng"
            >
              <XIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-1 relative z-10">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
          <div className="max-w-lg w-full space-y-5 text-center rounded-2xl border border-cyan-500/20 bg-[#070e1c]/90 backdrop-blur-xl p-6 md:p-8 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white">{word.word}</h2>
              {word.phonetic && (
                <p className="text-xs text-cyan-300 font-semibold bg-cyan-500/10 px-3 py-1 inline-block rounded-full border border-cyan-500/25">
                  {word.phonetic}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => playAudio(word.word, word.audio_male_url, "en-US")}
                className="btn-3d btn-3d-white min-h-[40px] py-1.5 px-4 text-xs inline-flex items-center gap-1.5 text-primary"
              >
                <Volume2 className="w-4 h-4" /> Phát âm US
              </button>
              {word.audio_female_url && word.audio_female_url !== word.audio_male_url && (
                <button
                  type="button"
                  onClick={() => playAudio(word.word, word.audio_female_url, "en-GB")}
                  className="btn-3d btn-3d-white min-h-[40px] py-1.5 px-4 text-xs inline-flex items-center gap-1.5 text-blue-500"
                >
                  <Volume2 className="w-4 h-4" /> Phát âm UK
                </button>
              )}
            </div>

            {word.example_sentence && (
              <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                "{word.example_sentence}"
              </p>
            )}

            <p className="text-xs font-bold text-slate-200 text-left pt-1">Chọn nghĩa Tiếng Việt đúng nhất:</p>
            <div className="grid grid-cols-1 gap-2.5">
              {options.map((opt, i) => (
                <button
                  key={`${opt}-${i}`}
                  onClick={() => !showResult && handleAnswer(opt)}
                  disabled={showResult}
                  className={cn(
                    "min-h-[48px] p-3.5 sm:p-4 rounded-xl border text-sm font-semibold transition-all duration-120 active:scale-95 text-left flex items-center gap-3 cursor-pointer shadow-soft-xs",
                    showResult && opt === word.definition_vi
                      ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold shadow-soft-sm"
                      : showResult && opt === selectedAnswer && opt !== word.definition_vi
                        ? "border-rose-500 bg-rose-950/60 text-rose-300 font-bold shadow-soft-sm"
                        : !showResult
                          ? "border-slate-800 bg-slate-900/60 text-slate-100 hover:border-cyan-500/50 hover:bg-slate-800/80"
                          : "border-slate-800/60 bg-slate-900/40 text-slate-400 opacity-60",
                  )}
                >
                  <span className="font-bold w-6 h-6 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center text-xs shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>

            {showResult && (
              <button
                onClick={nextQuestion}
                className="btn-3d btn-3d-primary w-full min-h-[44px] py-3 text-sm font-bold rounded-xl transition-all duration-120 active:scale-95 shadow-soft-sm"
              >
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
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
              <Library className="w-7 h-7 text-cyan-400" /> Bộ Flashcard &amp; Bài tập Từ vựng
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Học từ vựng theo bộ chuyên đề &amp; đề thi kèm phát âm US/UK, ví dụ ngữ cảnh và trắc nghiệm.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/vocabulary"
              className="min-h-[44px] px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-cyan-500/10"
            >
              <BookA className="w-4 h-4" /> Sổ từ vựng
            </Link>
            <Link
              to="/vocabulary/browse"
              className="min-h-[44px] px-4 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold inline-flex items-center gap-1.5 hover:bg-slate-800"
            >
              <Layers className="w-4 h-4" /> Từ theo Part &amp; cấp độ
            </Link>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Categories Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-2">
            <div className="px-1 mb-2">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Chủ đề Từ vựng</h2>
            </div>
            <div className="space-y-1.5">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCat(cat.id);
                    setView("days");
                  }}
                  className={cn(
                    "w-full min-h-[44px] text-left p-3.5 rounded-xl border text-sm font-semibold transition-all duration-120 active:scale-95 cursor-pointer",
                    selectedCat === cat.id && view === "days"
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-200 shadow-soft-sm font-bold"
                      : "bg-[#070e1c]/90 border-slate-800 text-slate-200 hover:bg-slate-800/80 shadow-soft-xs",
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
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-cyan-400" />
                  {categories?.find((c) => c.id === selectedCat)?.title}
                </h2>
                <span className="text-xs text-slate-400 font-semibold">{quizzes.length} bài học</span>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {quizzes.map((day) => (
                  <div
                    key={day.id}
                    className="rounded-2xl border border-slate-800 bg-[#070e1c]/90 p-5 flex flex-col justify-between shadow-soft-sm hover:border-cyan-500/40 transition-all duration-150"
                  >
                    <div className="space-y-2 mb-4">
                      <h3 className="font-bold text-white text-base leading-snug">{day.title}</h3>
                      <span className="badge-duo badge-blue">{day.total_questions || 0} từ vựng</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        className="btn-3d btn-3d-white min-h-[40px] text-xs py-2 text-center rounded-xl font-bold transition-all duration-120 active:scale-95"
                        onClick={() => startLearning(day.id, "flashcard")}
                      >
                        Flashcard
                      </button>
                      <button
                        className="btn-3d btn-3d-primary min-h-[40px] text-xs py-2 text-center rounded-xl font-bold transition-all duration-120 active:scale-95 shadow-soft-xs"
                        onClick={() => startLearning(day.id, "quiz")}
                      >
                        Làm bài tập
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {quizzes.length === 0 && (
                <div className="text-center py-12 rounded-xl border border-dashed border-slate-800 bg-[#070e1c]/60">
                  <p className="text-xs text-slate-400">Chuyên mục này chưa có từ vựng nào.</p>
                </div>
              )}
            </div>
          )}

          {view === "categories" && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-[#070e1c]/60">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <Undo2 className="w-6 h-6" />
              </div>
              {categories && categories.length > 0 ? (
                <>
                  <h3 className="text-base font-bold text-white mb-1">Chưa chọn chủ đề</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Chọn một chủ đề từ vựng trong danh sách để bắt đầu luyện Flashcard và làm bài tập trắc nghiệm.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-white mb-1">Khóa này chưa có chủ đề từ vựng</h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Nội dung đang được cập nhật. Bạn có thể ôn từ theo Part hoặc chơi game từ vựng trong lúc chờ.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Link
                      to="/vocabulary/browse"
                      className="inline-flex items-center h-10 px-4 rounded-xl border border-cyan-500/40 text-cyan-300 text-sm font-bold hover:bg-cyan-500/10"
                    >
                      Từ theo Part &amp; cấp độ
                    </Link>
                    <Link
                      to="/games"
                      className="inline-flex items-center h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90"
                    >
                      Chơi game từ vựng
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default VocabPage;
