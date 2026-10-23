import React, { useState, useEffect, useCallback } from "react";
import StudentLayout from "@/components/StudentLayout";
import { useAuth } from "@/hooks/useAuth";
import { 
  EnglishLevel, 
  SpeakingRoom, 
  SpeakingMember 
} from "@/types/speaking";
import { 
  fetchPublicRooms, 
  fetchRoomDetails, 
  fetchUserSpeakingStats, 
  joinSpeakingRoom,
  updateUserEnglishLevel 
} from "@/services/speakingService";
import { SpeakingLevelSelector } from "@/components/speaking/SpeakingLevelSelector";
import { SpeakingTopicChips } from "@/components/speaking/SpeakingTopicChips";
import { SpeakingUserInfoCard } from "@/components/speaking/SpeakingUserInfoCard";
import { SpeakingMatchmaker } from "@/components/speaking/SpeakingMatchmaker";
import { SpeakingCreateRoomCard } from "@/components/speaking/SpeakingCreateRoomCard";
import { SpeakingRoomListCard } from "@/components/speaking/SpeakingRoomListCard";
import { SpeakingActiveRoom } from "@/components/speaking/SpeakingActiveRoom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { 
  Mic2, 
  Users, 
  Radio, 
  Sparkles, 
  MessageSquare, 
  Headphones, 
  Volume2, 
  Award, 
  Compass 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SpeakingRoomsPage: React.FC = () => {
  const { user, profile } = useAuth();

  // Selected level & topics for user configuration
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel>("B1");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "Daily Conversation",
    "Travel",
    "IELTS Speaking",
  ]);

  // Speaking practice stats
  const [speakingMinutes, setSpeakingMinutes] = useState(0);

  // Active rooms list
  const [rooms, setRooms] = useState<SpeakingRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Active joined room session
  const [activeRoom, setActiveRoom] = useState<SpeakingRoom | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [isHostOfActiveRoom, setIsHostOfActiveRoom] = useState(false);
  const [activePasscode, setActivePasscode] = useState<string | undefined>(undefined);

  // Tab on right column: "rooms" | "create"
  const [rightTab, setRightTab] = useState<string>("rooms");

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Học viên";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  // Load user stats
  const loadUserStats = useCallback(async () => {
    if (!user) return;
    const stats = await fetchUserSpeakingStats(user.id);
    setSpeakingMinutes(stats.totalMinutes);
    if (stats.englishLevel) {
      setSelectedLevel(stats.englishLevel);
    }
  }, [user]);

  // Load public rooms
  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const data = await fetchPublicRooms();
      setRooms(data);
    } catch (err) {
      console.error("Error loading rooms:", err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadUserStats();
    loadRooms();
  }, [loadUserStats, loadRooms]);

  // Real-time synchronization for rooms list
  useEffect(() => {
    const channel = supabase
      .channel("public-speaking-rooms-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "speaking_rooms" },
        () => {
          loadRooms();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "speaking_room_members" },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRooms]);

  // Handle Level Selection
  const handleLevelSelect = (lvl: EnglishLevel) => {
    setSelectedLevel(lvl);
    if (user) {
      updateUserEnglishLevel(user.id, lvl);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (room: SpeakingRoom, passcode?: string) => {
    try {
      const result = await joinSpeakingRoom(room.id, passcode);
      if (result.success) {
        // Enriched room details
        const details = await fetchRoomDetails(room.id);
        const resolvedRoom = details || room;

        setActiveRoom(resolvedRoom);
        setActiveSessionId(result.session_id);
        setIsHostOfActiveRoom(resolvedRoom.host_user_id === user?.id || result.role === "host");
        setActivePasscode(passcode || resolvedRoom.passcode || undefined);

        toast({
          title: "Đã vào phòng luyện nói",
          description: `Bạn đang ở trong phòng "${resolvedRoom.name}".`,
        });
      } else {
        toast({
          title: "Không thể vào phòng",
          description: result.error || "Phòng có thể đã đầy hoặc đã đóng.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi kết nối",
        description: err.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  // Handle Room Created
  const handleRoomCreated = (room: SpeakingRoom) => {
    setActiveRoom(room);
    setIsHostOfActiveRoom(true);
    setActivePasscode(room.passcode || undefined);
    loadRooms();
  };

  // Handle Leave Room Complete
  const handleLeaveComplete = () => {
    setActiveRoom(null);
    setActiveSessionId(undefined);
    setIsHostOfActiveRoom(false);
    setActivePasscode(undefined);
    loadUserStats();
    loadRooms();
  };

  return (
    <StudentLayout>
      <div className="min-h-screen bg-slate-50/60 dark:bg-[#070b14] py-6 px-4 sm:px-6 lg:px-8">
        {/* Active Voice Room View */}
        {activeRoom ? (
          <SpeakingActiveRoom
            room={activeRoom}
            passcode={activePasscode}
            currentUserId={user?.id || ""}
            currentUserName={displayName}
            currentUserAvatar={avatarUrl || undefined}
            isHost={isHostOfActiveRoom}
            sessionId={activeSessionId}
            onLeaveComplete={handleLeaveComplete}
          />
        ) : (
          /* Lobby / Dashboard View */
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-lg">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-20 -bottom-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <Mic2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>English Speaking Rooms • Luyện nói trực tuyến</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-100">
                  Phòng Luyện Nói Tiếng Anh <span className="text-emerald-400">Trực Tuyến</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Kết nối microphone với người học thật trên toàn hệ thống. Ghép cặp thông minh theo trình độ
                  và chủ đề yêu thích để tự tin giao tiếp phản xạ tự nhiên.
                </p>
              </div>
            </div>

            {/* Desktop Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CỘT TRÁI (5/12 cols): CẤU HÌNH LUYỆN NÓI */}
              <div className="lg:col-span-5 space-y-5">
                {/* User Info Card */}
                <SpeakingUserInfoCard
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  englishLevel={selectedLevel}
                  totalSpeakingMinutes={speakingMinutes}
                />

                {/* Level Selector */}
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
                  <SpeakingLevelSelector
                    selectedLevel={selectedLevel}
                    onSelectLevel={handleLevelSelect}
                  />
                </div>

                {/* Topics Chips */}
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
                  <SpeakingTopicChips
                    selectedTopics={selectedTopics}
                    onChangeTopics={setSelectedTopics}
                    maxSelectable={5}
                  />
                </div>

                {/* Matchmaker Action Button */}
                <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
                  <SpeakingMatchmaker
                    level={selectedLevel}
                    topics={selectedTopics}
                    onRoomMatched={handleJoinRoom}
                    onRequestCreateRoom={() => setRightTab("create")}
                  />
                </div>
              </div>

              {/* CỘT PHẢI (7/12 cols): TẠO PHÒNG VÀ PHÒNG HIỆN CÓ */}
              <div className="lg:col-span-7 space-y-4">
                <Tabs value={rightTab} onValueChange={setRightTab} className="w-full">
                  <TabsList className="grid grid-cols-2 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl h-12">
                    <TabsTrigger
                      value="rooms"
                      className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4 text-emerald-500" />
                      <span>Phòng hiện có ({rooms.length})</span>
                    </TabsTrigger>

                    <TabsTrigger
                      value="create"
                      className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Tạo phòng mới</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="rooms" className="mt-4 focus-visible:outline-none">
                    <SpeakingRoomListCard
                      rooms={rooms}
                      isLoading={isLoadingRooms}
                      onRefresh={loadRooms}
                      onJoinRoom={handleJoinRoom}
                    />
                  </TabsContent>

                  <TabsContent value="create" className="mt-4 focus-visible:outline-none">
                    <SpeakingCreateRoomCard
                      defaultLevel={selectedLevel}
                      defaultTopics={selectedTopics}
                      onRoomCreated={handleRoomCreated}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default SpeakingRoomsPage;
