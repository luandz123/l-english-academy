import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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

interface SlideBadge {
  icon: typeof Headphones;
  title: string;
  desc: string;
  color: string;
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
  badgeAccent: string;
  image: string;
  topBadge: SlideBadge;
  bottomBadge: SlideBadge;
}

const slides: SlideData[] = [
  {
    id: 1,
    tag: "LỘ TRÌNH THỰC CHIẾN ETS 2026",
    tagColor: "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-600/20",
    title: "Luyện Thi TOEIC 2 Kỹ Năng & 4 Kỹ Năng",
    highlight: "TỪ MẤT GỐC ĐẠT 850+",
    subtitle: "Học 1 lần là đạt mục tiêu! Kết hợp phương pháp Nghe Chép Chính Tả (Dictation) cùng hệ thống đề thi ETS chuẩn hóa với lời giải chi tiết 100%.",
    bullets: [
      "Format đề thi ETS cập nhật mới nhất",
      "Luyện nghe chép từng câu có chấm điểm",
      "Transcript & giải thích cặn kẽ từng bẫy đề",
    ],
    ctaPrimaryText: "Luyện Đề Full Test Ngay",
    ctaPrimaryLink: "#section-fulltest",
    ctaSecondaryText: "Nghe Chép Chính Tả",
    ctaSecondaryLink: "#section-listening",
    bgGradient: "from-blue-600/10 via-blue-500/5 to-transparent",
    badgeAccent: "border-blue-500/30 text-blue-600 dark:text-blue-400",
    image: heroToeic850Img,
    topBadge: {
      icon: Award,
      title: "TOEIC 850+",
      desc: "Mục tiêu cam kết",
      color: "bg-amber-100 dark:bg-amber-950 text-amber-600",
    },
    bottomBadge: {
      icon: GraduationCap,
      title: "Lộ Trình ETS",
      desc: "Từ mất gốc lên 850+",
      color: "bg-blue-100 dark:bg-blue-950 text-blue-600",
    },
  },
  {
    id: 2,
    tag: "CÔNG NGHỆ BẮT ÂM ĐỘC QUYỀN",
    tagColor: "bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-600/20",
    title: "Phương Pháp Dictation Chép Chính Tả",
    highlight: "XÓA TAN NỖI SỢ LISTENING PART 1–4",
    subtitle: "Gõ lại từng từ bạn nghe được. Trình nghe tự động tua câu, đối chiếu câu đúng sai thời gian thực giúp tai bắt âm nhạy bén chỉ sau 14 ngày.",
    bullets: [
      "Phát hiện nuốt âm, nối âm của người bản xứ",
      "Tự động chấm điểm & hiển thị transcript tức thì",
      "Tích hợp tra từ vựng trực tiếp khi đang nghe",
    ],
    ctaPrimaryText: "Thử Luyện Nghe Dictation",
    ctaPrimaryLink: "#section-listening",
    ctaSecondaryText: "Xem Kho Khóa Học",
    ctaSecondaryLink: "#section-video",
    bgGradient: "from-purple-600/10 via-indigo-500/5 to-transparent",
    badgeAccent: "border-purple-500/30 text-purple-600 dark:text-purple-400",
    image: heroDictationImg,
    topBadge: {
      icon: Headphones,
      title: "Dictation",
      desc: "Nghe chép từng câu",
      color: "bg-purple-100 dark:bg-purple-950 text-purple-600",
    },
    bottomBadge: {
      icon: Zap,
      title: "Bắt âm chuẩn",
      desc: "Sửa lỗi nối âm",
      color: "bg-cyan-100 dark:bg-cyan-950 text-cyan-600",
    },
  },
  {
    id: 3,
    tag: "PHÒNG THI THỰC CHIẾN 200 CÂU",
    tagColor: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20",
    title: "Phòng Thi Thử Chuẩn Format Quốc Tế",
    highlight: "BẤM GIỜ THẬT - ĐIỂM SỐ CHUẨN ETS",
    subtitle: "Trải nghiệm áp lực phòng thi 120 phút đầy đủ 7 Part. Bảng quy đổi điểm số sát kỳ thi thật tại IIG, kèm phân tích câu yếu để ôn tập trọng điểm.",
    bullets: [
      "Đầy đủ 200 câu Listening & Reading",
      "Bảng quy đổi điểm chuẩn ETS 990",
      "Lưu lịch sử và theo dõi biểu đồ tiến bộ",
    ],
    ctaPrimaryText: "Vào Phòng Thi Thử Ngay",
    ctaPrimaryLink: "#section-fulltest",
    ctaSecondaryText: "Học Từ Vựng Flashcard",
    ctaSecondaryLink: "/vocab",
    bgGradient: "from-emerald-600/10 via-emerald-500/5 to-transparent",
    badgeAccent: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    image: heroStudentImg,
    topBadge: {
      icon: FileCheck2,
      title: "Full Test ETS",
      desc: "Bấm giờ 120 phút",
      color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600",
    },
    bottomBadge: {
      icon: ShieldCheck,
      title: "Chuẩn Format",
      desc: "200 câu sát đề thật",
      color: "bg-indigo-100 dark:bg-indigo-950 text-indigo-600",
    },
  },
];

