import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Layers,
  GraduationCap,
  Flame,
  Sparkles,
  Zap,
  ShoppingBag,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Video,
  Headphones,
  FileCheck2,
  Clock,
  Award,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export const CourseShowcase = () => {
  const [modalOpen, setModalOpen] = useState(false);

  // Lấy toàn bộ khóa học ĐANG HOẠT ĐỘNG (is_active = true) từ database
  const { data: activeCourses = [], isLoading } = useQuery<CourseRow[]>({
    queryKey: ["homepage-active-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });
      if (error) {
        console.error("Error fetching courses:", error);
        return [];
      }
      return data || [];
    },
  });

  // Phân chia khóa học theo từng chuyên đề theo phong cách Ngoại Ngữ 24h:
  // 1. Nhóm Đề Thi Thử Full Test 200 Câu
  const fullTestCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "fulltest");
  }, [activeCourses]);

  // 2. Nhóm Khóa Học Video & Nghe - Đọc
  const videoCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "video_quiz");
  }, [activeCourses]);

  // 3. Nhóm Luyện Nghe Điền Từ (Dictation)
  const listeningCourses = useMemo(() => {
    return activeCourses.filter((c) => c.course_type === "listening");
  }, [activeCourses]);

  const formatPrice = (price: number | null, isFree: boolean | null) => {
    if (isFree || !price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN").format(price) + " đ";
  };

  // Component render một thẻ card khóa học
  const renderCourseCard = (c: CourseRow) => {
    const isFullTest = c.course_type === "fulltest";
    const isListening = c.course_type === "listening";
    const courseUrl = isFullTest
      ? `/courses/${c.id}/fulltest`
      : c.course_type === "flashcard"
      ? `/courses/${c.id}/vocab`
      : `/courses/${c.id}/learn`;

    return (
      <Link
        key={c.id}
        to={courseUrl}
        className="group bg-card rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200 flex flex-col h-full overflow-hidden cursor-pointer"
      >
        {/* Thumbnail Banner */}
        <div className="aspect-video w-full relative overflow-hidden bg-slate-100 dark:bg-zinc-800">
          {c.thumbnail_url ? (
            <img
              src={c.thumbnail_url}
              alt={c.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-emerald-600/15 p-4 text-center">
              {isFullTest ? (
                <FileCheck2 className="w-8 h-8 text-emerald-600 mb-1" />
              ) : isListening ? (
                <Headphones className="w-8 h-8 text-purple-600 mb-1" />
              ) : (
                <Video className="w-8 h-8 text-blue-600 mb-1" />
              )}
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                L-English Academy
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 mt-1 line-clamp-1">
                {c.title}
              </span>
            </div>
          )}

          {/* Badge phương pháp học */}
          <div
            className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${
              isFullTest
                ? "bg-emerald-600 text-white"
                : isListening
                ? "bg-purple-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {isFullTest && <FileCheck2 className="w-3 h-3" />}
            {isListening && <Headphones className="w-3 h-3" />}
            {!isFullTest && !isListening && <Video className="w-3 h-3" />}
            <span>
              {isFullTest
                ? "Full Test 200 Câu"
                : isListening
                ? "Dictation Điền Từ"
                : "Video Bài Giảng"}
            </span>
          </div>

          {c.is_free && (
            <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded-lg shadow-sm">
              FREE
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {isFullTest ? "Bấm Giờ 120 Phút" : "Học Chủ Động"}
              </span>
              <span>•</span>
              <span>Thời hạn {c.duration_months || 12} tháng</span>
            </div>

            <h3 className="text-sm font-extrabold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
              {c.title}
            </h3>

            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium line-clamp-2 leading-relaxed">
              {c.subtitle ||
                (isFullTest
                  ? "Bộ đề thi thử TOEIC chuẩn format ETS mới nhất, bấm giờ 120 phút, chấm điểm tự động kèm lời giải chi tiết."
                  : isListening
                  ? "Luyện nghe chép chính tả Part 1-4, kéo thả từ khóa mượt mà cảm ứng, tăng phản xạ nghe nhanh chóng."
                  : "Hệ thống video bài giảng chi tiết, bám sát các dạng bài trọng tâm và kỹ thuật làm bài thi đạt điểm cao.")}
            </p>
          </div>

          {/* Instructor & Meta */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-600" />
              <span>Học viên toàn quốc</span>
            </div>
            <span className="font-bold text-slate-700 dark:text-zinc-300 truncate max-w-[110px]">
              {c.instructor || "L-English Mentor"}
            </span>
          </div>

          {/* Price & CTA Button */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 block">
                {formatPrice(c.price, c.is_free)}
              </span>
            </div>

            <span
              className={`py-1.5 px-3.5 rounded-xl font-black text-xs inline-flex items-center gap-1 shadow-sm transition-all group-hover:translate-x-0.5 text-white ${
                isFullTest
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : isListening
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <span>{isFullTest ? "THI THỬ NGAY" : "VÀO HỌC"}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-10" id="combos">
      {/* ========================================================================= */}
      {/* SECTION 1: PHÒNG THI THỬ FULL TEST TOEIC CHUẨN ETS (Phong cách Ngoại Ngữ 24h) */}
      {/* ========================================================================= */}
      <section
        id="section-fulltest"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-foreground tracking-tight">
                PHÒNG THI THỬ TOEIC FULL TEST{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  (FORMAT ETS)
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase">
                {fullTestCourses.length} Bộ Đề
              </span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium pl-11">
              Bộ đề bấm giờ thật 120 phút, 200 câu Listening &amp; Reading, chấm điểm tự động kèm phân tích đáp án chi tiết.
            </p>
          </div>


        </div>

        {/* Lưới khóa học Full Test */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : fullTestCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {fullTestCourses.map(renderCourseCard)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật bộ đề thi mới...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: KHÓA HỌC BÀI GIẢNG VIDEO & NGỮ PHÁP TRỌNG ĐIỂM (Ngoại Ngữ 24h) */}
      {/* ========================================================================= */}
      <section
        id="section-video"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                <Video className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-foreground tracking-tight">
                KHÓA HỌC VIDEO &amp; LUYỆN THI TOEIC{" "}
                <span className="text-blue-600 dark:text-blue-400 font-black">
                  NGHE - ĐỌC
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase">
                {videoCourses.length} Khóa Học
              </span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium pl-11">
              Bài giảng video chuẩn mực theo từng Part 1–7, trang bị phương pháp giải đề, mẹo tránh bẫy và bài tập thực hành.
            </p>
          </div>


        </div>

        {/* Lưới khóa học Video */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : videoCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videoCourses.map(renderCourseCard)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật khóa học video...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: LUYỆN NGHE CHÉP CHÍNH TẢ (DICTATION CẢM ỨNG ĐỘC QUYỀN)           */}
      {/* ========================================================================= */}
      <section
        id="section-listening"
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-7 md:p-8 shadow-sm space-y-6"
      >
        {/* Header Kệ Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                <Headphones className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-foreground tracking-tight">
                LUYỆN NGHE ĐIỀN TỪ{" "}
                <span className="text-purple-600 dark:text-purple-400 font-black">
                  (DICTATION CHÉP CHÍNH TẢ)
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-black uppercase">
                {listeningCourses.length} Chương Trình
              </span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium pl-11">
              Phương pháp nghe chép chính tả Part 1–4, cơ chế kéo thả từ khóa cảm ứng thông minh, nhận diện nuốt âm và nối từ.
            </p>
          </div>


        </div>

        {/* Lưới khóa học Listening */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : listeningCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listeningCourses.map(renderCourseCard)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Đang cập nhật bài luyện nghe...</p>
        )}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: GÓI COMBO VIP TOÀN DIỆN (Phong cách Ngoại Ngữ 24h)              */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>GÓI VIP TOÀN DIỆN TOEIC</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Đăng Ký Combo Trọn Gói Khóa Học &amp; Kho Đề Thi ETS
          </h3>
          <p className="text-white/85 text-xs sm:text-sm font-normal max-w-2xl">
            Mở khóa toàn bộ các bộ đề thi thử 200 câu format ETS, video bài giảng Part 1–7 và toàn bộ hệ thống luyện nghe cảm ứng không giới hạn thời gian.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-3d btn-3d-yellow py-3.5 px-7 text-xs sm:text-sm font-black whitespace-nowrap flex items-center gap-2 shadow-lg shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>MUA GÓI VIP TRỌN GÓI</span>
        </button>
      </div>

      {/* MODAL THANH TOÁN VIETQR COMBO KHÓA HỌC */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-xl font-black text-foreground">
              Đăng Ký Gói Combo Khóa Học VIP
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Quét mã VietQR chuyển khoản tự động để kích hoạt tài khoản học viên ngay lập tức.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                  GÓI HỌC TOÀN DIỆN
                </span>
                <h4 className="font-black text-sm text-foreground">
                  Combo TOEIC VIP Toàn Bộ Khóa Học &amp; Đề Thi
                </h4>
                <span className="text-xs text-slate-500">Thời hạn: Vĩnh viễn (Kèm toàn bộ bản cập nhật)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                  1.750.000 đ
                </span>
                <span className="text-[11px] text-slate-400 line-through block">
                  3.500.000 đ
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                <img
                  src="https://api.vietqr.io/image/970422-0334729066-qj9Rj0t.jpg?accountName=HOANG%20CONG%20LUAN&amount=1750000&addInfo=VIP%20LENGLISH"
                  alt="VietQR Chuyển Khoản"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="text-center mt-3 space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Ngân hàng: <span className="text-blue-600 font-extrabold">MBBank</span>
                </p>
                <p className="text-xs font-bold text-foreground">
                  Số tài khoản: <span className="text-blue-600 font-extrabold">0334729066</span>
                </p>
                <p className="text-xs font-bold text-foreground">
                  Chủ tài khoản: <span className="font-extrabold">HOANG CONG LUAN</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Nội dung CK: <strong className="text-blue-600">VIP [SĐT Của Bạn]</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://zalo.me/0334729066"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-3d btn-3d-green w-full py-2.5 text-xs font-black inline-flex items-center justify-center gap-2"
              >
                <span>Xác nhận chuyển khoản qua Zalo (0334729066)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseShowcase;
