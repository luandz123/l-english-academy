import React, { useState } from "react";
import { SpeakingRoom, EnglishLevel, SPEAKING_TOPICS } from "@/types/speaking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Users,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Lock,
  ArrowRight,
  Sparkles,
  Inbox,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpeakingRoomListCardProps {
  rooms: SpeakingRoom[];
  isLoading: boolean;
  onRefresh: () => void;
  onJoinRoom: (room: SpeakingRoom, passcode?: string) => void;
  className?: string;
}

export const SpeakingRoomListCard: React.FC<SpeakingRoomListCardProps> = ({
  rooms,
  isLoading,
  onRefresh,
  onJoinRoom,
  className,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [hasSlotsOnly, setHasSlotsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Private room join modal state
  const [privateModalOpen, setPrivateModalOpen] = useState(false);
  const [privatePasscode, setPrivatePasscode] = useState("");
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<SpeakingRoom | null>(null);

  // Filter in-memory
  const filteredRooms = rooms.filter((room) => {
    if (levelFilter !== "all" && room.english_level !== levelFilter) return false;
    if (topicFilter !== "all" && !room.topics.includes(topicFilter)) return false;
    if (hasSlotsOnly && (room.current_members || 0) >= room.capacity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = room.name.toLowerCase().includes(q);
      const matchTopic = room.topics.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchTopic) return false;
    }
    return true;
  });

  const handleJoinClick = (room: SpeakingRoom) => {
    if (room.visibility === "private") {
      setSelectedPrivateRoom(room);
      setPrivatePasscode("");
      setPrivateModalOpen(true);
    } else {
      onJoinRoom(room);
    }
  };

  const handlePrivateJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrivateRoom || !privatePasscode.trim()) return;
    onJoinRoom(selectedPrivateRoom, privatePasscode.trim().toUpperCase());
    setPrivateModalOpen(false);
  };

  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <span>Phòng luyện nói đang hoạt động</span>
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {rooms.length} phòng
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">Chọn phòng còn chỗ và bấm Tham gia để nói chuyện</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5 rounded-xl border-border hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-emerald-500")} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên hoặc chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs rounded-xl"
          />
        </div>

        {/* Level Filter */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="h-9 text-xs px-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Tất cả trình độ</option>
          <option value="A1">Trình độ A1</option>
          <option value="A2">Trình độ A2</option>
          <option value="B1">Trình độ B1</option>
          <option value="B2">Trình độ B2</option>
          <option value="C1">Trình độ C1</option>
          <option value="C2">Trình độ C2</option>
        </select>

        {/* Slots Filter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 px-2">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={hasSlotsOnly}
              onChange={(e) => setHasSlotsOnly(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span>Chỉ phòng còn chỗ</span>
          </label>
        </div>
      </div>

      {/* Room list */}
      <div className="space-y-2.5">
        {isLoading && rooms.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Đang tải danh sách phòng luyện nói...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed rounded-2xl border-border bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {rooms.length === 0 ? "Chưa có phòng nào đang mở" : "Không tìm thấy phòng phù hợp"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
                {rooms.length === 0
                  ? "Hãy là người đầu tiên tạo phòng luyện nói để bạn bè cùng tham gia thảo luận!"
                  : "Thử đổi bộ lọc trình độ, xóa từ khóa tìm kiếm hoặc tự tạo phòng mới."}
              </p>
            </div>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const current = room.current_members || 0;
            const max = room.capacity;
            const isFull = current >= max;
            const isAvailable = current < max;

            return (
              <div
                key={room.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                  isFull
                    ? "bg-slate-50/60 dark:bg-slate-900/40 border-border/60 opacity-80"
                    : "bg-card hover:bg-slate-50/80 dark:hover:bg-slate-900/60 border-border hover:border-emerald-500/40 hover:shadow-sm"
                )}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px] font-bold px-2 py-0 border",
                        room.english_level === "A1" || room.english_level === "A2"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : room.english_level === "B1" || room.english_level === "B2"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      )}
                    >
                      {room.english_level}
                    </Badge>

                    <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {room.name}
                    </h4>

                    {room.visibility === "private" && (
                      <span title="Phòng riêng tư" className="inline-flex items-center">
                        <Lock className="w-3.5 h-3.5 text-purple-500" />
                      </span>
                    )}
                  </div>

                  {/* Topic Chips */}
                  <div className="flex flex-wrap items-center gap-1">
                    {room.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Participant avatars preview */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex -space-x-1.5 overflow-hidden items-center">
                      {(room.members || []).slice(0, 4).map((m, idx) => (
                        <Avatar
                          key={m.id || idx}
                          className="w-5 h-5 border border-background ring-1 ring-border"
                        >
                          {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name} />}
                          <AvatarFallback className="text-[9px] bg-slate-200 dark:bg-slate-700">
                            {(m.full_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    <span
                      className={cn(
                        "text-xs font-semibold flex items-center gap-1",
                        isFull
                          ? "text-rose-600 dark:text-rose-400"
                          : current === max - 1
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      <Users className="w-3 h-3" />
                      <span>
                        {current}/{max} người
                      </span>
                      {isFull && <span className="text-[10px] font-normal">(Đã đầy)</span>}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isFull}
                    onClick={() => handleJoinClick(room)}
                    className={cn(
                      "h-9 px-4 text-xs font-semibold rounded-xl gap-1.5 transition-all w-full sm:w-auto",
                      isFull
                        ? "bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-border cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    )}
                  >
                    <span>{isFull ? "Phòng đã đầy" : "Tham gia"}</span>
                    {!isFull && <ArrowRight className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Private Room Passcode Dialog */}
      <Dialog open={privateModalOpen} onOpenChange={setPrivateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-5 h-5 text-purple-600" />
              <span>Nhập mã tham gia phòng riêng tư</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Phòng &ldquo;{selectedPrivateRoom?.name}&rdquo; yêu cầu mã passcode để tham gia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePrivateJoinSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Input
                placeholder="Nhập mã 6 ký tự (Ví dụ: SPEAK9)..."
                value={privatePasscode}
                onChange={(e) => setPrivatePasscode(e.target.value.toUpperCase())}
                maxLength={10}
                autoFocus
                className="font-mono text-center tracking-widest text-base font-bold h-11"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrivateModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!privatePasscode.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Xác nhận vào phòng
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