export const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide every 6.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const slide = slides[currentIndex];
  const TopBadgeIcon = slide.topBadge.icon;
  const BottomBadgeIcon = slide.bottomBadge.icon;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${slide.bgGradient} transition-all duration-700 pointer-events-none`}
      />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
        <div className="grid md:grid-cols-12 gap-8 items-center">
          {/* Left Content */}
          <div className="md:col-span-7 space-y-4">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className={`text-[11px] font-black uppercase tracking-wider ${slide.tagColor}`}>
                {slide.tag}
              </span>
            </div>

            {/* Title & Highlight */}
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-tight">
                {slide.title}
              </h2>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                {slide.highlight}
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
              {slide.subtitle}
            </p>

            {/* Bullets */}
            <div className="space-y-1.5 pt-1">
              {slide.bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {slide.ctaPrimaryLink.startsWith("#") ? (
                <a
                  href={slide.ctaPrimaryLink}
                  className="btn-3d btn-3d-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20"
                >
                  <span>{slide.ctaPrimaryText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <Link
                  to={slide.ctaPrimaryLink}
                  className="btn-3d btn-3d-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20"
                >
                  <span>{slide.ctaPrimaryText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              {slide.ctaSecondaryText && (
                slide.ctaSecondaryLink?.startsWith("#") ? (
                  <a
                    href={slide.ctaSecondaryLink}
                    className="btn-3d btn-3d-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300"
                  >
                    {slide.ctaSecondaryText}
                  </a>
                ) : (
                  <Link
                    to={slide.ctaSecondaryLink || "#"}
                    className="btn-3d btn-3d-white py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300"
                  >
                    {slide.ctaSecondaryText}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Right Graphic Banner */}
          <div className="md:col-span-5 flex justify-center items-center relative">
            <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
              {/* Floating top badge */}
              <div className="absolute -top-3 -right-2 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xs border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg z-20 animate-fade-in transition-all">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${slide.topBadge.color} flex items-center justify-center shrink-0`}>
                    <TopBadgeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{slide.topBadge.title}</p>
                    <p className="text-xs font-black text-foreground">{slide.topBadge.desc}</p>
                  </div>
                </div>
              </div>

              {/* Floating bottom badge */}
              <div className="absolute -bottom-3 -left-2 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xs border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 shadow-lg z-20 animate-fade-in transition-all">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${slide.bottomBadge.color} flex items-center justify-center shrink-0`}>
                    <BottomBadgeIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{slide.bottomBadge.title}</p>
                    <p className="text-xs font-black text-foreground">{slide.bottomBadge.desc}</p>
                  </div>
                </div>
              </div>

              {/* Main Graphic Illustration with dynamic slide image */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-zinc-700/80 bg-gradient-to-tr from-slate-100 via-white to-blue-50/60 dark:from-zinc-800 dark:via-zinc-800/80 dark:to-zinc-900 p-2 shadow-md">
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.title}
                  className="w-full aspect-square object-cover rounded-2xl drop-shadow-md transition-all duration-500 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slider Controls (Prev / Next & Dots) */}
      <button
        onClick={handlePrev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-sm hover:scale-110 transition-transform z-20 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-200 flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-sm hover:scale-110 transition-transform z-20 cursor-pointer"
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
