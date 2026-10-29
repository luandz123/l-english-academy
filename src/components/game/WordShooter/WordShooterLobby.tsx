import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Gamepad2, 
  Users, 
  Bot, 
  Sparkles, 
  Heart, 
  Snowflake, 
  Bomb, 
  Zap, 
  Volume2, 
  VolumeX, 
  Plus, 
  BookOpen, 
  Check, 
  Copy, 
  ChevronRight,
  Shield,
  Layers,
  Database,
  Loader2,
  CheckCircle2,
  Radio,
  HelpCircle,
  Trophy,
  Star,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { VocabTopic, GameDifficulty, GameMode, VocabWord } from './types';
import { DEFAULT_VOCAB_TOPICS, DIFFICULTY_CONFIG } from './defaultVocabPacks';
import { getVocabPacks, getCachedVocabPacks, VOCAB_PACKS_UPDATED_EVENT } from '@/services/vocabPacksService';
import { WordShooterTutorialModal, TUTORIAL_STORAGE_KEY } from './WordShooterTutorialModal';
import { WordShooterLeaderboardModal } from './WordShooterLeaderboardModal';
import { 
  getPlayerRank, 
  formatRankInfo, 
  generateFairRankedOpponent, 
  MatchedRankedOpponent 
} from '@/services/wordShooterRankService';
import { gameSound } from './gameSound';
import { supabase } from '@/integrations/supabase/client';
import { getVocabPool } from '@/lib/api/vocab';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WordShooterLobbyProps {
  initialRoomId?: string;
  onStartGame: (config: {
    topic: VocabTopic;
    difficulty: GameDifficulty;
    mode: GameMode;
    roomId?: string;
    isHost?: boolean;
    matchedOpponent?: MatchedRankedOpponent;
  }) => void;
}

const CUSTOM_VOCAB_STORAGE_KEY = 'word_shooter_custom_packs';

