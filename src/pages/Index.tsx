import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import CourseShowcase from "@/components/landing/CourseShowcase";
import PromoBanner from "@/components/landing/PromoBanner";
import Footer from "@/components/landing/Footer";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("access_token=")) {
      navigate("/auth/callback" + window.location.hash, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950">
      <Navbar />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. StatsBar - 4 tính năng chính */}
        <StatsBar />

        {/* 3. CourseShowcase - Kho khóa học */}
        <CourseShowcase />

        {/* 4. PromoBanner - Features nổi bật + CTA cuối */}
        <PromoBanner />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
