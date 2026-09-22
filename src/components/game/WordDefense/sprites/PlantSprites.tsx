import React from 'react';
import { cn } from '@/lib/utils';
import { PlantType } from '../types';

interface PlantSpriteProps {
  type: PlantType;
  hp?: number;
  maxHp?: number;
  isShooting?: boolean;
  className?: string;
  size?: number; // default 52
}

/**
 * 1. Peashooter (Trụ Đậu Xanh)
 * Animated organic pea shooter with recoil, swaying stem and lively eye
 */
export const PeashooterSprite: React.FC<{ isShooting?: boolean; size?: number; className?: string }> = ({
  isShooting = false,
  size = 52,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-transform duration-150 select-none",
        isShooting ? "scale-105 -rotate-3" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"
      >
        <defs>
          <linearGradient id="peaGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="leafGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <radialGradient id="snoutInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#052e16" />
            <stop offset="70%" stopColor="#14532d" />
            <stop offset="100%" stopColor="#22c55e" />
          </radialGradient>
        </defs>

        {/* Shadow base */}
        <ellipse cx="50" cy="90" rx="28" ry="7" fill="rgba(0,0,0,0.25)" />

        {/* Base Leaves */}
        <path
          d="M 24 88 C 12 84 10 74 28 82 C 34 84 42 86 50 86 C 58 86 66 84 72 82 C 90 74 88 84 76 88 C 66 92 34 92 24 88 Z"
          fill="url(#leafGreen)"
        />
        <path
          d="M 38 88 C 30 78 40 70 48 82 Z"
          fill="#15803d"
        />
        <path
          d="M 62 88 C 70 78 60 70 52 82 Z"
          fill="#15803d"
        />

        {/* Swaying Stem */}
        <path
          d="M 47 84 Q 45 60 52 46 Q 54 44 56 46 Q 51 62 53 84 Z"
          fill="url(#leafGreen)"
        />

        {/* Back Leaf on Head */}
        <path
          d="M 40 40 C 20 30 18 16 34 26 C 42 32 42 38 40 40 Z"
          fill="#4ade80"
        />

        {/* Main Head Sphere */}
        <circle cx="56" cy="40" r="22" fill="url(#peaGreen)" />

        {/* Shooting Snout */}
        <path
          d="M 66 32 C 78 30 84 32 86 36 C 88 40 88 44 86 48 C 84 52 78 54 66 52 Z"
          fill="url(#peaGreen)"
        />
        {/* Snout Barrel Opening */}
        <ellipse cx="85" cy="42" rx="4.5" ry="7.5" fill="url(#snoutInner)" />

        {/* Big Glossy Eye */}
        <ellipse cx="52" cy="33" rx="5.5" ry="7" fill="#ffffff" />
        <circle cx="54" cy="33" r="3.2" fill="#0f172a" />
        <circle cx="55.5" cy="31.5" r="1.3" fill="#ffffff" />

        {/* Cheerful Head Highlight */}
        <ellipse cx="46" cy="26" rx="6" ry="3.5" fill="#bbf7d0" opacity="0.6" transform="rotate(-20 46 26)" />

        {/* Mouth/Snout Air Puff when shooting */}
        {isShooting && (
          <ellipse cx="94" cy="42" rx="5" ry="3" fill="#86efac" opacity="0.8" className="animate-ping" />
        )}
      </svg>
    </div>
  );
};

/**
 * 2. Wall-nut (Tường Hạt Dẻ)
 * 3 damage levels: Healthy, Cracked, Desperate/Band-aid
 */
