import { BookOpen, Search, Trophy } from "lucide-react";

const steps = [
  { icon: Search, title: "Test trình độ", desc: "Xác định mục tiêu TOEIC và nhận lộ trình học cá nhân hóa ngay sau bài test đầu vào.", color: "bg-[var(--duo-green)]", shadow: "shadow-[0_4px_0_var(--duo-green-dark)]", numBg: "bg-[var(--duo-green)]" },
  { icon: BookOpen, title: "Luyện đề thực tế", desc: "Thực hành giải 500+ bộ đề TOEIC sát đề thật với giải thích chi tiết từng câu.", color: "bg-[var(--duo-blue)]", shadow: "shadow-[0_4px_0_var(--duo-blue-dark)]", numBg: "bg-[var(--duo-blue)]" },
  { icon: Trophy, title: "Bứt phá mục tiêu", desc: "Tự tin đi thi và đạt điểm số mơ ước với kỹ năng làm bài chuyên nghiệp.", color: "bg-[var(--duo-yellow)]", shadow: "shadow-[0_4px_0_var(--duo-yellow-dark)]", numBg: "bg-[var(--duo-yellow)]" },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Cách thức hoạt động 🎯</h2>
          <p className="text-muted-foreground font-medium">Lộ trình đơn giản để sở hữu kiến thức chất lượng với giá hời</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Dotted line connector */}
          <div className="hidden md:block absolute top-[72px] left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-[var(--duo-gray)]" />
          
          {steps.map((s, i) => (
            <div key={i} className="text-center space-y-5 animate-fade-in relative" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="relative inline-block">
                <div className={`w-20 h-20 rounded-2xl ${s.color} ${s.shadow} flex items-center justify-center mx-auto`}>
                  <s.icon className="w-10 h-10 text-white" />
                </div>
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${s.numBg} flex items-center justify-center text-white text-sm font-extrabold shadow-md border-2 border-white`}>
                  {i + 1}
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-foreground">{s.title}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
