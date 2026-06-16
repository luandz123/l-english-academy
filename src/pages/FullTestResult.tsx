import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, LayoutGrid, Clock, Award, Eye, FileText, ChevronLeft, Loader2 } from "lucide-react";

// BUG FIX #11: Default part totals for TOEIC standard, used as fallback only
const defaultPartTotals: Record<number, number> = {
  1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54
};

const partBreakdownMeta = [
  { part: 1, name: "Part 1: Photo Description" },
  { part: 2, name: "Part 2: Question & Response" },
  { part: 3, name: "Part 3: Conversations" },
  { part: 4, name: "Part 4: Short Talks" },
  { part: 5, name: "Part 5: Incomplete Sentences" },
  { part: 6, name: "Part 6: Text Completion" },
  { part: 7, name: "Part 7: Reading Comprehension" },
];

const partShortNames = ["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"];

const FullTestResult = () => {
  const { courseId, testId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as any;

  const [showReview, setShowReview] = useState(false);
  const [onlyShowIncorrect, setOnlyShowIncorrect] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 1. Get resultId from state or query latest result from DB
  const stateResultId = state?.resultId;

  const { data: latestResult, isLoading: loadingResult } = useQuery({
    queryKey: ["latest-fulltest-result", user?.id, testId],
    queryFn: async () => {
      if (stateResultId) {
        const { data } = await supabase
          .from("user_full_test_results")
          .select("*")
          .eq("id", stateResultId)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("user_full_test_results")
        .select("*")
        .eq("user_id", user!.id)
        .eq("test_id", Number(testId))
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const resultId = latestResult?.id;

  // 2. Fetch answer details for this result
  const { data: answerDetails = [], isLoading: loadingDetails } = useQuery({
    queryKey: ["fulltest-answer-details", resultId],
    queryFn: async () => {
      const { data } = await supabase
        .from("full_test_answer_details")
        .select("*")
        .eq("result_id", resultId);
      return data || [];
    },
    enabled: !!resultId,
  });

  // 3. Fetch questions & answers of this test
  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["fulltest-result-questions", testId],
    queryFn: async () => {
      const { data: sections } = await supabase
        .from("full_test_sections")
        .select("part_number, quiz_id")
        .eq("test_id", Number(testId));

      if (!sections || sections.length === 0) return [];
      const quizIds = sections.map(s => s.quiz_id).filter(Boolean) as number[];
      if (quizIds.length === 0) return [];

      const { data: qData } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .in("quiz_id", quizIds);

      if (!qData) return [];

      const mapped = qData.map((q: any) => {
        const sec = sections.find(s => s.quiz_id === q.quiz_id);
        const part = sec ? sec.part_number : 5;
        return {
          ...q,
          part_number: part,
          answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
        };
      });

      // Sort globally
      mapped.sort((a, b) => {
        if (a.part_number !== b.part_number) return a.part_number - b.part_number;
        return a.display_order - b.display_order;
      });

      return mapped;
    },
    enabled: !!testId,
  });

  // Map user answers for quick access: questionId -> selected_answer_id
  const answerLookup: Record<number, number | null> = {};
  const correctnessLookup: Record<number, boolean> = {};

  const detailsArray = Array.isArray(answerDetails) ? answerDetails : [];
  detailsArray.forEach(detail => {
    if (detail) {
      answerLookup[detail.question_id] = detail.selected_answer_id;
      correctnessLookup[detail.question_id] = !!detail.is_correct;
    }
  });

  // Calculate stats per Part — BUG FIX #11: use actual question counts
  const partStats = partBreakdownMeta.map(meta => {
    const partQuestions = questions.filter(q => q.part_number === meta.part);
    const correctCount = partQuestions.reduce((acc, q) => {
      return acc + (correctnessLookup[q.id] ? 1 : 0);
    }, 0);
    return {
      ...meta,
      correct: correctCount,
      total: partQuestions.length || defaultPartTotals[meta.part] || 0,
    };
  });

  // Grouping questions for detailed review y hệt lúc thi
  const groupedQuestions = (() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    questions.forEach((q: any, idx: number) => {
      const isPart34 = q.part_number === 3 || q.part_number === 4;
      const isPart67 = q.part_number === 6 || q.part_number === 7;

      let passageText = q.passage_text || "";
      let cleanQuestionText = q.question_text;

      if (q.question_text.includes("[PASSAGE]")) {
        const parts = q.question_text.split("[ENDPASSAGE]");
        passageText = parts[0].replace("[PASSAGE]", "");
        cleanQuestionText = parts[1] || "";
      }

      let shouldStartNew = false;
      if (!currentGroup) {
        shouldStartNew = true;
      } else if (currentGroup.part_number !== q.part_number) {
        shouldStartNew = true;
      } else if (isPart34) {
        if (q.group_id && q.group_id !== currentGroup.group_id) {
          shouldStartNew = true;
        } else if (!q.group_id && q.audio_url && q.audio_url !== currentGroup.audio_url) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 3) {
          shouldStartNew = true;
        }
      } else if (isPart67) {
        if (q.group_id && q.group_id !== currentGroup.group_id) {
          shouldStartNew = true;
        } else if (!q.group_id && passageText) {
          shouldStartNew = true;
        } else if (currentGroup.questions.length >= 4 && q.part_number === 6) {
          shouldStartNew = true;
        // BUG FIX #7: Limit Part 7 groups to max 5 questions when no group_id
        } else if (!q.group_id && q.part_number === 7 && currentGroup.questions.length >= 5) {
          shouldStartNew = true;
        }
      } else {
        shouldStartNew = true;
      }

      if (shouldStartNew) {
        currentGroup = {
          id: groups.length,
          part_number: q.part_number,
          passage: passageText,
          audio_url: q.audio_url,
          image_url: q.image_url,
          group_id: q.group_id,
          questions: []
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, globalIdx: idx, cleanText: cleanQuestionText });
    });

    return groups;
  })();

  if (loadingResult || loadingQuestions || loadingDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!latestResult) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 font-sans">
          <Award className="w-16 h-16 text-[var(--duo-gray)] mx-auto animate-bounce" />
          <h1 className="text-3xl font-black text-foreground">Không tìm thấy kết quả bài thi</h1>
          <p className="text-muted-foreground font-semibold max-w-md mx-auto">
            Có vẻ như bạn chưa hoàn thành bài thi này, hoặc phiên làm bài đã bị hủy. Hãy thử bắt đầu làm bài lại nhé!
          </p>
          <div className="pt-4">
            <Link
              to={`/courses/${courseId}`}
              className="btn-3d btn-3d-primary font-black px-6 py-3"
            >
              Quay lại khóa học
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Determine score details
  const totalScore = latestResult?.total_score ?? 10;
  const correct = latestResult?.correct_answers ?? 0;
  const totalQCount = (latestResult?.total_questions ?? questions.length) || 200;
  const listeningScore = latestResult?.listening_score ?? 5;
  const readingScore = latestResult?.reading_score ?? 5;
  const timeSpent = latestResult?.time_spent_seconds ?? 0;
  const timeMin = Math.floor(timeSpent / 60);
  const timeSec = timeSpent % 60;

  const getScoreEmoji = () => {
    if (totalScore >= 800) return "🏆";
    if (totalScore >= 600) return "🌟";
    if (totalScore >= 400) return "💪";
    return "📚";
  };

  const scoreDisplay = {
    emoji: getScoreEmoji(),
    title: totalScore >= 750 ? "Xuất sắc!" : totalScore >= 550 ? "Khá tốt!" : totalScore >= 350 ? "Có tiến bộ!" : "Cần cố gắng ôn tập thêm!"
  };

  // Review Details Subview
  if (showReview) {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
        {/* Sticky Header */}
        <header className="h-16 border-b-2 border-[var(--duo-gray)] shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReview(false)}
              className="p-2 rounded-xl bg-slate-50 border-2 border-[var(--duo-gray)] hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">Giải thích chi tiết đề thi</h1>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-red-50 text-[var(--duo-red)] px-3 py-2 rounded-full border-2 border-red-200 hover:bg-red-100/50 transition-all select-none">
              <input
                type="checkbox"
                checked={onlyShowIncorrect}
                onChange={(e) => setOnlyShowIncorrect(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--duo-red)] cursor-pointer"
              />
              <span>Chỉ xem câu sai ❌</span>
            </label>

            <button onClick={() => setShowReview(false)} className="btn-3d btn-3d-white py-2 px-4 text-sm font-bold">
              Đóng xem giải
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* List of questions */}
          <div className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth pb-32">
            {groupedQuestions.map((group: any, gIdx: number) => {
              // Filter out correct answers if onlyShowIncorrect is enabled
              const questionsToRender = group.questions.filter((q: any) => {
                const isCorrect = correctnessLookup[q.id];
                if (onlyShowIncorrect) return !isCorrect;
                return true;
              });

              if (questionsToRender.length === 0) return null;

              return (
                <div key={gIdx} className="max-w-4xl mx-auto space-y-5">
                  {/* Group Header Context */}
                  {(group.passage || group.audio_url || group.image_url) && (
                    <div className="card-duo p-5 sm:p-7 bg-[#DDF4FF]/30 border-[#A8E0FD] space-y-4 rounded-2xl">
                      <span className="badge-duo badge-blue">{partShortNames[group.part_number - 1]}</span>

                      {group.image_url && (
                        <img
                          src={group.image_url}
                          alt="Passage Context"
                          className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] mx-auto max-h-[300px]"
                        />
                      )}

                      {group.audio_url && (
                        <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border-2 border-[var(--duo-blue)]/20 shadow-sm">
                          <div className="w-10 h-10 rounded-lg bg-[var(--duo-blue)] flex items-center justify-center text-white shrink-0">
                            🎧
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-muted-foreground mb-1">Audio nghe chung</p>
                            <audio
                              controls
                              src={group.audio_url}
                              className="w-full h-8"
                              controlsList="nodownload"
                            />
                          </div>
                        </div>
                      )}

                      {group.passage && (
                        <div 
                          className="prose prose-sm max-w-none text-foreground font-medium bg-white p-5 rounded-xl border-2 border-[var(--duo-gray)] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: group.passage }}
                        />
                      )}
                    </div>
                  )}

                  {/* Questions */}
                  {questionsToRender.map((q: any) => {
                    const selectedId = answerLookup[q.id];
                    const correctOpt = q.answers.find((o: any) => o.is_correct === true);
                    const isCorrect = correctnessLookup[q.id];
                    const isPart1 = q.part_number === 1;
                    const isPart2 = q.part_number === 2;

                    return (
                      <div
                        key={q.id}
                        id={`question-${q.globalIdx}`}
                        className="card-duo p-6 bg-white border-2 border-[var(--duo-gray)] rounded-2xl space-y-4 relative scroll-mt-6"
                      >
                        {/* Status Label */}
                        <div className={cn(
                          "absolute top-0 right-0 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-xl text-white",
                          selectedId ? (isCorrect ? "bg-[var(--duo-correct)]" : "bg-[var(--duo-red)]") : "bg-slate-400"
                        )}>
                          {selectedId ? (isCorrect ? "Đúng" : "Sai") : "Chưa trả lời"}
                        </div>

                        <div className="flex justify-between items-center mr-16">
                          <span className="badge-duo badge-orange font-black">
                            Câu {q.globalIdx + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {partShortNames[q.part_number - 1]}
                          </span>
                        </div>

                        {q.image_url && q.image_url !== group.image_url && (
                          <img
                            src={q.image_url}
                            alt="Question context"
                            className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] max-h-[250px] mx-auto"
                          />
                        )}

                        {q.audio_url && q.audio_url !== group.audio_url && (
                          <audio
                            controls
                            src={q.audio_url}
                            className="w-full max-w-md"
                            controlsList="nodownload"
                          />
                        )}

                        {q.cleanText && !isPart1 && !isPart2 && (
                          <p className="text-base font-extrabold text-foreground leading-relaxed">
                            {q.cleanText}
                          </p>
                        )}

                        {/* Answers Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {q.answers.map((opt: any, oi: number) => {
                            const isSelected = selectedId === opt.id;
                            const isOptCorrect = opt.is_correct;

                            if (isPart2 && oi === 3) return null;

                            let optClass = "border-[var(--duo-gray)] bg-white text-foreground";
                            let indicatorClass = "border-[var(--duo-gray-dark)] text-muted-foreground";

                            if (isOptCorrect) {
                              optClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 shadow-[0_3px_0_var(--duo-correct-dark)]/20 font-bold";
                              indicatorClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white";
                            } else if (isSelected) {
                              optClass = "border-[var(--duo-red)] bg-red-50 shadow-[0_3px_0_#FFB3B3] font-bold";
                              indicatorClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white";
                            }

                            return (
                              <div
                                key={opt.id}
                                className={cn("w-full p-4 rounded-xl border-2 text-sm transition-all flex items-center", optClass)}
                              >
                                <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 font-extrabold text-sm", indicatorClass)}>
                                  {isOptCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + oi)}
                                </div>
                                <span className="flex-1 font-bold">
                                  {(isPart1 || isPart2) && !opt.answer_text ? (
                                    <span className="text-muted-foreground/30 select-none tracking-widest">••••••••</span>
                                  ) : (
                                    opt.answer_text
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Detailed Explanations */}
                        <div className="pt-3 border-t border-dashed border-[var(--duo-gray)] space-y-2">
                          {q.translation && (
                            <div className="p-3 bg-slate-50 border-2 rounded-xl text-xs font-medium text-slate-700">
                              🇻🇳 <b>Dịch nghĩa:</b> {q.translation}
                            </div>
                          )}
                          {/* BUG FIX #5: Check both question-level and answer-level explanation */}
                          {(q.explanation || correctOpt?.explanation) && (
                            <div className="p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl text-xs font-medium text-emerald-800">
                              💡 <b>Giải thích:</b> {q.explanation || correctOpt?.explanation}
                            </div>
                          )}
                          {q.transcript && (
                            <div className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl text-xs font-medium text-blue-800">
                              📝 <b>Transcript:</b> {q.transcript}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Right Sidebar navigation (Desktop) */}
          <aside className="hidden lg:flex w-80 flex-col border-l-2 border-[var(--duo-gray)] bg-card h-full relative shrink-0 select-none">
            <div className="p-5 border-b-2 border-[var(--duo-gray)] bg-muted/50">
              <h3 className="font-extrabold text-base flex items-center gap-2 mb-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Danh sách câu hỏi
              </h3>
              <div className="flex gap-4 text-xs font-black text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[var(--duo-correct)] rounded-full" /> Đúng: {correct}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[var(--duo-red)] rounded-full" /> Sai: {totalQCount - correct}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map(part => {
                const partQList = questions.filter(q => q.part_number === part);
                if (partQList.length === 0) return null;

                return (
                  <div key={part} className="space-y-1.5">
                    <span className="text-[10px] font-black text-muted-foreground tracking-wider uppercase block">
                      Part {part}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {questions.map((q, idx) => {
                        if (q.part_number !== part) return null;
                        const isAns = answerLookup[q.id] !== undefined;
                        const isCorr = correctnessLookup[q.id];

                        if (onlyShowIncorrect && isCorr) return null;

                        return (
                          <button
                            key={q.id}
                            onClick={() => {
                              document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={cn(
                              "w-9 h-9 text-xs font-bold rounded-lg border-2 transition-all flex items-center justify-center hover:-translate-y-0.5",
                              isAns
                                ? (isCorr ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct)]" : "bg-[var(--duo-red)] text-white border-[var(--duo-red)]")
                                : "bg-white text-muted-foreground border-[var(--duo-gray)]"
                            )}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </main>
      </div>
    );
  }

  // 4. Score dashboard view
  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {/* Banner header */}
        <div className="card-duo p-8 text-center space-y-5 bg-white rounded-2xl shadow-lg border-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--duo-blue)] via-[var(--duo-correct)] to-[var(--duo-yellow)]" />

          <div className="text-6xl mb-2">{scoreDisplay.emoji}</div>
          <h1 className="text-3xl font-black text-foreground tracking-wide">KẾT QUẢ BÀI THI TOEIC</h1>
          <p className="text-lg font-extrabold text-[var(--duo-blue-dark)] uppercase tracking-widest">{scoreDisplay.title}</p>

          <div className="flex flex-col items-center justify-center my-6">
            <span className="text-6xl font-black text-[var(--duo-correct)] tracking-tight">
              {totalScore} <span className="text-xl font-bold text-muted-foreground">/ 990</span>
            </span>
            <p className="text-xs text-muted-foreground font-black uppercase mt-1">Điểm TOEIC ước tính</p>
          </div>

          {/* Listening & Reading breakout cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-muted/50 p-5 rounded-2xl border-2 border-[var(--duo-gray)] flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Phần Listening</span>
                <p className="text-2xl font-black text-[var(--duo-blue)]">{listeningScore} điểm</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Đúng {latestResult?.listening_correct ?? 0}/{questions.filter(q => q.part_number <= 4).length || 100} câu
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--duo-blue)]/10 rounded-full flex items-center justify-center text-xl text-[var(--duo-blue)]">🎧</div>
            </div>

            <div className="bg-muted/50 p-5 rounded-2xl border-2 border-[var(--duo-gray)] flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Phần Reading</span>
                <p className="text-2xl font-black text-[var(--duo-correct)]">{readingScore} điểm</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">
                  Đúng {latestResult?.reading_correct ?? 0}/{questions.filter(q => q.part_number >= 5).length || 100} câu
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--duo-correct)]/10 rounded-full flex items-center justify-center text-xl text-[var(--duo-correct)]">📖</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-muted-foreground pt-4 border-t border-[var(--duo-gray)]">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--duo-correct)]" /> Tổng đúng: {correct}/{totalQCount} câu</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--duo-blue)]" /> Thời gian: {timeMin} phút {timeSec} giây</span>
            {latestResult?.pause_count ? (
              <span className="badge-duo badge-yellow">Tạm dừng {latestResult.pause_count} lần</span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to={`/courses/${courseId}/fulltest`} className="btn-3d btn-3d-white py-3 px-6 text-sm font-bold">
            ← Danh sách bộ đề
          </Link>
          <button
            onClick={() => setShowReview(true)}
            className="btn-3d btn-3d-primary py-3 px-6 text-sm font-black flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Xem giải chi tiết
          </button>
          <Link to={`/courses/${courseId}/fulltest/${testId}`} className="btn-3d btn-3d-blue py-3 px-6 text-sm font-bold">
            🔄 Làm lại đề này
          </Link>
        </div>

        {/* Detailed stats by part */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Thống kê kết quả theo từng Phần (Part)
          </h2>

          <div className="card-duo overflow-hidden bg-white border-2 border-[var(--duo-gray)] rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--duo-gray)] bg-slate-50">
                  <th className="text-left p-4 font-black text-foreground">Phần thi (Part)</th>
                  <th className="text-center p-4 font-black text-foreground">Đúng / Tổng câu</th>
                  <th className="text-left p-4 font-black text-foreground">Tiến độ đúng</th>
                  <th className="text-center p-4 font-black text-foreground">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {partStats.map(stat => {
                  const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  return (
                    <tr key={stat.part} className="border-b-2 border-[var(--duo-gray)] last:border-0 hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-foreground">
                        {stat.name}
                      </td>
                      <td className="p-4 text-center font-extrabold text-slate-800">
                        {stat.correct} / {stat.total}
                      </td>
                      <td className="p-4 w-1/3">
                        <div className="flex items-center gap-3">
                          <div className="progress-duo flex-1">
                            <div
                              className="progress-duo-fill"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 80 ? "var(--duo-correct)" : pct >= 50 ? "var(--duo-blue)" : "var(--duo-red)"
                              }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-700 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "badge-duo text-[10px] uppercase font-black tracking-widest",
                          pct >= 80 ? "badge-green" : pct >= 50 ? "badge-blue" : "badge-orange"
                        )}>
                          {pct >= 80 ? "Tốt" : pct >= 50 ? "Trung bình" : "Cần ôn thêm"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default FullTestResult;