export const WallnutSprite: React.FC<{ hp?: number; maxHp?: number; size?: number; className?: string }> = ({
  hp = 1600,
  maxHp = 1600,
  size = 52,
  className,
}) => {
  const hpRatio = hp / (maxHp || 1);

  return (
    <div
      className={cn("relative flex items-center justify-center select-none transition-transform hover:scale-105", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
        <defs>
          <linearGradient id="walnutShell" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="40%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="walnutHighlights" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Shadow base */}
        <ellipse cx="50" cy="92" rx="26" ry="7" fill="rgba(0,0,0,0.3)" />

        {/* Walnut Rounded Oblong Shell */}
        <path
          d="M 50 14 C 74 14 82 32 82 56 C 82 80 72 90 50 90 C 28 90 18 80 18 56 C 18 32 26 14 50 14 Z"
          fill="url(#walnutShell)"
        />

        {/* Shell Ridge Texture Lines */}
        <path d="M 50 14 Q 46 52 50 90" stroke="#92400e" strokeWidth="2.5" fill="none" opacity="0.6" />
        <path d="M 34 22 Q 28 54 34 84" stroke="#92400e" strokeWidth="1.8" fill="none" opacity="0.5" />
        <path d="M 66 22 Q 72 54 66 84" stroke="#92400e" strokeWidth="1.8" fill="none" opacity="0.5" />

        {/* Shell Highlight */}
        <ellipse cx="36" cy="24" rx="8" ry="4" fill="#fde68a" opacity="0.3" transform="rotate(-30 36 24)" />

        {/* Eyes (Left & Right) */}
        <ellipse cx="40" cy="44" rx="6" ry="8" fill="#ffffff" />
        <ellipse cx="60" cy="44" rx="6" ry="8" fill="#ffffff" />

        {/* Pupils */}
        <circle cx="42" cy="45" r="3.2" fill="#1e1b4b" />
        <circle cx="62" cy="45" r="3.2" fill="#1e1b4b" />

        {/* Eye Shine */}
        <circle cx="43.5" cy="43.5" r="1.3" fill="#ffffff" />
        <circle cx="63.5" cy="43.5" r="1.3" fill="#ffffff" />

        {/* Mouth depending on HP */}
        {hpRatio > 0.66 ? (
          // Happy Smile
          <path d="M 44 64 Q 50 72 56 64" stroke="#451a03" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : hpRatio > 0.33 ? (
          // Worried / Strained Wavy Mouth
          <path d="M 42 66 Q 50 60 58 66" stroke="#451a03" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          // Desperate Grimace with teeth
          <g>
            <rect x="42" y="62" width="16" height="8" rx="3" fill="#ffffff" stroke="#451a03" strokeWidth="1.5" />
            <line x1="47" y1="62" x2="47" y2="70" stroke="#451a03" strokeWidth="1.2" />
            <line x1="53" y1="62" x2="53" y2="70" stroke="#451a03" strokeWidth="1.2" />
          </g>
        )}

        {/* Cracks for Medium HP */}
        {hpRatio <= 0.66 && (
          <path
            d="M 68 28 L 62 36 L 66 42 L 58 48"
            stroke="#451a03"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Extra Heavy Cracks & Band-aid for Low HP */}
        {hpRatio <= 0.33 && (
          <>
            <path
              d="M 28 34 L 34 42 L 30 52 L 36 60"
              stroke="#451a03"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cute Band-aid */}
            <g transform="translate(62, 58) rotate(25)">
              <rect x="-8" y="-4" width="16" height="8" rx="2" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
              <circle cx="0" cy="0" r="1.5" fill="#eab308" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

/**
 * 3. Snow Pea (Băng Tiễn)
 * Icy cyan crystalline shooter with cold particles
 */
export const SnowPeaSprite: React.FC<{ isShooting?: boolean; size?: number; className?: string }> = ({
  isShooting = false,
  size = 52,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-transform",
        isShooting ? "scale-105 -rotate-3" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]">
        <defs>
          <linearGradient id="iceHead" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="iceStem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <radialGradient id="iceBarrel" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#082f49" />
            <stop offset="70%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </radialGradient>
        </defs>

        {/* Shadow base */}
        <ellipse cx="50" cy="90" rx="28" ry="7" fill="rgba(14,165,233,0.3)" />

        {/* Frozen Base Leaves */}
        <path
          d="M 24 88 C 12 84 10 74 28 82 C 34 84 42 86 50 86 C 58 86 66 84 72 82 C 90 74 88 84 76 88 C 66 92 34 92 24 88 Z"
          fill="url(#iceStem)"
        />

        {/* Ice crystals on leaves */}
        <polygon points="34,80 38,72 42,80" fill="#e0f2fe" />
        <polygon points="62,80 66,72 70,80" fill="#e0f2fe" />

        {/* Stem */}
        <path d="M 47 84 Q 45 60 52 46 Q 54 44 56 46 Q 51 62 53 84 Z" fill="url(#iceStem)" />

        {/* Back Ice Shard Crest */}
        <polygon points="40,36 16,22 34,26" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
        <polygon points="42,42 22,34 38,32" fill="#bae6fd" />

        {/* Head */}
        <circle cx="56" cy="40" r="22" fill="url(#iceHead)" />

        {/* Ice Snout */}
        <path
          d="M 66 32 C 78 30 84 32 86 36 C 88 40 88 44 86 48 C 84 52 78 54 66 52 Z"
          fill="url(#iceHead)"
        />
        <ellipse cx="85" cy="42" rx="4.5" ry="7.5" fill="url(#iceBarrel)" />

        {/* Big Bright Eye */}
        <ellipse cx="52" cy="33" rx="5.5" ry="7" fill="#ffffff" />
        <circle cx="54" cy="33" r="3.2" fill="#0369a1" />
        <circle cx="55.5" cy="31.5" r="1.3" fill="#ffffff" />

        {/* Crystalline Sparkles */}
        <polygon points="48,22 50,17 52,22 57,24 52,26 50,31 48,26 43,24" fill="#ffffff" opacity="0.9" />
        <polygon points="66,20 67,16 68,20 72,21 68,22 67,26 66,22 62,21" fill="#e0f2fe" opacity="0.8" />
      </svg>
    </div>
  );
};

/**
 * 4. Magic Tower / Tesla Plant (Tháp Sét Lan)
 * Pulsing high-tech electric flower with neon coils
 */
export const MagicTowerSprite: React.FC<{ size?: number; className?: string }> = ({
  size = 52,
  className,
}) => {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none transition-transform hover:scale-105", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]">
        <defs>
          <linearGradient id="teslaStem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>
          <radialGradient id="plasmaBall" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf4ff" />
            <stop offset="40%" stopColor="#d8b4fe" />
            <stop offset="80%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6b21a8" />
          </radialGradient>
        </defs>

        {/* Base Shadow */}
        <ellipse cx="50" cy="90" rx="28" ry="7" fill="rgba(147,51,234,0.3)" />

        {/* Tech Base Leaves */}
        <path d="M 22 88 C 16 80 24 72 36 82 C 44 84 56 84 64 82 C 76 72 84 80 78 88 Z" fill="url(#teslaStem)" />

        {/* Copper / Violet Metal Pole */}
        <rect x="46" y="44" width="8" height="42" rx="4" fill="#7e22ce" stroke="#d8b4fe" strokeWidth="1" />

        {/* Tesla Coils (Rings) */}
        <ellipse cx="50" cy="74" rx="14" ry="4" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        <ellipse cx="50" cy="62" rx="16" ry="4.5" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
        <ellipse cx="50" cy="50" rx="18" ry="5" fill="none" stroke="#e879f9" strokeWidth="2.5" />

        {/* Main Floating Glowing Plasma Orb */}
        <circle cx="50" cy="28" r="18" fill="url(#plasmaBall)" />
        <circle cx="50" cy="28" r="8" fill="#ffffff" opacity="0.9" />

        {/* Crackling Neon Bolts */}
        <path d="M 44 14 L 48 24 L 42 28 L 52 38" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 58 16 L 54 24 L 60 28" stroke="#38bdf8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 32 30 L 40 32 L 36 38" stroke="#f472b6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/**
 * 5. Cherry Bomb (Bom Anh Đào)
 * Two cute angry fiery cherry brothers sizzling with explosive fuse
 */
export const CherryBombSprite: React.FC<{ size?: number; className?: string }> = ({
  size = 52,
  className,
}) => {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none animate-bounce transition-transform hover:scale-110", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_14px_rgba(239,68,68,0.8)]">
        <defs>
          <radialGradient id="cherryRed" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="30%" stopColor="#ef4444" />
            <stop offset="80%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>
        </defs>

        {/* Base Shadow */}
        <ellipse cx="50" cy="92" rx="30" ry="7" fill="rgba(0,0,0,0.3)" />

        {/* Stems connected at top */}
        <path d="M 50 20 Q 36 30 36 54" stroke="#15803d" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 50 20 Q 64 30 66 54" stroke="#15803d" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Burning Sizzling Fuse Spark */}
        <circle cx="50" cy="18" r="4" fill="#fbbf24" className="animate-ping" />
        <polygon points="50,12 52,17 57,18 52,19 50,24 48,19 43,18 48,17" fill="#f59e0b" />

        {/* Left Cherry Body */}
        <circle cx="34" cy="62" r="20" fill="url(#cherryRed)" />
        {/* Right Cherry Body */}
        <circle cx="66" cy="64" r="20" fill="url(#cherryRed)" />

        {/* Left Cherry Angry Eyes */}
        <polygon points="26,52 38,58 26,58" fill="#450a0a" />
        <circle cx="32" cy="56" r="2" fill="#ffffff" />
        {/* Left Angry Mouth */}
        <path d="M 28 68 Q 34 64 40 68" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Right Cherry Angry Eyes */}
        <polygon points="74,54 62,60 74,60" fill="#450a0a" />
        <circle cx="68" cy="58" r="2" fill="#ffffff" />
        {/* Right Angry Mouth */}
        <path d="M 60 70 Q 66 66 72 70" stroke="#450a0a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};

/**
 * Universal Plant Renderer
 */
export const PlantSpriteRenderer: React.FC<PlantSpriteProps> = ({
  type,
  hp,
  maxHp,
  isShooting,
  className,
  size = 52,
}) => {
  switch (type) {
    case 'peashooter':
      return <PeashooterSprite isShooting={isShooting} size={size} className={className} />;
    case 'wallnut':
      return <WallnutSprite hp={hp} maxHp={maxHp} size={size} className={className} />;
    case 'snowpea':
      return <SnowPeaSprite isShooting={isShooting} size={size} className={className} />;
    case 'magictower':
      return <MagicTowerSprite size={size} className={className} />;
    case 'cherrybomb':
      return <CherryBombSprite size={size} className={className} />;
    default:
      return <PeashooterSprite size={size} className={className} />;
  }
};
