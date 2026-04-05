
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
  const [userInput, setUserInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState<"type" | "speak">("type");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch quiz questions from DB
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
        // The correct full sentence is stored in the correct answer's text
        correctSentence: q.answers?.find((a: any) => a.is_correct)?.answer_text || q.question_text,
      }));
    },
  });

  const question = questions[currentQ];

  // Find first wrong character position
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
    ? userInput.trim().toLowerCase() === question.correctSentence.trim().toLowerCase()
    : false;

  const firstErrorPos = question ? findFirstError(userInput, question.correctSentence) : -1;

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
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  // Play audio
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
            <h1 className="text-xl font-bold text-foreground">🎧 Luyện nghe - Dictation</h1>
            <p className="text-sm text-muted-foreground">{questions.length} câu · Nghe audio và gõ lại nguyên câu</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant={inputMode === "type" ? "default" : "outline"}
                onClick={() => setInputMode("type")}
              >
                ⌨️ Gõ phím
              </Button>
              <Button
                variant={inputMode === "speak" ? "default" : "outline"}
                onClick={() => setInputMode("speak")}
              >
                🎤 Nói
              </Button>
            </div>
            <Button size="lg" onClick={() => setStarted(true)}>
              ▶ Bắt đầu luyện nghe
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Render highlighted input with error position
  const renderHighlightedResult = () => {
    if (!checked || !question) return null;

    const correct = question.correctSentence;
    const input = userInput.trim();

    if (isFullyCorrect) {
      return (
        <div className="text-sm p-3 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          ✅ Chính xác! "{correct}"
        </div>
      );
    }

    // Show input with error highlighted
    const errPos = findFirstError(input, correct);
    return (
      <div className="space-y-2">
        <div className="text-sm p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-destructive font-medium mb-1">❌ Sai từ vị trí {errPos + 1}:</p>
          <p className="font-mono text-foreground">
            <span className="text-emerald-600">{input.slice(0, errPos)}</span>
            <span className="bg-destructive/30 text-destructive px-0.5 rounded underline decoration-wavy">
              {input.slice(errPos) || "⏎"}
            </span>
          </p>
        </div>
        <div className="text-sm p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-primary font-medium mb-1">📝 Đáp án đúng:</p>
          <p className="font-mono text-foreground">{correct}</p>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">🎧 Luyện nghe - Dictation</h1>
          <span className="text-sm text-muted-foreground">
            Câu {currentQ + 1}/{questions.length}
          </span>
        </div>
        <Progress value={((currentQ + 1) / questions.length) * 100} className="h-2" />

        <div className="bg-card rounded-xl border p-6 space-y-6">
          {/* Audio player */}
          {question.audio_url ? (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <audio ref={audioRef} src={question.audio_url} />
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" onClick={playAudio}>
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play();
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nghe audio và gõ lại nguyên câu bạn nghe được</p>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Câu hỏi: {question.question_text}</p>
            </div>
          )}

          {/* Image if any */}
          {question.image_url && (
            <img src={question.image_url} alt="" className="w-full max-h-48 object-contain rounded-lg border" />
          )}

          {/* Input area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {inputMode === "type" ? "⌨️ Gõ lại câu bạn nghe:" : "🎤 Nói lại câu bạn nghe:"}
              </label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={inputMode === "type" ? "default" : "ghost"}
                  onClick={() => { setInputMode("type"); stopListening(); }}
                  className="h-7 text-xs"
                >
                  ⌨️
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === "speak" ? "default" : "ghost"}
                  onClick={() => setInputMode("speak")}
                  className="h-7 text-xs"
                >
                  🎤
                </Button>
              </div>
            </div>

            {inputMode === "type" ? (
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={checked}
                className={cn(
                  "w-full p-3 rounded-lg border text-sm bg-background min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary",
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
            ) : (
              <div className="space-y-3">
                <div
                  className={cn(
                    "w-full p-3 rounded-lg border text-sm bg-background min-h-[80px]",
                    isListening && "border-primary ring-2 ring-primary/30",
                    checked && isFullyCorrect && "border-emerald-500 bg-emerald-500/5",
                    checked && !isFullyCorrect && "border-destructive bg-destructive/5"
                  )}
                >
                  {userInput || (
                    <span className="text-muted-foreground">
                      {isListening ? "Đang nghe..." : "Nhấn nút micro để bắt đầu nói"}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isListening ? (
                    <Button
                      size="sm"
                      onClick={startListening}
                      disabled={checked}
                      className="gap-2"
                    >
                      <Mic className="w-4 h-4" /> Bắt đầu nói
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={stopListening}
                      className="gap-2 animate-pulse"
                    >
                      <MicOff className="w-4 h-4" /> Dừng
                    </Button>
                  )}
                  {userInput && !checked && (
                    <Button size="sm" variant="outline" onClick={() => setUserInput("")}>
                      Xóa
                    </Button>
                  )}
                </div>
              </div>
            )}

            {renderHighlightedResult()}
          </div>

          {!checked ? (
            <Button onClick={checkAnswer} disabled={!userInput.trim()}>
              ✅ Kiểm tra
            </Button>
          ) : (
            <div className="flex gap-2">
              {!isFullyCorrect && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setChecked(false);
                    setUserInput("");
                  }}
                >
                  🔄 Thử lại
                </Button>
              )}
              <Button onClick={nextQ}>
                {currentQ >= questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo →"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default ListeningPage;
