import StudentLayout from "@/components/StudentLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Play, RotateCcw } from "lucide-react";

const sentences = [
  { transcript: "The report will be ________ by Friday.", answer: "completed" },
  { transcript: "Please ________ the form before submitting.", answer: "review" },
  { transcript: "The meeting has been ________ to next week.", answer: "postponed" },
  { transcript: "We need to ________ our marketing strategy.", answer: "revise" },
  { transcript: "The project was ________ on time.", answer: "delivered" },
];

const ListeningPage = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const sentence = sentences[currentQ];
  const isCorrect = userInput.trim().toLowerCase() === sentence.answer.toLowerCase();

  const checkAnswer = () => {
    setChecked(true);
    if (isCorrect) setCorrectCount(prev => prev + 1);
  };

  const nextQ = () => {
    if (currentQ >= sentences.length - 1) {
      navigate(`/courses/${courseId}/quiz/${quizId}/result`, {
        state: { score: correctCount + (isCorrect ? 0 : 0), total: sentences.length },
      });
      return;
    }
    setCurrentQ(prev => prev + 1);
    setUserInput("");
    setChecked(false);
  };

  if (!started) {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12">
          <div className="bg-card rounded-xl border p-8 text-center space-y-4">
            <h1 className="text-xl font-bold text-foreground">🎧 Luyện nghe điền từ Part 2 (1)</h1>
            <p className="text-sm text-muted-foreground">{sentences.length} câu · 1 tài liệu đính kèm</p>
            <Button size="lg" onClick={() => setStarted(true)}>▶ Bắt đầu luyện nghe</Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">🎧 Luyện nghe điền từ</h1>
          <span className="text-sm text-muted-foreground">Câu {currentQ + 1}/{sentences.length}</span>
        </div>
        <Progress value={((currentQ + 1) / sentences.length) * 100} className="h-2" />

        <div className="bg-card rounded-xl border p-6 space-y-6">
          {/* Audio player mock */}
          <div className="bg-muted rounded-lg p-4 flex items-center gap-4">
            <Button size="icon" variant="outline"><Play className="w-4 h-4" /></Button>
            <Button size="icon" variant="outline"><RotateCcw className="w-4 h-4" /></Button>
            <div className="flex-1 h-2 bg-border rounded-full">
              <div className="h-full bg-primary rounded-full w-1/3" />
            </div>
            <span className="text-xs text-muted-foreground">0:23</span>
          </div>

          {/* Transcript */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
            <p className="text-lg font-medium text-foreground">{sentence.transcript}</p>
          </div>

          {/* Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Điền từ còn thiếu:</label>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={checked}
              className={cn(
                "w-full p-3 rounded-lg border text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary",
                checked && isCorrect && "border-success bg-success/5",
                checked && !isCorrect && "border-destructive bg-destructive/5"
              )}
              placeholder="Nhập từ..."
              onKeyDown={(e) => e.key === "Enter" && !checked && checkAnswer()}
            />
            {checked && (
              <div className={cn("text-sm p-2 rounded-lg", isCorrect ? "text-success bg-success/10" : "text-destructive bg-destructive/10")}>
                {isCorrect ? "✅ Chính xác!" : `❌ Sai. Đáp án đúng: "${sentence.answer}"`}
              </div>
            )}
          </div>

          {!checked ? (
            <Button onClick={checkAnswer} disabled={!userInput.trim()}>✅ Kiểm tra</Button>
          ) : (
            <Button onClick={nextQ}>
              {currentQ >= sentences.length - 1 ? "Xem kết quả" : "Câu tiếp theo →"}
            </Button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
};

export default ListeningPage;
