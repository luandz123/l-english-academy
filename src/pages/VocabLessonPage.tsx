import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useRef } from "react";
import { Volume2, X as XIcon, Mic, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function VocabLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const filteredQuestionIds = (window.history.state?.usr as any)?.questionIds as number[] | undefined;
  
  const [round, setRound] = useState<1 | 2 | 3>(1);
  // Persist index for each round separately
  const [indices, setIndices] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [dictationInput, setDictationInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [wrongChars, setWrongChars] = useState<{ char: string, correct: boolean }[] | null>(null);

  const currentIdx = indices[round];

  const { data: words, isLoading } = useQuery({
    queryKey: ["vocab-lesson-student", lessonId],
    queryFn: async () => {
      const { data: quiz } = await supabase.from("vocab_quizzes").select("id").eq("lesson_id", Number(lessonId)).maybeSingle();
      if (!quiz) return [];
      let query = supabase.from("vocab_questions").select("*").eq("vocab_quiz_id", quiz.id);
      if (filteredQuestionIds && filteredQuestionIds.length > 0) {
        query = query.in("question_id", filteredQuestionIds);
      }
      const { data } = await query.order("display_order");
      return data || [];
    }
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["vocab-lesson-questions", lessonId],
    queryFn: async () => {
      const { data: lesson } = await supabase.from("lessons").select("quiz_id").eq("id", Number(lessonId)).single();
      if (!lesson?.quiz_id) return [];
      const { data } = await supabase.from("questions").select("id, display_order").eq("quiz_id", lesson.quiz_id).order("display_order");
      return data || [];
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
    setIsFlipped(false);
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
        toast({ title: "Hoàn thành bài học từ vựng!" });
        navigate(`/courses/${courseId}`);
      }
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setIsFlipped(false);
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
      setShowResult(true);
      setWrongChars(null);
      setTimeout(handleNext, 1200);
    } else {
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
    recognition.continuous = true;
    recognition.interimResults = true;

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
      
      if (currentResult.toLowerCase().includes(word?.word.toLowerCase() || "") && !hasPassed) {
        hasPassed = true;
        setShowResult(true);
        recognition.stop();
        setTimeout(handleNext, 1500);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();

    setTimeout(() => {
      if (!hasPassed) recognition.stop();
    }, 5000);
  };

  if (isLoading) return <StudentLayout><Skeleton className="h-64 rounded-xl max-w-2xl mx-auto" /></StudentLayout>;
  if (!words || words.length === 0) return (
    <StudentLayout>
      <div className="text-center py-20 bg-card rounded-xl shadow border max-w-2xl mx-auto">
        <p className="text-muted-foreground mb-4">Bài học này chưa có từ vựng.</p>
        <Button onClick={() => navigate(`/courses/${courseId}`)}>Quay lại khóa học</Button>
      </div>
    </StudentLayout>
  );

  const progress = ((currentIdx + (round - 1) * words.length) / (words.length * 3)) * 100;

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto flex flex-col min-h-[70vh]">
        {/* Header Tabs */}
        <div className="flex items-center justify-between mb-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="rounded-full" onClick={() => navigate(`/courses/${courseId}`)}>
              <XIcon className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg hidden sm:block">Từ vựng</h1>
          </div>
          <div className="flex bg-muted p-1 rounded-lg gap-1">
            {[1, 2, 3].map((r) => (
              <Button 
                key={r}
                variant={round === r ? "default" : "ghost"} 
                size="sm" 
                className="text-xs h-8 px-3"
                onClick={() => { setRound(r as any); setShowResult(false); setWrongChars(null); setIsFlipped(false); }}
              >
                {r === 1 ? "1. Học" : r === 2 ? "2. Viết" : "3. Đọc"}
              </Button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
            <span>Tiến độ tổng quát</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Interaction Card */}
        <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-3xl border-2 shadow-sm p-8 relative min-h-[500px]">
          
          {/* ROUND 1: FLASHCARDS */}
          {round === 1 && word && (
            <div className="w-full flex flex-col items-center space-y-10">
              <div 
                className={cn(
                  "w-full max-w-sm aspect-[4/5] perspective-1000 cursor-pointer group",
                  isFlipped ? "rotate-y-180" : ""
                )}
                onClick={() => {
                  if (!isFlipped) {
                    setIsFlipped(true);
                    playAudio(word.word, word.audio_male_url);
                  } else {
                    handleNext();
                  }
                }}
              >
                <div className="relative w-full h-full transition-transform duration-500 preserve-3d">
                  {/* Front Side */}
                  <div className={cn(
                    "absolute inset-0 backface-hidden bg-muted/30 rounded-3xl border-2 border-primary/20 flex flex-col items-center justify-center p-8 shadow-inner group-hover:border-primary/40 transition-all",
                    isFlipped ? "opacity-0 invisible" : "opacity-100 visible"
                  )}>
                    <h2 className="text-5xl font-extrabold text-foreground mb-4 select-none">{word.word}</h2>
                    <p className="text-sm text-muted-foreground animate-pulse mt-12">Chạm để lật & nghe</p>
                  </div>

                  {/* Back Side */}
                  <div className={cn(
                    "absolute inset-0 backface-hidden bg-primary/5 rounded-3xl border-2 border-primary/40 flex flex-col items-center justify-center p-8 shadow-md transform rotate-y-180 transition-all",
                    isFlipped ? "opacity-100 visible" : "opacity-0 invisible"
                  )}>
                    <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
                      <div>
                        <h2 className="text-3xl font-bold text-primary mb-1">{word.word}</h2>
                        <p className="text-xl text-muted-foreground font-mono bg-background/50 px-4 py-1 rounded-full inline-block">{word.phonetic}</p>
                      </div>
                      <div className="h-px w-16 bg-primary/20 mx-auto"></div>
                      <p className="text-3xl font-bold text-foreground">{word.definition_vi}</p>
                      {word.example_sentence && (
                        <p className="text-sm text-muted-foreground italic bg-background/40 p-4 rounded-xl border border-primary/10">"{word.example_sentence}"</p>
                      )}
                      <p className="text-xs text-primary font-semibold animate-pulse pt-4">Chạm để sang từ tiếp theo</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center gap-6 w-full max-w-sm">
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 border" onClick={handleBack} disabled={currentIdx === 0}>
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="flex-1 text-center font-bold text-muted-foreground text-sm">
                  {currentIdx + 1} / {words.length}
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 border" onClick={handleNext}>
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}

          {/* ROUND 2: DICTATION */}
          {round === 2 && word && (
            <div className="w-full max-w-sm text-center space-y-10 animate-in fade-in duration-300">
              <div 
                className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all shadow-inner border-2 border-primary/20 active:scale-95"
                onClick={() => playAudio(word.word, word.audio_male_url)}
              >
                <Volume2 className="w-10 h-10 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-foreground">{word.definition_vi}</h3>
                <p className="text-sm text-muted-foreground font-medium">Nghe và viết lại từ vựng này</p>
              </div>

              <div className="space-y-4">
                <form onSubmit={handleDictationSubmit} className="flex gap-2 w-full">
                  <Input 
                    autoFocus
                    placeholder="Type what you hear..." 
                    value={dictationInput}
                    onChange={(e) => setDictationInput(e.target.value)}
                    className="text-center text-xl font-bold h-14 rounded-2xl border-2 focus-visible:ring-primary shadow-sm"
                    readOnly={showResult}
                  />
                  <Button type="submit" size="lg" className="h-14 w-14 rounded-2xl shrink-0 shadow-md" disabled={showResult || !dictationInput.trim()}>
                    <ArrowRight className="w-6 h-6"/>
                  </Button>
                </form>

                {/* Wrong Character Feedback */}
                {wrongChars && (
                  <div className="flex justify-center gap-1 bg-destructive/5 p-3 rounded-xl border border-destructive/10 animate-in slide-in-from-top-2">
                    {wrongChars.map((item, i) => (
                      <span key={i} className={cn(
                        "text-xl font-mono font-bold",
                        item.correct ? "text-success" : "text-destructive underline decoration-2"
                      )}>
                        {item.char}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => { setDictationInput(word.word); setShowResult(true); setTimeout(handleNext, 1500); }} disabled={showResult}>
                  Xem đáp án
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full px-4" onClick={handleNext}>Bỏ qua</Button>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="ghost" size="sm" onClick={handleBack} disabled={currentIdx === 0} className="text-muted-foreground">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                </Button>
                <span className="text-xs font-bold text-muted-foreground">{currentIdx + 1} / {words.length}</span>
                <Button variant="ghost" size="sm" onClick={handleNext} className="text-muted-foreground">
                  Sau <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {showResult && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300 z-10">
                  <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <h2 className="text-4xl font-black text-success uppercase tracking-wider">{word.word}</h2>
                  <p className="font-bold text-success/80">Chính xác!</p>
                </div>
              )}
            </div>
          )}

          {/* ROUND 3: SPEAKING */}
          {round === 3 && word && (
            <div className="w-full max-w-sm text-center space-y-10 flex flex-col items-center animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <h2 className="text-5xl font-black text-primary tracking-tight">{word.word}</h2>
                  <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 bg-primary/10 hover:bg-primary/20 transition-all shadow-sm" onClick={() => playAudio(word.word, word.audio_male_url)}>
                    <Volume2 className="w-6 h-6 text-primary" />
                  </Button>
                </div>
                <p className="text-2xl text-muted-foreground font-mono tracking-widest">{word.phonetic}</p>
              </div>

              <div className="flex flex-col items-center gap-5 py-4">
                <Button 
                  size="lg" 
                  onClick={startListening} 
                  disabled={isListening || showResult}
                  className={cn(
                    "w-36 h-36 rounded-full border-8 transition-all duration-300 shadow-xl relative",
                    isListening ? "border-red-500 bg-red-100 text-red-500 animate-pulse scale-110" : "border-primary/10 bg-primary/5 text-primary hover:bg-primary/10 hover:scale-105"
                  )}
                  variant="ghost"
                >
                  <Mic className={cn("w-14 h-14", isListening ? 'text-red-500' : 'text-primary')} />
                  {isListening && <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-50"></div>}
                </Button>
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground h-6">
                  {isListening ? "Listening..." : "Tap to Speak"}
                </p>
              </div>

              <div className="w-full space-y-6 min-h-[160px] flex flex-col justify-center">
                {transcript ? (
                  <div className="p-4 bg-muted/50 rounded-2xl border-2 border-primary/10 animate-in fade-in slide-in-from-top-4">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Máy nghe được:</p>
                    <p className="text-xl font-black text-foreground italic">"{transcript}"</p>
                  </div>
                ) : (
                  <div className="h-[92px]"></div> 
                )}
                
                <div className="flex items-center justify-between w-full px-4">
                  <Button variant="ghost" size="sm" onClick={handleBack} disabled={currentIdx === 0} className="font-bold text-muted-foreground">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNext} className="font-bold text-muted-foreground">
                    Bỏ qua từ này <RotateCcw className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {showResult && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300 z-10">
                  <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-success" />
                  </div>
                  <h2 className="text-4xl font-black text-success uppercase tracking-widest">Excellent!</h2>
                  <p className="font-bold text-success/80">Phát âm chuẩn xác</p>
                </div>
              )}
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
    </StudentLayout>
  );
}
