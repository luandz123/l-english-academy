import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useRef } from "react";
import { Volume2, X as XIcon, Mic, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/useSound";
import { useGamification } from "@/hooks/useGamification";
import { MysteryChestModal } from "@/components/MysteryChestModal";
import EmptyState from "@/components/EmptyState";

export default function VocabLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const filteredQuestionIds = (location.state?.questionIds || (window.history.state?.usr as any)?.questionIds) as number[] | undefined;
  
  const [round, setRound] = useState<1 | 2 | 3>(1);
  // Persist index for each round separately
  const [indices, setIndices] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [dictationInput, setDictationInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [wrongChars, setWrongChars] = useState<{ char: string, correct: boolean }[] | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [quizId, setQuizId] = useState<number | null>(null);
  const { playSound } = useSound();
  const { recordVocabProgress, addXp } = useGamification();

  const currentIdx = indices[round];

  const { data: words, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-lesson-student", lessonId, filteredQuestionIds],
    queryFn: async () => {
      if (!lessonId) return [];

      let { data: quiz } = await supabase
        .from("vocab_quizzes")
        .select("id")
        .eq("lesson_id", Number(lessonId))
        .maybeSingle();

      if (!quiz) {
        const { data: vqById } = await supabase
          .from("vocab_quizzes")
          .select("id")
          .eq("id", Number(lessonId))
          .maybeSingle();
        quiz = vqById;
      }

      if (!quiz) {
        const { data: lesson } = await supabase
          .from("lessons")
          .select("id")
          .eq("quiz_id", Number(lessonId))
          .maybeSingle();
        if (lesson) {
          const { data: vqByLesson } = await supabase
            .from("vocab_quizzes")
            .select("id")
            .eq("lesson_id", lesson.id)
            .maybeSingle();
          quiz = vqByLesson;
        }
      }

      if (!quiz) {
        if (filteredQuestionIds && filteredQuestionIds.length > 0) {
          const { data: vocabByQuestions } = await supabase
            .from("vocab_questions")
            .select("*")
            .in("question_id", filteredQuestionIds)
            .order("display_order");
          return vocabByQuestions || [];
        }
        return [];
      }

      let query = supabase.from("vocab_questions").select("*").eq("vocab_quiz_id", quiz.id);
      if (filteredQuestionIds && filteredQuestionIds.length > 0) {
        query = query.in("question_id", filteredQuestionIds);
      }
      const { data } = await query.order("display_order");
      return data || [];
    }
  });

  const { data: lessonData } = useQuery({
    queryKey: ["vocab-lesson-details", lessonId],
    queryFn: async () => {
      const { data: lesson } = await supabase.from("lessons").select("quiz_id").eq("id", Number(lessonId)).single();
      if (lesson?.quiz_id) setQuizId(lesson.quiz_id);
      return lesson;
    }
  });

  const word = words?.[currentIdx];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (text: string, audioUrl?: string | null) => {
    if (audioUrl) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(e => console.error("Audio block", e));
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-play on word change in Round 2
  useEffect(() => {
    if (round === 2 && word && !showResult) {
      playAudio(word.word, word.audio_male_url);
    }
  }, [round, currentIdx, word, showResult]);

  const updateIdx = (newIdx: number) => {
    setIndices(prev => ({ ...prev, [round]: newIdx }));
  };

  const handleNext = () => {
    setDictationInput("");
    setTranscript("");
    setShowResult(false);
    setIsListening(false);
    setWrongChars(null);

    if (currentIdx < (words?.length || 0) - 1) {
      updateIdx(currentIdx + 1);
    } else {
      if (round < 3) {
        setRound((round + 1) as any);
        toast({ title: `Tuyệt vời! Chuyển sang Vòng ${round + 1}` });
      } else {
        playSound("complete");
        setIsFinished(true);
        recordVocabProgress(words?.length || 5);
        addXp((words?.length || 5) * 10, "Hoàn thành bài học từ vựng!");
        setShowChestModal(true);
      }
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setDictationInput("");
      setTranscript("");
      setShowResult(false);
      setWrongChars(null);
      updateIdx(currentIdx - 1);
    }
  };

  const handleDictationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = dictationInput.trim().toLowerCase();
    const correct = word?.word.toLowerCase() || "";

    if (input === correct) {
      playSound("correct");
      setShowResult(true);
      setWrongChars(null);
      setTimeout(handleNext, 1200);
    } else {
      playSound("incorrect");
      // Highlight wrong characters
      const chars = correct.split("").map((c, i) => ({
        char: c,
        correct: input[i] === c
      }));
      setWrongChars(chars);
      toast({ title: "Chưa chính xác!", variant: "destructive" });
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Trình duyệt không hỗ trợ nhận diện giọng nói", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let hasPassed = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      let currentResult = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentResult = event.results[i][0].transcript;
      }
      
      setTranscript(currentResult);
      
      const normalizedTranscript = currentResult.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
      const targetWord = word?.word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim() || "";

      if (normalizedTranscript.includes(targetWord) && !hasPassed) {
        hasPassed = true;
        playSound("correct");
        setShowResult(true);
        recognition.stop();
        setTimeout(handleNext, 1500);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);

    recognition.start();

    // Safety timeout
    setTimeout(() => {
      if (!hasPassed) {
        recognition.stop();
        setIsListening(false);
      }
    }, 6000);
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-3xl max-w-2xl mx-auto border-2 shadow-sm" /></StudentLayout>;

  if (isError) {
    return (
      <StudentLayout>
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-card rounded-3xl border-2 border-red-200 dark:border-red-900/50 shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-foreground">Không thể tải bài học từ vựng</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Đã xảy ra lỗi khi kết nối hoặc tải dữ liệu từ vựng. Vui lòng thử lại.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => refetch()}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Thử lại
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(courseId ? `/courses/${courseId}/vocab` : "/courses")}
              className="rounded-xl font-bold"
            >
              Quay lại
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!words || words.length === 0) return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState
          title="Bài học này chưa có từ vựng"
          description="Nội dung từ vựng cho bài học này đang được biên soạn. Bạn vui lòng quay lại sau nhé!"
          action={{
            label: "Quay lại danh sách từ vựng",
            onClick: () => navigate(`/courses/${courseId}/vocab`),
          }}
        />
      </div>
    </StudentLayout>
  );

  const progress = ((currentIdx + (round - 1) * words.length) / (words.length * 3)) * 100;

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto flex flex-col min-h-[70vh] gap-6 font-sans">
        {/* Header Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-5 border border-border/70 rounded-2xl shadow-soft-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-muted" onClick={() => navigate(`/courses/${courseId}/vocab`)}>
              <XIcon className="w-6 h-6 text-muted-foreground" />
            </Button>
            <h1 className="font-extrabold text-xl text-foreground">Từ vựng</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {[1, 2, 3].map((r) => (
              <Button 
                key={r}
                className={cn(
                  "font-bold text-sm px-6 h-11 rounded-xl flex-shrink-0 transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer",
                  round === r ? "bg-primary text-primary-foreground shadow-soft-sm" : "border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => { setRound(r as any); setShowResult(false); setWrongChars(null); }}
              >
                {r === 1 ? "1. Học" : r === 2 ? "2. Viết" : "3. Đọc"}
              </Button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3 px-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <span>Tiến độ tổng quát</span>
            <span className="text-primary font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Interaction Card */}
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border/70 rounded-2xl shadow-soft-md p-4 sm:p-8 relative min-h-[400px] sm:min-h-[500px]">
          
          {/* ROUND 1: LEARN */}
          {!isFinished && round === 1 && word && (
            <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-full max-w-sm bg-card rounded-3xl border border-border/70 p-8 sm:p-10 shadow-soft-lg flex flex-col items-center text-center space-y-6">
                <div>
                  <h2 className="text-5xl md:text-6xl font-black text-foreground mb-2 select-none">{word.word}</h2>
                  <p className="text-xl text-primary font-mono font-bold bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-xl inline-block mt-2">
                    {word.phonetic}
                  </p>
                </div>

                <div 
                  className="w-20 h-20 bg-blue-500/10 dark:bg-blue-500/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500/20 transition-all duration-120 border border-blue-500/20 shadow-soft-sm active:scale-95"
                  onClick={() => playAudio(word.word, word.audio_male_url)}
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="h-1 rounded-full w-20 bg-muted/50 mx-auto"></div>

                <div className="space-y-2">
                  <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{word.definition_vi}</p>
                </div>

                {word.example_sentence && (
                  <div className="w-full text-left p-4 rounded-2xl bg-muted/40 border border-border/60 mt-4 shadow-soft-xs">
                    <p className="text-xs font-black uppercase text-muted-foreground mb-1 tracking-widest">Ví dụ:</p>
                    <p className="text-sm sm:text-base font-medium text-foreground italic">"{word.example_sentence}"</p>
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center gap-4 w-full max-w-sm">
                <Button className="btn-3d btn-3d-white rounded-2xl h-12 w-12 p-0 flex items-center justify-center shadow-soft-xs active:scale-95" onClick={handleBack} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </Button>
                <div className="flex-1 text-center font-bold text-muted-foreground text-sm bg-muted/40 py-3 rounded-2xl border border-border/60">
                  {currentIdx + 1} / {words.length}
                </div>
                <Button className="btn-3d btn-3d-primary h-12 px-6 rounded-2xl font-bold text-sm flex items-center gap-2 active:scale-95" onClick={handleNext}>
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ROUND 2: DICTATION */}
          {!isFinished && round === 2 && word && (
            <div className="w-full max-w-sm text-center space-y-12 animate-in fade-in duration-300">
              <div 
                className="w-28 h-28 bg-blue-500/10 dark:bg-blue-500/20 rounded-full mx-auto flex items-center justify-center cursor-pointer hover:bg-blue-500/20 transition-all duration-120 border border-blue-500/20 shadow-soft-md active:scale-95"
                onClick={() => playAudio(word.word, word.audio_male_url)}
              >
                <Volume2 className="w-14 h-14 text-[var(--duo-blue)]" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-3xl sm:text-4xl font-black text-foreground drop-shadow-sm">{word.definition_vi}</h3>
                <p className="text-base font-bold text-muted-foreground bg-muted/50 inline-block px-4 py-1.5 rounded-full border-2">Nghe và viết lại từ vựng này</p>
              </div>

              <div className="space-y-6">
                <form onSubmit={handleDictationSubmit} className="flex gap-3 w-full">
                  <Input 
                    autoFocus
                    placeholder="Nhập từ bạn nghe..." 
                    value={dictationInput}
                    onChange={(e) => setDictationInput(e.target.value)}
                    className="text-center text-xl sm:text-2xl font-black h-16 rounded-2xl border-2 border-border shadow-[0_4px_0_transparent] focus-visible:border-[var(--duo-blue)] focus-visible:shadow-[0_4px_0_var(--duo-blue)] focus-visible:ring-0 transition-all"
                    readOnly={showResult}
                  />
                  <Button type="submit" className="btn-3d btn-3d-blue h-16 w-20 rounded-2xl shrink-0" disabled={showResult || !dictationInput.trim()}>
                    <ArrowRight className="w-8 h-8"/>
                  </Button>
                </form>

                {/* Wrong Character Feedback */}
                {wrongChars && (
                  <div className="flex justify-center gap-1.5 bg-[var(--duo-red)]/5 p-4 rounded-2xl border-2 border-[var(--duo-red)]/30 animate-in slide-in-from-top-2">
                    {wrongChars.map((item, i) => (
                      <span key={i} className={cn(
                        "text-2xl font-mono font-black",
                        item.correct ? "text-[var(--duo-correct)]" : "text-[var(--duo-red)] underline decoration-4 underline-offset-4"
                      )}>
                        {item.char}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
                <Button className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 h-12 px-6 font-bold w-full sm:w-auto" onClick={() => { setDictationInput(word.word); setShowResult(true); setTimeout(handleNext, 1500); }} disabled={showResult}>
                  Xem đáp án
                </Button>
                <Button className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 h-12 px-6 font-bold w-full sm:w-auto" onClick={handleNext}>Bỏ qua</Button>
              </div>

              <div className="flex items-center justify-between pt-8 border-t-2">
                <Button className="btn-3d bg-white h-12 px-5 font-bold" onClick={handleBack} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-5 h-5 mr-1" /> Trước
                </Button>
                <span className="text-sm font-black text-muted-foreground bg-muted/30 px-4 py-1.5 rounded-xl border-2">{currentIdx + 1} / {words.length}</span>
                <Button className="btn-3d btn-3d-blue h-12 px-5 font-bold" onClick={handleNext}>
                  Sau <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>

              {showResult && (
                <div className="absolute inset-0 bg-[#070e1c]/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-300 z-10 border-4 border-[var(--duo-correct)]/30">
                  <div className="w-28 h-28 bg-[var(--duo-correct)]/10 rounded-full flex items-center justify-center border-4 border-[var(--duo-correct)]/30 shadow-[0_4px_0_var(--duo-correct-dark)]/20">
                    <CheckCircle2 className="w-14 h-14 text-[var(--duo-correct)]" />
                  </div>
                  <h2 className="text-5xl font-black text-[var(--duo-correct)] uppercase tracking-wider drop-shadow-sm">{word.word}</h2>
                  <p className="font-extrabold text-2xl text-[var(--duo-correct)]/80">Chính xác!</p>
                </div>
              )}
            </div>
          )}

          {/* ROUND 3: SPEAKING */}
          {!isFinished && round === 3 && word && (
            <div className="w-full max-w-sm text-center space-y-12 flex flex-col items-center animate-in fade-in duration-300">
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-5">
                  <h2 className="text-4xl sm:text-5xl font-black text-foreground drop-shadow-sm">{word.word}</h2>
                  <Button className="btn-3d bg-[var(--duo-blue)]/10 border-2 border-[var(--duo-blue)]/30 rounded-full h-14 w-14 flex items-center justify-center hover:bg-[var(--duo-blue)]/20 shadow-[0_4px_0_rgba(28,176,246,0.3)] active:translate-y-1 active:shadow-none" onClick={() => playAudio(word.word, word.audio_male_url)}>
                    <Volume2 className="w-7 h-7 text-[var(--duo-blue)]" />
                  </Button>
                </div>
                <p className="text-2xl text-muted-foreground font-mono font-bold tracking-widest bg-muted/50 inline-block px-5 py-2 rounded-2xl border-2">{word.phonetic}</p>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                <Button 
                  onClick={startListening} 
                  disabled={isListening || showResult}
                  className={cn(
                    "w-32 h-32 sm:w-40 sm:h-40 rounded-full transition-all duration-300 relative",
                    isListening ? "border-[var(--duo-red)] bg-[var(--duo-red)]/10 text-[var(--duo-red)] border-8 animate-pulse scale-110 shadow-lg" : "btn-3d btn-3d-blue shadow-[0_8px_0_#1899D6] active:translate-y-2 active:shadow-none hover:scale-105"
                  )}
                  variant="ghost"
                >
                  <Mic className={cn("w-12 h-12 sm:w-16 sm:h-16", isListening ? 'text-[var(--duo-red)]' : 'text-white')} />
                  {isListening && <div className="absolute inset-0 rounded-full border-4 border-[var(--duo-red)] animate-ping opacity-50"></div>}
                </Button>
                <p className="text-base font-black uppercase tracking-widest text-[var(--duo-blue)] h-6 bg-[var(--duo-blue)]/10 px-4 py-1.5 rounded-full border-2 border-[var(--duo-blue)]/20">
                  {isListening ? "Đang nghe..." : "Chạm để đọc"}
                </p>
              </div>

              <div className="w-full space-y-8 min-h-[160px] flex flex-col justify-center">
                {transcript ? (
                  <div className="p-5 bg-[#070e1c] rounded-2xl border-2 border-slate-700 shadow-soft-sm animate-in fade-in slide-in-from-top-4">
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mb-3">Máy nghe được:</p>
                    <p className="text-2xl font-black text-foreground italic">"{transcript}"</p>
                  </div>
                ) : (
                  <div className="h-[104px]"></div> 
                )}
                
                <div className="flex items-center justify-between w-full px-2">
                  <Button className="btn-3d bg-white h-12 px-5 font-bold" onClick={handleBack} disabled={currentIdx === 0}>
                    <ChevronLeft className="w-5 h-5 mr-1" /> Trước
                  </Button>
                  <Button className="btn-3d bg-white h-12 px-5 font-bold text-muted-foreground" onClick={handleNext}>
                    Bỏ qua <RotateCcw className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>

              {showResult && (
                <div className="absolute inset-0 bg-[#070e1c]/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-300 z-10 border-4 border-[var(--duo-correct)]/30">
                  <div className="w-28 h-28 bg-[var(--duo-correct)]/10 rounded-full flex items-center justify-center border-4 border-[var(--duo-correct)]/30 shadow-[0_4px_0_var(--duo-correct-dark)]/20">
                    <CheckCircle2 className="w-14 h-14 text-[var(--duo-correct)]" />
                  </div>
                  <h2 className="text-4xl font-black text-[var(--duo-correct)] uppercase tracking-widest drop-shadow-sm">Excellent!</h2>
                  <p className="font-extrabold text-2xl text-[var(--duo-correct)]/80">Phát âm chuẩn xác</p>
                </div>
              )}
            </div>
          )}

          {/* FINISHED STATE */}
          {isFinished && (
            <div className="w-full text-center space-y-10 animate-in zoom-in-95 duration-300">
              <div className="w-32 h-32 bg-[var(--duo-correct)]/10 rounded-full mx-auto flex items-center justify-center border-4 border-[var(--duo-correct)]/30 shadow-[0_6px_0_var(--duo-correct-dark)]/20">
                <CheckCircle2 className="w-16 h-16 text-[var(--duo-correct)]" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-foreground drop-shadow-sm">Tuyệt vời!</h2>
                <p className="text-xl text-muted-foreground font-bold">Bạn đã hoàn thành bài học từ vựng này.</p>
              </div>
              
              <div className="flex flex-col gap-4 w-full max-w-sm mx-auto pt-4 border-t-2">
                {quizId && (
                  <Button 
                    className="btn-3d btn-3d-blue w-full h-16 rounded-2xl text-xl"
                    onClick={() => navigate(`/courses/${courseId}/dictation/${quizId}`, { state: { questionIds: filteredQuestionIds } })}
                  >
                    <Volume2 className="w-6 h-6 mr-3" /> Luyện nghe các câu này
                  </Button>
                )}
                <Button 
                  className="btn-3d bg-white text-muted-foreground hover:bg-gray-50 border-gray-200 w-full h-16 rounded-2xl text-xl font-bold"
                  onClick={() => navigate(`/courses/${courseId}/vocab`)}
                >
                  <ChevronLeft className="w-6 h-6 mr-2" /> Quay về danh sách từ vựng
                </Button>
                <Button 
                  className="btn-3d bg-[var(--duo-yellow)] hover:bg-[#E5A800] border-[#E5A800] text-black w-full h-16 rounded-2xl text-xl font-bold mt-2"
                  onClick={() => {
                    setIsFinished(false);
                    setShowChestModal(false);
                    setRound(1);
                    setIndices({ 1: 0, 2: 0, 3: 0 });
                  }}
                >
                  <RotateCcw className="w-6 h-6 mr-3" /> Học lại từ đầu
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
      <MysteryChestModal isOpen={showChestModal} onClose={() => setShowChestModal(false)} />
    </StudentLayout>
  );
}
