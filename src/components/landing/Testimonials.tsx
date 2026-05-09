const testimonials = [
  {
    name: "Nguyễn Thị Mai",
    score: "Tiết kiệm 2 triệu đồng",
    avatar: "👩‍🎓",
    stars: 5,
    quote: "Mình từng định mua khóa học ở trung tâm lớn với giá 3 triệu, nhưng khi học ở L-English chất lượng bài giảng y hệt mà giá chỉ bằng 1/5. Thật sự bất ngờ!",
  },
  {
    name: "Trần Minh Đức",
    score: "Chất lượng tuyệt vời",
    avatar: "👨‍💼",
    stars: 5,
    quote: "Hệ thống bài tập và đề thi online cực kỳ mượt mà. Nội dung bám sát đề thi thật, giúp mình tiết kiệm rất nhiều thời gian và tiền bạc.",
  },
  {
    name: "Lê Hoàng Anh",
    score: "Học mọi lúc mọi nơi",
    avatar: "👩‍💻",
    stars: 5,
    quote: "Kiến thức cô đọng, dễ hiểu. Giá rẻ không có nghĩa là chất lượng thấp, ngược lại mình thấy L-English đầu tư rất kỹ vào nội dung.",
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