export const WordShooterLobby: React.FC<WordShooterLobbyProps> = ({ onStartGame, initialRoomId }) => {
  const { toast } = useToast();
  const [adminPacks, setAdminPacks] = useState<VocabTopic[]>(() => getCachedVocabPacks());
  const [selectedTopicId, setSelectedTopicId] = useState<string>(() => (getCachedVocabPacks()[0]?.id || 'toeic_600_master'));
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [isMuted, setIsMuted] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [playerRank, setPlayerRank] = useState(() => getPlayerRank());
  const currentRankInfo = formatRankInfo(playerRank);

  // Refresh rank when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      setPlayerRank(getPlayerRank());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Check if first-time player to auto-open tutorial
  useEffect(() => {
    const hasSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!hasSeen) {
      setIsTutorialOpen(true);
    }
  }, []);

  // Custom topics state
  const [customTopics, setCustomTopics] = useState<VocabTopic[]>([]);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customInputText, setCustomInputText] = useState('');

  // Database topics loading
  const [dbWords, setDbWords] = useState<VocabWord[]>([]);
  const [isLoadingDbWords, setIsLoadingDbWords] = useState(false);

  // PvP Room State & Real-time Waiting Room
  const [isPvPModalOpen, setIsPvPModalOpen] = useState(false);
  const [pvpModalMode, setPvpModalMode] = useState<'casual' | 'ranked'>('casual');
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isOpponentJoined, setIsOpponentJoined] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [isGuestWaiting, setIsGuestWaiting] = useState(false);
  const [startCountdown, setStartCountdown] = useState<number | null>(null);
  const pvpLobbyChannelRef = React.useRef<any>(null);
  const lobbyBcRef = React.useRef<BroadcastChannel | null>(null);

  // Ranked Fair Matchmaking Modal State
  const [isRankMatchModalOpen, setIsRankMatchModalOpen] = useState(false);
  const [matchSearchingTimer, setMatchSearchingTimer] = useState(0);
  const [matchState, setMatchState] = useState<'searching' | 'found'>('searching');
  const [matchedRankOpponent, setMatchedRankOpponent] = useState<MatchedRankedOpponent | null>(null);
  const [matchCountdown, setMatchCountdown] = useState(3);
  const searchIntervalRef = React.useRef<any>(null);
  const matchFoundTimeoutRef = React.useRef<any>(null);
  const countdownIntervalRef = React.useRef<any>(null);

  // Clean up lobby channel & matchmaking timers on unmount
  useEffect(() => {
    return () => {
      cleanupLobbyChannel();
      if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
      if (matchFoundTimeoutRef.current) clearTimeout(matchFoundTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Local Personal Records
  const [highScores, setHighScores] = useState<Record<string, { score: number; combo: number; wave?: number }>>({});

  // Auto-open PvP modal if joined via link with room ID
  useEffect(() => {
    if (initialRoomId) {
      const code = initialRoomId.toUpperCase();
      setInputRoomCode(code);
      setIsHost(false);
      setIsPvPModalOpen(true);
      const isRank = code.startsWith('R-');
      setPvpModalMode(isRank ? 'ranked' : 'casual');
      setGameMode(isRank ? 'ranked' : 'casual');
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

  // Load custom topics & high scores from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_VOCAB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomTopics(parsed);
        }
      }
      const savedScores = localStorage.getItem('word_shooter_records');
      if (savedScores) {
        setHighScores(JSON.parse(savedScores));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch words from Supabase on demand if selected
  const fetchSupabaseWords = async () => {
    setIsLoadingDbWords(true);
    try {
      const { data, error } = await getVocabPool(100);

      if (error || !data || data.length === 0) {
        toast({
          title: 'Thông báo',
          description: 'Không tải được từ vựng thư viện. Hệ thống sẽ dùng bộ từ vựng tuyển chọn.',
        });
        return;
      }

      // Shuffle and pick 40 words
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 40);
      const mapped: VocabWord[] = shuffled.map((item) => ({
        id: item.id,
        word: item.word.trim().toLowerCase(),
        phonetic: item.phonetic,
        definition_vi: item.definition_vi,
        audioUrl: item.audio_male_url,
      }));
      setDbWords(mapped);
      setSelectedTopicId('supabase_db');
      toast({
        title: 'Thành công',
        description: `Đã tải ${mapped.length} từ vựng ngẫu nhiên từ thư viện học viện!`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDbWords(false);
    }
  };

  const basePacks = adminPacks.length > 0 ? adminPacks : DEFAULT_VOCAB_TOPICS;

  const allTopics: VocabTopic[] = [
    ...basePacks,
    ...(dbWords.length > 0
      ? [
          {
            id: 'supabase_db',
            name: 'Thư viện Học Viện (Supabase)',
            icon: '🏛️',
            description: 'Từ vựng thực chiến trích xuất trực tiếp từ kho 7,000+ từ vựng bài học.',
            words: dbWords,
          },
        ]
      : []),
    ...customTopics,
  ];

  const currentTopic = allTopics.find((t) => t.id === selectedTopicId) || allTopics[0] || DEFAULT_VOCAB_TOPICS[0];

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    gameSound.setMuted(next);
    if (!next) {
      gameSound.playLaserSound();
    }
  };

  // Save new custom vocab pack
  const handleSaveCustomPack = () => {
    if (!customName.trim()) {
      toast({ title: 'Vui lòng nhập tên bộ từ vựng' });
      return;
    }

    const lines = customInputText.split('\n').filter((l) => l.trim().length > 0);
    const parsedWords: VocabWord[] = [];

    lines.forEach((line, idx) => {
      // Formats supported: "word - meaning", "word: meaning", "word = meaning"
      const match = line.match(/^([^:-=]+)[:\-=](.+)$/);
      if (match) {
        const rawWord = match[1].trim();
        const rawDef = match[2].trim();
        if (rawWord && rawDef) {
          parsedWords.push({
            id: `custom_${Date.now()}_${idx}`,
            word: rawWord.toLowerCase(),
            definition_vi: rawDef,
          });
        }
      } else {
        const singleWord = line.trim();
        if (singleWord) {
          parsedWords.push({
            id: `custom_${Date.now()}_${idx}`,
            word: singleWord.toLowerCase(),
            definition_vi: 'Từ vựng tự tạo',
          });
        }
      }
    });

    if (parsedWords.length < 5) {
      toast({
        title: 'Cần tối thiểu 5 từ vựng',
        description: 'Vui lòng nhập ít nhất 5 dòng từ vựng (ví dụ: apple - quả táo)',
        variant: 'destructive',
      });
      return;
    }

    const newTopic: VocabTopic = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      icon: '✨',
      description: `Bộ từ tự tạo gồm ${parsedWords.length} từ vựng.`,
      words: parsedWords,
      isCustom: true,
    };

    const updated = [newTopic, ...customTopics];
    setCustomTopics(updated);
    localStorage.setItem(CUSTOM_VOCAB_STORAGE_KEY, JSON.stringify(updated));
    setSelectedTopicId(newTopic.id);
    setIsCustomModalOpen(false);
    setCustomName('');
    setCustomInputText('');
    toast({
      title: 'Đã tạo bộ từ thành công!',
      description: `Đã lưu "${newTopic.name}" với ${parsedWords.length} từ vựng.`,
    });
    gameSound.playHeartSound();
  };

  const handleStartSolo = () => {
    gameSound.playLaserSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'solo', // KHÔNG TÍNH RANK!
    });
  };

  const handleStartBotBattle = () => {
    gameSound.playLaserSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'bot', // KHÔNG TÍNH RANK!
    });
  };

  const handleStartRankMatchmaking = () => {
    // Clear any active timers
    if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
    if (matchFoundTimeoutRef.current) clearTimeout(matchFoundTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsRankMatchModalOpen(true);
    setMatchState('searching');
    setMatchSearchingTimer(0);
    setMatchCountdown(3);
    setMatchedRankOpponent(null);

    gameSound.playReadySound();

    // Elapsed timer (00:01, 00:02...)
    searchIntervalRef.current = setInterval(() => {
      setMatchSearchingTimer((prev) => prev + 1);
    }, 1000);

    // Simulate fair matchmaking (1.8s - 2.5s)
    const searchDuration = 1800 + Math.floor(Math.random() * 700);
    matchFoundTimeoutRef.current = setTimeout(() => {
      if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);

      // Generate strictly fair opponent (chênh lệch rank <= 1 bậc)
      const opponent = generateFairRankedOpponent(playerRank);
      setMatchedRankOpponent(opponent);
      setMatchState('found');
      gameSound.playLevelUpSound();

      let count = 3;
      setMatchCountdown(3);
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        setMatchCountdown(count);
        gameSound.playLaserSound();

        if (count <= 0) {
          clearInterval(countdownIntervalRef.current);
          setIsRankMatchModalOpen(false);
          gameSound.playMatchStartSound();
          onStartGame({
            topic: currentTopic,
            difficulty,
            mode: 'ranked',
            matchedOpponent: opponent,
          });
        }
      }, 1000);
    }, searchDuration);
  };

  const handleInstantRankStart = (opp: MatchedRankedOpponent) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsRankMatchModalOpen(false);
    gameSound.playMatchStartSound();
    onStartGame({
      topic: currentTopic,
      difficulty,
      mode: 'ranked',
      matchedOpponent: opp,
    });
  };

  const handleCancelRankMatchmaking = () => {
    if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
    if (matchFoundTimeoutRef.current) clearTimeout(matchFoundTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsRankMatchModalOpen(false);
    setMatchState('searching');
    setMatchedRankOpponent(null);
  };

  const formatMatchTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const cleanupLobbyChannel = () => {
    if (pvpLobbyChannelRef.current) {
      supabase.removeChannel(pvpLobbyChannelRef.current);
      pvpLobbyChannelRef.current = null;
    }
    if (lobbyBcRef.current) {
      try {
        lobbyBcRef.current.close();
      } catch {}
      lobbyBcRef.current = null;
    }
  };

  const handleCreateRoom = (roomType: 'casual' | 'ranked' = 'casual') => {
    cleanupLobbyChannel();
    setPvpModalMode(roomType);
    const prefix = roomType === 'ranked' ? 'R-' : '';
    const code = prefix + Math.random().toString(36).substring(2, 7).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setIsOpponentJoined(false);
    setOpponentName('');
    setIsGuestWaiting(false);
    setStartCountdown(null);
    setIsPvPModalOpen(true);
    gameSound.playLaserSound();

    const channel = supabase.channel(`lobby-pvp-${code}`, {
      config: { broadcast: { self: false } },
    });
    pvpLobbyChannelRef.current = channel;

    const onGuestJoined = (senderName?: string) => {
      setIsOpponentJoined(true);
      setOpponentName(senderName || 'Người chơi 2');
      gameSound.playReadySound();
      toast({
        title: 'Đối thủ đã vào phòng! 🎯',
        description: `${senderName || 'Người chơi 2'} đã kết nối. Bạn có thể bấm bắt đầu trận đấu!`,
      });
      channel.send({
        type: 'broadcast',
        event: 'player_ready',
        payload: { senderName: 'Chủ phòng' },
      });
      if (lobbyBcRef.current) {
        try {
          lobbyBcRef.current.postMessage({ event: 'player_ready', payload: { senderName: 'Chủ phòng' } });
        } catch {}
      }
    };

    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        onGuestJoined(payload?.senderName);
      })
      .on('broadcast', { event: 'player_left' }, () => {
        setIsOpponentJoined(false);
        setOpponentName('');
        toast({ title: 'Đối thủ đã rời phòng' });
      })
      .subscribe();

    // Local BroadcastChannel for instant same-browser 2-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`ws-lobby-${code}`);
        lobbyBcRef.current = bc;
        bc.onmessage = (e) => {
          if (e.data?.event === 'player_joined') {
            onGuestJoined(e.data?.payload?.senderName);
          }
        };
      } catch {}
    }
  };

  const handleJoinRoom = () => {
    const code = inputRoomCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      toast({ title: 'Mã phòng không hợp lệ', description: 'Vui lòng nhập mã phòng gồm 4 - 8 ký tự.' });
      return;
    }
    const isRank = code.startsWith('R-') || pvpModalMode === 'ranked';
    setPvpModalMode(isRank ? 'ranked' : 'casual');
    cleanupLobbyChannel();
    setRoomCode(code);
    setIsHost(false);
    setIsGuestWaiting(true);
    setStartCountdown(null);
    gameSound.playLaserSound();

    const startCountdownForGuest = (payload: any) => {
      gameSound.playReadySound();
      setStartCountdown(3);
      gameSound.playCountdownBeep(3);
      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          gameSound.playMatchStartSound();
          cleanupLobbyChannel();
          setIsPvPModalOpen(false);
          const isRankedMatch = payload?.isRanked ?? isRank;
          onStartGame({
            topic: payload?.topic || currentTopic,
            difficulty: payload?.difficulty || difficulty,
            mode: isRankedMatch ? 'ranked' : 'casual',
            roomId: code,
            isHost: false,
          });
        } else {
          setStartCountdown(count);
          gameSound.playCountdownBeep(count);
        }
      }, 1000);
    };

    const channel = supabase.channel(`lobby-pvp-${code}`, {
      config: { broadcast: { self: false } },
    });
    pvpLobbyChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        startCountdownForGuest(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: { senderName: 'Người chơi 2' },
          });
        }
      });

    // Local BroadcastChannel for instant same-browser 2-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`ws-lobby-${code}`);
        lobbyBcRef.current = bc;
        bc.onmessage = (e) => {
          if (e.data?.event === 'game_start') {
            startCountdownForGuest(e.data?.payload);
          }
        };
        // Notify host tab immediately
        bc.postMessage({
          event: 'player_joined',
          payload: { senderName: 'Người chơi 2' },
        });
      } catch {}
    }
  };

  const handleHostStartPvP = () => {
    if (!isOpponentJoined) {
      toast({
        title: 'Chưa có đối thủ!',
        description: 'Vui lòng gửi link hoặc mã phòng và chờ bạn bè tham gia trước.',
      });
      return;
    }
    gameSound.playLaserSound();

    const startPayload = {
      topic: currentTopic,
      difficulty,
      isRanked: pvpModalMode === 'ranked',
      countdown: 3,
    };

    if (pvpLobbyChannelRef.current) {
      pvpLobbyChannelRef.current.send({
        type: 'broadcast',
        event: 'game_start',
        payload: startPayload,
      });
    }

    if (lobbyBcRef.current) {
      try {
        lobbyBcRef.current.postMessage({
          event: 'game_start',
          payload: startPayload,
        });
      } catch {}
    }

    setStartCountdown(3);
    gameSound.playCountdownBeep(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        gameSound.playMatchStartSound();
        cleanupLobbyChannel();
        setIsPvPModalOpen(false);
        onStartGame({
          topic: currentTopic,
          difficulty,
          mode: pvpModalMode === 'ranked' ? 'ranked' : 'casual',
          roomId: roomCode,
          isHost: true,
        });
      } else {
        setStartCountdown(count);
        gameSound.playCountdownBeep(count);
      }
    }, 1000);
  };

  const handleClosePvPModal = () => {
    if (pvpLobbyChannelRef.current) {
      pvpLobbyChannelRef.current.send({
        type: 'broadcast',
        event: 'player_left',
        payload: {},
      });
    }
    cleanupLobbyChannel();
    setIsPvPModalOpen(false);
    setIsGuestWaiting(false);
    setIsOpponentJoined(false);
    setStartCountdown(null);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/games/word-shooter?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Đã sao chép link phòng!', description: 'Gửi link này cho bạn bè để cùng tham chiến.' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 p-6 md:p-10 shadow-2xl mb-8">
        {/* Glow ambient spots */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black tracking-wider uppercase">
              <Rocket className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              Phiên bản Nâng cấp 2.0 • Cyber Arcade
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              PHI CƠ DIỆT TỪ VỰNG <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                SKY STRIKE VOCAB
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Rèn luyện phản xạ gõ phím cực nhạy, nạp từ vựng vào sâu tiềm thức với âm thanh phát âm bản xứ chuẩn xác & nghĩa tiếng Việt bay lên tức thì khi phi cơ bắn nổ!
            </p>
          </div>

          {/* Rank Badge & Action Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 self-center md:self-start">
            {/* Liên Quân Rank Card Badge */}
            <div 
              onClick={() => setIsLeaderboardOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 to-purple-950/60 hover:from-amber-900/60 hover:to-purple-900/60 transition-all duration-200 flex items-center gap-2.5 text-xs shadow-lg cursor-pointer active:scale-95 group"
              title="Nhấn để xem Bảng Xếp Hạng Cao Thủ"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-lg shrink-0">
                {currentRankInfo.icon}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-amber-300 group-hover:text-amber-200">
                    {currentRankInfo.tierNameVi} {currentRankInfo.divisionRoman}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {playerRank.tier === 'master' || playerRank.tier === 'grandmaster' ? (
                      <span className="text-[11px] font-black">⭐ x{playerRank.stars}</span>
                    ) : (
                      Array.from({ length: currentRankInfo.maxStars }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          className={cn(
                            "w-2.5 h-2.5", 
                            idx < currentRankInfo.stars ? "fill-amber-400 text-amber-400" : "text-slate-600 opacity-40"
                          )} 
                        />
                      ))
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-amber-200/70 font-bold flex items-center gap-1">
                  <Trophy className="w-2.5 h-2.5 text-amber-400" />
                  Bảng Xếp Hạng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  gameSound.playLaserSound();
                  setIsTutorialOpen(true);
                }}
                className="p-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 transition-all duration-200 flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer active:scale-95"
                title="Xem hướng dẫn cách chơi game"
              >
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Hướng dẫn</span>
              </button>

              <button
                onClick={handleToggleMute}
                className={cn(
                  "p-3 rounded-2xl border transition-all duration-200 flex items-center gap-1.5 text-xs font-bold shadow-md",
                  isMuted 
                    ? "bg-slate-800/80 border-slate-700 text-slate-400" 
                    : "bg-blue-600/20 border-blue-500/40 text-cyan-300 hover:bg-blue-600/30"
                )}
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span>{isMuted ? "Tắt" : "Bật"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm shrink-0">
              💖
            </div>
            <div>
              <p className="text-xs font-bold text-white">Từ Trái Tim</p>
              <p className="text-xs text-slate-400">+1 Mạng khi nổ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
              🛡️
            </div>
            <div>
              <p className="text-xs font-bold text-white">Khiên Năng Lượng</p>
              <p className="text-xs text-slate-400">Đỡ 1 đòn chí tử</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-xs font-bold text-white">Làm Chậm (Slow-Mo)</p>
              <p className="text-xs text-slate-400">Giảm 60% tốc độ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm shrink-0">
              ❄️
            </div>
            <div>
              <p className="text-xs font-bold text-white">Từ Đóng Băng</p>
              <p className="text-xs text-slate-400">Ngừng rơi 3.2 giây</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              💣
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bom Nổ Lan</p>
              <p className="text-xs text-slate-400">Quét sạch từ trên sân</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold text-sm shrink-0">
              👑
            </div>
            <div>
              <p className="text-xs font-bold text-white">Boss Word & Wave</p>
              <p className="text-xs text-slate-400">Thưởng điểm x2.5</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Vocab Topics & Custom Sets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Choose Vocabulary Pack */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  1. Chọn Bộ Từ Vựng
                </h2>
                <p className="text-xs text-slate-400">
                  Chọn chủ đề có sẵn, lấy từ kho học viện, hoặc tự tạo bộ từ theo ý muốn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSupabaseWords}
                  disabled={isLoadingDbWords}
                  className="bg-slate-800/80 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-bold"
                >
                  <Database className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  {isLoadingDbWords ? 'Đang tải...' : 'Kho 7,000+ từ Học Viện'}
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tự tạo bộ từ
                </Button>
              </div>
            </div>

            {/* Topics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {allTopics.map((topic) => {
                const isSelected = topic.id === selectedTopicId;
                return (
                  <div
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      gameSound.playHitLetterSound();
                    }}
                    className={cn(
                      "group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between select-none",
                      isSelected
                        ? "bg-blue-950/40 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50"
                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{topic.icon}</span>
                        <div>
                          <h3 className={cn("text-sm font-black transition-colors", isSelected ? "text-cyan-300" : "text-white group-hover:text-cyan-200")}>
                            {topic.name}
                          </h3>
                          <span className="text-xs font-bold text-slate-400">
                            {topic.words.length} từ vựng
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    {highScores[topic.id] && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30 w-fit">
                        <span>🏆 Kỷ lục:</span>
                        <span>{highScores[topic.id].score.toLocaleString()} điểm</span>
                        <span>•</span>
                        <span>{highScores[topic.id].combo}x combo</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {topic.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Choose Difficulty */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                2. Cấp Độ / Độ Khó
              </h2>
              <p className="text-xs text-slate-400">
                Ảnh hưởng trực tiếp đến tốc độ rơi, độ dài từ vựng và số lượng mạng xuất phát.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {(['easy', 'medium', 'hard'] as GameDifficulty[]).map((lvl) => {
                const cfg = DIFFICULTY_CONFIG[lvl];
                const isSelected = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => {
                      setDifficulty(lvl);
                      gameSound.playHitLetterSound();
                    }}
                    className={cn(
                      "p-4 rounded-2xl border text-left transition-all duration-120 flex flex-col justify-between select-none relative overflow-hidden active:scale-95",
                      isSelected
                        ? lvl === 'easy'
                          ? "bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                          : lvl === 'medium'
                          ? "bg-blue-950/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                          : "bg-rose-950/40 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-xs font-black uppercase tracking-wider",
                          lvl === 'easy' ? "text-emerald-400" : lvl === 'medium' ? "text-blue-400" : "text-rose-400"
                        )}>
                          {lvl === 'easy' ? 'Dễ' : lvl === 'medium' ? 'Trung bình' : 'Khó'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {cfg.scoreMultiplier}x Điểm
                        </span>
                      </div>
                      <p className="text-sm font-black text-white">{cfg.label}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                      <div className="flex justify-between">
                        <span>Số mạng:</span>
                        <span className="text-pink-400 font-bold">{cfg.maxLives} ❤️</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tốc độ:</span>
                        <span className="text-slate-200 font-bold">
                          {lvl === 'easy' ? 'Chậm rãi' : lvl === 'medium' ? 'Vừa phải' : 'Cực nhanh'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Keyboard & Mobile Tips Card */}
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-cyan-950/20 p-5 backdrop-blur-md shadow-xl flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1.5">
              <h4 className="font-black text-cyan-300 text-sm">Bí Kíp Phản Xạ & Bắn Nhanh 2.0:</h4>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-white">Bộ gõ tiếng Việt Telex/VNI:</strong> Trò chơi đã tự động chuẩn hóa các ký tự ghép âm (như <em>â, ê, ô, đ, á...</em>) về mẫu tự gốc, bạn có thể gõ mượt mà mà không lo trượt phím.
              </p>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-white">Đổi mục tiêu linh hoạt:</strong> Bấm phím <span className="font-mono text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">[Space]</span> hoặc <span className="font-mono text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-bold">[Backspace]</span> để hủy khóa từ hiện tại và ngắm sang từ rơi gần vạch nguy hiểm hơn.
              </p>
              <p className="text-slate-300 leading-relaxed">
                • <strong className="text-white">Điện thoại / Tablet:</strong> Chạm bất kỳ điểm nào trên màn hình hoặc chạm trực tiếp vào từ rơi để mở bàn phím và nhắm bắn.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Game Mode Selection & Launch Actions */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                3. Chọn Chế Độ Chơi (4 Chế Độ)
              </h2>
              <p className="text-xs text-slate-400">
                Luyện tập hoặc thi đấu • <strong className="text-amber-300">Chỉ có Đấu Hạng mới tính rank!</strong>
              </p>
            </div>

            {/* Mode 1: Solo Arcade */}
            <div className="space-y-2">
              <button
                onClick={handleStartSolo}
                className="w-full group p-3.5 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 border border-blue-400/30 text-white transition-all duration-120 shadow-md hover:shadow-blue-500/25 flex items-center justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-105 transition-transform">
                    <Rocket className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black tracking-wide">1. Đấu Đơn (Chiến Dịch)</h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-400/40 text-blue-200 text-[10px] font-bold">
                        Không tính rank
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100/80">3 Mạng • Vượt Wave • Powerup • Săn kỷ lục</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Mode 2: PvP vs AI Bot */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <button
                onClick={handleStartBotBattle}
                className="w-full group p-3.5 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 border border-purple-400/30 text-white transition-all duration-120 shadow-md hover:shadow-purple-500/25 flex items-center justify-between text-left active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-105 transition-transform">
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black tracking-wide">2. Đấu Máy (vs AI Pilot)</h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-400/40 text-purple-200 text-[10px] font-bold">
                        Luyện tập 60s
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-200/80">Chung màn hình • Không tính rank • Luyện phản xạ gõ</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Mode 3: Online 2-Player Casual PvP */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-black text-white">3. Đấu Thường (Giao Hữu)</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                          Không tính rank
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">1v1 cùng bạn bè qua mã phòng hoặc link mời</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <Button
                    onClick={() => handleCreateRoom('casual')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 rounded-xl shadow-md active:scale-95 duration-120 cursor-pointer"
                  >
                    Tạo phòng thường
                  </Button>

                  <Button
                    onClick={() => {
                      setPvpModalMode('casual');
                      setIsPvPModalOpen(true);
                    }}
                    variant="outline"
                    className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold py-2 rounded-xl active:scale-95 duration-120 cursor-pointer"
                  >
                    Nhập mã phòng
                  </Button>
                </div>
              </div>
            </div>

            {/* Mode 4: Đấu Hạng (Ranked 1v1 Liên Quân Mobile) - DUY NHẤT TÍNH RANK */}
            <div className="space-y-2.5 pt-2 border-t-2 border-amber-500/40">
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/40 via-slate-950 to-yellow-950/30 p-4 shadow-[0_0_25px_rgba(245,158,11,0.2)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                          4. Đấu Hạng (Rank)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
                          +1 ⭐ RANK
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        Chế độ DUY NHẤT tính rank: Thắng +1 ⭐, Thua -1 ⭐
                      </p>
                    </div>
                  </div>

                  {/* Player Current Rank Badge */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-amber-400">
                      {currentRankInfo.tierNameVi} {currentRankInfo.divisionRoman}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {playerRank.stars} sao
                    </div>
                  </div>
                </div>

                {/* Fairness and No Custom Room Notice */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[11px] text-amber-200">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Cơ chế ghép trận:</strong> Tự động tìm đối thủ có bậc rank tương đương (chênh lệch ≤ 1 bậc). Chế độ đấu hạng <strong>không hỗ trợ tạo phòng riêng</strong> để chống gian lận điểm rank.
                  </span>
                </div>

                {/* Matchmaking Action Button */}
                <div className="pt-1">
                  <Button
                    onClick={handleStartRankMatchmaking}
                    className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm py-3 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>GHÉP TRẬN ĐẤU HẠNG NGAY</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Topic Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Cấu hình hiện tại:</p>
              <div className="flex items-center justify-between text-white font-semibold">
                <span>Chủ đề:</span>
                <span className="text-cyan-300 font-bold">{currentTopic.name} ({currentTopic.words.length} từ)</span>
              </div>
              <div className="flex items-center justify-between text-white font-semibold">
                <span>Cấp độ:</span>
                <span className="text-amber-300 font-bold">{DIFFICULTY_CONFIG[difficulty].label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tự tạo bộ từ vựng (Custom Vocab Pack) */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Tự Tạo Bộ Từ Vựng Riêng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Nhập danh sách từ vựng bạn muốn ôn tập. Mỗi dòng là một từ kèm nghĩa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Tên bộ từ:</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ví dụ: Từ vựng Unit 3, Từ hay quên..."
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Danh sách từ vựng (mỗi từ 1 dòng):</label>
                <span className="text-xs text-cyan-400 font-medium">Định dạng: từ - nghĩa</span>
              </div>
              <Textarea
                rows={8}
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                placeholder={`apple - quả táo\nbanana - quả chuối\ncomputer - máy vi tính\nknowledge - kiến thức\nbeautiful - xinh đẹp`}
                className="bg-slate-950 border-slate-700 text-white font-mono text-xs placeholder:text-slate-600 leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCustomModalOpen(false)}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSaveCustomPack}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
            >
              Lưu & Chọn bộ từ này
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Đấu PvP Online (Tạo / Vào phòng & Phòng Chờ) */}
      <Dialog open={isPvPModalOpen} onOpenChange={(open) => { if (!open) handleClosePvPModal(); else setIsPvPModalOpen(true); }}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              {startCountdown !== null
                ? 'Đếm Ngược Xuất Kích!'
                : isHost
                ? pvpModalMode === 'ranked'
                  ? '👑 Phòng Đấu Hạng (Ranked 1v1)'
                  : '⚔️ Phòng Đấu Thường (Casual 1v1)'
                : isGuestWaiting
                ? pvpModalMode === 'ranked'
                  ? '👑 Phòng Chờ Đấu Hạng (Ranked)'
                  : '⚔️ Phòng Chờ Giao Hữu (Casual)'
                : 'Tham Gia Phòng Đấu PvP'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {startCountdown !== null
                ? 'Hai bên đang đồng bộ buồng lái xuất kích...'
                : pvpModalMode === 'ranked'
                ? '⭐ Trận Đấu Xếp Hạng: Thắng nhận +1 sao, Thua bị -1 sao (Bảo hộ bậc Đồng). Chỉ có đấu hạng mới tính rank!'
                : '⚔️ Trận Đấu Giao Hữu: Vui vẻ rèn luyện phản xạ và tốc độ gõ từ vựng (Không tính điểm rank).'}
            </DialogDescription>
          </DialogHeader>

          {/* 1. Countdown Mode — Immersive Full Visual */}
          {startCountdown !== null ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-5 select-none">
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-transparent to-transparent animate-pulse pointer-events-none" />
              
              <div className="relative">
                {/* Outer ring pulser */}
                <div className="absolute -inset-3 rounded-full border-2 border-cyan-400/30 animate-ping pointer-events-none" />
                <div className="absolute -inset-6 rounded-full border border-cyan-400/10 animate-pulse pointer-events-none" />
                
                {/* Main countdown circle */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.5),_inset_0_0_20px_rgba(6,182,212,0.1)]">
                  <span className="text-7xl font-black text-cyan-300 font-mono" style={{ textShadow: '0 0 20px rgba(6,182,212,0.8)' }}>
                    {startCountdown}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-2xl font-black text-white tracking-widest uppercase" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                  {startCountdown === 1 ? '🚀 XUẤT KÍCH CHIẾN ĐẤU!' : '⚡ CHUẨN BỊ XUẤT KÍCH!'}
                </h3>
                <p className="text-xs text-cyan-400/90 font-mono tracking-wide">
                  Đang khởi động buồng lái hai bên đối đầu trực diện...
                </p>
              </div>
            </div>
          ) : isHost ? (
            /* 2. Host Waiting Room */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 text-center space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã Phòng Của Bạn:</p>
                <p className="text-3xl font-black text-cyan-300 tracking-widest font-mono">
                  {roomCode}
                </p>
                <div className="pt-1">
                  <Button
                    onClick={copyRoomLink}
                    size="sm"
                    variant="outline"
                    className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                    Sao chép Link mời bạn bè
                  </Button>
                </div>
              </div>

              {/* Status Card: Opponent Connected or Waiting */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3",
                isOpponentJoined
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : "bg-slate-950/80 border-slate-800"
              )}>
                {isOpponentJoined ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <p className="text-xs font-black text-emerald-300 uppercase tracking-wide">Đối Thủ Đã Vào Phòng!</p>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{opponentName || 'Người chơi 2'} (Đã sẵn sàng)</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <p className="text-xs font-black text-amber-300 uppercase tracking-wide">Đang Chờ Đối Thủ...</p>
                      </div>
                      <p className="text-xs text-slate-400">Gửi mã hoặc link cho bạn bè để cùng tham chiến</p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>Bộ từ: <strong className="text-white">{currentTopic.name}</strong></span>
                <span>Cấp độ: <strong className="text-amber-300">{DIFFICULTY_CONFIG[difficulty].label}</strong></span>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClosePvPModal}
                  className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                >
                  Hủy Phòng
                </Button>
                <Button
                  onClick={handleHostStartPvP}
                  disabled={!isOpponentJoined}
                  className={cn(
                    "flex-1 font-black text-sm py-3 transition-all duration-300",
                    isOpponentJoined
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer"
                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  )}
                >
                  {isOpponentJoined ? (
                    <>
                      <Rocket className="w-4 h-4 mr-2 text-slate-950 animate-pulse" />
                      BẮT ĐẦU TRẬN ĐẤU NGAY!
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chờ Đối Thủ Vào Phòng...
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : isGuestWaiting ? (
            /* 3. Guest Waiting for Host to Start */
            <div className="space-y-4 py-4 text-center">
              <div className="p-6 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ĐÃ VÀO PHÒNG: {roomCode}
                </div>
                <div className="py-2 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Radio className="w-8 h-8 animate-pulse text-cyan-400" />
                  </div>
                </div>
                <h4 className="text-base font-black text-white">Đang Chờ Chủ Phòng Khai Hỏa...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Chủ phòng đang thiết lập trận đấu. Hai bên sẽ tự động xuất kích cùng lúc ngay khi chủ phòng bấm Bắt Đầu!
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleClosePvPModal}
                  className="w-full bg-slate-800 border-slate-700 text-slate-300 text-xs"
                >
                  Rời Phòng
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* 4. Guest Enter Room Code */
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Nhập Mã Phòng (6 ký tự):</label>
                <Input
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: SKY982"
                  className="bg-slate-950 border-slate-700 text-white font-mono text-center tracking-widest text-lg font-bold uppercase"
                  maxLength={8}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClosePvPModal}
                  className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs"
                >
                  Tham Gia Phòng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ranked Fair Matchmaking Modal Dialog (Cơ chế ghép rank cân bằng ±1 bậc, không tạo phòng) */}
      <Dialog 
        open={isRankMatchModalOpen} 
        onOpenChange={(open) => {
          if (!open && matchState === 'searching') {
            handleCancelRankMatchmaking();
          }
        }}
      >
        <DialogContent 
          onPointerDownOutside={(e) => {
            if (matchState === 'found') e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (matchState === 'found') e.preventDefault();
          }}
          className="max-w-md sm:max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 text-white overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] p-5 sm:p-6"
        >
          <DialogHeader className="text-center space-y-1">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-lg shadow-amber-500/30">
              👑
            </div>
            <DialogTitle className="text-xl font-black text-amber-300 tracking-wide uppercase">
              {matchState === 'searching' ? 'Hệ Thống Đang Tìm Trận Đấu Hạng...' : 'ĐÃ TÌM THẤY ĐỐI THỦ!'}
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-200/80">
              {matchState === 'searching'
                ? 'Đang ghép đối thủ có trình độ tương đương (chênh lệch rank ≤ 1 phân hạng)'
                : 'Chuẩn bị buồng lái chiến đấu! Trận đấu bắt đầu ngay sau đếm ngược.'}
            </DialogDescription>
          </DialogHeader>

          {/* Cards: Player VS Opponent */}
          <div className="py-3 sm:py-4">
            <div className="grid grid-cols-5 gap-2 items-center">
              {/* Player Card (2 cols) */}
              <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-amber-500/40 text-center space-y-1.5 relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 mx-auto flex items-center justify-center text-2xl shadow-md">
                  👨‍✈️
                </div>
                <div>
                  <h4 className="text-xs font-black text-white truncate">Bạn (Pilot)</h4>
                  <div className="text-[11px] font-bold text-amber-400">
                    {currentRankInfo.icon} {currentRankInfo.tierNameVi} {currentRankInfo.divisionRoman}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                    <span>{playerRank.stars} ⭐</span>
                    <span>•</span>
                    <span>{playerRank.totalMatches > 0 ? Math.round((playerRank.wins / playerRank.totalMatches) * 100) : 50}% Thắng</span>
                  </div>
                </div>
              </div>

              {/* VS Badge (1 col) */}
              <div className="col-span-1 flex flex-col items-center justify-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/40">
                  VS
                </div>
                {matchState === 'searching' ? (
                  <span className="text-[10px] font-mono text-amber-300 font-bold animate-pulse">
                    {formatMatchTimer(matchSearchingTimer)}
                  </span>
                ) : (
                  <span className="text-xs font-mono font-black text-emerald-400 animate-bounce">
                    Ready!
                  </span>
                )}
              </div>

              {/* Opponent Card (2 cols) */}
              <div className="col-span-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-1.5 relative overflow-hidden">
                {matchState === 'searching' ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-dashed border-amber-500/50 mx-auto flex items-center justify-center text-xl animate-spin">
                      🧭
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 animate-pulse">Đang quét...</h4>
                      <div className="text-[10px] text-amber-400/80">
                        {currentRankInfo.tierNameVi} ±1 bậc
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Thuật toán cân bằng
                      </div>
                    </div>
                  </>
                ) : matchedRankOpponent ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-red-950/40 border-2 border-red-500/60 mx-auto flex items-center justify-center text-2xl shadow-md animate-bounce">
                      {matchedRankOpponent.avatar}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white truncate">{matchedRankOpponent.name}</h4>
                      <div className="text-[11px] font-bold text-amber-400">
                        {matchedRankOpponent.icon} {matchedRankOpponent.tierNameVi} {matchedRankOpponent.divisionRoman}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <span>{matchedRankOpponent.stars} ⭐</span>
                        <span>•</span>
                        <span>{matchedRankOpponent.winRate}% Thắng</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Rank Parity Match Banner */}
            {matchState === 'found' && matchedRankOpponent && (
              <div className="mt-4 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center">
                <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{matchedRankOpponent.rankDeltaText}</span>
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Tốc độ phản xạ đối thủ đã được đồng bộ chính xác theo bậc rank
                </div>
              </div>
            )}

            {/* Countdown / Search state bar */}
            {matchState === 'found' ? (
              <div className="mt-4 text-center space-y-1">
                <div className="text-3xl font-black text-amber-400 font-mono animate-pulse">
                  {matchCountdown}
                </div>
                <p className="text-xs text-slate-300 font-medium">Xuất kích vào buồng lái...</p>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Đang quét các phi công trực tuyến cùng bậc rank...</span>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            {matchState === 'searching' ? (
              <Button
                variant="outline"
                onClick={handleCancelRankMatchmaking}
                className="w-full sm:w-auto border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold py-2 rounded-xl cursor-pointer"
              >
                Hủy Tìm Trận
              </Button>
            ) : matchedRankOpponent ? (
              <Button
                onClick={() => handleInstantRankStart(matchedRankOpponent)}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs py-2.5 px-6 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 duration-120 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                Vào Trận Ngay ({matchCountdown}s)
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tutorial Onboarding Modal */}
      <WordShooterTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Leaderboard Modal */}
      <WordShooterLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
};
