import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { WordShooterLobby } from '@/components/game/WordShooter/WordShooterLobby';
import { WordShooterArena } from '@/components/game/WordShooter/WordShooterArena';
import { WordShooterResult } from '@/components/game/WordShooter/WordShooterResult';
import { 
  VocabTopic, 
  GameDifficulty, 
  GameMode, 
  GameStats, 
  WordReviewItem 
} from '@/components/game/WordShooter/types';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { getCachedVocabPacks } from '@/services/vocabPacksService';
import { Maximize2, Minimize2, ArrowLeft, HelpCircle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WordShooterTutorialModal } from '@/components/game/WordShooter/WordShooterTutorialModal';
import { WordShooterLeaderboardModal } from '@/components/game/WordShooter/WordShooterLeaderboardModal';
import { MatchedRankedOpponent } from '@/services/wordShooterRankService';

type GameState = 'lobby' | 'playing' | 'result';

export default function WordShooterGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>('lobby');
  const [selectedTopic, setSelectedTopic] = useState<VocabTopic>(() => getCachedVocabPacks()[0] || DEFAULT_VOCAB_TOPICS[0]);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [matchedOpponent, setMatchedOpponent] = useState<MatchedRankedOpponent | undefined>(undefined);

  // Result stats
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [pvpResultData, setPvpResultData] = useState<any>(null);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  // Read ?room= query param on mount
  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
      const code = roomFromUrl.toUpperCase();
      setRoomId(code);
      setGameMode(code.startsWith('R-') ? 'ranked' : 'casual');
      setIsHost(false);
    }
  }, [searchParams]);

  // Start game handler
  const handleStartGame = (config: {
    topic: VocabTopic;
    difficulty: GameDifficulty;
    mode: GameMode;
    roomId?: string;
    isHost?: boolean;
    matchedOpponent?: MatchedRankedOpponent;
  }) => {
    setSelectedTopic(config.topic);
    setDifficulty(config.difficulty);
    setGameMode(config.mode);
    setRoomId(config.roomId);
    setIsHost(config.isHost ?? false);
    setMatchedOpponent(config.matchedOpponent);
    setGameState('playing');
  };

  // Game over handler
  const handleGameOver = (stats: GameStats, victory: boolean, pvpData?: any) => {
    setFinalStats(stats);
    setIsVictory(victory);
    setPvpResultData(pvpData);
    setGameState('result');
  };

  // Replay same setup
  const handlePlayAgain = () => {
    setGameState('playing');
  };

  // Practice only missed words
  const handlePracticeMissedWords = (missedWords: WordReviewItem[]) => {
    const customMissedTopic: VocabTopic = {
      id: `missed_${Date.now()}`,
      name: `Ôn tập ${missedWords.length} từ bắn hụt`,
      icon: '🎯',
      description: 'Luyện tập tập trung các từ vựng bạn vừa bỏ lỡ trong ván trước.',
      words: missedWords.map((item) => ({
        id: item.id,
        word: item.word,
        phonetic: item.phonetic,
        definition_vi: item.definition_vi,
        audioUrl: item.audioUrl,
      })),
    };
    setSelectedTopic(customMissedTopic);
    setGameState('playing');
  };

  const handleBackToLobby = () => {
    setGameState('lobby');
    setFinalStats(null);
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

  const content = (
    <div className="w-full min-h-screen bg-slate-950 text-foreground flex flex-col justify-between relative overflow-x-hidden">
      {/* Top Floating Control Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (gameState !== 'lobby') {
                handleBackToLobby();
              } else {
                navigate('/');
              }
            }}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {gameState !== 'lobby' ? 'Về Sảnh Game' : 'Trang chủ'}
          </Button>

          <span className="text-xs font-black text-slate-500 uppercase tracking-wider hidden sm:inline">
            Phi Cơ Diệt Từ Vựng 2.0 • Rank Liên Quân
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Leaderboard Button */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="p-2 rounded-xl text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Xem bảng xếp hạng người chơi"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bảng Xếp Hạng</span>
          </button>

          <button
            onClick={() => setIsTutorialOpen(true)}
            className="p-2 rounded-xl text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Xem hướng dẫn chơi game"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Dynamic View */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        {gameState === 'lobby' && (
          <WordShooterLobby onStartGame={handleStartGame} initialRoomId={roomId} />
        )}

        {gameState === 'playing' && (
          <WordShooterArena
            topic={selectedTopic}
            difficulty={difficulty}
            mode={gameMode}
            roomId={roomId}
            isHost={isHost}
            matchedOpponent={matchedOpponent}
            onGameOver={handleGameOver}
            onExit={handleBackToLobby}
          />
        )}

        {gameState === 'result' && finalStats && (
          <WordShooterResult
            stats={finalStats}
            topic={selectedTopic}
            difficulty={difficulty}
            isVictory={isVictory}
            isPvP={gameMode !== 'solo'}
            opponentName={
              gameMode === 'bot' || gameMode === 'pvp-bot'
                ? 'AI Pilot'
                : gameMode === 'ranked'
                ? matchedOpponent
                  ? `[${matchedOpponent.tierNameVi} ${matchedOpponent.divisionRoman}] ${matchedOpponent.name}`.trim()
                  : 'Đối Thủ Xếp Hạng'
                : 'Bạn Đấu Giao Hữu'
            }
            pvpResult={pvpResultData}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onPlayAgain={handlePlayAgain}
            onPracticeMissedWords={handlePracticeMissedWords}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </div>

      {/* Leaderboard Modal */}
      <WordShooterLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      {/* Tutorial Modal */}
      <WordShooterTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );

  return isFullscreen ? content : <StudentLayout>{content}</StudentLayout>;
}
