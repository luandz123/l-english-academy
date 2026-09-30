import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  ChevronLeft,
  Clock,
  AlertTriangle,
  Volume2,
  ShieldAlert,
  LayoutGrid,
  Bookmark,
  BookmarkCheck,
  Headphones,
  BookOpen,
  Check,
  Sparkles,
  Settings2,
  CheckCircle2
} from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { useGamification, XP_REWARDS } from "@/hooks/useGamification";

const partMeta: Record<number, { name: string; shortName: string; section: "listening" | "reading"; desc: string; defaultCount: number; defaultTime: number }> = {
  1: { name: "Part 1: Photo Description", shortName: "Part 1", section: "listening", desc: "Mô tả hình ảnh", defaultCount: 6, defaultTime: 3 },
  2: { name: "Part 2: Question & Response", shortName: "Part 2", section: "listening", desc: "Hỏi & Đáp", defaultCount: 25, defaultTime: 10 },
  3: { name: "Part 3: Conversations", shortName: "Part 3", section: "listening", desc: "Đoạn hội thoại", defaultCount: 39, defaultTime: 16 },
  4: { name: "Part 4: Short Talks", shortName: "Part 4", section: "listening", desc: "Bài nói ngắn", defaultCount: 30, defaultTime: 16 },
  5: { name: "Part 5: Incomplete Sentences", shortName: "Part 5", section: "reading", desc: "Điền vào câu", defaultCount: 30, defaultTime: 15 },
  6: { name: "Part 6: Text Completion", shortName: "Part 6", section: "reading", desc: "Điền đoạn văn", defaultCount: 16, defaultTime: 10 },
  7: { name: "Part 7: Reading Comprehension", shortName: "Part 7", section: "reading", desc: "Đọc hiểu đoạn văn", defaultCount: 54, defaultTime: 50 },
};

const partShortNames = ["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"];

