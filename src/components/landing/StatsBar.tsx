import { BookOpen, Headphones, FlipHorizontal, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: FileText,
    label: "Đề thi thử Full Test",
    desc: "Làm đề TOEIC 7 Part bấm giờ thật 120 phút",
    color: "bg-[var(--duo-green)]",
    shadow: "shadow-[0_4px_0_var(--duo-green-dark)]",
    link: "/courses?filter=fulltest",
  },
  {
    icon: Headphones,
    label: "Nghe chép chính tả",
    desc: "Dictation Part 1–4 chấm điểm & tua câu",
    color: "bg-[var(--duo-blue)]",
    shadow: "shadow-[0_4px_0_var(--duo-blue-dark)]",
    link: "/courses?filter=listening",
  },
  {
    icon: FlipHorizontal,
    label: "Flashcard từ vựng",
    desc: "Lật thẻ, nghe phát âm và ghi nhớ sâu",
    color: "bg-[var(--duo-yellow)]",
    shadow: "shadow-[0_4px_0_var(--duo-yellow-dark)]",
    link: "/courses?filter=flashcard",
  },
  {
    icon: BookOpen,
    label: "Bài giảng & Quiz",
    desc: "Video bài học kèm bài tập trắc nghiệm",
    color: "bg-[var(--duo-purple)]",
    shadow: "shadow-[0_4px_0_var(--duo-purple-dark)]",
    link: "/courses",
  },
];

const StatsBar = () => {
  return (
    <section className="py-10 bg-[#FAFAFA] dark:bg-zinc-900/50 border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {features.map((f) => (
            <Link
              key={f.label}
              to={f.link}
              className="card-duo p-5 flex flex-col items-center text-center gap-2.5 hover:scale-[1.02] transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl ${f.color} ${f.shadow} flex items-center justify-center shrink-0`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm sm:text-base font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
                {f.label}
              </p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
