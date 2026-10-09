import React, { useState, useEffect } from "react";
import { useGamification, ChestReward } from "@/hooks/useGamification";
import { Gift, Sparkles, Trophy, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useSound";

interface MysteryChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed?: (reward: ChestReward) => void;
}

export const MysteryChestModal: React.FC<MysteryChestModalProps> = ({ isOpen, onClose, onRewardClaimed }) => {
  const { openChestReward } = useGamification();
  const { playSound } = useSound();
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const isAlreadyClaimedToday = typeof window !== "undefined" && localStorage.getItem("lenglish_last_chest_date") === todayStr;

  // Reset local state whenever modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedChest(null);
      setReward(null);
      setIsOpening(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenChest = (index: number) => {
    if (selectedChest !== null || isOpening || reward !== null || isAlreadyClaimedToday) return;

    setSelectedChest(index);
    setIsOpening(true);

    try { playSound?.("correct"); } catch { /* ignore audio error */ }

    setTimeout(() => {
      const res = openChestReward();
      if (!res) {
        setIsOpening(false);
        return;
      }
      try {
        localStorage.setItem("lenglish_last_chest_date", todayStr);
      } catch (e) {
        console.error(e);
      }
      setReward(res);
      setIsOpening(false);
      onRewardClaimed?.(res);
    }, 900);
  };

  const handleClose = () => {
    setSelectedChest(null);
    setReward(null);
    setIsOpening(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#070e1c] border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-6 relative overflow-hidden text-slate-100">
        
        {/* Decorative sparkles background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {isAlreadyClaimedToday && !reward ? (
          <div className="space-y-5 py-4">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Bạn Đã Mở Rương Hôm Nay Rồi! 🎁
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                Mỗi ngày bạn chỉ có thể mở rương 1 lần. Hãy quay trở lại vào ngày mai (sau 00:00) để nhận thêm quà may mắn nhé!
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-slate-700"
            >
              Đã hiểu, quay lại bàn học
            </Button>
          </div>
        ) : !reward ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PHẦN THƯỞNG BIẾN ĐỔI MAY MẮN</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground drop-shadow-sm">
                🎁 Mở Rương Báu Bí Mật!
              </h2>
              <p className="text-sm font-bold text-muted-foreground">
                Chọn 1 trong 3 rương dưới đây để nhận phần thưởng ngẫu nhiên!
              </p>
            </div>

            {/* 3 Chests Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 py-4">
              {[0, 1, 2].map((idx) => {
                const isThisSelected = selectedChest === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleOpenChest(idx)}
                    disabled={selectedChest !== null}
                    className={`group relative p-4 sm:p-6 rounded-2xl border-4 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                      isThisSelected
                        ? "bg-amber-400/20 border-amber-400 scale-105 shadow-xl animate-pulse"
                        : selectedChest !== null
                        ? "bg-muted/40 border-border opacity-50 cursor-not-allowed"
                        : "bg-gradient-to-b from-amber-500/10 to-amber-500/20 border-amber-400/60 hover:border-amber-400 hover:scale-105 shadow-md hover:shadow-lg"
                    }`}
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-400/30 flex items-center justify-center text-amber-500 border-2 border-amber-400/50 group-hover:rotate-6 transition-transform">
                      <Gift className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-black text-foreground">
                      {isThisSelected && isOpening ? "Đang mở..." : `Rương #${idx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Reward Reveal View */
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-amber-400/20 border-4 border-amber-400 flex items-center justify-center mx-auto text-amber-500 shadow-lg">
              {reward.type === "shield" ? (
                <ShieldCheck className="w-12 h-12 text-emerald-500" />
              ) : reward.type === "boost" ? (
                <Zap className="w-12 h-12 text-amber-500 fill-amber-400" />
              ) : (
                <Trophy className="w-12 h-12 text-amber-500" />
              )}
            </div>

            <div className="space-y-2">
              <span className="badge-duo badge-yellow font-black text-xs">
                🎉 CHÚC MỪNG BẠN!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                {reward.title}
              </h2>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {reward.description}
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="btn-3d btn-3d-primary w-full py-3 text-base font-black rounded-2xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> Nhận thưởng và tiếp tục
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
