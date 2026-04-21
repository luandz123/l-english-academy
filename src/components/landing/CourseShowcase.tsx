import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const courseTypeMap: Record<string, string> = {
  video_quiz: "🎬 Video + Bài Thi",
  flashcard: "🃏 Flashcard",
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking & Writing",
  fulltest: "📋 Full Test",
};

const CourseShowcase = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order")
        .limit(6);
      return data || [];
    },
  });

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Khóa học nổi bật</h2>
          <p className="text-muted-foreground">Chất lượng đào tạo cam kết, lộ trình học bài bản với mức giá tốt nhất.</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((c, i) => (
              <div
                key={c.id}
                className="bg-card rounded-xl border shadow-sm card-hover flex flex-col animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="p-6 flex-1 space-y-4">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {courseTypeMap[c.course_type] || c.course_type}
                  </Badge>
                  <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.subtitle}</p>
                  <p className="text-xs text-muted-foreground">
                    Giảng viên: {c.instructor}
                  </p>
                </div>
                <div className="px-6 pb-6 flex items-center justify-between mt-auto">
                  <span className="font-bold text-primary">{formatPrice(c.price)}</span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/courses/${c.id}`}>Xem chi tiết</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link to="/courses">Xem tất cả khóa học</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CourseShowcase;

