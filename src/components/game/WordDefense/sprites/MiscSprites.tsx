import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Lawnmower (Máy Cắt Cỏ Phòng Thủ)
 * Classic red lawnmower with chrome parts, spinning blades and exhaust
 */
export const LawnmowerSprite: React.FC<{ isTriggered?: boolean; size?: number; className?: string }> = ({
  isTriggered = false,
  size = 46,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-transform",
        isTriggered ? "animate-pulse scale-110" : "hover:scale-105",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
        <defs>
          <linearGradient id="mowerRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="chromeEngine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Wheels */}
        <circle cx="28" cy="74" r="16" fill="#0f172a" stroke="#334155" strokeWidth="3" />
        <circle cx="28" cy="74" r="7" fill="#cbd5e1" />
        <circle cx="74" cy="76" r="14" fill="#0f172a" stroke="#334155" strokeWidth="3" />
        <circle cx="74" cy="76" r="6" fill="#cbd5e1" />

        {/* Red Hood Body */}
        <path
          d="M 16 68 C 16 48 30 42 54 44 L 84 56 C 88 58 90 64 88 70 L 16 70 Z"
          fill="url(#mowerRed)"
          stroke="#7f1d1d"
          strokeWidth="2"
        />

        {/* Chrome Engine Block */}
        <rect x="34" y="30" width="22" height="18" rx="4" fill="url(#chromeEngine)" stroke="#334155" strokeWidth="1.5" />
        {/* Engine cooling ribs */}
        <line x1="38" y1="35" x2="52" y2="35" stroke="#334155" strokeWidth="1.5" />
        <line x1="38" y1="40" x2="52" y2="40" stroke="#334155" strokeWidth="1.5" />

        {/* Push Handle Bars */}
        <path d="M 22 56 L 6 22 L 14 18" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="14" cy="18" r="3.5" fill="#ef4444" />

        {/* Front Blade Cover / Teeth */}
        <path d="M 82 62 L 94 68 L 82 72 Z" fill="#94a3b8" />

        {/* Exhaust smoke when triggered */}
        {isTriggered && (
          <g className="animate-ping">
            <circle cx="24" cy="38" r="6" fill="#e2e8f0" opacity="0.8" />
            <circle cx="16" cy="32" r="8" fill="#cbd5e1" opacity="0.6" />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Sun Drop Sprite (Mặt Trời Nắng Vàng Rực Rỡ)
 * Cute smiling sun with rotating rays
 */
export const SunDropSprite: React.FC<{ size?: number; className?: string }> = ({
  size = 48,
  className,
}) => {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(250,204,21,0.85)]">
        <defs>
          <radialGradient id="sunFace" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="90%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
        </defs>

        {/* Rotating Radiant Petals */}
        <g className="animate-spin" style={{ transformOrigin: '50px 50px', animationDuration: '10s' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            return (
              <polygon
                key={i}
                points="46,12 54,12 50,2"
                fill="#f59e0b"
                transform={`rotate(${angle} 50 50)`}
              />
            );
          })}
        </g>

        {/* Main Sun Circle */}
        <circle cx="50" cy="50" r="34" fill="url(#sunFace)" stroke="#ca8a04" strokeWidth="2" />

        {/* Cute Blushing Cheeks */}
        <ellipse cx="36" cy="56" rx="4.5" ry="3" fill="#f87171" opacity="0.6" />
        <ellipse cx="64" cy="56" rx="4.5" ry="3" fill="#f87171" opacity="0.6" />

        {/* Cheerful Smiling Eyes */}
        <ellipse cx="38" cy="46" rx="3.5" ry="4.5" fill="#713f12" />
        <ellipse cx="62" cy="46" rx="3.5" ry="4.5" fill="#713f12" />
        <circle cx="39" cy="44.5" r="1.5" fill="#ffffff" />
        <circle cx="63" cy="44.5" r="1.5" fill="#ffffff" />

        {/* Sweet Smile */}
        <path d="M 44 55 Q 50 62 56 55" stroke="#713f12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};

/**
 * Pea Projectile Sprite (Viên Đạn Đậu / Đạn Băng)
 */
export const PeaProjectileSprite: React.FC<{ isIce?: boolean; size?: number }> = ({
  isIce = false,
  size = 20,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none",
        isIce ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]" : "drop-shadow-[0_0_8px_rgba(74,222,128,0.9)]"
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <defs>
          <radialGradient id="peaProjGreen" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="40%" stopColor="#4ade80" />
            <stop offset="90%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#14532d" />
          </radialGradient>
          <radialGradient id="peaProjIce" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="90%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#075985" />
          </radialGradient>
        </defs>

        {/* Main Sphere */}
        <circle
          cx="20"
          cy="20"
          r="16"
          fill={isIce ? "url(#peaProjIce)" : "url(#peaProjGreen)"}
        />
        {/* Specular Glint */}
        <ellipse cx="14" cy="14" rx="4.5" ry="2.5" fill="#ffffff" opacity="0.8" transform="rotate(-30 14 14)" />
        {/* Tail Wind */}
        <path d="M 4 20 Q 0 16 2 24" stroke={isIce ? "#bae6fd" : "#86efac"} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    </div>
  );
};
