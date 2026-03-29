import { BookOpen, PlayCircle, Trophy } from "lucide-react";

const steps = [
  { icon: BookOpen, title: "Đăng ký khóa học", desc: "Chọn khóa học phù hợp với trình độ và mục tiêu của bạn" },
  { icon: PlayCircle, title: "Học video + làm bài tập", desc: "Xem bài giảng, làm bài thi online và ôn từ vựng mỗi ngày" },
  { icon: Trophy, title: "Đạt mục tiêu TOEIC", desc: "Chinh phục điểm TOEIC mơ ước với phương pháp học thông minh" },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Cách thức hoạt động</h2>
          <p className="text-muted-foreground">3 bước đơn giản để bắt đầu hành trình TOEIC</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="text-center space-y-4 animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <s.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
