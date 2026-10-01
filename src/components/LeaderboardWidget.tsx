import React from "react";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Flame, Zap, Shield, ChevronUp, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const LeaderboardWidget: React.FC = () => {
  const { leaderboard, currentUserRank, leagueTitle, streakShields } = useGamification();

  return (
    <div className="card-duo bg-card p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              Bảng Xếp Hạng Tuần 🏆
            </h2>
            <p className="text-xs font-bold text-muted-foreground">
              Thi đấu tích XP để thăng hạng giải thưởng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* League Tag */}
          <div className={cn("px-3 py-1 rounded-full border text-xs font-black shadow-2xs", leagueTitle.color)}>
            {leagueTitle.name}
          </div>
          
          {/* Streak Shields Inventory Badge */}
          {streakShields > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-black" title="Thẻ bảo vệ chuỗi học">
              <Shield className="w-3.5 h-3.5 text-emerald-500 fill-emerald-400" />
              <span>x{streakShields} Bảo vệ</span>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2.5">
        {leaderboard.map((user) => {
          const isTop1 = user.rank === 1;
          const isTop2 = user.rank === 2;
          const isTop3 = user.rank === 3;
          const isCurrentUser = user.isCurrentUser;

          return (
            <div
              key={user.id}
              className={cn(
                "flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border-2 transition-all",
                isCurrentUser
                  ? "bg-blue-500/10 border-blue-500 shadow-md font-black"
                  : "bg-muted/20 border-border hover:bg-muted/40"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Rank Badge */}
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0">
                  {isTop1 ? (
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                  ) : isTop2 ? (
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 flex items-center justify-center font-extrabold">2</span>
                  ) : isTop3 ? (
                    <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-extrabold">3</span>
                  ) : (
                    <span className="text-muted-foreground font-bold">{user.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Avatar className="w-9 h-9 border-2 border-border shrink-0">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="font-bold">{user.name.substring(0, 2)}</AvatarFallback>
                </Avatar>

                {/* Name & Promotion Indicator */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm truncate", isCurrentUser ? "font-black text-blue-600 dark:text-blue-400" : "font-bold text-foreground")}>
                      {user.name}
                    </span>
                    {user.rank <= 3 && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <ChevronUp className="w-3 h-3 stroke-[3]" /> Thăng hạng
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                      <Flame className="w-3 h-3 fill-amber-500" /> {user.streak} ngày
                    </span>
                  </div>
                </div>
              </div>

              {/* XP */}
              <div className="flex items-center gap-1 text-sm font-black text-foreground shrink-0 pl-2">
                <Zap className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>{user.xp} XP</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promotion Zone Footer note */}
      <div className="text-center pt-2 border-t text-xs font-bold text-muted-foreground">
        Học sinh xếp hạng <span className="text-emerald-600 font-black">Top 3</span> sẽ được thăng hạng giải đấu vào cuối tuần! 🚀
      </div>
    </div>
  );
};
