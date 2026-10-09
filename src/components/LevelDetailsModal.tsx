import React from "react";
import { Award, Zap, Gift, Headphones, Target, FileCheck2, Gamepad2, X, Star, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LevelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentXp: number;
  levelInfo: {
    level: number;
    currentLevelXp: number;
    xpToNextLevel: number;
    progressPct: number;
    title: string;
  };
}

export const LevelDetailsModal: React.FC<LevelDetailsModalProps> = ({
  isOpen,
  onClose,
  currentXp,
  levelInfo,
}) => {
  if (!isOpen) return null;

  const tiers = [
    {
      level: "Level 1 - 3",
      name: "Tập Sự TOEIC",
      range: "0 - 299 XP",
      icon: Shield,
      color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/40 text-indigo-400",
      desc: "Khởi đầu hành trình, làm quen với giao diện và hệ thống luyện thi L-English, tích lũy từ vựng nền tảng.",
    },
    {
      level: "Level 4 - 6",
      name: "Chiến Binh TOEIC",
      range: "300 - 599 XP",
      icon: Zap,
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-400",
      desc: "Rèn luyện phản xạ nghe ngấm Part 1 & Part 2, tăng tốc độ giải đề.",
    },
    {
      level: "Level 7 - 9",
      name: "Bậc Thầy TOEIC",
      range: "600 - 999 XP",
      icon: Star,
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-400",
      desc: "Nắm vững toàn bộ mẹo và bẫy đề thi ETS, bứt phá band điểm 750+.",
    },
    {
      level: "Level 10+",
      name: "Huyền Thoại TOEIC",
      range: "1000+ XP",
      icon: Crown,
      color: "from-purple-500/20 to-purple-600/10 border-purple-500/40 text-purple-400",
      desc: "Đỉnh cao phản xạ TOEIC, tự tin chinh phục mục tiêu 850 - 990 TOEIC.",
    },
  ];

  const earnWays = [
    {
      title: "Đăng nhập hàng ngày",
      xp: "+10 XP",
      icon: Target,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    },
    {
      title: "Mở Rương Báu bí mật (1 lần/ngày)",
      xp: "+100 ~ 150 XP",
      icon: Gift,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
    {
      title: "Luyện Nghe Chép Chính Tả",
      xp: "+20 ~ 50 XP",
      icon: Headphones,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      title: "Luyện Nghe Từng Bước (Part 2 Coach)",
      xp: "+200 XP",
      icon: Zap,
      color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    },
    {
      title: "Luyện Đề Full Test 120p chuẩn ETS",
      xp: "+50 XP",
      icon: FileCheck2,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    },
    {
      title: "Chơi Game Phi Thuyền Bắn Từ Vựng",
      xp: "+20 ~ 40 XP",
      icon: Gamepad2,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1c] border-2 border-cyan-500/40 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-100 p-6 sm:p-8 space-y-6">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" />
              Hệ Thống Cấp Bậc & Danh Hiệu
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Lộ Trình Thăng Hạng & Mốc Kinh Nghiệm (XP)
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Tích lũy XP qua từng buổi học, hoàn thành nhiệm vụ để nâng cao danh hiệu học viên.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#030712] via-[#09152e] to-[#030712] border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
            <span className="text-slate-300">
              Cấp bậc hiện tại: <strong className="text-cyan-400">{levelInfo.title}</strong> (Level {levelInfo.level})
            </span>
            <span className="text-amber-400 font-extrabold">{currentXp} XP Tổng</span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Tiến độ cấp {levelInfo.level}</span>
              <span>Cần thêm {levelInfo.xpToNextLevel} XP để lên cấp tiếp theo</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Levels Tiers */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Các Mốc Cấp Bậc (Levels)
          </h4>
          <div className="space-y-2.5">
            {tiers.map((t) => {
              const isCurrent =
                (t.name.includes("Tân Thủ") && levelInfo.level === 1) ||
                (t.name.includes("Tập Sự") && levelInfo.level >= 2 && levelInfo.level <= 3) ||
                (t.name.includes("Chiến Binh") && levelInfo.level >= 4 && levelInfo.level <= 6) ||
                (t.name.includes("Bậc Thầy") && levelInfo.level >= 7 && levelInfo.level <= 9) ||
                (t.name.includes("Huyền Thoại") && levelInfo.level >= 10);

              const Icon = t.icon;

              return (
                <div
                  key={t.name}
                  className={`p-3.5 rounded-2xl border bg-gradient-to-r ${t.color} flex items-center justify-between gap-3 transition-all ${
                    isCurrent ? "ring-2 ring-cyan-400 shadow-lg" : "opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{t.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-300">
                          {t.level}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-white animate-pulse">
                            Hiện Tại
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{t.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-white shrink-0 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                    {t.range}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* How to earn XP */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Làm Sao Để Lên Cấp Nhanh? (Nguồn Nhận XP)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {earnWays.map((w) => {
              const Icon = w.icon;
              return (
                <div
                  key={w.title}
                  className="p-3 rounded-xl bg-[#030712]/80 border border-slate-800 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${w.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-200 truncate">{w.title}</span>
                  </div>
                  <span className="text-xs font-extrabold text-amber-400 shrink-0">{w.xp}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 rounded-xl"
          >
            Đã Hiểu
          </Button>
        </div>
      </div>
    </div>
  );
};
