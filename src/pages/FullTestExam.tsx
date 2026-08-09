import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft, Clock, AlertTriangle, CheckCircle, Volume2, Info, ShieldAlert, LayoutGrid, Bookmark, BookmarkCheck } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import StudentLayout from "@/components/StudentLayout";

const partNames = [
  "Part 1: Photo Description",
  "Part 2: Question & Response",
  "Part 3: Conversations",
  "Part 4: Short Talks",
  "Part 5: Incomplete Sentences",
  "Part 6: Text Completion",
  "Part 7: Reading Comprehension"
];

const partShortNames = ["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"];

// Thang quy đổi điểm TOEIC chuẩn (100 câu)
const getToeicListeningScore = (correct: number): number => {
  if (correct <= 5) return 5;
  if (correct >= 96) return 495;
  // Bảng quy đổi gần đúng
  const listeningScores: Record<number, number> = {
    6: 10, 7: 15, 8: 20, 9: 25, 10: 30, 11: 35, 12: 40, 13: 45, 14: 50, 15: 55,
    16: 60, 17: 65, 18: 70, 19: 75, 20: 80, 21: 85, 22: 90, 23: 95, 24: 100, 25: 110,
    26: 120, 27: 125, 28: 130, 29: 135, 30: 140, 31: 145, 32: 150, 33: 155, 34: 160, 35: 165,
    36: 170, 37: 175, 38: 180, 39: 185, 40: 190, 41: 195, 42: 200, 43: 205, 44: 210, 45: 215,
    46: 220, 47: 225, 48: 230, 49: 235, 50: 240, 51: 245, 52: 250, 53: 255, 54: 260, 55: 265,
    56: 270, 57: 275, 58: 280, 59: 285, 60: 290, 61: 295, 62: 300, 63: 305, 64: 310, 65: 315,
    66: 320, 67: 325, 68: 330, 69: 335, 70: 340, 71: 345, 72: 350, 73: 355, 74: 360, 75: 365,
    76: 370, 77: 375, 78: 380, 79: 385, 80: 390, 81: 395, 82: 400, 83: 405, 84: 410, 85: 415,
    86: 420, 87: 425, 88: 430, 89: 435, 90: 440, 91: 445, 92: 450, 93: 455, 94: 460, 95: 470
  };
  return listeningScores[correct] || Math.round((correct / 100) * 490) + 5;
};

const getToeicReadingScore = (correct: number): number => {
  if (correct <= 5) return 5;
  if (correct >= 97) return 495;
  // Bảng quy đổi gần đúng
  const readingScores: Record<number, number> = {
    6: 10, 7: 15, 8: 20, 9: 25, 10: 30, 11: 35, 12: 40, 13: 45, 14: 50, 15: 55,
    16: 60, 17: 65, 18: 70, 19: 75, 20: 80, 21: 85, 22: 90, 23: 95, 24: 100, 25: 110,
    26: 115, 27: 120, 28: 125, 29: 130, 30: 135, 31: 140, 32: 145, 33: 150, 34: 155, 35: 160,
    36: 165, 37: 170, 38: 175, 39: 180, 40: 185, 41: 190, 42: 195, 43: 200, 44: 205, 45: 210,
    46: 215, 47: 220, 48: 225, 49: 230, 50: 235, 51: 240, 52: 245, 53: 250, 54: 255, 55: 260,
    56: 265, 57: 270, 58: 275, 59: 280, 60: 285, 61: 290, 62: 295, 63: 300, 64: 305, 65: 310,
    66: 315, 67: 320, 68: 325, 69: 330, 70: 335, 71: 340, 72: 345, 73: 350, 74: 355, 75: 360,
    76: 365, 77: 370, 78: 375, 79: 380, 80: 385, 81: 390, 82: 395, 83: 400, 84: 405, 85: 410,
    86: 415, 87: 420, 88: 425, 89: 430, 90: 435, 91: 440, 92: 445, 93: 450, 94: 455, 95: 460,
    96: 470
  };
  return readingScores[correct] || Math.round((correct / 100) * 490) + 5;
};

