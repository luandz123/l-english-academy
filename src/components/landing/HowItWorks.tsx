import { BookOpen, Search, Trophy } from "lucide-react";

const steps = [
  { icon: Search, title: "Liên hệ tư vấn", desc: "Liên hệ Admin qua Zalo để được tư vấn khóa học và tạo tài khoản dùng thử miễn phí." },
  { icon: BookOpen, title: "Học tập chất lượng", desc: "Truy cập kho bài giảng video, bài tập và bộ đề thi chất lượng gốc như các trung tâm lớn." },
  { icon: Trophy, title: "Tiết kiệm & Hiệu quả", desc: "Đạt mục tiêu tiếng Anh với mức chi phí siêu rẻ nhưng chất lượng cam kết hàng đầu." },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Cách thức hoạt động</h2>
          <p className="text-muted-foreground">Lộ trình đơn giản để sở hữu kiến thức chất lượng với giá hời</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="text-center space-y-4 animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <s.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

