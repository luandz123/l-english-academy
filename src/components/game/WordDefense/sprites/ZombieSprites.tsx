import React from 'react';
import { cn } from '@/lib/utils';
import { ZombieType } from '../types';

interface ZombieSpriteProps {
  type: ZombieType;
  hp: number;
  maxHp: number;
  isSlowed?: boolean;
  isEating?: boolean;
  isHit?: boolean;
  size?: number; // default 58
  className?: string;
}

/**
 * 1. Normal Zombie (Zombie Cổ Điển)
 * Classic green-skinned zombie with purple suit, crooked tie and limping walk
 */
export const NormalZombieSprite: React.FC<{
  isSlowed?: boolean;
  isEating?: boolean;
  size?: number;
  className?: string;
}> = ({ isSlowed, isEating, size = 58, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-150",
        isEating ? "animate-bounce" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size * 1.25 }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id="zombieSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="zombieSuit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="zombiePants" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="114" rx="28" ry="6" fill="rgba(0,0,0,0.35)" />

        {/* Legs / Tattered Pants */}
        <path d="M 40 76 L 36 108 L 44 110 L 46 76 Z" fill="url(#zombiePants)" />
        <path d="M 54 76 L 58 108 L 66 110 L 62 76 Z" fill="url(#zombiePants)" />
        {/* Zombie Shoes */}
        <ellipse cx="38" cy="110" rx="8" ry="4" fill="#1e293b" />
        <ellipse cx="64" cy="110" rx="8" ry="4" fill="#1e293b" />

        {/* Torso & Suit */}
        <path
          d="M 32 44 L 28 78 L 72 78 L 68 44 Z"
          fill="url(#zombieSuit)"
        />
        {/* Tattered white collar */}
        <polygon points="46,44 50,56 54,44" fill="#f8fafc" />
        {/* Crooked Red Tie */}
        <polygon points="49,46 51,46 53,68 50,72 47,68" fill="#ef4444" />

        {/* Arms outstretched forward */}
        <path
          d="M 34 50 L 14 54 L 12 60 L 32 58 Z"
          fill="url(#zombieSuit)"
        />
        {/* Zombie Hands (Green) */}
        <ellipse cx="11" cy="57" rx="5" ry="4" fill="url(#zombieSkin)" />

        {/* Zombie Head (Slightly tilted) */}
        <g transform="translate(50, 26) rotate(6)">
          {/* Head Base */}
          <path
            d="M -18 -18 C -18 -26 18 -26 18 -18 C 22 -6 20 18 14 20 C 4 22 -14 22 -16 20 C -20 16 -20 -6 -18 -18 Z"
            fill="url(#zombieSkin)"
          />

          {/* Sparse Zombie Hair Strands */}
          <path d="M -10 -24 L -12 -30" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M 0 -26 L 0 -32" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <path d="M 8 -24 L 12 -30" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

          {/* Left Zombie Eye (Big round yellow) */}
          <circle cx="-7" cy="-6" r="6.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="-5.5" cy="-6" r="2.2" fill="#0f172a" />

          {/* Right Zombie Eye (Smaller/Lazy eye) */}
          <circle cx="8" cy="-8" r="4.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="8.5" cy="-8" r="1.6" fill="#0f172a" />

          {/* Sunken Nose */}
          <polygon points="-1,-1 2,-1 0.5,2" fill="#15803d" />

          {/* Dropped Jaw / Mouth */}
          {isEating ? (
            // Open Chomping Mouth with sharp teeth
            <g className="animate-pulse">
              <rect x="-10" y="6" width="20" height="12" rx="4" fill="#450a0a" stroke="#15803d" strokeWidth="1.5" />
              {/* Upper Teeth */}
              <polygon points="-7,6 -5,10 -3,6" fill="#f8fafc" />
              <polygon points="-1,6 1,10 3,6" fill="#f8fafc" />
              <polygon points="5,6 7,10 9,6" fill="#f8fafc" />
              {/* Lower Teeth */}
              <polygon points="-6,18 -4,14 -2,18" fill="#f8fafc" />
              <polygon points="2,18 4,14 6,18" fill="#f8fafc" />
            </g>
          ) : (
            // Idle Goofy Zombie Mouth
            <path
              d="M -10 10 Q 0 16 10 10 Q 0 18 -10 10 Z"
              fill="#450a0a"
            />
          )}
        </g>

        {/* Frost overlay when slowed */}
        {isSlowed && (
          <rect
            x="0"
            y="0"
            width="100"
            height="120"
            rx="20"
            fill="rgba(56, 189, 248, 0.3)"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
};

/**
 * 2. Fast Zombie / Conehead Runner (Zombie Chạy Nhanh)
 * Leaning forward fast runner with an orange traffic cone on head
 */
export const FastZombieSprite: React.FC<{
  isSlowed?: boolean;
  isEating?: boolean;
  size?: number;
  className?: string;
}> = ({ isSlowed, isEating, size = 58, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-150",
        isEating ? "animate-bounce" : "hover:scale-105 -rotate-6",
        className
      )}
      style={{ width: size, height: size * 1.25 }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]">
        <defs>
          <linearGradient id="fastSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>
          <linearGradient id="coneGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="114" rx="26" ry="6" fill="rgba(0,0,0,0.35)" />

        {/* Dynamic Running Legs */}
        <path d="M 42 76 L 24 104 L 32 108 L 48 78 Z" fill="#1e293b" />
        <path d="M 52 76 L 68 102 L 76 105 L 58 78 Z" fill="#1e293b" />
        <ellipse cx="22" cy="106" rx="8" ry="4" fill="#0f172a" />
        <ellipse cx="76" cy="106" rx="8" ry="4" fill="#0f172a" />

        {/* Torso */}
        <path d="M 32 44 L 28 78 L 72 78 L 68 44 Z" fill="#475569" />

        {/* Arms pumping forward */}
        <path d="M 32 48 L 10 44 L 8 50 L 30 54 Z" fill="#475569" />
        <ellipse cx="8" cy="46" rx="5" ry="4" fill="url(#fastSkin)" />

        {/* Head */}
        <g transform="translate(50, 30)">
          <ellipse cx="0" cy="0" rx="18" ry="16" fill="url(#fastSkin)" />

          {/* Determined Runner Eyes */}
          <circle cx="-6" cy="-2" r="5.5" fill="#fef08a" />
          <circle cx="-5" cy="-2" r="2.5" fill="#000000" />
          <circle cx="8" cy="-2" r="5.5" fill="#fef08a" />
          <circle cx="7" cy="-2" r="2.5" fill="#000000" />

          {/* Gritted Teeth Mouth */}
          <rect x="-10" y="7" width="20" height="6" rx="2" fill="#ffffff" stroke="#15803d" strokeWidth="1" />
          <line x1="-5" y1="7" x2="-5" y2="13" stroke="#15803d" />
          <line x1="0" y1="7" x2="0" y2="13" stroke="#15803d" />
          <line x1="5" y1="7" x2="5" y2="13" stroke="#15803d" />

          {/* Traffic Cone on Head */}
          <g transform="translate(0, -14)">
            {/* Cone Base */}
            <polygon points="-16,-2 16,-2 20,4 -20,4" fill="#c2410c" />
            {/* Cone Body */}
            <polygon points="-14,-2 0,-34 14,-2" fill="url(#coneGrad)" />
            {/* White Reflective Band */}
            <polygon points="-8,-14 -5,-24 5,-24 8,-14" fill="#f8fafc" />
          </g>
        </g>

        {isSlowed && (
          <rect x="0" y="0" width="100" height="120" rx="20" fill="rgba(56, 189, 248, 0.3)" />
        )}
      </svg>
    </div>
  );
};

