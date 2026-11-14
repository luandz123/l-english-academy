import React from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GrammarLevel } from "@/lib/api/grammar";

const OPTIONS: { level: GrammarLevel; label: string; hint: string }[] = [
  { level: "basic", label: "Mất gốc / dưới 450", hint: "Bắt đầu từ chủ điểm Cơ bản" },
  { level: "intermediate", label: "Khoảng 450–750", hint: "Ưu tiên chủ điểm Trung cấp" },
  { level: "advanced", label: "Trên 750", hint: "Tập trung chủ điểm Nâng cao" },
];

/** Hộp chọn nhanh "Bạn đang ở mức nào?" (G05). Đóng mà không chọn thì dùng Cơ bản. */
export const LevelPromptDialog: React.FC<{
  open: boolean;
  onChoose: (level: GrammarLevel) => void;
  onDismiss: () => void;
}> = ({ open, onChoose, onDismiss }) => (
  <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Bạn đang ở mức nào?</DialogTitle>
        <DialogDescription>Chọn mức gần đúng để Grammar Center gợi ý chủ điểm và bài tập hợp với bạn.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.level}
            type="button"
            onClick={() => onChoose(o.level)}
            className="w-full min-h-[56px] px-4 rounded-xl border border-slate-700 hover:border-cyan-500/60 text-left"
          >
            <span className="block text-sm font-bold text-white">{o.label}</span>
            <span className="block text-xs text-slate-400">{o.hint}</span>
          </button>
        ))}
      </div>
      <Link to="/diagnostic" className="text-sm text-cyan-400 hover:text-cyan-300 font-bold min-h-[40px] inline-flex items-center">
        Làm bài kiểm tra trình độ
      </Link>
    </DialogContent>
  </Dialog>
);
