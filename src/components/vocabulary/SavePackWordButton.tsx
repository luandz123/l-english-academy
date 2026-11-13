import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { getSavedWordKeys, saveWordsBatch, wordKeyOf } from "@/lib/api/vocabulary";

/** Nút lưu một từ của bộ flashcard vào Sổ từ vựng (V07). */
export const SavePackWordButton: React.FC<{ packWordId: number; word: string; className?: string }> = ({ packWordId, word, className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: saved } = useQuery({ queryKey: ["vocab-saved-keys", user?.id], queryFn: getSavedWordKeys, enabled: !!user });
  const isSaved = saved?.has(wordKeyOf(word)) ?? false;
  const save = useMutation({
    mutationFn: () => saveWordsBatch({ pack_word_ids: [packWordId] }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocab-saved-keys"] });
      void queryClient.invalidateQueries({ queryKey: ["vocab-summary"] });
      toast({ title: `Đã lưu "${word}" vào Sổ từ vựng` });
    },
    onError: (err) => toast({ title: "Chưa lưu được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });
  return (
    <button
      type="button"
      disabled={isSaved || save.isPending}
      onClick={(e) => {
        e.stopPropagation();
        save.mutate();
      }}
      className={cn(
        "min-h-[40px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5",
        isSaved ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-300" : "border-border text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
      {isSaved ? "Đã lưu vào sổ" : "Lưu vào Sổ từ vựng"}
    </button>
  );
};