/**
 * 3. Tanker Zombie / Buckethead (Zombie Mũ Sắt)
 * Armored zombie with heavy galvanized metallic bucket
 */
export const TankerZombieSprite: React.FC<{
  isSlowed?: boolean;
  isEating?: boolean;
  size?: number;
  className?: string;
}> = ({ isSlowed, isEating, size = 58, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-150",
        isEating ? "animate-bounce" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size * 1.25 }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]">
        <defs>
          <linearGradient id="bucketMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="tankerSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="114" rx="30" ry="6" fill="rgba(0,0,0,0.4)" />

        {/* Sturdy Heavy Legs */}
        <path d="M 38 76 L 34 108 L 44 110 L 46 76 Z" fill="#1e293b" />
        <path d="M 54 76 L 56 108 L 66 110 L 62 76 Z" fill="#1e293b" />
        <ellipse cx="36" cy="110" rx="9" ry="4" fill="#0f172a" />
        <ellipse cx="64" cy="110" rx="9" ry="4" fill="#0f172a" />

        {/* Torso */}
        <path d="M 30 46 L 26 78 L 74 78 L 70 46 Z" fill="#334155" />
        {/* Metal chest plate scrap */}
        <rect x="36" y="52" width="28" height="20" rx="4" fill="url(#bucketMetal)" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="40" cy="56" r="1.5" fill="#1e293b" />
        <circle cx="60" cy="56" r="1.5" fill="#1e293b" />

        {/* Arms */}
        <path d="M 32 50 L 12 54 L 10 62 L 30 60 Z" fill="#334155" />
        <ellipse cx="10" cy="58" rx="6" ry="4" fill="url(#tankerSkin)" />

        {/* Head with Iron Bucket */}
        <g transform="translate(50, 32)">
          {/* Lower face */}
          <path d="M -16 -4 C -16 12 -8 18 0 18 C 8 18 16 12 16 -4 Z" fill="url(#tankerSkin)" />

          {/* Angry Eyes peeking below bucket */}
          <circle cx="-6" cy="2" r="5" fill="#fef08a" />
          <circle cx="-4.5" cy="2" r="2" fill="#000000" />
          <circle cx="6" cy="2" r="5" fill="#fef08a" />
          <circle cx="4.5" cy="2" r="2" fill="#000000" />

          {/* Mouth */}
          <path d="M -8 11 Q 0 16 8 11" stroke="#450a0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Heavy Metal Bucket */}
          <g transform="translate(0, -10)">
            {/* Bucket base rim */}
            <ellipse cx="0" cy="8" rx="20" ry="4" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
            {/* Bucket Cylinder */}
            <path
              d="M -20 8 L -16 -24 L 16 -24 L 20 8 Z"
              fill="url(#bucketMetal)"
              stroke="#1e293b"
              strokeWidth="1.5"
            />
            {/* Bucket Top */}
            <ellipse cx="0" cy="-24" rx="16" ry="3.5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
            {/* Metal handle resting */}
            <path d="M -19 0 C -24 -12 -12 -28 0 -28 C 12 -28 24 -12 19 0" stroke="#64748b" strokeWidth="2" fill="none" />
            {/* Dent mark on bucket */}
            <path d="M 6 -12 Q 2 -8 6 -4" stroke="#334155" strokeWidth="2" fill="none" />
          </g>
        </g>

        {isSlowed && (
          <rect x="0" y="0" width="100" height="120" rx="20" fill="rgba(56, 189, 248, 0.3)" />
        )}
      </svg>
    </div>
  );
};

