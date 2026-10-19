import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { WordDefenseArena } from '@/components/game/WordDefense/WordDefenseArena';
import { WordDefenseResult } from '@/components/game/WordDefense/WordDefenseResult';
import { DefenseDifficulty, DefenseGameMode, DefenseStats } from '@/components/game/WordDefense/types';
import { VocabTopic } from '@/components/game/WordShooter/types';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { getCachedVocabPacks } from '@/services/vocabPacksService';
import { Maximize2, Minimize2, ArrowLeft, Shield, Sparkles, Wrench, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { useQuery } from '@tanstack/react-query';
import { getHomepageShowcaseConfig } from '@/services/homepageShowcaseService';

type GameState = 'playing' | 'result';

export default function WordDefenseGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { addXp, recordVocabProgress } = useGamification();

  const { data: showcaseConfig } = useQuery({
    queryKey: ['homepage-showcase-config'],
    queryFn: () => getHomepageShowcaseConfig(),
  });

  const gameConfig = showcaseConfig?.arcade_section?.games?.find((g) => g.id === 'word-defense');
  const isGameActive = gameConfig ? gameConfig.is_active : true;

  const difficultyParam = (searchParams.get('difficulty') as DefenseDifficulty) || 'medium';
  const modeParam = (searchParams.get('mode') as DefenseGameMode) || 'campaign';
  const topicIdParam = searchParams.get('topic');

  const [gameState, setGameState] = useState<GameState>('playing');
  const [selectedTopic, setSelectedTopic] = useState<VocabTopic>(() => {
    const packs = [...getCachedVocabPacks(), ...DEFAULT_VOCAB_TOPICS];
    if (topicIdParam) {
      const found = packs.find((p) => p.id === topicIdParam);
      if (found) return found;
    }
    return packs[0] || DEFAULT_VOCAB_TOPICS[0];
  });
  const [difficulty, setDifficulty] = useState<DefenseDifficulty>(difficultyParam);
  const [gameMode, setGameMode] = useState<DefenseGameMode>(modeParam);
  const [roomId, setRoomId] = useState<string | undefined>(() => searchParams.get('room')?.toUpperCase() || undefined);
  const [isHost, setIsHost] = useState<boolean>(false);

  // Result stats
  const [finalStats, setFinalStats] = useState<DefenseStats | null>(null);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Check ?room= query param for PvP direct invite link
  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl.toUpperCase());
      setGameMode('pvp-online');
      setIsHost(false);
      setGameState('playing');
    }
  }, [searchParams]);

  // Game over handler
  const handleGameOver = (stats: DefenseStats, victory: boolean) => {
    setFinalStats(stats);
    setIsVictory(victory);
    setGameState('result');

    // Award Gamification XP & Daily Quest Progress
    try {
      const earnedXp = Math.max(20, Math.min(150, Math.floor((stats.score || 50) / 15 + (victory ? 35 : 10))));
      addXp(earnedXp, `Chiến trường Thủ Thành Từ Vựng (${victory ? 'Chiến Thắng!' : 'Hoàn thành'})`);
      recordVocabProgress(Math.min(5, Math.max(1, Math.floor((stats.wordsDestroyed || 3) / 3))));
    } catch (e) {
      console.warn('Gamification reward error:', e);
    }
  };

  // Replay
  const handlePlayAgain = () => {
    setGameState('playing');
  };

  const handleBackToLobby = () => {
    navigate('/games');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  if (!isGameActive && !isAdmin) {
    return (
      <StudentLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/10">
            🛠️
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Trò Chơi Tạm Tắt Bảo Trì
            </span>
            <h2 className="text-2xl font-black text-white font-display">
              {gameConfig?.title || "Word Defense"} Đang Tạm Đóng
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Trò chơi này hiện đang được ban quản trị tạm tắt để nâng cấp &amp; tối ưu tính năng mới. Vui lòng quay lại sau hoặc thử các trò chơi từ vựng khác nhé!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => navigate('/games')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-6 py-5 rounded-2xl cursor-pointer"
            >
              🕹️ Đến Đấu Trường Game Khác
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 font-bold text-xs px-6 py-5 rounded-2xl cursor-pointer"
            >
              🏠 Về Trang Chủ
            </Button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const content = (
    <div className="w-full min-h-screen bg-slate-950 text-foreground flex flex-col justify-between relative overflow-x-hidden">
      {!isGameActive && isAdmin && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-300 font-bold flex items-center justify-center gap-2 z-50">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Chế độ Quản Trị Viên: Trò chơi đang tắt với học viên, bạn đang xem trước &amp; thử nghiệm.</span>
        </div>
      )}
      {/* Top Floating Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-emerald-900/30 bg-slate-950/85 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBackToLobby}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Về Sảnh Game
          </Button>

          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="inline-flex items-center justify-center p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">
              Word Defense: Cuộc Chiến Khu Vườn
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 transition-colors"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Dynamic View */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        {gameState === 'playing' && (
          <WordDefenseArena
            topic={selectedTopic}
            difficulty={difficulty}
            mode={gameMode}
            roomId={roomId}
            isHost={isHost}
            onGameOver={handleGameOver}
            onExit={handleBackToLobby}
          />
        )}

        {gameState === 'result' && finalStats && (
          <WordDefenseResult
            stats={finalStats}
            isVictory={isVictory}
            topicName={selectedTopic.name}
            onPlayAgain={handlePlayAgain}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </div>
    </div>
  );

  return isFullscreen ? content : <StudentLayout>{content}</StudentLayout>;
}
