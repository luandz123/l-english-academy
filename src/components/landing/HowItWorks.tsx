import { BookOpen, Search, Trophy } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Chọn khóa học phù hợp",
    desc: "Duyệt danh mục khóa học TOEIC, từ vựng, nghe chép chính tả và chọn lộ trình phù hợp với mục tiêu của bạn.",
    color: "bg-[var(--duo-green)]",
    shadow: "shadow-[0_4px_0_var(--duo-green-dark)]",
    numBg: "bg-[var(--duo-green)]",
  },
  {
    icon: BookOpen,
    title: "Luyện tập mỗi ngày",
    desc: "Làm bài tập tương tác, nghe và chép chính tả, học từ vựng qua Flashcard theo tốc độ của riêng bạn.",
    color: "bg-[var(--duo-blue)]",
    shadow: "shadow-[0_4px_0_var(--duo-blue-dark)]",
    numBg: "bg-[var(--duo-blue)]",
  },
  {
    icon: Trophy,
    title: "Kiểm tra & tiến bộ",
    desc: "Làm đề thi thử Full Test, xem giải thích đáp án chi tiết và theo dõi tiến độ học tập của bản thân.",
    color: "bg-[var(--duo-yellow)]",
    shadow: "shadow-[0_4px_0_var(--duo-yellow-dark)]",
    numBg: "bg-[var(--duo-yellow)]",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA] dark:bg-zinc-900/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
            Cách thức hoạt động 🎯
          </h2>
          <p className="text-muted-foreground font-medium">
            3 bước đơn giản để bắt đầu hành trình học Tiếng Anh
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Dotted connector */}
          <div className="hidden md:block absolute top-[72px] left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-border" />

          {steps.map((s, i) => (
            <div
              key={i}
              className="text-center space-y-5 animate-fade-in relative"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="relative inline-block">
                <div className={`w-20 h-20 rounded-2xl ${s.color} ${s.shadow} flex items-center justify-center mx-auto`}>
                  <s.icon className="w-10 h-10 text-white" />
                </div>
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${s.numBg} flex items-center justify-center text-white text-sm font-extrabold shadow-md border-2 border-white`}>
                  {i + 1}
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-foreground">{s.title}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
