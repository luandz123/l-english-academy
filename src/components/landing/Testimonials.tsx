const testimonials = [
  {
    name: "Nguyễn Thị Mai",
    score: "TOEIC 850+ (Tăng 300đ)",
    avatar: "👩‍🎓",
    stars: 5,
    quote: "Lộ trình học cực kỳ sát đề thi thật. Mình chỉ ôn luyện trên app 2 tháng đã tăng từ 550 lên 850. Giải thích chi tiết giúp mình hiểu sâu vấn đề.",
  },
  {
    name: "Trần Minh Đức",
    score: "TOEIC 750+ (Tiết kiệm 5tr)",
    avatar: "👨‍💼",
    stars: 5,
    quote: "Không cần đến trung tâm đắt đỏ, chỉ cần chăm chỉ luyện đề trên L-English là đủ. App mượt, đề cập nhật liên tục, thực sự quá hời cho một khóa học.",
  },
  {
    name: "Lê Hoàng Anh",
    score: "TOEIC 915+ (Xuất sắc)",
    avatar: "👩‍💻",
    stars: 5,
    quote: "Bộ từ vựng cốt lõi và phần luyện nghe cực kỳ hiệu quả. Mình thích nhất là tính năng gamification giúp việc học không còn nhàm chán.",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Học viên nói gì? 💬</h2>
          <p className="text-muted-foreground font-medium">Chia sẻ từ những học viên đã trải nghiệm chương trình học giá rẻ chất lượng cao</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="card-duo p-6 space-y-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--duo-green)]/10 flex items-center justify-center">
                  <span className="text-2xl">{t.avatar}</span>
                </div>
                <div>
                  <p className="font-extrabold text-foreground">{t.name}</p>
                  <p className="text-sm font-bold text-[var(--duo-green)]">{t.score}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <span key={si} className="text-[var(--duo-yellow)] text-lg">⭐</span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
