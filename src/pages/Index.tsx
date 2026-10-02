import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import HeroCarousel from "@/components/landing/HeroCarousel";
import CourseShowcase from "@/components/landing/CourseShowcase";
import Footer from "@/components/landing/Footer";
import ZaloContactWidget from "@/components/landing/ZaloContactWidget";
import { ArrowRight, CheckCircle2, Headphones, LineChart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash && location.hash.includes("access_token=")) {
      navigate("/auth/callback" + location.hash, { replace: true });
      return;
    }

    const hash = location.hash || window.location.hash;
    if (!hash || hash.includes("access_token=")) return;

    const id = hash.replace("#", "");
    let attempts = 0;
    const maxAttempts = 30; // 30 * 80ms = 2.4s polling while courses load

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    if (!tryScroll()) {
      const interval = setInterval(() => {
        attempts++;
        if (tryScroll() || attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 80);
      return () => clearInterval(interval);
    }
  }, [location.hash, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8fc] dark:bg-zinc-950 text-foreground overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-white dark:bg-zinc-950">
          <div className="pointer-events-none absolute -top-40 right-[-8rem] h-96 w-96 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-900/20" />
          <div className="pointer-events-none absolute top-24 left-[-10rem] h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-900/15" />
          <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <HeroCarousel />
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              { icon: Headphones, value: "7 Part", label: "Luyện nghe & đọc chuẩn ETS", color: "text-violet-600 bg-violet-100 dark:bg-violet-950/60" },
              { icon: LineChart, value: "24/7", label: "Theo dõi tiến độ mỗi ngày", color: "text-blue-600 bg-blue-100 dark:bg-blue-950/60" },
              { icon: CheckCircle2, value: "990", label: "Thang điểm TOEIC quy đổi", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60" },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={value} className="flex items-center gap-3 rounded-2xl px-3 py-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
                <div><p className="text-base font-extrabold leading-tight">{value}</p><p className="text-xs font-medium text-muted-foreground">{label}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600"><Sparkles className="h-4 w-4" /> Học đúng trọng tâm</div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Chọn cách bạn muốn tiến bộ</h2>
              <p className="mt-2 max-w-xl text-sm font-medium text-muted-foreground">Một nền tảng, đầy đủ công cụ để bạn luyện nghe, chinh phục đề thi và bứt phá điểm số.</p>
            </div>
            <Link to="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">Xem lộ trình cá nhân <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <CourseShowcase />
        </section>
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Floating Zalo Support Widget */}
      <ZaloContactWidget />
    </div>
  );
};

export default Index;
