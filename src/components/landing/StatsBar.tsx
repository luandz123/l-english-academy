import { Users, BookOpen, HelpCircle, Star } from "lucide-react";

const stats = [
  { icon: Users, value: "10,000+", label: "Học viên" },
  { icon: BookOpen, value: "5", label: "Khóa học" },
  { icon: HelpCircle, value: "12,000+", label: "Câu hỏi" },
  { icon: Star, value: "4.9★", label: "Đánh giá" },
];

const StatsBar = () => {
  return (
    <section className="bg-primary py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center gap-2">
              <s.icon className="w-7 h-7 text-primary-foreground/80" />
              <p className="text-2xl md:text-3xl font-bold text-primary-foreground">{s.value}</p>
              <p className="text-sm text-primary-foreground/80">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
