import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { REPORT_REASON_LABELS, reportExamIssue, type ReportReason } from "@/lib/api/practice";

/** Báo lỗi đề hoặc câu hỏi (E06 §6.4). Admin xem ở trang Kiểm duyệt đề. */
export const ReportIssueButton: React.FC<{
  testId?: number;
  questionId?: number;
  compact?: boolean;
  className?: string;
}> = ({ testId, questionId, compact, className }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("wrong_answer");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const send = useMutation({
    mutationFn: () => reportExamIssue({ test_id: testId, question_id: questionId, reason, message: message.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      setMessage("");
      toast({ title: "Đã gửi báo lỗi", description: "Cảm ơn bạn! Đội ngũ nội dung sẽ kiểm tra sớm." });
    },
    onError: (err) => toast({ title: "Chưa gửi được", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Báo lỗi"
        className={cn(
          "flex items-center gap-1.5 text-xs font-bold min-h-[36px] px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors",
          className,
        )}
      >
        <Flag className="w-4 h-4" />
        {!compact && <span>Báo lỗi</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{questionId ? "Báo lỗi câu hỏi" : "Báo lỗi đề thi"}</DialogTitle>
            <DialogDescription>Chọn loại lỗi và mô tả ngắn để đội ngũ kiểm tra lại nội dung.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(REPORT_REASON_LABELS) as ReportReason[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  "min-h-[40px] px-3 rounded-xl border text-xs font-bold text-left transition-colors",
                  reason === r ? "border-cyan-500 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-300 hover:bg-slate-800",
                )}
              >
                {REPORT_REASON_LABELS[r]}
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            placeholder="Mô tả lỗi (không bắt buộc)"
            className="min-h-[90px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => send.mutate()} disabled={send.isPending}>
              {send.isPending ? "Đang gửi..." : "Gửi báo lỗi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
