import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EnglishLevel, SpeakingRoom } from "@/types/speaking";
import { matchSpeakingRoom } from "@/services/speakingService";
import { 
  Compass, 
  Loader2, 
  XCircle, 
  Sparkles, 
  AlertCircle, 
  PlusCircle, 
  CheckCircle2, 
  Users 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeakingMatchmakerProps {
  level: EnglishLevel;
  topics: string[];
  onRoomMatched: (room: SpeakingRoom) => void;
  onRequestCreateRoom: () => void;
  className?: string;
}

export const SpeakingMatchmaker: React.FC<SpeakingMatchmakerProps> = ({
  level,
  topics,
  onRoomMatched,
  onRequestCreateRoom,
  className,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "no-match" | "found">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer when searching
  useEffect(() => {
    let interval: any = null;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleStartSearch = async () => {
    setIsSearching(true);
    setSearchStatus("searching");
    setErrorMessage(null);

    // Minimum 1.5s search duration so user experiences natural matching animation
    const startTime = Date.now();

    try {
      const result = await matchSpeakingRoom(level, topics);
      const elapsed = Date.now() - startTime;
      const delayRemaining = Math.max(0, 1500 - elapsed);

      setTimeout(() => {
        setIsSearching(false);
        if (result.matched && result.room) {
          setSearchStatus("found");
          setTimeout(() => {
            onRoomMatched(result.room!);
          }, 800);
        } else {
          setSearchStatus("no-match");
          if (result.error) {
            setErrorMessage(result.error);
          }
        }
      }, delayRemaining);
    } catch (err: any) {
      setIsSearching(false);
      setSearchStatus("no-match");
      setErrorMessage(err.message || "Lỗi ghép cặp");
    }
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchStatus("idle");
    setErrorMessage(null);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {searchStatus === "idle" && (
        <Button
          type="button"
          onClick={handleStartSearch}
          className="w-full h-13 text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 gap-2.5 group"
        >
          <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          <span>Bắt đầu ghép cặp luyện nói</span>
          <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
        </Button>
      )}

      {searchStatus === "searching" && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 text-center space-y-3 animate-in fade-in-50">
          <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center relative">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Đang tìm phòng luyện nói phù hợp...
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trình độ: <strong className="text-emerald-600 dark:text-emerald-400">{level}</strong> •{" "}
              {topics.length > 0 ? `${topics.length} chủ đề` : "Tất cả chủ đề"} ({searchSeconds}s)
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelSearch}
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs h-8 gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Hủy tìm kiếm</span>
          </Button>
        </div>
      )}

      {searchStatus === "found" && (
        <div className="p-4 rounded-xl border border-emerald-500 bg-emerald-500/10 text-center space-y-2 animate-in zoom-in-95">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Đã tìm thấy phòng phù hợp!
          </h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Đang chuyển bạn vào phòng luyện nói...
          </p>
        </div>
      )}

      {searchStatus === "no-match" && (
        <div className="p-4 rounded-xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/20 space-y-3 animate-in fade-in-50">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h5 className="font-semibold text-amber-900 dark:text-amber-200">
                Chưa tìm thấy phòng phù hợp ngay lúc này
              </h5>
              <p className="text-amber-800 dark:text-amber-300">
                {errorMessage ||
                  "Hiện chưa có phòng mở cùng trình độ hoặc chủ đề còn chỗ trống. Bạn có thể tự tạo một phòng mới để các bạn khác cùng vào luyện nói!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={onRequestCreateRoom}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1.5 flex-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo phòng ngay</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartSearch}
              className="text-xs h-8 flex-1"
            >
              <span>Thử tìm lại</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
