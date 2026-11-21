import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Timer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { useSound } from "@/hooks/useSound";
import type { Part2Cluster } from "@/types/part2Coach";
import { getChoices, type ChoiceLetter } from "@/lib/listeningText";
import type { AttemptResult } from "@/lib/listeningAttempts";
import { StepRibbon } from "./shared";
import { useIsPlaying } from "./useIsPlaying";

interface AttemptStepProps {
  unit: Part2Cluster;
  mode: "first" | "final";
  howTo: string;
  /** Kết quả lần làm thử đầu (để so sánh ở bước Làm lại) */
  firstResult?: AttemptResult;
  onSubmitted: (result: AttemptResult) => void;
  onComplete: () => void;
  completeLabel: string;
}

/** Giây đọc trước cho mỗi câu hỏi Part 3/4 */
const PREVIEW_SECONDS_PER_QUESTION = 10;

export const AttemptStep: React.FC<AttemptStepProps> = ({
  unit,
  mode,
  howTo,
  firstResult,
  onSubmitted,
  onComplete,
  completeLabel,
}) => {
  const isPassage = unit.part === "part3" || unit.part === "part4";
  const questions = unit.questions;
  const { playSound } = useSound();
  const isPlaying = useIsPlaying();
  const [answers, setAnswers] = useState<Record<number, ChoiceLetter>>({});
  const [submitted, setSubmitted] = useState(false);
  const [index, setIndex] = useState(0);
  const [previewLeft, setPreviewLeft] = useState(isPassage ? questions.length * PREVIEW_SECONDS_PER_QUESTION : 0);
  const current = questions[index];

  const playPassage = useCallback(() => {
    void soundAudioPlayer.playUrl(questions[0]?.audioUrl ?? "", 1);
  }, [questions]);

  // Part 3/4: đếm ngược đọc trước câu hỏi, hết giờ thì tự phát audio
  useEffect(() => {
    if (!isPassage || submitted || previewLeft <= 0) return;
    const t = setTimeout(() => {
      setPreviewLeft((s) => {
        if (s <= 1) playPassage();
        return s - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [isPassage, submitted, previewLeft, playPassage]);

  // Part 1/2: đổi câu thì tự phát audio câu đó
  useEffect(() => {
    if (isPassage || submitted || !current) return;
    const t = setTimeout(() => void soundAudioPlayer.playUrl(current.audioUrl, 1), 250);
    return () => {
      clearTimeout(t);
      soundAudioPlayer.stop();
    };
  }, [isPassage, submitted, current]);

  const togglePlay = () => {
    if (isPlaying) {
      soundAudioPlayer.stop();
      return;
    }
    if (isPassage) {
      setPreviewLeft(0);
      playPassage();
    } else if (current) {
      void soundAudioPlayer.playUrl(current.audioUrl, 1);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correctChoice.letter).length,
    [answers, questions],
  );

  const submit = () => {
    soundAudioPlayer.stop();
    setSubmitted(true);
    playSound(correctCount === questions.length ? "correct" : "incorrect");
    onSubmitted({ correct: correctCount, total: questions.length, at: Date.now() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
    setIndex(0);
    if (isPassage) setPreviewLeft(questions.length * PREVIEW_SECONDS_PER_QUESTION);
  };

  const image = isPassage ? questions.find((q) => q.imageUrl)?.imageUrl : current?.imageUrl;

  const choiceButtons = (qId: number, letters: { letter: ChoiceLetter; text?: string }[], correct: ChoiceLetter) => (
    <div className={cn("grid gap-2", letters.some((l) => l.text) ? "grid-cols-1" : letters.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {letters.map(({ letter, text }) => {
        const chosen = answers[qId] === letter;
        const isRight = submitted && letter === correct;
        const isWrong = submitted && chosen && letter !== correct;
        return (
          <button
            key={letter}
            type="button"
            disabled={submitted}
            onClick={() => setAnswers((a) => ({ ...a, [qId]: letter }))}
            aria-pressed={chosen}
            className={cn(
              "min-h-12 rounded-xl border px-3 py-2 text-left font-bold text-sm transition-colors flex items-center gap-2.5",
              isRight
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : isWrong
                ? "border-rose-500 bg-rose-500/15 text-rose-300"
                : chosen
                ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                : "border-border bg-card hover:bg-accent text-foreground",
              !text && "justify-center",
            )}
          >
            <span
              className={cn(
                "w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-black",
                chosen || isRight ? "bg-white/15" : "bg-muted",
              )}
            >
              {letter}
            </span>
            {text && <span className="font-medium leading-snug">{text}</span>}
            {isRight && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
            {isWrong && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <StepRibbon howTo={howTo} right={`${answeredCount}/${questions.length} đã chọn`} />

      {submitted && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-300">
              {mode === "first" ? "Kết quả làm thử" : "Kết quả làm lại"}
            </p>
            <p className="text-2xl font-black text-foreground">
              Đúng {correctCount}/{questions.length} câu
            </p>
            {mode === "final" && firstResult && (
              <p className="text-sm text-muted-foreground font-medium">
                Lần đầu: {firstResult.correct}/{firstResult.total} → Lần này: {correctCount}/{questions.length}
                {correctCount > firstResult.correct ? " · Tiến bộ rồi!" : ""}
              </p>
            )}
            {mode === "first" && (
              <p className="text-sm text-muted-foreground font-medium">
                Các bước sau sẽ giúp bạn nghe ra từng câu. Cuối bài bạn sẽ làm lại để so sánh.
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={retry} className="h-11 rounded-xl font-bold text-xs">
              <RotateCcw className="w-4 h-4 mr-1" /> Làm lại lượt này
            </Button>
            <Button onClick={onComplete} className="h-11 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              {completeLabel} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {image && (
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex justify-center">
          <img src={image} alt="Hình của câu hỏi" className="max-h-64 sm:max-h-72 w-auto rounded-xl object-contain" />
        </div>
      )}

      {/* Nút phát */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-3">
        <Button
          onClick={togglePlay}
          className="h-12 w-12 rounded-full p-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 shrink-0"
          aria-label={isPlaying ? "Dừng" : "Phát audio"}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        <div className="min-w-0 flex-1">
          {isPassage && previewLeft > 0 && !submitted ? (
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-amber-400" /> Đọc trước câu hỏi: còn {previewLeft} giây
              </p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(previewLeft / (questions.length * PREVIEW_SECONDS_PER_QUESTION)) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-foreground">
              {isPlaying ? "Đang phát…" : isPassage ? "Bấm để nghe lại cả đoạn" : `Câu ${current?.questionNumber}: bấm để nghe lại`}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {isPassage ? "Thi thật chỉ được nghe một lần." : "Thi thật chỉ được nghe một lần, không có chữ."}
          </p>
        </div>
        {isPassage && previewLeft > 0 && !submitted && (
          <Button variant="outline" onClick={togglePlay} className="h-10 rounded-xl text-xs font-bold shrink-0">
            Nghe ngay
          </Button>
        )}
      </div>

      {isPassage ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-sm sm:text-base font-bold text-foreground">
                <span className="text-cyan-400 mr-1.5">{q.questionNumber}.</span>
                {q.questionText}
              </p>
              {choiceButtons(q.id, getChoices(q), q.correctChoice.letter)}
            </div>
          ))}
        </div>
      ) : (
        current && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {questions.map((q, i) => {
                const done = !!answers[q.id];
                const right = submitted && answers[q.id] === q.correctChoice.letter;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      "min-h-10 px-3.5 rounded-xl font-black text-xs shrink-0 border",
                      i === index
                        ? "bg-cyan-500 text-slate-950 border-cyan-500"
                        : submitted
                        ? right
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : done
                        ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                        : "bg-card text-muted-foreground border-border",
                    )}
                  >
                    Câu {q.questionNumber}
                  </button>
                );
              })}
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              {unit.part === "part1" ? "Câu nào mô tả đúng bức tranh?" : "Câu trả lời nào phù hợp nhất?"}
            </p>
            {choiceButtons(
              current.id,
              getChoices(current).map((c) => ({ letter: c.letter, text: submitted ? c.text : undefined })),
              current.correctChoice.letter,
            )}
            {submitted && unit.part === "part2" && (
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Câu hỏi:</span> {current.questionText}
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Câu trước
              </Button>
              {index < questions.length - 1 && (
                <Button variant="outline" onClick={() => setIndex((i) => i + 1)} className="h-10 rounded-xl text-xs font-bold">
                  Câu tiếp <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {!submitted && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          {answeredCount < questions.length && (
            <span className="text-xs text-muted-foreground font-medium sm:mr-2">
              Còn {questions.length - answeredCount} câu chưa chọn
            </span>
          )}
          <Button
            onClick={submit}
            disabled={answeredCount === 0}
            className="h-11 px-6 rounded-xl font-black text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950"
          >
            Nộp bài
          </Button>
        </div>
      )}
    </div>
  );
};

export default AttemptStep;