/**
 * 4. Medic Zombie (Zombie Cứu Thương)
 * White coat, medical mirror and sparkling first aid pack
 */
export const MedicZombieSprite: React.FC<{
  isSlowed?: boolean;
  isEating?: boolean;
  size?: number;
  className?: string;
}> = ({ isSlowed, isEating, size = 58, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-150",
        isEating ? "animate-bounce" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size * 1.25 }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]">
        <defs>
          <linearGradient id="medicSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="labCoat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="114" rx="28" ry="6" fill="rgba(0,0,0,0.35)" />

        {/* Legs */}
        <path d="M 40 78 L 36 108 L 44 110 L 46 78 Z" fill="#64748b" />
        <path d="M 54 78 L 58 108 L 66 110 L 62 78 Z" fill="#64748b" />
        <ellipse cx="38" cy="110" rx="8" ry="4" fill="#334155" />
        <ellipse cx="64" cy="110" rx="8" ry="4" fill="#334155" />

        {/* White Lab Coat */}
        <path d="M 30 46 L 24 82 L 76 82 L 70 46 Z" fill="url(#labCoat)" stroke="#cbd5e1" strokeWidth="1" />
        {/* Red Cross on Chest */}
        <rect x="47" y="56" width="6" height="16" rx="1.5" fill="#ef4444" />
        <rect x="42" y="61" width="16" height="6" rx="1.5" fill="#ef4444" />

        {/* Holding First-Aid Medical Box */}
        <g transform="translate(18, 54)">
          <rect x="-8" y="-6" width="16" height="14" rx="3" fill="#f8fafc" stroke="#ef4444" strokeWidth="1.5" />
          <rect x="-1" y="-3" width="2" height="8" fill="#ef4444" />
          <rect x="-4" y="0" width="8" height="2" fill="#ef4444" />
          {/* Handle */}
          <path d="M -4 -6 Q 0 -10 4 -6" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
        </g>

        {/* Head */}
        <g transform="translate(50, 26)">
          <ellipse cx="0" cy="0" rx="17" ry="16" fill="url(#medicSkin)" />

          {/* Doctor Head Mirror */}
          <circle cx="-10" cy="-14" r="5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="-10" cy="-14" r="2" fill="#ffffff" />
          <line x1="-16" y1="-12" x2="16" y2="-12" stroke="#475569" strokeWidth="1.5" />

          {/* Eyes */}
          <circle cx="-6" cy="-2" r="5" fill="#fef08a" />
          <circle cx="-5" cy="-2" r="2" fill="#000000" />
          <circle cx="8" cy="-2" r="5" fill="#fef08a" />
          <circle cx="7" cy="-2" r="2" fill="#000000" />

          {/* Smile / Mouth */}
          <path d="M -8 8 Q 0 14 8 8" stroke="#14532d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>

        {isSlowed && (
          <rect x="0" y="0" width="100" height="120" rx="20" fill="rgba(56, 189, 248, 0.3)" />
        )}
      </svg>
    </div>
  );
};

