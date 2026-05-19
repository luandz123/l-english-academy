import { Button } from "@/components/ui/button";
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
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Luyện Thi TOEIC 🏆</h2>
          <p className="text-muted-foreground font-medium">Lộ trình bài bản từ 0 - 990+, cam kết chất lượng đầu ra với chi phí tốt nhất.</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses?.map((c, i) => (
              <div
                key={c.id}
                className="card-duo flex flex-col animate-fade-in h-full"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="aspect-video w-full bg-muted relative overflow-hidden rounded-t-[14px]">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs bg-gradient-to-br from-[var(--duo-green)]/10 to-[var(--duo-blue)]/10">
                       L-ENGLISH
                    </div>
                  )}
                  {((c as any).is_free || !c.price || c.price === 0) && (
                    <div className="absolute top-3 right-3">
                      <span className="badge-duo badge-green">FREE</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col space-y-3">
                  <div>
                    <span className="badge-duo badge-blue mb-2 inline-block">
                      {courseTypeMap[c.course_type] || c.course_type}
                    </span>
                    <h3 className="text-base font-extrabold text-foreground line-clamp-1">{c.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 font-medium">{c.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-auto pt-2 font-bold">
                    Giảng viên: <span className="text-foreground">{c.instructor}</span>
                  </p>
                </div>
                <div className="px-5 pb-5 flex items-center justify-between mt-auto">
                  <span className="font-extrabold text-[var(--duo-green)]">{formatPrice(c.price)}</span>
                  <Link to={`/courses/${c.id}`} className="btn-3d btn-3d-green text-xs py-2 px-4 inline-block">
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center">
          <Link to="/courses" className="btn-3d btn-3d-blue text-base py-3.5 px-8 inline-block">
            Xem tất cả khóa học 📚
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CourseShowcase;
