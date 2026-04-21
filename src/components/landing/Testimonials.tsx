const testimonials = [
  {
    name: "Nguyễn Thị Mai",
    score: "Tiết kiệm 2 triệu đồng",
    avatar: "👩‍🎓",
    quote: "Mình từng định mua khóa học ở trung tâm lớn với giá 3 triệu, nhưng khi học ở L-English chất lượng bài giảng y hệt mà giá chỉ bằng 1/5. Thật sự bất ngờ!",
  },
  {
    name: "Trần Minh Đức",
    score: "Chất lượng tuyệt vời",
    avatar: "👨‍💼",
    quote: "Hệ thống bài tập và đề thi online cực kỳ mượt mà. Nội dung bám sát đề thi thật, giúp mình tiết kiệm rất nhiều thời gian và tiền bạc.",
  },
  {
    name: "Lê Hoàng Anh",
    score: "Học mọi lúc mọi nơi",
    avatar: "👩‍💻",
    quote: "Kiến thức cô đọng, dễ hiểu. Giá rẻ không có nghĩa là chất lượng thấp, ngược lại mình thấy L-English đầu tư rất kỹ vào nội dung.",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Học viên nói gì?</h2>
          <p className="text-muted-foreground">Chia sẻ từ những học viên đã trải nghiệm chương trình học giá rẻ chất lượng cao</p>
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

