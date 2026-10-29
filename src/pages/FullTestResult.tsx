import StudentLayout from "@/components/StudentLayout";
import { useParams, useLocation, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getFullTestQuestions,
  getFullTestResult,
  getLatestFullTestResult,
  listFullTestAnswerDetails,
} from "@/lib/api/fullTest";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { CheckCircle, LayoutGrid, Clock, Award, Eye, ChevronLeft, Loader2, Headphones, BookOpen } from "lucide-react";
import ErrorState from "@/components/ErrorState";
import { StickyPartAudioPlayer } from "@/components/audio/StickyPartAudioPlayer";

const defaultPartTotals: Record<number, number> = {
  1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54
};

const partBreakdownMeta = [
  { part: 1, name: "Part 1: Photo Description", section: "listening" },
  { part: 2, name: "Part 2: Question & Response", section: "listening" },
  { part: 3, name: "Part 3: Conversations", section: "listening" },
  { part: 4, name: "Part 4: Short Talks", section: "listening" },
  { part: 5, name: "Part 5: Incomplete Sentences", section: "reading" },
  { part: 6, name: "Part 6: Text Completion", section: "reading" },
  { part: 7, name: "Part 7: Reading Comprehension", section: "reading" },
];

const partShortNames = ["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"];

const FullTestResult = () => {
  const { courseId, testId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as any;

  const [showReview, setShowReview] = useState(false);
  const [onlyShowIncorrect, setOnlyShowIncorrect] = useState(false);
  const [filterOnlyAttempted, setFilterOnlyAttempted] = useState(true);

  const handleAudioPlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const current = e.currentTarget;
    const allAudios = document.getElementsByTagName("audio");
    for (let i = 0; i < allAudios.length; i++) {
      if (allAudios[i] !== current && !allAudios[i].paused) {
        allAudios[i].pause();
      }
    }
  };

  // 1. Get resultId from state or query latest result from DB
  const stateResultId = state?.resultId;

  const { data: latestResult, isLoading: loadingResult, isError: isResultError, refetch: refetchResult } = useQuery({
    queryKey: ["latest-fulltest-result", user?.id, testId],
    queryFn: async () => {
      if (stateResultId) {
        const { data } = await getFullTestResult(stateResultId);
        return data;
      }
      const { data } = await getLatestFullTestResult(Number(testId));
      return data;
    },
    enabled: !!user,
  });

  const resultId = latestResult?.id;

  // 2. Fetch answer details for this result
  const { data: answerDetails = [], isLoading: loadingDetails, isError: isDetailsError, refetch: refetchDetails } = useQuery({
    queryKey: ["fulltest-answer-details", resultId],
    queryFn: async () => {
      const { data } = await listFullTestAnswerDetails(resultId!);
      return data || [];
    },
    enabled: !!resultId,
  });

  // 3. Fetch all questions & answers of this test
  const { data: questions = [], isLoading: loadingQuestions, isError: isQuestionsError, refetch: refetchQuestions } = useQuery({
    queryKey: ["fulltest-result-questions", testId, user?.id],
    queryFn: async () => {
      // Server kiểm quyền theo khóa của đề, trả câu kèm part_number đã sắp theo Part
      const { data } = await getFullTestQuestions(Number(testId));
      return data ?? [];
    },
    enabled: !!testId,
  });

  // Detect which parts were attempted in this test session
  const attemptedParts = useMemo(() => {
    if (state?.selectedParts && Array.isArray(state.selectedParts) && state.selectedParts.length > 0) {
      return state.selectedParts;
    }
    const metaParts = (latestResult?.answers_detail as any)?._meta?.selected_parts;
    if (Array.isArray(metaParts) && metaParts.length > 0) {
      return metaParts;
    }
    const detailsArray = Array.isArray(answerDetails) ? answerDetails : [];
    const partsInDetails = Array.from(new Set(detailsArray.map((d: any) => d.part_number).filter(Boolean))) as number[];
    if (partsInDetails.length > 0) {
      return partsInDetails.sort((a, b) => a - b);
    }
    return [1, 2, 3, 4, 5, 6, 7];
  }, [state?.selectedParts, latestResult?.answers_detail, answerDetails]);

  const isFullTest = attemptedParts.length === 7;
  const isOnlyListening = attemptedParts.length > 0 && attemptedParts.every(p => p <= 4);
  const isOnlyReading = attemptedParts.length > 0 && attemptedParts.every(p => p >= 5);
  const isSinglePart = attemptedParts.length === 1;

  // Map user answers: questionId -> selected_answer_id
  const answerLookup: Record<number, number | null> = {};
  const correctnessLookup: Record<number, boolean> = {};

  const detailsArray = Array.isArray(answerDetails) ? answerDetails : [];
  detailsArray.forEach(detail => {
    if (detail) {
      answerLookup[detail.question_id] = detail.selected_answer_id;
      correctnessLookup[detail.question_id] = !!detail.is_correct;
    }
  });

  // Calculate stats per Part
  const partStats = partBreakdownMeta.map(meta => {
    const partQuestions = questions.filter(q => q.part_number === meta.part);
    const isAttempted = attemptedParts.includes(meta.part);
    const correctCount = partQuestions.reduce((acc, q) => {
      return acc + (correctnessLookup[q.id] ? 1 : 0);
    }, 0);
    return {
      ...meta,
      isAttempted,
      correct: correctCount,
      total: partQuestions.length || defaultPartTotals[meta.part] || 0,
    };
  });

  // Grouping questions for detailed review
  const groupedQuestions = useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    questions.forEach((q: any, idx: number) => {
      const isPart34 = q.part_number === 3 || q.part_number === 4;
      const isPart67 = q.part_number === 6 || q.part_number === 7;

      let passageText = q.passage_text || "";
      let cleanQuestionText = q.question_text || "";

      if (cleanQuestionText.includes("[PASSAGE]")) {
        const parts = cleanQuestionText.split("[ENDPASSAGE]");
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
  }, [questions]);

  // Detect if any Part (1, 2, 3, 4) uses a single shared audio for all its questions
  const partAudioInfo = useMemo(() => {
    const map: Record<number, { isSinglePartAudio: boolean; audioUrl: string | null; count: number; questionRange: string }> = {};
    [1, 2, 3, 4].forEach(part => {
      const pQuestions = questions.filter((q: any) => q.part_number === part);
      const audioUrls = Array.from(new Set(pQuestions.map((q: any) => q.audio_url).filter(Boolean)));
      if (audioUrls.length === 1 && pQuestions.length > 1) {
        const firstIdx = questions.findIndex((q: any) => q.part_number === part) + 1;
        const lastIdx = firstIdx + pQuestions.length - 1;
        map[part] = { 
          isSinglePartAudio: true, 
          audioUrl: audioUrls[0] as string, 
          count: pQuestions.length,
          questionRange: `Câu ${firstIdx} - ${lastIdx}`
        };
      } else {
        map[part] = { isSinglePartAudio: false, audioUrl: null, count: pQuestions.length, questionRange: "" };
      }
    });
    return map;
  }, [questions]);

  // Organize groups by Part so sticky audio sticks for the whole Part in review mode
  const partSections = useMemo(() => {
    const sections: { partNumber: number; groups: any[] }[] = [];
    groupedQuestions.forEach((group: any) => {
      let lastSection = sections[sections.length - 1];
      if (!lastSection || lastSection.partNumber !== group.part_number) {
        lastSection = { partNumber: group.part_number, groups: [] };
        sections.push(lastSection);
      }
      lastSection.groups.push(group);
    });
    return sections;
  }, [groupedQuestions]);

  if (loadingResult || loadingQuestions || loadingDetails) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isResultError || isDetailsError || isQuestionsError) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <ErrorState
            onRetry={() => {
              refetchResult();
              refetchDetails();
              refetchQuestions();
            }}
          />
        </div>
      </StudentLayout>
    );
  }

  if (!latestResult) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 font-sans">
          <Award className="w-16 h-16 text-muted-foreground/40 mx-auto animate-bounce" />
          <h1 className="text-3xl font-black text-foreground">Không tìm thấy kết quả bài thi</h1>
          <p className="text-muted-foreground font-semibold max-w-md mx-auto">
            Có vẻ như bạn chưa hoàn thành bài thi này, hoặc phiên làm bài đã bị hủy. Hãy thử bắt đầu làm bài lại nhé!
          </p>
          <div className="pt-4">
            <Link
              to={`/courses/${courseId}/fulltest`}
              className="btn-3d btn-3d-primary font-black px-6 py-3"
            >
              Quay lại danh sách đề thi
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Determine score details
  const totalScore = latestResult?.total_score ?? 10;
  const correct = latestResult?.correct_answers ?? 0;
  const totalQCount = latestResult?.total_questions || questions.length || 200;
  const listeningScore = latestResult?.listening_score ?? 5;
  const readingScore = latestResult?.reading_score ?? 5;
  const timeSpent = latestResult?.time_spent_seconds ?? 0;
  const timeMin = Math.floor(timeSpent / 60);
  const timeSec = timeSpent % 60;
  const accuracyPct = totalQCount > 0 ? Math.round((correct / totalQCount) * 100) : 0;

  const getScoreEmoji = () => {
    if (accuracyPct >= 85) return "🏆";
    if (accuracyPct >= 70) return "🌟";
    if (accuracyPct >= 50) return "💪";
    return "📚";
  };

  const getHeaderTitle = () => {
    if (isFullTest) return "KẾT QUẢ ĐỀ THI FULL TEST TOEIC";
    if (isOnlyListening && attemptedParts.length === 4) return "KẾT QUẢ LUYỆN TẬP LISTENING (PART 1 - 4)";
    if (isOnlyReading && attemptedParts.length === 3) return "KẾT QUẢ LUYỆN TẬP READING (PART 5 - 7)";
    if (isSinglePart) return `KẾT QUẢ LUYỆN TẬP ${partShortNames[attemptedParts[0] - 1]}`;
    return `KẾT QUẢ LUYỆN TẬP (PART ${attemptedParts.join(", ")})`;
  };

  const scoreDisplay = {
    emoji: getScoreEmoji(),
    mainTitle: getHeaderTitle(),
    subtitle: accuracyPct >= 80 ? "Xuất sắc! Đạt độ chính xác cao" : accuracyPct >= 60 ? "Khá tốt! Đang tiến bộ rõ rệt" : "Cần tiếp tục ôn luyện thêm!"
  };

  // Review Details Subview
  if (showReview) {
    return (
      <div className="h-screen flex flex-col bg-[#050914] text-slate-100 overflow-hidden font-sans">
        {/* Ambient background glows matching homepage */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>
        {/* Sticky Header */}
        <header className="h-16 border-b border-cyan-500/20 shrink-0 bg-[#070e1c]/95 backdrop-blur-md z-20 flex items-center justify-between px-4 lg:px-8 shadow-soft-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReview(false)}
              className="p-2 rounded-xl bg-muted/60 border border-border/60 hover:bg-muted text-foreground transition-all duration-120 active:scale-95 cursor-pointer shadow-soft-xs"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-sm lg:text-base hidden sm:block truncate max-w-xs text-foreground">Giải thích chi tiết</h1>
              <span className="text-xs text-muted-foreground font-semibold">
                {isFullTest ? "Toàn bộ 200 câu" : `Các phần đã làm: Part ${attemptedParts.join(", ")}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isFullTest && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-muted/60 text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl border border-border/60 hover:bg-muted transition-all select-none hidden md:flex">
                <input
                  type="checkbox"
                  checked={filterOnlyAttempted}
                  onChange={(e) => setFilterOnlyAttempted(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span>Chỉ hiện Part đã làm</span>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-all select-none">
              <input
                type="checkbox"
                checked={onlyShowIncorrect}
                onChange={(e) => setOnlyShowIncorrect(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-600 cursor-pointer"
              />
              <span>Chỉ xem câu sai ❌</span>
            </label>

            <button
              onClick={() => setShowReview(false)}
              className="py-2 px-4 rounded-xl border border-border/70 bg-card hover:bg-muted text-xs sm:text-sm font-bold text-foreground transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer"
            >
              Đóng xem giải
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden w-full h-[calc(100vh-64px)]">
          {/* List of questions */}
          <div className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-10 scroll-smooth pb-32">
            {partSections.map((section) => {
              if (filterOnlyAttempted && !attemptedParts.includes(section.partNumber)) {
                return null;
              }

              const singlePartAudio = partAudioInfo[section.partNumber];

              return (
                <div key={section.partNumber} className="max-w-4xl mx-auto space-y-6 relative">
                  {/* Sticky single part audio player if entire part shares 1 audio */}
                  {singlePartAudio?.isSinglePartAudio && singlePartAudio.audioUrl && (
                    <StickyPartAudioPlayer
                      audioUrl={singlePartAudio.audioUrl}
                      partNumber={section.partNumber}
                      title={partShortNames[section.partNumber - 1]}
                      subtitle="File nghe chung cho toàn bộ câu hỏi trong Part này"
                      questionRange={singlePartAudio.questionRange}
                    />
                  )}

                  {section.groups.map((group: any, gIdx: number) => {
                    const questionsToRender = group.questions.filter((q: any) => {
                      const isCorrect = correctnessLookup[q.id];
                      if (onlyShowIncorrect) return !isCorrect;
                      return true;
                    });

                    if (questionsToRender.length === 0) return null;

                    return (
                      <div key={gIdx} className="space-y-5">
                        {/* Group Header Context */}
                        {(group.passage || (group.audio_url && !singlePartAudio?.isSinglePartAudio) || group.image_url) && (
                          <div className="p-5 sm:p-7 bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-4 rounded-2xl shadow-soft-sm">
                            <span className="badge-duo badge-blue font-bold text-xs">{partShortNames[group.part_number - 1]}</span>

                            {group.image_url && (
                              <div className="w-full flex justify-center bg-muted/20 rounded-xl overflow-hidden p-1 border border-border/50">
                                <img
                                  src={group.image_url}
                                  alt="Passage Context"
                                  className="max-w-full h-auto rounded-lg mx-auto max-h-[300px] object-contain image-safe"
                                />
                              </div>
                            )}

                            {group.audio_url && !singlePartAudio?.isSinglePartAudio && (
                              <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-soft-xs">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xl font-bold">
                                  🎧
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-muted-foreground mb-1">Audio nghe chung</p>
                                  <audio
                                    controls
                                    src={group.audio_url}
                                    className="w-full h-8"
                                    controlsList="nodownload"
                                    onPlay={handleAudioPlay}
                                  />
                                </div>
                              </div>
                            )}

                            {group.passage && (
                              <div 
                                className="prose prose-sm max-w-none text-foreground font-medium bg-card p-5 rounded-xl border border-border/60 leading-relaxed shadow-soft-xs"
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
                        className="p-6 bg-card border border-border/60 rounded-2xl space-y-4 relative scroll-mt-6 shadow-soft-sm"
                      >
                        {/* Status Label */}
                        <div className={cn(
                          "absolute top-0 right-0 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-bl-xl rounded-tr-2xl text-white shadow-soft-xs",
                          selectedId ? (isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground") : "bg-muted-foreground text-background"
                        )}>
                          {selectedId ? (isCorrect ? "Đúng ✓" : "Sai ✗") : "Chưa làm"}
                        </div>

                        <div className="flex justify-between items-center mr-24">
                          <span className="badge-duo badge-orange font-bold text-xs">
                            Câu {q.globalIdx + 1}
                          </span>
                          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider bg-muted/60 px-2.5 py-0.5 rounded-full">
                            {partShortNames[q.part_number - 1]}
                          </span>
                        </div>

                        {q.image_url && q.image_url !== group.image_url && (
                          <div className="w-full flex justify-center bg-muted/20 rounded-xl overflow-hidden p-1 border border-border/50">
                            <img
                              src={q.image_url}
                              alt="Question context"
                              className="max-w-full h-auto rounded-lg max-h-[250px] mx-auto object-contain image-safe"
                            />
                          </div>
                        )}

                        {q.audio_url && q.audio_url !== group.audio_url && !singlePartAudio?.isSinglePartAudio && (
                          <audio
                            controls
                            src={q.audio_url}
                            className="w-full max-w-md"
                            controlsList="nodownload"
                            onPlay={handleAudioPlay}
                          />
                        )}

                        {q.cleanText && !isPart1 && !isPart2 && (
                          <p className="text-base font-bold text-foreground leading-relaxed">
                            {q.cleanText}
                          </p>
                        )}

                        {/* Answers Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {q.answers.map((opt: any, oi: number) => {
                            const isSelected = selectedId === opt.id;
                            const isOptCorrect = opt.is_correct;

                            if (isPart2 && oi === 3) return null;

                            let optClass = "border-border/60 bg-card text-foreground";
                            let indicatorClass = "border-border/80 text-muted-foreground bg-muted/40";

                            if (isOptCorrect) {
                              optClass = "border-success/80 bg-success/10 text-success font-bold shadow-soft-xs";
                              indicatorClass = "border-success bg-success text-success-foreground";
                            } else if (isSelected) {
                              optClass = "border-destructive/80 bg-destructive/10 text-destructive font-bold shadow-soft-xs";
                              indicatorClass = "border-destructive bg-destructive text-destructive-foreground";
                            }

                            return (
                              <div
                                key={opt.id}
                                className={cn("w-full p-4 rounded-xl border text-sm transition-all duration-120 flex items-center", optClass)}
                              >
                                <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mr-3 font-bold text-sm", indicatorClass)}>
                                  {isOptCorrect ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + oi)}
                                </div>
                                <span className="flex-1 font-semibold leading-relaxed">
                                  {(isPart1 || isPart2) && !opt.answer_text ? (
                                    <span className="text-muted-foreground/40 select-none tracking-widest italic">••••••••</span>
                                  ) : (
                                    opt.answer_text
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Detailed Explanations */}
                        <div className="pt-3 border-t border-dashed border-border/60 space-y-2.5">
                          {q.translation && (
                            <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-xs font-medium text-foreground">
                              🇻🇳 <b className="font-bold text-foreground">Dịch nghĩa:</b> {q.translation}
                            </div>
                          )}
                          {(q.explanation || correctOpt?.explanation) && (
                            <div className="p-3 bg-success/10 border border-success/30 rounded-xl text-xs font-medium text-success">
                              💡 <b className="font-bold">Giải thích:</b> {q.explanation || correctOpt?.explanation}
                            </div>
                          )}
                          {q.transcript && (
                            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-medium text-primary">
                              📝 <b className="font-bold">Transcript:</b> {q.transcript}
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
              );
            })}
          </div>

          {/* Right Sidebar navigation (Desktop) */}
          <aside className="hidden lg:flex w-80 flex-col border-l border-border/60 bg-card h-full relative shrink-0 select-none shadow-soft-sm">
            <div className="p-5 border-b border-border/60 bg-muted/30">
              <h3 className="font-bold text-base flex items-center gap-2 mb-2 text-foreground">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Danh sách câu hỏi
              </h3>
              <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Đúng: {correct}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full" /> Sai: {totalQCount - correct}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map(part => {
                if (filterOnlyAttempted && !attemptedParts.includes(part)) return null;
                const partQList = questions.filter(q => q.part_number === part);
                if (partQList.length === 0) return null;

                return (
                  <div key={part} className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase block">
                      Part {part}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
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
                              "w-9 h-9 text-xs font-bold rounded-xl border transition-all duration-120 flex items-center justify-center active:scale-95 cursor-pointer shadow-soft-xs",
                              isAns
                                ? (isCorr ? "bg-emerald-600 text-white border-emerald-600" : "bg-rose-500 text-white border-rose-500")
                                : "bg-card text-muted-foreground border-border/70 hover:border-primary/50 hover:text-foreground"
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

  // 4. Score Dashboard View (Peak-End Rule & Modernized Stats)
  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-20 font-sans">
        {/* Banner Header with Peak-End Rule Polish */}
        <div className="p-8 text-center space-y-5 bg-[#070e1c]/90 text-card-foreground rounded-2xl shadow-soft-lg border border-cyan-500/20 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-success to-amber-400" />

          <div className="text-6xl mb-2 animate-bounce">{scoreDisplay.emoji}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{scoreDisplay.mainTitle}</h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs sm:text-sm uppercase tracking-wider">
            <span>✨</span>
            <span>{scoreDisplay.subtitle}</span>
          </div>

          {/* Main Score Callout */}
          <div className="flex flex-col items-center justify-center my-6">
            {isFullTest ? (
              <>
                <span className="text-6xl sm:text-7xl font-black text-success tracking-tight">
                  {totalScore} <span className="text-2xl font-bold text-muted-foreground">/ 990</span>
                </span>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-2">Điểm TOEIC ước tính</p>
              </>
            ) : isOnlyListening && attemptedParts.length === 4 ? (
              <>
                <span className="text-6xl sm:text-7xl font-black text-primary tracking-tight">
                  {listeningScore} <span className="text-2xl font-bold text-muted-foreground">/ 495</span>
                </span>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-2">Điểm Listening ước tính</p>
              </>
            ) : isOnlyReading && attemptedParts.length === 3 ? (
              <>
                <span className="text-6xl sm:text-7xl font-black text-success tracking-tight">
                  {readingScore} <span className="text-2xl font-bold text-muted-foreground">/ 495</span>
                </span>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-2">Điểm Reading ước tính</p>
              </>
            ) : (
              <>
                <span className="text-6xl sm:text-7xl font-black text-success tracking-tight">
                  {correct} <span className="text-2xl font-bold text-muted-foreground">/ {totalQCount}</span>
                </span>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-2">Số câu đúng ({accuracyPct}%)</p>
              </>
            )}
          </div>

          {/* Listening & Reading breakout cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className={cn(
              "p-5 rounded-2xl border flex items-center justify-between transition-all shadow-soft-xs",
              attemptedParts.some(p => p <= 4)
                ? "bg-primary/5 dark:bg-primary/10 border-primary/20"
                : "bg-muted/30 border-border/60 opacity-60"
            )}>
              <div className="text-left">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-primary" /> Phần Listening (Part 1 - 4)
                </span>
                {attemptedParts.some(p => p <= 4) ? (
                  <>
                    <p className="text-2xl font-extrabold text-primary mt-1">{listeningScore} điểm</p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Đúng {latestResult?.listening_correct ?? 0}/{questions.filter(q => q.part_number <= 4 && attemptedParts.includes(q.part_number)).length || 100} câu
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Không làm trong lần thi này</p>
                )}
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-xl text-primary shrink-0">🎧</div>
            </div>

            <div className={cn(
              "p-5 rounded-2xl border flex items-center justify-between transition-all shadow-soft-xs",
              attemptedParts.some(p => p >= 5)
                ? "bg-success/10 border-success/20"
                : "bg-muted/30 border-border/60 opacity-60"
            )}>
              <div className="text-left">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-success" /> Phần Reading (Part 5 - 7)
                </span>
                {attemptedParts.some(p => p >= 5) ? (
                  <>
                    <p className="text-2xl font-extrabold text-success mt-1">{readingScore} điểm</p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Đúng {latestResult?.reading_correct ?? 0}/{questions.filter(q => q.part_number >= 5 && attemptedParts.includes(q.part_number)).length || 100} câu
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground mt-2">Không làm trong lần thi này</p>
                )}
              </div>
              <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-xl text-success shrink-0">📖</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-muted-foreground pt-4 border-t border-border/60">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success" /> Tổng đúng: {correct}/{totalQCount} câu ({accuracyPct}%)</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Thời gian: {timeMin} phút {timeSec} giây</span>
            {latestResult?.pause_count ? (
              <span className="badge-duo badge-yellow text-xs font-bold">Tạm dừng {latestResult.pause_count} lần</span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons (Von Restorff Hierarchy) */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to={`/courses/${courseId}/fulltest`}
            className="py-3 px-6 rounded-xl border border-border/70 bg-card hover:bg-muted text-sm font-bold text-foreground transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer"
          >
            ← Danh sách bộ đề
          </Link>
          <button
            onClick={() => setShowReview(true)}
            className="py-3 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 transition-all duration-120 active:scale-95 shadow-soft-md cursor-pointer hover:bg-primary/90"
          >
            <Eye className="w-4 h-4" /> Xem giải chi tiết ({totalQCount} câu)
          </button>
          <Link
            to={`/courses/${courseId}/fulltest/${testId}`}
            className="py-3 px-6 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-sm font-bold transition-all duration-120 active:scale-95 shadow-soft-xs cursor-pointer"
          >
            🔄 Làm lại đề này
          </Link>
        </div>

        {/* Detailed stats by part */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Thống kê kết quả theo từng Phần (Part)
          </h2>

          <div className="overflow-hidden bg-card border border-border/60 rounded-2xl shadow-soft-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="text-left p-4 font-bold text-foreground">Phần thi (Part)</th>
                  <th className="text-center p-4 font-bold text-foreground">Đúng / Tổng câu</th>
                  <th className="text-left p-4 font-bold text-foreground">Tiến độ đúng</th>
                  <th className="text-center p-4 font-bold text-foreground">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {partStats.map(stat => {
                  const pct = stat.total > 0 && stat.isAttempted ? Math.round((stat.correct / stat.total) * 100) : 0;
                  return (
                    <tr key={stat.part} className={cn("border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors", !stat.isAttempted && "opacity-50")}>
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{stat.name}</span>
                          {!stat.isAttempted && (
                            <span className="badge-duo badge-white text-xs text-muted-foreground font-semibold">Không chọn</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-foreground">
                        {stat.isAttempted ? `${stat.correct} / ${stat.total}` : `- / ${stat.total}`}
                      </td>
                      <td className="p-4 w-1/3">
                        {stat.isAttempted ? (
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 bg-muted rounded-full flex-1 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: pct >= 80 ? "rgb(16, 185, 129)" : pct >= 50 ? "rgb(59, 130, 246)" : "rgb(239, 68, 68)"
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Không có dữ liệu</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {stat.isAttempted ? (
                          <span className={cn(
                            "badge-duo text-xs uppercase font-bold tracking-wider",
                            pct >= 80 ? "badge-green" : pct >= 50 ? "badge-blue" : "badge-orange"
                          )}>
                            {pct >= 80 ? "Tốt" : pct >= 50 ? "Trung bình" : "Cần ôn thêm"}
                          </span>
                        ) : (
                          <span className="badge-duo badge-white text-xs text-muted-foreground">
                            Chưa làm
                          </span>
                        )}
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
