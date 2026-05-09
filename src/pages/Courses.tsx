import StudentLayout from "@/components/StudentLayout";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const courseTypeMap: Record<string, string> = {
  video_quiz: "🎬 Video + Bài Thi",
  flashcard: "🃏 Flashcard",
  listening: "🎧 Listening",
  speaking: "🗣️ Speaking & Writing",
  fulltest: "📋 Full Test",
};

const Courses = () => {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments-ids", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user!.id);
      return data?.map(e => e.course_id) || [];
    },
    enabled: !!user,
  });

  const enrolledIds = new Set(enrollments || []);

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  return (
    <StudentLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-10 px-1">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Khóa Học 📚</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Danh sách tất cả khóa học trên L-English</p>
        </div>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses?.map((c) => {
              const isEnrolled = enrolledIds.has(c.id);
              return (
                <div key={c.id} className="card-duo flex flex-col h-full">
                  <div className="aspect-video w-full bg-muted relative overflow-hidden rounded-t-[14px]">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground uppercase font-bold text-xs bg-gradient-to-br from-[var(--duo-green)]/10 to-[var(--duo-blue)]/10">
                         L-ENGLISH
                      </div>
                    )}
                    {isEnrolled && (
                      <div className="absolute top-3 left-3">
                        <span className="badge-duo badge-green">✅ Đã đăng ký</span>
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
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge-duo badge-blue">{courseTypeMap[c.course_type] || c.course_type}</span>
                      </div>
                      <h3 className="font-extrabold text-foreground leading-tight text-base line-clamp-2">{c.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1 font-medium">{c.subtitle}</p>
                    <div className="pt-2 border-t-2 border-[var(--duo-gray)] mt-auto">
                      <p className="text-[10px] text-muted-foreground font-bold">
                        Giảng viên: <span className="text-foreground">{c.instructor}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                        Hạn: {c.duration_months ? `${c.duration_months} tháng` : "Vĩnh viễn"}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[var(--duo-green)]">{formatPrice(c.price)}</span>
                    <Link to={`/courses/${c.id}`} className="btn-3d btn-3d-green text-xs py-2 px-4 inline-block">
                      {isEnrolled ? "Tiếp tục" : "Xem chi tiết"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default Courses;
