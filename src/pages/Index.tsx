import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "@/components/landing/SidebarNav";
import Navbar from "@/components/landing/Navbar";
import HeroCarousel from "@/components/landing/HeroCarousel";
import CourseShowcase from "@/components/landing/CourseShowcase";
import Footer from "@/components/landing/Footer";
import ZaloContactWidget from "@/components/landing/ZaloContactWidget";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    <div className="min-h-screen flex bg-[#f7fbff] dark:bg-zinc-950 text-foreground">
      {/* 1. Sticky Left Sidebar Navigation (Phong cách Ngoại Ngữ 24h) */}
      <SidebarNav
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar with Search, Badges and Auth */}
        <Navbar onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        {/* Page Content Body */}
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8 max-w-[1480px] w-full mx-auto space-y-8">
          {/* Banner Hero Carousel Trượt Lớn */}
          <HeroCarousel />

          {/* Kệ Danh Mục Khóa Học & Đăng Ký Trực Tuyến */}
          <CourseShowcase />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* 3. Floating Zalo Support Widget */}
      <ZaloContactWidget />
    </div>
  );
};

export default Index;
