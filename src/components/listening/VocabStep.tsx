import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, CheckCircle2, ChevronRight, Loader2, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { useSound } from "@/hooks/useSound";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { LEVEL_LABELS, saveWord, saveWordsBatch, type ExtractedWord } from "@/lib/api/vocabulary";
import type { Part2Cluster } from "@/types/part2Coach";
import { useLessonVocab } from "./useLessonVocab";
import { StepRibbon } from "./shared";

interface VocabStepProps {
  unit: Part2Cluster;
  howTo: string;
  onComplete: () => void;
}

const QUIZ_SIZE = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tô đậm từ trong câu ví dụ */
const Highlight: React.FC<{ text: string; word: string }> = ({ text, word }) => {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-cyan-500/20 text-cyan-200 rounded px-0.5">{text.slice(idx, idx + word.length)}</mark>
      {text.slice(idx + word.length)}
    </>
  );
};

export const VocabStep: React.FC<VocabStepProps> = ({ unit, howTo, onComplete }) => {
  const { data, isLoading, isError, refetch } = useLessonVocab(unit);
  const words = useMemo(() => data ?? [], [data]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [savedNow, setSavedNow] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"learn" | "quiz" | "done">("learn");

  const isSaved = (w: ExtractedWord) => w.saved || savedNow.has(w.word);
  const afterSave = (list: string[]) => {
    setSavedNow((s) => new Set([...s, ...list]));
    void queryClient.invalidateQueries({ queryKey: ["vocab-saved-keys"] });
    void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
  };

  const saveOne = useMutation({
    mutationFn: (w: ExtractedWord) =>
      saveWord({ word: w.word, source: "listening", example: w.example ?? undefined, source_ref: unit.id }),
    onSuccess: (_r, w) => {
      afterSave([w.word]);
      toast({ title: `Đã lưu "${w.word}" vào Sổ từ vựng` });
    },
    onError: (err) => toast({ title: "Chưa lưu được từ", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const saveAll = useMutation({
    mutationFn: (list: ExtractedWord[]) =>
      saveWordsBatch({
        entry_ids: list.filter((w) => w.entry_id).map((w) => w.entry_id!),
        pack_word_ids: list.filter((w) => !w.entry_id && w.pack_word_id).map((w) => w.pack_word_id!),
      }),
    onSuccess: (r, list) => {
      afterSave(list.map((w) => w.word));
      toast({ title: `Đã lưu ${r.added} từ vào Sổ từ vựng` });
    },
    onError: (err) => toast({ title: "Chưa lưu được từ", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  // Bài kiểm tra nhanh: nghe từ → chọn nghĩa (cần ít nhất 4 từ để có 4 lựa chọn)
  const quiz = useMemo(() => {
    if (words.length < 4) return [];
    return shuffle(words)
      .slice(0, QUIZ_SIZE)
      .map((w) => ({
        word: w,
        options: shuffle([w, ...shuffle(words.filter((o) => o.word !== w.word)).slice(0, 3)]).map((o) => o.definition_vi),
      }));
  }, [words]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);

  const startQuiz = () => {
    setQuizIndex(0);
    setPicked(null);
    setQuizCorrect(0);
    setPhase("quiz");
    if (quiz[0]) void soundAudioPlayer.speakText(quiz[0].word.word, 0.9);
  };

  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const right = opt === quiz[quizIndex].word.definition_vi;
    if (right) setQuizCorrect((c) => c + 1);
    playSound(right ? "correct" : "incorrect");
  };

  const nextQuiz = () => {
    if (quizIndex >= quiz.length - 1) {
      setPhase("done");
      return;
    }
    const next = quizIndex + 1;
    setQuizIndex(next);
    setPicked(null);
    void soundAudioPlayer.speakText(quiz[next].word.word, 0.9);
  };

  const unsaved = words.filter((w) => !isSaved(w));

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <StepRibbon howTo={howTo} />
        <div className="bg-card border border-border rounded-2xl p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm từ quan trọng trong bài…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <StepRibbon howTo={howTo} />
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-foreground font-bold">Chưa tải được từ vựng của bài.</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => void refetch()} className="h-10 rounded-xl text-xs font-bold">
              Thử lại
            </Button>
            <Button onClick={onComplete} className="h-10 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              Bỏ qua bước này
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <StepRibbon howTo={howTo} />
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-foreground font-bold">Kho từ vựng chưa có từ nào khớp với bài này.</p>
          <p className="text-xs text-muted-foreground">
            Ở bước Học từng câu, bạn vẫn xem được nghĩa từng câu. Từ chưa có trong kho sẽ được bổ sung dần.
          </p>
          <Button onClick={onComplete} className="h-10 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
            Sang bước tiếp <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "quiz" && quiz[quizIndex]) {
    const item = quiz[quizIndex];
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <StepRibbon howTo="Nghe từ rồi chọn nghĩa đúng." right={`Câu ${quizIndex + 1}/${quiz.length}`} />
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void soundAudioPlayer.speakText(item.word.word, 0.9)}
              className="w-12 h-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center"
              aria-label="Nghe lại từ"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <div>
              <p className="text-2xl font-black text-foreground">{picked ? item.word.word : "• • •"}</p>
              {picked && item.word.phonetic && <p className="text-sm text-muted-foreground">{item.word.phonetic}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            {item.options.map((opt, i) => {
              const right = opt === item.word.definition_vi;
              return (
                <button
                  key={`${opt}-${i}`}
                  type="button"
                  onClick={() => pick(opt)}
                  disabled={!!picked}
                  className={cn(
                    "min-h-12 rounded-xl border px-4 py-2 text-left text-sm font-medium flex items-center gap-2",
                    picked && right
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                      : picked === opt
                      ? "border-rose-500 bg-rose-500/15 text-rose-200"
                      : "border-border bg-card hover:bg-accent text-foreground",
                  )}
                >
                  <span className="flex-1">{opt}</span>
                  {picked && right && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {picked === opt && !right && <XCircle className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="flex justify-end">
              <Button onClick={nextQuiz} className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
                {quizIndex >= quiz.length - 1 ? "Xem kết quả" : "Từ tiếp"} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <StepRibbon howTo={howTo} right={`${words.length} từ`} />

      {phase === "done" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-foreground">
            Kiểm tra nhanh: đúng {quizCorrect}/{quiz.length} từ.
            {quizCorrect < quiz.length ? " Xem lại các từ bên dưới rồi làm lại nếu muốn." : " Bạn đã nắm các từ của bài!"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={startQuiz} className="h-10 rounded-xl text-xs font-bold">
              Làm lại
            </Button>
            <Button onClick={onComplete} className="h-10 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              Sang bước tiếp <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {words.map((w) => (
          <div key={w.word} className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => void soundAudioPlayer.speakText(w.word, 0.9)}
                className="w-10 h-10 shrink-0 rounded-xl border border-border text-cyan-300 flex items-center justify-center hover:bg-accent"
                aria-label={`Nghe "${w.word}"`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-foreground leading-tight">
                  {w.word}
                  {w.phonetic && <span className="ml-2 text-xs font-medium text-muted-foreground">{w.phonetic}</span>}
                </p>
                <p className="text-sm text-foreground/90">{w.definition_vi}</p>
              </div>
              <button
                type="button"
                onClick={() => !isSaved(w) && saveOne.mutate(w)}
                disabled={isSaved(w) || saveOne.isPending}
                className={cn(
                  "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border",
                  isSaved(w) ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground hover:text-cyan-300",
                )}
                aria-label={isSaved(w) ? "Đã lưu vào Sổ từ vựng" : "Lưu vào Sổ từ vựng"}
                title={isSaved(w) ? "Đã lưu" : "Lưu vào Sổ từ vựng"}
              >
                {isSaved(w) ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              </button>
            </div>
            {w.example && (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-2">
                <span className="font-bold text-foreground/70">Trong bài: </span>
                <Highlight text={w.example} word={w.surface} />
              </p>
            )}
            {w.level && (
              <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                {LEVEL_LABELS[w.level]}
              </span>
            )}
          </div>
        ))}
      </div>

      {phase !== "done" && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {unsaved.length > 0 && (
            <Button
              variant="outline"
              onClick={() => saveAll.mutate(unsaved)}
              disabled={saveAll.isPending}
              className="h-11 rounded-xl text-xs font-bold"
            >
              <BookmarkPlus className="w-4 h-4 mr-1" /> Lưu tất cả ({unsaved.length})
            </Button>
          )}
          {quiz.length > 0 ? (
            <Button onClick={startQuiz} className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              Kiểm tra nhanh <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onComplete} className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              Sang bước tiếp <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VocabStep;
