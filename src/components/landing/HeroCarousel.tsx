import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  Sparkles,
  ArrowRight,
  Users,
} from "lucide-react";
import heroStudentImg from "@/assets/hero-student-new.webp";
import iconFulltest from "@/assets/icons/icon-fulltest-3d.webp";
import iconDictation from "@/assets/icons/icon-dictation-3d.webp";
import iconFlame from "@/assets/icons/icon-flame-3d.webp";
import iconArcade from "@/assets/icons/icon-arcade-3d.webp";
import iconTrophy from "@/assets/icons/icon-trophy-3d.webp";
import iconEtsSeal from "@/assets/icons/icon-ets-seal-3d.webp";

export const HeroCarousel = () => {
  return (
    <div className="relative w-full">
      {/* ========================================================================= */}
      {/* HERO BANNER HOÀNH TRÁNG PHONG CÁCH IIG X NEON GAMING EDTECH               */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1e3d] via-[#071329] to-[#040914] p-6 sm:p-8 md:p-12 lg:p-14 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.15)] group">
        {/* Glow Ambient Blobs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* CỘT TRÁI: TEXT & CTA (7 Cột) */}
          <div className="lg:col-span-7 space-y-5 text-left">
            {/* Tag thương hiệu chính thức */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wide font-sans">
                L-English Hệ thống học và luyện thi toeic tốt nhất 2026
              </span>
            </div>

            {/* Headline lớn - dứt khoát, chuẩn thực tế web */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black leading-tight tracking-tight text-white font-display">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                L-English
              </span>{" "}
              — Luyện Thi TOEIC — Thi Thử — Game Từ Vựng — Nghe Chép Chính Tả — Luyện Nghe Từng Bước — Luyện Nói 1-1
            </h1>

            {/* Mô tả súc tích (Không dài dòng) */}
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-xl">
              Nền tảng tự học TOEIC thông minh kết hợp chuẩn đề ETS 120 phút, phương pháp phản xạ bắt âm 8 bước và đấu trường minigames từ vựng hấp dẫn.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <img src={iconFulltest} alt="" className="w-5 h-5 object-contain shrink-0 drop-shadow-sm" />
                <span className="truncate">Format ETS 2026</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <img src={iconDictation} alt="" className="w-5 h-5 object-contain shrink-0 drop-shadow-sm" />
                <span className="truncate">Dictation 8 Bước</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <img src={iconArcade} alt="" className="w-5 h-5 object-contain shrink-0 drop-shadow-sm" />
                <span className="truncate">Game Arcade</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
                <Users className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="truncate">Kèm 1-1 Zalo</span>
              </div>
            </div>

            {/* Cặp Nút Hành Động (CTA) - Chuẩn Von Restorff & Tỷ lệ đệm công thái học */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {/* Primary CTA độc bản: Bắt đầu thi thử ngay */}
              <a
                href="#section-fulltest"
                onClick={() => trackEvent("hero_click_fulltest", { location: "hero_cta" })}
                className="py-3.5 px-7 sm:px-8 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:brightness-110 shadow-[0_0_25px_rgba(6,182,212,0.55)] hover:shadow-[0_0_35px_rgba(6,182,212,0.85)] transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.97] flex items-center gap-2 cursor-pointer select-none"
              >
                <span>Bắt đầu thi thử ngay</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-950">
                  Miễn phí
                </span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </a>

              {/* Secondary CTA: Ghost Outline Button thanh thoát, không tranh spotlight */}
              <a
                href="#combos"
                onClick={() => trackEvent("hero_click_combos", { location: "hero_cta" })}
                className="py-3.5 px-6 sm:px-7 rounded-2xl font-bold text-xs sm:text-sm text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 backdrop-blur-md transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.97] flex items-center gap-2 cursor-pointer select-none"
              >
                <img src={iconFlame} alt="" className="w-4 h-4 object-contain inline-block" />
                <span>Xem gói VIP & Lộ trình</span>
              </a>
            </div>
          </div>

          {/* CỘT PHẢI: HÌNH ẢNH NGƯỜI THẬT CHUYÊN NGHIỆP PHONG CÁCH IIG X NEON AURA (5 Cột) */}
          <div className="lg:col-span-5 relative flex items-center justify-center pt-4 lg:pt-0">
            {/* Multi-layered Neon Aura Glow */}
            <div className="absolute inset-0 max-w-[420px] max-h-[420px] mx-auto rounded-full bg-gradient-to-tr from-cyan-500/30 via-blue-600/35 to-purple-600/25 blur-3xl scale-95 pointer-events-none" />

            {/* Khung viền ảnh bo góc lớn chuẩn IIG */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] rounded-3xl overflow-hidden border-2 border-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.3)] bg-gradient-to-b from-blue-900/30 to-[#071329]">
              <img
                src={heroStudentImg}
                alt="Học viên TOEIC đạt 850+ tại L-English"
                className="w-full h-auto object-cover object-center transition-transform duration-500 hover:scale-105"
                loading="eager"
              />

              {/* Gradient che chân ảnh */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#040914] via-[#040914]/70 to-transparent pointer-events-none" />
            </div>

            {/* Floating Badge 1: Top-Left - Mục Tiêu 850+ */}
            <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 bg-[#0a162b]/90 border border-amber-400/50 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center gap-2.5 animate-float pointer-events-none">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <img src={iconTrophy} alt="" className="w-7 h-7 object-contain drop-shadow" />
              </div>
              <div className="text-left pr-1">
                <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Mục tiêu</div>
                <div className="text-xs sm:text-sm font-black text-white font-tech">TOEIC 850+</div>
              </div>
            </div>

            {/* Floating Badge 2: Bottom-Right - Streak Gamification */}
            <div className="absolute -bottom-3 -right-2 sm:-bottom-4 sm:-right-3 bg-[#0a162b]/90 border border-cyan-400/50 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-md flex items-center gap-2.5 animate-float-delayed pointer-events-none">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/20 flex items-center justify-center">
                <img src={iconFlame} alt="" className="w-7 h-7 object-contain drop-shadow" />
              </div>
              <div className="text-left pr-1">
                <div className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">Chuỗi ngày học</div>
                <div className="text-xs sm:text-sm font-black text-white font-tech">🔥 15 Ngày Streak</div>
              </div>
            </div>

            {/* Floating Badge 3: Bottom-Left - Chuẩn ETS */}
            <div className="absolute bottom-8 -left-4 sm:bottom-10 sm:-left-6 hidden sm:flex bg-[#0a162b]/90 border border-emerald-400/50 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md items-center gap-2.5 pointer-events-none">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                <img src={iconEtsSeal} alt="" className="w-6 h-6 object-contain drop-shadow" />
              </div>
              <span className="text-xs font-black text-emerald-300 font-tech">Chuẩn ETS 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroCarousel;