/**
 * 5. Boss Zombie / Gargantuar (Chúa Tể Thây Ma)
 * Giant hulking behemoth carrying a telephone pole
 */
export const BossZombieSprite: React.FC<{
  isSlowed?: boolean;
  isEating?: boolean;
  size?: number;
  className?: string;
}> = ({ isSlowed, isEating, size = 72, className }) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-150",
        isEating ? "animate-bounce" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size * 1.3 }}
    >
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_8px_16px_rgba(220,38,38,0.6)]">
        <defs>
          <linearGradient id="bossSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="60%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>
          <linearGradient id="bossArmor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#450a0a" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>
        </defs>

        {/* Big Heavy Shadow */}
        <ellipse cx="50" cy="116" rx="38" ry="8" fill="rgba(0,0,0,0.5)" />

        {/* Massive Log / Telephone Pole on Back */}
        <g transform="translate(18, 10) rotate(-25)">
          <rect x="-8" y="-10" width="16" height="85" rx="4" fill="#78350f" stroke="#451a03" strokeWidth="2" />
          <line x1="-8" y1="10" x2="8" y2="10" stroke="#451a03" strokeWidth="2" />
          <line x1="-8" y1="35" x2="8" y2="35" stroke="#451a03" strokeWidth="2" />
          <line x1="-8" y1="60" x2="8" y2="60" stroke="#451a03" strokeWidth="2" />
        </g>

        {/* Muscular Heavy Legs */}
        <path d="M 32 76 L 24 108 L 38 112 L 46 76 Z" fill="#18181b" />
        <path d="M 56 76 L 64 108 L 78 112 L 70 76 Z" fill="#18181b" />
        <ellipse cx="30" cy="112" rx="11" ry="5" fill="#09090b" />
        <ellipse cx="72" cy="112" rx="11" ry="5" fill="#09090b" />

        {/* Hulking Torso */}
        <path d="M 22 42 L 18 78 L 82 78 L 78 42 Z" fill="url(#bossArmor)" />

        {/* Spiked Shoulder Armor */}
        <g transform="translate(76, 40)">
          <ellipse cx="0" cy="0" rx="12" ry="8" fill="#52525b" stroke="#27272a" strokeWidth="1.5" />
          <polygon points="-4,-6 0,-14 4,-6" fill="#f8fafc" />
          <polygon points="4,-4 12,-8 8,2" fill="#f8fafc" />
        </g>

        {/* Intimidating Head */}
        <g transform="translate(50, 24)">
          <path
            d="M -22 -14 C -22 -26 22 -26 22 -14 C 26 6 22 22 0 22 C -22 22 -26 6 -22 -14 Z"
            fill="url(#bossSkin)"
          />

          {/* Glowing Red Demonic Eyes */}
          <circle cx="-8" cy="-4" r="6" fill="#ef4444" className="animate-pulse" />
          <circle cx="-8" cy="-4" r="2.5" fill="#fef2f2" />
          <circle cx="8" cy="-4" r="6" fill="#ef4444" className="animate-pulse" />
          <circle cx="8" cy="-4" r="2.5" fill="#fef2f2" />

          {/* Heavy Brow */}
          <path d="M -16 -12 L -2 -8 L 2 -8 L 16 -12" stroke="#052e16" strokeWidth="4" strokeLinecap="round" />

          {/* Scar on Face */}
          <path d="M 12 -16 L 14 -2" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="-10" x2="16" y2="-8" stroke="#dc2626" strokeWidth="1.5" />

          {/* Giant Jaw with Tusks */}
          <rect x="-14" y="6" width="28" height="12" rx="4" fill="#27272a" stroke="#052e16" strokeWidth="2" />
          <polygon points="-12,6 -10,0 -8,6" fill="#f8fafc" />
          <polygon points="8,6 10,0 12,6" fill="#f8fafc" />
        </g>

        {isSlowed && (
          <rect x="0" y="0" width="100" height="120" rx="20" fill="rgba(56, 189, 248, 0.35)" />
        )}
      </svg>
    </div>
  );
};

/**
 * Universal Zombie Renderer
 */
export const ZombieSpriteRenderer: React.FC<ZombieSpriteProps> = ({
  type,
  hp,
  maxHp,
  isSlowed,
  isEating,
  isHit,
  size = 58,
  className,
}) => {
  const content = (() => {
    switch (type) {
      case 'boss':
        return <BossZombieSprite isSlowed={isSlowed} isEating={isEating} size={size * 1.3} className={className} />;
      case 'tanker':
        return <TankerZombieSprite isSlowed={isSlowed} isEating={isEating} size={size} className={className} />;
      case 'medic':
        return <MedicZombieSprite isSlowed={isSlowed} isEating={isEating} size={size} className={className} />;
      case 'fast':
        return <FastZombieSprite isSlowed={isSlowed} isEating={isEating} size={size} className={className} />;
      case 'normal':
      default:
        return <NormalZombieSprite isSlowed={isSlowed} isEating={isEating} size={size} className={className} />;
    }
  })();

  return (
    <div className={cn("relative", isHit && "brightness-150 filter")}>
      {content}
    </div>
  );
};
