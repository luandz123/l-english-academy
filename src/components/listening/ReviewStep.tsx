import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import type { Part2Cluster } from "@/types/part2Coach";
import { getChoices } from "@/lib/listeningText";
import type { AttemptResult } from "@/lib/listeningAttempts";
import { AttemptStep } from "./AttemptStep";

interface ReviewStepProps {
  unit: Part2Cluster;
  howTo: string;
  firstResult?: AttemptResult;
  onSubmitted: (r: AttemptResult) => void;
  onFinish: () => void;
}

const SPEEDS = [0.75, 1, 1.25];

/** Nghe lặp audio gốc của cả bài, có phụ đề Anh/Việt. */
const LoopListen: React.FC<{ unit: Part2Cluster }> = ({ unit }) => {
  const isPassage = unit.part === "part3" || unit.part === "part4";
  const tracks = useMemo(() => {
    const seen = new Set<string>();
    return unit.questions.filter((q) => q.audioUrl && !seen.has(q.audioUrl) && seen.add(q.audioUrl));
  }, [unit]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [subs, setSubs] = useState<"both" | "en" | "hidden">("both");
  const [rounds, setRounds] = useState(0);
  const running = useRef(false);

  useEffect(
    () => () => {
      running.current = false;
      soundAudioPlayer.stop();
    },
    [],
  );

  const run = async (start: number) => {
    running.current = true;
    setPlaying(true);
    let i = start;
    while (running.current) {
      setCurrent(i);
      await soundAudioPlayer.playUrl(tracks[i].audioUrl, speed);
      if (!running.current) break;
      await new Promise((r) => setTimeout(r, 1200));
      i = (i + 1) % tracks.length;
      if (i === 0) setRounds((n) => n + 1);
    }
  };

  const toggle = () => {
    if (playing) {
      running.current = false;
      setPlaying(false);
      soundAudioPlayer.stop();
    } else {
      void run(current);
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={toggle}
          className="h-12 rounded-2xl px-5 bg-violet-600 hover:bg-violet-700 text-white font-black text-sm whitespace-nowrap"
        >
          {playing ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
          {playing ? "Dừng" : "Phát lặp cả bài"}
        </Button>
        <div className="flex gap-1" role="group" aria-label="Tốc độ">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={playing}
              onClick={() => setSpeed(s)}
              className={cn(
                "h-10 min-w-12 px-2 rounded-xl text-xs font-black border",
                speed === s ? "bg-cyan-500 text-slate-950 border-cyan-500" : "border-border text-muted-foreground",
                playing && "opacity-60",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Phụ đề">
          {(
            [
              ["both", "Anh + Việt"],
              ["en", "Tiếng Anh"],
              ["hidden", "Ẩn chữ"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSubs(k)}
              className={cn(
                "h-10 px-2.5 rounded-xl text-xs font-bold border",
                subs === k ? "bg-muted text-foreground border-border" : "border-transparent text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {rounds > 0 && (
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Repeat className="w-3.5 h-3.5" /> Đã nghe {rounds} vòng
          </span>
        )}
      </div>

      {subs !== "hidden" && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {isPassage ? (
            <TranscriptBlock
              en={unit.questions[0]?.transcriptText ?? ""}
              vi={subs === "both" ? unit.questions[0]?.passageTranslation : undefined}
              active={playing}
            />
          ) : (
            tracks.map((q, i) => (
              <div
                key={q.id}
                className={cn(
                  "rounded-2xl border p-3 space-y-1 text-sm",
                  i === current && playing ? "border-violet-500/60 bg-violet-500/10" : "border-border",
                )}
              >
                <p className="text-xs font-black text-muted-foreground">Câu {q.questionNumber}</p>
                {unit.part === "part2" && (
                  <p className="text-foreground font-bold">
                    {q.questionText}
                    {subs === "both" && <span className="block text-muted-foreground font-normal">{q.questionTranslation}</span>}
                  </p>
                )}
                {getChoices(q).map((c) => (
                  <p key={c.letter} className={cn("text-foreground", c.letter === q.correctChoice.letter && "text-emerald-300 font-bold")}>
                    ({c.letter}) {c.text}
                    {subs === "both" && c.translation && (
                      <span className="block text-muted-foreground font-normal text-xs">{c.translation}</span>
                    )}
                  </p>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const TranscriptBlock: React.FC<{ en: string; vi?: string; active: boolean }> = ({ en, vi, active }) => {
  const enLines = en.split(/\n+/).filter(Boolean);
  const viLines = (vi ?? "").split(/\n+/).filter(Boolean);
  return (
    <div className={cn("rounded-2xl border p-3 space-y-2 text-sm", active ? "border-violet-500/60 bg-violet-500/5" : "border-border")}>
      {enLines.map((line, i) => (
        <p key={i} className="text-foreground">
          {line}
          {vi && viLines.length === enLines.length && (
            <span className="block text-muted-foreground text-xs">{viLines[i]}</span>
          )}
        </p>
      ))}
      {vi && viLines.length !== enLines.length && <p className="text-muted-foreground text-xs whitespace-pre-line">{vi}</p>}
    </div>
  );
};

export const ReviewStep: React.FC<ReviewStepProps> = ({ unit, howTo, firstResult, onSubmitted, onFinish }) => {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="space-y-4">
      <AttemptStep
        unit={unit}
        mode="final"
        howTo={howTo}
        firstResult={firstResult}
        onSubmitted={(r) => {
          setSubmitted(true);
          onSubmitted(r);
        }}
        onComplete={onFinish}
        completeLabel="Hoàn thành bài"
      />
      {submitted && (
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="text-sm font-black text-foreground">Nghe lặp cả bài cho ngấm</p>
          <LoopListen unit={unit} />
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
