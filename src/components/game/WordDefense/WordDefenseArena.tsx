import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sun, 
  Heart, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { 
  PlantType, 
  ZombieType, 
  DefenseDifficulty, 
  DefenseGameMode, 
  PlantCard, 
  PlantEntity, 
  ZombieEntity, 
  ProjectileEntity, 
  SunWordEntity, 
  LawnmowerEntity, 
  FloatingTextPop, 
  DefenseStats 
} from './types';
import { VocabTopic, VocabWord } from '../WordShooter/types';
import { wordDefenseSound } from './gameSound';
import { PlantSpriteRenderer } from './sprites/PlantSprites';
import { ZombieSpriteRenderer } from './sprites/ZombieSprites';
import { LawnmowerSprite, SunDropSprite, PeaProjectileSprite } from './sprites/MiscSprites';
import { cn } from '@/lib/utils';

interface WordDefenseArenaProps {
  topic: VocabTopic;
  difficulty: DefenseDifficulty;
  mode: DefenseGameMode;
  roomId?: string;
  isHost?: boolean;
  onGameOver: (stats: DefenseStats, victory: boolean) => void;
  onExit: () => void;
}

const ROWS = 5;
const COLS = 9;

// Calculate horizontal percentage coordinate for each column
// Columns 0 to 8 span across the green lawn from 8% to 92% (total width 84%)
export const getColCenterPercent = (col: number): number => {
  const colWidth = 84 / COLS;
  return 8 + (col + 0.5) * colWidth;
};

