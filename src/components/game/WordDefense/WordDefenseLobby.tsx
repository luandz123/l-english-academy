import React, { useState, useEffect } from 'react';
import { 
  Castle, 
  Gamepad2, 
  Users, 
  Bot, 
  Sun, 
  Zap, 
  ShieldAlert, 
  Sparkles, 
  BookOpen, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Copy, 
  Swords 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { VocabTopic } from '../WordShooter/types';
import { DEFAULT_VOCAB_TOPICS } from '../WordShooter/defaultVocabPacks';
import { getVocabPacks, getCachedVocabPacks, VOCAB_PACKS_UPDATED_EVENT } from '@/services/vocabPacksService';
import { DefenseDifficulty, DefenseGameMode } from './types';
import { wordDefenseSound } from './gameSound';
import { PeashooterSprite, CherryBombSprite, MagicTowerSprite } from './sprites/PlantSprites';
import { NormalZombieSprite } from './sprites/ZombieSprites';
import { SunDropSprite } from './sprites/MiscSprites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WordDefenseLobbyProps {
  initialRoomId?: string;
  onStartGame: (config: {
    topic: VocabTopic;
    difficulty: DefenseDifficulty;
    mode: DefenseGameMode;
    roomId?: string;
    isHost?: boolean;
  }) => void;
}

