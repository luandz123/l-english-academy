const testimonials = [
  {
    name: "Nguyễn Thị Mai",
    score: "TOEIC 845",
    avatar: "👩‍🎓",
    quote: "Nhờ L-English, mình đã đạt 845 điểm chỉ sau 3 tháng ôn tập. Bài giảng rất dễ hiểu và bài thi sát thực tế!",
  },
  {
    name: "Trần Minh Đức",
    score: "TOEIC 780",
    avatar: "👨‍💼",
    quote: "Hệ thống flashcard giúp mình nhớ từ vựng nhanh hơn gấp 3 lần. Bộ đề full test rất chất lượng!",
  },
  {
    name: "Lê Hoàng Anh",
    score: "TOEIC 900",
    avatar: "👩‍💻",
    quote: "Cô Mai Phương giảng rất tận tâm. 60+ bộ đề giúp mình tự tin vào phòng thi và đạt 900 điểm!",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Học viên nói gì?</h2>
          <p className="text-muted-foreground">Hàng nghìn học viên đã đạt mục tiêu TOEIC cùng L-English</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border p-6 space-y-4 card-hover animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{t.avatar}</span>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm font-medium text-accent">{t.score}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
