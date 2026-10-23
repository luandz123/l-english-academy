import React, { useState, useEffect } from "react";
import { SpeakingRoom, SpeakingMember } from "@/types/speaking";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { getPromptsForTopics } from "@/data/speakingPrompts";
import { leaveSpeakingRoom, closeSpeakingRoom } from "@/services/speakingService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  PhoneOff,
  Clock,
  Sparkles,
  Users,
  Copy,
  Check,
  Lightbulb,
  Radio,
  Lock,
  Globe,
  Share2,
  AlertTriangle,
  Volume2,
  RefreshCw,
  Crown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SpeakingActiveRoomProps {
  room: SpeakingRoom;
  passcode?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isHost: boolean;
  sessionId?: string;
  onLeaveComplete: () => void;
}

export const SpeakingActiveRoom: React.FC<SpeakingActiveRoomProps> = ({
  room,
  passcode,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isHost,
  sessionId,
  onLeaveComplete,
}) => {
  // Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active prompt carousel
  const prompts = React.useMemo(() => getPromptsForTopics(room.topics), [room.topics]);
  const [promptIndex, setPromptIndex] = useState(0);
  const currentPrompt = prompts[promptIndex] || prompts[0];

  // Leave confirmation dialog
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Participant notifications stack
  const [recentEvent, setRecentEvent] = useState<string | null>(null);

  const handleParticipantEvent = (msg: string) => {
    setRecentEvent(msg);
    toast({
      description: msg,
    });
    setTimeout(() => {
      setRecentEvent((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Voice room WebRTC hook
  const {
    connectionStatus,
    connectionMode,
    micPermission,
    isMuted,
    toggleMute,
    isLocalSpeaking,
    localAudioLevel,
    remoteSpeakers,
    audioError,
    acquireMicrophone,
  } = useVoiceRoom({
    roomId: room.id,
    passcode: passcode || room.passcode || undefined,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    isHost,
    onParticipantEvent: handleParticipantEvent,
  });

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleNextPrompt = () => {
    setPromptIndex((prev) => (prev + 1) % prompts.length);
  };

  const copyRoomPasscode = () => {
    const code = room.passcode || passcode || "";
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast({
      title: "Đã sao chép mã phòng",
      description: `Mã vào phòng: ${code}`,
    });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Perform clean exit
  const handleConfirmLeave = async (alsoCloseRoom: boolean = false) => {
    setIsLeaving(true);
    try {
      if (alsoCloseRoom && isHost) {
        await closeSpeakingRoom(room.id);
      }
      await leaveSpeakingRoom(room.id, sessionId);
      toast({
        title: "Đã rời phòng luyện nói",
        description: `Thời gian luyện nói phiên này: ${formatTimer(elapsedSeconds)}`,
      });
    } catch (err) {
      console.error("Error leaving room:", err);
    } finally {
      setIsLeaving(false);
      setLeaveDialogOpen(false);
      onLeaveComplete();
    }
  };

  // Compute remote participants list
  const remoteList = Object.values(remoteSpeakers);
  const totalInRoom = 1 + remoteList.length;
  const emptySlotsCount = Math.max(0, room.capacity - totalInRoom);

  return (
    <div className="min-h-[85vh] flex flex-col justify-between max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in-50">
      {/* 1. Header Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "font-bold text-xs px-2.5 py-0.5",
                  room.english_level === "A1" || room.english_level === "A2"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : room.english_level === "B1" || room.english_level === "B2"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                )}
              >
                {room.english_level}
              </Badge>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{room.name}</span>
                {room.visibility === "private" && (
                  <span title="Phòng riêng tư" className="inline-flex">
                    <Lock className="w-4 h-4 text-purple-500" />
                  </span>
                )}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {room.topics.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Connection Status Pill */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border",
                connectionStatus === "connected"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-500/30"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                    ? "bg-amber-500 animate-ping"
                    : "bg-rose-500"
                )}
              />
              <span>
                {connectionStatus === "connected"
                  ? connectionMode === "livekit"
                    ? "LiveKit SFU"
                    : "WebRTC Đã kết nối"
                  : connectionStatus === "connecting"
                  ? "Đang kết nối..."
                  : connectionStatus === "reconnecting"
                  ? "Đang kết nối lại..."
                  : "Mất kết nối"}
              </span>
            </div>

            {/* Capacity Pill */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-border">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                {totalInRoom}/{room.capacity}
              </span>
            </div>

            {/* Private Passcode Copy Button */}
            {room.visibility === "private" && room.passcode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyRoomPasscode}
                className="h-8 text-xs font-mono font-bold gap-1.5 border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Mã: {room.passcode}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Real-time Join/Leave Notification Toast Banner */}
        {recentEvent && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
            <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-pulse" />
            <span className="font-medium">{recentEvent}</span>
          </div>
        )}

        {/* Audio Error Banner */}
        {audioError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-start justify-between gap-3 animate-in fade-in-50">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cảnh báo quyền Microphone</p>
                <p className="mt-0.5">{audioError}</p>
              </div>
            </div>
            {micPermission !== "granted" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={acquireMicrophone}
                className="text-xs h-7 border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 shrink-0"
              >
                Cấp quyền lại
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Content Grid: Participants (Left/Center) + Topic Prompts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Center: Participant Grid (2 columns on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-500" />
              <span>Thành viên trong phòng ({totalInRoom})</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {isLocalSpeaking ? "Bạn đang nói..." : "Âm thanh truyền trực tiếp WebRTC"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current User Card (You) */}
            <div
              className={cn(
                "p-5 rounded-2xl border text-center transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center space-y-3",
                isLocalSpeaking
                  ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/60"
                  : "bg-card border-border/80 shadow-sm"
              )}
            >
              {/* Speaking Indicator Glow Ring */}
              <div className="relative">
                {isLocalSpeaking && (
                  <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                )}
                <Avatar
                  className={cn(
                    "w-20 h-20 border-3 transition-all duration-200",
                    isLocalSpeaking
                      ? "border-emerald-500 ring-4 ring-emerald-500/30 scale-105"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  {currentUserAvatar && <AvatarImage src={currentUserAvatar} alt={currentUserName} />}
                  <AvatarFallback className="bg-slate-900 text-emerald-400 text-xl font-bold">
                    {currentUserName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Mic Status icon pill on avatar */}
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-card shadow-sm",
                    isMuted ? "bg-rose-500" : "bg-emerald-500"
                  )}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {currentUserName} (Bạn)
                  </h4>
                  {isHost && (
                    <Crown className="w-3.5 h-3.5 text-amber-500" title="Chủ phòng (Host)" />
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0">
                    {isHost ? "Host" : "Member"}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isMuted
                        ? "text-rose-500"
                        : isLocalSpeaking
                        ? "text-emerald-600 dark:text-emerald-400 font-bold animate-pulse"
                        : "text-slate-500"
                    )}
                  >
                    {isMuted ? "Đã tắt mic" : isLocalSpeaking ? "Đang nói..." : "Sẵn sàng"}
                  </span>
                </div>
              </div>

              {/* Local Audio Wave Visualizer */}
              {!isMuted && (
                <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: `${Math.round(localAudioLevel * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Remote Participants Cards */}
            {remoteList.map((peer) => {
              const peerSpeaking = peer.isSpeaking;
              return (
                <div
                  key={peer.userId}
                  className={cn(
                    "p-5 rounded-2xl border text-center transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center space-y-3",
                    peerSpeaking
                      ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/60"
                      : "bg-card border-border/80 shadow-sm"
                  )}
                >
                  <div className="relative">
                    {peerSpeaking && (
                      <span className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping" />
                    )}
                    <Avatar
                      className={cn(
                        "w-20 h-20 border-3 transition-all duration-200",
                        peerSpeaking
                          ? "border-emerald-500 ring-4 ring-emerald-500/30 scale-105"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {peer.avatarUrl && <AvatarImage src={peer.avatarUrl} alt={peer.name} />}
                      <AvatarFallback className="bg-slate-800 text-blue-400 text-xl font-bold">
                        {peer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <span
                      className={cn(
                        "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white ring-2 ring-card shadow-sm",
                        peer.isMuted ? "bg-rose-500" : "bg-emerald-500"
                      )}
                    >
                      {peer.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                      {peer.name}
                    </h4>

                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          peer.isMuted
                            ? "text-rose-500"
                            : peerSpeaking
                            ? "text-emerald-600 dark:text-emerald-400 font-bold animate-pulse"
                            : "text-slate-500"
                        )}
                      >
                        {peer.isMuted ? "Đã tắt mic" : peerSpeaking ? "Đang nói..." : "Đang nghe"}
                      </span>
                    </div>
                  </div>

                  {/* Remote Audio Wave Indicator */}
                  {!peer.isMuted && (
                    <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                        style={{ width: `${Math.round(peer.audioLevel * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty Slots Cards */}
            {Array.from({ length: emptySlotsCount }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="p-5 rounded-2xl border border-dashed border-border/80 bg-slate-50/40 dark:bg-slate-900/20 text-center flex flex-col items-center justify-center space-y-2 min-h-[170px]"
              >
                <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground/60">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Chỗ trống</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                    Đang chờ bạn học tiếp theo tham gia
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Topic Prompts & Conversation Starters */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Gợi ý chủ đề thảo luận
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Câu hỏi gợi mở giúp cuộc trò chuyện sôi nổi</p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNextPrompt}
                className="h-8 text-xs gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <span>Đổi câu hỏi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-3.5">
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30">
                {currentPrompt.topic}
              </Badge>

              <blockquote className="text-sm font-semibold text-slate-800 dark:text-slate-100 italic leading-relaxed border-l-3 border-emerald-500 pl-3">
                &ldquo;{currentPrompt.question}&rdquo;
              </blockquote>

              {currentPrompt.followUps && currentPrompt.followUps.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Câu hỏi đào sâu (Follow-up):
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    {currentPrompt.followUps.map((fu, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {fu}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentPrompt.vocabularyTips && currentPrompt.vocabularyTips.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Từ vựng & Cụm từ hay nên dùng:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {currentPrompt.vocabularyTips.map((tip, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sticky Bottom Voice Controls Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-card/95 backdrop-blur-md border-t border-border/80 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Left info on mobile / desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <span
              className={cn(
                "w-3 h-3 rounded-full",
                isMuted ? "bg-rose-500" : "bg-emerald-500 animate-pulse"
              )}
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isMuted ? "Microphone đang tắt" : "Microphone đang bật"}
            </span>
          </div>

          {/* Center Action Controls */}
          <div className="flex items-center gap-3 mx-auto sm:mx-0">
            {/* Toggle Mute Button */}
            <Button
              type="button"
              onClick={toggleMute}
              size="lg"
              className={cn(
                "h-12 px-6 rounded-2xl font-bold text-sm gap-2.5 transition-all shadow-md",
                isMuted
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 ring-2 ring-emerald-400/40"
              )}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 animate-pulse" />}
              <span>{isMuted ? "Bật Micro" : "Tắt Micro"}</span>
            </Button>

            {/* Next Prompt Quick Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleNextPrompt}
              className="h-12 px-4 rounded-2xl text-xs font-semibold border-border gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Đổi câu hỏi gợi ý"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">Gợi ý câu hỏi</span>
            </Button>

            {/* Leave Room Button */}
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => setLeaveDialogOpen(true)}
              className="h-12 px-5 rounded-2xl font-semibold text-xs gap-2 bg-rose-600 hover:bg-rose-700"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Rời phòng</span>
            </Button>
          </div>

          {/* Right helper */}
          <div className="hidden sm:block text-right">
            <span className="text-[11px] text-muted-foreground block">
              Phiên học: {formatTimer(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Leave Alert Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PhoneOff className="w-5 h-5 text-rose-500" />
              <span>Xác nhận rời phòng luyện nói</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Bạn đã luyện nói được <strong>{formatTimer(elapsedSeconds)}</strong> trong phòng này.
              Microphone và kết nối đàm thoại sẽ được tự động giải phóng.
              {isHost && " Bạn là chủ phòng (Host). Nếu bạn rời phòng, quyền host sẽ được tự động trao lại cho thành viên tiếp theo hoặc phòng sẽ đóng nếu không còn ai."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isLeaving} className="rounded-xl">
              Ở lại phòng
            </AlertDialogCancel>
            {isHost && (
              <Button
                type="button"
                variant="outline"
                disabled={isLeaving}
                onClick={() => handleConfirmLeave(true)}
                className="rounded-xl border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                Đóng luôn phòng
              </Button>
            )}
            <AlertDialogAction
              disabled={isLeaving}
              onClick={() => handleConfirmLeave(false)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              Rời phòng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
