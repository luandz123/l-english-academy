import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Heart, 
  Flame, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  Music,
  Snowflake, 
  Bomb, 
  Zap, 
  ShieldAlert,
  Sparkles,
  Swords,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Crown,
  Smartphone,
  Info
} from 'lucide-react';
import { 
  GameWord, 
  VocabTopic, 
  GameDifficulty, 
  GameMode, 
  FloatingPop, 
  LaserBeam, 
  Particle, 
  GameStats, 
  WordReviewItem, 
  OpponentState,
  SpecialWordType,
  PvPBroadcastMessage,
  PvPAttackType
} from './types';
import { DIFFICULTY_CONFIG } from './defaultVocabPacks';
import { gameSound } from './gameSound';
import { WordShooterPvPView } from './WordShooterPvPView';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface WordShooterArenaProps {
  topic: VocabTopic;
  difficulty: GameDifficulty;
  mode: GameMode;
  roomId?: string;
  isHost?: boolean;
  onGameOver: (stats: GameStats, isVictory: boolean) => void;
  onExit: () => void;
}

// Vietnamese IME Accent Mapping Table (Telex / VNI auto-normalization)
const VN_ACCENT_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ú': 'u', 'ù': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd'
};

const normalizeChar = (c: string): string => {
  const lower = c.toLowerCase();
  return VN_ACCENT_MAP[lower] || lower;
};

