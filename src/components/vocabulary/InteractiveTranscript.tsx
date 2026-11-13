import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { SaveWordDialog } from "./SaveWordDialog";
import { splitSentences } from "@/lib/transcript";

/**
 * Transcript tương tác (L06): từng câu có nút nghe lại (giọng đọc máy) và ẩn/hiện để tự kiểm tra;
 * bấm một từ để tra nghĩa và lưu vào Sổ từ vựng kèm câu ngữ cảnh (L08).
 */
export const InteractiveTranscript: React.FC<{ text: string; sourceRef?: string; className?: string }> = ({ text, sourceRef, className }) => {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [allHidden, setAllHidden] = useState(false);
  const [picked, setPicked] = useState<{ word: string; context: string } | null>(null);

  const toggle = (i: number) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const isHidden = (i: number) => (allHidden ? !hidden.has(i) : hidden.has(i));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">Bấm vào từ để tra & lưu · bấm 🔊 để nghe lại câu</span>
        <button
          type="button"
          onClick={() => {
            setAllHidden((v) => !v);
            setHidden(new Set());
          }}
          className="min-h-[32px] px-2 rounded-lg border border-slate-700 text-[11px] font-bold text-slate-300 inline-flex items-center gap-1"
        >
          {allHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {allHidden ? "Hiện tất cả" : "Ẩn tất cả"}
        </button>
      </div>
      {sentences.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => void soundAudioPlayer.speakText(s.text)}
            className="w-8 h-8 shrink-0 rounded-lg border border-slate-700 text-cyan-300 flex items-center justify-center hover:bg-slate-800"
            aria-label="Nghe lại câu"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => toggle(i)}
            className="w-8 h-8 shrink-0 rounded-lg border border-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-800"
            aria-label={isHidden(i) ? "Hiện câu" : "Ẩn câu"}
          >
            {isHidden(i) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <p className="text-sm leading-relaxed text-slate-200 pt-1">
            {s.speaker && <span className="font-bold text-cyan-300 mr-1">{s.speaker}</span>}
            {isHidden(i) ? (
              <span className="text-slate-600 tracking-widest select-none">••••••••••</span>
            ) : (
              s.text.split(/(\s+)/).map((tok, j) => {
                const w = tok.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
                if (!w || w.length < 2) return <React.Fragment key={j}>{tok}</React.Fragment>;
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setPicked({ word: w, context: s.text })}
                    className="rounded px-0.5 hover:bg-cyan-500/20 hover:text-cyan-200 focus:bg-cyan-500/20 focus:outline-none"
                  >
                    {tok}
                  </button>
                );
              })
            )}
          </p>
        </div>
      ))}
      <SaveWordDialog
        word={picked?.word ?? null}
        context={picked?.context}
        source="listening"
        sourceRef={sourceRef}
        onClose={() => setPicked(null)}
      />
    </div>
  );
};
