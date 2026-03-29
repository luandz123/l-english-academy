import StudentLayout from "@/components/StudentLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const courses = [
  {
    id: 1,
    title: "Luyện thi TOEIC Nghe-Đọc",
    badge: "🎬 Video + Bài Thi",
    desc: "70+ bài giảng · 100+ bài thi online · 740 tài liệu",
    target: "Mục tiêu: 700–850+",
    price: "1,600,000 đ",
    duration: "6 tháng",
    enrolled: true,
    progress: 45,
  },
  {
    id: 2,
    title: "EZ Vocab TOEIC – Từ Vựng Trọng Điểm",
    badge: "🃏 Flashcard",
    desc: "8 phần · 50+ chuyên đề · 3000+ câu hỏi",
    target: "Có App iOS/Android",
    price: "Miễn phí khi đăng ký",
    duration: "Vĩnh viễn",
    enrolled: true,
    progress: 30,
  },
  {
    id: 3,
    title: "Bổ Trợ Kỹ Năng Nghe – Điền Từ",
    badge: "🎧 Listening",
    desc: "4 phần · 32+ bài tập · 800+ câu hỏi",
    target: "Nâng cao kỹ năng nghe",
    price: "800,000 đ",
    duration: "6 tháng",
    enrolled: true,
    progress: 10,
  },
  {
    id: 4,
    title: "Luyện Thi TOEIC Nói-Viết",
    badge: "🗣️ Speaking & Writing",
    desc: "Q1–Q11 · Bài thi online",
    target: "Speaking & Writing",
    price: "1,200,000 đ",
    duration: "6 tháng",
    enrolled: false,
    progress: 0,
  },
  {
    id: 5,
    title: "Luyện Bộ Đề TOEIC New Format 2026",
    badge: "📋 Full Test",
    desc: "60+ bộ đề · 200 câu/đề · 12,000+ câu hỏi",
    target: "487 tài liệu đi kèm",
    price: "1,400,000 đ",
    duration: "12 tháng",
    enrolled: true,
    progress: 15,
  },
];

const Courses = () => {
  return (
    <StudentLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Khóa học</h1>
          <p className="text-sm text-muted-foreground mt-1">Danh sách tất cả khóa học trên L-English</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border shadow-sm card-hover flex flex-col">
              <div className="p-5 flex-1 space-y-3">
                <Badge variant="secondary">{c.badge}</Badge>
                <h3 className="font-bold text-foreground">{c.title}</h3>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
                <p className="text-xs text-muted-foreground">{c.target} · Thời hạn: {c.duration}</p>
                {c.enrolled && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{c.progress}% hoàn thành</span>
                    </div>
                    <Progress value={c.progress} className="h-1.5" />
                  </div>
                )}
              </div>
              <div className="px-5 pb-5 flex items-center justify-between">
                <span className="font-bold text-sm text-primary">{c.price}</span>
                <Button size="sm" asChild>
                  <Link to={`/courses/${c.id}`}>{c.enrolled ? "Tiếp tục" : "Xem chi tiết"}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
};

export default Courses;