// Thang quy đổi điểm TOEIC chuẩn (100 câu)
const getToeicListeningScore = (correct: number): number => {
  if (correct <= 5) return 5;
  if (correct >= 96) return 495;
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
  const { addXp } = useGamification();

  // Selection & Configuration States
  const [started, setStarted] = useState(false);
  const [testMode, setTestMode] = useState<"exam" | "practice">("exam");
  const [selectedParts, setSelectedParts] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number | null>(null);

  // Exam runtime states
  const [volumeChecked, setVolumeChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // key: sessionIdx, value: answerId
  const [flagged, setFlagged] = useState<Set<number>>(new Set()); // key: sessionIdx
  const [paletteFilter, setPaletteFilter] = useState<"all" | "done" | "flagged" | "todo">("all");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({}); // key: questionId, value: true/false (practice mode)
  const [currentPart, setCurrentPart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  const DRAFT_KEY = `lenglish_fulltest_draft_v1_${user?.id || 'guest'}_${testId}`;
  const [savedDraftInfo, setSavedDraftInfo] = useState<{
    answeredCount: number;
    timeLeft: number;
    savedAt: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const volumeAudioRef = useRef<HTMLAudioElement>(null);
  const submittingRef = useRef(false);
  const answersRef = useRef<Record<number, number>>({});
  const flaggedRef = useRef<Set<number>>(new Set());
  const timeLeftRef = useRef(timeLeft);
  const elapsedTimeRef = useRef(elapsedTime);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { elapsedTimeRef.current = elapsedTime; }, [elapsedTime]);

  // Check saved draft on mount with 24-hour expiration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (!parsed.savedAt || Date.now() - parsed.savedAt > TWENTY_FOUR_HOURS) {
          localStorage.removeItem(DRAFT_KEY);
          setSavedDraftInfo(null);
          setShowDraftDialog(false);
          return;
        }
        if (parsed && parsed.answers && Object.keys(parsed.answers).length > 0) {
          setSavedDraftInfo({
            answeredCount: Object.keys(parsed.answers).length,
            timeLeft: parsed.timeLeft ?? 120 * 60,
            savedAt: parsed.savedAt || Date.now(),
          });
          setShowDraftDialog(true);
        }
      }
    } catch (e) {
      console.error("Failed to parse draft", e);
    }
  }, [DRAFT_KEY]);

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.answers) setAnswers(parsed.answers);
      if (parsed.flagged) setFlagged(new Set(parsed.flagged));
      if (parsed.timeLeft !== undefined) setTimeLeft(parsed.timeLeft);
      if (parsed.elapsedTime !== undefined) setElapsedTime(parsed.elapsedTime);
      if (parsed.testMode) setTestMode(parsed.testMode);
      if (parsed.selectedParts) setSelectedParts(parsed.selectedParts);
      if (parsed.customTimeMinutes !== undefined) setCustomTimeMinutes(parsed.customTimeMinutes);
      setVolumeChecked(true);
      setStarted(true);
      setIsPaused(true); // Khôi phục ở trạng thái tạm dừng để người dùng chủ động bấm tiếp tục
      setShowDraftDialog(false);
      toast({
        title: "Đã khôi phục bài làm dở",
        description: `Đã khôi phục ${Object.keys(parsed.answers || {}).length} câu trả lời của bạn (đang tạm dừng).`,
      });
    } catch (e) {
      console.error("Failed to restore draft", e);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setSavedDraftInfo(null);
    setShowDraftDialog(false);
    toast({
      title: "Đã xóa bài làm dở",
      description: "Bạn có thể bắt đầu bài thi mới.",
    });
  };

  // Autosave draft on answers/flagged change (debounced ~1s)
  useEffect(() => {
    if (!started || submitting || Object.keys(answers).length === 0) return;
    const timer = setTimeout(() => {
      try {
        const draft = {
          testId: Number(testId),
          answers,
          flagged: Array.from(flagged),
          timeLeft,
          elapsedTime,
          testMode,
          selectedParts,
          customTimeMinutes,
          started: true,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error("Failed to autosave test draft", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [answers, flagged, timeLeft, elapsedTime, started, submitting, testId, testMode, selectedParts, customTimeMinutes, DRAFT_KEY]);

  // Periodic autosave every 15s for clock
  useEffect(() => {
    if (!started || submitting || isPaused || Object.keys(answersRef.current).length === 0) return;
    const interval = setInterval(() => {
      try {
        const draft = {
          testId: Number(testId),
          answers: answersRef.current,
          flagged: Array.from(flaggedRef.current),
          timeLeft: timeLeftRef.current,
          elapsedTime: elapsedTimeRef.current,
          testMode,
          selectedParts,
          customTimeMinutes,
          started: true,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error("Failed to periodic save test draft", e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [started, submitting, isPaused, DRAFT_KEY, testId, testMode, selectedParts, customTimeMinutes]);

  // BeforeUnload guard
  useEffect(() => {
    if (!started || submitting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Bạn có bài làm dở chưa nộp. Dữ liệu đã được lưu tự động nhưng hãy cẩn thận!";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [started, submitting]);

  // Popstate / Back button protection
  useEffect(() => {
    if (!started || submitting) return;
    window.history.pushState({ inExam: true }, "");
    const handlePopState = () => {
      window.history.pushState({ inExam: true }, "");
      setShowExitConfirm(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [started, submitting]);

  // Fetch Test Info
  const { data: testInfo, isLoading: loadingTest } = useQuery({
    queryKey: ["full-test", testId],
    queryFn: async () => {
      const { data } = await supabase.from("full_tests").select("*").eq("id", Number(testId)).maybeSingle();
      return data;
    },
  });

  // Check enrollment
  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ["fulltest-enrollment", courseId, user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) return { enrolled: true };
      const { data: course } = await supabase
        .from("courses")
        .select("is_free")
        .eq("id", Number(courseId))
        .maybeSingle();
      if (course?.is_free) return { enrolled: true };
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

  // Fetch All Questions of this Full Test
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["full-test-questions", testId],
    queryFn: async () => {
      const { data: sections, error: secErr } = await supabase
        .from("full_test_sections")
        .select("part_number, quiz_id")
        .eq("test_id", Number(testId));

      if (secErr || !sections || sections.length === 0) return [];

      const quizIds = sections.map(s => s.quiz_id).filter(Boolean) as number[];
      if (quizIds.length === 0) return [];

      const { data: questions, error: qErr } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .in("quiz_id", quizIds);

      if (qErr || !questions) return [];

      const mapped = questions.map((q: any) => {
        const sec = sections.find(s => s.quiz_id === q.quiz_id);
        const part = sec ? sec.part_number : 5;
        return {
          ...q,
          part_number: part,
          answers: (q.answers || []).sort((a: any, b: any) => a.display_order - b.display_order),
        };
      });

      // Sort globally: by part_number, then by display_order
      mapped.sort((a, b) => {
        if (a.part_number !== b.part_number) return a.part_number - b.part_number;
        return a.display_order - b.display_order;
      });

      return mapped;
    },
    enabled: !!testId,
  });

  // Count available questions per Part in this test
  const questionsPerPart = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    allQuestions.forEach((q: any) => {
      if (counts[q.part_number] !== undefined) {
        counts[q.part_number]++;
      }
    });
    return counts;
  }, [allQuestions]);

  // Filter questions according to user's selected parts
  const examQuestions = useMemo(() => {
    if (!allQuestions || allQuestions.length === 0) return [];
    const filtered = allQuestions.filter((q: any) => selectedParts.includes(q.part_number));
    return filtered.map((q: any, sessionIdx: number) => {
      // Find global index in the full 200-question test
      const originalGlobalIdx = allQuestions.findIndex((orig: any) => orig.id === q.id) + 1;
      return {
        ...q,
        sessionIdx,
        originalGlobalIdx: originalGlobalIdx > 0 ? originalGlobalIdx : sessionIdx + 1,
      };
    });
  }, [allQuestions, selectedParts]);

  // Calculate default recommended time in minutes for selected parts
  const recommendedMinutes = useMemo(() => {
    if (selectedParts.length === 7) return 120;
    const isOnlyListening = selectedParts.every(p => p <= 4);
    if (isOnlyListening && selectedParts.length === 4) return 45;
    const isOnlyReading = selectedParts.every(p => p >= 5);
    if (isOnlyReading && selectedParts.length === 3) return 75;

    // Sum of part times based on questions ratio
    let totalMinutes = 0;
    selectedParts.forEach(p => {
      const pInfo = partMeta[p];
      if (pInfo) {
        const count = questionsPerPart[p] || pInfo.defaultCount;
        totalMinutes += Math.round(count * (pInfo.defaultTime / (pInfo.defaultCount || 1)));
      }
    });
    return Math.max(5, totalMinutes || Math.round(examQuestions.length * 0.6));
  }, [selectedParts, questionsPerPart, examQuestions.length]);

  // Actual time limit to use when starting
  const effectiveTimeMinutes = customTimeMinutes ?? recommendedMinutes;

  // Toggle single part selection
  const togglePart = (partNum: number) => {
    setSelectedParts(prev => {
      if (prev.includes(partNum)) {
        if (prev.length === 1) return prev; // At least 1 part must be selected
        return prev.filter(p => p !== partNum).sort((a, b) => a - b);
      } else {
        return [...prev, partNum].sort((a, b) => a - b);
      }
    });
  };

  // Quick preset selections
  const selectAllParts = () => setSelectedParts([1, 2, 3, 4, 5, 6, 7]);
  const selectListeningOnly = () => setSelectedParts([1, 2, 3, 4]);
  const selectReadingOnly = () => setSelectedParts([5, 6, 7]);
  const selectSinglePart = (partNum: number) => setSelectedParts([partNum]);

  const hasListeningParts = useMemo(() => {
    return examQuestions.some((q: any) => q.part_number <= 4);
  }, [examQuestions]);

  const needsSoundCheck = !volumeChecked && testMode === "exam" && hasListeningParts;

  const sampleAudioUrl = useMemo(() => {
    const qWithAudio = examQuestions.find((q: any) => q.audio_url);
    return qWithAudio?.audio_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  }, [examQuestions]);

  // Handle start test
  const handleStartExam = () => {
    if (selectedParts.length === 0) return;
    const initialTimeSeconds = Math.max(60, effectiveTimeMinutes * 60);
    setTimeLeft(initialTimeSeconds);
    autoSubmitTriggeredRef.current = false;
    submittingRef.current = false;
    setAnswers({});
    setFlagged(new Set());
    setCheckedAnswers({});
    setElapsedTime(0);
    setCurrentPart(selectedParts[0] - 1);
    setStarted(true);
  };

  const handleConfirmSoundCheck = () => {
    setVolumeChecked(true);
    if (testMode === "exam") {
      const initialTimeSeconds = Math.max(60, effectiveTimeMinutes * 60);
      setTimeLeft(initialTimeSeconds);
      autoSubmitTriggeredRef.current = false;
    }
  };

  // Flag toggle
  const toggleFlag = (sessionIdx: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(sessionIdx)) {
        next.delete(sessionIdx);
      } else {
        next.add(sessionIdx);
      }
      return next;
    });
  };

  // Auto-submit lock ref
  const autoSubmitTriggeredRef = useRef(false);

  // Timer Effect
  useEffect(() => {
    if (!started || isPaused || needsSoundCheck) return;
    const interval = setInterval(() => {
      if (testMode === "exam") {
        setTimeLeft(prev => {
          if (prev <= 1) {
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
  }, [started, testMode, isPaused, needsSoundCheck]);

  // Grouping logic for rendering questions in the exam scroller
  const groupedQuestions = useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any = null;

    examQuestions.forEach((q: any) => {
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

      currentGroup.questions.push({ ...q, cleanText: cleanQuestionText });
    });

    return groups;
  }, [examQuestions]);

  // Navigate to Part
  const goToPart = (partNum: number) => {
    setCurrentPart(partNum - 1);
    const firstQ = examQuestions.findIndex((q: any) => q.part_number === partNum);
    if (firstQ !== -1) {
      document.getElementById(`question-${firstQ}`)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectAnswer = (sessionIdx: number, answerId: number) => {
    playSound("click");
    setAnswers(prev => ({ ...prev, [sessionIdx]: answerId }));
  };

  // Submit Exam
  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    playSound("complete");

    const currentAnswers = answersRef.current;
    let totalCorrect = 0;
    let listeningCorrect = 0;
    let readingCorrect = 0;

    examQuestions.forEach((q: any, idx: number) => {
      const selectedId = currentAnswers[idx];
      const isCorrect = q.answers.find((a: any) => a.id === selectedId)?.is_correct;
      if (isCorrect) {
        totalCorrect++;
        if (q.part_number <= 4) listeningCorrect++;
        else readingCorrect++;
      }
    });

    const isFullTest = selectedParts.length === 7;
    const totalListeningInSession = examQuestions.filter((q: any) => q.part_number <= 4).length;
    const totalReadingInSession = examQuestions.filter((q: any) => q.part_number >= 5).length;

    const scaledListeningCorrect = totalListeningInSession > 0
      ? Math.min(100, Math.round((listeningCorrect / totalListeningInSession) * 100))
      : 0;
    const scaledReadingCorrect = totalReadingInSession > 0
      ? Math.min(100, Math.round((readingCorrect / totalReadingInSession) * 100))
      : 0;

    const listeningScore = getToeicListeningScore(scaledListeningCorrect);
    const readingScore = getToeicReadingScore(scaledReadingCorrect);
    const totalScore = isFullTest ? listeningScore + readingScore : Math.round((totalCorrect / Math.max(1, examQuestions.length)) * 990);
    const timeSpent = Math.max(0, testMode === "exam" ? effectiveTimeMinutes * 60 - timeLeft : elapsedTime);

    let resultId = null;
    if (user) {
      const answersPayload = {
        answers: currentAnswers,
        _meta: {
          selected_parts: selectedParts,
          test_mode: testMode,
          total_in_test: allQuestions.length,
          time_allocated_minutes: effectiveTimeMinutes,
        }
      };

      const { data: resData } = await supabase
        .from("user_full_test_results")
        .insert({
          user_id: user.id,
          test_id: Number(testId),
          correct_answers: totalCorrect,
          listening_score: listeningScore,
          reading_score: readingScore,
          total_score: totalScore,
          time_spent_seconds: timeSpent,
          total_questions: examQuestions.length,
          listening_correct: listeningCorrect,
          reading_correct: readingCorrect,
          pause_count: pauseCount,
          test_mode: testMode,
          answers_detail: answersPayload as any,
        })
        .select("id")
        .single();

      if (resData) {
        resultId = resData.id;
        const details = examQuestions.map((q: any, idx: number) => ({
          result_id: resultId,
          question_id: q.id,
          selected_answer_id: currentAnswers[idx] || null,
          is_correct: q.answers.find((a: any) => a.id === currentAnswers[idx])?.is_correct || false,
          part_number: q.part_number,
        }));

        await supabase.from("full_test_answer_details").insert(details);
      }
    }

    if (Object.keys(currentAnswers).length > 0) {
      addXp(XP_REWARDS.FULLTEST_SUBMIT, "Hoàn thành bài thi Full Test!");
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }

    submittingRef.current = false;
    setSubmitting(false);
    navigate(`/courses/${courseId}/fulltest/${testId}/result`, {
      replace: true,
      state: {
        resultId,
        score: totalCorrect,
        total: examQuestions.length,
        listeningScore,
        readingScore,
        totalScore,
        time: timeSpent,
        answers: currentAnswers,
        testMode,
        selectedParts,
      },
    });
  }, [examQuestions, selectedParts, testMode, effectiveTimeMinutes, timeLeft, elapsedTime, user, testId, courseId, pauseCount, allQuestions.length, navigate, playSound, addXp]);

  // Timer auto-submit handler
  useEffect(() => {
    if (started && !needsSoundCheck && autoSubmitTriggeredRef.current && !submittingRef.current) {
      autoSubmitTriggeredRef.current = false;
      submit();
    }
  }, [timeLeft, started, needsSoundCheck, submit]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = examQuestions.length - answeredCount;

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

  // Block access if not enrolled
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
            onClick={() => navigate(`/courses/${courseId}/fulltest`)}
            className="btn-3d btn-3d-primary w-full py-3 text-sm font-bold"
          >
            ← Quay lại danh sách đề thi
          </button>
        </div>
      </div>
    );
  }

  // 1. Pre-exam Configuration & Part Selection Page
  if (!started) {
    const isListeningSelected = selectedParts.some(p => p <= 4);
    const isReadingSelected = selectedParts.some(p => p >= 5);
    const totalSelectedQuestionsCount = examQuestions.length;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative font-sans">
        <button
          onClick={() => navigate(`/courses/${courseId}/fulltest`)}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-card border-2 border-[var(--duo-gray)] px-3.5 py-2 rounded-xl hover:border-[var(--duo-blue)] shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Danh sách đề thi
        </button>

        <div className="card-duo p-6 sm:p-8 max-w-3xl w-full bg-card shadow-2xl rounded-3xl border-2 border-[var(--duo-gray)] space-y-6 my-10">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[var(--duo-blue)] shadow-[0_4px_0_var(--duo-blue-dark)] flex items-center justify-center mx-auto text-3xl">
              🎯
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">{testInfo?.title ?? `Đề thi TOEIC`}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold max-w-xl mx-auto">
              {testInfo?.description || "Tùy chọn luyện thi toàn bộ đề 200 câu hoặc chọn riêng các phần (Parts) bạn muốn ôn luyện."}
            </p>
          </div>

          {/* Saved Draft Alert */}
          {savedDraftInfo && (
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-black text-amber-600 dark:text-amber-400 text-sm">
                  <span>⚡ Phát hiện bài thi chưa hoàn tất!</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Bạn có bài làm dở gồm <b>{savedDraftInfo.answeredCount} câu đã trả lời</b>, lưu lúc {new Date(savedDraftInfo.savedAt).toLocaleTimeString("vi-VN")}.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  onClick={discardDraft}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100 text-xs font-bold"
                >
                  Xóa bài dở
                </Button>
                <Button
                  type="button"
                  onClick={restoreDraft}
                  size="sm"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20"
                >
                  Tiếp tục làm bài 🚀
                </Button>
              </div>
            </div>
          )}

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> 1. Chọn chế độ làm bài
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTestMode("exam")}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                  testMode === "exam"
                    ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/5 shadow-[0_3px_0_var(--duo-correct-dark)]/20"
                    : "border-[var(--duo-gray)] hover:border-[var(--duo-blue)] bg-card"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", testMode === "exam" ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)]")}>
                    {testMode === "exam" && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                  </span>
                  <span className="font-black text-foreground text-sm">⏱ Thi thử (Exam Mode)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Bấm giờ làm bài. Xem điểm số và giải thích chi tiết sau khi nộp bài.</p>
              </button>

              <button
                type="button"
                onClick={() => setTestMode("practice")}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                  testMode === "practice"
                    ? "border-[var(--duo-correct)] bg-[var(--duo-correct)]/5 shadow-[0_3px_0_var(--duo-correct-dark)]/20"
                    : "border-[var(--duo-gray)] hover:border-[var(--duo-blue)] bg-card"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", testMode === "practice" ? "border-[var(--duo-correct)] bg-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)]")}>
                    {testMode === "practice" && <span className="w-2.5 h-2.5 rounded-full bg-white block" />}
                  </span>
                  <span className="font-black text-foreground text-sm">📚 Luyện tập (Practice Mode)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Không áp lực thời gian. Có thể bấm kiểm tra và xem ngay đáp án & lời giải từng câu.</p>
              </button>
            </div>
          </div>

          {/* Part Selection Section */}
          <div className="space-y-3 pt-1 border-t-2 border-[var(--duo-gray)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-primary" /> 2. Chọn phần thi (Parts) muốn làm
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={selectAllParts}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg border transition-all",
                    selectedParts.length === 7
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-sm"
                      : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                  )}
                >
                  🚀 Toàn bộ đề (7 Parts)
                </button>
                <button
                  type="button"
                  onClick={selectListeningOnly}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg border transition-all",
                    selectedParts.length === 4 && isListeningSelected && !isReadingSelected
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-sm"
                      : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                  )}
                >
                  🎧 Chỉ Listening
                </button>
                <button
                  type="button"
                  onClick={selectReadingOnly}
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-lg border transition-all",
                    selectedParts.length === 3 && isReadingSelected && !isListeningSelected
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-sm"
                      : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                  )}
                >
                  📖 Chỉ Reading
                </button>
              </div>
            </div>

            {/* Grid of Parts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Listening Column */}
              <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border-2 border-[var(--duo-gray)]">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-black text-[var(--duo-blue-dark)] uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5" /> Listening (Part 1 - 4)
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {[1, 2, 3, 4].reduce((sum, p) => sum + (questionsPerPart[p] || 0), 0)} câu
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map(part => {
                    const isSelected = selectedParts.includes(part);
                    const count = questionsPerPart[part] || partMeta[part].defaultCount;
                    return (
                      <div
                        key={part}
                        onClick={() => togglePart(part)}
                        className={cn(
                          "p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all select-none",
                          isSelected
                            ? "border-[var(--duo-blue)] bg-white shadow-sm ring-1 ring-[var(--duo-blue)]/20"
                            : "border-[var(--duo-gray)] bg-white/50 opacity-60 hover:opacity-100 hover:border-slate-400"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-[var(--duo-blue)] border-[var(--duo-blue)] text-white" : "border-[var(--duo-gray-dark)] bg-white"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground truncate">
                              {partMeta[part].shortName}: {partMeta[part].desc}
                            </p>
                          </div>
                        </div>
                        <span className="badge-duo badge-blue text-xs font-bold shrink-0 ml-2">
                          {count} câu
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reading Column */}
              <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border-2 border-[var(--duo-gray)]">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-black text-[var(--duo-correct-dark)] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Reading (Part 5 - 7)
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {[5, 6, 7].reduce((sum, p) => sum + (questionsPerPart[p] || 0), 0)} câu
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[5, 6, 7].map(part => {
                    const isSelected = selectedParts.includes(part);
                    const count = questionsPerPart[part] || partMeta[part].defaultCount;
                    return (
                      <div
                        key={part}
                        onClick={() => togglePart(part)}
                        className={cn(
                          "p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all select-none",
                          isSelected
                            ? "border-[var(--duo-correct)] bg-white shadow-sm ring-1 ring-[var(--duo-correct)]/20"
                            : "border-[var(--duo-gray)] bg-white/50 opacity-60 hover:opacity-100 hover:border-slate-400"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-[var(--duo-correct)] border-[var(--duo-correct)] text-white" : "border-[var(--duo-gray-dark)] bg-white"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground truncate">
                              {partMeta[part].shortName}: {partMeta[part].desc}
                            </p>
                          </div>
                        </div>
                        <span className="badge-duo badge-green text-xs font-bold shrink-0 ml-2">
                          {count} câu
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Time Limit Setting (Exam Mode Only) */}
          {testMode === "exam" && (
            <div className="space-y-2 pt-1 border-t-2 border-[var(--duo-gray)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> 3. Thời gian làm bài (Phút)
                </label>
                <span className="text-xs font-extrabold text-[var(--duo-blue-dark)]">
                  Thời gian chọn: {effectiveTimeMinutes} phút
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setCustomTimeMinutes(null)}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
                    customTimeMinutes === null
                      ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-sm"
                      : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                  )}
                >
                  ⚡ Đề xuất ({recommendedMinutes} phút)
                </button>

                {[15, 30, 45, 60, 75, 90, 120].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCustomTimeMinutes(mins)}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
                      customTimeMinutes === mins
                        ? "bg-[var(--duo-blue)] text-white border-[var(--duo-blue-dark)] shadow-sm"
                        : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                    )}
                  >
                    {mins}p
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Box & Start Action */}
          <div className="bg-slate-100 p-4 rounded-2xl border-2 border-[var(--duo-gray)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground text-sm sm:text-base">
                  Tổng {totalSelectedQuestionsCount} câu hỏi
                </span>
                <span className="badge-duo badge-blue text-xs font-black">
                  {selectedParts.length === 7 ? "Toàn bộ 7 Parts" : `Part ${selectedParts.join(", ")}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                {testMode === "exam" ? `Chế độ Thi thử • Giới hạn ${effectiveTimeMinutes} phút` : `Chế độ Luyện tập • Không giới hạn giờ`}
              </p>
            </div>

            <button
              disabled={selectedParts.length === 0 || totalSelectedQuestionsCount === 0}
              onClick={handleStartExam}
              className="btn-3d btn-3d-primary py-3.5 px-6 text-sm sm:text-base font-black tracking-wide shrink-0 disabled:opacity-50"
            >
              🚀 BẮT ĐẦU LÀM BÀI ({totalSelectedQuestionsCount} CÂU)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Sound test page (if Listening parts are included and exam mode / volume test not done)
  if (needsSoundCheck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-duo p-8 max-w-lg text-center space-y-6 bg-card rounded-2xl border-2">
          <div className="w-16 h-16 rounded-full bg-[var(--duo-blue)]/10 text-[var(--duo-blue)] flex items-center justify-center mx-auto text-3xl">
            <Volume2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Kiểm tra thiết bị âm thanh</h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Vui lòng kiểm tra tai nghe hoặc loa của bạn trước khi làm bài nghe Listening.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-[var(--duo-gray)] space-y-3">
            <audio
              ref={volumeAudioRef}
              src={sampleAudioUrl}
              controls
              className="w-full"
            />
            <button
              type="button"
              onClick={() => playSound("correct")}
              className="text-xs font-bold text-[var(--duo-blue)] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" /> Bấm nghe thử âm thanh kiểm tra
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleConfirmSoundCheck}
              className="btn-3d btn-3d-primary w-full py-3.5 text-base font-bold"
            >
              Âm thanh tốt, bắt đầu ngay!
            </button>
            <button
              onClick={() => {
                setStarted(false);
                setVolumeChecked(false);
              }}
              className="btn-3d btn-3d-white w-full py-2.5 text-xs font-bold text-muted-foreground"
            >
              ← Quay lại chọn phần thi
            </button>
          </div>
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
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border-2 border-[var(--duo-gray)] hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
            title="Thoát bài thi"
            aria-label="Thoát bài thi"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
            <span className="hidden sm:inline text-xs font-bold text-foreground">Thoát</span>
          </button>
          <div>
            <h1 className="font-extrabold text-sm lg:text-base hidden sm:block truncate max-w-xs">{testInfo?.title}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                Chế độ: {testMode === "exam" ? "Thi thử ⏱" : "Luyện tập 📚"}
              </span>
              <span className="badge-duo badge-blue text-xs py-0.5 px-2 font-bold">
                {selectedParts.length === 7 ? "Full 7 Parts" : `Part ${selectedParts.join(", ")}`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Part Tabs for selected parts */}
        <div className="hidden xl:flex items-center gap-1">
          {selectedParts.map(part => {
            const hasQuestions = examQuestions.some((q: any) => q.part_number === part);
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
            {answeredCount}/{examQuestions.length} đã trả lời
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
            className="btn-3d btn-3d-primary py-2 px-4 text-xs sm:text-sm font-black"
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
              <LayoutGrid className="w-4 h-4 text-[var(--duo-correct)]" /> Bảng câu hỏi ({answeredCount}/{examQuestions.length})
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
                    "text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all",
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
            {selectedParts.map(part => {
              const partQList = examQuestions.filter((q: any) => q.part_number === part);
              if (partQList.length === 0) return null;

              const filteredPartQs = examQuestions.filter((q: any) => {
                if (q.part_number !== part) return false;
                if (paletteFilter === "done") return answers[q.sessionIdx] !== undefined;
                if (paletteFilter === "flagged") return flagged.has(q.sessionIdx);
                if (paletteFilter === "todo") return answers[q.sessionIdx] === undefined;
                return true;
              });

              if (filteredPartQs.length === 0) return null;

              return (
                <div key={part} className="space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                    <span>{partShortNames[part - 1]}</span>
                    <span className="text-xs lowercase font-bold">({partQList.length} câu)</span>
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {examQuestions.map((q: any) => {
                      if (q.part_number !== part) return null;
                      if (paletteFilter === "done" && answers[q.sessionIdx] === undefined) return null;
                      if (paletteFilter === "flagged" && !flagged.has(q.sessionIdx)) return null;
                      if (paletteFilter === "todo" && answers[q.sessionIdx] !== undefined) return null;

                      const hasAns = answers[q.sessionIdx] !== undefined;
                      const isFlagged = flagged.has(q.sessionIdx);

                      return (
                        <button
                          key={q.sessionIdx}
                          onClick={() => {
                            setCurrentPart(part - 1);
                            document.getElementById(`question-${q.sessionIdx}`)?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={cn(
                            "w-10 h-10 text-xs font-bold rounded-xl border-2 transition-all flex items-center justify-center hover:-translate-y-0.5 relative cursor-pointer",
                            isFlagged ? "border-[var(--duo-orange)] ring-2 ring-[var(--duo-orange)]/30" : "",
                            hasAns
                              ? "bg-[var(--duo-correct)] text-white border-[var(--duo-correct)] shadow-[0_2px_0_var(--duo-correct-dark)]"
                              : "bg-white text-muted-foreground border-[var(--duo-gray)] hover:border-[var(--duo-blue)]"
                          )}
                        >
                          <span className="flex items-center justify-center gap-0.5">
                            <span>{q.sessionIdx + 1}</span>
                            {hasAns && <Check className="w-2.5 h-2.5 stroke-[3] text-white shrink-0" />}
                          </span>
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
                    <span className="badge-duo badge-blue">{partShortNames[group.part_number - 1]}</span>

                    {group.image_url && (
                      <div className="w-full flex justify-center bg-muted/20 rounded-xl overflow-hidden min-h-[160px] border-2 border-[var(--duo-gray)] p-1">
                        <img
                          src={group.image_url}
                          alt="Passage Context"
                          className="max-w-full h-auto rounded-lg mx-auto max-h-[350px] object-contain"
                          loading="lazy"
                        />
                      </div>
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
                  const selectedId = answers[q.sessionIdx];
                  const hasSelected = selectedId !== undefined;
                  const isFlagged = flagged.has(q.sessionIdx);

                  const isPart1 = q.part_number === 1;
                  const isPart2 = q.part_number === 2;

                  return (
                    <div
                      key={q.id}
                      id={`question-${q.sessionIdx}`}
                      className="card-duo p-6 bg-white border-2 border-[var(--duo-gray)] rounded-2xl space-y-4 relative scroll-mt-6"
                    >
                      <div className="flex justify-between items-center border-b-2 border-[var(--duo-gray)] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="badge-duo badge-orange font-black">
                            Câu {q.sessionIdx + 1}
                          </span>
                          {selectedParts.length < 7 && q.originalGlobalIdx && (
                            <span className="text-xs text-muted-foreground font-bold">
                              (Đề gốc: #{q.originalGlobalIdx})
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full">
                            {partShortNames[q.part_number - 1]}
                          </span>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => toggleFlag(q.sessionIdx)}
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
                        <div className="w-full flex justify-center bg-muted/20 rounded-xl overflow-hidden min-h-[140px] border-2 border-[var(--duo-gray)] p-1">
                          <img
                            src={q.image_url}
                            alt="Question Image"
                            className="max-w-full h-auto rounded-lg max-h-[280px] mx-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {q.audio_url && q.audio_url !== group.audio_url && (
                        <audio
                          controls
                          src={q.audio_url}
                          className="w-full max-w-md"
                          controlsList="nodownload"
                        />
                      )}

                      {/* Clean Text */}
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
                              onClick={() => handleSelectAnswer(q.sessionIdx, opt.id)}
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
                              {q.translation && (
                                <div className="p-3 bg-slate-50 border-2 rounded-xl text-xs font-medium text-slate-700">
                                  🇻🇳 <b>Dịch nghĩa:</b> {q.translation}
                                </div>
                              )}
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
          Danh sách câu hỏi ({answeredCount}/{examQuestions.length})
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
                { key: "all", label: `Tất cả (${examQuestions.length})` },
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
              {selectedParts.map(part => {
                const partQList = examQuestions.filter((q: any) => q.part_number === part);
                if (partQList.length === 0) return null;

                return (
                  <div key={part} className="space-y-2">
                    <p className="text-xs font-black text-muted-foreground uppercase">{partShortNames[part - 1]}</p>
                    <div className="flex flex-wrap gap-2">
                      {examQuestions.map((q: any) => {
                        if (q.part_number !== part) return null;
                        if (paletteFilter === "done" && answers[q.sessionIdx] === undefined) return null;
                        if (paletteFilter === "flagged" && !flagged.has(q.sessionIdx)) return null;
                        if (paletteFilter === "todo" && answers[q.sessionIdx] !== undefined) return null;

                        const hasAns = answers[q.sessionIdx] !== undefined;
                        const isFlagged = flagged.has(q.sessionIdx);

                        return (
                          <button
                            key={q.sessionIdx}
                            onClick={() => {
                              setCurrentPart(part - 1);
                              setMobilePaletteOpen(false);
                              setTimeout(() => {
                                document.getElementById(`question-${q.sessionIdx}`)?.scrollIntoView({ behavior: "smooth" });
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
                            <span className="flex items-center justify-center gap-0.5">
                              <span>{q.sessionIdx + 1}</span>
                              {hasAns && <Check className="w-2.5 h-2.5 stroke-[3] text-white shrink-0" />}
                            </span>
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
                <span>Số câu trong phần đã chọn:</span>
                <span className="font-extrabold text-foreground">{examQuestions.length} câu</span>
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
                className="btn-3d btn-3d-primary flex-1 py-2.5 text-sm font-black"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Exit Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-duo p-6 sm:p-8 max-w-md w-full bg-card border-2 text-center space-y-5 shadow-2xl">
            <span className="text-4xl block">⏸</span>
            <h2 className="text-xl font-black text-foreground">Tạm dừng hoặc Rời bài thi?</h2>
            
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Bạn đã hoàn thành <b>{answeredCount}/{examQuestions.length} câu</b>. Bài làm của bạn đã được tự động lưu tạm thời trên trình duyệt.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  navigate(`/courses/${courseId}/fulltest`, { replace: true });
                }}
                className="btn-3d btn-3d-primary w-full py-3 text-sm font-black"
              >
                💾 Tạm dừng &amp; Thoát (Lưu bài làm)
              </button>

              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem(DRAFT_KEY); } catch {}
                  setShowExitConfirm(false);
                  navigate(`/courses/${courseId}/fulltest`, { replace: true });
                }}
                className="py-2.5 text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline"
              >
                Hủy bài thi này (Không lưu)
              </button>

              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="btn-3d btn-3d-white w-full py-2.5 text-sm font-bold"
              >
                Ở lại làm tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Resume Dialog */}
      {showDraftDialog && savedDraftInfo && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="card-duo p-6 sm:p-8 max-w-md w-full bg-card border-2 text-center space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-2xl font-black">
              ⚡
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground">Bạn có bài đang làm dở</h3>
              <p className="text-sm text-muted-foreground font-medium">
                Bạn có bài đang làm dở ({savedDraftInfo.answeredCount} câu đã trả lời). Tiếp tục hay làm mới?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={discardDraft}
                variant="outline"
                className="flex-1 py-2.5 rounded-xl font-bold border-2"
              >
                Làm mới
              </Button>
              <Button
                type="button"
                onClick={restoreDraft}
                className="btn-3d btn-3d-primary flex-1 py-2.5 rounded-xl font-black"
              >
                Tiếp tục
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullTestExam;
