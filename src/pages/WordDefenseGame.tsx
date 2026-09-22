import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StudentLayout from '@/components/StudentLayout';
import { WordDefenseLobby } from '@/components/game/WordDefense/WordDefenseLobby';
import { WordDefenseArena } from '@/components/game/WordDefense/WordDefenseArena';
import { WordDefenseResult } from '@/components/game/WordDefense/WordDefenseResult';
import { DefenseDifficulty, DefenseGameMode, DefenseStats } from '@/components/game/WordDefense/types';
import { VocabTopic } from '@/components/game/WordShooter/types';
import { DEFAULT_VOCAB_TOPICS } from '@/components/game/WordShooter/defaultVocabPacks';
import { getCachedVocabPacks } from '@/services/vocabPacksService';
import { Maximize2, Minimize2, ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GameState = 'lobby' | 'playing' | 'result';

export default function WordDefenseGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>('lobby');
  const [selectedTopic, setSelectedTopic] = useState<VocabTopic>(() => getCachedVocabPacks()[0] || DEFAULT_VOCAB_TOPICS[0]);
  const [difficulty, setDifficulty] = useState<DefenseDifficulty>('medium');
  const [gameMode, setGameMode] = useState<DefenseGameMode>('campaign');
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
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
    }
  }, [searchParams]);

  // Start game handler
  const handleStartGame = (config: {
    topic: VocabTopic;
    difficulty: DefenseDifficulty;
    mode: DefenseGameMode;
    roomId?: string;
    isHost?: boolean;
  }) => {
    setSelectedTopic(config.topic);
    setDifficulty(config.difficulty);
    setGameMode(config.mode);
    setRoomId(config.roomId);
    setIsHost(config.isHost ?? false);
    setGameState('playing');
  };

  // Game over handler
  const handleGameOver = (stats: DefenseStats, victory: boolean) => {
    setFinalStats(stats);
    setIsVictory(victory);
    setGameState('result');
  };

  // Replay
  const handlePlayAgain = () => {
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
      {/* Top Floating Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-emerald-900/30 bg-slate-950/85 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (gameState !== 'lobby') {
                handleBackToLobby();
              } else {
                navigate('/games');
              }
            }}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {gameState !== 'lobby' ? 'Về Sảnh Thủ Thành' : 'Kho Game'}
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
        {gameState === 'lobby' && (
          <WordDefenseLobby onStartGame={handleStartGame} initialRoomId={roomId} />
        )}

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
