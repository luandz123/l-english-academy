
import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, RotateCcw, Mic, MicOff, Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ListeningPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  
  // For full dictation
  const [userInput, setUserInput] = useState("");
  // For fill-in-the-blank dictation
  const [blankInputs, setBlankInputs] = useState<Record<number, string>>({});
  
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState<"type" | "speak">("type");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch quiz questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["listening-questions", quizId],
    queryFn: async () => {
      const qId = Number(quizId);
      const { data } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("quiz_id", qId)
        .order("display_order");
      return (data ?? []).map((q: any) => ({
        ...q,
        answers: (q.answers ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
        correctSentence: q.answers?.find((a: any) => a.is_correct)?.answer_text || q.question_text,
      }));
    },
  });

  const question = questions[currentQ];
  const isCloze = question?.question_text?.includes("[___]");

  // Parse Cloze blanks if any
  const clozeParts = isCloze ? question.question_text.split("[___]") : [];
  const correctBlanks = isCloze ? question.correctSentence.split("|").map((s: string) => s.trim()) : [];

  // Find first wrong character position for full dictation
  const findFirstError = useCallback((input: string, correct: string): number => {
    const normalizedInput = input.trim().toLowerCase();
    const normalizedCorrect = correct.trim().toLowerCase();
    for (let i = 0; i < normalizedInput.length; i++) {
      if (i >= normalizedCorrect.length || normalizedInput[i] !== normalizedCorrect[i]) {
        return i;
      }
    }
    if (normalizedInput.length < normalizedCorrect.length) {
      return normalizedInput.length; // incomplete
    }
    return -1; // all correct
  }, []);

  const isFullyCorrect = question
    ? isCloze 
      ? correctBlanks.every((ans: string, i: number) => (blankInputs[i] || "").trim().toLowerCase() === ans.toLowerCase())
      : userInput.trim().toLowerCase() === question.correctSentence.trim().toLowerCase()
    : false;

  const firstErrorPos = (!isCloze && question) ? findFirstError(userInput, question.correctSentence) : -1;

  const checkAnswer = () => {
    setChecked(true);
    if (isFullyCorrect) setCorrectCount((prev) => prev + 1);
  };

  const nextQ = () => {
    if (currentQ >= questions.length - 1) {
      navigate(`/courses/${courseId}/quiz/${quizId}/result`, {
        state: { score: correctCount + (isFullyCorrect ? 1 : 0), total: questions.length },
      });
      return;
    }
    setCurrentQ((prev) => prev + 1);
    setUserInput("");
    setBlankInputs({});
    setChecked(false);
  };

  // Web Speech API
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setUserInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true); // Ensure state updates here
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </StudentLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12 text-center">
          <p className="text-muted-foreground">Chưa có câu hỏi cho bài luyện nghe này.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </StudentLayout>
    );
  }

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-card rounded-xl border p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">🎧 Luyện nghe - TOEIC Dictation</h1>
            <p className="text-sm text-muted-foreground">{questions.length} câu · Tích hợp điền từ và chép chính tả</p>
            <div className="flex gap-3 justify-center">
              <Button variant={inputMode === "type" ? "default" : "outline"} onClick={() => setInputMode("type")}>⌨️ Gõ phím</Button>
              <Button variant={inputMode === "speak" ? "default" : "outline"} onClick={() => setInputMode("speak")}>🎤 Nói</Button>
            </div>
            <Button size="lg" className="w-full h-12 text-lg mt-4" onClick={() => setStarted(true)}>▶ Bắt đầu luyện nghe</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const renderClozeInput = () => {
    return (
      <div className="text-lg leading-loose space-y-4 font-medium text-foreground">
        {clozeParts.map((part: string, i: number) => (
          <span key={i}>
            {part}
            {i < clozeParts.length - 1 && (
              <span className="inline-flex flex-col mx-2 relative top-2">
                <input
                  type="text"
                  disabled={checked}
                  value={blankInputs[i] || ""}
                  onChange={(e) => setBlankInputs(prev => ({ ...prev, [i]: e.target.value }))}
                  className={cn(
                    "border-b-2 bg-transparent text-center px-2 py-1 outline-none w-32 transition-colors",
                    checked
                      ? (blankInputs[i]?.trim().toLowerCase() === correctBlanks[i]?.toLowerCase() ? "border-emerald-500 text-emerald-600 font-bold" : "border-destructive text-destructive font-bold")
                      : "border-primary/50 focus:border-primary"
                  )}
                  placeholder="..."
                />
                {checked && blankInputs[i]?.trim().toLowerCase() !== correctBlanks[i]?.toLowerCase() && (
                  <span className="text-xs text-primary mt-1 absolute top-full left-0 w-full text-center">{correctBlanks[i]}</span>
                )}
              </span>
            )}
          </span>
        ))}
      </div>
    );
  };

  const renderFullInput = () => {
    if (inputMode === "speak") {
      return (
        <div className="space-y-3">
          <div className={cn("w-full p-3 rounded-lg border text-sm bg-background min-h-[80px]", isListening && "border-primary ring-2 ring-primary/30", checked && isFullyCorrect && "border-emerald-500 bg-emerald-500/5", checked && !isFullyCorrect && "border-destructive bg-destructive/5")}>
            {userInput || <span className="text-muted-foreground">{isListening ? "Đang nghe..." : "Nhấn nút micro để bắt đầu nói"}</span>}
          </div>
          <div className="flex gap-2">
            {!isListening ? (
              <Button size="sm" onClick={startListening} disabled={checked} className="gap-2"><Mic className="w-4 h-4" /> Bắt đầu nói</Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stopListening} className="gap-2 animate-pulse"><MicOff className="w-4 h-4" /> Dừng</Button>
            )}
            {userInput && !checked && <Button size="sm" variant="outline" onClick={() => setUserInput("")}>Xóa</Button>}
          </div>
        </div>
      );
    }
    return (
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={checked}
        className={cn(
          "w-full p-4 rounded-xl border text-base bg-background min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm",
          checked && isFullyCorrect && "border-emerald-500 bg-emerald-500/5",
          checked && !isFullyCorrect && "border-destructive bg-destructive/5"
        )}
        placeholder="Nghe audio và gõ lại nguyên câu..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !checked) {
            e.preventDefault();
            if (userInput.trim()) checkAnswer();
          }
        }}
      />
    );
  };

  const renderHighlightedResult = () => {
    if (!checked || !question || isCloze) return null;

    const correct = question.correctSentence;
    const input = userInput.trim();

    if (isFullyCorrect) {
      return (
        <div className="text-sm p-4 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-medium">
          ✅ Chính xác! "{correct}"
        </div>
      );
    }

    const errPos = findFirstError(input, correct);
    return (
      <div className="space-y-3">
        <div className="text-sm p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-destructive font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive" /> Sai từ vị trí thứ {errPos + 1}:</p>
          <p className="font-mono text-base bg-white p-3 rounded-lg border shadow-sm">
            <span className="text-emerald-600">{input.slice(0, errPos)}</span>
            <span className="bg-destructive/10 text-destructive border-b-2 border-destructive border-dashed pb-0.5">
              {input.slice(errPos) || "⏎"}
            </span>
          </p>
        </div>
        <div className="text-sm p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-primary font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Đáp án đúng chuẩn:</p>
          <p className="font-mono text-base bg-white p-3 rounded-lg border shadow-sm">{correct}</p>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {currentQ + 1}
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Luyện nghe điền từ</h1>
              <p className="text-xs text-muted-foreground">Câu {currentQ + 1} / {questions.length}</p>
            </div>
          </div>
          <Progress value={((currentQ + 1) / questions.length) * 100} className="w-32 h-2" />
        </div>

        <div className="bg-card rounded-2xl border p-6 md:p-8 space-y-8 shadow-sm">
          {question.audio_url ? (
            <div className="bg-muted/30 rounded-xl p-6 border flex flex-col items-center gap-4">
              <audio ref={audioRef} src={question.audio_url} className="w-full max-w-md" controls controlsList="nodownload" />
              <div className="flex gap-4">
                <Button variant="outline" onClick={playAudio} className="w-32 gap-2 font-semibold">
                  <Play className="w-4 h-4 fill-current" /> Nghe lại
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Câu hỏi: {question.question_text}</p>
            </div>
          )}

          {question.image_url && <img src={question.image_url} alt="" className="w-full max-h-64 object-contain rounded-xl border shadow-sm" />}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <label className="text-base font-bold text-foreground flex items-center gap-2">
                {isCloze ? "📝 Điền từ vào chỗ trống:" : (inputMode === "type" ? "⌨️ Gõ lại chính xác câu nghe được:" : "🎤 Đọc lại câu nghe được:")}
              </label>
              {!isCloze && (
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  <Button size="sm" variant={inputMode === "type" ? "default" : "ghost"} onClick={() => { setInputMode("type"); stopListening(); }} className="h-8">⌨️ Gõ</Button>
                  <Button size="sm" variant={inputMode === "speak" ? "default" : "ghost"} onClick={() => setInputMode("speak")} className="h-8">🎤 Đọc</Button>
                </div>
              )}
            </div>

            <div className="bg-muted/10 p-6 rounded-xl border">
              {isCloze ? renderClozeInput() : renderFullInput()}
            </div>
            
            {!isCloze && renderHighlightedResult()}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {!checked ? (
              <Button size="lg" onClick={checkAnswer} disabled={!isCloze && !userInput.trim()} className="w-full md:w-auto px-8 font-bold">
                ✅ Kiểm tra đáp án
              </Button>
            ) : (
              <>
                {!isFullyCorrect && <Button size="lg" variant="outline" onClick={() => { setChecked(false); setUserInput(""); setBlankInputs({}); }} className="w-full md:w-auto font-bold">🔄 Thử lại lần nữa</Button>}
                <Button size="lg" onClick={nextQ} className="w-full md:w-auto px-8 font-bold shadow-md">
                  {currentQ >= questions.length - 1 ? "Xem bảng điểm" : "Tiếp tục câu sau →"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default ListeningPage;
