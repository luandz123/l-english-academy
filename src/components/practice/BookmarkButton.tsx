import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { setQuestionBookmark } from "@/lib/api/practice";

/** Lưu câu vào Sổ câu sai (bookmark thủ công, kể cả câu trả lời đúng). */
export const BookmarkButton: React.FC<{
  questionId: number;
  bookmarked: boolean;
  compact?: boolean;
  onChange?: (bookmarked: boolean) => void;
}> = ({ questionId, bookmarked, compact, onChange }) => {
  const [on, setOn] = useState(bookmarked);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useEffect(() => setOn(bookmarked), [bookmarked]);

  const mutation = useMutation({
    mutationFn: (next: boolean) => setQuestionBookmark(questionId, next),
    onMutate: (next) => setOn(next),
    onSuccess: (_d, next) => {
      onChange?.(next);
      void queryClient.invalidateQueries({ queryKey: ["practice-bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["mistake-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["mistakes"] });
      toast({ title: next ? "Đã lưu vào Sổ câu sai" : "Đã bỏ lưu câu này" });
    },
    onError: (err, next) => {
      setOn(!next);
      toast({ title: "Không lưu được câu hỏi", description: getFriendlyErrorMessage(err), variant: "destructive" });
    },
  });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate(!on);
      }}
      disabled={mutation.isPending}
      title={on ? "Bỏ lưu câu hỏi" : "Lưu câu hỏi để ôn lại"}
      aria-pressed={on}
      className={cn(
        "flex items-center gap-1.5 text-xs font-bold min-h-[36px] px-3 rounded-xl border transition-all",
        on ? "border-amber-500 bg-amber-500/15 text-amber-300" : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800",
      )}
    >
      {on ? <BookmarkCheck className="w-4 h-4 fill-amber-400 text-amber-400" /> : <BookmarkPlus className="w-4 h-4" />}
      {!compact && <span>{on ? "Đã lưu" : "Lưu câu"}</span>}
    </button>
  );
};