export const WordShooterArena: React.FC<WordShooterArenaProps> = ({
  topic,
  difficulty,
  mode,
  roomId,
  isHost = false,
  onGameOver,
  onExit,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[difficulty];
  const isPvP = mode === 'pvp-online' || mode === 'pvp-bot';

  // Core Game Play States
  const [activeWords, setActiveWords] = useState<GameWord[]>([]);
  const activeWordsRef = useRef<GameWord[]>([]);
  useEffect(() => {
    activeWordsRef.current = activeWords;
  }, [activeWords]);

  const [lives, setLives] = useState<number>(isPvP ? 3 : diffConfig.maxLives);
  const livesRef = useRef<number>(isPvP ? 3 : diffConfig.maxLives);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const [score, setScore] = useState<number>(0);
  const scoreRef = useRef<number>(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const [combo, setCombo] = useState<number>(0);
  const comboRef = useRef<number>(0);
  useEffect(() => { comboRef.current = combo; }, [combo]);

  const [maxCombo, setMaxCombo] = useState<number>(0);
  const maxComboRef = useRef<number>(0);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);

  const pvpChannelRef = useRef<any>(null);

  const [wave, setWave] = useState<number>(1);
  const waveRef = useRef<number>(1);
  useEffect(() => { waveRef.current = wave; }, [wave]);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const [freezeTimer, setFreezeTimer] = useState<number>(0); // remaining seconds
  const freezeTimerRef = useRef<number>(0);
  useEffect(() => { freezeTimerRef.current = freezeTimer; }, [freezeTimer]);

  const [slowMoTimer, setSlowMoTimer] = useState<number>(0); // slow motion seconds
  const slowMoTimerRef = useRef<number>(0);
  useEffect(() => { slowMoTimerRef.current = slowMoTimer; }, [slowMoTimer]);

  const [hasShield, setHasShield] = useState<boolean>(false); // Energy shield status
  const hasShieldRef = useRef<boolean>(false);
  useEffect(() => { hasShieldRef.current = hasShield; }, [hasShield]);

  const [isMuted, setIsMuted] = useState<boolean>(gameSound.getMuted());
  const [isBgmOn, setIsBgmOn] = useState<boolean>(gameSound.isBGMActive());
  const [showMeaningHint, setShowMeaningHint] = useState<boolean>(true); // Vietnamese hint

  // Visual Effects & Combat States
  const [floatingPops, setFloatingPops] = useState<FloatingPop[]>([]);
  const [laserBeams, setLaserBeams] = useState<LaserBeam[]>([]);
  const [jetAngle, setJetAngle] = useState<number>(0);
  const jetAngleRef = useRef<number>(0);
  useEffect(() => { jetAngleRef.current = jetAngle; }, [jetAngle]);

  const [jetX, setJetX] = useState<number>(50); // Jet horizontal % (0-100)
  const jetXRef = useRef<number>(50);
  useEffect(() => { jetXRef.current = jetX; }, [jetX]);

  const [muzzleFlash, setMuzzleFlash] = useState<boolean>(false);
  const muzzleFlashRef = useRef<boolean>(false);
  useEffect(() => { muzzleFlashRef.current = muzzleFlash; }, [muzzleFlash]);

  const isGameOverRef = useRef<boolean>(false);
  const localBcRef = useRef<BroadcastChannel | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [waveNotice, setWaveNotice] = useState<string | null>(null);
  const [comboCallout, setComboCallout] = useState<{ text: string; color: string; id: number } | null>(null);

  // Keystrokes & Performance Tracking
  const statsRef = useRef<{
    totalKeystrokes: number;
    correctKeystrokes: number;
    hitCount: number;
    missedCount: number;
    startTime: number;
    wordsReviewed: Map<string | number, WordReviewItem>;
  }>({
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    hitCount: 0,
    missedCount: 0,
    startTime: Date.now(),
    wordsReviewed: new Map(),
  });

  // Current Targeted Word
  const [targetedInstanceId, setTargetedInstanceId] = useState<string | null>(null);
  const targetedInstanceIdRef = useRef<string | null>(null);
  useEffect(() => { targetedInstanceIdRef.current = targetedInstanceId; }, [targetedInstanceId]);

  // PvP State
  const [opponent, setOpponent] = useState<OpponentState>({
    name: mode === 'pvp-bot' ? 'AI Ace Pilot' : 'Đối Thủ',
    lives: 3,
    score: 0,
    combo: 0,
    activeWordCount: 0,
    isEliminated: false,
    wpm: 0,
    accuracy: 100,
    waveReached: 1,
  });
  const [attackNotice, setAttackNotice] = useState<string | null>(null);
  const [incomingAlert, setIncomingAlert] = useState<boolean>(false);
  const [opponentSimWords, setOpponentSimWords] = useState<Array<{ x: number; y: number; word: string; lettersTyped?: number; isTargeted?: boolean; specialType?: SpecialWordType }>>([]);

  // Face-to-Face Opponent Jet State (Top nemesis fighter)
  const [opponentJetX, setOpponentJetX] = useState<number>(50);
  const opponentJetXRef = useRef<number>(50);
  useEffect(() => { opponentJetXRef.current = opponentJetX; }, [opponentJetX]);

  const [opponentJetAngle, setOpponentJetAngle] = useState<number>(0);
  const [opponentMuzzleFlash, setOpponentMuzzleFlash] = useState<boolean>(false);
  const [opponentLasers, setOpponentLasers] = useState<Array<{ id: string; startX: number; startY: number; targetX: number; targetY: number }>>([]);
  const [nemesisImpact, setNemesisImpact] = useState<boolean>(false);

  const triggerOpponentShot = useCallback((startX = opponentJetXRef.current, targetX = jetXRef.current) => {
    setOpponentMuzzleFlash(true);
    setTimeout(() => setOpponentMuzzleFlash(false), 120);

    const shotId = `op_laser_${Date.now()}_${Math.random()}`;
    setOpponentLasers((prev) => [
      ...prev,
      {
        id: shotId,
        startX,
        startY: 12,
        targetX,
        targetY: 88,
      },
    ]);
    setTimeout(() => {
      setOpponentLasers((prev) => prev.filter((l) => l.id !== shotId));
    }, 150);
  }, []);

  // Canvas & DOM refs
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus mobile input on mount or interaction
  const focusInput = useCallback(() => {
    mobileInputRef.current?.focus();
  }, []);

  // Trigger floating pop animation
  const addFloatingPop = useCallback((
    word: string, 
    phonetic: string | undefined | null, 
    def: string, 
    x: number, 
    y: number, 
    type: FloatingPop['type']
  ) => {
    const pop: FloatingPop = {
      id: `pop_${Date.now()}_${Math.random()}`,
      word,
      phonetic,
      definition: def,
      x: Math.min(Math.max(x, 15), 85),
      y: Math.max(y, 10),
      type,
      createdAt: Date.now(),
    };
    setFloatingPops((prev) => [...prev, pop]);

    setTimeout(() => {
      setFloatingPops((prev) => prev.filter((p) => p.id !== pop.id));
    }, 2200);
  }, []);

  // Spawn visual particles
  const spawnExplosionParticles = useCallback((
    xPercent: number, 
    yPercent: number, 
    color: string = '#00f2fe', 
    count: number = 24
  ) => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const px = (xPercent / 100) * canvas.width;
    const py = (yPercent / 100) * canvas.height;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 25 + 20,
      });
    }
  }, []);

  // Fire DUAL PLASMA LASERS from Jet Left & Right Cannons
  const fireDualLaser = useCallback((targetX: number, targetY: number, color: string = '#00f2fe') => {
    const beamLeftId = `beam_${Date.now()}_L`;
    const beamRightId = `beam_${Date.now()}_R`;

    const leftCannonX = jetX - 3.2;
    const rightCannonX = jetX + 3.2;

    const leftBeam: LaserBeam = {
      id: beamLeftId,
      startX: leftCannonX,
      startY: 91,
      targetX: targetX - 0.8,
      targetY,
      color,
    };

    const rightBeam: LaserBeam = {
      id: beamRightId,
      startX: rightCannonX,
      startY: 91,
      targetX: targetX + 0.8,
      targetY,
      color,
    };

    setLaserBeams((prev) => [...prev, leftBeam, rightBeam]);

    // In PvP dogfight, also fire a plasma burst directly up at the opposing Nemesis jet
    if (isPvP) {
      const counterLaserId = `beam_pvp_${Date.now()}`;
      setLaserBeams((prev) => [
        ...prev,
        {
          id: counterLaserId,
          startX: jetX,
          startY: 91,
          targetX: opponentJetXRef.current,
          targetY: 10,
          color: '#38bdf8',
        },
      ]);
      setNemesisImpact(true);
      setTimeout(() => setNemesisImpact(false), 180);
      setTimeout(() => {
        setLaserBeams((prev) => prev.filter((b) => b.id !== counterLaserId));
      }, 140);
    }

    setMuzzleFlash(true);
    setTimeout(() => setMuzzleFlash(false), 90);
    gameSound.playLaserSound();

    setTimeout(() => {
      setLaserBeams((prev) => prev.filter((b) => b.id !== beamLeftId && b.id !== beamRightId));
    }, 130);
  }, [jetX, isPvP]);

  // PvP Attack Trigger
  const sendAttackToOpponent = useCallback((wordText: string) => {
    setAttackNotice(`⚡ PHẢN ĐÒN THẢ THIÊN THẠCH VÀO ${opponent.name}!`);
    gameSound.playMeteorLaunchSound();
    gameSound.playAttackSentSound();
    setNemesisImpact(true);
    setTimeout(() => setNemesisImpact(false), 400);

    setTimeout(() => {
      setAttackNotice(null);
    }, 2500);

    if (mode === 'pvp-online' && roomId) {
      const attackPayload = {
        senderId: 'player',
        attackWord: {
          id: `atk_${Date.now()}`,
          word: wordText.length >= 7 ? wordText : 'danger',
          definition_vi: 'Thiên thạch phản đòn',
        },
      };
      try {
        pvpChannelRef.current?.send({
          type: 'broadcast',
          event: 'attack',
          payload: attackPayload,
        });
      } catch {}
      try {
        localBcRef.current?.postMessage({
          event: 'attack',
          payload: attackPayload,
        });
      } catch {}
    } else if (mode === 'pvp-bot') {
      setOpponent((prev) => ({
        ...prev,
        combo: 0,
        score: Math.max(0, prev.score - 50),
      }));
    }
  }, [mode, roomId, opponent.name]);

  // Handle incoming attack
  const receiveIncomingAttack = useCallback((atkWord?: GameWord) => {
    setIncomingAlert(true);
    gameSound.playIncomingAlertSound();
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
    setTimeout(() => setIncomingAlert(false), 3000);

    // Opponent Nemesis Jet opens fire downwards
    triggerOpponentShot(opponentJetXRef.current, jetXRef.current);

    // Meteor drops directly from opponent's horizontal position
    const meteorX = Math.max(16, Math.min(84, opponentJetXRef.current));

    const meteorWord: GameWord = {
      id: `meteor_${Date.now()}`,
      instanceId: `meteor_${Date.now()}_${Math.random()}`,
      word: atkWord?.word || 'meteor',
      phonetic: '/ˈmiː.ti.ɔːr/',
      definition_vi: 'Thiên thạch quấy rối',
      x: meteorX,
      y: 8,
      speed: diffConfig.baseSpeed * 1.6,
      specialType: 'meteor',
      lettersTyped: 0,
      isTargeted: false,
      isDestroyed: false,
      isFrozen: false,
      isBoss: false,
    };

    setActiveWords((prev) => {
      const next = [meteorWord, ...prev];
      activeWordsRef.current = next;
      return next;
    });
  }, [diffConfig.baseSpeed]);

  // Spawn new falling word (with Anti-Overlap Lane & Clearance Algorithm)
  const spawnWord = useCallback(() => {
    if (isGameOverRef.current) return;
    const currentWords = activeWordsRef.current.filter((w) => !w.isDestroyed);
    if (currentWords.length >= diffConfig.maxActiveWords || topic.words.length === 0) return;

    // Check if we should spawn a BOSS Word (Wave >= 2 & interval)
    const isBossDue = waveRef.current >= 2 && statsRef.current.hitCount > 0 && statsRef.current.hitCount % 12 === 0 && !currentWords.some(w => w.isBoss);

    let chosen = topic.words[Math.floor(Math.random() * topic.words.length)];
    if (isBossDue) {
      const longWords = topic.words.filter(w => w.word.length >= 6);
      if (longWords.length > 0) {
        chosen = longWords[Math.floor(Math.random() * longWords.length)];
      }
    }

    // Determine special type
    let special: SpecialWordType = isBossDue ? 'boss' : 'none';
    if (!isBossDue) {
      const rand = Math.random();
      if (rand < diffConfig.specialChance) {
        const specialTypes: SpecialWordType[] = ['heart', 'freeze', 'bomb', 'shield', 'slowmo'];
        special = specialTypes[Math.floor(Math.random() * specialTypes.length)];
      }
    }

    if (isBossDue) {
      gameSound.playBossSpawnSound();
      setWaveNotice(`👑 BOSS WORD XUẤT HIỆN: "${chosen.word.toUpperCase()}"!`);
      setTimeout(() => setWaveNotice(null), 3000);
    }

    // --- ANTI-OVERLAP CLEARANCE ALGORITHM ---
    // 5 distinct primary lanes across horizontal span (18% to 82%), spaced 16% apart
    const LANES = [18, 34, 50, 66, 82];

    // Filter available lanes:
    // A lane is ONLY available if:
    // 1. Any word in the same lane (|w.x - laneX| < 9) has already dropped well into the lower half (w.y >= 50)
    // 2. Any word in an adjacent lane (|w.x - laneX| < 18) is not in the spawn drop zone (w.y >= 26)
    const availableLanes = LANES.filter((laneX) => {
      const sameLaneConflict = currentWords.some((w) => Math.abs(w.x - laneX) < 9 && w.y < 50);
      if (sameLaneConflict) return false;
      const adjacentConflict = currentWords.some((w) => Math.abs(w.x - laneX) < 18 && w.y < 26);
      if (adjacentConflict) return false;
      return true;
    });

    // If NO lanes meet safe clearance, delay spawn to prevent overlapping existing words
    if (availableLanes.length === 0) {
      return;
    }

    // From available lanes, pick the one with greatest distance to all current words
    let chosenLane = availableLanes[0];
    let maxClearance = -1;

    availableLanes.forEach((laneX) => {
      let minDistance = 999;
      currentWords.forEach((w) => {
        const d = Math.hypot(w.x - laneX, w.y - 0);
        if (d < minDistance) minDistance = d;
      });
      if (minDistance > maxClearance) {
        maxClearance = minDistance;
        chosenLane = laneX;
      }
    });

    const finalX = chosenLane;

    // Wave speed multiplier
    const currentWave = waveRef.current;
    const waveSpeedMultiplier = 1 + (currentWave - 1) * 0.08;
    const baseWordSpeed = isBossDue 
      ? diffConfig.baseSpeed * 0.75 
      : diffConfig.baseSpeed * (0.85 + Math.random() * 0.25) * waveSpeedMultiplier;

    const newGameWord: GameWord = {
      ...chosen,
      instanceId: `word_${Date.now()}_${Math.random()}`,
      x: finalX,
      y: 0,
      speed: baseWordSpeed,
      specialType: special,
      lettersTyped: 0,
      isTargeted: false,
      isDestroyed: false,
      isFrozen: false,
      isBoss: isBossDue,
    };

    setActiveWords((prev) => {
      const next = [...prev, newGameWord];
      activeWordsRef.current = next;
      return next;
    });

    statsRef.current.wordsReviewed.set(newGameWord.word, {
      id: newGameWord.id,
      word: newGameWord.word,
      phonetic: newGameWord.phonetic,
      definition_vi: newGameWord.definition_vi,
      audioUrl: newGameWord.audioUrl,
      hit: false,
      specialType: special,
    });
  }, [diffConfig, topic.words]);

  const receiveIncomingAttackRef = useRef(receiveIncomingAttack);
  useEffect(() => { receiveIncomingAttackRef.current = receiveIncomingAttack; }, [receiveIncomingAttack]);

  // Dual-Transport PvP Dispatcher (Supabase Realtime + Local BroadcastChannel for 0ms cross-tab sync)
  const sendPvPMessage = useCallback((event: string, payload: any) => {
    if (mode !== 'pvp-online') return;
    try {
      pvpChannelRef.current?.send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch {}

    try {
      localBcRef.current?.postMessage({
        event,
        payload,
      });
    } catch {}
  }, [mode]);

  // Centralized Game Over / Victory Trigger
  const triggerGameOver = useCallback((isVictory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const elapsed = (Date.now() - statsRef.current.startTime) / 1000;
    const finalStats: GameStats = {
      score: scoreRef.current,
      accuracy: statsRef.current.totalKeystrokes > 0
        ? Math.round((statsRef.current.correctKeystrokes / statsRef.current.totalKeystrokes) * 100)
        : 100,
      wpm: Math.round((statsRef.current.hitCount / Math.max(elapsed / 60, 0.1))),
      maxCombo: maxComboRef.current,
      totalKeystrokes: statsRef.current.totalKeystrokes,
      correctKeystrokes: statsRef.current.correctKeystrokes,
      hitCount: statsRef.current.hitCount,
      missedCount: statsRef.current.missedCount,
      wordsReviewed: Array.from(statsRef.current.wordsReviewed.values()),
      elapsedSeconds: Math.round(elapsed),
      waveReached: waveRef.current,
    };

    if (isVictory) {
      gameSound.playVictorySound();
    } else {
      gameSound.playGameOverSound();
      // If current player lost in PvP Online, broadcast defeat so opponent WINS!
      if (mode === 'pvp-online' && roomId) {
        const sendGameOver = () => {
          sendPvPMessage('game_over', { isEliminated: true, lives: 0 });
          sendPvPMessage('state_sync', {
            lives: 0,
            isEliminated: true,
            score: scoreRef.current,
          });
        };
        sendGameOver();
        setTimeout(sendGameOver, 60);
      }
    }

    onGameOver(finalStats, isVictory);
  }, [mode, onGameOver, roomId, sendPvPMessage]);

  const triggerGameOverRef = useRef(triggerGameOver);
  useEffect(() => { triggerGameOverRef.current = triggerGameOver; }, [triggerGameOver]);

  // Unified PvP Message Handler (used by both Supabase Realtime & BroadcastChannel)
  const handlePvPEvent = useCallback((event: string, payload: any) => {
    if (!payload) return;

    if (event === 'state_sync') {
      // If opponent was eliminated or has 0 lives, CURRENT PLAYER WINS!
      if (payload.isEliminated || (payload.lives !== undefined && payload.lives <= 0)) {
        triggerGameOverRef.current(true);
        return;
      }

      setOpponent((prev) => ({
        ...prev,
        lives: payload.lives ?? prev.lives,
        score: payload.score ?? prev.score,
        combo: payload.combo ?? prev.combo,
        activeWordCount: payload.activeWordCount ?? prev.activeWordCount,
        currentWordText: payload.currentWordText ?? prev.currentWordText,
        wpm: payload.wpm ?? prev.wpm,
        accuracy: payload.accuracy ?? prev.accuracy,
        waveReached: payload.waveReached ?? prev.waveReached,
      }));
      if (payload.words && Array.isArray(payload.words)) {
        setOpponentSimWords(payload.words);
      }
      if (payload.jetX !== undefined) {
        setOpponentJetX(payload.jetX);
      }
      if (payload.jetAngle !== undefined) {
        setOpponentJetAngle(payload.jetAngle);
      }
      if (payload.isFiring) {
        triggerOpponentShot(payload.jetX ?? opponentJetXRef.current, jetXRef.current);
      }
    } else if (event === 'attack') {
      receiveIncomingAttackRef.current(payload?.attackWord);
    } else if (event === 'game_over') {
      // If opponent was eliminated, CURRENT PLAYER WINS!
      if (payload.isEliminated || (payload.lives !== undefined && payload.lives <= 0)) {
        triggerGameOverRef.current(true);
      }
    }
  }, [triggerOpponentShot]);

  // PvP Realtime Supabase Broadcast Channel Setup
  useEffect(() => {
    if (mode !== 'pvp-online' || !roomId) return;

    const channel = supabase.channel(`arena-pvp-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    pvpChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'state_sync' }, ({ payload }: { payload: PvPBroadcastMessage }) => {
        handlePvPEvent('state_sync', payload);
      })
      .on('broadcast', { event: 'attack' }, ({ payload }: { payload?: any }) => {
        handlePvPEvent('attack', payload);
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }: { payload: PvPBroadcastMessage }) => {
        handlePvPEvent('game_over', payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          sendPvPMessage('state_sync', {
            lives: livesRef.current,
            score: scoreRef.current,
            combo: comboRef.current,
            activeWordCount: activeWordsRef.current.filter((w) => !w.isDestroyed).length,
            words: activeWordsRef.current
              .filter((w) => !w.isDestroyed)
              .map((w) => ({ x: w.x, y: w.y, word: w.word })),
            jetX: jetXRef.current,
            jetAngle: jetAngleRef.current,
          });
        }
      });

    // Native BroadcastChannel for instant same-browser 2-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`ws-arena-${roomId}`);
        localBcRef.current = bc;
        bc.onmessage = (e) => {
          if (e.data?.event) {
            handlePvPEvent(e.data.event, e.data.payload);
          }
        };
      } catch {}
    }

    return () => {
      pvpChannelRef.current = null;
      supabase.removeChannel(channel);
      if (localBcRef.current) {
        try {
          localBcRef.current.close();
        } catch {}
        localBcRef.current = null;
      }
    };
  }, [mode, roomId, handlePvPEvent, sendPvPMessage]);

  // Periodic state synchronization to opponent in PvP Online
  useEffect(() => {
    if (mode !== 'pvp-online' || !roomId || isPaused) return;

    const broadcastMyState = () => {
      if (isGameOverRef.current) return;
      const words = activeWordsRef.current
        .filter((w) => !w.isDestroyed)
        .map((w) => ({
          x: w.x,
          y: w.y,
          word: w.word,
          lettersTyped: w.lettersTyped,
          isTargeted: w.instanceId === targetedInstanceIdRef.current,
          specialType: w.specialType,
        }));

      const currentWord = targetedInstanceIdRef.current
        ? activeWordsRef.current.find((w) => w.instanceId === targetedInstanceIdRef.current)?.word
        : undefined;

      const elapsed = (Date.now() - statsRef.current.startTime) / 1000;
      const liveWpm = Math.round((statsRef.current.hitCount / Math.max(elapsed / 60, 0.1)));
      const liveAccuracy = statsRef.current.totalKeystrokes > 0
        ? Math.round((statsRef.current.correctKeystrokes / statsRef.current.totalKeystrokes) * 100)
        : 100;

      sendPvPMessage('state_sync', {
        timestamp: Date.now(),
        lives: livesRef.current,
        score: scoreRef.current,
        combo: comboRef.current,
        activeWordCount: words.length,
        currentWordText: currentWord,
        words,
        jetX: jetXRef.current,
        jetAngle: jetAngleRef.current,
        isFiring: muzzleFlashRef.current,
        wpm: liveWpm,
        accuracy: liveAccuracy,
        waveReached: waveRef.current,
      });
    };

    const syncTimer = setInterval(broadcastMyState, 200);
    return () => clearInterval(syncTimer);
  }, [mode, roomId, isPaused, sendPvPMessage]);

  // PvP AI Bot Simulation Loop — Difficulty-Scaled Intelligent AI
  useEffect(() => {
    if (mode !== 'pvp-bot' || isPaused) return;

    // Difficulty-scaled AI parameters
    const botConfig = {
      easy: { wpm: 20, accuracy: 60, comboChance: 0.3, attackChance: 0.2, missChance: 0.08, tickMs: 2200 },
      medium: { wpm: 35, accuracy: 80, comboChance: 0.55, attackChance: 0.4, missChance: 0.04, tickMs: 1600 },
      hard: { wpm: 50, accuracy: 95, comboChance: 0.75, attackChance: 0.65, missChance: 0.015, tickMs: 1200 },
    };
    const cfg = botConfig[difficulty];

    // Bot simulated words pool — rotate through topic words
    let botWordIdx = 0;
    let botElapsed = 0;
    const botSimWordSlots: Array<{ x: number; y: number; word: string; lettersTyped: number; isTargeted: boolean; specialType?: SpecialWordType }> = [];

    // Initialize bot's simulated arena
    const initBotWords = () => {
      botSimWordSlots.length = 0;
      const count = Math.min(diffConfig.maxActiveWords, 4);
      for (let i = 0; i < count; i++) {
        const w = topic.words[(botWordIdx + i) % topic.words.length];
        botSimWordSlots.push({
          x: 18 + (i * 16) % 64,
          y: 15 + Math.random() * 50,
          word: w?.word || 'focus',
          lettersTyped: 0,
          isTargeted: i === 0,
        });
      }
      botWordIdx += count;
    };
    initBotWords();

    const botInterval = setInterval(() => {
      if (isGameOverRef.current) return;
      botElapsed += cfg.tickMs / 1000;

      setOpponent((prev) => {
        // Bot "types" a word: simulate letter-by-letter progress
        const charScore = Math.floor(Math.random() * 15 + 10) * diffConfig.scoreMultiplier;
        const nextScore = prev.score + charScore;
        
        // Combo logic: natural rhythm (burst -> pause -> burst)
        const comboRoll = Math.random();
        let nextCombo = prev.combo;
        if (comboRoll < cfg.comboChance) {
          nextCombo = prev.combo + 1;
        } else if (comboRoll > 0.9) {
          nextCombo = 0; // occasional miss resets combo
        }

        // Attack on combo 3
        if (nextCombo >= 3 && Math.random() < cfg.attackChance) {
          receiveIncomingAttackRef.current();
          return {
            ...prev,
            score: nextScore,
            combo: 0,
            wpm: cfg.wpm + Math.floor(Math.random() * 8 - 4),
            accuracy: Math.min(100, cfg.accuracy + Math.floor(Math.random() * 6 - 3)),
          };
        }

        // Life loss (rare)
        let nextLives = prev.lives;
        if (Math.random() < cfg.missChance) {
          nextLives -= 1;
          nextCombo = 0;
          if (nextLives <= 0) {
            setTimeout(() => triggerGameOverRef.current(true), 250);
            return { ...prev, lives: 0, isEliminated: true, combo: 0 };
          }
        }

        // Rotate current typing word
        const currentIdx = botWordIdx % topic.words.length;
        const currentTypingWord = topic.words[currentIdx]?.word || 'focus';

        return {
          ...prev,
          score: nextScore,
          combo: nextCombo,
          lives: nextLives,
          currentWordText: currentTypingWord,
          wpm: cfg.wpm + Math.floor(Math.random() * 8 - 4),
          accuracy: Math.min(100, cfg.accuracy + Math.floor(Math.random() * 6 - 3)),
          waveReached: Math.max(prev.waveReached || 1, Math.floor(botElapsed / 30) + 1),
        };
      });

      // Advance bot simulated words (shift positions down, replace completed)
      botSimWordSlots.forEach((sw, idx) => {
        sw.y = Math.min(85, sw.y + 3 + Math.random() * 4);
        if (sw.isTargeted) {
          sw.lettersTyped = Math.min(sw.word.length, sw.lettersTyped + Math.ceil(Math.random() * 2));
        }
      });

      // Remove completed or fallen words, add new
      for (let i = botSimWordSlots.length - 1; i >= 0; i--) {
        const sw = botSimWordSlots[i];
        if (sw.lettersTyped >= sw.word.length || sw.y >= 85) {
          botWordIdx++;
          const newWord = topic.words[botWordIdx % topic.words.length];
          botSimWordSlots[i] = {
            x: 14 + Math.random() * 72,
            y: 8 + Math.random() * 15,
            word: newWord?.word || 'target',
            lettersTyped: 0,
            isTargeted: false,
          };
        }
      }

      // Set first non-completed word as targeted
      const firstActive = botSimWordSlots.find(sw => sw.lettersTyped < sw.word.length);
      botSimWordSlots.forEach(sw => { sw.isTargeted = sw === firstActive; });

      setOpponentSimWords([...botSimWordSlots]);

      // Bot jet smooth movement & occasional firing
      setOpponentJetX((prev) => {
        const targetWord = botSimWordSlots.find(sw => sw.isTargeted);
        const target = targetWord ? targetWord.x : 50;
        return prev + (target - prev) * 0.25;
      });
      setOpponentJetAngle((Math.random() - 0.5) * 15);
      if (Math.random() > 0.5) {
        triggerOpponentShot(opponentJetXRef.current, jetXRef.current);
      }
    }, cfg.tickMs);

    return () => clearInterval(botInterval);
  }, [mode, isPaused, difficulty, topic.words, diffConfig, triggerOpponentShot]);

  // Spawn interval timer (strictly controlled interval)
  useEffect(() => {
    if (isPaused) return;
    spawnWord();
    const timeout = setTimeout(() => {
      spawnWord();
    }, 1200);
    const timer = setInterval(() => {
      spawnWord();
    }, diffConfig.spawnInterval);
    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, [isPaused, diffConfig.spawnInterval, spawnWord]);

  // Freeze effect countdown timer
  useEffect(() => {
    if (freezeTimer <= 0 || isPaused) return;
    const timer = setInterval(() => {
      setFreezeTimer((prev) => (prev <= 0.1 ? 0 : +(prev - 0.1).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [freezeTimer, isPaused]);

  // Slow-Mo effect countdown timer
  useEffect(() => {
    if (slowMoTimer <= 0 || isPaused) return;
    const timer = setInterval(() => {
      setSlowMoTimer((prev) => (prev <= 0.1 ? 0 : +(prev - 0.1).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [slowMoTimer, isPaused]);

  // Main Game Physics Loop (requestAnimationFrame)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const gameLoop = (currentTime: number) => {
      if (isGameOverRef.current) return;
      // Cap delta at 80ms to prevent sudden death jumps when switching between tabs
      const delta = Math.min((currentTime - lastTime) / 1000, 0.08);
      lastTime = currentTime;

      if (!isPausedRef.current) {
        setActiveWords((prevWords) => {
          const updated: GameWord[] = [];
          let lostLife = false;
          let shieldAbsorbed = false;

          prevWords.forEach((word) => {
            if (word.isDestroyed) return;

            // Speed calculation with Freeze & Slow-Mo factors
            const speedModifier = freezeTimerRef.current > 0 ? 0 : slowMoTimerRef.current > 0 ? 0.38 : 1.0;
            const effectiveSpeed = word.speed * speedModifier;
            const nextY = word.y + effectiveSpeed * delta * 8.5;

            // Check Danger Line Hit (> 90%)
            if (nextY >= 90) {
              if (hasShieldRef.current) {
                // Shield absorbs fatal impact!
                shieldAbsorbed = true;
                setHasShield(false);
                gameSound.playShieldBreakSound();
                spawnExplosionParticles(word.x, 90, '#38bdf8', 32);
                addFloatingPop('SHIELD BLOCK', null, 'Khiên đã cản phá!', word.x, 82, 'shield');
              } else {
                lostLife = true;
                statsRef.current.missedCount += 1;
                statsRef.current.wordsReviewed.set(word.word, {
                  id: word.id,
                  word: word.word,
                  phonetic: word.phonetic,
                  definition_vi: word.definition_vi,
                  audioUrl: word.audioUrl,
                  hit: false,
                  specialType: word.specialType,
                });
                spawnExplosionParticles(word.x, 90, '#f43f5e', 22);
                gameSound.playMissLetterSound();
              }
            } else {
              updated.push({
                ...word,
                y: nextY,
                isFrozen: freezeTimerRef.current > 0,
              });
            }
          });

          // REAL-TIME HARD ANTI-OVERLAP COLLISION & NO-OVERTAKE PHYSICS
          // Prevents words from ever covering or penetrating each other
          for (let i = 0; i < updated.length; i++) {
            for (let j = i + 1; j < updated.length; j++) {
              const w1 = updated[i];
              const w2 = updated[j];
              const dx = Math.abs(w1.x - w2.x);
              const dy = Math.abs(w1.y - w2.y);

              // Minimum separation thresholds (in percentage)
              const MIN_X = 16.0; 
              const MIN_Y = 10.5;

              if (dx < MIN_X && dy < MIN_Y) {
                const wUpper = w1.y <= w2.y ? w1 : w2;
                const wLower = w1.y <= w2.y ? w2 : w1;

                // 1. HARD VERTICAL SEPARATION: Upper word can NEVER penetrate into lower word
                wUpper.y = Math.min(wUpper.y, Math.max(0, wLower.y - MIN_Y));

                // 2. SPEED GOVERNOR (Anti-Overtake): Upper word cannot move faster than lower word
                wUpper.speed = Math.min(wUpper.speed, wLower.speed * 0.9);

                // 3. HORIZONTAL SEPARATION: Nudge apart to distinct lanes
                const overlapX = MIN_X - dx;
                const push = Math.max(0.35, overlapX * 0.35);

                if (w1.x <= w2.x) {
                  w1.x = Math.max(14, w1.x - push);
                  w2.x = Math.min(86, w2.x + push);
                } else {
                  w1.x = Math.min(86, w1.x + push);
                  w2.x = Math.max(14, w2.x - push);
                }
              }
            }
          }

          activeWordsRef.current = updated;

          if (shieldAbsorbed) {
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 300);
          }

          if (lostLife) {
            setCombo(0);
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 400);

            setLives((prev) => {
              const newLives = prev - 1;
              livesRef.current = newLives;
              if (newLives <= 0) {
                triggerGameOverRef.current(false);
              }
              return newLives;
            });
          }

          return updated;
        });

        // Jet follow target orientation
        const currentTargetId = targetedInstanceIdRef.current;
        const targetedWord = activeWordsRef.current.find((w) => w.instanceId === currentTargetId);
        if (targetedWord) {
          setJetX((prev) => {
            const nextX = prev + (targetedWord.x - prev) * 0.18;
            jetXRef.current = nextX;
            return nextX;
          });
          const dx = targetedWord.x - jetXRef.current;
          setJetAngle(Math.max(-25, Math.min(25, dx * 0.8)));
        } else {
          setJetX((prev) => {
            const nextX = prev + (50 - prev) * 0.05;
            jetXRef.current = nextX;
            return nextX;
          });
          setJetAngle((prev) => prev * 0.9);
        }
      }

      // Render canvas particles
      const canvas = particleCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          particlesRef.current.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            p.alpha = 1 - p.life / p.maxLife;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPaused, spawnExplosionParticles, addFloatingPop]);

  // UNIFIED CHARACTER PROCESSOR (Supports Desktop & Mobile Input + Vietnamese IME normalization)
  const processCharInput = useCallback((rawKey: string) => {
    const currentTargetId = targetedInstanceIdRef.current;

    // 1. Check Cancel / Retarget Keys (Backspace, Escape, Delete)
    if (rawKey === 'Backspace' || rawKey === 'Escape' || rawKey === 'Delete') {
      if (currentTargetId) {
        setTargetedInstanceId(null);
        setActiveWords((prev) => {
          const next = prev.map((w) => (w.instanceId === currentTargetId ? { ...w, isTargeted: false, lettersTyped: 0 } : w));
          activeWordsRef.current = next;
          return next;
        });
        gameSound.playRetargetSound();
      }
      return;
    }

    // Space key cancels current target UNLESS current target is expecting a space!
    if (rawKey === ' ') {
      let isTargetExpectingSpace = false;
      if (currentTargetId) {
        const currentTarget = activeWordsRef.current.find((w) => w.instanceId === currentTargetId && !w.isDestroyed);
        if (currentTarget && currentTarget.word[currentTarget.lettersTyped] === ' ') {
          isTargetExpectingSpace = true;
        }
      }

      if (!isTargetExpectingSpace) {
        if (currentTargetId) {
          setTargetedInstanceId(null);
          setActiveWords((prev) => {
            const next = prev.map((w) => (w.instanceId === currentTargetId ? { ...w, isTargeted: false, lettersTyped: 0 } : w));
            activeWordsRef.current = next;
            return next;
          });
          gameSound.playRetargetSound();
        }
        return;
      }
    }

    // 2. Normalize key via Vietnamese Accent Map
    const key = rawKey === ' ' ? ' ' : normalizeChar(rawKey);
    if (!/^[a-z0-9 -]$/.test(key)) return;

    statsRef.current.totalKeystrokes += 1;

    // 3. If currently targeted word exists:
    if (currentTargetId) {
      const currentTarget = activeWordsRef.current.find((w) => w.instanceId === currentTargetId && !w.isDestroyed);
      if (currentTarget) {
        const expectedChar = currentTarget.word[currentTarget.lettersTyped]?.toLowerCase();
        if (key === expectedChar) {
          statsRef.current.correctKeystrokes += 1;
          const nextLettersTyped = currentTarget.lettersTyped + 1;
          fireDualLaser(currentTarget.x, currentTarget.y);
          gameSound.playHitLetterSound();

          if (nextLettersTyped >= currentTarget.word.length) {
            destroyWord(currentTarget);
          } else {
            setActiveWords((prev) => {
              const next = prev.map((w) => (w.instanceId === currentTarget.instanceId ? { ...w, lettersTyped: nextLettersTyped } : w));
              activeWordsRef.current = next;
              return next;
            });
          }
          return;
        } else {
          // Miss on current target
          gameSound.playMissLetterSound();
          setCombo(0);
          return;
        }
      }
    }

    // 4. No target yet: Find lowest word starting with this key
    const matchingCandidates = activeWordsRef.current
      .filter((w) => !w.isDestroyed && w.word[0]?.toLowerCase() === key)
      .sort((a, b) => b.y - a.y);

    if (matchingCandidates.length > 0) {
      const bestTarget = matchingCandidates[0];
      statsRef.current.correctKeystrokes += 1;
      setTargetedInstanceId(bestTarget.instanceId);
      fireDualLaser(bestTarget.x, bestTarget.y);
      gameSound.playHitLetterSound();

      const nextLettersTyped = 1;
      if (nextLettersTyped >= bestTarget.word.length) {
        destroyWord(bestTarget);
      } else {
        setActiveWords((prev) => {
          const next = prev.map((w) =>
            w.instanceId === bestTarget.instanceId
              ? { ...w, isTargeted: true, lettersTyped: nextLettersTyped }
              : { ...w, isTargeted: false }
          );
          activeWordsRef.current = next;
          return next;
        });
      }
    } else {
      gameSound.playMissLetterSound();
      setCombo(0);
    }
  }, [fireDualLaser]);

  // Handle Desktop Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab') return;

      if (e.key === 'Backspace' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        processCharInput(e.key);
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        processCharInput(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processCharInput]);

  // Core Word Destruction Handler
  const destroyWord = (word: GameWord) => {
    // 1. Play native English speech pronunciation
    gameSound.speakWord(word.word, word.audioUrl);

    // 2. Explosion color
    let explosionColor = '#00f2fe';
    if (word.specialType === 'heart') explosionColor = '#f43f5e';
    if (word.specialType === 'freeze') explosionColor = '#38bdf8';
    if (word.specialType === 'bomb') explosionColor = '#fbbf24';
    if (word.specialType === 'meteor') explosionColor = '#ef4444';
    if (word.specialType === 'shield') explosionColor = '#22d3ee';
    if (word.specialType === 'slowmo') explosionColor = '#a855f7';
    if (word.specialType === 'boss') explosionColor = '#f59e0b';

    spawnExplosionParticles(word.x, word.y, explosionColor, word.isBoss ? 50 : 35);
    gameSound.playExplosionSound();

    // 3. Floating Popup
    addFloatingPop(
      word.word,
      word.phonetic,
      word.definition_vi,
      word.x,
      word.y,
      word.specialType as FloatingPop['type']
    );

    // 4. Update stats
    statsRef.current.hitCount += 1;
    statsRef.current.wordsReviewed.set(word.word, {
      id: word.id,
      word: word.word,
      phonetic: word.phonetic,
      definition_vi: word.definition_vi,
      audioUrl: word.audioUrl,
      hit: true,
      specialType: word.specialType,
    });

    // Combo streak logic
    const newCombo = combo + 1;
    setCombo(newCombo);
    if (newCombo > maxCombo) setMaxCombo(newCombo);
    if (newCombo > 1) {
      gameSound.playComboSound(newCombo);
    }

    // Dynamic Combo Shout-out callouts
    if (newCombo === 3) {
      setComboCallout({ text: 'NICE STREAK! 🔥', color: 'text-amber-300', id: Date.now() });
      setTimeout(() => setComboCallout(null), 1500);
    } else if (newCombo === 5) {
      setComboCallout({ text: 'AMAZING PILOT! ⚡', color: 'text-cyan-300', id: Date.now() });
      setTimeout(() => setComboCallout(null), 1500);
    } else if (newCombo === 8) {
      setComboCallout({ text: 'RAMPAGE! 💥', color: 'text-orange-400', id: Date.now() });
      setTimeout(() => setComboCallout(null), 1500);
    } else if (newCombo === 12) {
      setComboCallout({ text: 'UNSTOPPABLE! 🚀', color: 'text-pink-400', id: Date.now() });
      setTimeout(() => setComboCallout(null), 1500);
    } else if (newCombo >= 15 && newCombo % 5 === 0) {
      setComboCallout({ text: '👑 GODLIKE!', color: 'text-yellow-300', id: Date.now() });
      setTimeout(() => setComboCallout(null), 1500);
    }

    // Points calculation
    const baseWordScore = word.word.length * 15 * diffConfig.scoreMultiplier * (word.isBoss ? 2.5 : 1.0);
    const comboBonus = Math.min(newCombo * 10, 120);
    const addedScore = Math.round(baseWordScore + comboBonus);
    setScore((prev) => prev + addedScore);

    // Wave Progression Checker (every 8 words cleared advances wave)
    const newHitTotal = statsRef.current.hitCount;
    if (newHitTotal >= wave * 8) {
      const nextWave = wave + 1;
      setWave(nextWave);
      const waveBonus = nextWave * 120;
      setScore((s) => s + waveBonus);
      gameSound.playWaveClearSound();
      setWaveNotice(`🎉 VƯỢT QUA WAVE ${wave}! TIẾN VÀO WAVE ${nextWave} (+${waveBonus} ĐIỂM)`);
      setTimeout(() => setWaveNotice(null), 3500);
    }

    // 5. Special Power-up effects execution
    if (word.specialType === 'heart') {
      setLives((prev) => {
        const next = Math.min(prev + 1, isPvP ? 3 : diffConfig.maxLives);
        gameSound.playHeartSound();
        return next;
      });
    } else if (word.specialType === 'shield') {
      setHasShield(true);
      gameSound.playShieldSound();
    } else if (word.specialType === 'slowmo') {
      setSlowMoTimer(4.5);
      gameSound.playSlowMoSound();
    } else if (word.specialType === 'freeze') {
      setFreezeTimer(3.2);
      gameSound.playFreezeSound();
    } else if (word.specialType === 'boss') {
      setHasShield(true);
      gameSound.playShieldSound();
    } else if (word.specialType === 'bomb') {
      gameSound.playBombSound();
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 600);

      activeWordsRef.current.forEach((other) => {
        if (other.instanceId !== word.instanceId && !other.isDestroyed) {
          spawnExplosionParticles(other.x, other.y, '#f59e0b', 20);
          statsRef.current.hitCount += 1;
          statsRef.current.wordsReviewed.set(other.word, {
            id: other.id,
            word: other.word,
            phonetic: other.phonetic,
            definition_vi: other.definition_vi,
            audioUrl: other.audioUrl,
            hit: true,
            specialType: other.specialType,
          });
        }
      });
      setScore((prev) => prev + 200);
      setActiveWords([]);
      activeWordsRef.current = [];
      setTargetedInstanceId(null);
      return;
    }

    // 6. PvP Attack Mechanic
    if (isPvP && (word.word.length >= 7 || newCombo % 3 === 0)) {
      sendAttackToOpponent(word.word);
    }

    setActiveWords((prev) => {
      const next = prev.filter((w) => w.instanceId !== word.instanceId);
      activeWordsRef.current = next;
      return next;
    });
    setTargetedInstanceId(null);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    gameSound.setMuted(next);
    if (next && isBgmOn) {
      setIsBgmOn(false);
    }
  };

  const handleToggleBgm = () => {
    const next = gameSound.toggleBGM();
    setIsBgmOn(next);
  };

  const accuracy = statsRef.current.totalKeystrokes > 0 
    ? Math.round((statsRef.current.correctKeystrokes / statsRef.current.totalKeystrokes) * 100) 
    : 100;

  return (
    <div 
      ref={arenaContainerRef}
      onClick={focusInput}
      className={cn(
        "relative w-full max-w-7xl mx-auto h-[88vh] min-h-[640px] flex rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl select-none outline-none",
        screenShake && "animate-pulse ring-4 ring-rose-500/50"
      )}
    >
      {/* Hidden Mobile Auto-focused Input */}
      <input
        ref={mobileInputRef}
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        className="opacity-0 absolute pointer-events-none w-0 h-0 -top-96"
        onChange={(e) => {
          const val = e.target.value;
          if (val && val.length > 0) {
            const lastChar = val[val.length - 1];
            processCharInput(lastChar);
            e.target.value = '';
          }
        }}
      />

      {/* Cyber Starfield Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/35 via-slate-950 to-black pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]"
      />

      {/* Particle Canvas Layer */}
      <canvas
        ref={particleCanvasRef}
        width={1000}
        height={700}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />

      {/* Freeze Frost Overlay */}
      {freezeTimer > 0 && (
        <div className="absolute inset-0 border-8 border-cyan-400/40 bg-cyan-950/20 backdrop-blur-[1px] pointer-events-none z-30 flex items-center justify-center animate-pulse">
          <div className="px-5 py-2 rounded-2xl bg-cyan-950/85 border border-cyan-400/80 text-cyan-300 font-black text-sm tracking-wider flex items-center gap-2 shadow-2xl">
            <Snowflake className="w-5 h-5 text-cyan-300 animate-spin" />
            ĐÓNG BĂNG ĐANG KÍCH HOẠT: {freezeTimer}s
          </div>
        </div>
      )}

      {/* Slow-Mo Time Warp Overlay */}
      {slowMoTimer > 0 && freezeTimer <= 0 && (
        <div className="absolute inset-0 border-4 border-purple-500/40 bg-purple-950/15 pointer-events-none z-30 flex items-center justify-center">
          <div className="px-5 py-2 rounded-2xl bg-purple-950/85 border border-purple-400/80 text-purple-300 font-black text-sm tracking-wider flex items-center gap-2 shadow-2xl animate-pulse">
            <Clock className="w-5 h-5 text-purple-300 animate-spin" />
            LÀM CHẬM THỜI GIAN (SLOW-MO): {slowMoTimer}s
          </div>
        </div>
      )}

      {/* Wave Clear / Event Notification Banner */}
      {waveNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-yellow-600/90 border border-yellow-300 text-slate-950 font-black text-sm tracking-wider shadow-[0_0_30px_rgba(234,179,8,0.7)] animate-bounce flex items-center gap-2">
          <Crown className="w-5 h-5 text-slate-950" />
          {waveNotice}
        </div>
      )}

      {/* Dynamic Arcade Combo Callout */}
      {comboCallout && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 px-5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/60 font-black text-lg shadow-2xl animate-bounce">
          <span className={comboCallout.color}>{comboCallout.text}</span>
        </div>
      )}

      {/* Attack Notice Banner */}
      {attackNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-400/80 text-emerald-300 font-black text-sm tracking-wide shadow-2xl animate-bounce flex items-center gap-2">
          <Swords className="w-5 h-5 text-emerald-400" />
          {attackNotice}
        </div>
      )}

      {/* Incoming Attack Alert Banner */}
      {incomingAlert && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-2.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-rose-200 font-black text-sm tracking-wider shadow-2xl animate-pulse flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />
          🚨 CẢNH BÁO: ĐỐI THỦ PHẢN ĐÒN THẢ THIÊN THẠCH!
        </div>
      )}

      {/* Main Game Arena */}
      <div className={cn("relative h-full flex flex-col justify-between p-3 md:p-6 transition-all", isPvP ? "w-full lg:w-[58%]" : "w-full")}>
        {/* Top HUD Status Bar */}
        <div className="relative z-30 flex items-center justify-between gap-2 p-2.5 md:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg">
          {/* Health & Shield Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800">
              {Array.from({ length: isPvP ? 3 : diffConfig.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={cn(
                    "w-4 md:w-5 h-4 md:h-5 transition-all duration-300",
                    i < lives
                      ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)] scale-100"
                      : "text-slate-700 scale-90"
                  )}
                />
              ))}
            </div>

            {hasShield && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-xs font-black animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                <Shield className="w-3.5 h-3.5 fill-cyan-400" />
                <span className="hidden sm:inline">KHIÊN ACTIVE</span>
              </div>
            )}

            {/* Wave Badge */}
            <div className="px-2.5 py-1 rounded-xl bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 text-xs font-black">
              WAVE {wave}
            </div>
          </div>

          {/* Score Counter */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Điểm Số</span>
            <span className="text-xl md:text-2xl font-black text-amber-300 tracking-wider font-mono">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Controls, Hint Toggle & Action Buttons */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {combo > 1 && (
              <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-xs flex items-center gap-1 shadow-md animate-bounce">
                <Flame className="w-3.5 h-3.5 text-yellow-300" />
                {combo}x
              </div>
            )}

            {/* Toggle Meaning Hint */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMeaningHint(!showMeaningHint);
              }}
              className={cn(
                "p-2 rounded-xl border transition-colors",
                showMeaningHint
                  ? "bg-cyan-950/80 border-cyan-500 text-cyan-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              )}
              title={showMeaningHint ? "Tắt gợi ý nghĩa tiếng Việt" : "Bật gợi ý nghĩa tiếng Việt"}
            >
              {showMeaningHint ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Toggle Procedural Cyber BGM */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleBgm();
              }}
              className={cn(
                "p-2 rounded-xl border transition-colors",
                isBgmOn
                  ? "bg-purple-950/80 border-purple-500 text-purple-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              )}
              title={isBgmOn ? "Tắt nhạc nền Arcade" : "Bật nhạc nền Arcade Synthwave"}
            >
              <Music className={cn("w-4 h-4", isBgmOn && "animate-pulse text-purple-400")} />
            </button>

            {/* Toggle SFX Mute */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMute();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Falling Words Arena Field */}
        <div className="relative flex-1 w-full overflow-hidden">
          {/* Top Nemesis Opponent Fighter Jet (Face-to-Face Dogfight) */}
          {isPvP && (
            <div className="absolute top-1 left-0 right-0 z-30 flex flex-col items-center pointer-events-none select-none">
              {/* Opponent Top Cockpit HUD */}
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-slate-950/90 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.35)] backdrop-blur-md mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs sm:text-xs font-black text-rose-400 uppercase tracking-wider">
                    {opponent.name}
                  </span>
                </div>

                <div className="h-3 w-px bg-slate-800" />

                {/* Opponent 3 Lives */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((heartIdx) => (
                    <Heart
                      key={heartIdx}
                      className={cn(
                        "w-3 sm:w-3.5 h-3 sm:h-3.5 transition-all duration-300",
                        heartIdx <= opponent.lives
                          ? "text-rose-500 fill-rose-500 filter drop-shadow-[0_0_6px_#f43f5e]"
                          : "text-slate-700"
                      )}
                    />
                  ))}
                </div>

                <div className="h-3 w-px bg-slate-800" />

                {/* Opponent Score & Combo */}
                <div className="flex items-center gap-1.5 text-xs sm:text-xs font-mono font-bold">
                  <span className="text-white">{opponent.score} pts</span>
                  {opponent.combo >= 2 && (
                    <span className="text-amber-400 flex items-center gap-0.5 text-xs animate-pulse">
                      <Flame className="w-3 h-3 text-amber-400" />
                      {opponent.combo}x
                    </span>
                  )}
                </div>

                {/* Opponent Target Word */}
                {opponent.currentWordText && (
                  <>
                    <div className="h-3 w-px bg-slate-800 hidden sm:block" />
                    <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-rose-300 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/30">
                      <span className="text-slate-400">Lock:</span>
                      <span className="font-bold">{opponent.currentWordText}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Opponent Fighter Jet Container (Rotated 180° aiming down towards player) */}
              <div className="relative w-full h-16 sm:h-20 overflow-visible">
                <div
                  className="absolute top-0 transition-transform duration-100 ease-out"
                  style={{
                    left: `${opponentJetX}%`,
                    transform: `translateX(-50%) rotate(${180 + opponentJetAngle}deg)`,
                  }}
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    {/* Nemesis Impact Flash when player shoots them */}
                    {nemesisImpact && (
                      <div className="absolute -inset-4 rounded-full bg-cyan-400/50 blur-md animate-ping" />
                    )}

                    {/* Opponent Muzzle Flash Flares on Cannons */}
                    {opponentMuzzleFlash && (
                      <>
                        <div className="absolute top-6 left-3.5 sm:left-4 w-3 h-3 bg-rose-400 rounded-full blur-xs shadow-[0_0_15px_#f43f5e] animate-ping" />
                        <div className="absolute top-6 right-3.5 sm:right-4 w-3 h-3 bg-rose-400 rounded-full blur-xs shadow-[0_0_15px_#f43f5e] animate-ping" />
                      </>
                    )}

                    {/* Red Thruster Flames (facing upwards because jet is rotated) */}
                    <div className="absolute -bottom-2 left-5 sm:left-6 w-2 h-5 sm:h-6 bg-rose-500 rounded-full blur-xs animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.9)]" />
                    <div className="absolute -bottom-2 right-5 sm:right-6 w-2 h-5 sm:h-6 bg-rose-500 rounded-full blur-xs animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.9)]" />

                    {/* Crimson Red Nemesis Jet SVG */}
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]">
                      {/* Delta Wings */}
                      <polygon points="50,8 86,75 50,64 14,75" fill="#1c070c" stroke="#f43f5e" strokeWidth="2.2" />
                      {/* Secondary Wing Armor */}
                      <polygon points="50,24 72,68 50,59 28,68" fill="#3b0d18" stroke="#fb7185" strokeWidth="1.5" />
                      {/* Dual Red Plasma Cannons */}
                      <rect x="23" y="42" width="4" height="18" rx="2" fill="#e11d48" stroke="#fda4af" strokeWidth="0.8" />
                      <rect x="73" y="42" width="4" height="18" rx="2" fill="#e11d48" stroke="#fda4af" strokeWidth="0.8" />
                      {/* Cockpit Canopy Glass */}
                      <polygon points="50,18 57,48 50,54 43,48" fill="#f43f5e" opacity="0.9" />
                      <circle cx="50" cy="34" r="4" fill="#ffffff" opacity="0.85" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dual Plasma Laser Beams (Player Upward + Opponent Downward) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {laserBeams.map((beam) => (
              <line
                key={beam.id}
                x1={`${beam.startX}%`}
                y1={`${beam.startY}%`}
                x2={`${beam.targetX}%`}
                y2={`${beam.targetY}%`}
                stroke={beam.color}
                strokeWidth="3.2"
                strokeLinecap="round"
                className="drop-shadow-[0_0_14px_rgba(6,182,212,0.95)] animate-pulse"
              />
            ))}
            {opponentLasers.map((beam) => (
              <line
                key={beam.id}
                x1={`${beam.startX}%`}
                y1={`${beam.startY}%`}
                x2={`${beam.targetX}%`}
                y2={`${beam.targetY}%`}
                stroke="#f43f5e"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="drop-shadow-[0_0_14px_rgba(244,63,94,0.95)] animate-pulse"
              />
            ))}
          </svg>

          {/* Falling Word Items */}
          {activeWords.map((item) => {
            const isTargeted = item.instanceId === targetedInstanceId;
            const lettersTyped = item.lettersTyped;
            const wordStr = item.word;

            return (
              <div
                key={item.instanceId}
                onClick={(e) => {
                  e.stopPropagation();
                  focusInput();
                  // Pronounce and prioritize this word
                  gameSound.speakWord(item.word, item.audioUrl);
                  setTargetedInstanceId(item.instanceId);
                }}
                className={cn(
                  "absolute transform -translate-x-1/2 transition-transform duration-75 cursor-pointer will-change-transform select-none",
                  isTargeted ? "z-30 scale-105" : "z-10",
                  item.isFrozen && "transition-none"
                )}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                }}
              >
                <div
                  className={cn(
                    "px-3.5 py-1.5 md:py-2 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col items-center gap-0.5 transition-all select-none",
                    item.isBoss
                      ? "bg-gradient-to-r from-amber-950/90 to-purple-950/90 border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse scale-110"
                      : item.specialType === 'heart'
                      ? "bg-pink-950/80 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse"
                      : item.specialType === 'shield'
                      ? "bg-cyan-950/85 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse"
                      : item.specialType === 'slowmo'
                      ? "bg-purple-950/85 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse"
                      : item.specialType === 'freeze'
                      ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                      : item.specialType === 'bomb'
                      ? "bg-amber-950/80 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse"
                      : item.specialType === 'meteor'
                      ? "bg-rose-950/90 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]"
                      : isTargeted
                      ? "bg-blue-950/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)] ring-2 ring-cyan-400/60"
                      : "bg-slate-900/80 border-slate-700/80 hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {/* Special Item Icons */}
                    {item.isBoss && <span className="text-sm animate-bounce" title="Boss Word">👑</span>}
                    {item.specialType === 'heart' && <span className="text-sm animate-bounce" title="+1 Mạng">💖</span>}
                    {item.specialType === 'shield' && <span className="text-sm animate-pulse" title="Khiên bảo vệ">🛡️</span>}
                    {item.specialType === 'slowmo' && <span className="text-sm animate-pulse" title="Làm chậm">⏳</span>}
                    {item.specialType === 'freeze' && <span className="text-sm" title="Đóng băng 3s">❄️</span>}
                    {item.specialType === 'bomb' && <span className="text-sm animate-pulse" title="Nổ toàn màn hình">💣</span>}
                    {item.specialType === 'meteor' && <span className="text-sm animate-spin" title="Thiên thạch">☄️</span>}

                    {/* Word Letters */}
                    <div className="font-mono text-sm md:text-base font-black tracking-wider flex items-center">
                      {wordStr.split('').map((char, charIdx) => {
                        const isTyped = charIdx < lettersTyped;
                        const isNext = charIdx === lettersTyped;

                        return (
                          <span
                            key={charIdx}
                            className={cn(
                              "transition-colors duration-100",
                              isTyped
                                ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : isNext && isTargeted
                                ? "text-cyan-300 underline underline-offset-4 decoration-2 decoration-cyan-400 animate-pulse"
                                : "text-slate-200"
                            )}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vietnamese Meaning & Phonetic Hint */}
                  {showMeaningHint && item.definition_vi && (
                    <div className="text-xs text-cyan-200/85 font-medium tracking-tight bg-slate-950/70 px-2 py-0.5 rounded-md border border-cyan-500/20 whitespace-nowrap mt-0.5 max-w-[150px] md:max-w-[170px] truncate text-center">
                      {item.phonetic && <span className="text-slate-400 mr-1 text-xs font-mono">{item.phonetic}</span>}
                      <span>{item.definition_vi}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Floating Definition Popups upon Explosion */}
          {floatingPops.map((pop) => (
            <div
              key={pop.id}
              className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full animate-float duration-1000"
              style={{
                left: `${pop.x}%`,
                top: `${pop.y}%`,
              }}
            >
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md flex items-center gap-2 text-xs font-bold whitespace-nowrap">
                <span className="text-cyan-300 font-mono font-black">{pop.word}</span>
                {pop.phonetic && (
                  <span className="text-slate-400 font-mono text-xs">{pop.phonetic}</span>
                )}
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                <span className="text-emerald-300">{pop.definition}</span>
              </div>
            </div>
          ))}

          {/* Bottom Danger Laser Line */}
          <div className="absolute bottom-6 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/80 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.8)] flex items-center justify-center">
            <span className="px-3 py-0.5 bg-rose-950/80 border border-rose-500/40 text-xs font-black uppercase tracking-widest text-rose-300 rounded-full">
              DANGER LINE • PHÒNG THỦ BUỒNG LÁI
            </span>
          </div>
        </div>

        {/* Bottom Cockpit: High-tech Animated Fighter Jet with Dual Plasma Cannons */}
        <div className="relative z-30 h-24 w-full flex items-center justify-center">
          {/* Switch Target Tip Banner */}
          <div className="absolute top-0 text-xs text-slate-500 font-semibold tracking-wider flex items-center gap-2 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">Space</span> hoặc <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">Backspace</span> để đổi mục tiêu
            <span className="hidden sm:inline text-slate-600">• Gõ tiếng Việt Telex/VNI được hỗ trợ tự động</span>
          </div>

          <div
            className="absolute bottom-0 transition-transform duration-100 ease-out"
            style={{
              left: `${jetX}%`,
              transform: `translateX(-50%) rotate(${jetAngle}deg)`,
            }}
          >
            {/* Fighter Jet Container */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Active Energy Shield Sphere */}
              {hasShield && (
                <div className="absolute -inset-3 rounded-full border-2 border-cyan-400/80 bg-cyan-500/10 shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-pulse pointer-events-none" />
              )}

              {/* Muzzle Flash Flares on Cannons */}
              {muzzleFlash && (
                <>
                  <div className="absolute top-6 left-4 w-3 h-3 bg-cyan-300 rounded-full blur-xs shadow-[0_0_15px_#22d3ee] animate-ping" />
                  <div className="absolute top-6 right-4 w-3 h-3 bg-cyan-300 rounded-full blur-xs shadow-[0_0_15px_#22d3ee] animate-ping" />
                </>
              )}

              {/* Plasma Thruster Flames */}
              <div className="absolute -bottom-2 left-6 w-2 h-6 bg-cyan-400 rounded-full blur-xs animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.9)]" />
              <div className="absolute -bottom-2 right-6 w-2 h-6 bg-cyan-400 rounded-full blur-xs animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.9)]" />

              {/* Fighter Jet SVG Vector */}
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                {/* Main Delta Wings */}
                <polygon points="50,8 86,75 50,64 14,75" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.2" />
                {/* Secondary Wing Armor */}
                <polygon points="50,24 72,68 50,59 28,68" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                {/* Dual Laser Cannons */}
                <rect x="23" y="42" width="4" height="18" rx="2" fill="#06b6d4" stroke="#67e8f9" strokeWidth="0.8" />
                <rect x="73" y="42" width="4" height="18" rx="2" fill="#06b6d4" stroke="#67e8f9" strokeWidth="0.8" />
                {/* Cockpit Canopy Glass */}
                <polygon points="50,18 57,48 50,54 43,48" fill="#38bdf8" opacity="0.9" />
                <circle cx="50" cy="34" r="4" fill="#ffffff" opacity="0.85" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side PvP View — Enhanced Mirror Arena */}
      {isPvP && (
        <div className="hidden lg:flex w-[42%] h-full p-3 border-l border-slate-800/80 bg-slate-950/80">
          <WordShooterPvPView
            opponent={opponent}
            isBot={mode === 'pvp-bot'}
            playerCombo={combo}
            attackNotification={attackNotice}
            incomingAttackWarning={incomingAlert}
            opponentWords={opponentSimWords}
          />
        </div>
      )}
    </div>
  );
};
