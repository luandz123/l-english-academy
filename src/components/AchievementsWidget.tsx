import React from "react";
import { useGamification, Badge } from "@/hooks/useGamification";
import { Award, Headphones, BookOpen, Flame, Trophy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const AchievementsWidget: React.FC = () => {
  const { badges, claimBadge } = useGamification();

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case "Headphones": return <Headphones className="w-6 h-6" />;
      case "BookOpen": return <BookOpen className="w-6 h-6" />;
      case "Flame": return <Flame className="w-6 h-6" />;
      default: return <Trophy className="w-6 h-6" />;
    }
  };

  return (
    <div className="card-duo bg-card border-2 p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center text-purple-500">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            Huy Hiệu Thành Tựu 🏅
          </h2>
          <p className="text-xs font-bold text-muted-foreground">
            Chinh phục cột mốc để mở khóa danh hiệu & nhận XP thưởng
          </p>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {badges.map((badge) => {
          const isUnlocked = badge.unlocked;
          const isClaimed = badge.claimed;
          const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));

          return (
            <div
              key={badge.id}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 relative overflow-hidden",
                isUnlocked
                  ? "bg-purple-500/5 border-purple-400/40 shadow-xs"
                  : "bg-muted/20 border-border opacity-80"
              )}
            >
              <div className="flex items-start gap-3.5">
                {/* Badge Icon Container */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-xs transition-transform",
                    isUnlocked
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-400"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {getBadgeIcon(badge.icon)}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-black text-sm text-foreground truncate">
                    {badge.title}
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress & Action */}
              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Tiến độ</span>
                  <span>{badge.current}/{badge.target}</span>
                </div>
                <Progress value={pct} className="h-2 rounded-full" />

                {isUnlocked ? (
                  isClaimed ? (
                    <div className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/10 text-emerald-600 text-xs font-black rounded-xl border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" /> Đã nhận +{badge.xpReward} XP
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => claimBadge(badge.id, badge.xpReward)}
                      className="btn-3d btn-3d-yellow w-full py-2 text-xs font-black rounded-xl"
                    >
                      <Gift className="w-3.5 h-3.5 mr-1.5" /> Nhận +{badge.xpReward} XP
                    </Button>
                  )
                ) : (
                  <div className="text-center text-[11px] font-extrabold text-muted-foreground py-1 bg-muted/30 rounded-xl">
                    Chưa đạt cột mốc
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
