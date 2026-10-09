import React from "react";
import { Trophy, Clock, Award, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRank: number;
  totalStudyHours: string;
  leaderboardData: Array<[string, number]>;
  currentUserId?: string;
  currentUserName: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  userRank,
  totalStudyHours,
  leaderboardData,
  currentUserId,
  currentUserName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1c] border-2 border-yellow-500/40 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Bảng Vàng Học Viên
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Xếp Hạng Thời Gian Làm Bài
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Chỉ tính thời gian học viên thực sự vào làm đề thi và bài tập trên hệ thống L-English.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User rank banner */}
        <div className="p-4 mx-6 my-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-orange-500/10 border border-yellow-500/30 flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 font-black text-lg">
              #{userRank < 10 ? `0${userRank}` : userRank}
            </div>
            <div>
              <p className="text-xs font-bold text-yellow-300">Vị trí của bạn</p>
              <h4 className="text-sm font-extrabold text-white">{currentUserName}</h4>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Thời gian làm bài</p>
            <p className="text-sm font-black text-white">{totalStudyHours} giờ</p>
          </div>
        </div>

        {/* Leaderboard rows */}
        <div className="px-6 py-2 overflow-y-auto space-y-2 flex-1 relative z-10">
          {leaderboardData.slice(0, 10).map(([uid, secs], idx) => {
            const isMe = uid === currentUserId;
            const rank = idx + 1;
            const hours = (secs / 3600).toFixed(1);

            return (
              <div
                key={uid}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                  isMe
                    ? "bg-yellow-500/15 border-yellow-500/40 text-white font-bold"
                    : "bg-[#030712]/70 border-slate-800/80 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 text-center font-black ${
                      rank === 1
                        ? "text-yellow-400 text-sm"
                        : rank === 2
                        ? "text-slate-300 text-sm"
                        : rank === 3
                        ? "text-amber-600 text-sm"
                        : "text-slate-500"
                    }`}
                  >
                    #{rank < 10 ? `0${rank}` : rank}
                  </span>
                  <span className="truncate max-w-[180px]">
                    {isMe ? `${currentUserName} (Bạn)` : `Học viên ${uid.slice(0, 6)}...`}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-slate-300 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{hours} giờ</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#030712]/90 flex justify-end relative z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
