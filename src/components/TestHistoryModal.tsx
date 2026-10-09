import React from "react";
import { Link } from "react-router-dom";
import { FileCheck2, Clock, Award, X, ArrowRight, CheckCircle2, Headphones, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullTests: any[];
  quizzes: any[];
  totalStudyHours: string;
}

export const TestHistoryModal: React.FC<TestHistoryModalProps> = ({
  isOpen,
  onClose,
  fullTests,
  quizzes,
  totalStudyHours,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1c] border-2 border-cyan-500/40 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <FileCheck2 className="w-3.5 h-3.5" />
              Chi Tiết Bài Tập & Đề Thi
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Lịch Sử Làm Bài & Kết Quả Đã Đạt
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Thống kê toàn bộ các đề thi Full Test 120p và bài tập trắc nghiệm bạn đã nộp bài.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Bar */}
        <div className="px-6 py-3 bg-[#030712]/90 border-b border-slate-800/80 grid grid-cols-3 gap-3 text-center relative z-10">
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">Đề thi 120p</span>
            <div className="text-lg font-black text-cyan-400">{fullTests.length}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">Bài tập mini</span>
            <div className="text-lg font-black text-emerald-400">{quizzes.length}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400">Tổng giờ làm bài</span>
            <div className="text-lg font-black text-amber-400">{totalStudyHours}h</div>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 relative z-10">
          {fullTests.length === 0 && quizzes.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <FileCheck2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Chưa có bài tập hay đề thi nào</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Hãy bắt đầu làm một đề thi TOEIC chuẩn format ETS để ghi nhận tiến độ và thời gian học tập của bạn nhé!
                </p>
              </div>
              <Link
                to="/fulltests"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <span>Làm đề thi ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {fullTests.map((item: any) => {
                const dateStr = item.completed_at
                  ? new Date(item.completed_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Gần đây";
                const mins = item.time_spent_seconds ? Math.round(item.time_spent_seconds / 60) : 120;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#030712]/80 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm text-white truncate">
                          {item.full_tests?.title || `Đề thi #${item.test_id}`}
                        </h5>
                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {mins} phút
                          </span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-extrabold text-xs">
                        {item.total_score != null ? `${item.total_score}/990` : "Hoàn thành"}
                      </div>
                      {(item.listening_score != null || item.reading_score != null) && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          LC: {item.listening_score || 0} | RC: {item.reading_score || 0}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {quizzes.slice(0, 5).map((q: any) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-[#030712]/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Bài tập trắc nghiệm #{q.quiz_id || q.id}</span>
                  </div>
                  <span className="font-bold text-emerald-400">
                    {q.score || 100}% ({q.correct_answers || q.total_questions || 5} câu)
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#030712]/90 flex items-center justify-between gap-3 relative z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Đóng
          </Button>
          <Link
            to="/fulltests"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>Luyện đề thi tiếp ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