const FullTestExam = () => {
  const { courseId, testId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { playSound } = useSound();

  // States
  const [started, setStarted] = useState(false);
  const [testMode, setTestMode] = useState<"exam" | "practice">("exam");
  const [volumeChecked, setVolumeChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // key: globalIndex, value: answerId
  const [flagged, setFlagged] = useState<Set<number>>(new Set()); // key: globalIndex
  const [paletteFilter, setPaletteFilter] = useState<"all" | "done" | "flagged" | "todo">("all");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({}); // key: questionId, value: true/false (luyện tập)
  const [currentPart, setCurrentPart] = useState(0); // 0 to 6
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [elapsedTime, setElapsedTime] = useState(0); // For practice mode
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const toggleFlag = (globalIdx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(globalIdx)) {
        next.delete(globalIdx);
      } else {
        next.add(globalIdx);
      }
      return next;
    });
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const volumeAudioRef = useRef<HTMLAudioElement>(null);
  // BUG FIX #2: useRef lock to prevent duplicate submits
  const submittingRef = useRef(false);
  // BUG FIX #1: Keep latest answers in ref for timer callback
  const answersRef = useRef<Record<number, number>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Fetch Test Info
  const { data: testInfo, isLoading: loadingTest } = useQuery({
    queryKey: ["full-test", testId],
    queryFn: async () => {
      const { data } = await supabase.from("full_tests").select("*").eq("id", Number(testId)).maybeSingle();
      return data;
    },
  });

  // BUG FIX #3: Check enrollment to prevent unauthorized access
  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ["fulltest-enrollment", courseId, user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) return { enrolled: true };
      // Check if course is free first
      const { data: course } = await supabase
        .from("courses")
        .select("is_free")
        .eq("id", Number(courseId))
        .maybeSingle();
      if (course?.is_free) return { enrolled: true };
      // Check enrollment
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user!.id)
        .eq("course_id", Number(courseId))
        .maybeSingle();
      return data ? { enrolled: true } : null;
    },
    enabled: !!user && !!courseId,
  });

  // Fetch Full Test Questions
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["full-test-questions", testId],
    queryFn: async () => {
      // 1. Get sections and quizzes
      const { data: sections, error: secErr } = await supabase
        .from("full_test_sections")
        .select("part_number, quiz_id")
        .eq("test_id", Number(testId));

      if (secErr || !sections || sections.length === 0) return [];

      const quizIds = sections.map(s => s.quiz_id).filter(Boolean) as number[];
      if (quizIds.length === 0) return [];

      // 2. Fetch questions and answers
      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .in("quiz_id", quizIds);

      if (qErr || !questions) return [];

      // Sort and map questions
      const mapped = questions.map((q: any) => {
        const sec = sections.find(s => s.quiz_id === q.quiz_id);
        const part = sec ? sec.part_number : 5; // default to 5 if not found
        return {
          ...q,
          part_number: part,
          answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
        };
      });

      // Sort globally: by part_number, then by questions.display_order
      mapped.sort((a, b) => {
        if (a.part_number !== b.part_number) return a.part_number - b.part_number;
        return a.display_order - b.display_order;
      });

      return mapped;
    },
    enabled: !!testId,
  });

  // BUG FIX #1: Use ref-based flag for timer auto-submit to avoid stale closure
  const autoSubmitTriggeredRef = useRef(false);

  // Timer Effect
  useEffect(() => {
    if (!started || isPaused) return;
    const interval = setInterval(() => {
      if (testMode === "exam") {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Set flag; actual submit happens in separate effect
            autoSubmitTriggeredRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsedTime(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [started, testMode, isPaused]);

  // BUG FIX #1: Separate effect to handle auto-submit with latest state
  useEffect(() => {
    if (autoSubmitTriggeredRef.current && !submittingRef.current) {
      autoSubmitTriggeredRef.current = false;
      submit();
    }
  }, [timeLeft]);

  // Grouping logic for rendering in the exam scroller
  const groupedQuestions = (() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    allQuestions.forEach((q: any, idx: number) => {
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
        // Gom nhóm theo group_id hoặc audio_url chung
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

  // Navigate to Part
  const goToPart = (partNum: number) => {
    setCurrentPart(partNum - 1);
    // Find the first global index of this part
    const firstQ = allQuestions.findIndex((q: any) => q.part_number === partNum);
    if (firstQ !== -1) {
      document.getElementById(`question-${firstQ}`)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectAnswer = (globalIdx: number, answerId: number) => {
    playSound("click");
    setAnswers(prev => ({ ...prev, [globalIdx]: answerId }));
  };

  // Submit Exam — BUG FIX #2: use ref lock to prevent duplicate submits
  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    playSound("complete");

    // BUG FIX #1: Use ref to get latest answers (for timer auto-submit)
    const currentAnswers = answersRef.current;

    let totalCorrect = 0;
    let listeningCorrect = 0;
    let readingCorrect = 0;

    allQuestions.forEach((q: any, idx: number) => {
      const selectedId = currentAnswers[idx];
      const isCorrect = q.answers.find((a: any) => a.id === selectedId)?.is_correct;
      if (isCorrect) {
        totalCorrect++;
        if (q.part_number <= 4) listeningCorrect++;
        else readingCorrect++;
      }
    });

    const listeningScore = getToeicListeningScore(listeningCorrect);
    const readingScore = getToeicReadingScore(readingCorrect);
    const totalScore = listeningScore + readingScore;
    const timeSpent = testMode === "exam" ? 120 * 60 - timeLeft : elapsedTime;

    let resultId = null;
    if (user) {
      // 1. Insert results
      const { data: resData, error: insertErr } = await supabase
        .from("user_full_test_results")
        .insert({
          user_id: user.id,
          test_id: Number(testId),
          correct_answers: totalCorrect,
          listening_score: listeningScore,
          reading_score: readingScore,
          total_score: totalScore,
          time_spent_seconds: timeSpent,
          total_questions: allQuestions.length,
          listening_correct: listeningCorrect,
          reading_correct: readingCorrect,
          pause_count: pauseCount,
          test_mode: testMode,
          answers_detail: currentAnswers as any,
        })
        .select("id")
        .single();

      if (resData) {
        resultId = resData.id;

        // 2. Insert answer details
        const details = allQuestions.map((q: any, idx: number) => ({
          result_id: resultId,
          question_id: q.id,
          selected_answer_id: currentAnswers[idx] || null,
          is_correct: q.answers.find((a: any) => a.id === currentAnswers[idx])?.is_correct || false,
          part_number: q.part_number,
        }));

        await supabase.from("full_test_answer_details").insert(details);
      }
    }

    submittingRef.current = false;
    setSubmitting(false);
    navigate(`/courses/${courseId}/fulltest/${testId}/result`, {
      state: {
        resultId,
        score: totalCorrect,
        total: allQuestions.length,
        listeningScore,
        readingScore,
        totalScore,
        time: timeSpent,
        answers: currentAnswers,
        testMode,
      },
    });
  }, [allQuestions, testMode, timeLeft, elapsedTime, user, testId, courseId, pauseCount, navigate, playSound]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = allQuestions.length - answeredCount;

  // Format Time Helper
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loadingTest || loadingQuestions || loadingEnrollment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // BUG FIX #3: Block access if not enrolled
  if (!enrollment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-duo p-8 max-w-md text-center space-y-5 bg-card rounded-2xl border-2">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[var(--duo-red)] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-foreground">Chưa đăng ký khóa học</h2>
          <p className="text-sm text-muted-foreground font-medium">
            Bạn cần đăng ký khóa học này trước khi có thể làm bài thi Full Test. Vui lòng liên hệ Admin để được hỗ trợ.
          </p>
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="btn-3d btn-3d-primary w-full py-3 text-sm font-bold"
          >
            ← Quay lại trang khóa học
          </button>
        </div>
      </div>
    );
  }

  // 1. Pre-exam Intro page
  if (!started) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        <button
          onClick={() => navigate(`/courses/${courseId}/fulltest`)}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-card border-2 border-[var(--duo-gray)] px-3 py-2 rounded-xl hover:border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-gray)]"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="card-duo p-8 max-w-2xl text-center space-y-6 bg-card shadow-xl rounded-2xl border-2">
          <div className="w-20 h-20 rounded-2xl bg-[var(--duo-blue)] shadow-[0_4px_0_var(--duo-blue-dark)] flex items-center justify-center mx-auto text-4xl">
            🏆
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{testInfo?.title ?? `Đề thi TOEIC`}</h1>
            <p className="text-sm text-muted-foreground font-semibold mt-1">
              {testInfo?.description || "Luyện thi với bộ đề thi thử chất lượng cao sát đề thi thật 2026."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left border-y-2 border-[var(--duo-gray)] py-5 my-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-xs text-muted-foreground font-bold">Số lượng câu hỏi</span>
              <p className="text-lg font-extrabold text-foreground">{allQuestions.length || 200} câu</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-xs text-muted-foreground font-bold">Thời gian làm bài</span>
              <p className="text-lg font-extrabold text-foreground">120 phút</p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-left text-foreground">Chọn chế độ làm bài:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTestMode("exam")}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  testMode === "exam"
                    ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/5"
                    : "border-[var(--duo-gray)] hover:border-[var(--duo-blue)] bg-card"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", testMode === "exam" ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)]")}>
                    {testMode === "exam" && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                  </span>
                  <span className="font-extrabold text-foreground text-sm">Thi thử (Exam Mode)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Làm bài tính giờ 120 phút. Chỉ xem giải thích sau khi nộp bài.</p>
              </button>

              <button
                type="button"
                onClick={() => setTestMode("practice")}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  testMode === "practice"
                    ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/5"
                    : "border-[var(--duo-gray)] hover:border-[var(--duo-blue)] bg-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", testMode === "practice" ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)]")}>
                    {testMode === "practice" && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                  </span>
                  <span className="font-extrabold text-foreground text-sm">Luyện tập (Practice Mode)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Không giới hạn thời gian. Có thể kiểm tra đáp án và xem giải thích chi tiết ngay.</p>
              </button>
            </div>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="btn-3d btn-3d-primary w-full py-4 text-lg font-black tracking-wide"
          >
            🚀 BẮT ĐẦU NGAY
          </button>
        </div>
      </div>
    );
  }

  // 2. Sound test page (if Listening parts and exam mode / volume test not done)
  if (!volumeChecked && testMode === "exam" && allQuestions.some((q: any) => q.part_number <= 4)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-duo p-8 max-w-lg text-center space-y-6 bg-card rounded-2xl border-2">
          <div className="w-16 h-16 rounded-full bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] flex items-center justify-center mx-auto text-3xl">
            <Volume2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Kiểm tra thiết bị âm thanh</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Vui lòng nghe thử đoạn âm thanh bên dưới để kiểm tra tai nghe hoặc loa ngoài của bạn trước khi làm bài nghe Listening.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-[var(--duo-gray)]">
            <audio
              ref={volumeAudioRef}
              src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
              controls
              className="w-full"
            />
          </div>

          <button
            onClick={() => setVolumeChecked(true)}
            className="btn-3d btn-3d-correct w-full py-3.5 text-base font-bold"
          >
            Âm thanh tốt, bắt đầu ngay!
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Exam View
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
      {/* Header Bar */}
      <header className="h-16 border-b-2 border-[var(--duo-gray)] shrink-0 bg-card z-20 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirm(true)}
            className="p-2 rounded-xl bg-slate-50 border-2 border-[var(--duo-gray)] hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">{testInfo?.title}</h1>
            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              Chế độ: {testMode === "exam" ? "Thi thử ⏱" : "Luyện tập 📚"}
            </span>
          </div>
        </div>

        {/* Quick Part Tabs */}
        <div className="hidden xl:flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map(part => {
            const hasQuestions = allQuestions.some((q: any) => q.part_number === part);
            if (!hasQuestions) return null;
            return (
              <button
                key={part}
                onClick={() => goToPart(part)}
                className={cn(
                  "px-3 py-1.5 text-xs font-black rounded-xl border-2 transition-all",
                  currentPart === part - 1
                    ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue)] shadow-[0_2px_0_var(--duo-blue-dark)]"
                    : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                )}
              >
                {partShortNames[part - 1]}
              </button>
            );
          })}
        </div>

        {/* Timer, Answer count and submit actions */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-muted-foreground hidden md:block">
            {answeredCount}/{allQuestions.length} đã trả lời
          </div>

          {testMode === "exam" ? (
            <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 text-[var(--duo-red)] px-3 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base">
              <Clock className="w-4 h-4 shrink-0 animate-pulse" />
              {formatTime(timeLeft)}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#DDF4FF] border-2 border-[#A8E0FD] text-[var(--duo-blue-dark)] px-3 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base">
              <Clock className="w-4 h-4 shrink-0" />
              {formatTime(elapsedTime)}
            </div>
          )}

          {/* Pause Button */}
          <button
            onClick={() => {
              setIsPaused(prev => !prev);
              if (!isPaused) setPauseCount(prev => prev + 1);
            }}
            className="btn-3d btn-3d-white py-1.5 px-3 text-xs"
          >
            {isPaused ? "Tiếp tục" : "Tạm dừng"}
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="btn-3d btn-3d-correct py-2 px-4 text-xs sm:text-sm font-black"
          >
            Nộp bài
          </button>
        </div>
      </header>

      {/* Pause Modal Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-duo p-8 max-w-md w-full bg-white border-2 text-center space-y-5">
            <span className="text-4xl block">⏸</span>
            <h2 className="text-xl font-black text-foreground">Đã tạm dừng bài thi</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Thời gian đang tạm ngưng. Hãy nhấn tiếp tục để tiếp tục trả lời các câu hỏi.
            </p>
            <button
              onClick={() => setIsPaused(false)}
              className="btn-3d btn-3d-primary w-full py-3 text-base font-bold"
            >
              TIẾP TỤC LÀM BÀI
            </button>
          </div>
        </div>
      )}

      {/* Main split content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Palette (Question Grid) */}
        <aside className="hidden lg:flex w-80 flex-col border-r-2 border-[var(--duo-gray)] bg-card shrink-0 select-none h-full">
          <div className="p-4 border-b-2 border-[var(--duo-gray)] space-y-3">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-[var(--duo-correct)]" /> Bảng câu hỏi ({answeredCount}/{allQuestions.length})
            </h3>
            
            {/* Filter chips */}
            <div className="flex gap-1">
              {[
                { key: "all", label: `Tất cả` },
                { key: "done", label: `Đã làm (${answeredCount})` },
                { key: "flagged", label: `🚩 (${flagged.size})` },
                { key: "todo", label: `Chưa làm (${unansweredCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setPaletteFilter(f.key as any)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all",
                    paletteFilter === f.key
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)]"
                      : "bg-muted text-muted-foreground border-transparent hover:border-[var(--duo-gray)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map(part => {
              const partQList = allQuestions.filter((q: any) => q.part_number === part);
              if (partQList.length === 0) return null;

              // Check if any question in this part matches filter
              const filteredPartQs = allQuestions.filter((q: any, gIdx: number) => {
                if (q.part_number !== part) return false;
                if (paletteFilter === "done") return answers[gIdx] !== undefined;
                if (paletteFilter === "flagged") return flagged.has(gIdx);
                if (paletteFilter === "todo") return answers[gIdx] === undefined;
                return true;
              });

              if (filteredPartQs.length === 0) return null;

              return (
                <div key={part} className="space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                    <span>{partShortNames[part - 1]}</span>
                    <span className="text-[10px] lowercase font-bold">({partQList.length} câu)</span>
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {allQuestions.map((q: any, globalIdx: number) => {
                      if (q.part_number !== part) return null;
                      if (paletteFilter === "done" && answers[globalIdx] === undefined) return null;
                      if (paletteFilter === "flagged" && !flagged.has(globalIdx)) return null;
                      if (paletteFilter === "todo" && answers[globalIdx] !== undefined) return null;

                      const hasAns = answers[globalIdx] !== undefined;
                      const isFlagged = flagged.has(globalIdx);

                      return (
                        <button
                          key={globalIdx}
                          onClick={() => {
                            setCurrentPart(part - 1);
                            document.getElementById(`question-${globalIdx}`)?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={cn(
                            "w-10 h-10 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center hover:-translate-y-0.5 relative cursor-pointer",
                            isFlagged ? "border-[var(--duo-orange)] ring-2 ring-[var(--duo-orange)]/30" : "",
                            hasAns
                              ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct)] shadow-[0_2px_0_var(--duo-correct-dark)]"
                              : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                          )}
                        >
                          {globalIdx + 1}
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--duo-orange)] border border-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Scrollable Questions List */}
        <main
          ref={scrollContainerRef}
          className="flex-1 h-full overflow-y-auto p-4 lg:p-8 space-y-8 scroll-smooth pb-36"
        >
          {groupedQuestions.map((group: any, gIdx: number) => {
            return (
              <div key={gIdx} className="max-w-4xl mx-auto space-y-5">
                {/* Group Headers & Passages / Shared Audio */}
                {(group.passage || group.audio_url || group.image_url) && (
                  <div className="card-duo p-5 sm:p-7 bg-slate-50 border-2 border-[var(--duo-gray)] rounded-2xl space-y-4">
                    {/* Part title inside card */}
                    <span className="badge-duo badge-blue">{partShortNames[group.part_number - 1]}</span>

                    {group.image_url && (
                      <img
                        src={group.image_url}
                        alt="Passage Context"
                        className="max-w-full h-auto rounded-xl border-2 border-[var(--duo-gray)] mx-auto max-h-[300px]"
                      />
                    )}

                    {group.audio_url && (
                      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border-2 border-[var(--duo-gray)]">
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

                {/* Sub Questions */}
                {group.questions.map((q: any) => {
                  const isChecked = checkedAnswers[q.id];
                  const selectedId = answers[q.globalIdx];
                  const hasSelected = selectedId !== undefined;
                  const isFlagged = flagged.has(q.globalIdx);

                  const isPart1 = q.part_number === 1;
                  const isPart2 = q.part_number === 2;

                  return (
                    <div
                      key={q.id}
                      id={`question-${q.globalIdx}`}
                      className="card-duo p-6 bg-white border-2 border-[var(--duo-gray)] rounded-2xl space-y-4 relative scroll-mt-6"
                    >
                      <div className="flex justify-between items-center border-b-2 border-[var(--duo-gray)] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="badge-duo badge-orange font-black">
                            Câu {q.globalIdx + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">
                            {partShortNames[q.part_number - 1]}
                          </span>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => toggleFlag(q.globalIdx)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border-2 transition-all cursor-pointer",
                            isFlagged
                              ? "border-[var(--duo-orange)] bg-[var(--duo-orange)]/10 text-[var(--duo-orange)] shadow-sm"
                              : "border-[var(--duo-gray)] text-muted-foreground hover:text-foreground hover:border-[var(--duo-orange)]"
                          )}
                        >
                          {isFlagged ? <BookmarkCheck className="w-3.5 h-3.5 fill-[var(--duo-orange)]" /> : <Bookmark className="w-3.5 h-3.5" />}
                          <span>{isFlagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}</span>
                        </button>
                      </div>

                      {q.image_url && q.image_url !== group.image_url && (
                        <img
                          src={q.image_url}
                          alt="Question Image"
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

                      {/* Clean Text (blank spaces format) */}
                      {q.cleanText && !isPart1 && !isPart2 && (
                        <p className="text-base font-extrabold text-foreground leading-relaxed">
                          {q.cleanText}
                        </p>
                      )}

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {q.answers.map((opt: any, oi: number) => {
                          const isSelected = selectedId === opt.id;
                          const isOptCorrect = opt.is_correct;

                          // Part 2 has only 3 choices A, B, C
                          if (isPart2 && oi === 3) return null;

                          let btnClass = "border-[var(--duo-gray)] bg-white text-foreground hover:border-[var(--duo-blue)]";
                          let indicatorClass = "border-[var(--duo-gray-dark)] text-muted-foreground";

                          if (isSelected) {
                            if (testMode === "practice" && isChecked) {
                              if (isOptCorrect) {
                                btnClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)]/10 shadow-[0_3px_0_var(--duo-correct-dark)]/20 font-bold";
                                indicatorClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white";
                              } else {
                                btnClass = "border-[var(--duo-red)] bg-red-50 shadow-[0_3px_0_#FFB3B3] font-bold";
                                indicatorClass = "border-[var(--duo-red)] bg-[var(--duo-red)] text-white";
                              }
                            } else {
                              btnClass = "border-[var(--duo-blue)] bg-[var(--duo-blue)]/10 shadow-[0_3px_0_var(--duo-blue-dark)]/20 font-bold";
                              indicatorClass = "border-[var(--duo-blue)] bg-[var(--duo-blue)] text-white";
                            }
                          } else if (testMode === "practice" && isChecked && isOptCorrect) {
                            btnClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)]/5 font-bold";
                            indicatorClass = "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white";
                          }

                          return (
                            <button
                              key={opt.id}
                              disabled={testMode === "practice" && isChecked}
                              onClick={() => handleSelectAnswer(q.globalIdx, opt.id)}
                              className={cn("w-full text-left p-4 rounded-xl border-2 text-sm transition-all flex items-center group disabled:opacity-90 active:scale-[0.99]", btnClass)}
                            >
                              <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors mr-3 font-extrabold text-sm", indicatorClass)}>
                                {String.fromCharCode(65 + oi)}
                              </div>
                              <span className="flex-1 font-bold">
                                {(isPart1 || isPart2) && !opt.answer_text ? (
                                  <span className="text-muted-foreground/30 italic font-medium select-none tracking-widest">••••••••</span>
                                ) : (
                                  opt.answer_text
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Practice Mode Actions & Explanations */}
                      {testMode === "practice" && (
                        <div className="pt-3 border-t border-dashed border-[var(--duo-gray)] flex flex-col gap-3">
                          {!isChecked ? (
                            <button
                              disabled={!hasSelected}
                              onClick={() => {
                                setCheckedAnswers(prev => ({ ...prev, [q.id]: true }));
                                playSound(q.answers.find((a: any) => a.id === selectedId)?.is_correct ? "correct" : "incorrect");
                              }}
                              className="btn-3d btn-3d-primary py-2 px-4 text-xs font-bold self-start disabled:opacity-50"
                            >
                              Kiểm tra đáp án
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {/* Show translation / transcript / explanation */}
                              {q.translation && (
                                <div className="p-3 bg-slate-50 border-2 rounded-xl text-xs font-medium text-slate-700">
                                  🇻🇳 <b>Dịch nghĩa:</b> {q.translation}
                                </div>
                              )}
                              {/* BUG FIX #5: Check both question-level and answer-level explanation */}
                              {(q.explanation || q.answers.find((a: any) => a.is_correct)?.explanation) && (
                                <div className="p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl text-xs font-medium text-emerald-800">
                                  💡 <b>Giải thích:</b> {q.explanation || q.answers.find((a: any) => a.is_correct)?.explanation}
                                </div>
                              )}
                              {q.transcript && (
                                <div className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl text-xs font-medium text-blue-800">
                                  📝 <b>Transcript:</b> {q.transcript}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </main>
      </div>

      {/* Fixed Bottom Palette for Mobile/Tablet (< lg) */}
      <footer className="h-16 border-t-2 border-[var(--duo-gray)] shrink-0 bg-card z-30 flex lg:hidden items-center justify-between px-4 sticky bottom-0">
        <button
          onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
          className="btn-3d btn-3d-white w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          Danh sách câu hỏi ({answeredCount}/{allQuestions.length})
          {flagged.size > 0 && <span className="text-[var(--duo-orange)] font-black">🚩 {flagged.size}</span>}
        </button>
      </footer>

      {/* Mobile Expandable Drawer */}
      {mobilePaletteOpen && (
        <div className="fixed inset-x-0 bottom-16 bg-card border-t-4 border-[var(--duo-blue)] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-40 max-h-[65vh] overflow-y-auto p-5 animate-in slide-in-from-bottom-5 lg:hidden rounded-t-3xl">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--duo-gray)]">
              <h3 className="font-extrabold text-sm text-foreground">Điều hướng câu hỏi đề thi</h3>
              <button onClick={() => setMobilePaletteOpen(false)} className="text-xs font-bold text-muted-foreground hover:text-foreground">Đóng ✕</button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { key: "all", label: `Tất cả (${allQuestions.length})` },
                { key: "done", label: `Đã làm (${answeredCount})` },
                { key: "flagged", label: `🚩 (${flagged.size})` },
                { key: "todo", label: `Chưa làm (${unansweredCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setPaletteFilter(f.key as any)}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all",
                    paletteFilter === f.key
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)]"
                      : "bg-muted text-muted-foreground border-transparent"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto p-1">
              {[1, 2, 3, 4, 5, 6, 7].map(part => {
                const partQList = allQuestions.filter((q: any) => q.part_number === part);
                if (partQList.length === 0) return null;

                return (
                  <div key={part} className="space-y-2">
                    <p className="text-xs font-black text-muted-foreground uppercase">{partShortNames[part - 1]}</p>
                    <div className="flex flex-wrap gap-2">
                      {allQuestions.map((q: any, globalIdx: number) => {
                        if (q.part_number !== part) return null;
                        if (paletteFilter === "done" && answers[globalIdx] === undefined) return null;
                        if (paletteFilter === "flagged" && !flagged.has(globalIdx)) return null;
                        if (paletteFilter === "todo" && answers[globalIdx] !== undefined) return null;

                        const hasAns = answers[globalIdx] !== undefined;
                        const isFlagged = flagged.has(globalIdx);

                        return (
                          <button
                            key={globalIdx}
                            onClick={() => {
                              setCurrentPart(part - 1);
                              setMobilePaletteOpen(false);
                              setTimeout(() => {
                                document.getElementById(`question-${globalIdx}`)?.scrollIntoView({ behavior: "smooth" });
                              }, 100);
                            }}
                            className={cn(
                              "w-11 h-11 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center relative",
                              isFlagged ? "border-[var(--duo-orange)] ring-2 ring-[var(--duo-orange)]/30" : "",
                              hasAns
                                ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct)] shadow-[0_2px_0_var(--duo-correct-dark)]"
                                : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                            )}
                          >
                            {globalIdx + 1}
                            {isFlagged && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--duo-orange)] border border-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-duo p-8 max-w-md w-full bg-white border-2 text-center space-y-5">
            <span className="text-4xl block">📢</span>
            <h2 className="text-xl font-black text-foreground">Bạn có chắc muốn nộp bài?</h2>
            
            <div className="bg-slate-50 p-4 rounded-xl text-sm font-bold text-slate-600 space-y-2 border-2 border-[var(--duo-gray)]">
              <div className="flex justify-between items-center">
                <span>Tổng số câu hỏi:</span>
                <span className="font-extrabold text-foreground">{allQuestions.length} câu</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Đã trả lời:</span>
                <span className="text-[var(--duo-correct)] font-extrabold">{answeredCount} câu</span>
              </div>
              {flagged.size > 0 && (
                <div className="flex justify-between items-center">
                  <span>Đang đánh dấu xem lại:</span>
                  <span className="text-[var(--duo-orange)] font-extrabold">{flagged.size} câu 🚩</span>
                </div>
              )}
              {unansweredCount > 0 && (
                <div className="pt-2 border-t border-[var(--duo-gray)] flex items-center justify-center gap-1.5 text-[var(--duo-red)] font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Còn {unansweredCount} câu chưa điền đáp án!</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-3d btn-3d-white flex-1 py-2.5 text-sm font-bold"
              >
                Làm tiếp
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="btn-3d btn-3d-correct flex-1 py-2.5 text-sm font-black"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default FullTestExam;
