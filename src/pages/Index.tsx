import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ActivityTicker from "@/components/landing/ActivityTicker";
import StatsBar from "@/components/landing/StatsBar";
import CourseShowcase from "@/components/landing/CourseShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import PromoBanner from "@/components/landing/PromoBanner";
import Testimonials from "@/components/landing/Testimonials";
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
        {/* 1. Hero - Điểm đầu tiên người dùng thấy */}
        <HeroSection />

        {/* 2. Activity Ticker - Social proof real-time ngay sau hero */}
        <ActivityTicker />

        {/* 3. StatsBar - 4 tính năng chính, ngắn gọn */}
        <StatsBar />

        {/* 4. CourseShowcase - Kho khóa học từ DB thật */}
        <CourseShowcase />

        {/* 5. HowItWorks - 3 bước đơn giản */}
        <HowItWorks />

        {/* 6. Testimonials - Học viên nói gì */}
        <Testimonials />

        {/* 7. PromoBanner - Features nổi bật + CTA cuối */}
        <PromoBanner />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
