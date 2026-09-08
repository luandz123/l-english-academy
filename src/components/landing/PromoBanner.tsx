import { Link } from "react-router-dom";
import {
  Headphones,
  Layers,
  FileCheck2,
  Sparkles,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

const realFeatures = [
  {
    Icon: Headphones,
    gradient: "from-blue-600 to-indigo-600",
    glow: "shadow-blue-500/20",
    border: "border-blue-500/20 hover:border-blue-500/50",
    title: "Nghe chép chính tả (Dictation)",
    desc: "Luyện nghe TOEIC Part 1–4, gõ lại từng từ với hệ thống chấm điểm và tua câu thông minh.",
    tag: "Dictation",
    tagColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    link: "/#section-listening",
    cta: "Luyện nghe ngay",
  },
  {
    Icon: Layers,
    gradient: "from-amber-500 to-orange-500",
    glow: "shadow-orange-500/20",
    border: "border-orange-500/20 hover:border-orange-500/50",
    title: "Flashcard từ vựng thông minh",
    desc: "Học & ôn từ vựng theo chủ đề TOEIC với cơ chế lật thẻ, phát âm audio chuẩn và ví dụ thực tế.",
    tag: "Flashcard",
    tagColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    link: "/vocab",
    cta: "Học từ vựng ngay",
  },
  {
    Icon: FileCheck2,
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    title: "Đề thi thử Full Test TOEIC",
    desc: "Làm đề 7 Part đầy đủ bấm giờ thật, bảng quy đổi điểm chuẩn ETS và giải thích chi tiết sau khi nộp.",
    tag: "Full Test",
    tagColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    link: "/#section-fulltest",
    cta: "Thi thử ngay",
  },
];

const PromoBanner = () => {
  return (
    <section className="py-16 bg-white dark:bg-zinc-950 border-t border-border relative overflow-hidden">
      {/* Decorative subtle background gradient */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3.5 py-1 text-xs font-bold text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            PHƯƠNG PHÁP HỌC TẬP
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
            3 phương pháp cốt lõi để nâng điểm TOEIC
          </h2>
          <p className="text-muted-foreground font-medium mt-3 text-sm md:text-base max-w-xl mx-auto">
            Kết hợp luyện nghe chép chính tả, nạp từ vựng trọng tâm và thi thử 200 câu theo chuẩn format ETS.
          </p>
        </div>

        {/* Feature cards — 3 columns with explicit Link & CTA affordance */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {realFeatures.map((f) => (
            <Link
              key={f.title}
              to={f.link}
              className={`group relative bg-card rounded-2xl border ${f.border} p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${f.tagColor}`}>
                    {f.tag}
                  </span>
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md ${f.glow} text-white shrink-0`}
                  >
                    <f.Icon className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-base leading-snug group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>

              {/* Action link affordance */}
              <div className="pt-5 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary group-hover:underline">
                <span>{f.cta}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA strip */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-indigo-500/5 border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Bắt đầu luyện tập ngay hôm nay</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Tạo tài khoản học thử không mất phí, làm quen với đề thi thực tế.</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 w-full sm:w-auto">
            <Link to="/register" className="btn-3d btn-3d-green text-xs sm:text-sm px-5 py-2.5 flex-1 sm:flex-none text-center">
              Đăng ký học thử 🚀
            </Link>
            <a href="#section-video" className="btn-3d btn-3d-white text-xs sm:text-sm px-5 py-2.5 flex-1 sm:flex-none text-center">
              Xem khóa học
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
