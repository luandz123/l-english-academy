import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";
import { LEVEL_LABELS, lookupWord, saveWord, type VocabSource } from "@/lib/api/vocabulary";

/**
 * Tra nhanh một từ và lưu vào Sổ từ vựng (L08/V11). Nghĩa lấy từ kho (600 từ TOEIC, bộ flashcard);
 * kho chưa có thì học viên tự nhập nghĩa. Câu ngữ cảnh được lưu kèm.
 */
export const SaveWordDialog: React.FC<{
  word: string | null;
  context?: string | null;
  source: VocabSource;
  sourceRef?: string;
  onClose: () => void;
}> = ({ word, context, source, sourceRef, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [meaning, setMeaning] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["vocab-lookup", word],
    queryFn: () => lookupWord(word!),
    enabled: !!word,
  });
  useEffect(() => setMeaning(""), [word]);

  const save = useMutation({
    mutationFn: () =>
      saveWord({
        word: word!,
        source,
        source_ref: sourceRef,
        example: context ?? undefined,
        definition_vi: data?.found ? undefined : meaning.trim(),
      }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["vocab-lookup", word] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-saved-keys"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-notebook"] });
      toast({ title: r.already ? `"${r.word.word}" đã có trong Sổ từ vựng` : `Đã lưu "${r.word.word}" vào Sổ từ vựng` });
      onClose();
    },
    onError: (err) => toast({ title: "Chưa lưu được từ", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  const found = data?.found;
  const saved = data?.saved;
  return (
    <Dialog open={!!word} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {found?.word ?? word}
            <button
              type="button"
              onClick={() => void soundAudioPlayer.speakText(found?.word ?? word ?? "")}
              className="w-9 h-9 rounded-lg border border-slate-700 flex items-center justify-center text-cyan-300"
              aria-label="Nghe phát âm"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </DialogTitle>
          <DialogDescription>{found?.phonetic ?? "Lưu từ vào Sổ từ vựng để ôn theo lịch"}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-3 text-sm">
            {found ? (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
                <div className="font-bold text-white">{found.definition_vi}</div>
                {found.definition_en && <div className="text-slate-400">{found.definition_en}</div>}
                {found.level && <div className="text-xs text-cyan-300">{LEVEL_LABELS[found.level]}{found.part ? ` · hay gặp ở Part ${found.part}` : ""}</div>}
              </div>
            ) : (
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Kho chưa có nghĩa của từ này — nhập nghĩa tiếng Việt</span>
                <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} maxLength={300} placeholder="Nghĩa của từ" autoFocus />
              </label>
            )}
            {context && (
              <div className="text-xs text-slate-400">
                Ngữ cảnh: <span className="italic text-slate-300">{context}</span>
              </div>
            )}
            {saved && (
              <div className="text-xs text-emerald-300 flex items-center gap-1">
                <BookmarkCheck className="w-4 h-4" /> Đã có trong sổ —{" "}
                <Link to="/vocabulary" className="underline">mở Sổ từ vựng</Link>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          {!saved && (
            <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading || (!found && !meaning.trim())}>
              {save.isPending ? "Đang lưu..." : "Lưu vào sổ"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
