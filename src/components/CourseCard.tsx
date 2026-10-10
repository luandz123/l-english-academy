import React from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight, Video, Headphones, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import iconFulltest from "@/assets/icons/icon-fulltest-3d.webp";
import iconDictation from "@/assets/icons/icon-dictation-3d.webp";
import iconVideo from "@/assets/icons/icon-video-3d.webp";

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
      onClick={() =>
        trackEvent("click_course_card", {
          id: c.id,
          title: c.title,
          type: c.course_type,
          is_free: Boolean(c.is_free),
        })
      }
      className="group bg-[#070e1c]/90 rounded-2xl border border-cyan-500/20 hover:border-cyan-400/50 shadow-[0_4px_25px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] transition-all duration-200 flex flex-col h-full overflow-hidden cursor-pointer active:scale-[0.99] backdrop-blur-md"
    >
      {/* Thumbnail Banner */}
      <div className="aspect-video w-full relative overflow-hidden bg-[#030712]">
        {c.thumbnail_url ? (
          <img
            src={c.thumbnail_url}
            alt={c.title}
            className="w-full h-full object-cover image-safe transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-cyan-950/60 via-slate-900 to-blue-950/60 p-4 text-center">
            {isFullTest ? (
              <img src={iconFulltest} alt="" className="w-14 h-14 object-contain drop-shadow-md mb-1 transition-transform group-hover:scale-110" />
            ) : isListening ? (
              <img src={iconDictation} alt="" className="w-14 h-14 object-contain drop-shadow-md mb-1 transition-transform group-hover:scale-110" />
            ) : (
              <img src={iconVideo} alt="" className="w-14 h-14 object-contain drop-shadow-md mb-1 transition-transform group-hover:scale-110" />
            )}
            <span className="text-xs font-black text-cyan-400 uppercase tracking-wider">
              L-English Academy
            </span>
            <span className="text-xs font-bold text-slate-300 mt-1 line-clamp-1">
              {c.title}
            </span>
          </div>
        )}

        {/* Chỉ hiện badge phân loại khi không phải Full Test có thumbnail (tránh đè chữ lặp lại) */}
        {(!isFullTest || !c.thumbnail_url) && (
          <div className="absolute top-2.5 left-2.5">
            <Badge
              variant="default"
              className="shadow-soft-sm backdrop-blur-md bg-[#070e1c]/90 border border-slate-700/80 text-slate-200 text-xs font-bold"
            >
              {isListening && <img src={iconDictation} alt="" className="w-3.5 h-3.5 object-contain" />}
              {!isListening && <img src={iconVideo} alt="" className="w-3.5 h-3.5 object-contain" />}
              <span>{isListening ? "DICTATION" : "VIDEO"}</span>
            </Badge>
          </div>
        )}

        {/* Badge FREE */}
        {c.is_free && (
          <Badge variant="free" className="absolute top-2.5 right-2.5 text-xs px-2.5 py-0.5 shadow-soft-sm font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            FREE
          </Badge>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Metadata bên dưới card */}
          {isFullTest ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span>200 câu · 120 phút</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Listening + Reading</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span>{isListening ? "Luyện nghe · Chép chính tả" : "Bài giảng video"}</span>
              <span>•</span>
              <span className="whitespace-nowrap">{c.duration_months || 12} tháng</span>
            </div>
          )}

          <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
            {c.title}
          </h3>

          <p className="text-xs text-slate-400 font-normal line-clamp-2 leading-relaxed">
            {c.subtitle ||
              (isFullTest
                ? "Bộ đề thi thử TOEIC chuẩn format ETS mới nhất, bấm giờ 120 phút, chấm điểm tự động kèm lời giải chi tiết."
                : isListening
                ? "Luyện nghe chép chính tả Part 1-4, kéo thả từ khóa mượt mà cảm ứng, tăng phản xạ nghe nhanh chóng."
                : "Hệ thống video bài giảng chi tiết, bám sát các dạng bài trọng tâm và kỹ thuật làm bài thi đạt điểm cao.")}
          </p>
        </div>

        {/* Instructor & Meta */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="whitespace-nowrap">Học viên toàn quốc</span>
          </div>
          <span className="font-bold text-slate-300 truncate max-w-[110px]">
            {c.instructor || "L-English Mentor"}
          </span>
        </div>

        {/* Price & CTA Button: Nút Làm bài → */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-sm font-black text-cyan-400 block whitespace-nowrap">
              {formatCoursePrice(c.price, c.is_free)}
            </span>
          </div>

          <span
            className={`py-1.5 px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-soft-sm transition-all group-hover:translate-x-0.5 text-white whitespace-nowrap shrink-0 active:scale-95 duration-150 ${
              isFullTest
                ? "bg-emerald-600 hover:bg-emerald-700"
                : isListening
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <span>{isFullTest ? "Làm bài" : isListening ? "Luyện nghe" : "Vào học"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
