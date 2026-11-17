import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Lightbulb, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import type { Part2Cluster } from "@/types/part2Coach";
import { getChoices, normalizeWord, questionCategory, questionKeywords, tokenizeForBlanks } from "@/lib/listeningText";
import { StepRibbon } from "./shared";

interface QuestionStudyStepProps {
  unit: Part2Cluster;
  howTo: string;
  onComplete: () => void;
}

export const QuestionStudyStep: React.FC<QuestionStudyStepProps> = ({ unit, howTo, onComplete }) => {
  const questions = unit.questions;
  const [index, setIndex] = useState(0);
  const [marked, setMarked] = useState<Record<number, Set<number>>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const q = questions[index];

  const tokens = useMemo(() => tokenizeForBlanks(q.questionText), [q]);
  const suggested = useMemo(() => new Set(questionKeywords(q.questionText)), [q]);
  const category = useMemo(() => questionCategory(q.questionText), [q]);
  const mine = marked[q.id] ?? new Set<number>();
  const isRevealed = revealed.has(q.id);

  const toggle = (i: number) =>
    setMarked((m) => {
      const s = new Set(m[q.id] ?? []);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return { ...m, [q.id]: s };
    });

  const hit = [...mine].filter((i) => suggested.has(normalizeWord(tokens[i]))).length;
  const isLast = index === questions.length - 1;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <StepRibbon howTo={howTo} right={`Câu hỏi ${index + 1}/${questions.length}`} />

      <div className="flex gap-2">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "min-h-10 px-3.5 rounded-xl text-xs font-black border",
              i === index
                ? "bg-cyan-500 text-slate-950 border-cyan-500"
                : revealed.has(qq.id)
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
                : "bg-card text-muted-foreground border-border",
            )}
          >
            Câu {qq.questionNumber}
          </button>
        ))}
      </div>

      {q.imageUrl && (
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex justify-center">
          <img src={q.imageUrl} alt="Biểu đồ của câu hỏi" className="max-h-64 w-auto rounded-xl object-contain" />
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-violet-500/15 text-violet-300">
              {category.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void soundAudioPlayer.speakText(q.questionText, 0.9)}
              className="h-10 rounded-xl text-xs font-bold"
            >
              <Volume2 className="w-4 h-4 mr-1" /> Nghe câu hỏi
            </Button>
          </div>
          <p className="text-xs font-bold text-muted-foreground">Bấm chọn các từ khóa bạn sẽ nghe để tìm đáp án:</p>
          <p className="text-lg sm:text-xl font-bold leading-relaxed text-foreground">
            <span className="text-cyan-400 mr-1.5">{q.questionNumber}.</span>
            {tokens.map((t, i) =>
              /[A-Za-z]/.test(t) ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={mine.has(i)}
                  className={cn(
                    "rounded-md px-0.5 transition-colors",
                    mine.has(i) && "bg-cyan-500/25 text-cyan-200",
                    isRevealed && suggested.has(normalizeWord(t)) && "underline decoration-amber-400 decoration-2 underline-offset-4",
                  )}
                >
                  {t}
                </button>
              ) : (
                <span key={i}>{t}</span>
              ),
            )}
          </p>
        </div>

        {!isRevealed ? (
          <Button
            onClick={() => setRevealed((s) => new Set([...s, q.id]))}
            className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950"
          >
            <Eye className="w-4 h-4 mr-1" /> Xem gợi ý và nghĩa
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-muted/40 border border-border/70 p-4 space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-bold">Nghĩa: </span>
                {q.questionTranslation}
              </p>
              {suggested.size > 0 && (
                <p className="text-sm text-foreground">
                  <span className="font-bold">Từ khóa gợi ý (gạch chân vàng): </span>
                  {[...suggested].join(", ")}
                  {mine.size > 0 && (
                    <span className="text-muted-foreground"> · Bạn chọn trúng {hit}/{suggested.size}</span>
                  )}
                </p>
              )}
              <p className="text-sm text-amber-200 flex gap-1.5">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{category.tip}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">Các lựa chọn và nghĩa:</p>
              {getChoices(q).map((c) => (
                <div key={c.letter} className="rounded-xl border border-border p-2.5 text-sm">
                  <p className="text-foreground font-medium">
                    <span className="font-black mr-1.5">({c.letter})</span>
                    {c.text}
                  </p>
                  {c.translation && <p className="text-muted-foreground text-xs mt-0.5">{c.translation}</p>}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Bước sau bạn học từng câu của bài để tự tìm ra chỗ chứa đáp án.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)} className="h-11 rounded-xl text-xs font-bold">
            <ChevronLeft className="w-4 h-4 mr-1" /> Câu trước
          </Button>
          {isLast ? (
            <Button onClick={onComplete} className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              Xong bước này <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIndex(index + 1)} className="h-11 rounded-xl text-xs font-bold">
              Câu hỏi tiếp <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionStudyStep;
