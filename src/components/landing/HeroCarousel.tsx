import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  getHomepageShowcaseConfig,
  type HeroBackground,
  type HomepageShowcaseConfig,
} from "@/services/homepageShowcaseService";
import { ArrowRight, BadgeCheck, FileCheck2, Headphones, Sparkles, Trophy } from "lucide-react";
import teacherImg from "@/assets/hero-teacher.webp";
import zaloQrImg from "@/assets/zalo-qr.png";

/** Số giả ngẫu nhiên cố định (cùng kết quả mỗi lần render → không nhảy layout). */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Dải rừng thông: các tam giác chồng nhau trên một đường chân. */
function pineForest(width: number, baseY: number, count: number, minH: number, maxH: number, seed: number) {
  const rand = seeded(seed);
  let d = `M0 ${baseY + 40} L0 ${baseY}`;
  const step = width / count;
  for (let i = 0; i < count; i++) {
    const x = i * step + rand() * step * 0.4;
    const h = minH + rand() * (maxH - minH);
    const w = h * (0.32 + rand() * 0.1);
    // 3 tầng tán lá
    d += ` L${x - w / 2} ${baseY} L${x - w / 4} ${baseY - h * 0.45} L${x - w / 2.6} ${baseY - h * 0.45}`;
    d += ` L${x - w / 6} ${baseY - h * 0.78} L${x - w / 4.2} ${baseY - h * 0.78} L${x} ${baseY - h}`;
    d += ` L${x + w / 4.2} ${baseY - h * 0.78} L${x + w / 6} ${baseY - h * 0.78} L${x + w / 2.6} ${baseY - h * 0.45}`;
    d += ` L${x + w / 4} ${baseY - h * 0.45} L${x + w / 2} ${baseY}`;
  }
  d += ` L${width} ${baseY} L${width} ${baseY + 40} Z`;
  return d;
}

const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.pushState(null, "", `#${id}`);
};

const FEATURES = [
  { tag: "THI THỬ", text: "Chuẩn đề ETS 120 phút, chấm điểm tự động", href: "#section-fulltest", id: "section-fulltest" },
  { tag: "TỪ VỰNG", text: "Phương pháp phản xạ âm 8 bước & Minigames", to: "/games" },
  { tag: "NGHE NÓI", text: "Nghe chép chính tả & Luyện nghe từng bước", href: "#section-listening", id: "section-listening" },
] as const;

/** Nền động dựng sẵn: bầu trời đêm (sao băng, sao lấp lánh), núi, rừng thông, sương trôi. */
const NightSkyBackground = () => {
  const stars = useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: 70 }, () => ({
      left: rand() * 100,
      top: rand() * 62,
      size: rand() < 0.15 ? 3 : rand() < 0.5 ? 2 : 1.5,
      dur: 2 + rand() * 4,
      delay: rand() * 5,
    }));
  }, []);

  const meteors = useMemo(() => {
    const rand = seeded(42);
    return Array.from({ length: 12 }, (_, i) => ({
      left: -10 + rand() * 85,
      top: -15 + rand() * 45,
      len: 80 + rand() * 120,
      dur: 5 + rand() * 5,
      delay: i * 0.9 + rand() * 2,
    }));
  }, []);

  const forestFar = useMemo(() => pineForest(1200, 250, 70, 40, 85, 3), []);
  const forestNear = useMemo(() => pineForest(1200, 285, 46, 70, 140, 11), []);

  return (
    <div className="absolute inset-0">
      {/* Bầu trời */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060b1f] via-[#121a45] to-[#1d1f4f]" />
      <div className="absolute left-1/2 bottom-[18%] -translate-x-1/2 w-[120%] h-[55%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.22),rgba(129,140,248,0.12)_45%,transparent_70%)]" />

      {/* Sao lấp lánh */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="hero-star absolute rounded-full bg-indigo-100"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            boxShadow: s.size >= 3 ? "0 0 6px 1px rgba(199,210,254,0.8)" : undefined,
            ["--dur" as string]: `${s.dur}s`,
            ["--delay" as string]: `${s.delay}s`,
          }}
        />
      ))}

      {/* Sao băng */}
      {meteors.map((m, i) => (
        <span
          key={i}
          className="hero-shooting-star"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            ["--len" as string]: `${m.len}px`,
            ["--dur" as string]: `${m.dur}s`,
            ["--delay" as string]: `${m.delay}s`,
          }}
        />
      ))}

      {/* Núi và rừng thông */}
      <svg className="absolute bottom-0 left-0 w-full h-[46%] sm:h-[52%]" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hero-mtn-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b5fc7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#252b6e" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="hero-mtn-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f2a63" />
            <stop offset="100%" stopColor="#111842" />
          </linearGradient>
        </defs>
        <path
          d="M0 210 L120 150 L210 185 L330 95 L420 150 L520 120 L640 40 L760 140 L860 110 L980 170 L1080 120 L1200 160 L1200 300 L0 300 Z"
          fill="url(#hero-mtn-far)"
        />
        <path
          d="M0 240 L140 200 L260 225 L380 175 L520 220 L650 185 L780 230 L900 195 L1040 228 L1200 200 L1200 300 L0 300 Z"
          fill="url(#hero-mtn-mid)"
        />
        <path d={forestFar} fill="#0b1233" />
        <path d={forestNear} fill="#050914" />
      </svg>

      {/* Sương trôi */}
      <div className="hero-fog absolute -left-[10%] bottom-[10%] w-[120%] h-24 bg-[radial-gradient(ellipse_at_center,rgba(148,163,255,0.18),transparent_70%)] blur-2xl" />
    </div>
  );
};

