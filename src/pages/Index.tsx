import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import HeroCarousel from "@/components/landing/HeroCarousel";
import CourseShowcase from "@/components/landing/CourseShowcase";
import Footer from "@/components/landing/Footer";
import ZaloContactWidget from "@/components/landing/ZaloContactWidget";

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
    <div className="min-h-screen flex flex-col bg-slate-50/60 dark:bg-zinc-950 text-foreground overflow-x-hidden">
      {/* 1. Modern Top Navigation Bar */}
      <Navbar />

      {/* 2. Main Content Canvas */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-10">
        {/* Banner Hero Carousel Trượt Lớn */}
        <HeroCarousel />

        {/* Kệ Danh Mục Khóa Học & Đăng Ký Trực Tuyến */}
        <CourseShowcase />
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Floating Zalo Support Widget */}
      <ZaloContactWidget />
    </div>
  );
};

export default Index;
