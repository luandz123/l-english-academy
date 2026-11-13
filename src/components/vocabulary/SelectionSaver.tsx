import React, { useCallback, useRef, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import type { VocabSource } from "@/lib/api/vocabulary";
import { SaveWordDialog } from "./SaveWordDialog";

const MAX_WORDS = 4;

/** Câu chứa đoạn được chọn, lấy từ văn bản của khối cha. */
function contextOf(node: Node | null, picked: string): string | null {
  const text = (node?.parentElement?.closest("p,div,li,td")?.textContent ?? node?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const hit = text.split(/(?<=[.!?])\s+/).find((s) => s.toLowerCase().includes(picked.toLowerCase()));
  return hit ? hit.slice(0, 300) : null;
}

/**
 * Bôi đen 1–4 từ trong đoạn văn để lưu vào Sổ từ vựng (V11). Bọc quanh đoạn văn / câu hỏi đọc.
 */
export const SelectionSaver: React.FC<{ source?: VocabSource; sourceRef?: string; children: React.ReactNode; className?: string }> = ({
  source = "reading",
  sourceRef,
  children,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ word: string; context: string | null; x: number; y: number } | null>(null);
  const [picked, setPicked] = useState<{ word: string; context: string | null } | null>(null);

  const onUp = useCallback(() => {
    const sel = window.getSelection();
    const raw = sel?.toString().trim() ?? "";
    const word = raw.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
    if (!sel || !word || word.split(/\s+/).length > MAX_WORDS || !/[A-Za-z]/.test(word) || !ref.current) {
      setPending(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!ref.current.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    const box = ref.current.getBoundingClientRect();
    setPending({
      word,
      context: contextOf(range.startContainer, word),
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top,
    });
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} onMouseUp={onUp} onTouchEnd={() => setTimeout(onUp, 50)}>
      {children}
      {pending && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setPicked({ word: pending.word, context: pending.context });
            setPending(null);
          }}
          style={{ left: pending.x, top: Math.max(0, pending.y - 44) }}
          className="absolute z-20 -translate-x-1/2 min-h-[40px] px-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold shadow-lg inline-flex items-center gap-1 whitespace-nowrap"
        >
          <BookmarkPlus className="w-4 h-4" /> Lưu "{pending.word.length > 24 ? `${pending.word.slice(0, 24)}…` : pending.word}"
        </button>
      )}
      <SaveWordDialog
        word={picked?.word ?? null}
        context={picked?.context}
        source={source}
        sourceRef={sourceRef}
        onClose={() => setPicked(null)}
      />
    </div>
  );
};