/** Một lớp nền theo cấu hình admin. */
const BackgroundLayer = ({ bg, active }: { bg: HeroBackground; active: boolean }) => (
  <div
    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${active ? "opacity-100" : "opacity-0"}`}
    aria-hidden="true"
  >
    {bg.type === "night_sky" ? (
      <NightSkyBackground />
    ) : bg.type === "video" ? (
      <video className="absolute inset-0 w-full h-full object-cover" src={bg.url} autoPlay muted loop playsInline preload="metadata" />
    ) : (
      <img className="absolute inset-0 w-full h-full object-cover" src={bg.url} alt="" loading={active ? "eager" : "lazy"} draggable={false} />
    )}
    {bg.dim > 0 && <div className="absolute inset-0 bg-[#050914]" style={{ opacity: bg.dim / 100 }} />}
  </div>
);

/**
 * Banner trang chủ: bầu trời đêm động (sao băng, sao lấp lánh, núi và rừng thông, sương trôi)
 * với nội dung thật đặt lên trên — thay tấm ảnh có chữ vẽ sẵn (chữ đọc được trên điện thoại, nút bấm được).
 */
export const HeroCarousel = () => {
  const { data: config = DEFAULT_HOMEPAGE_CONFIG } = useQuery<HomepageShowcaseConfig>({
    queryKey: ["homepage-showcase-config"],
    queryFn: () => getHomepageShowcaseConfig(),
  });
  const backgrounds = useMemo(() => {
    const enabled = (config.hero_banner ?? DEFAULT_HOMEPAGE_CONFIG.hero_banner).backgrounds.filter((b) => b.enabled);
    return enabled.length > 0 ? enabled : DEFAULT_HOMEPAGE_CONFIG.hero_banner.backgrounds;
  }, [config.hero_banner]);
  const intervalMs = (config.hero_banner?.interval_seconds ?? 8) * 1000;

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (activeIndex >= backgrounds.length) setActiveIndex(0);
  }, [activeIndex, backgrounds.length]);
  // Tự chuyển nền (dừng khi rê chuột, khi tab ẩn, hoặc máy bật giảm chuyển động)
  useEffect(() => {
    if (backgrounds.length < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setActiveIndex((i) => (i + 1) % backgrounds.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [backgrounds.length, intervalMs, paused]);

  return (
    <section
      aria-labelledby="hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-[#050914] shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(6,182,212,0.18)] isolate"
    >
      {/* ---------- NỀN (admin cấu hình, tự chuyển) ---------- */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 pointer-events-none">
        {backgrounds.map((bg, i) => (
          <BackgroundLayer key={bg.id} bg={bg} active={i === activeIndex} />
        ))}
        {/* Lớp tối dưới chữ để luôn dễ đọc */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/85 via-[#050914]/45 to-transparent" />
      </div>

      {/* ---------- NỘI DUNG ---------- */}
      <div className="relative grid lg:grid-cols-12 gap-8 lg:gap-6 items-center px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14 min-h-[520px] lg:min-h-[560px]">
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 text-xs sm:text-sm font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            Hệ thống luyện thi TOEIC
          </span>

          <h1 id="hero-title" className="font-display font-black tracking-tight leading-[1.05]">
            <span className="block text-3xl sm:text-5xl text-white">L-ENGLISH</span>
            <span className="block mt-1 text-3xl sm:text-5xl lg:text-[3.1rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              LUYỆN THI TOEIC – <span className="whitespace-nowrap">THI THỬ</span>
            </span>
          </h1>
          <p className="text-base sm:text-xl text-slate-200 font-medium">
            Game Từ Vựng – Nghe Chép Chính Tả – Luyện Nói 1-1
          </p>

          <ul className="space-y-2.5 max-w-xl">
            {FEATURES.map((f) => {
              const inner = (
                <>
                  <span className="shrink-0 w-28 sm:w-32 py-2 rounded-xl bg-gradient-to-b from-sky-500/40 to-cyan-700/40 border border-cyan-300/40 text-center text-sm sm:text-base font-black text-white tracking-wide">
                    {f.tag}
                  </span>
                  <span className="text-sm sm:text-base text-slate-200 group-hover:text-white transition-colors">{f.text}</span>
                </>
              );
              const cls =
                "group flex items-center gap-3 sm:gap-4 p-1.5 pr-3 rounded-2xl bg-[#0b1430]/70 border border-cyan-500/20 hover:border-cyan-400/50 backdrop-blur-sm transition-colors";
              return (
                <li key={f.tag}>
                  {"to" in f ? (
                    <Link to={f.to} className={cls}>{inner}</Link>
                  ) : (
                    <a href={f.href} onClick={(e) => scrollToSection(e, f.id)} className={cls}>{inner}</a>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href="#section-fulltest"
              onClick={(e) => scrollToSection(e, "section-fulltest")}
              className="inline-flex items-center justify-center gap-2 h-12 sm:h-14 px-7 rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-black text-sm sm:text-base uppercase tracking-wide shadow-[0_0_28px_rgba(34,211,238,0.55)] transition-all active:scale-[0.98]"
            >
              Bắt đầu thi thử ngay
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#section-video"
              onClick={(e) => scrollToSection(e, "section-video")}
              className="inline-flex items-center justify-center h-12 sm:h-14 px-6 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-bold text-sm sm:text-base backdrop-blur-sm transition-colors"
            >
              Xem khóa học & Lộ trình
            </a>
          </div>
        </div>

        {/* Chân dung + thông tin tư vấn */}
        <div className="lg:col-span-5 relative flex flex-col items-center gap-5">
          <div className="relative w-40 h-40 sm:w-72 sm:h-72">
            <span aria-hidden="true" className="hero-ring absolute inset-0 rounded-full border-2 border-cyan-300/60" />
            <span aria-hidden="true" className="hero-ring absolute inset-0 rounded-full border-2 border-cyan-300/60" style={{ animationDelay: "1.6s" }} />
            <div className="absolute inset-0 rounded-full p-1.5 bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-500 shadow-[0_0_45px_rgba(34,211,238,0.45)]">
              <img
                src={teacherImg}
                alt="Thầy Luận – giảng viên L-English"
                className="w-full h-full rounded-full object-cover bg-[#0b1430]"
                loading="eager"
                fetchPriority="high"
                draggable={false}
              />
            </div>
            <div className="hero-float absolute -right-4 sm:-right-10 top-4 hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#0b1430]/90 border border-cyan-400/30 backdrop-blur-md shadow-lg">
              <Trophy className="w-5 h-5 text-amber-300" />
              <span className="text-xs font-bold text-white leading-tight">Mục tiêu<br />TOEIC 850+</span>
            </div>
            <div className="hero-float absolute -left-4 sm:-left-10 bottom-8 hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#0b1430]/90 border border-cyan-400/30 backdrop-blur-md shadow-lg" style={{ animationDelay: "2.5s" }}>
              <BadgeCheck className="w-5 h-5 text-emerald-300" />
              <span className="text-xs font-bold text-white leading-tight">Chuẩn ETS<br />100%</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:hidden">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b1430]/80 border border-cyan-400/30 text-xs font-bold text-white">
              <Trophy className="w-4 h-4 text-amber-300" /> TOEIC 850+
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b1430]/80 border border-cyan-400/30 text-xs font-bold text-white">
              <FileCheck2 className="w-4 h-4 text-emerald-300" /> Chuẩn ETS
            </span>
          </div>

          <a
            href="https://zalo.me/0334729066"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-3 pr-5 rounded-2xl bg-[#0b1430]/85 border border-cyan-400/30 hover:border-cyan-300/60 backdrop-blur-md transition-colors"
          >
            <img src={zaloQrImg} alt="Mã QR Zalo 0334 729 066" className="w-16 h-16 rounded-lg bg-white p-1" />
            <span className="text-left">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <Headphones className="w-3.5 h-3.5 text-cyan-300" /> Hotline tư vấn (Zalo)
              </span>
              <span className="block text-xl sm:text-2xl font-black text-white tracking-wide tabular-nums">0334 729 066</span>
            </span>
          </a>
        </div>
      </div>

      {/* Chấm chọn nền */}
      {backgrounds.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {backgrounds.map((bg, i) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Hiện nền ${i + 1}${bg.label ? `: ${bg.label}` : ""}`}
              aria-current={i === activeIndex}
              className="w-8 h-8 flex items-center justify-center"
            >
              <span className={`block h-1.5 rounded-full transition-all ${i === activeIndex ? "w-6 bg-cyan-300" : "w-1.5 bg-white/40 hover:bg-white/70"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroCarousel;