export const WordDefenseArena: React.FC<WordDefenseArenaProps> = ({
  topic,
  difficulty,
  mode,
  roomId,
  isHost,
  onGameOver,
  onExit,
}) => {
  // Game State for React Rendering
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sun, setSun] = useState<number>(150);
  const [baseHp, setBaseHp] = useState<number>(5);
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [totalWaves] = useState<number>(difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7);
  const [waveProgress, setWaveProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(wordDefenseSound.getMuted());
  const [waveAlert, setWaveAlert] = useState<string | null>(null);
  const [screenShaking, setScreenShaking] = useState<boolean>(false);

  // Entities state for UI rendering
  const [plants, setPlants] = useState<PlantEntity[]>([]);
  const [zombies, setZombies] = useState<ZombieEntity[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);
  const [sunWords, setSunWords] = useState<SunWordEntity[]>([]);
  const [lawnmowers, setLawnmowers] = useState<LawnmowerEntity[]>([
    { row: 0, isActive: true, isTriggered: false, x: 4 },
    { row: 1, isActive: true, isTriggered: false, x: 4 },
    { row: 2, isActive: true, isTriggered: false, x: 4 },
    { row: 3, isActive: true, isTriggered: false, x: 4 },
    { row: 4, isActive: true, isTriggered: false, x: 4 },
  ]);

  // Bottom Plant Cards Deck
  const [cards, setCards] = useState<PlantCard[]>([]);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  // Game Pacing: Speed & Preparation Phase
  const [prepCountdown, setPrepCountdown] = useState<number>(12); // 12s initial peace to build defense
  const [gameSpeed, setGameSpeed] = useState<number>(1.0); // 0.75x (Chill) | 1.0x (Standard) | 1.25x (Fast)
  const gameSpeedRef = useRef<number>(1.0);
  useEffect(() => {
    gameSpeedRef.current = gameSpeed;
  }, [gameSpeed]);

  // Visual Text Pops
  const [floatingPops, setFloatingPops] = useState<FloatingTextPop[]>([]);

  // Keystrokes & Performance Tracking
  const statsRef = useRef<{
    totalKeystrokes: number;
    correctKeystrokes: number;
    zombiesDefeated: number;
    sunHarvested: number;
    startTime: number;
    wordsReviewed: Map<string, { word: string; phonetic?: string | null; definition_vi: string; hit: boolean }>;
  }>({
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    zombiesDefeated: 0,
    sunHarvested: 0,
    startTime: Date.now(),
    wordsReviewed: new Map(),
  });

  // AUTHORITATIVE GAME ENGINE STATE IN REF (60 FPS, Zero Stutter / No Lag)
  const gameStateRef = useRef({
    plants: [] as PlantEntity[],
    zombies: [] as ZombieEntity[],
    projectiles: [] as ProjectileEntity[],
    lawnmowers: [
      { row: 0, isActive: true, isTriggered: false, x: 4 },
      { row: 1, isActive: true, isTriggered: false, x: 4 },
      { row: 2, isActive: true, isTriggered: false, x: 4 },
      { row: 3, isActive: true, isTriggered: false, x: 4 },
      { row: 4, isActive: true, isTriggered: false, x: 4 },
    ] as LawnmowerEntity[],
    sunWords: [] as SunWordEntity[],
    baseHp: 5,
    score: 0,
    sun: 175,
    allSpawnsDone: false,
    gameOver: false,
  });

  // Pick a random word from topic
  const getRandomWord = useCallback((): VocabWord => {
    if (!topic.words || topic.words.length === 0) {
      return { id: 'w1', word: 'plant', definition_vi: 'cây trồng' };
    }
    return topic.words[Math.floor(Math.random() * topic.words.length)];
  }, [topic.words]);

  // Initialize Plant Cards Deck
  useEffect(() => {
    const cardTemplates = [
      { type: 'peashooter' as PlantType, name: 'Trụ Đậu Xanh', icon: '🌱', sunCost: 100, hp: 300, damage: 25 },
      { type: 'wallnut' as PlantType, name: 'Tường Hạt Dẻ', icon: '🌰', sunCost: 50, hp: 1600, damage: 0 },
      { type: 'snowpea' as PlantType, name: 'Băng Tiễn', icon: '❄️', sunCost: 175, hp: 300, damage: 25 },
      { type: 'magictower' as PlantType, name: 'Tháp Sét Lan', icon: '⚡', sunCost: 225, hp: 350, damage: 45 },
      { type: 'cherrybomb' as PlantType, name: 'Bom Anh Đào', icon: '🍒', sunCost: 150, hp: 100, damage: 999 },
    ];

    const initialCards: PlantCard[] = cardTemplates.map((tpl) => {
      const w = getRandomWord();
      return {
        ...tpl,
        word: w.word.toLowerCase(),
        phonetic: w.phonetic,
        definition_vi: w.definition_vi,
        typedLetters: 0,
        isReady: false,
        cooldownProgress: 1,
      };
    });

    setCards(initialCards);
  }, [getRandomWord]);

  // Floating text notification
  const addFloatingPop = useCallback((text: string, subText: string | undefined, x: number, y: number, color: string = '#10b981') => {
    const id = `pop_${Date.now()}_${Math.random()}`;
    setFloatingPops((prev) => [...prev, { id, text, subText, x, y, color }]);
    setTimeout(() => {
      setFloatingPops((prev) => prev.filter((p) => p.id !== id));
    }, 1800);
  }, []);

  // Finish Game Handler
  const handleEndGame = useCallback((isVictory: boolean) => {
    if (gameStateRef.current.gameOver) return;
    gameStateRef.current.gameOver = true;

    const elapsed = Math.max(1, (Date.now() - statsRef.current.startTime) / 1000);
    const accuracy = statsRef.current.totalKeystrokes > 0
      ? Math.round((statsRef.current.correctKeystrokes / statsRef.current.totalKeystrokes) * 100)
      : 100;
    const wpm = Math.round((statsRef.current.correctKeystrokes / 5) / (elapsed / 60));

    const finalStats: DefenseStats = {
      score: gameStateRef.current.score,
      zombiesDefeated: statsRef.current.zombiesDefeated,
      sunHarvested: statsRef.current.sunHarvested,
      accuracy,
      wpm,
      totalKeystrokes: statsRef.current.totalKeystrokes,
      correctKeystrokes: statsRef.current.correctKeystrokes,
      baseHpRemaining: Math.max(0, gameStateRef.current.baseHp),
      wordsReviewed: Array.from(statsRef.current.wordsReviewed.values()),
      elapsedSeconds: Math.round(elapsed),
    };

    onGameOver(finalStats, isVictory);
  }, [onGameOver]);

  // Spawn Zombie in Wave
  const spawnZombie = useCallback(() => {
    if (gameStateRef.current.allSpawnsDone || gameStateRef.current.gameOver) return;

    // Anti-overlap row selection: prefer rows without a zombie already crowding the spawn entry (x > 82)
    const activeZombies = gameStateRef.current.zombies;
    const freeRows = [0, 1, 2, 3, 4].filter((r) => !activeZombies.some((z) => z.row === r && z.x > 82));
    const row = freeRows.length > 0 ? freeRows[Math.floor(Math.random() * freeRows.length)] : Math.floor(Math.random() * ROWS);
    const rand = Math.random();

    // Determine zombie type (PvZ authentic pacing: comfortable for reading & typing)
    let type: ZombieEntity['type'] = 'normal';
    let hp = 180;
    let speed = 1.6; // Authentic PVZ speed: takes ~56s to walk across lawn
    let name = 'Zombie Thường';

    if (rand < 0.22) {
      type = 'fast';
      hp = 140;
      speed = 2.4; // Takes ~38s
      name = 'Zombie Chạy Nhanh';
    } else if (rand < 0.60) {
      type = 'tanker';
      hp = 420;
      speed = 1.2; // Takes ~75s
      name = 'Zombie Mũ Sắt';
    } else if (rand < 0.78) {
      type = 'medic';
      hp = 220;
      speed = 1.5; // Takes ~60s
      name = 'Zombie Cứu Thương';
    } else if (wave >= 2 && rand >= 0.88) {
      type = 'boss';
      hp = 1100;
      speed = 1.0; // Takes ~90s
      name = 'Zombie Khổng Lồ';
    }

    // Assign a shield word for tanker / special zombies
    let shieldWordObj = undefined;
    if (type === 'tanker' || type === 'medic' || Math.random() < 0.45) {
      const vocab = getRandomWord();
      shieldWordObj = {
        word: vocab.word.toLowerCase(),
        phonetic: vocab.phonetic,
        definition_vi: vocab.definition_vi,
        typedLetters: 0,
      };
      statsRef.current.wordsReviewed.set(vocab.word, {
        word: vocab.word,
        phonetic: vocab.phonetic,
        definition_vi: vocab.definition_vi,
        hit: false,
      });
    }

    const newZombie: ZombieEntity = {
      id: `zombie_${Date.now()}_${Math.random()}`,
      type,
      name,
      row,
      x: 96, // Starts right at edge of mist
      speed,
      hp,
      maxHp: hp,
      isSlowed: false,
      slowDuration: 0,
      isEating: false,
      shieldWord: shieldWordObj,
      hasMedicBox: type === 'medic',
      isHit: false,
    };

    gameStateRef.current.zombies.push(newZombie);
    setZombies([...gameStateRef.current.zombies]);
  }, [getRandomWord, wave]);

  // Spawn Sun Word from sky (with anti-overlap lane clearance)
  const spawnSunWord = useCallback(() => {
    if (gameStateRef.current.gameOver) return;

    const shortWords = (topic.words || []).filter((w) => w.word.length >= 3 && w.word.length <= 5);
    const chosen = shortWords.length > 0 ? shortWords[Math.floor(Math.random() * shortWords.length)] : getRandomWord();

    // Anti-overlap lane selection for falling sun words
    const SUN_LANES = [18, 34, 50, 66, 82];
    const activeSuns = gameStateRef.current.sunWords.filter((s) => !s.isCollected);
    const availableLanes = SUN_LANES.filter((laneX) => !activeSuns.some((s) => Math.abs(s.x - laneX) < 14 && s.y < 35));
    const chosenX = availableLanes.length > 0
      ? availableLanes[Math.floor(Math.random() * availableLanes.length)]
      : SUN_LANES[Math.floor(Math.random() * SUN_LANES.length)];

    const sunWord: SunWordEntity = {
      id: `sun_${Date.now()}_${Math.random()}`,
      word: chosen.word.toLowerCase(),
      typedLetters: 0,
      x: chosenX,
      y: 8,
      amount: 75,
      speedY: 1.4,
      isCollected: false,
    };

    gameStateRef.current.sunWords.push(sunWord);
    setSunWords([...gameStateRef.current.sunWords]);
  }, [topic.words, getRandomWord]);

  // Collect Sun directly (Click or Typed)
  const collectSun = useCallback((sunId: string, bonus: boolean = false) => {
    const s = gameStateRef.current.sunWords.find((item) => item.id === sunId && !item.isCollected);
    if (!s) return;

    s.isCollected = true;
    wordDefenseSound.playSunSound();

    const harvestAmount = bonus ? s.amount : 50;
    gameStateRef.current.sun += harvestAmount;
    setSun(gameStateRef.current.sun);
    statsRef.current.sunHarvested += harvestAmount;

    gameStateRef.current.sunWords = gameStateRef.current.sunWords.filter((item) => item.id !== sunId);
    setSunWords([...gameStateRef.current.sunWords]);

    addFloatingPop(`+${harvestAmount} ☀️ NẮNG!`, undefined, s.x, s.y, '#f59e0b');
  }, [addFloatingPop]);

  // Initial Sun Drops for immediate defense setup
  useEffect(() => {
    spawnSunWord();
    const t = setTimeout(() => spawnSunWord(), 1500);
    return () => clearTimeout(t);
  }, [spawnSunWord]);

  // Timers for Sun and Zombie waves
  useEffect(() => {
    if (isPaused) return;

    // Spawn natural sun words every 5.5 seconds (adjusted by gameSpeed)
    const sunInterval = Math.round(5500 / gameSpeed);
    const sunTimer = setInterval(() => {
      spawnSunWord();
    }, sunInterval);

    // If still in preparation phase, count down 1 second
    if (prepCountdown > 0) {
      const prepTimer = setInterval(() => {
        setPrepCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        clearInterval(sunTimer);
        clearInterval(prepTimer);
      };
    }

    // Dynamic wave-based spawn interval (balanced pacing for engaging action):
    // Wave 1: ~7.5s between zombies
    // Wave 2: ~6.0s between zombies
    // Wave 3: ~4.8s between zombies
    const baseInterval = wave === 1 ? 7500 : wave === 2 ? 6000 : 4800;
    const diffMultiplier = difficulty === 'easy' ? 1.25 : difficulty === 'medium' ? 1.0 : 0.82;
    const actualInterval = Math.round((baseInterval * diffMultiplier) / gameSpeed);

    const zombieTimer = setInterval(() => {
      spawnZombie();
      setWaveProgress((prev) => {
        const increment = wave === 1 ? 10 : wave === 2 ? 8 : 6;
        const next = prev + increment;
        if (next >= 100) {
          if (wave < totalWaves) {
            setWave((w) => w + 1);
            setWaveAlert(`🚨 ĐỢT TẤN CÔNG LỚN: WAVE ${wave + 1}/${totalWaves}!`);
            setTimeout(() => setWaveAlert(null), 3500);
            return 0;
          } else {
            // Final wave reached!
            gameStateRef.current.allSpawnsDone = true;
            return 100;
          }
        }
        return next;
      });
    }, actualInterval);

    return () => {
      clearInterval(sunTimer);
      clearInterval(zombieTimer);
    };
  }, [isPaused, difficulty, gameSpeed, prepCountdown, spawnSunWord, spawnZombie, wave, totalWaves]);

  // Plant shooting loop: Plants shoot projectiles when zombies are on their row
  useEffect(() => {
    if (isPaused) return;

    const shootTimer = setInterval(() => {
      const state = gameStateRef.current;
      if (state.gameOver) return;

      let anyShot = false;

      state.plants.forEach((plant) => {
        if (plant.type === 'wallnut' || plant.type === 'cherrybomb') return;

        const plantCenter = getColCenterPercent(plant.col);
        // Only target zombies that have visibly stepped onto the lawn (z.x <= 93)
        const hasZombieAhead = state.zombies.some(
          (z) => z.row === plant.row && z.x <= 93 && z.x > plantCenter
        );

        if (hasZombieAhead) {
          const now = Date.now();
          if (now - plant.lastShootTime >= plant.shootInterval) {
            plant.lastShootTime = now;
            plant.isShooting = true;
            anyShot = true;
            wordDefenseSound.playShootSound();

            state.projectiles.push({
              id: `proj_${Date.now()}_${Math.random()}`,
              row: plant.row,
              x: plantCenter + 2.5,
              speed: 40, // Moves smoothly across screen
              damage: plant.type === 'magictower' ? 45 : 25,
              isIce: plant.type === 'snowpea',
            });
          }
        } else {
          if (plant.isShooting) plant.isShooting = false;
        }
      });

      if (anyShot) {
        setProjectiles([...state.projectiles]);
        setPlants([...state.plants]);
      }
    }, 180);

    return () => clearInterval(shootTimer);
  }, [isPaused]);

  // MAIN 60FPS GAME PHYSICS LOOP (Smooth, Real-Time, Mutates Authoritative State Directly)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const state = gameStateRef.current;

      if (!isPaused && !state.gameOver) {
        const speedMult = gameSpeedRef.current;

        // 1. Move Projectiles & Check Collisions
        const nextProjs: ProjectileEntity[] = [];
        state.projectiles.forEach((proj) => {
          const nextX = proj.x + proj.speed * delta * speedMult;
          if (nextX > 94) return; // Out of right lawn boundary

          let hit = false;
          for (let i = 0; i < state.zombies.length; i++) {
            const z = state.zombies[i];
            if (z.row === proj.row && z.x <= 93 && Math.abs(z.x - nextX) < 2.5) {
              hit = true;
              z.hp -= proj.damage;
              z.isHit = true;

              if (proj.isIce) {
                z.isSlowed = true;
                z.slowDuration = 3;
                wordDefenseSound.playIceHitSound();
              } else {
                wordDefenseSound.playPeaHitSound();
              }
              break;
            }
          }

          if (!hit) {
            nextProjs.push({ ...proj, x: nextX });
          }
        });
        state.projectiles = nextProjs;

        // 2. Move Zombies & Check Physical Contact with Plants
        const nextZombies: ZombieEntity[] = [];

        for (let i = 0; i < state.zombies.length; i++) {
          const z = state.zombies[i];

          // If zombie died
          if (z.hp <= 0) {
            statsRef.current.zombiesDefeated += 1;
            state.score += (z.type === 'boss' ? 300 : z.type === 'tanker' ? 120 : 60);

            if (z.hasMedicBox) {
              state.baseHp = Math.min(state.baseHp + 1, 5);
              addFloatingPop('💖 HỒI PHỤC +1 MÁU CĂN CỨ!', undefined, z.x, (z.row / ROWS) * 100, '#ec4899');
            }
            continue; // Zombie dead!
          }

          // Reset hit flash
          z.isHit = false;

          // Check physical contact with plant on same row
          const plantInContact = state.plants.find((p) => {
            if (p.row !== z.row) return false;
            const plantCenter = getColCenterPercent(p.col);
            return z.x <= plantCenter + 2.8 && z.x >= plantCenter - 1.2;
          });

          if (plantInContact) {
            // Zombie eats plant
            plantInContact.hp -= 20 * delta * speedMult;
            if (Math.random() < 0.08) {
              wordDefenseSound.playChompSound();
            }

            if (plantInContact.hp <= 0) {
              // Plant destroyed!
              state.plants = state.plants.filter((p) => p.id !== plantInContact.id);
            }

            z.isEating = true;
            z.slowDuration = Math.max(0, z.slowDuration - delta * speedMult);
            z.isSlowed = z.slowDuration > 0;
            nextZombies.push(z);
            continue;
          }

          // Move zombie leftwards steadily across the screen (authentic PvZ pacing)
          const slowFactor = z.isSlowed ? 0.5 : 1.0;
          const nextX = z.x - z.speed * slowFactor * delta * speedMult;

          // Check Lawnmower Collision (x <= 7.5%)
          const mower = state.lawnmowers.find((m) => m.row === z.row);
          if (mower && mower.isActive && !mower.isTriggered && nextX <= 7.5) {
            // Lawnmower triggers!
            mower.isTriggered = true;
            wordDefenseSound.playLawnmowerSound();
            addFloatingPop('⚡ MÁY CẮT CỎ KÍCH HOẠT!', undefined, 10, (z.row / ROWS) * 100, '#ef4444');

            // Instantly crush this zombie without deducting Base HP!
            statsRef.current.zombiesDefeated += 1;
            state.score += 50;
            continue; // Zombie destroyed!
          }

          // Check House Breach (only when lawnmower is already gone and nextX <= 0)
          if (nextX <= 0) {
            state.baseHp -= 1;
            wordDefenseSound.playBaseDamageSound();
            setScreenShaking(true);
            setTimeout(() => setScreenShaking(false), 450);

            addFloatingPop('💥 CĂN CỨ BỊ TẤN CÔNG!', undefined, 4, (z.row / ROWS) * 100, '#f43f5e');

            if (state.baseHp <= 0) {
              handleEndGame(false);
              return;
            }
            continue; // Zombie enters house and disappears
          }

          z.x = nextX;
          z.isEating = false;
          z.slowDuration = Math.max(0, z.slowDuration - delta * speedMult);
          z.isSlowed = z.slowDuration > 0;
          nextZombies.push(z);
        }
        state.zombies = nextZombies;

        // Anti-overlap for zombies walking on the same row
        for (let i = 0; i < state.zombies.length; i++) {
          for (let j = i + 1; j < state.zombies.length; j++) {
            const z1 = state.zombies[i];
            const z2 = state.zombies[j];
            if (z1.row === z2.row) {
              const dx = Math.abs(z1.x - z2.x);
              if (dx < 7.5) {
                // Trailing zombie (larger x) cannot penetrate into leading zombie (smaller x)
                if (z1.x > z2.x) {
                  z1.x = z2.x + 7.5;
                  z1.speed = Math.min(z1.speed, z2.speed);
                } else {
                  z2.x = z1.x + 7.5;
                  z2.speed = Math.min(z2.speed, z1.speed);
                }
              }
            }
          }
        }

        // 3. Move Lawnmowers across the row and wipe all zombies
        state.lawnmowers = state.lawnmowers.map((mower) => {
          if (mower.isTriggered && mower.isActive) {
            const nextX = mower.x + 55 * delta * speedMult;
            // Pulverize any zombie with x <= nextX + 6
            for (let i = state.zombies.length - 1; i >= 0; i--) {
              const z = state.zombies[i];
              if (z.row === mower.row && z.x <= nextX + 6) {
                statsRef.current.zombiesDefeated += 1;
                state.score += 50;
                state.zombies.splice(i, 1);
              }
            }

            if (nextX >= 105) {
              return { ...mower, isActive: false, isTriggered: false, x: 105 };
            }
            return { ...mower, x: nextX };
          }
          return mower;
        });

        // 4. Move Sun Words falling smoothly
        state.sunWords = state.sunWords
          .map((s) => ({
            ...s,
            y: Math.min(s.y + s.speedY * delta * 2.5 * speedMult, 76),
          }))
          .filter((s) => !s.isCollected);

        // Anti-overlap relaxation for falling sun words
        for (let i = 0; i < state.sunWords.length; i++) {
          for (let j = i + 1; j < state.sunWords.length; j++) {
            const s1 = state.sunWords[i];
            const s2 = state.sunWords[j];
            if (Math.abs(s1.x - s2.x) < 14 && Math.abs(s1.y - s2.y) < 8) {
              if (s1.x <= s2.x) {
                s1.x = Math.max(14, s1.x - 1.5);
                s2.x = Math.min(84, s2.x + 1.5);
              } else {
                s1.x = Math.min(84, s1.x + 1.5);
                s2.x = Math.max(14, s2.x - 1.5);
              }
            }
          }
        }

        // 5. Check Victory: All spawns done and all zombies defeated
        if (state.allSpawnsDone && state.zombies.length === 0) {
          handleEndGame(true);
          return;
        }

        // Synchronize state to React for render
        setZombies([...state.zombies]);
        setProjectiles([...state.projectiles]);
        setLawnmowers([...state.lawnmowers]);
        setPlants([...state.plants]);
        setSunWords([...state.sunWords]);
        setBaseHp(state.baseHp);
        setScore(state.score);
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, handleEndGame, addFloatingPop]);

  // Place plant on (row, col)
  const placePlant = (row: number, col: number) => {
    if (selectedCardIdx === null) return;
    const card = cards[selectedCardIdx];
    if (!card) return;

    // Check if cell already has a plant
    const existing = gameStateRef.current.plants.find((p) => p.row === row && p.col === col);
    if (existing) {
      addFloatingPop('Ô này đã có cây!', undefined, getColCenterPercent(col), (row / ROWS) * 100, '#f59e0b');
      return;
    }

    if (sun < card.sunCost && !card.isReady) {
      addFloatingPop(`Không đủ ☀️ Nắng! Cần ${card.sunCost} nắng hoặc gõ đúng từ để nạp!`, undefined, getColCenterPercent(col), (row / ROWS) * 100, '#ef4444');
      return;
    }

    // Deduct sun (if not already typed free)
    const cost = card.isReady ? Math.floor(card.sunCost * 0.5) : card.sunCost;
    gameStateRef.current.sun = Math.max(0, gameStateRef.current.sun - cost);
    setSun(gameStateRef.current.sun);

    wordDefenseSound.playSummonSound();

    if (card.type === 'cherrybomb') {
      wordDefenseSound.playCherryBombSound();
    }

    // Create new plant on board
    const newPlant: PlantEntity = {
      id: `plant_${Date.now()}_${Math.random()}`,
      type: card.type,
      row,
      col,
      hp: card.hp,
      maxHp: card.hp,
      lastShootTime: Date.now(),
      shootInterval: card.type === 'snowpea' ? 1400 : card.type === 'magictower' ? 1800 : 1100,
      name: card.name,
      icon: card.icon,
      isShooting: false,
    };

    gameStateRef.current.plants.push(newPlant);
    setPlants([...gameStateRef.current.plants]);

    if (card.type === 'cherrybomb') {
      // Explode after 900ms and wipe row
      setTimeout(() => {
        wordDefenseSound.playCherryBombSound();
        addFloatingPop('💥 BÙM! QUÉT SẠCH HÀNG!', undefined, 50, (row / ROWS) * 100, '#ef4444');
        gameStateRef.current.zombies = gameStateRef.current.zombies.filter((z) => z.row !== row);
        gameStateRef.current.plants = gameStateRef.current.plants.filter((p) => p.id !== newPlant.id);
        setZombies([...gameStateRef.current.zombies]);
        setPlants([...gameStateRef.current.plants]);
      }, 900);
    }

    // Reset card with a new word from topic!
    const newVocab = getRandomWord();
    setCards((prev) =>
      prev.map((c, idx) =>
        idx === selectedCardIdx
          ? {
              ...c,
              word: newVocab.word.toLowerCase(),
              phonetic: newVocab.phonetic,
              definition_vi: newVocab.definition_vi,
              typedLetters: 0,
              isReady: false,
            }
          : c
      )
    );
    setSelectedCardIdx(null);
  };

  // Keyboard Input Dispatcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || isPaused) return;

      // Numbers 1 to 5 to place selected plant card on that row!
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        if (selectedCardIdx !== null) {
          e.preventDefault();
          const targetRow = parseInt(e.key, 10) - 1; // 0 - 4
          // Find first empty col on target row
          for (let c = 0; c < COLS; c++) {
            if (!gameStateRef.current.plants.some((p) => p.row === targetRow && p.col === c)) {
              placePlant(targetRow, c);
              return;
            }
          }
          addFloatingPop('Hàng này đã đầy!', undefined, 50, (targetRow / ROWS) * 100, '#ef4444');
          return;
        }
      }

      // Escape to cancel card selection
      if (e.key === 'Escape') {
        setSelectedCardIdx(null);
        return;
      }

      const key = e.key.toLowerCase();
      if (!/^[a-z0-9]$/.test(key)) return;

      statsRef.current.totalKeystrokes += 1;

      // 1. Check Sun Words falling from sky
      const matchingSun = gameStateRef.current.sunWords.find((s) => !s.isCollected && s.word[s.typedLetters] === key);
      if (matchingSun) {
        statsRef.current.correctKeystrokes += 1;
        const nextLetters = matchingSun.typedLetters + 1;
        if (nextLetters >= matchingSun.word.length) {
          // Harvest Sun with bonus!
          collectSun(matchingSun.id, true);
        } else {
          matchingSun.typedLetters = nextLetters;
          setSunWords([...gameStateRef.current.sunWords]);
        }
        return;
      }

      // 2. Check Shield Words on Tanker/Medic Zombies (CRITICAL LIGHTNING STRIKE!)
      const matchingZombie = gameStateRef.current.zombies.find(
        (z) => z.shieldWord && z.x <= 93 && z.shieldWord.word[z.shieldWord.typedLetters] === key
      );
      if (matchingZombie && matchingZombie.shieldWord) {
        statsRef.current.correctKeystrokes += 1;
        const nextLetters = matchingZombie.shieldWord.typedLetters + 1;

        if (nextLetters >= matchingZombie.shieldWord.word.length) {
          // CRITICAL THUNDERBOLT STRIKE!
          wordDefenseSound.playLightningSound();
          wordDefenseSound.speakWord(matchingZombie.shieldWord.word);

          statsRef.current.wordsReviewed.set(matchingZombie.shieldWord.word, {
            word: matchingZombie.shieldWord.word,
            phonetic: matchingZombie.shieldWord.phonetic,
            definition_vi: matchingZombie.shieldWord.definition_vi,
            hit: true,
          });

          // Instantly destroy shield and damage zombie heavily!
          matchingZombie.hp = Math.max(0, matchingZombie.hp - 350);
          matchingZombie.shieldWord = undefined;
          matchingZombie.isHit = true;
          setZombies([...gameStateRef.current.zombies]);

          addFloatingPop(
            `⚡ SÉT CHÍ MẠNG: ${matchingZombie.shieldWord?.word?.toUpperCase() || ''}!`,
            undefined,
            matchingZombie.x,
            (matchingZombie.row / ROWS) * 100,
            '#38bdf8'
          );
        } else {
          matchingZombie.shieldWord.typedLetters = nextLetters;
          setZombies([...gameStateRef.current.zombies]);
        }
        return;
      }

      // 3. Check Plant Cards at Bottom Deck
      let cardMatched = false;
      setCards((currentCards) => {
        return currentCards.map((card, idx) => {
          if (!cardMatched && card.word[card.typedLetters] === key) {
            cardMatched = true;
            statsRef.current.correctKeystrokes += 1;
            const nextLetters = card.typedLetters + 1;

            if (nextLetters >= card.word.length) {
              // Card fully typed and ready to plant!
              wordDefenseSound.playSummonSound();
              wordDefenseSound.speakWord(card.word);
              setSelectedCardIdx(idx);
              addFloatingPop(`🌱 ĐÃ NẠP ${card.name.toUpperCase()}! GIẢM 50% NẮNG! CLICK Ô ĐỂ ĐẶT!`, undefined, 50, 85, '#10b981');
              return { ...card, typedLetters: nextLetters, isReady: true };
            }

            return { ...card, typedLetters: nextLetters };
          }
          return card;
        });
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, selectedCardIdx, collectSun, placePlant, addFloatingPop]);

  return (
    <div
      className={cn(
        "relative w-full max-w-6xl mx-auto flex flex-col rounded-3xl border border-emerald-900/60 bg-slate-950 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.8)] select-none",
        screenShaking && "animate-shake"
      )}
    >
      {/* Top Resource HUD */}
      <div className="p-3 px-5 border-b border-emerald-900/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 backdrop-blur-md flex items-center justify-between gap-3 z-30">
        {/* Sun Energy & Base HP */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-950/70 border-2 border-amber-500/60 px-4 py-1.5 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <SunDropSprite size={28} />
            <span className="text-xl font-black text-amber-300 font-mono tracking-tight">{sun}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-950/50 border border-rose-900/60 px-3.5 py-1.5 rounded-2xl">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  "w-4 h-4 transition-all duration-300",
                  i < baseHp 
                    ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)] scale-105" 
                    : "text-slate-800 scale-90"
                )}
              />
            ))}
            <span className="text-xs font-black text-rose-300 ml-1.5">{baseHp} HP</span>
          </div>
        </div>

        {/* Wave Progress Bar */}
        <div className="flex-1 max-w-xs hidden md:flex flex-col items-center gap-1">
          <div className="flex justify-between w-full text-xs font-black tracking-wider text-emerald-400">
            <span>ĐỢT {wave}/{totalWaves}</span>
            <span>{waveProgress}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-950 border border-emerald-900/50 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300 transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              style={{ width: `${waveProgress}%` }}
            />
          </div>
        </div>

        {/* Score & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Game Speed Multiplier Toggle */}
          <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-700/80 shadow-inner">
            <button
              onClick={() => setGameSpeed(0.75)}
              className={cn(
                "px-2 py-1 text-xs font-bold rounded-lg transition-all",
                gameSpeed === 0.75
                  ? "bg-emerald-600 text-white shadow font-black"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Tốc độ 0.75x: Thong thả để đọc và học từ vựng"
            >
              🐢 0.75x
            </button>
            <button
              onClick={() => setGameSpeed(1.0)}
              className={cn(
                "px-2 py-1 text-xs font-bold rounded-lg transition-all",
                gameSpeed === 1.0
                  ? "bg-emerald-600 text-white shadow font-black"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Tốc độ 1.0x: Chuẩn mực Plants vs Zombies"
            >
              🎯 1.0x
            </button>
            <button
              onClick={() => setGameSpeed(1.25)}
              className={cn(
                "px-2 py-1 text-xs font-bold rounded-lg transition-all",
                gameSpeed === 1.25
                  ? "bg-emerald-600 text-white shadow font-black"
                  : "text-slate-400 hover:text-slate-200"
              )}
              title="Tốc độ 1.25x: Thử thách gõ phím nhanh"
            >
              ⚡ 1.25x
            </button>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Điểm số</span>
            <span className="text-base font-black text-amber-300 font-mono">{score}</span>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              wordDefenseSound.setMuted(next);
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Preparation Countdown Banner */}
      {prepCountdown > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b-2 border-emerald-400 py-2.5 px-4 text-center z-30 flex items-center justify-center gap-3 shadow-lg">
          <span className="text-xl animate-bounce">🌻</span>
          <span className="text-sm font-black text-emerald-100 tracking-wide">
            GIAI ĐOẠN CHUẨN BỊ ({prepCountdown}s): Nhặt Mặt Trời và bấm thẻ cây để trồng phòng thủ trước khi Zombie xuất hiện!
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-400/30">
            {prepCountdown}s
          </span>
        </div>
      )}

      {/* Wave Alert Banner */}
      {waveAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-rose-200 font-black text-sm tracking-wider animate-bounce shadow-[0_0_30px_rgba(244,63,94,0.7)] backdrop-blur-md">
          {waveAlert}
        </div>
      )}

      {/* Selected Card Helper Banner */}
      {selectedCardIdx !== null && cards[selectedCardIdx] && (
        <div className="bg-emerald-950/95 border-b-2 border-emerald-400 p-2 text-center text-xs font-black text-emerald-300 animate-pulse flex items-center justify-center gap-2 z-30">
          <span>🌱 ĐÃ CHỌN {cards[selectedCardIdx].name.toUpperCase()}! BẤM SỐ [1, 2, 3, 4, 5] HOẶC CLICK VÀO Ô ĐỂ TRỒNG! (Bấm Esc để hủy)</span>
        </div>
      )}

      {/* 5-LANE LAWN BATTLEFIELD (AUTHENTIC PVZ CHECKERED LAWN) */}
      <div className="relative w-full h-[470px] bg-slate-950 overflow-hidden select-none">
        {/* Left Wooden Porch / House Defense Barrier (0% to 8%) */}
        <div className="absolute top-0 bottom-0 left-0 w-[8%] bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-r-4 border-amber-950/80 z-10 flex flex-col justify-around shadow-[inset_-6px_0_12px_rgba(0,0,0,0.6)]">
          {Array.from({ length: ROWS }).map((_, rIdx) => (
            <div
              key={rIdx}
              className="flex-1 flex items-center justify-center border-b border-amber-950/60 relative"
            >
              <span className="text-xs font-black text-amber-500/60 font-mono">
                {rIdx + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Right Graveyard Mist / Spooky Fog (92% to 100%) */}
        <div className="absolute top-0 bottom-0 right-0 w-[8%] bg-gradient-to-l from-purple-950/80 via-slate-950/80 to-transparent z-10 pointer-events-none flex items-center justify-center">
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent animate-pulse" />
        </div>

        {/* Alternating Checkered Lawn Grid */}
        <div className="absolute top-0 bottom-0 left-[8%] right-[8%] flex flex-col">
          {Array.from({ length: ROWS }).map((_, rIdx) => (
            <div key={rIdx} className="flex-1 flex border-b border-emerald-900/40">
              {Array.from({ length: COLS }).map((_, cIdx) => {
                const isEvenTile = (rIdx + cIdx) % 2 === 0;
                return (
                  <div
                    key={cIdx}
                    onClick={() => placePlant(rIdx, cIdx)}
                    className={cn(
                      "flex-1 border-r border-emerald-900/25 transition-all duration-150 cursor-pointer relative group",
                      isEvenTile ? "bg-emerald-950/40" : "bg-emerald-900/25",
                      "hover:bg-emerald-500/25 hover:shadow-inner"
                    )}
                  >
                    {/* Subtle grass blade highlights */}
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500/10 pointer-events-none" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 5 Lawnmowers at Mép Trái (x = 4%) */}
        {lawnmowers.map((mower) => {
          if (!mower.isActive) return null;
          const topPercent = (mower.row / ROWS) * 100 + 1;
          return (
            <div
              key={mower.row}
              className="absolute z-20 pointer-events-none -translate-x-1/2"
              style={{
                left: `${mower.x}%`,
                top: `${topPercent}%`,
              }}
            >
              <LawnmowerSprite isTriggered={mower.isTriggered} size={48} />
            </div>
          );
        })}

        {/* Plants / Defenders placed on Grid */}
        {plants.map((plant) => {
          const leftPercent = getColCenterPercent(plant.col);
          const topPercent = (plant.row / ROWS) * 100 + 1.5;

          return (
            <div
              key={plant.id}
              className="absolute z-20 flex flex-col items-center -translate-x-1/2"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
              }}
            >
              <PlantSpriteRenderer
                type={plant.type}
                hp={plant.hp}
                maxHp={plant.maxHp}
                isShooting={plant.isShooting}
                size={54}
              />
              {/* Mini HP bar */}
              <div className="w-10 h-1.5 rounded-full bg-slate-950 border border-emerald-800/80 overflow-hidden mt-0.5 shadow-sm">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                  style={{ width: `${Math.max(0, (plant.hp / plant.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Projectiles Flying Across Lawn */}
        {projectiles.map((proj) => {
          const topPercent = (proj.row / ROWS) * 100 + 6.5;
          return (
            <div
              key={proj.id}
              className="absolute z-25 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                left: `${proj.x}%`,
                top: `${topPercent}%`,
              }}
            >
              <PeaProjectileSprite isIce={proj.isIce} size={22} />
            </div>
          );
        })}

        {/* Zombies Advancing Left (Silky Smooth 60 FPS Direct Positioning) */}
        {zombies.map((zombie) => {
          const topPercent = (zombie.row / ROWS) * 100 - 1;
          return (
            <div
              key={zombie.id}
              className={cn(
                "absolute z-20 flex flex-col items-center -translate-x-1/2",
                zombie.isHit && "brightness-150"
              )}
              style={{
                left: `${zombie.x}%`,
                top: `${topPercent}%`,
              }}
            >
              {/* Special Shield Word with Vietnamese meaning on Head */}
              {zombie.shieldWord && zombie.x <= 93 && (
                <div className="px-2.5 py-0.5 rounded-xl bg-slate-950/95 border-2 border-cyan-400 text-center mb-1 shadow-lg backdrop-blur-md">
                  <span className="text-xs text-cyan-300 font-bold block">
                    [{zombie.shieldWord.definition_vi}]
                  </span>
                  <div className="font-mono text-xs font-black tracking-wider flex items-center justify-center">
                    {zombie.shieldWord.word.split('').map((char, i) => (
                      <span
                        key={i}
                        className={cn(
                          i < (zombie.shieldWord?.typedLetters || 0)
                            ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                            : "text-slate-300"
                        )}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Zombie Animated Sprite */}
              <ZombieSpriteRenderer
                type={zombie.type}
                hp={zombie.hp}
                maxHp={zombie.maxHp}
                isSlowed={zombie.isSlowed}
                isEating={zombie.isEating}
                isHit={zombie.isHit}
                size={54}
              />

              {/* Zombie HP Bar */}
              <div className="w-12 h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden mt-0.5 shadow-sm">
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${Math.max(0, (zombie.hp / zombie.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Sun Words Falling from Sky (Clickable directly to collect!) */}
        {sunWords.map((sunWord) => (
          <div
            key={sunWord.id}
            onClick={() => collectSun(sunWord.id, false)}
            className="absolute z-30 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform active:scale-95"
            style={{
              left: `${sunWord.x}%`,
              top: `${sunWord.y}%`,
            }}
            title="Click để nhặt nhanh +50 Nắng!"
          >
            <div className="px-3 py-1 rounded-2xl bg-amber-950/95 border-2 border-amber-400 text-center shadow-[0_0_20px_rgba(250,204,21,0.7)] backdrop-blur-md flex items-center gap-2">
              <SunDropSprite size={26} />
              <div className="font-mono text-xs font-black tracking-wider">
                {sunWord.word.split('').map((char, i) => (
                  <span
                    key={i}
                    className={i < sunWord.typedLetters ? "text-emerald-300 font-black drop-shadow" : "text-amber-200"}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Floating Pops */}
        {floatingPops.map((pop) => (
          <div
            key={pop.id}
            className="absolute z-40 transform -translate-x-1/2 -translate-y-full animate-float pointer-events-none"
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            <div
              className="px-3 py-1.5 rounded-xl border bg-slate-950/95 text-xs font-bold shadow-xl backdrop-blur-md text-white whitespace-nowrap"
              style={{ borderColor: pop.color }}
            >
              <p style={{ color: pop.color }}>{pop.text}</p>
              {pop.subText && <p className="text-xs text-slate-300">{pop.subText}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM DEFENDER CARDS DECK (DUAL-CONTROL: CLICK OR TYPE TO SUMMON!) */}
      <div className="p-4 border-t border-emerald-950 bg-gradient-to-b from-slate-900/95 to-slate-950/95">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-black text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            KHAY TRỒNG CÂY: Click trực tiếp vào thẻ (khi đủ nắng) HOẶC gõ đúng từ để nạp nhanh!
          </span>
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            {selectedCardIdx !== null ? '👉 Click ô trên sân cỏ (hoặc bấm phím 1-5)' : 'Click thẻ để chọn cây'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {cards.map((card, idx) => {
            const isSelected = selectedCardIdx === idx;
            const hasSun = sun >= card.sunCost;
            const canSelect = hasSun || card.isReady;

            return (
              <div
                key={`${card.type}-${idx}`}
                onClick={() => {
                  if (canSelect) {
                    setSelectedCardIdx(idx);
                    wordDefenseSound.playSummonSound();
                    addFloatingPop(`🌱 ĐÃ CHỌN ${card.name.toUpperCase()}! CLICK VÀO Ô ĐỂ TRỒNG!`, undefined, 50, 85, '#10b981');
                  } else {
                    addFloatingPop(`Cần ${card.sunCost} ☀️ Nắng! Nhặt nắng hoặc gõ từ để nạp!`, undefined, 50, 85, '#f59e0b');
                  }
                }}
                className={cn(
                  "p-2.5 rounded-2xl border-2 transition-all duration-200 select-none cursor-pointer flex flex-col justify-between relative overflow-hidden",
                  isSelected
                    ? "bg-emerald-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400 scale-[1.02]"
                    : card.isReady
                    ? "bg-amber-950/80 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-pulse hover:border-amber-300"
                    : hasSun
                    ? "bg-slate-950 border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900"
                    : "bg-slate-950/50 border-slate-900 opacity-60 hover:opacity-80"
                )}
              >
                {/* Header: Plant Sprite & Cost */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <PlantSpriteRenderer type={card.type} size={36} />
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">{card.name}</h4>
                      <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                        ☀️ {card.isReady ? `${Math.floor(card.sunCost * 0.5)} (Giảm 50%)` : card.sunCost}
                      </span>
                    </div>
                  </div>
                </div>

                {/* English Word to Type with Letter Highlighting */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="font-mono text-sm font-black tracking-wider flex items-center justify-center">
                    {card.word.split('').map((char, charIdx) => {
                      const isTyped = charIdx < card.typedLetters;
                      return (
                        <span
                          key={charIdx}
                          className={cn(
                            isTyped 
                              ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] font-black" 
                              : "text-slate-300"
                          )}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-xs text-slate-400 font-semibold block truncate mt-0.5">
                    {card.definition_vi}
                  </span>

                  {/* Ready / Click Status */}
                  {card.isReady ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300 uppercase tracking-wider mt-1 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50">
                      <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" />
                      Đã Nạp Từ!
                    </span>
                  ) : hasSun ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 mt-1">
                      👉 Click để chọn
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 mt-1 block">
                      Gõ từ để nạp
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
