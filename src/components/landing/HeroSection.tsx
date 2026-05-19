import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImg from "@/assets/hero-student.png";

const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Decorative background circles */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-[var(--duo-green)]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-80 h-80 rounded-full bg-[var(--duo-blue)]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-40 w-32 h-32 rounded-full bg-[var(--duo-yellow)]/10 blur-2xl pointer-events-none" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-[#FFEBEF] border-2 border-[#FFD6DF] rounded-full px-4 py-1.5">
              <span className="text-sm font-bold text-[var(--duo-green-dark)]">🚀 Hệ thống luyện TOEIC Gamification đầu tiên</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Chinh phục <span className="text-[var(--duo-green)]">TOEIC 990</span> <br/> 
              Theo Cách <span className="text-gradient">Vui Nhất!</span>
            </h1>
            <p className="text-lg font-bold text-[var(--duo-blue)]">Học hiệu quả hơn 3 lần với phương pháp của Duolingo.</p>
            <p className="text-muted-foreground leading-relaxed font-medium">
              Sở hữu kho đề thi TOEIC đồ sộ nhất Việt Nam với hơn 500+ bộ đề sát thực tế, 2000+ từ vựng cốt lõi và bài giảng giải thích chi tiết 100%. Tiết kiệm 90% chi phí học tập.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link to={user ? "/courses" : "/login"} className="btn-3d btn-3d-green text-base px-8 py-3.5 inline-block">
                Bắt đầu học ngay 🚀
              </Link>
              <Link to="/courses" className="btn-3d btn-3d-white text-base px-8 py-3.5 inline-block">
                Xem khóa học
              </Link>
            </div>
          </div>
          <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <img src={heroImg} alt="Học viên đang học trực tuyến" width={500} height={500} className="drop-shadow-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
