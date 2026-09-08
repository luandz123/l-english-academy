import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Target, BookOpen, Trophy, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// LocalStorage key để biết user đã xem onboarding chưa
const ONBOARDING_KEY = "l_english_onboarding_v1";

interface Step {
  emoji: string;
  title: string;
  desc: string;
  color: string;
  shadow: string;
  iconBg: string;
}

const steps: Step[] = [
  {
    emoji: "🎉",
    title: "Chào mừng đến L-English!",
    desc: "Nền tảng luyện thi TOEIC toàn diện: Nghe chép chính tả, Flashcard từ vựng và Full Test 7 Part đầy đủ. Học thật — Kết quả thật!",
    color: "from-[var(--duo-green)] to-emerald-400",
    shadow: "shadow-emerald-400/30",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    emoji: "🎯",
    title: "Chọn mục tiêu của bạn",
    desc: "Hệ thống có đầy đủ lộ trình cho mọi mục tiêu: từ 450+ cho người mới, 600+ cho dân văn phòng, đến 800+ cho người xuất sắc.",
    color: "from-[var(--duo-blue)] to-cyan-400",
    shadow: "shadow-blue-400/30",
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    emoji: "🚀",
    title: "Sẵn sàng bắt đầu!",
    desc: "Hãy vào xem danh sách khóa học, chọn khóa học phù hợp và bắt đầu luyện ngay hôm nay. Chúc bạn học tốt!",
    color: "from-[var(--duo-orange)] to-yellow-400",
    shadow: "shadow-orange-400/30",
    iconBg: "bg-orange-50 dark:bg-orange-900/20",
  },
];

const goalOptions = [
  { label: "450+ điểm", emoji: "📗", desc: "Cơ bản", color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" },
  { label: "600+ điểm", emoji: "📘", desc: "Trung cấp", color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20" },
  { label: "730+ điểm", emoji: "📙", desc: "Khá giỏi", color: "border-orange-300 bg-orange-50 dark:bg-orange-900/20" },
  { label: "800+ điểm", emoji: "📕", desc: "Xuất sắc", color: "border-rose-300 bg-rose-50 dark:bg-rose-900/20" },
];

interface OnboardingModalProps {
  /** Gọi khi user đóng hoặc hoàn thành onboarding */
  onDone: () => void;
}

const OnboardingModal = ({ onDone }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const displayName = profile?.full_name?.split(" ").pop() || "bạn";
  const isLastStep = currentStep === steps.length - 1;
  const isGoalStep = currentStep === 1;

  const goNext = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      if (isLastStep) {
        handleDone(true);
      } else {
        setCurrentStep((s) => s + 1);
        setAnimating(false);
      }
    }, 200);
  };

  const handleDone = (goToCourses = false) => {
    localStorage.setItem(ONBOARDING_KEY, "done");
    onDone();
    if (goToCourses) {
      navigate("/#section-video");
    }
  };

  const step = steps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => handleDone(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border-2 border-[var(--duo-gray)] dark:border-zinc-800 shadow-[0_8px_0_var(--duo-gray)] dark:shadow-[0_8px_0_rgba(0,0,0,0.4)] overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
          style={{ opacity: animating ? 0.6 : 1, transition: "opacity 0.2s" }}
        >
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[var(--duo-gray)] dark:bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-[var(--duo-green)] to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-6 space-y-5">
            {/* Close button */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-[var(--duo-green)]"
                        : i < currentStep
                        ? "w-3 bg-[var(--duo-correct)]"
                        : "w-3 bg-[var(--duo-gray)]"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => handleDone(false)}
                className="w-8 h-8 rounded-full bg-[var(--duo-gray)] dark:bg-zinc-800 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Icon + Emoji */}
            <div className="text-center space-y-3">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto shadow-lg ${step.shadow} text-4xl`}
              >
                {step.emoji}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground leading-snug">
                  {currentStep === 0
                    ? `Chào ${displayName}! 👋`
                    : step.title}
                </h2>
                <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>

            {/* Step 1: Goal selector */}
            {isGoalStep && (
              <div className="grid grid-cols-2 gap-2">
                {goalOptions.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => setSelectedGoal(g.label)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-150 ${
                      selectedGoal === g.label
                        ? `${g.color} border-current scale-[1.02] shadow-md`
                        : "border-[var(--duo-gray)] dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-[var(--duo-green)]/50"
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="font-extrabold text-sm text-foreground">{g.label}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">{g.desc}</span>
                    {selectedGoal === g.label && (
                      <span className="text-[10px] font-extrabold text-[var(--duo-green)]">✓ Đã chọn</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 (last): Feature highlights */}
            {isLastStep && (
              <div className="space-y-2">
                {[
                  { icon: BookOpen, text: "Kho đề thi Full Test TOEIC 7 Part", color: "text-[var(--duo-green)]" },
                  { icon: Zap, text: "Dictation nghe chép + chấm điểm tự động", color: "text-[var(--duo-orange)]" },
                  { icon: Trophy, text: "Theo dõi tiến độ và streak học tập", color: "text-[var(--duo-yellow)]" },
                  { icon: Target, text: "Flashcard từ vựng theo chủ đề TOEIC", color: "text-[var(--duo-blue)]" },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 dark:bg-zinc-800/60">
                    <Icon className={`w-4 h-4 ${color} shrink-0`} />
                    <span className="text-sm font-bold text-foreground">{text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="btn-3d btn-3d-white py-3 px-5 text-sm flex-shrink-0"
                >
                  ← Quay lại
                </button>
              )}
              <button
                onClick={goNext}
                disabled={isGoalStep && !selectedGoal}
                className={`btn-3d btn-3d-green py-3 flex-1 text-sm flex items-center justify-center gap-2 ${
                  isGoalStep && !selectedGoal ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLastStep ? "Vào xem khóa học 🚀" : "Tiếp tục"}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {!isLastStep && (
              <button
                onClick={() => handleDone(false)}
                className="w-full text-center text-xs text-muted-foreground font-bold hover:text-foreground transition-colors py-1"
              >
                Bỏ qua, tự khám phá
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/** Hook để check xem có nên show onboarding không */
export const useOnboarding = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Delay nhỏ để tránh flash khi page load
      const timer = setTimeout(() => setShouldShow(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const markDone = () => {
    localStorage.setItem(ONBOARDING_KEY, "done");
    setShouldShow(false);
  };

  return { shouldShow, markDone };
};

export default OnboardingModal;
