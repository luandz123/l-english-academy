import React from 'react';
import { 
  Users, 
  Bot, 
  Heart, 
  Flame, 
  Zap, 
  Radio, 
  ShieldAlert, 
  Swords, 
  Sparkles,
  Target,
  Gauge,
  Crown
} from 'lucide-react';
import { OpponentState, SpecialWordType } from './types';
import { cn } from '@/lib/utils';

interface WordShooterPvPViewProps {
  opponent: OpponentState;
  isBot?: boolean;
  playerCombo: number;
  attackNotification: string | null;
  incomingAttackWarning: boolean;
  opponentWords?: Array<{ x: number; y: number; word: string; lettersTyped?: number; isTargeted?: boolean; specialType?: SpecialWordType }>;
}

const SPECIAL_EMOJIS: Record<string, string> = {
  heart: '💖', freeze: '❄️', bomb: '💣', meteor: '☄️', shield: '🛡️', slowmo: '⏳', boss: '👑',
};

export const WordShooterPvPView: React.FC<WordShooterPvPViewProps> = ({
  opponent,
  isBot = false,
  playerCombo,
  attackNotification,
  incomingAttackWarning,
  opponentWords = [],
}) => {
  const attackProgress = ((playerCombo % 3) / 3) * 100;

  return (
    <div className="w-full h-full flex flex-col rounded-3xl border border-slate-800 bg-slate-950/90 backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Opponent HUD Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg border",
              opponent.isEliminated
                ? "bg-slate-800/50 border-slate-700 text-slate-600"
                : "bg-purple-600/20 border-purple-500/40 text-purple-300"
            )}>
              {isBot ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
              opponent.isEliminated ? "bg-slate-600" : "bg-emerald-500"
            )} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-wide">{opponent.name}</span>
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded border",
                isBot
                  ? "text-purple-400 bg-purple-950/60 border-purple-800/40"
                  : "text-emerald-400 bg-emerald-950/60 border-emerald-800/40"
              )}>
                {isBot ? 'AI BOT' : 'LIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Opponent Lives */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={cn(
                "w-3.5 h-3.5 transition-all duration-300",
                i < opponent.lives
                  ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]"
                  : "text-slate-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Opponent Mini Stats */}
      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900/40 border-b border-slate-800/60 text-xs text-center shrink-0">
        <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-500 font-bold block text-xs">ĐIỂM</span>
          <p className="text-sm font-black text-amber-300">{opponent.score.toLocaleString()}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-500 font-bold block text-xs">COMBO</span>
          <p className={cn("text-sm font-black", opponent.combo >= 3 ? "text-rose-400" : "text-slate-300")}>{opponent.combo}x</p>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-500 font-bold block text-xs">WPM</span>
          <p className="text-sm font-black text-cyan-300">{opponent.wpm || 0}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-slate-500 font-bold block text-xs">ĐỘ CX</span>
          <p className="text-sm font-black text-emerald-300">{opponent.accuracy || 100}%</p>
        </div>
      </div>

      {/* Alert Banners */}
      {attackNotification && (
        <div className="px-2.5 py-2 bg-emerald-950/80 border-b border-emerald-500/50 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 animate-pulse shrink-0">
          <Swords className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">{attackNotification}</span>
        </div>
      )}

      {incomingAttackWarning && (
        <div className="px-2.5 py-2 bg-rose-950/90 border-b border-rose-500/60 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-300 animate-bounce shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>🚨 THIÊN THẠCH ĐANG TẤN CÔNG!</span>
        </div>
      )}

      {/* Live Mirror Arena — Full Falling Words Visualization */}
      <div className="relative flex-1 min-h-[200px] bg-slate-950 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        
        {/* Radial gradient top glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/30 via-transparent to-transparent pointer-events-none" />

        {/* Opponent Jet (top position, facing down) */}
        <div 
          className="absolute top-2 transition-transform duration-150 ease-out z-10"
          style={{
            left: `${opponent.jetX || 50}%`,
            transform: `translateX(-50%) rotate(${180 + (opponent.jetAngle || 0)}deg)`,
          }}
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            {opponent.isFiring && (
              <>
                <div className="absolute top-3 left-1 w-1.5 h-1.5 bg-rose-400 rounded-full blur-xs animate-ping" />
                <div className="absolute top-3 right-1 w-1.5 h-1.5 bg-rose-400 rounded-full blur-xs animate-ping" />
              </>
            )}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              <polygon points="50,8 80,72 50,60 20,72" fill="#1c070c" stroke="#f43f5e" strokeWidth="3" />
              <polygon points="50,22 66,62 50,54 34,62" fill="#3b0d18" stroke="#fb7185" strokeWidth="2" />
              <polygon points="50,16 56,46 50,50 44,46" fill="#f43f5e" opacity="0.9" />
              <circle cx="50" cy="32" r="3.5" fill="#ffffff" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Current Target Typing Indicator */}
        {opponent.currentWordText && (
          <div className="absolute top-12 left-2 right-2 z-20 flex justify-center pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/95 border border-rose-500/40 backdrop-blur-sm text-center">
              <span className="text-xs text-slate-400 block leading-none mb-0.5">Đang gõ:</span>
              <span className="text-xs font-black text-rose-300 tracking-wider font-mono">
                {opponent.currentWordText}
              </span>
            </div>
          </div>
        )}

        {/* Falling Words (mirror visualization) */}
        {opponentWords.map((ow, idx) => {
          const isTargeted = ow.isTargeted;
          const lettersTyped = ow.lettersTyped || 0;
          const emoji = ow.specialType && ow.specialType !== 'none' ? SPECIAL_EMOJIS[ow.specialType] : null;

          return (
            <div
              key={`ow_${idx}_${ow.word}`}
              className="absolute transform -translate-x-1/2 pointer-events-none transition-all duration-200"
              style={{
                left: `${Math.max(8, Math.min(92, ow.x))}%`,
                top: `${Math.max(15, Math.min(88, ow.y))}%`,
              }}
            >
              <div className={cn(
                "px-2 py-0.5 rounded-lg border backdrop-blur-sm text-xs font-mono font-bold flex items-center gap-1 whitespace-nowrap",
                isTargeted
                  ? "bg-rose-950/90 border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                  : "bg-slate-900/80 border-slate-700/60"
              )}>
                {emoji && <span className="text-xs">{emoji}</span>}
                {ow.word.split('').map((char, ci) => (
                  <span
                    key={ci}
                    className={cn(
                      ci < lettersTyped
                        ? "text-rose-400 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]"
                        : ci === lettersTyped && isTargeted
                        ? "text-white underline underline-offset-2 decoration-rose-400"
                        : "text-slate-400"
                    )}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Danger Line */}
        <div className="absolute bottom-4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

        {/* Bottom Status */}
        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
            LIVE
          </span>
          <span>{opponentWords.length} từ</span>
        </div>

        {/* Eliminated Overlay */}
        {opponent.isEliminated && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-30">
            <div className="text-center space-y-1">
              <p className="text-xl font-black text-rose-500">💥 BỊ TIÊU DIỆT</p>
              <p className="text-xs text-slate-400">{opponent.name} đã thua</p>
            </div>
          </div>
        )}
      </div>

      {/* Attack Charge Meter */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Năng lượng:
          </span>
          <span className={cn(
            "font-black",
            playerCombo >= 3 ? "text-amber-400 animate-pulse" : "text-cyan-400"
          )}>
            {playerCombo >= 3 ? '⚡ SẴN SÀNG!' : `${playerCombo % 3}/3`}
          </span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            className={cn(
              "h-full transition-all duration-300 rounded-full",
              playerCombo >= 3
                ? "bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                : "bg-gradient-to-r from-cyan-500 to-blue-500"
            )}
            style={{ width: `${Math.max(attackProgress, playerCombo >= 3 ? 100 : 10)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
