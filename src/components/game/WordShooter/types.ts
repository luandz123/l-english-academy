export type SpecialWordType = 'none' | 'heart' | 'freeze' | 'bomb' | 'meteor' | 'shield' | 'slowmo' | 'boss';

export type GameDifficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'solo' | 'pvp-online' | 'pvp-bot';

export interface VocabWord {
  id: string | number;
  word: string;
  phonetic?: string | null;
  definition_vi: string;
  audioUrl?: string | null;
  category?: string;
}

export interface GameWord extends VocabWord {
  instanceId: string;
  x: number; // Percentage 5% - 85%
  y: number; // Percentage 0% - 100%
  speed: number;
  specialType: SpecialWordType;
  lettersTyped: number;
  isTargeted: boolean;
  isDestroyed: boolean;
  isFrozen: boolean;
  isBoss?: boolean;
}

export interface FloatingPop {
  id: string;
  x: number;
  y: number;
  word: string;
  phonetic?: string | null;
  definition: string;
  type: 'normal' | 'heart' | 'freeze' | 'bomb' | 'attack' | 'shield' | 'slowmo' | 'boss';
  createdAt: number;
}

export interface LaserBeam {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface VocabTopic {
  id: string;
  name: string;
  icon: string;
  description: string;
  words: VocabWord[];
  isCustom?: boolean;
}

export interface DifficultySettings {
  label: string;
  maxLives: number;
  baseSpeed: number;
  spawnInterval: number; // ms
  maxActiveWords: number;
  specialChance: number; // 0 - 1
  scoreMultiplier: number;
}

export interface WordReviewItem {
  id: string | number;
  word: string;
  phonetic?: string | null;
  definition_vi: string;
  audioUrl?: string | null;
  hit: boolean;
  specialType?: SpecialWordType;
}

export interface GameStats {
  score: number;
  accuracy: number;
  wpm: number;
  maxCombo: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  hitCount: number;
  missedCount: number;
  wordsReviewed: WordReviewItem[];
  elapsedSeconds: number;
  waveReached?: number;
}

export interface OpponentState {
  name: string;
  avatar?: string;
  lives: number;
  score: number;
  combo: number;
  activeWordCount: number;
  currentWordText?: string;
  isEliminated: boolean;
  jetX?: number;
  jetAngle?: number;
  isFiring?: boolean;
  wpm?: number;
  accuracy?: number;
  waveReached?: number;
}

// Enhanced PvP Sync State — sent at 200ms intervals + event-driven
export interface PvPSyncState {
  timestamp: number;
  lives: number;
  score: number;
  combo: number;
  activeWords: Array<{ x: number; y: number; word: string; lettersTyped: number; isTargeted: boolean; specialType?: SpecialWordType }>;
  jetX: number;
  jetAngle: number;
  isFiring: boolean;
  currentTargetWord?: string;
  wpm: number;
  accuracy: number;
  waveReached: number;
  isEliminated?: boolean;
}

// PvP Attack Event — sent immediately on attack trigger
export type PvPAttackType = 'meteor' | 'freeze_bomb' | 'word_bomb';

export interface PvPAttackEvent {
  timestamp: number;
  attackType: PvPAttackType;
  word?: VocabWord;
  comboLevel: number;
  senderId?: string;
}

export interface PvPBroadcastMessage {
  type?: 'state_sync' | 'attack' | 'game_over' | 'player_ready' | 'player_joined' | 'game_start' | 'countdown' | 'rematch_invite';
  senderId?: string;
  senderName?: string;
  timestamp?: number;
  lives?: number;
  score?: number;
  combo?: number;
  activeWordCount?: number;
  currentWordText?: string;
  attackWord?: VocabWord;
  attackType?: PvPAttackType;
  comboLevel?: number;
  isEliminated?: boolean;
  topicId?: string;
  topic?: VocabTopic;
  difficulty?: GameDifficulty;
  words?: Array<{ x: number; y: number; word: string; lettersTyped?: number; isTargeted?: boolean; specialType?: SpecialWordType }>;
  jetX?: number;
  jetAngle?: number;
  isFiring?: boolean;
  countdown?: number;
  wpm?: number;
  accuracy?: number;
  waveReached?: number;
  isReady?: boolean;
  opponentStats?: GameStats;
}
