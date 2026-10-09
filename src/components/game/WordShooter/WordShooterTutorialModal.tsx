import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Gamepad2, 
  Sparkles, 
  Heart, 
  Snowflake, 
  Bomb, 
  Shield, 
  Volume2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  X, 
  Keyboard, 
  HelpCircle,
  Zap,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameSound } from './gameSound';
import { cn } from '@/lib/utils';

export const TUTORIAL_STORAGE_KEY = 'has_seen_word_shooter_tutorial_v2';

interface WordShooterTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const WordShooterTutorialModal: React.FC<WordShooterTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);

  // Interactive Test State for Step 4
  const [testTargetWord] = useState<string>('TARGET');
  const [testTypedLetters, setTestTypedLetters] = useState<string>('');
  const [isTestDestroyed, setIsTestDestroyed] = useState<boolean>(false);
  const [testScore, setTestScore] = useState<number>(0);

  // Reset interactive test when navigating to step 3 (0-indexed 3 is step 4)
  useEffect(() => {
    if (currentStep === 3) {
      setTestTypedLetters('');
      setIsTestDestroyed(false);
      setTestScore(0);
    }
  }, [currentStep]);

  // Keyboard listener for Interactive Test on step 4
  useEffect(() => {
    if (!isOpen || currentStep !== 3 || isTestDestroyed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Tab') return;

      const char = e.key.toUpperCase();
      if (char.length === 1 && char >= 'A' && char <= 'Z') {
        e.preventDefault();
        handleTestCharInput(char);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, testTypedLetters, isTestDestroyed]);

  const handleTestCharInput = (char: string) => {
    const nextExpectedChar = testTargetWord[testTypedLetters.length];
    if (char === nextExpectedChar) {
      gameSound.playLaserSound();
      const updated = testTypedLetters + char;
      setTestTypedLetters(updated);

      if (updated.length === testTargetWord.length) {
        // Destroyed!
        gameSound.playExplosionSound();
        gameSound.speakWord('target');
        setIsTestDestroyed(true);
        setTestScore(100);
      }
    } else {
      gameSound.playMissLetterSound();
    }
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
    gameSound.playLaserSound();
    onClose();
    if (onComplete) onComplete();
  };

  if (!isOpen) return null;

  const STEPS = [
    {
      title: 'Mục Tiêu Chiến Trường',
      badge: 'BƯỚC 1 / 4',
      icon: '🛸',
      render: () => (
        <div className="space-y-4">
          <div className="relative h-44 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-blue-950/60 to-slate-950 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40">
              Minh họa chiến trường
            </div>

            {/* Falling word demo */}
            <div className="flex justify-center pt-2">
              <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-bounce text-center">
                <span className="font-mono text-base font-black text-cyan-300 tracking-wider">
                  SUCCESS
                </span>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  /səkˈses/ • sự thành công
                </p>
              </div>
            </div>

            {/* Arrow & Bottom Jet */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-rose-400 font-bold animate-pulse">
                ⚠️ Đừng để từ vựng rơi chạm vạch đỏ đáy màn hình!
              </span>
              <div className="w-full h-0.5 bg-rose-500/40 my-1" />
              <div className="text-2xl">🚀</div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
            <p>
              • Các thiên thạch chứa <strong>từ vựng tiếng Anh</strong> sẽ rơi từ trên trời xuống kèm theo phiên âm chuẩn và nghĩa tiếng Việt.
            </p>
            <p>
              • Bạn có <strong>3 – 5 mạng</strong>. Mỗi lần để từ rơi chạm đáy sẽ bị mất 1 mạng. Hết mạng là Game Over!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Khóa Mục Tiêu & Bắn Phá',
      badge: 'BƯỚC 2 / 4',
      icon: '🎯',
      render: () => (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-950/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xl shrink-0">
                ⌨️
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Khóa Laser Tự Động (Auto-Lock)</h4>
                <p className="text-xs text-slate-300">
                  Chỉ cần gõ chữ cái đầu tiên của từ, phi cơ sẽ tự xoay nòng laser khóa cứng mục tiêu!
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 font-mono text-xs flex items-center justify-between">
              <span className="text-slate-400">Ví dụ từ:</span>
              <span className="text-base font-black text-white tracking-widest">
                <span className="text-emerald-400 underline decoration-cyan-400">P - R - O</span>
                <span className="text-slate-500"> - M - O - T - E</span>
              </span>
              <span className="text-xs text-emerald-400 font-bold">Đang bắn 💥</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-950/60 p-2.5 rounded-xl border border-cyan-500/20">
              <Volume2 className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>
                <strong>Phát âm bản xứ:</strong> Khi bắn nổ xong, từ vựng sẽ được máy đọc chuẩn giọng Anh - Mỹ kèm popup nghĩa bay lên!
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Mẹo đổi mục tiêu:</strong> Nhấn phím <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded border border-slate-700 font-mono">Backspace</kbd> hoặc <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded border border-slate-700 font-mono">Space</kbd> để hủy khóa từ hiện tại.
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Bảo Bối & Vật Phẩm Đặc Biệt',
      badge: 'BƯỚC 3 / 4',
      icon: '❄️',
      render: () => (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">
            Trong các đợt tấn công, một số từ vựng sẽ phát sáng và mang theo các hiệu ứng đặc biệt khi bạn bắn nổ:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-500/40 flex items-start gap-2.5">
              <span className="text-2xl">💖</span>
              <div>
                <h5 className="text-xs font-black text-pink-300">Hồi Máu (+1 Mạng)</h5>
                <p className="text-[11px] text-slate-300">Hồi lại 1 trái tim đã mất khi bắn trúng từ viền hồng.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/40 flex items-start gap-2.5">
              <span className="text-2xl">❄️</span>
              <div>
                <h5 className="text-xs font-black text-sky-300">Đóng Băng (Freeze)</h5>
                <p className="text-[11px] text-slate-300">Ngưng đọng thời gian 3.2 giây, tất cả từ ngừng rơi!</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-2.5">
              <span className="text-2xl">💣</span>
              <div>
                <h5 className="text-xs font-black text-amber-300">Bom Hạt Nhân</h5>
                <p className="text-[11px] text-slate-300">Kích hoạt vụ nổ quét sạch mọi từ đang có trên màn hình.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex items-start gap-2.5">
              <span className="text-2xl">🛡️</span>
              <div>
                <h5 className="text-xs font-black text-cyan-300">Khiên Năng Lượng</h5>
                <p className="text-[11px] text-slate-300">Bảo vệ phi cơ, chặn 1 đòn sát thương khi từ chạm đáy.</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/30 flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div className="text-xs">
              <strong className="text-amber-400">Boss Wave (Trùm Cuối):</strong> Từ vựng Boss có độ dài lớn và tốc độ rơi nhanh, bắn hạ sẽ nhận được <strong>x2.5 điểm số và combo khủng</strong>!
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Tập Bắn Thử Ngay Tại Chỗ!',
      badge: 'BƯỚC 4 / 4 • THỰC HÀNH',
      icon: '🚀',
      render: () => (
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Hãy thử gõ từ khóa <strong>TARGET</strong> bằng bàn phím của bạn (hoặc bấm vào các nút chữ cái bên dưới) để bắn hạ mục tiêu đầu tiên!
          </p>

          {/* Interactive Drill Box */}
          <div className="relative h-44 rounded-2xl border border-cyan-400/40 bg-gradient-to-b from-slate-900 to-black p-4 flex flex-col justify-between items-center overflow-hidden shadow-2xl">
            {/* Top Score */}
            <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
              <span>ĐIỂM TẬP BẮN: +{testScore}</span>
              <span className="text-amber-400">COMBO: {testTypedLetters.length}x</span>
            </div>

            {/* Target Word */}
            {!isTestDestroyed ? (
              <div className="px-5 py-2.5 rounded-2xl bg-blue-950/90 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse flex flex-col items-center">
                <div className="font-mono text-xl font-black tracking-widest">
                  {testTargetWord.split('').map((c, i) => {
                    const isTyped = i < testTypedLetters.length;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "transition-colors",
                          isTyped
                            ? "text-emerald-400 drop-shadow-[0_0_8px_#34d399] font-black"
                            : "text-slate-300"
                        )}
                      >
                        {c}
                      </span>
                    );
                  })}
                </div>
                <span className="text-[11px] text-cyan-200 mt-1">/ˈtɑː.ɡɪt/ • Mục tiêu</span>
              </div>
            ) : (
              <div className="text-center space-y-1 animate-scale-in">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  MỤC TIÊU ĐÃ BỊ BẮN NỔ!
                </div>
                <p className="text-xs text-slate-300">Xuất sắc! Bạn đã nắm vững cơ chế chiến đấu.</p>
              </div>
            )}

            {/* Bottom Jet */}
            <div className="text-2xl transform transition-transform duration-150">
              🚀
            </div>
          </div>

          {/* On-screen quick keys for mobile or easy testing */}
          {!isTestDestroyed && (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {['T', 'A', 'R', 'G', 'E'].concat(['T']).map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTestCharInput(char)}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white font-mono font-bold border border-slate-700 shadow-md active:scale-90 transition-all text-sm"
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  const currentStepData = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 md:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-black border border-cyan-500/40 uppercase">
                {currentStepData.badge}
              </span>
              <span className="text-xs font-bold text-slate-400">Hướng Dẫn Tân Thủ</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <span>{currentStepData.icon}</span>
              <span>{currentStepData.title}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="min-h-[260px] flex flex-col justify-center">
          {currentStepData.render()}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                currentStep === idx
                  ? "w-8 bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                  : "w-2 bg-slate-800 hover:bg-slate-700"
              )}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300 self-start sm:self-center">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
            <span>Không tự động hiển thị lại</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                Tiếp theo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinish}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs px-6 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse"
              >
                <Rocket className="w-4 h-4 mr-1.5" />
                SẴN SÀNG CHIẾN ĐẤU!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
