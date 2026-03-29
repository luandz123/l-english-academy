import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-student.png";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-light via-background to-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Chinh phục TOEIC{" "}
              <span className="text-gradient">700-850+</span>{" "}
              cùng L-English
            </h1>
            <p className="text-lg font-semibold text-primary">Learn Smart. Score High.</p>
            <p className="text-muted-foreground leading-relaxed">
              Hơn 70 bài giảng video · 100+ bài thi online · 3000+ từ vựng · 60+ bộ đề full test
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/register">Bắt đầu học ngay</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/courses">Xem khóa học</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <img src={heroImg} alt="Học viên đang học TOEIC trực tuyến" width={500} height={500} className="drop-shadow-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
