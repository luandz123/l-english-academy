import { VocabWord, VocabTopic } from '../WordShooter/types';

export type PlantType = 'peashooter' | 'wallnut' | 'snowpea' | 'magictower' | 'cherrybomb';

export type ZombieType = 'normal' | 'fast' | 'tanker' | 'medic' | 'boss';

export type DefenseDifficulty = 'easy' | 'medium' | 'hard';

export type DefenseGameMode = 'campaign' | 'pvp-online' | 'pvp-bot';

export interface PlantCard {
  type: PlantType;
  name: string;
  icon: string;
  word: string;
  phonetic?: string | null;
  definition_vi: string;
  sunCost: number;
  hp: number;
  damage: number;
  typedLetters: number;
  isReady: boolean;
  cooldownProgress: number; // 0 to 1
}

export interface PlantEntity {
  id: string;
  type: PlantType;
  row: number; // 0 - 4
  col: number; // 0 - 8
  hp: number;
  maxHp: number;
  lastShootTime: number;
  shootInterval: number; // ms
  name: string;
  icon: string;
  isShooting?: boolean;
}

export interface ZombieEntity {
  id: string;
  type: ZombieType;
  name: string;
  row: number; // 0 - 4
  x: number; // Percentage 0 - 100
  speed: number;
  hp: number;
  maxHp: number;
  isSlowed: boolean;
  slowDuration: number;
  isEating: boolean;
  shieldWord?: {
    word: string;
    phonetic?: string | null;
    definition_vi: string;
    typedLetters: number;
  };
  hasMedicBox?: boolean;
  isHit?: boolean;
}

export interface ProjectileEntity {
  id: string;
  row: number;
  x: number; // Percentage 0 - 100
  speed: number;
  damage: number;
  isIce: boolean;
}

export interface SunWordEntity {
  id: string;
  word: string;
  typedLetters: number;
  x: number; // Percentage 10 - 90
  y: number; // Percentage 5 - 80
  amount: number;
  speedY: number;
  isCollected: boolean;
}

export interface LawnmowerEntity {
  row: number;
  isActive: boolean;
  isTriggered: boolean;
  x: number; // Percentage 0 - 100
}

export interface FloatingTextPop {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  color: string;
}

export interface DefenseStats {
  score: number;
  zombiesDefeated: number;
  sunHarvested: number;
  accuracy: number;
  wpm: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  baseHpRemaining: number;
  wordsReviewed: Array<{
    word: string;
    phonetic?: string | null;
    definition_vi: string;
    hit: boolean;
  }>;
  elapsedSeconds: number;
}

export interface AttackerCard {
  type: ZombieType;
  name: string;
  icon: string;
  word: string;
  phonetic?: string | null;
  definition_vi: string;
  typedLetters: number;
  cooldownProgress: number;
}
