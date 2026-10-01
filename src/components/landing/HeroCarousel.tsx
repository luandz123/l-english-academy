import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Award,
  GraduationCap,
} from "lucide-react";
import heroToeic850Img from "@/assets/hero-toeic-850.webp";
import heroDictationImg from "@/assets/hero-dictation.webp";
import heroStudentImg from "@/assets/hero-student.webp";
import iconFulltest from "@/assets/icons/icon-fulltest.webp";
import iconDictation from "@/assets/icons/icon-dictation.webp";
import iconReflex from "@/assets/icons/icon-reflex.webp";
import iconFlame from "@/assets/icons/icon-flame.webp";
import iconGradcap from "@/assets/icons/icon-gradcap.webp";
import iconShield from "@/assets/icons/icon-shield.webp";

interface SlideBadge {
  icon?: typeof Headphones;
  imageIcon?: string;
  title: string;
  desc: string;
  color?: string;
}

interface SlideData {
  id: number;
  tag: string;
  tagColor: string;
  title: string;
  highlight: string;
  subtitle: string;
  bullets: string[];
  ctaPrimaryText: string;
  ctaPrimaryLink: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  bgGradient: string;
  image: string;
  badge: SlideBadge;
}

const slides: SlideData[] = [
  {
    id: 1,
    tag: "⚡ LỘ TRÌNH TOEIC THỰC CHIẾN",
    tagColor: "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20",
    title: "Từ mất gốc đến",
    highlight: "TOEIC 850+",
    subtitle: "Lộ trình tinh gọn kết hợp đề thi ETS chuẩn hóa, phương pháp nghe chép chính tả và theo dõi tiến độ cá nhân hóa.",
    bullets: [
      "Chuẩn đề thi ETS cập nhật mới nhất",
      "Luyện nghe chép & đọc hiểu thực chiến",
      "Theo dõi chi tiết tiến độ từng ngày",
    ],
    ctaPrimaryText: "Bắt đầu học ngay",
    ctaPrimaryLink: "#section-fulltest",
    ctaSecondaryText: "Xem lộ trình",
    ctaSecondaryLink: "#section-video",
    bgGradient: "from-blue-600/10 via-blue-500/5 to-transparent",
    image: heroToeic850Img,
    badge: {
      imageIcon: iconFlame,
      title: "Mục tiêu TOEIC 850+",
      desc: "Lộ trình lên 850+",
      color: "bg-amber-100 dark:bg-amber-950 text-amber-600",
    },
  },
  {
    id: 2,
    tag: "⚡ CÔNG NGHỆ BẮT ÂM TỰ ĐỘNG",
    tagColor: "bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-600/20",
    title: "Phương pháp Dictation",
    highlight: "XÓA NỖI SỢ LISTENING",
    subtitle: "Gõ lại từng từ bạn nghe được. Trình nghe tự động tua câu, đối chiếu câu đúng sai thời gian thực giúp tai bắt âm nhạy bén.",
    bullets: [
      "Phát hiện nuốt âm & nối âm chuẩn xác",
      "Chấm điểm & hiển thị transcript tức thì",
      "Tra từ vựng trực tiếp khi đang nghe",
    ],
    ctaPrimaryText: "Thử luyện nghe ngay",
    ctaPrimaryLink: "#section-listening",
    ctaSecondaryText: "Xem lộ trình Part 2",
    ctaSecondaryLink: "/part2-coach",
    bgGradient: "from-purple-600/10 via-indigo-500/5 to-transparent",
    image: heroDictationImg,
    badge: {
      imageIcon: iconDictation,
      title: "Dictation Bắt Âm",
      desc: "Chép chính tả từng câu",
      color: "bg-purple-100 dark:bg-purple-950 text-purple-600",
    },
  },
  {
    id: 3,
    tag: "⚡ PHÒNG THI THỬ 200 CÂU",
    tagColor: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20",
    title: "Thi thử chuẩn format",
    highlight: "BẤM GIỜ THẬT 120 PHÚT",
    subtitle: "Trải nghiệm áp lực phòng thi 120 phút đầy đủ 7 Part. Thang điểm quy đổi chuẩn ETS kèm phân tích câu sai cặn kẽ.",
    bullets: [
      "Format 200 câu Listening & Reading",
      "Bảng quy đổi điểm chuẩn ETS 990",
      "Phân tích lỗ hổng kiến thức tự động",
    ],
    ctaPrimaryText: "Vào phòng thi thử ngay",
    ctaPrimaryLink: "#section-fulltest",
    ctaSecondaryText: "Kho từ vựng",
    ctaSecondaryLink: "/vocab",
    bgGradient: "from-emerald-600/10 via-emerald-500/5 to-transparent",
    image: heroStudentImg,
    badge: {
      imageIcon: iconFulltest,
      title: "Full Test ETS",
      desc: "Format chuẩn 120 phút",
      color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600",
    },
  },
];

