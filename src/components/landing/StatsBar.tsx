import { BookOpen, HelpCircle, Star, Trophy } from "lucide-react";

const stats = [
  { icon: BookOpen, value: "150+", label: "Bài giảng", color: "bg-[var(--duo-green)]", shadow: "shadow-[0_4px_0_var(--duo-green-dark)]", iconColor: "text-white" },
  { icon: HelpCircle, value: "500+", label: "Bộ đề TOEIC", color: "bg-[var(--duo-blue)]", shadow: "shadow-[0_4px_0_var(--duo-blue-dark)]", iconColor: "text-white" },
  { icon: Trophy, value: "2000+", label: "Từ vựng cốt lõi", color: "bg-[var(--duo-yellow)]", shadow: "shadow-[0_4px_0_var(--duo-yellow-dark)]", iconColor: "text-white" },
  { icon: Star, value: "10k+", label: "Câu hỏi luyện tập", color: "bg-[var(--duo-purple)]", shadow: "shadow-[0_4px_0_var(--duo-purple-dark)]", iconColor: "text-white" },
];

const StatsBar = () => {
  return (
    <section className="py-10 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="card-duo p-5 flex flex-col items-center text-center gap-3 hover:scale-[1.02] transition-transform">
              <div className={`w-12 h-12 rounded-xl ${s.color} ${s.shadow} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-sm font-bold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
