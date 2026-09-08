import React from "react";
import { Link } from "react-router-dom";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Flame, Headphones, Star, CheckCircle2, Gift, ArrowRight, Zap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export const DailyQuestsWidget: React.FC = () => {
  const { xp, streak, levelInfo, quests, claimQuest } = useGamification();

  const completedQuestsCount = quests.filter(q => q.current >= q.target).length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Headphones":
        return <Headphones className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "Star":
        return <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "Flame":
        return <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />;
      default:
        return <Trophy className="w-5 h-5 text-amber-500" />;
    }
  };

  const getLink = (questId: string) => {
    if (questId === "quest_dictation") return "/#section-listening";
    if (questId === "quest_vocab") return "/vocab";
    return "/#section-video";
  };

  return (
    <div className="space-y-4">
      {/* Level & XP Overview Card */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-500 shrink-0">
              <Award className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-foreground">Level {levelInfo.level}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${levelInfo.color}`}>
                  {levelInfo.title}
                </span>
              </div>
              <p className="text-xs font-bold text-muted-foreground mt-0.5">
                Tổng điểm tích lũy: <span className="text-foreground font-black">{xp} XP ⚡</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              {streak} ngày học liên tiếp
            </span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-black">
            <span className="text-muted-foreground">Tiến trình Level {levelInfo.level}</span>
            <span className="text-primary">{levelInfo.currentLevelXp} / 100 XP (Còn {levelInfo.xpToNextLevel} XP lên Cấp)</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5 border">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${levelInfo.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Quests Card */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">Nhiệm Vụ Hàng Ngày 🎯</h2>
              <p className="text-xs font-bold text-muted-foreground">Hoàn thành để nhận XP thưởng mỗi ngày</p>
            </div>
          </div>

          <span className="badge-duo badge-blue font-black text-xs">
            {completedQuestsCount}/{quests.length} Đã xong
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {quests.map(quest => {
            const isDone = quest.current >= quest.target;

            return (
              <div 
                key={quest.id} 
                className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 ${
                  quest.claimed
                    ? "bg-muted/30 border-border opacity-85"
                    : isDone
                    ? "bg-amber-500/10 border-amber-400/50 shadow-sm"
                    : "bg-white dark:bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-muted/60 border shrink-0">
                        {getIcon(quest.icon)}
                      </div>
                      <span className="font-extrabold text-sm text-foreground leading-tight">
                        {quest.title}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 shrink-0">
                      <Zap className="w-3 h-3 fill-current" />
                      +{quest.xpReward} XP
                    </span>
                  </div>

                  <p className="text-xs font-medium text-muted-foreground line-clamp-2">
                    {quest.description}
                  </p>
                </div>

                {/* Progress bar and Button */}
                <div className="space-y-2.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black text-muted-foreground">
                      <span>Tiến độ</span>
                      <span className={isDone ? "text-emerald-600 dark:text-emerald-400" : ""}>
                        {quest.current}/{quest.target}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden border">
                      <div 
                        className={`h-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {quest.claimed ? (
                    <Button disabled size="sm" className="w-full font-bold text-xs bg-muted text-muted-foreground border">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Đã nhận thưởng
                    </Button>
                  ) : isDone ? (
                    <Button 
                      size="sm" 
                      onClick={() => claimQuest(quest.id, quest.xpReward)}
                      className="btn-3d bg-[var(--duo-orange)] hover:bg-[var(--duo-orange)]/90 border-[#E58700] text-white w-full font-black text-xs animate-bounce"
                    >
                      <Gift className="w-3.5 h-3.5 mr-1.5" /> Nhận +{quest.xpReward} XP
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="w-full font-extrabold text-xs hover:bg-primary hover:text-white border-primary/30">
                      <Link to={getLink(quest.id)}>
                        Làm ngay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
