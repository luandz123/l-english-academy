import { Link } from "react-router-dom";
import {
  Headphones,
  Cards,
  FileMagnifyingGlass,
  Trophy,
  Sparkle,
  GraduationCap,
} from "@phosphor-icons/react";

const realFeatures = [
  {
    Icon: Headphones,
    gradient: "from-[var(--duo-green)] to-[var(--duo-orange)]",
    glow: "shadow-[var(--duo-green)]/30",
    border: "border-[var(--duo-green)]/15 dark:border-[var(--duo-green)]/20",
    title: "Nghe chép chính tả (Dictation)",
    desc: "Luyện nghe Part 1–4 với chấm điểm tự động từng từ khóa.",
    tag: "🎧 Dictation",
    tagColor: "bg-[var(--primary-light)] text-[var(--duo-green-dark)]",
  },
  {
    Icon: Cards,
    gradient: "from-[var(--duo-green-light)] to-[var(--duo-orange)]",
    glow: "shadow-[var(--duo-orange)]/25",
    border: "border-[var(--duo-orange)]/15 dark:border-[var(--duo-orange)]/20",
    title: "Flashcard từ vựng thông minh",
    desc: "Học & ôn từ vựng theo chủ đề TOEIC với hệ thống lật thẻ.",
    tag: "🃏 Flashcard",
    tagColor: "bg-orange-50 text-[var(--accent-dark)]",
  },
  {
    Icon: FileMagnifyingGlass,
    gradient: "from-[var(--duo-blue)] to-[var(--duo-green)]",
    glow: "shadow-[var(--duo-blue)]/25",
    border: "border-[var(--duo-blue)]/15 dark:border-[var(--duo-blue)]/20",
    title: "Đề thi thử Full Test TOEIC",
    desc: "Làm đề 7 Part đầy đủ, giải thích đáp án chi tiết sau bài.",
    tag: "📋 Full Test",
    tagColor: "bg-slate-100 text-[var(--duo-blue-dark)]",
  },
];

const PromoBanner = () => {
  return (
    <section className="py-14 bg-white dark:bg-zinc-950 border-t border-[var(--duo-gray)] dark:border-zinc-800 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[var(--duo-green)]/10 blur-3xl pointer-events-none opacity-60" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-[var(--duo-orange)]/10 blur-3xl pointer-events-none opacity-60" />

      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--duo-green)]/10 to-[var(--duo-orange)]/10 border border-[var(--duo-green)]/20 rounded-full px-4 py-1.5 text-sm font-black text-[var(--duo-green-dark)] mb-4">
            <Sparkle size={14} weight="fill" />
            TÍNH NĂNG NỔI BẬT
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            Một nền tảng —{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--duo-green)] to-[var(--duo-orange)]">
              Toàn bộ công cụ học
            </span>
          </h2>
          <p className="text-muted-foreground font-semibold mt-3 text-sm md:text-base max-w-xl mx-auto">
            Không cần đăng ký nhiều nơi. Dictation, Flashcard, Full Test — tất cả tích hợp trong một nền tảng tiện lợi &amp; hiệu quả.
          </p>
        </div>

        {/* Feature cards — 3 columns */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {realFeatures.map((f) => (
            <div
              key={f.title}
              className={`relative bg-white dark:bg-zinc-900 rounded-2xl border-2 ${f.border} p-5 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg`}
            >
              {/* Tag */}
              <span className={`self-start text-xs font-black px-2.5 py-1 rounded-full ${f.tagColor}`}>
                {f.tag}
              </span>

              {/* Icon — gradient box with glow */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg ${f.glow}`}
              >
                <f.Icon size={30} weight="duotone" color="white" />
              </div>

              <div>
                <h4 className="font-extrabold text-foreground text-base leading-snug">{f.title}</h4>
                <p className="text-sm text-muted-foreground font-medium mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div className="rounded-3xl bg-gradient-to-r from-[var(--duo-green)]/5 via-[var(--duo-orange)]/5 to-[var(--duo-blue)]/5 border-2 border-[var(--duo-gray)] dark:border-zinc-800 p-6 flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--duo-green)] to-[var(--duo-orange)] flex items-center justify-center shadow-lg shadow-[var(--duo-green)]/25 shrink-0">
              <GraduationCap size={26} weight="duotone" color="white" />
            </div>
            <div>
              <p className="font-black text-foreground text-lg">Sẵn sàng bắt đầu?</p>
              <p className="text-sm text-muted-foreground font-medium">Đăng ký miễn phí — không cần thẻ tín dụng</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/register" className="btn-3d btn-3d-green text-sm px-6 py-3 inline-block whitespace-nowrap">
              Đăng ký ngay 🚀
            </Link>
            <Link to="/courses" className="btn-3d btn-3d-white text-sm px-6 py-3 inline-block whitespace-nowrap">
              Xem khóa học
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