export const WordDefenseLobby: React.FC<WordDefenseLobbyProps> = ({ onStartGame, initialRoomId }) => {
  const { toast } = useToast();
  const [adminPacks, setAdminPacks] = useState<VocabTopic[]>(() => getCachedVocabPacks());
  const [selectedTopicId, setSelectedTopicId] = useState<string>('daily');
  const [difficulty, setDifficulty] = useState<DefenseDifficulty>('medium');
  const [isMuted, setIsMuted] = useState(false);

  // PvP Room State
  const [isPvPModalOpen, setIsPvPModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  // Auto-open PvP modal if joined via link
  useEffect(() => {
    if (initialRoomId) {
      setInputRoomCode(initialRoomId.toUpperCase());
      setIsHost(false);
      setIsPvPModalOpen(true);
    }
  }, [initialRoomId]);

  // Load admin packs from Cloud / cache & listen for updates
  useEffect(() => {
    getVocabPacks().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setAdminPacks(loaded);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAdminPacks(e.detail);
      }
    };
    window.addEventListener(VOCAB_PACKS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(VOCAB_PACKS_UPDATED_EVENT, handleUpdate);
  }, []);

  const allTopics: VocabTopic[] = adminPacks.length > 0 ? adminPacks : DEFAULT_VOCAB_TOPICS;
  const currentTopic = allTopics.find((t) => t.id === selectedTopicId) || allTopics[0] || DEFAULT_VOCAB_TOPICS[0];

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    wordDefenseSound.setMuted(next);
  };

  const handleStartCampaign = () => {
    wordDefenseSound.playSummonSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'campaign',
    });
  };

  const handleStartBotBattle = () => {
    wordDefenseSound.playSummonSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'pvp-bot',
    });
  };

  const handleCreatePvPRoom = () => {
    const code = 'PvZ' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setIsPvPModalOpen(true);
    wordDefenseSound.playSummonSound();
  };

  const handleJoinPvPRoom = () => {
    const code = inputRoomCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      toast({ title: 'Mã phòng không hợp lệ' });
      return;
    }
    wordDefenseSound.playSummonSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'pvp-online',
      roomId: code,
      isHost: false,
    });
  };

  const handleHostStartPvP = () => {
    wordDefenseSound.playSummonSound();
    setIsPvPModalOpen(false);
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'pvp-online',
      roomId: roomCode,
      isHost: true,
    });
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/games/word-defense?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Đã sao chép link phòng!', description: 'Gửi link này cho bạn bè để cùng đấu Thủ vs Công.' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-900 via-emerald-950/20 to-zinc-950 p-6 md:p-10 shadow-2xl mb-8">
        <div className="absolute top-0 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wider uppercase">
              <Castle className="w-4 h-4 text-emerald-400" />
              Plants vs. Zombies Edition • Thủ Thành 5 Hàng
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              WORD DEFENSE <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-green-400 to-teal-300">
                TRẬN CHIẾN KHU VƯỜN TỪ VỰNG
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Gõ đúng từ vựng tiếng Anh để triệu hồi trụ bắn, tường chắn và băng tiễn trên 5 hàng ngang. Giải mã nghĩa tiếng Việt trên đầu quái vật mang khiên để giáng sấm sét chí mạng!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              className={cn(
                "p-3 rounded-2xl border transition-all duration-200 flex items-center gap-2 text-xs font-bold shadow-md",
                isMuted 
                  ? "bg-slate-800/80 border-slate-700 text-slate-400" 
                  : "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30"
              )}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
              <span>{isMuted ? "Tắt âm" : "Bật âm"}</span>
            </button>
          </div>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <PeashooterSprite size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Triệu hồi Lính</p>
              <p className="text-[11px] text-slate-400">Gõ từ + Bấm số 1-5</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <MagicTowerSprite size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Sét Diệt Khiên</p>
              <p className="text-[11px] text-slate-400">Gõ nghĩa trên đầu quái</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <SunDropSprite size={30} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Cầu Nắng Sun</p>
              <p className="text-[11px] text-slate-400">Gõ từ nhận năng lượng</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <CherryBombSprite size={32} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bom Anh Đào</p>
              <p className="text-[11px] text-slate-400">Quét sạch cả hàng quái</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Vocab Topics & Difficulty */}
        <div className="lg:col-span-2 space-y-6">
          {/* Topic selection */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                1. Chọn Bộ Từ Vựng Chiến Đấu
              </h2>
              <p className="text-xs text-slate-400">
                Các từ vựng trên thẻ lính và khiên quái vật sẽ được lấy từ chủ đề này.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {allTopics.map((topic) => {
                const isSelected = topic.id === selectedTopicId;
                return (
                  <div
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      wordDefenseSound.playShootSound();
                    }}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none",
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="text-2xl">{topic.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("text-sm font-black", isSelected ? "text-emerald-300" : "text-white")}>
                        {topic.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {topic.description}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-400/90 mt-1 block">
                        {topic.words.length} từ vựng
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-400" />
                2. Cấp Độ / Độ Khó
              </h2>
              <p className="text-xs text-slate-400">
                Ảnh hưởng đến tốc độ quái xuất hiện, máu quái và lượng nắng khởi điểm.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { id: 'easy', label: 'Dễ (Thực tập sinh)', desc: 'Zombie đi chậm, nắng nhiều', color: 'emerald' },
                { id: 'medium', label: 'Trung Bình', desc: 'Nhịp độ chuẩn PvZ, quái mang khiên', color: 'blue' },
                { id: 'hard', label: 'Khó (Đại dịch)', desc: 'Quái dồn dập, boss xuất hiện', color: 'rose' },
              ].map((lvl) => {
                const isSelected = difficulty === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setDifficulty(lvl.id as DefenseDifficulty);
                      wordDefenseSound.playShootSound();
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all duration-200 select-none",
                      isSelected
                        ? "bg-slate-800 border-emerald-400 shadow-md ring-1 ring-emerald-400/60"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <span className="text-xs font-black text-white uppercase block mb-1">
                      {lvl.label}
                    </span>
                    <span className="text-xs text-slate-400 block leading-tight">
                      {lvl.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Game Mode Selection */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                3. Chọn Chế Độ Chơi
              </h2>
              <p className="text-xs text-slate-400">
                Chiến dịch phòng thủ đơn hoặc đấu đối kháng Thủ vs Công.
              </p>
            </div>

            {/* Mode 1: Solo Campaign */}
            <button
              onClick={handleStartCampaign}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 border border-emerald-400/30 text-white transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PeashooterSprite size={38} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">Chiến Dịch Khu Vườn</h3>
                  <p className="text-xs text-emerald-100/80">Thủ thành 5 hàng vượt qua các đợt quái</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Mode 2: Vs AI Zombie Master */}
            <button
              onClick={handleStartBotBattle}
              className="w-full group p-4 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border border-purple-400/30 text-white transition-all duration-200 shadow-lg hover:shadow-purple-500/25 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <NormalZombieSprite size={34} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide">Đấu Boss Zombie AI</h3>
                  <p className="text-xs text-purple-200/80">Máy tự động triệu hồi quái tấn công</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Mode 3: Online 2-Player PvP */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Đấu Online (Thủ vs Công)</h3>
                  <p className="text-xs text-slate-400">Người A trồng cây • Người B thả quái</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={handleCreatePvPRoom}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md"
                >
                  Tạo phòng
                </Button>

                <Button
                  onClick={() => setIsPvPModalOpen(true)}
                  variant="outline"
                  className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold py-2.5 rounded-xl"
                >
                  Vào phòng
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PvP Room Modal */}
      <Dialog open={isPvPModalOpen} onOpenChange={setIsPvPModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Đấu Đối Kháng: Thủ vs Công (PvZ 1v1)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {isHost 
                ? 'Gửi mã phòng này cho đối thủ để họ vào vai Zombie Master!' 
                : 'Nhập mã phòng để tham gia trận đấu!'}
            </DialogDescription>
          </DialogHeader>

          {isHost ? (
            <div className="space-y-4 py-3 text-center">
              <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã Phòng:</p>
                <p className="text-3xl font-black text-emerald-400 tracking-widest font-mono">
                  {roomCode}
                </p>
              </div>

              <Button
                onClick={copyRoomLink}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white text-xs font-bold"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Sao chép Link mời
              </Button>

              <DialogFooter className="pt-2">
                <Button
                  onClick={handleHostStartPvP}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-sm py-3"
                >
                  Vào Bàn Cờ Ngay!
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Nhập Mã Phòng:</label>
                <Input
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: PVZ982"
                  className="bg-slate-950 border-slate-700 text-white font-mono text-center tracking-widest text-lg font-bold uppercase"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPvPModalOpen(false)}
                  className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleJoinPvPRoom}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
                >
                  Tham Gia Trận Đấu
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
