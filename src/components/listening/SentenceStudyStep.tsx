import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, Snail, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { useSound } from "@/hooks/useSound";
import type { Part2Cluster, Part2CoachQuestion } from "@/types/part2Coach";
import {
  buildPart1Sentences,
  buildPassageSentences,
  findAnswerSentence,
  isBlankCorrect,
  pickBlanks,
  tokenizeForBlanks,
  type StudySentence,
} from "@/lib/listeningText";
import { useLessonVocab } from "./useLessonVocab";
import { StepRibbon } from "./shared";
import { useIsPlaying } from "./useIsPlaying";

interface SentenceStudyStepProps {
  unit: Part2Cluster;
  howTo: string;
  onComplete: () => void;
}

interface Item extends StudySentence {
  /** Part 1: câu hỏi (tranh) chứa câu mô tả */
  question?: Part2CoachQuestion;
  /** Part 3/4: các câu hỏi có đáp án nằm ở câu này (gợi ý) */
  answers?: Part2CoachQuestion[];
}

type Stage = "listen" | "understand" | "judge" | "fill" | "reveal";

interface SentenceState {
  stage: Stage;
  understood?: boolean;
  judged?: boolean;
  blanks?: number[];
  inputs?: string[];
  checked?: boolean;
}

export const SentenceStudyStep: React.FC<SentenceStudyStepProps> = ({ unit, howTo, onComplete }) => {
  const isPart1 = unit.part === "part1";
  const { data: vocab } = useLessonVocab(unit);
  const { playSound } = useSound();
  const isPlaying = useIsPlaying();

  const items: Item[] = useMemo(() => {
    if (isPart1) {
      return unit.questions.flatMap((q) => buildPart1Sentences(q).map((s) => ({ ...s, question: q })));
    }
    const q0 = unit.questions[0];
    const sentences: Item[] = buildPassageSentences(q0?.transcriptText, q0?.passageTranslation);
    const texts = sentences.map((s) => s.text);
    for (const q of unit.questions) {
      const idx = findAnswerSentence(texts, q.correctChoice.text);
      if (idx >= 0) sentences[idx] = { ...sentences[idx], answers: [...(sentences[idx].answers ?? []), q] };
    }
    return sentences;
  }, [isPart1, unit]);

  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Record<string, SentenceState>>({});
  const item = items[index];
  const st: SentenceState = (item && states[item.key]) || { stage: "listen" };
  const update = (patch: Partial<SentenceState>) =>
    item && setStates((s) => ({ ...s, [item.key]: { ...st, ...patch } }));

  const doneCount = items.filter((i) => states[i.key]?.stage === "reveal").length;
  const tokens = useMemo(() => (item ? tokenizeForBlanks(item.text) : []), [item]);
  const firstInput = useRef<HTMLInputElement>(null);

  const speak = (rate = 0.95) => item && void soundAudioPlayer.speakText(item.text, rate);

  // Sang câu mới: tự đọc câu đó
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => {
      if ((states[item.key]?.stage ?? "listen") === "listen") void soundAudioPlayer.speakText(item.text, 0.95);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key]);

  useEffect(() => {
    if (st.stage === "fill") firstInput.current?.focus();
  }, [st.stage, item?.key]);

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <StepRibbon howTo={howTo} />
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm font-bold text-foreground">Bài này chưa có transcript để học từng câu.</p>
          <Button onClick={onComplete} className="h-10 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
            Sang bước tiếp <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const goFill = () => {
    const blanks = pickBlanks(item.text, (vocab ?? []).map((w) => w.surface));
    if (blanks.length === 0) update({ stage: "reveal" });
    else update({ stage: "fill", blanks, inputs: blanks.map(() => ""), checked: false });
  };

  const afterUnderstand = (understood: boolean) => {
    if (isPart1) update({ stage: "judge", understood });
    else {
      const blanks = pickBlanks(item.text, (vocab ?? []).map((w) => w.surface));
      update(
        blanks.length === 0
          ? { stage: "reveal", understood }
          : { stage: "fill", understood, blanks, inputs: blanks.map(() => ""), checked: false },
      );
    }
  };

  const blanks = st.blanks ?? [];
  const inputs = st.inputs ?? [];
  const allRight = blanks.length > 0 && blanks.every((b, i) => isBlankCorrect(inputs[i] ?? "", tokens[b] ?? ""));

  const check = () => {
    update({ checked: true });
    playSound(allRight ? "correct" : "incorrect");
    if (allRight) setTimeout(() => setStates((s) => ({ ...s, [item.key]: { ...s[item.key], stage: "reveal" } })), 600);
  };

  const goTo = (i: number) => {
    soundAudioPlayer.stop();
    setIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const stageOrder: Stage[] = isPart1
    ? ["listen", "understand", "judge", "fill", "reveal"]
    : ["listen", "understand", "fill", "reveal"];
  const reached = (s: Stage) => stageOrder.indexOf(st.stage) >= stageOrder.indexOf(s);
  const isLast = index === items.length - 1;

  const sectionTitle = (n: number, text: string, done: boolean) => (
    <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
      <span
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
          done ? "bg-emerald-600 text-white" : "bg-cyan-500 text-slate-950",
        )}
      >
        {done ? <Check className="w-3 h-3" /> : n}
      </span>
      {text}
    </p>
  );

  let n = 0;
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <StepRibbon howTo={howTo} right={`Đã học ${doneCount}/${items.length} câu`} />

      {/* Danh sách câu */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {items.map((it, i) => {
          const done = states[it.key]?.stage === "reveal";
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Câu ${i + 1}${done ? " (đã học)" : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "min-w-10 h-10 px-2 rounded-xl text-xs font-black shrink-0 border",
                i === index
                  ? "bg-cyan-500 text-slate-950 border-cyan-500"
                  : done
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
                  : "bg-card text-muted-foreground border-border",
              )}
            >
              {isPart1 ? `${it.question?.questionNumber}${it.letter}` : i + 1}
            </button>
          );
        })}
      </div>

      {isPart1 && item.question?.imageUrl && (
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex justify-center">
          <img
            src={item.question.imageUrl}
            alt={`Tranh câu ${item.question.questionNumber}`}
            className="max-h-56 sm:max-h-64 w-auto rounded-xl object-contain"
          />
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-foreground">
            {isPart1 ? `Câu ${item.question?.questionNumber} · Lựa chọn (${item.letter})` : `Câu ${index + 1}/${items.length}`}
            {item.speaker && <span className="ml-2 text-xs font-bold text-cyan-300">{item.speaker}</span>}
          </p>
          {isPart1 && item.question && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void soundAudioPlayer.playUrl(item.question!.audioUrl, 1)}
              className="h-10 rounded-xl text-xs font-bold"
            >
              <Volume2 className="w-4 h-4 mr-1" /> Audio gốc
            </Button>
          )}
        </div>

        {/* 1. Nghe */}
        <div className="space-y-2">
          {sectionTitle(++n, "Nghe câu", reached("understand"))}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => speak(0.95)} className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
              <Volume2 className="w-4 h-4 mr-1" /> {isPlaying ? "Đang đọc…" : "Nghe"}
            </Button>
            <Button variant="outline" onClick={() => speak(0.7)} className="h-11 rounded-xl text-xs font-bold">
              <Snail className="w-4 h-4 mr-1" /> Nghe chậm
            </Button>
            {st.stage === "listen" && (
              <Button variant="outline" onClick={() => update({ stage: "understand" })} className="h-11 rounded-xl text-xs font-bold">
                Đã nghe xong <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Câu được đọc bằng giọng đọc máy để nghe riêng từng câu.</p>
        </div>

        {/* 2. Tự hiểu */}
        {reached("understand") && (
          <div className="space-y-2">
            {sectionTitle(++n, "Tự hiểu nghĩa", reached(isPart1 ? "judge" : "fill"))}
            {st.stage === "understand" ? (
              <>
                <p className="text-sm text-foreground">Nghĩ thầm nghĩa tiếng Việt của câu vừa nghe. Bạn hiểu không?</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => afterUnderstand(true)} className="h-11 rounded-xl text-xs font-bold">
                    Hiểu rồi
                  </Button>
                  <Button variant="outline" onClick={() => afterUnderstand(false)} className="h-11 rounded-xl text-xs font-bold">
                    Chưa chắc
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{st.understood ? "Bạn đã hiểu câu này." : "Bạn chưa chắc — xem kỹ nghĩa ở cuối."}</p>
            )}
          </div>
        )}

        {/* 3. Part 1: đối chiếu tranh */}
        {isPart1 && reached("judge") && (
          <div className="space-y-2">
            {sectionTitle(++n, "Đối chiếu với tranh", reached("fill"))}
            {st.judged === undefined ? (
              <>
                <p className="text-sm text-foreground">Câu này mô tả đúng bức tranh không?</p>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <Button
                      key={String(v)}
                      variant="outline"
                      onClick={() => {
                        update({ judged: v });
                        playSound(v === !!item.isCorrect ? "correct" : "incorrect");
                      }}
                      className="h-11 min-w-24 rounded-xl text-xs font-bold"
                    >
                      {v ? "Đúng với tranh" : "Sai với tranh"}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className={cn("text-sm font-bold flex items-center gap-1.5", st.judged === !!item.isCorrect ? "text-emerald-400" : "text-rose-400")}>
                  {st.judged === !!item.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {st.judged === !!item.isCorrect ? "Chính xác!" : "Chưa đúng."} Câu ({item.letter}) {item.isCorrect ? "là đáp án đúng" : "không đúng với tranh"}.
                </p>
                {st.stage === "judge" && (
                  <Button variant="outline" onClick={goFill} className="h-11 rounded-xl text-xs font-bold">
                    Tiếp: điền từ <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Điền từ */}
        {reached("fill") && blanks.length > 0 && (
          <div className="space-y-3">
            {sectionTitle(++n, "Điền từ còn thiếu", reached("reveal"))}
            <p className="text-base sm:text-lg leading-loose text-foreground font-medium">
              {tokens.map((t, i) => {
                const bi = blanks.indexOf(i);
                if (bi < 0) return <span key={i}>{t}</span>;
                const right = st.checked && isBlankCorrect(inputs[bi] ?? "", t);
                if (st.stage === "reveal") {
                  return (
                    <mark key={i} className="bg-cyan-500/20 text-cyan-200 rounded px-1 font-bold">
                      {t}
                    </mark>
                  );
                }
                return (
                  <input
                    key={i}
                    ref={bi === 0 ? firstInput : undefined}
                    value={inputs[bi] ?? ""}
                    onChange={(e) => {
                      const next = [...inputs];
                      next[bi] = e.target.value;
                      update({ inputs: next, checked: false });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && check()}
                    aria-label={`Ô điền thứ ${bi + 1}`}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ width: `${Math.max(4, t.length + 1)}ch` }}
                    className={cn(
                      "mx-0.5 h-10 rounded-lg border bg-background px-1.5 text-center font-bold text-base outline-none focus:ring-2 focus:ring-cyan-500/50",
                      st.checked ? (right ? "border-emerald-500 text-emerald-300" : "border-rose-500 text-rose-300") : "border-border",
                    )}
                  />
                );
              })}
            </p>
            {st.stage === "fill" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={check}
                  disabled={inputs.every((v) => !v.trim())}
                  className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                >
                  Kiểm tra
                </Button>
                <Button variant="outline" onClick={() => speak(0.8)} className="h-11 rounded-xl text-xs font-bold">
                  <Volume2 className="w-4 h-4 mr-1" /> Nghe lại
                </Button>
                {st.checked && !allRight && (
                  <Button variant="ghost" onClick={() => update({ stage: "reveal" })} className="h-11 rounded-xl text-xs font-bold">
                    Xem đáp án
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Xem nghĩa */}
        {reached("reveal") && (
          <div className="space-y-3 rounded-2xl bg-muted/40 border border-border/70 p-4">
            {sectionTitle(++n, "Câu đầy đủ và nghĩa", true)}
            <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed">{item.text}</p>
            {item.translation ? (
              <p className="text-sm text-muted-foreground">
                {item.translationIsTurn && <span className="font-bold text-foreground/70">Nghĩa cả lượt nói: </span>}
                {item.translation}
              </p>
            ) : (
              !isPart1 && <p className="text-xs text-muted-foreground">Nghĩa của câu này nằm trong bản dịch cả lượt nói ở câu tiếp theo.</p>
            )}
            {item.answers?.map((q) => (
              <div key={q.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm space-y-1">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" /> Gợi ý: câu này có thể chứa đáp án câu {q.questionNumber}
                </p>
                <p className="text-foreground">{q.questionText}</p>
                <p className="text-foreground/80">
                  → ({q.correctChoice.letter}) {q.correctChoice.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Điều hướng */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 gap-2">
          <Button variant="ghost" disabled={index === 0} onClick={() => goTo(index - 1)} className="h-11 rounded-xl text-xs font-bold">
            <ChevronLeft className="w-4 h-4 mr-1" /> Câu trước
          </Button>
          {isLast ? (
            <Button
              onClick={onComplete}
              className="h-11 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            >
              Xong bước này{doneCount < items.length ? ` (${doneCount}/${items.length})` : ""} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant={st.stage === "reveal" ? "default" : "outline"}
              onClick={() => goTo(index + 1)}
              className={cn(
                "h-11 rounded-xl text-xs font-bold",
                st.stage === "reveal" && "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black",
              )}
            >
              Câu tiếp <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentenceStudyStep;
