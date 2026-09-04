import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarNav from "@/components/landing/SidebarNav";
import Navbar from "@/components/landing/Navbar";
import HeroCarousel from "@/components/landing/HeroCarousel";
import CourseShowcase from "@/components/landing/CourseShowcase";
import Footer from "@/components/landing/Footer";
import ZaloContactWidget from "@/components/landing/ZaloContactWidget";

const Index = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("access_token=")) {
      navigate("/auth/callback" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex bg-slate-50/60 dark:bg-zinc-950 text-foreground">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
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
