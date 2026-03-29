import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const courses = [
  {
    id: 1,
    title: "Luyện thi TOEIC Nghe-Đọc",
    badge: "🎬 Video + Bài Thi",
    desc: "70+ bài giảng · 100+ bài thi online · 740 tài liệu",
    price: "1,600,000 đ",
    target: "Mục tiêu: 700–850+",
    color: "bg-primary/10 text-primary",
  },
  {
    id: 2,
    title: "EZ Vocab TOEIC – Từ Vựng Trọng Điểm",
    badge: "🃏 Flashcard",
    desc: "8 phần · 50+ chuyên đề · 3000+ câu hỏi",
    price: "Miễn phí khi đăng ký",
    target: "Có App iOS/Android",
    color: "bg-accent/10 text-accent-dark",
  },
  {
    id: 3,
    title: "Bổ Trợ Kỹ Năng Nghe – Điền Từ",
    badge: "🎧 Listening",
    desc: "4 phần · 32+ bài tập · 800+ câu hỏi",
    price: "800,000 đ",
    target: "Nâng cao kỹ năng nghe",
    color: "bg-warning/10 text-warning",
  },
  {
    id: 4,
    title: "Luyện Thi TOEIC Nói-Viết",
    badge: "🗣️ Speaking & Writing",
    desc: "Q1–Q11 · Bài thi online",
    price: "1,200,000 đ",
    target: "Speaking & Writing",
    color: "bg-destructive/10 text-destructive",
  },
  {
    id: 5,
    title: "Luyện Bộ Đề TOEIC New Format 2026",
    badge: "📋 Full Test",
    desc: "60+ bộ đề · 200 câu/đề · 12,000+ câu hỏi",
    price: "1,400,000 đ",
    target: "487 tài liệu đi kèm",
    color: "bg-primary/10 text-primary",
  },
];

const CourseShowcase = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Khóa học nổi bật</h2>
          <p className="text-muted-foreground">Chọn khóa học phù hợp với mục tiêu TOEIC của bạn</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c, i) => (
            <div
              key={c.id}
              className="bg-card rounded-xl border shadow-sm card-hover flex flex-col animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="p-6 flex-1 space-y-4">
                <Badge variant="secondary" className={c.color}>{c.badge}</Badge>
                <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
                <p className="text-xs text-muted-foreground">{c.target}</p>
              </div>
              <div className="px-6 pb-6 flex items-center justify-between">
                <span className="font-bold text-primary">{c.price}</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/courses/${c.id}`}>Xem chi tiết</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CourseShowcase;
