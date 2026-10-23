import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EnglishLevel, ENGLISH_LEVELS } from "@/types/speaking";
import { Clock, Flame, Mic, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeakingUserInfoCardProps {
  displayName: string;
  avatarUrl?: string | null;
  englishLevel: EnglishLevel;
  totalSpeakingMinutes: number;
  className?: string;
}

export const SpeakingUserInfoCard: React.FC<SpeakingUserInfoCardProps> = ({
  displayName,
  avatarUrl,
  englishLevel,
  totalSpeakingMinutes,
  className,
}) => {
  const levelMeta = ENGLISH_LEVELS.find((l) => l.level === englishLevel);
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "U";

  const hours = Math.floor(totalSpeakingMinutes / 60);
  const remainingMinutes = totalSpeakingMinutes % 60;
  const timeFormatted =
    hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes} phút`;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-md relative overflow-hidden",
        className
      )}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex items-center gap-3.5">
        <div className="relative">
          <Avatar className="w-14 h-14 border-2 border-emerald-500/40 ring-2 ring-slate-800">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-slate-800 text-emerald-400 font-bold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-slate-100 text-base truncate">{displayName}</h3>
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 border",
                levelMeta?.badgeColor || "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              )}
            >
              {englishLevel} • {levelMeta?.label.split(" - ")[1] || "Intermediate"}
            </Badge>

            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Đã luyện: <strong className="text-slate-200">{timeFormatted}</strong></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
