import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Users, CheckCircle, ArrowRight, BookOpen, Layers, GraduationCap, Flame, Sparkles } from "lucide-react";

interface CourseRow {
  id: number;
  title: string;
  subtitle: string | null;
  course_type: string;
  price: number | null;
  thumbnail_url: string | null;
  instructor: string | null;
  is_active: boolean | null;
  is_free: boolean | null;
  display_order: number | null;
  category_id: number | null;
  duration_months?: number | null;
}

const courseTypeMap: Record<string, string> = {
  video_quiz: "🎬 Video + Bài Tập",
  flashcard: "🃏 Flashcard từ vựng",
  listening: "🎧 Dictation nghe điền từ",
  speaking: "🗣️ Speaking & Writing",
  fulltest: "📋 Full Test thi thử",
};

const CourseShowcase = () => {
  const [activeTab, setActiveTab] = useState<number | null>(null);

  // Fetch active categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["featured-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  // Fetch all active real courses from Supabase
  const { data: dbCourses = [], isLoading: isCoursesLoading } = useQuery<CourseRow[]>({
    queryKey: ["featured-courses-real"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const formatPrice = (price: number | null, isFree: boolean | null) => {
    if (isFree || !price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  // Set default active tab
  if (activeTab === null && categories.length > 0) {
    setActiveTab(categories[0].id);
  }

  const activeCourses = dbCourses.filter(c => c.category_id === activeTab);
  const activeCategory = categories.find(c => c.id === activeTab);

  const getIcon = (iconName: string | null) => {
    if (iconName === "BookOpen") return <BookOpen size={16} />;
    if (iconName === "GraduationCap") return <GraduationCap size={16} />;
    if (iconName === "Layers") return <Layers size={16} />;
    return <BookOpen size={16} />;
  };

  return (
    <section className="py-14 md:py-20 bg-[#fffaf7] dark:bg-zinc-900 border-t border-[var(--duo-gray)] dark:border-zinc-800" id="courses">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-3 tracking-tight">
            Kho Khóa Học <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--duo-green)] to-[var(--duo-orange)]">Trên Hệ Thống</span>
          </h2>
        </div>

        {/* Dynamic Tab Filters */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
          {categories.map((cat, index) => {
            const isActive = activeTab === cat.id;
            const catCourses = dbCourses.filter(c => c.category_id === cat.id);
            // Cycle through green, orange, blue styles based on index
            const styleIdx = index % 3;
            
            let btnClass = "bg-white text-[var(--duo-gray-dark)] border-2 border-[var(--duo-gray)] shadow-[0_4px_0_var(--duo-gray)] hover:bg-zinc-50";
            let badgeClass = "bg-slate-100 text-slate-600";
            
            if (isActive) {
              if (styleIdx === 0) {
                btnClass = "bg-[var(--duo-green)] text-white shadow-[0_4px_0_var(--duo-green-dark)] hover:bg-[var(--duo-green-light)] border-[var(--duo-green)]";
                badgeClass = "bg-white/20 text-white";
              } else if (styleIdx === 1) {
                btnClass = "bg-[var(--duo-orange)] text-white shadow-[0_4px_0_var(--accent-dark)] hover:brightness-105 border-[var(--duo-orange)]";
                badgeClass = "bg-orange-100 text-[var(--accent-dark)]";
              } else {
                btnClass = "bg-[var(--duo-blue)] text-white shadow-[0_4px_0_var(--duo-blue-dark)] hover:brightness-110 border-[var(--duo-blue)]";
                badgeClass = "bg-slate-100 text-[var(--duo-blue-dark)]";
              }
            } else {
              // Idle text colors based on style index
              if (styleIdx === 0) btnClass = "bg-white text-[var(--duo-green-dark)] border-2 border-[var(--duo-gray)] shadow-[0_4px_0_var(--duo-gray)] hover:bg-zinc-50";
              else if (styleIdx === 1) btnClass = "bg-white text-[var(--duo-orange)] border-2 border-[var(--duo-gray)] shadow-[0_4px_0_var(--duo-gray)] hover:bg-zinc-50";
              else btnClass = "bg-white text-[var(--duo-blue-dark)] border-2 border-[var(--duo-gray)] shadow-[0_4px_0_var(--duo-gray)] hover:bg-zinc-50";
            }

            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`btn-3d text-sm font-bold uppercase transition-all duration-150 py-3 px-6 rounded-2xl flex items-center gap-2 ${btnClass}`}
              >
                {getIcon(cat.icon)} {cat.name}
                {catCourses.length > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black ${badgeClass}`}>
                    {catCourses.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Showcase Grid */}
        {isCoursesLoading || isCategoriesLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-3xl" />
            ))}
          </div>
        ) : activeCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeCourses.map((c) => {
              return (
                <div
                  key={c.id}
                  className="group bg-white dark:bg-zinc-900 rounded-3xl border-2 border-[var(--duo-gray)] dark:border-zinc-800 shadow-[0_6px_0_var(--duo-gray)] dark:shadow-none hover:shadow-[0_8px_0_var(--duo-gray)] hover:translate-y-[-4px] transition-all duration-200 flex flex-col h-full overflow-hidden"
                >
                  {/* Image and badges */}
                  <div className="aspect-video w-full bg-muted relative overflow-hidden">
                    {c.thumbnail_url ? (
                      <img
                        src={c.thumbnail_url}
                        alt={c.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--duo-green)]/12 to-[var(--duo-orange)]/12">
                        <span className="font-extrabold text-foreground text-sm tracking-widest uppercase">
                          L-ENGLISH ACADEMY
                        </span>
                      </div>
                    )}

                    {/* Floating top badges */}
                    <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
                      <span className={`badge-duo badge-blue font-black text-[10px]`}>
                        {courseTypeMap[c.course_type] || c.course_type}
                      </span>
                    </div>

                    {c.is_free && (
                      <div className="absolute top-3.5 right-3.5 bg-rose-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg border-2 border-rose-600 shadow-md">
                        FREE
                      </div>
                    )}
                  </div>

                  {/* Core details */}
                  <div className="p-6 flex-1 flex flex-col space-y-4">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-muted-foreground">
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                        HỌC CHỦ ĐỘNG
                      </span>
                      <span>•</span>
                      <span>Thời hạn {c.duration_months || 6} tháng</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-[var(--duo-green)] transition-colors line-clamp-2 leading-snug min-h-[50px]">
                        {c.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-semibold line-clamp-2 mt-1 min-h-[40px] leading-relaxed">
                        {c.subtitle || "Khóa học chất lượng cao bám sát chương trình giảng dạy."}
                      </p>
                    </div>

                    {/* Stats & Instructor */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-2 border-t border-[var(--duo-gray)] dark:border-zinc-800">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>Học viên toàn quốc</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[var(--duo-blue)] flex items-center justify-center text-[10px] font-black text-white">
                          {c.instructor ? c.instructor.charAt(0) : "M"}
                        </div>
                        <span className="text-foreground">{c.instructor || "Ms. Mai Phương"}</span>
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center justify-between pt-4 mt-auto border-t-2 border-[var(--duo-gray)] dark:border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-[var(--duo-green)]">
                          {formatPrice(c.price, c.is_free)}
                        </span>
                      </div>

                      <Link
                        to={`/courses/${c.id}`}
                        className={`btn-3d text-xs font-black py-2 px-4 rounded-xl inline-flex items-center gap-1.5 btn-3d-white`}
                      >
                        HỌC NGAY <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty / Sắp ra mắt layout for future course expansion (e.g. Cấp 3 / THPT prepare courses) */
          <div className="max-w-2xl mx-auto text-center card-duo p-12 bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed border-4 border-[var(--duo-gray)] dark:border-zinc-800 space-y-6">
            <div className="w-16 h-16 rounded-full bg-[var(--duo-orange)]/10 dark:bg-[var(--duo-orange)]/20 flex items-center justify-center mx-auto text-[var(--duo-orange)]">
              <Sparkles size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">
                Chương Trình {activeCategory?.name || "Đang phát triển"}
              </h3>
              <p className="text-muted-foreground font-semibold text-sm max-w-md mx-auto">
                Hệ thống đang cập nhật và hoàn thiện kho dữ liệu cho chương trình học này.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-2 border-[var(--duo-gray)] dark:border-zinc-800 max-w-sm mx-auto text-left space-y-3 shadow-[0_3px_0_var(--duo-gray)] dark:shadow-none">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Flame size={12} className="text-[var(--duo-orange)] fill-current" /> Lộ trình dự kiến:
              </p>
              <ul className="space-y-2 text-xs font-bold text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[var(--duo-orange)] shrink-0" />
                  <span>Tổng ôn Ngữ pháp Lớp 9 lên 10</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[var(--duo-orange)] shrink-0" />
                  <span>100+ Đề thi thử bám sát đề thi thật</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-[var(--duo-orange)] shrink-0" />
                  <span>Giải nghĩa chi tiết 100% từng câu</span>
                </li>
              </ul>
            </div>

            <div className="text-xs font-black text-[var(--accent-dark)] bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 inline-block">
              🚀 COMING SOON - SẼ SỚM CẬP NHẬT TỚI HỌC VIÊN!
            </div>
          </div>
        )}

        {/* Call to action below showcase */}
        <div className="mt-16 text-center">
          <Link
            to="/courses"
            className="btn-3d btn-3d-white text-base py-4 px-10 inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all"
          >
            XEM TOÀN BỘ DANH MỤC 📚 <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CourseShowcase;
