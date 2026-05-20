import { BookOpen, Headphones, FlipHorizontal, FileText } from "lucide-react";

// Chỉ giới thiệu các tính năng THẬT có trên hệ thống, không dùng số liệu tự bịa
const features = [
  {
    icon: FileText,
    label: "Đề thi thử Full Test",
    desc: "TOEIC 7 Part có sẵn trên hệ thống",
    color: "bg-[var(--duo-green)]",
    shadow: "shadow-[0_4px_0_var(--duo-green-dark)]",
  },
  {
    icon: Headphones,
    label: "Nghe chép chính tả",
    desc: "Dictation Part 1–4 với chấm điểm tự động",
    color: "bg-[var(--duo-blue)]",
    shadow: "shadow-[0_4px_0_var(--duo-blue-dark)]",
  },
  {
    icon: FlipHorizontal,
    label: "Flashcard từ vựng",
    desc: "Học & ôn từ vựng theo chủ đề",
    color: "bg-[var(--duo-yellow)]",
    shadow: "shadow-[0_4px_0_var(--duo-yellow-dark)]",
  },
  {
    icon: BookOpen,
    label: "Bài giảng + Bài tập",
    desc: "Video bài học và bài tập trắc nghiệm",
    color: "bg-[var(--duo-purple)]",
    shadow: "shadow-[0_4px_0_var(--duo-purple-dark)]",
  },
];

const StatsBar = () => {
  return (
    <section className="py-10 bg-[#FAFAFA] dark:bg-zinc-900/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((f) => (
            <div key={f.label} className="card-duo p-5 flex flex-col items-center text-center gap-3 hover:scale-[1.02] transition-transform">
              <div className={`w-12 h-12 rounded-xl ${f.color} ${f.shadow} flex items-center justify-center`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-extrabold text-foreground leading-snug">{f.label}</p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
