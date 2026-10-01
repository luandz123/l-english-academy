import React from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight, Video, Headphones, FileCheck2 } from "lucide-react";

export interface CourseRow {
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

export const formatCoursePrice = (price: number | null, isFree: boolean | null) => {
  if (isFree || !price || price === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN").format(price) + " đ";
};

export const CourseCard: React.FC<{ course: CourseRow }> = ({ course: c }) => {
  const isFullTest = c.course_type === "fulltest";
  const isListening = c.course_type === "listening";
  const courseUrl = isFullTest
    ? `/courses/${c.id}/fulltest`
    : c.course_type === "flashcard"
    ? `/courses/${c.id}/vocab`
    : `/courses/${c.id}/learn`;

  return (
    <Link
      to={courseUrl}
      className="group bg-card rounded-[1.35rem] border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-[0_18px_35px_-18px_rgba(37,99,235,.5)] hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300 flex flex-col h-full overflow-hidden cursor-pointer"
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
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 mt-1 line-clamp-1">
              {c.title}
            </span>
          </div>
        )}

        {/* Badge phương pháp học */}
        <div
          className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm ${
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
          <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-sm">
            FREE
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <span className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-bold">
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
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium">
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
              {formatCoursePrice(c.price, c.is_free)}
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

export default CourseCard;
