import React, { useState } from "react";
import { EnglishLevel, RoomVisibility, SpeakingRoom, SPEAKING_TOPICS } from "@/types/speaking";
import { createSpeakingRoom, generateRandomRoomPasscode } from "@/services/speakingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Lock, 
  Globe, 
  KeyRound, 
  PlusCircle, 
  Loader2, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface SpeakingCreateRoomCardProps {
  defaultLevel: EnglishLevel;
  defaultTopics: string[];
  onRoomCreated: (room: SpeakingRoom) => void;
  className?: string;
}

export const SpeakingCreateRoomCard: React.FC<SpeakingCreateRoomCardProps> = ({
  defaultLevel,
  defaultTopics,
  onRoomCreated,
  className,
}) => {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<EnglishLevel>(defaultLevel);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    defaultTopics.length > 0 ? defaultTopics.slice(0, 3) : ["Daily Conversation"]
  );
  const [capacity, setCapacity] = useState<number>(4);
  const [visibility, setVisibility] = useState<RoomVisibility>("public");
  const [passcode, setPasscode] = useState<string>(() => generateRandomRoomPasscode(6));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const regeneratePasscode = () => {
    setPasscode(generateRandomRoomPasscode(6));
  };

  const copyPasscode = () => {
    navigator.clipboard.writeText(passcode);
    setCopiedPasscode(true);
    toast({
      title: "Đã sao chép mã phòng",
      description: `Mã tham gia: ${passcode}`,
    });
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const toggleTopic = (t: string) => {
    if (selectedTopics.includes(t)) {
      if (selectedTopics.length > 1) {
        setSelectedTopics(selectedTopics.filter((item) => item !== t));
      }
    } else {
      if (selectedTopics.length < 3) {
        setSelectedTopics([...selectedTopics, t]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Thiếu tên phòng",
        description: "Vui lòng nhập tên cho phòng luyện nói của bạn.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createSpeakingRoom({
        name: name.trim(),
        english_level: level,
        topics: selectedTopics,
        capacity,
        visibility,
        passcode: visibility === "private" ? passcode : undefined,
      });

      if (result.success && result.room) {
        toast({
          title: "Tạo phòng thành công! 🎉",
          description: `Phòng "${result.room.name}" đã sẵn sàng đón thành viên.`,
        });
        onRoomCreated(result.room);
      } else {
        toast({
          title: "Không thể tạo phòng",
          description: result.error || "Vui lòng kiểm tra lại thông tin và thử lại.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi kết nối",
        description: err.message || "Đã xảy ra lỗi không xác định.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <PlusCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              Tạo phòng luyện nói mới
            </h3>
            <p className="text-xs text-muted-foreground">Mở phòng để bạn bè cùng tham gia đàm thoại</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tên phòng */}
        <div className="space-y-1.5">
          <Label htmlFor="room-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tên phòng <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="room-name"
            placeholder="Ví dụ: Daily English & Coffee Talk..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            className="h-10 text-sm rounded-xl focus-visible:ring-emerald-500"
          />
        </div>

        {/* Trình độ & Sĩ số */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Trình độ mục tiêu
            </Label>
            <div className="grid grid-cols-6 gap-1">
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as EnglishLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-bold border transition-colors",
                    level === lvl
                      ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:bg-slate-100"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Số người tối đa (2–5)
            </Label>
            <div className="grid grid-cols-4 gap-1">
              {[2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCapacity(num)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1",
                    capacity === num
                      ? "bg-emerald-600 text-white border-transparent"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:bg-slate-100"
                  )}
                >
                  <Users className="w-3 h-3 opacity-70" />
                  <span>{num}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chủ đề (chọn 1-3) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chủ đề phòng (chọn tối đa 3)
            </Label>
            <span className="text-[11px] text-muted-foreground">{selectedTopics.length}/3 đã chọn</span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
            {SPEAKING_TOPICS.slice(0, 10).map((t) => {
              const isSelected = selectedTopics.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopic(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    isSelected
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400"
                      : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chế độ Công khai / Riêng tư */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Chế độ hiển thị
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                visibility === "public"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200"
                  : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
              )}
            >
              <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold leading-none">Công khai</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ai cũng có thể tìm & tham gia</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                visibility === "private"
                  ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200"
                  : "border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
              )}
            >
              <Lock className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold leading-none">Riêng tư</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cần mã passcode để vào</p>
              </div>
            </button>
          </div>

          {visibility === "private" && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-3 animate-in fade-in-50">
              <div className="flex items-center gap-2 min-w-0">
                <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">
                    Mã tham gia phòng:
                  </span>
                  <span className="font-mono font-bold tracking-widest text-sm text-purple-950 dark:text-purple-100">
                    {passcode}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={regeneratePasscode}
                  className="w-8 h-8 rounded-lg hover:bg-purple-200/50 dark:hover:bg-purple-900/50"
                  title="Tạo mã mới"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={copyPasscode}
                  className="w-8 h-8 rounded-lg hover:bg-purple-200/50 dark:hover:bg-purple-900/50"
                  title="Sao chép mã"
                >
                  {copiedPasscode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo phòng...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Tạo phòng và bắt đầu nói</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
};