export const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto slide every 6.5 seconds (paused when hovered)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const slide = slides[currentIndex];
  const BadgeIcon = slide.badge.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs group"
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} transition-all duration-500 pointer-events-none`}
      />

      <div className="relative z-10 p-6 sm:p-8 md:py-10 md:px-14 lg:py-12 lg:px-16">
        <div key={currentIndex} className="grid md:grid-cols-12 gap-8 items-center animate-fade-in transition-all duration-350">
          {/* Left Content */}
          <div className="md:col-span-7 space-y-4">
            {/* Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xs">
              <span className={`text-xs font-black uppercase tracking-wider ${slide.tagColor}`}>
                {slide.tag}
              </span>
            </div>

            {/* H1 Heading */}
            <div>
              {currentIndex === 0 ? (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-foreground leading-tight tracking-normal">
                  {slide.title}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                    {slide.highlight}
                  </span>
                </h1>
              ) : (
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-foreground leading-tight tracking-normal">
                  {slide.title}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                    {slide.highlight}
                  </span>
                </h2>
              )}
            </div>

            {/* Subtitle (1-2 lines, clean) */}
            <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
              {slide.subtitle}
            </p>

            {/* Max 3 Short Bullets */}
            <div className="space-y-1.5 pt-1">
              {slide.bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* CTA Hierarchy: 1 Primary CTA + 1 Ghost/Outline CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {slide.ctaPrimaryLink.startsWith("#") ? (
                <a
                  href={slide.ctaPrimaryLink}
                  onClick={() =>
                    trackEvent("click_hero_primary_cta", {
                      slide_id: slide.id,
                      title: slide.ctaPrimaryText,
                      link: slide.ctaPrimaryLink,
                    })
                  }
                  className="btn-3d btn-3d-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <span>{slide.ctaPrimaryText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <Link
                  to={slide.ctaPrimaryLink}
                  onClick={() =>
                    trackEvent("click_hero_primary_cta", {
                      slide_id: slide.id,
                      title: slide.ctaPrimaryText,
                      link: slide.ctaPrimaryLink,
                    })
                  }
                  className="btn-3d btn-3d-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <span>{slide.ctaPrimaryText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              {slide.ctaSecondaryText && (
                slide.ctaSecondaryLink?.startsWith("#") ? (
                  <a
                    href={slide.ctaSecondaryLink}
                    onClick={() =>
                      trackEvent("click_hero_secondary_cta", {
                        slide_id: slide.id,
                        title: slide.ctaSecondaryText,
                        link: slide.ctaSecondaryLink,
                      })
                    }
                    className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {slide.ctaSecondaryText}
                  </a>
                ) : (
                  <Link
                    to={slide.ctaSecondaryLink || "#"}
                    onClick={() =>
                      trackEvent("click_hero_secondary_cta", {
                        slide_id: slide.id,
                        title: slide.ctaSecondaryText,
                        link: slide.ctaSecondaryLink,
                      })
                    }
                    className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {slide.ctaSecondaryText}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Right Graphic Banner with EXACTLY 1 Floating Card */}
          <div className="md:col-span-5 flex justify-center items-center relative">
            <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
              {/* Only 1 Single Floating Card */}
              <div className="absolute -bottom-3 -left-2 bg-card/95 backdrop-blur-md border border-border/70 rounded-2xl px-3.5 py-2.5 shadow-soft-md z-20 animate-fade-in transition-all">
                <div className="flex items-center gap-2.5">
                  {slide.badge.imageIcon ? (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-700/60 p-0.5 flex items-center justify-center shrink-0">
                      <img src={slide.badge.imageIcon} alt="" className="w-full h-full object-contain drop-shadow-xs" />
                    </div>
                  ) : BadgeIcon ? (
                    <div className={`w-7 h-7 rounded-lg ${slide.badge.color} flex items-center justify-center shrink-0`}>
                      <BadgeIcon className="w-4 h-4" />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{slide.badge.title}</p>
                    <p className="text-xs font-extrabold text-foreground">{slide.badge.desc}</p>
                  </div>
                </div>
              </div>

              {/* Main Graphic Illustration with image-safe border protection */}
              <div className="relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-tr from-slate-100 via-white to-blue-50/60 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-900 p-2 shadow-soft-md">
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.title}
                  className="w-full aspect-square object-cover rounded-2xl drop-shadow-md image-safe transition-all duration-300 hover:scale-102"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Controls (Prev / Next & Dots) - Hover only, placed at outer edges */}
      <button
        onClick={handlePrev}
        aria-label="Previous slide"
        className="hidden sm:flex absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/95 text-slate-700 dark:text-zinc-200 items-center justify-center border border-slate-200/90 dark:border-zinc-700 shadow-md hover:scale-110 active:scale-95 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 z-20 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Next slide"
        className="hidden sm:flex absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-800/95 text-slate-700 dark:text-zinc-200 items-center justify-center border border-slate-200/90 dark:border-zinc-700 shadow-md hover:scale-110 active:scale-95 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-300 z-20 cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              currentIndex === i
                ? "w-6 bg-blue-600 dark:bg-blue-400"
                : "w-2 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
