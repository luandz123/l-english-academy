import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  getFullTest,
  getFullTestQuestions,
  submitFullTest,
} from "@/lib/api/fullTest";
import { getMyEnrollment } from "@/lib/api/learning";
import { getCourse } from "@/lib/api/catalog";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Volume1,
  ShieldAlert,
  LayoutGrid,
  Bookmark,
  BookmarkCheck,
  Headphones,
  BookOpen,
  Check,
  Sparkles,
  Settings2,
  CheckCircle2,
  Eye,
  EyeOff,
  Keyboard,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Flag,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/useSound";
import { useGamification, XP_REWARDS } from "@/hooks/useGamification";
import { StickyPartAudioPlayer } from "@/components/audio/StickyPartAudioPlayer";

// Metadata for TOEIC Parts
const partMeta: Record<
  number,
  {
    name: string;
    shortName: string;
    section: "listening" | "reading";
    desc: string;
    defaultCount: number;
    defaultTime: number;
    rangeStr: string;
  }
> = {
  1: { name: "Part 1: Photo Description", shortName: "Part 1", section: "listening", desc: "Mô tả hình ảnh", defaultCount: 6, defaultTime: 3, rangeStr: "1–6" },
  2: { name: "Part 2: Question & Response", shortName: "Part 2", section: "listening", desc: "Hỏi & Đáp", defaultCount: 25, defaultTime: 10, rangeStr: "7–31" },
  3: { name: "Part 3: Conversations", shortName: "Part 3", section: "listening", desc: "Đoạn hội thoại", defaultCount: 39, defaultTime: 16, rangeStr: "32–70" },
  4: { name: "Part 4: Short Talks", shortName: "Part 4", section: "listening", desc: "Bài nói ngắn", defaultCount: 30, defaultTime: 16, rangeStr: "71–100" },
  5: { name: "Part 5: Incomplete Sentences", shortName: "Part 5", section: "reading", desc: "Điền vào câu", defaultCount: 30, defaultTime: 15, rangeStr: "101–130" },
  6: { name: "Part 6: Text Completion", shortName: "Part 6", section: "reading", desc: "Điền đoạn văn", defaultCount: 16, defaultTime: 10, rangeStr: "131–146" },
  7: { name: "Part 7: Reading Comprehension", shortName: "Part 7", section: "reading", desc: "Đọc hiểu đoạn văn", defaultCount: 54, defaultTime: 50, rangeStr: "147–200" },
};

const partShortNames = ["Part 1", "Part 2", "Part 3", "Part 4", "Part 5", "Part 6", "Part 7"];


// Preset Types
type PresetKey = "full_ets" | "listening_sprint" | "reading_focus" | "custom";

const FullTestExam = () => {
  const { courseId, testId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { playSound } = useSound();
  const { addXp } = useGamification();
  const { toast } = useToast();

  // Selection & Configuration States
  const [started, setStarted] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>("full_ets");
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [testMode, setTestMode] = useState<"exam" | "practice">("exam");
  const [selectedParts, setSelectedParts] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<number | null>(null);

  // Exam runtime states
  const [volumeChecked, setVolumeChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // key: sessionIdx, value: answerId
  const [flagged, setFlagged] = useState<Set<number>>(new Set()); // key: sessionIdx
  const [activeSessionIdx, setActiveSessionIdx] = useState<number>(0);
  const [recentlySelectedKey, setRecentlySelectedKey] = useState<string | null>(null);
  const [palettePartTab, setPalettePartTab] = useState<number>(1);
  const [paletteFilter, setPaletteFilter] = useState<"all" | "done" | "flagged" | "todo">("all");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({}); // key: questionId, value: true/false (practice mode)
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerVisible, setTimerVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Audio Pre-check Interactive states
  const [audioPrecheckPlaying, setAudioPrecheckPlaying] = useState(false);
  const [audioPrecheckVolume, setAudioPrecheckVolume] = useState(0.85);
  const [audioPrecheckCountdown, setAudioPrecheckCountdown] = useState<number | null>(null);

  const DRAFT_KEY = `lenglish_fulltest_draft_v1_${user?.id || "guest"}_${testId}`;
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
  const autoSubmitTriggeredRef = useRef(false);

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
      if (parsed.selectedParts) {
        setSelectedParts(parsed.selectedParts);
        if (parsed.selectedParts[0]) setPalettePartTab(parsed.selectedParts[0]);
      }
      if (parsed.customTimeMinutes !== undefined) setCustomTimeMinutes(parsed.customTimeMinutes);
      setVolumeChecked(true);
      setStarted(true);
      setIsPaused(true);
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
      const { data } = await getFullTest(Number(testId));
      return data;
    },
  });

  // Check enrollment
  const { data: enrollment, isLoading: loadingEnrollment } = useQuery({
    queryKey: ["fulltest-enrollment", courseId, user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin) return { enrolled: true };
      const { data: course } = await getCourse(Number(courseId));
      if (course?.is_free) return { enrolled: true };
      // Ghi danh hết hạn → null (OPEN_QUESTIONS #18)
      const { data } = await getMyEnrollment(Number(courseId));
      return data ? { enrolled: true } : null;
    },
    enabled: !!user && !!courseId,
  });

  // Fetch All Questions of this Full Test
  const { data: allQuestions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["full-test-questions", testId, user?.id],
    queryFn: async () => {
      // Server kiểm quyền theo khóa của đề và trả câu kèm part_number, đã sắp theo Part
      const { data, error } = await getFullTestQuestions(Number(testId));
      if (error || !data) return [];
      return data;
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
      const originalGlobalIdx = allQuestions.findIndex((orig: any) => orig.id === q.id) + 1;
      return {
        ...q,
        sessionIdx,
        originalGlobalIdx: originalGlobalIdx > 0 ? originalGlobalIdx : sessionIdx + 1,
      };
    });
  }, [allQuestions, selectedParts]);

  // Detect single part shared audio
  const partAudioInfo = useMemo(() => {
    const map: Record<number, { isSinglePartAudio: boolean; audioUrl: string | null; count: number; questionRange: string }> = {};
    [1, 2, 3, 4].forEach((part) => {
      const pQuestions = examQuestions.filter((q: any) => q.part_number === part);
      const audioUrls = Array.from(new Set(pQuestions.map((q: any) => q.audio_url).filter(Boolean)));
      if (audioUrls.length === 1 && pQuestions.length > 1) {
        const firstIdx = pQuestions[0].sessionIdx + 1;
        const lastIdx = pQuestions[pQuestions.length - 1].sessionIdx + 1;
        map[part] = {
          isSinglePartAudio: true,
          audioUrl: audioUrls[0] as string,
          count: pQuestions.length,
          questionRange: `Câu ${firstIdx} - ${lastIdx}`,
        };
      } else {
        map[part] = { isSinglePartAudio: false, audioUrl: null, count: pQuestions.length, questionRange: "" };
      }
    });
    return map;
  }, [examQuestions]);

  // Calculate default recommended time in minutes for selected parts
  const recommendedMinutes = useMemo(() => {
    if (selectedParts.length === 7) return 120;
    const isOnlyListening = selectedParts.every((p) => p <= 4);
    if (isOnlyListening && selectedParts.length === 4) return 45;
    const isOnlyReading = selectedParts.every((p) => p >= 5);
    if (isOnlyReading && selectedParts.length === 3) return 75;

    let totalMinutes = 0;
    selectedParts.forEach((p) => {
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
    setActivePreset("custom");
    setSelectedParts((prev) => {
      if (prev.includes(partNum)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== partNum).sort((a, b) => a - b);
      } else {
        return [...prev, partNum].sort((a, b) => a - b);
      }
    });
  };

  // Quick Presets Actions (Hick's Law & Progressive Disclosure)
  const applyPreset = (preset: PresetKey) => {
    setActivePreset(preset);
    if (preset === "full_ets") {
      setSelectedParts([1, 2, 3, 4, 5, 6, 7]);
      setCustomTimeMinutes(120);
      setTestMode("exam");
      setPalettePartTab(1);
    } else if (preset === "listening_sprint") {
      setSelectedParts([1, 2, 3, 4]);
      setCustomTimeMinutes(45);
      setTestMode("exam");
      setPalettePartTab(1);
    } else if (preset === "reading_focus") {
      setSelectedParts([5, 6, 7]);
      setCustomTimeMinutes(75);
      setTestMode("exam");
      setPalettePartTab(5);
    } else {
      setShowCustomConfig(true);
    }
  };

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
    setActiveSessionIdx(0);
    setPalettePartTab(selectedParts[0] || 1);
    setStarted(true);
  };

  const handleAudioPlay = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const current = e.currentTarget;
    const allAudios = document.getElementsByTagName("audio");
    for (let i = 0; i < allAudios.length; i++) {
      if (allAudios[i] !== current && !allAudios[i].paused) {
        allAudios[i].pause();
      }
    }
  };

  // Pre-check countdown transition
  const handleConfirmSoundCheck = () => {
    if (volumeAudioRef.current) {
      volumeAudioRef.current.pause();
    }
    setAudioPrecheckPlaying(false);

    // 3-second countdown micro-interaction
    setAudioPrecheckCountdown(3);
  };

  useEffect(() => {
    if (audioPrecheckCountdown === null) return;
    if (audioPrecheckCountdown > 0) {
      const timer = setTimeout(() => {
        setAudioPrecheckCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (audioPrecheckCountdown === 0) {
      setVolumeChecked(true);
      setAudioPrecheckCountdown(null);
      if (testMode === "exam") {
        const initialTimeSeconds = Math.max(60, effectiveTimeMinutes * 60);
        setTimeLeft(initialTimeSeconds);
        autoSubmitTriggeredRef.current = false;
      }
    }
  }, [audioPrecheckCountdown, testMode, effectiveTimeMinutes]);

  // Flag toggle
  const toggleFlag = (sessionIdx: number) => {
    playSound("click");
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(sessionIdx)) {
        next.delete(sessionIdx);
      } else {
        next.add(sessionIdx);
      }
      return next;
    });
  };

  // Timer Effect
  useEffect(() => {
    if (!started || isPaused || needsSoundCheck) return;
    const interval = setInterval(() => {
      if (testMode === "exam") {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            autoSubmitTriggeredRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsedTime((prev) => prev + 1);
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
          questions: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.questions.push({ ...q, cleanText: cleanQuestionText });
    });

    return groups;
  }, [examQuestions]);

  // Organize groups by Part
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

  // Navigate to Question
  const goToQuestion = (sessionIdx: number) => {
    if (sessionIdx < 0 || sessionIdx >= examQuestions.length) return;
    setActiveSessionIdx(sessionIdx);
    const targetQ = examQuestions[sessionIdx];
    if (targetQ) {
      setPalettePartTab(targetQ.part_number);
    }
    const elem = document.getElementById(`question-${sessionIdx}`);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Navigate to Part
  const goToPart = (partNum: number) => {
    setPalettePartTab(partNum);
    const firstQ = examQuestions.findIndex((q: any) => q.part_number === partNum);
    if (firstQ !== -1) {
      goToQuestion(firstQ);
    }
  };

  // Optimistic UI for answer selection (< 50ms) with tactile micro-interaction
  const handleSelectAnswer = (sessionIdx: number, answerId: number) => {
    playSound("click");
    setRecentlySelectedKey(`${sessionIdx}-${answerId}`);
    setTimeout(() => {
      setRecentlySelectedKey(null);
    }, 80);

    // Immediate state update (Doherty threshold < 50ms)
    setAnswers((prev) => ({ ...prev, [sessionIdx]: answerId }));
    setActiveSessionIdx(sessionIdx);

    const q = examQuestions[sessionIdx];
    if (q && q.part_number !== palettePartTab) {
      setPalettePartTab(q.part_number);
    }
  };

  // Submit Exam
  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    playSound("complete");

    const currentAnswers = answersRef.current;
    const timeSpent = Math.max(0, testMode === "exam" ? effectiveTimeMinutes * 60 - timeLeft : elapsedTime);

    // Server chấm và quy đổi ETS; nộp lỗi → ở lại trang để nộp lại (như quiz, OPEN_QUESTIONS #22)
    const { data: result } = await submitFullTest(Number(testId), {
      answers: examQuestions.map((q: any, idx: number) => ({
        question_id: q.id,
        selected_answer_id: currentAnswers[idx] || null,
      })),
      selected_parts: selectedParts,
      test_mode: testMode,
      time_spent_seconds: timeSpent,
      pause_count: pauseCount,
      time_allocated_minutes: effectiveTimeMinutes,
      answers_map: currentAnswers,
    });
    if (!result) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    const resultId = result.id;
    const totalCorrect = result.correct_answers ?? 0;
    const listeningScore = result.listening_score ?? 0;
    const readingScore = result.reading_score ?? 0;
    const totalScore = result.total_score ?? 0;

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
  }, [examQuestions, selectedParts, testMode, effectiveTimeMinutes, timeLeft, elapsedTime, user, testId, courseId, pauseCount, allQuestions.length, navigate, playSound, addXp, DRAFT_KEY]);

  // Timer auto-submit handler
  useEffect(() => {
    if (started && !needsSoundCheck && autoSubmitTriggeredRef.current && !submittingRef.current) {
      autoSubmitTriggeredRef.current = false;
      submit();
    }
  }, [timeLeft, started, needsSoundCheck, submit]);

  // Universal Keyboard Shortcuts (International Exam Standards)
  useEffect(() => {
    if (!started || needsSoundCheck || showConfirm || showExitConfirm || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Navigation: J / ArrowRight = Next, K / ArrowLeft = Prev
      if (key === "j" || e.key === "ArrowRight") {
        e.preventDefault();
        if (activeSessionIdx < examQuestions.length - 1) {
          goToQuestion(activeSessionIdx + 1);
        }
        return;
      }
      if (key === "k" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeSessionIdx > 0) {
          goToQuestion(activeSessionIdx - 1);
        }
        return;
      }

      // Flag toggle: F
      if (key === "f") {
        e.preventDefault();
        toggleFlag(activeSessionIdx);
        return;
      }

      // Shortcut cheatsheet toggle: ?
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Play/Pause audio toggle: Space
      if (e.key === " ") {
        const activeAudios = document.getElementsByTagName("audio");
        if (activeAudios.length > 0) {
          e.preventDefault();
          const firstAudio = activeAudios[0];
          if (firstAudio.paused) firstAudio.play();
          else firstAudio.pause();
        }
        return;
      }

      // Option selection: A, B, C, D (or 1, 2, 3, 4)
      const currentQ = examQuestions[activeSessionIdx];
      if (!currentQ || !currentQ.answers) return;

      let optionIndex = -1;
      if (key === "a" || key === "1") optionIndex = 0;
      else if (key === "b" || key === "2") optionIndex = 1;
      else if (key === "c" || key === "3") optionIndex = 2;
      else if (key === "d" || key === "4") optionIndex = 3;

      if (optionIndex !== -1 && currentQ.answers[optionIndex]) {
        e.preventDefault();
        handleSelectAnswer(activeSessionIdx, currentQ.answers[optionIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, needsSoundCheck, showConfirm, showExitConfirm, isPaused, activeSessionIdx, examQuestions]);

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = examQuestions.length - answeredCount;

  // Unanswered questions index list for quick review in submission modal
  const unansweredIndices = useMemo(() => {
    return examQuestions
      .filter((q: any) => answers[q.sessionIdx] === undefined)
      .map((q: any) => q.sessionIdx);
  }, [examQuestions, answers]);

  // Formatted countdown timer: ⏱ 119:45 or 120:00
  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Semantic color for timer: Slate neutral > 10 min (#334155 / slate-400), gentle amber <= 10 min (#D97706), no flashing red
  const isTimeCritical = testMode === "exam" && timeLeft <= 600;

  if (loadingTest || loadingQuestions || loadingEnrollment) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Block access if not enrolled
  if (!enrollment) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center p-4">
        <div className="card-duo p-8 max-w-md text-center space-y-5 bg-[#070e1c] border border-cyan-500/20 rounded-2xl shadow-soft-xl">
          <div className="w-16 h-16 rounded-full bg-red-950/40 text-[var(--duo-red)] flex items-center justify-center mx-auto border border-red-500/20">
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

  // =========================================================================
  // 1. PRE-EXAM CONFIGURATION SCREEN (Hick's Law & Progressive Disclosure)
  // =========================================================================
  if (!started) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative font-sans">
        {/* Ambient background glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
          <div className="absolute -bottom-40 left-1/3 w-[600px] h-[400px] bg-indigo-600/8 blur-[160px] rounded-full" />
        </div>

        <button
          onClick={() => navigate(`/courses/${courseId}/fulltest`)}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors bg-[#070e1c]/90 border border-cyan-500/20 px-3.5 py-2 rounded-xl hover:border-cyan-400/50 shadow-soft-sm backdrop-blur-md cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Danh sách đề thi
        </button>

        <div className="p-6 sm:p-8 max-w-3xl w-full bg-[#070e1c]/95 border border-cyan-500/20 shadow-soft-2xl rounded-3xl space-y-6 my-10 relative z-10 backdrop-blur-xl">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-2xl shadow-inner">
              🏛️
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {testInfo?.title ?? `Đề thi TOEIC Chuẩn Hóa`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-lg mx-auto">
              Không gian thi trực tuyến công thái học cao cấp. Chọn nhanh cấu hình bài thi bên dưới để bắt đầu.
            </p>
          </div>

          {/* Saved Draft Alert */}
          {savedDraftInfo && (
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-black text-amber-400 text-sm">
                  <span>⚡ Phát hiện bài thi chưa hoàn tất!</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Bạn có bài làm dở gồm <b>{savedDraftInfo.answeredCount} câu đã trả lời</b>, lưu lúc {new Date(savedDraftInfo.savedAt).toLocaleTimeString("vi-VN")}.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={discardDraft}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors cursor-pointer"
                >
                  Xóa bài dở
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Tiếp tục làm bài 🚀
                </button>
              </div>
            </div>
          )}

          {/* Level 1: Quick Presets (Progressive Disclosure & Hick's Law) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" /> Chọn Cấu Hình Phòng Thi (Quick Presets)
              </label>
              <span className="text-[11px] text-cyan-400 font-semibold">Khuyên dùng</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Preset 1: Full ETS (Default) */}
              <button
                type="button"
                onClick={() => applyPreset("full_ets")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group",
                  activePreset === "full_ets"
                    ? "border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/60 opacity-80 hover:opacity-100"
                )}
              >
                {activePreset === "full_ets" && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider">
                    Mặc định
                  </span>
                )}
                <div>
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-black text-white text-sm sm:text-base">Thi Chuẩn ETS</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                    Mô phỏng 100% kỳ thi thật tại IIG. Full 7 Parts, 200 câu hỏi, đồng hồ đếm ngược 120 phút.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-blue-400">
                  <span>Part 1–7 (200 câu)</span>
                  <span>⏱ 120 phút</span>
                </div>
              </button>

              {/* Preset 2: Listening Sprint */}
              <button
                type="button"
                onClick={() => applyPreset("listening_sprint")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group",
                  activePreset === "listening_sprint"
                    ? "border-cyan-500 bg-cyan-600/15 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/30"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/60 opacity-80 hover:opacity-100"
                )}
              >
                <div>
                  <div className="text-2xl mb-2">🎧</div>
                  <h3 className="font-black text-white text-sm sm:text-base">Luyện Tốc Chiến Listening</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                    Tập trung phản xạ thính giác. Trọn vẹn Part 1–4, 100 câu nghe liên tục trong 45 phút.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-cyan-400">
                  <span>Part 1–4 (100 câu)</span>
                  <span>⏱ 45 phút</span>
                </div>
              </button>

              {/* Preset 3: Reading Focus */}
              <button
                type="button"
                onClick={() => applyPreset("reading_focus")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group",
                  activePreset === "reading_focus"
                    ? "border-emerald-500 bg-emerald-600/15 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/60 opacity-80 hover:opacity-100"
                )}
              >
                <div>
                  <div className="text-2xl mb-2">📖</div>
                  <h3 className="font-black text-white text-sm sm:text-base">Luyện Chuyên Sâu Reading</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                    Rèn luyện sức bền đọc hiểu & ngữ pháp. Trọn vẹn Part 5–7, 100 câu trong 75 phút.
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                  <span>Part 5–7 (100 câu)</span>
                  <span>⏱ 75 phút</span>
                </div>
              </button>
            </div>
          </div>

          {/* Level 2: Progressive Disclosure Expandable Accordion */}
          <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/40">
            <button
              type="button"
              onClick={() => setShowCustomConfig(!showCustomConfig)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span>⚙️ Tùy chỉnh tự do (Chia nhỏ đề thi, chọn Parts & thời gian riêng)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                {showCustomConfig ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Mở rộng</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </div>
            </button>

            {showCustomConfig && (
              <div className="p-5 border-t border-slate-800/80 space-y-5 animate-in slide-in-from-top-2">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Chế độ thực hiện
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTestMode("exam")}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        testMode === "exam"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-slate-800 bg-slate-900/80 text-slate-400"
                      )}
                    >
                      <span className="font-bold text-xs text-white block">⏱ Thi thử (Exam Mode)</span>
                      <span className="text-[11px] text-slate-400">Đếm ngược thời gian, chấm điểm sau khi nộp bài.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestMode("practice")}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer",
                        testMode === "practice"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-slate-800 bg-slate-900/80 text-slate-400"
                      )}
                    >
                      <span className="font-bold text-xs text-white block">📚 Luyện tập (Practice Mode)</span>
                      <span className="text-[11px] text-slate-400">Không giới hạn giờ, kiểm tra đáp án và lời giải tức thì.</span>
                    </button>
                  </div>
                </div>

                {/* Custom Parts Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Tùy chọn từng Phần thi (Parts)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((part) => {
                      const isSelected = selectedParts.includes(part);
                      const count = questionsPerPart[part] || partMeta[part].defaultCount;
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => togglePart(part)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer",
                            isSelected
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{partMeta[part].shortName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{count} câu</p>
                          </div>
                          <div
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-black border",
                              isSelected ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-700"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Granularity Options */}
                {testMode === "exam" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Mốc thời gian làm bài (Phút)
                      </label>
                      <span className="text-xs font-bold text-cyan-400">
                        {effectiveTimeMinutes} phút
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreset("custom");
                          setCustomTimeMinutes(null);
                        }}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                          customTimeMinutes === null
                            ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        ⚡ Đề xuất ({recommendedMinutes}p)
                      </button>
                      {[15, 30, 45, 60, 75, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            setActivePreset("custom");
                            setCustomTimeMinutes(mins);
                          }}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                            customTimeMinutes === mins
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          )}
                        >
                          {mins}p
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Configuration Summary & Action Bar */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base">
                  Tổng {examQuestions.length} câu hỏi
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
                  {selectedParts.length === 7 ? "Toàn bộ 7 Parts" : `Part ${selectedParts.join(", ")}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {testMode === "exam"
                  ? `Chế độ Thi thử • Giới hạn ${effectiveTimeMinutes} phút`
                  : `Chế độ Luyện tập • Không giới hạn giờ`}
              </p>
            </div>

            <button
              disabled={selectedParts.length === 0 || examQuestions.length === 0}
              onClick={handleStartExam}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black tracking-wide shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              🚀 VÀO PHÒNG THI NGAY ({examQuestions.length} CÂU)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1B. INTERACTIVE AUDIO PRE-CHECK (Audio Waveform & 3-Second Countdown)
  // =========================================================================
  if (needsSoundCheck) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex items-center justify-center p-4 relative font-sans">
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        </div>

        <div className="p-8 max-w-lg w-full text-center space-y-6 bg-[#070e1c] border border-cyan-500/20 rounded-3xl shadow-soft-2xl relative z-10 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto text-3xl shadow-inner">
            <Volume2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Kiểm Tra Âm Thanh Phòng Thi</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5 leading-relaxed">
              Nghe thử đoạn audio mẫu thực tế bên dưới và cân chỉnh âm lượng loa/tai nghe vừa vặn nhất cho bài thi.
            </p>
          </div>

          {/* Interactive Audio Waveform Visualizer */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-center gap-1.5 h-14 bg-slate-950/60 rounded-xl px-4 border border-slate-800/80">
              {Array.from({ length: 20 }).map((_, i) => {
                const heightPercent = audioPrecheckPlaying
                  ? Math.sin(i * 0.8 + Date.now() * 0.005) * 40 + 50
                  : 20;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 rounded-full transition-all duration-150",
                      audioPrecheckPlaying ? "bg-cyan-400" : "bg-slate-700"
                    )}
                    style={{
                      height: `${audioPrecheckPlaying ? (i % 3 === 0 ? 36 : i % 2 === 0 ? 24 : 14) : 8}px`,
                    }}
                  />
                );
              })}
            </div>

            <audio
              ref={volumeAudioRef}
              src={sampleAudioUrl}
              onPlay={() => setAudioPrecheckPlaying(true)}
              onPause={() => setAudioPrecheckPlaying(false)}
              onEnded={() => setAudioPrecheckPlaying(false)}
              className="hidden"
            />

            {/* Play/Pause Trigger */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (volumeAudioRef.current) {
                    if (audioPrecheckPlaying) {
                      volumeAudioRef.current.pause();
                    } else {
                      volumeAudioRef.current.volume = audioPrecheckVolume;
                      volumeAudioRef.current.play();
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                {audioPrecheckPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-cyan-400" /> Tạm dừng câu hỏi mẫu
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-cyan-400" /> Bật nghe thử câu hỏi mẫu
                  </>
                )}
              </button>
            </div>

            {/* Large Volume Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  {audioPrecheckVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : audioPrecheckVolume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  )}
                  Thanh trượt âm lượng
                </span>
                <span className="text-cyan-400 font-mono">{Math.round(audioPrecheckVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioPrecheckVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAudioPrecheckVolume(val);
                  if (volumeAudioRef.current) {
                    volumeAudioRef.current.volume = val;
                  }
                }}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Action & 3-Second Countdown */}
          <div className="space-y-2.5">
            {audioPrecheckCountdown !== null ? (
              <div className="py-4 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-center animate-pulse">
                <span className="text-2xl font-black text-cyan-300 block">
                  Đang vào bài thi sau {audioPrecheckCountdown}s...
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Hít một hơi thật sâu và giữ bình tĩnh nhé!
                </span>
              </div>
            ) : (
              <button
                onClick={handleConfirmSoundCheck}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
              >
                Tôi nghe rõ rồi, vào thi ngay! 🎧
              </button>
            )}

            <button
              onClick={() => {
                setStarted(false);
                setVolumeChecked(false);
                setAudioPrecheckCountdown(null);
              }}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Quay lại tùy chỉnh cấu hình
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN EXAM ROOM VIEW
  // =========================================================================
  const currentActiveQ = examQuestions[activeSessionIdx] || examQuestions[0];
  const activePartMeta = currentActiveQ ? partMeta[currentActiveQ.part_number] : null;

  return (
    <div className="h-screen flex flex-col bg-[#050914] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-cyan-500/20 shrink-0 bg-[#070e1c]/95 backdrop-blur-xl z-20 flex items-center justify-between px-3 sm:px-6">
        {/* Left: Exit & Test Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            title="Thoát phòng thi"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-black text-xs sm:text-sm text-white truncate max-w-[200px] sm:max-w-xs">
              {testInfo?.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {testMode === "exam" ? "Thi chuẩn ETS" : "Luyện tập"}
              </span>
              <span className="px-2 py-0.2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                {selectedParts.length === 7 ? "Full 7 Parts" : `Part ${selectedParts.join(",")}`}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Part Switcher Chips for Top Quick Jump */}
        <div className="hidden xl:flex items-center gap-1">
          {selectedParts.map((part) => (
            <button
              key={part}
              onClick={() => goToPart(part)}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                palettePartTab === part
                  ? "bg-blue-600 text-white font-extrabold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
              )}
            >
              {partShortNames[part - 1]}
            </button>
          ))}
        </div>

        {/* Right Controls: Timer, Pause, Shortcuts, Submit */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zeigarnik Progress Badge */}
          <div className="text-xs font-bold text-slate-400 hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
            <span>{answeredCount}/{examQuestions.length}</span>
            <span className="text-cyan-400 font-mono font-black">
              ({Math.round((answeredCount / (examQuestions.length || 1)) * 100)}%)
            </span>
          </div>

          {/* 120-min Countdown with Toggle Visibility & Controlled Semantic Color */}
          {testMode === "exam" ? (
            <div
              className={cn(
                "group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-all select-none",
                isTimeCritical
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-slate-800/80 border-slate-700/60 text-slate-300"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-current" />
              <span>
                {timerVisible ? formatTimerDisplay(timeLeft) : (
                  <span className="group-hover:hidden tracking-widest text-slate-500">••••</span>
                )}
                {!timerVisible && (
                  <span className="hidden group-hover:inline text-current font-bold animate-in fade-in">
                    {formatTimerDisplay(timeLeft)}
                  </span>
                )}
              </span>

              {/* Eye toggle button */}
              <button
                type="button"
                onClick={() => setTimerVisible(!timerVisible)}
                className="ml-1 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                title={timerVisible ? "Ẩn đồng hồ để tập trung" : "Hiện lại đồng hồ"}
              >
                {timerVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 px-3 py-1.5 rounded-xl font-mono font-bold text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span>{formatTimerDisplay(elapsedTime)}</span>
            </div>
          )}

          {/* Ghost Pause Button (Von Restorff rule: does not compete with Submit) */}
          <button
            onClick={() => {
              setIsPaused((prev) => !prev);
              if (!isPaused) setPauseCount((prev) => prev + 1);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-700/80 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {isPaused ? "Tiếp tục" : "Tạm dừng"}
          </button>

          {/* Primary Submit Button (#2563EB) placed far right */}
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-1.5 sm:py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Nộp bài
          </button>
        </div>
      </header>

      {/* Zeigarnik Micro Progress Line below header */}
      <div className="w-full h-1 bg-slate-900 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 ease-out"
          style={{ width: `${Math.round((answeredCount / (examQuestions.length || 1)) * 100)}%` }}
        />
      </div>

      {/* Main Split Layout: Left Question Palette + Right Question View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Palette (Restructured into Part Tabs & WCAG 2.2 states) */}
        <aside className="hidden lg:flex w-80 flex-col border-r border-slate-800/80 bg-[#070e1c] shrink-0 h-full shadow-soft-sm">
          {/* Palette Header with Part Tabs */}
          <div className="p-4 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-cyan-400" /> Bảng câu hỏi ({answeredCount}/{examQuestions.length})
              </h3>
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="text-[11px] font-bold text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5" /> Phím tắt
              </button>
            </div>

            {/* Part Horizontal Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {selectedParts.map((part) => {
                const partQuestions = examQuestions.filter((q: any) => q.part_number === part);
                const partDone = partQuestions.filter((q: any) => answers[q.sessionIdx] !== undefined).length;
                const isTabActive = palettePartTab === part;

                return (
                  <button
                    key={part}
                    onClick={() => setPalettePartTab(part)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1",
                      isTabActive
                        ? "bg-[#2563EB] text-white shadow-sm font-black"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                    )}
                  >
                    <span>{partMeta[part].shortName}</span>
                    <span className="text-[10px] opacity-80">({partDone}/{partQuestions.length})</span>
                  </button>
                );
              })}
            </div>

            {/* Part Progress Summary indicator */}
            {(() => {
              const partQuestions = examQuestions.filter((q: any) => q.part_number === palettePartTab);
              const partDone = partQuestions.filter((q: any) => answers[q.sessionIdx] !== undefined).length;
              return (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{partMeta[palettePartTab]?.name}</span>
                    <span className="text-cyan-400 font-mono">{partDone}/{partQuestions.length} câu</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-200"
                      style={{ width: `${Math.round((partDone / (partQuestions.length || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Palette Filter Chips */}
            <div className="flex gap-1 pt-1">
              {[
                { key: "all", label: `Tất cả` },
                { key: "done", label: `Đã làm (${answeredCount})` },
                { key: "flagged", label: `⚑ (${flagged.size})` },
                { key: "todo", label: `Chưa làm (${unansweredCount})` },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPaletteFilter(f.key as any)}
                  className={cn(
                    "text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    paletteFilter === f.key
                      ? "bg-slate-800 text-white border-slate-700"
                      : "bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Palette Buttons Grid (Only for Active Part Tab - WCAG 2.2 Compliant) */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((q: any) => {
                if (q.part_number !== palettePartTab) return null;

                const hasAns = answers[q.sessionIdx] !== undefined;
                const isFlagged = flagged.has(q.sessionIdx);
                const isActive = activeSessionIdx === q.sessionIdx;

                if (paletteFilter === "done" && !hasAns) return null;
                if (paletteFilter === "flagged" && !isFlagged) return null;
                if (paletteFilter === "todo" && hasAns) return null;

                // WCAG 2.2 color styling
                let btnStyle = "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-500";
                if (hasAns) {
                  btnStyle = "bg-[#2563EB] border-[#2563EB] text-white font-black shadow-sm";
                }
                if (isFlagged) {
                  btnStyle = "bg-[#78350F]/70 border-amber-500 text-amber-200 font-bold";
                }

                return (
                  <button
                    key={q.sessionIdx}
                    onClick={() => goToQuestion(q.sessionIdx)}
                    className={cn(
                      "w-10 h-10 text-xs font-bold rounded-xl border transition-all flex items-center justify-center relative cursor-pointer active:scale-95",
                      btnStyle,
                      isActive && "ring-2 ring-[#2563EB] ring-offset-2 ring-offset-[#070e1c]"
                    )}
                  >
                    <span>{q.sessionIdx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 text-amber-400 text-[10px]">⚑</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Scrollable Questions List / Split Workspace */}
        <main
          ref={scrollContainerRef}
          className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 scroll-smooth pb-36"
        >
          {partSections.map((section) => {
            const singlePartAudio = partAudioInfo[section.partNumber];

            return (
              <div key={section.partNumber} className="max-w-5xl mx-auto space-y-8 relative">
                {/* Single shared Part audio player for Part 1-4 if applicable */}
                {singlePartAudio?.isSinglePartAudio && singlePartAudio.audioUrl && (
                  <StickyPartAudioPlayer
                    audioUrl={singlePartAudio.audioUrl}
                    partNumber={section.partNumber}
                    title={partMeta[section.partNumber]?.name || `Part ${section.partNumber}`}
                    subtitle="File nghe chung phát liên tục cho toàn bộ câu hỏi trong Part này"
                    questionRange={singlePartAudio.questionRange}
                  />
                )}

                {section.groups.map((group: any, gIdx: number) => {
                  const hasPassage = Boolean(group.passage);
                  const isReadingSplit = hasPassage && (group.part_number === 6 || group.part_number === 7);

                  return (
                    <div
                      key={gIdx}
                      className={cn(
                        "transition-all duration-200",
                        isReadingSplit ? "lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start" : "space-y-4"
                      )}
                    >
                      {/* Left Column for Passage (Constrained to 65ch measure for reading ergonomics) */}
                      {(group.passage || (group.audio_url && !singlePartAudio?.isSinglePartAudio) || group.image_url) && (
                        <div
                          className={cn(
                            "card-duo p-5 sm:p-6 bg-[#070e1c] border border-slate-800 rounded-2xl space-y-4 shadow-soft-sm",
                            isReadingSplit
                              ? "lg:col-span-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto"
                              : "w-full"
                          )}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                              {partShortNames[group.part_number - 1]}
                            </span>
                            {hasPassage && (
                              <span className="text-[11px] font-semibold text-slate-400">
                                📖 Đoạn văn đọc hiểu
                              </span>
                            )}
                          </div>

                          {/* Image Context */}
                          {group.image_url && (
                            <div className="w-full flex justify-center bg-slate-950/80 rounded-xl overflow-hidden min-h-[160px] border border-slate-800 p-2 shadow-soft-sm">
                              <img
                                src={group.image_url}
                                alt="Passage Context"
                                className="max-w-full h-auto rounded-lg mx-auto max-h-[350px] object-contain image-safe"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Non-sticky Audio */}
                          {group.audio_url && !singlePartAudio?.isSinglePartAudio && (
                            <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-soft-sm">
                              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                                🎧
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-400 mb-1">Audio nghe chung nhóm câu</p>
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

                          {/* Passage Body: Typography with 16px, 1.6 line height, max-w-[65ch], text-left */}
                          {group.passage && (
                            <div
                              className="prose prose-invert prose-slate max-w-[65ch] text-slate-200 text-base leading-[1.6] text-left overflow-x-hidden font-sans"
                              dangerouslySetInnerHTML={{ __html: group.passage }}
                            />
                          )}
                        </div>
                      )}

                      {/* Right Column / Sub Questions List */}
                      <div
                        className={cn(
                          "space-y-4",
                          isReadingSplit ? "lg:col-span-6" : "w-full"
                        )}
                      >
                        {group.questions.map((q: any) => {
                          const isChecked = checkedAnswers[q.id];
                          const selectedId = answers[q.sessionIdx];
                          const hasSelected = selectedId !== undefined;
                          const isFlagged = flagged.has(q.sessionIdx);
                          const isActive = activeSessionIdx === q.sessionIdx;

                          const isPart1 = q.part_number === 1;
                          const isPart2 = q.part_number === 2;

                          return (
                            <div
                              key={q.id}
                              id={`question-${q.sessionIdx}`}
                              onClick={() => setActiveSessionIdx(q.sessionIdx)}
                              className={cn(
                                "p-5 sm:p-6 bg-[#070e1c] border rounded-2xl space-y-4 relative scroll-mt-20 transition-all",
                                isActive
                                  ? "border-blue-500/80 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30"
                                  : "border-slate-800/80 hover:border-slate-700"
                              )}
                            >
                              {/* Question Card Header */}
                              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black text-xs">
                                    Câu {q.sessionIdx + 1}
                                  </span>
                                  {selectedParts.length < 7 && q.originalGlobalIdx && (
                                    <span className="text-xs text-slate-400 font-semibold">
                                      (Đề gốc: #{q.originalGlobalIdx})
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                    {partShortNames[q.part_number - 1]}
                                  </span>
                                </div>

                                {/* Flag / Bookmark Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFlag(q.sessionIdx);
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer",
                                    isFlagged
                                      ? "border-amber-500 bg-amber-500/20 text-amber-300"
                                      : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                                  )}
                                >
                                  {isFlagged ? (
                                    <BookmarkCheck className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  ) : (
                                    <Bookmark className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isFlagged ? "Đã gắn cờ" : "Gắn cờ (F)"}</span>
                                </button>
                              </div>

                              {/* Question Image if specific to this question */}
                              {q.image_url && q.image_url !== group.image_url && (
                                <div className="w-full flex justify-center bg-slate-950/60 rounded-xl overflow-hidden min-h-[140px] border border-slate-800 p-2">
                                  <img
                                    src={q.image_url}
                                    alt="Question Image"
                                    className="max-w-full h-auto rounded-lg max-h-[280px] mx-auto object-contain image-safe"
                                    loading="lazy"
                                  />
                                </div>
                              )}

                              {/* Question Audio if specific to this question */}
                              {q.audio_url && q.audio_url !== group.audio_url && !singlePartAudio?.isSinglePartAudio && (
                                <audio
                                  controls
                                  src={q.audio_url}
                                  className="w-full max-w-md"
                                  controlsList="nodownload"
                                  onPlay={handleAudioPlay}
                                />
                              )}

                              {/* Question Stem Text */}
                              {q.cleanText && !isPart1 && !isPart2 && (
                                <p className="text-base font-bold text-white leading-relaxed text-left">
                                  {q.cleanText}
                                </p>
                              )}

                              {/* Answer Row Cards A - B - C - D (Fitts's Law >= 48px, full width, tactile click) */}
                              <div className="space-y-2.5 pt-1">
                                {q.answers.map((opt: any, oi: number) => {
                                  const isSelected = selectedId === opt.id;
                                  const isOptCorrect = opt.is_correct;
                                  const isRecentlyClicked = recentlySelectedKey === `${q.sessionIdx}-${opt.id}`;

                                  if (isPart2 && oi === 3) return null;

                                  let cardClass = "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700";
                                  let badgeClass = "border-slate-700 bg-slate-800 text-slate-300";

                                  if (isSelected) {
                                    if (testMode === "practice" && isChecked) {
                                      if (isOptCorrect) {
                                        cardClass = "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-bold";
                                        badgeClass = "border-emerald-500 bg-emerald-500 text-slate-950";
                                      } else {
                                        cardClass = "border-rose-500 bg-rose-500/15 text-rose-200 font-bold";
                                        badgeClass = "border-rose-500 bg-rose-500 text-white";
                                      }
                                    } else {
                                      // Selected State: #2563EB border & subtle blue tint
                                      cardClass = "border-[#2563EB] bg-[#1E3A8A]/30 text-blue-100 font-bold ring-1 ring-[#2563EB]/40";
                                      badgeClass = "border-[#2563EB] bg-[#2563EB] text-white";
                                    }
                                  } else if (testMode === "practice" && isChecked && isOptCorrect) {
                                    cardClass = "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold";
                                    badgeClass = "border-emerald-500 bg-emerald-500 text-slate-950";
                                  }

                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      disabled={testMode === "practice" && isChecked}
                                      onClick={() => handleSelectAnswer(q.sessionIdx, opt.id)}
                                      className={cn(
                                        "w-full text-left px-4 py-3 min-h-[48px] rounded-xl border transition-all flex items-center cursor-pointer select-none active:scale-[0.97]",
                                        isRecentlyClicked && "scale-[0.97]",
                                        cardClass
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mr-3.5 font-black text-xs transition-colors",
                                          badgeClass
                                        )}
                                      >
                                        {String.fromCharCode(65 + oi)}
                                      </div>
                                      <span className="flex-1 text-sm font-semibold leading-relaxed text-left">
                                        {(isPart1 || isPart2) && !opt.answer_text ? (
                                          <span className="text-slate-600 italic font-normal tracking-widest select-none">
                                            ••••••••••••
                                          </span>
                                        ) : (
                                          opt.answer_text
                                        )}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Practice Mode Instant Review */}
                              {testMode === "practice" && (
                                <div className="pt-3 border-t border-dashed border-slate-800 space-y-3">
                                  {!isChecked ? (
                                    <button
                                      disabled={!hasSelected}
                                      onClick={() => {
                                        setCheckedAnswers((prev) => ({ ...prev, [q.id]: true }));
                                        playSound(
                                          q.answers.find((a: any) => a.id === selectedId)?.is_correct
                                            ? "correct"
                                            : "incorrect"
                                        );
                                      }}
                                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      Kiểm tra đáp án
                                    </button>
                                  ) : (
                                    <div className="space-y-2.5">
                                      {q.translation && (
                                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
                                          🇻🇳 <b className="text-white font-bold">Dịch nghĩa:</b> {q.translation}
                                        </div>
                                      )}
                                      {(q.explanation || q.answers.find((a: any) => a.is_correct)?.explanation) && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                                          💡 <b className="font-bold">Giải thích:</b>{" "}
                                          {q.explanation || q.answers.find((a: any) => a.is_correct)?.explanation}
                                        </div>
                                      )}
                                      {q.transcript && (
                                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300">
                                          📝 <b className="font-bold">Transcript:</b> {q.transcript}
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
                    </div>
                  );
                })}
              </div>
            );
          })}
        </main>
      </div>

      {/* Floating Keyboard Shortcuts Hint Button at bottom left */}
      <div className="fixed bottom-20 lg:bottom-4 left-4 z-20 hidden sm:block">
        <button
          type="button"
          onClick={() => setShowShortcutsModal(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-cyan-400 text-xs font-bold shadow-soft-sm backdrop-blur-md flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>⌨ Phím tắt (?)</span>
        </button>
      </div>

      {/* =========================================================================
          6. MOBILE BOTTOM BAR & THUMB ZONE (Viewport 390x844)
          ========================================================================= */}
      <footer className="h-16 border-t border-slate-800/90 shrink-0 bg-[#070e1c]/95 backdrop-blur-md z-30 flex lg:hidden items-center justify-between px-3 fixed bottom-0 inset-x-0">
        {/* Fixed Prev Question Button (Fitts's Law >= 48x48px touch target) */}
        <button
          type="button"
          disabled={activeSessionIdx <= 0}
          onClick={() => goToQuestion(activeSessionIdx - 1)}
          className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 cursor-pointer shrink-0"
          title="Câu trước (K / ←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Center Status Bar Trigger: Câu 45/200 • ⏱ 75:12 • ⚑ */}
        <button
          type="button"
          onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
          className="flex-1 mx-2 py-2 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer truncate"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">
            Câu {activeSessionIdx + 1}/{examQuestions.length} • ⏱ {formatTimerDisplay(timeLeft)}
          </span>
          {flagged.size > 0 && <span className="text-amber-400 shrink-0">⚑ {flagged.size}</span>}
        </button>

        {/* Fixed Next Question Button (Fitts's Law >= 48x48px touch target) */}
        <button
          type="button"
          disabled={activeSessionIdx >= examQuestions.length - 1}
          onClick={() => goToQuestion(activeSessionIdx + 1)}
          className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 cursor-pointer shrink-0"
          title="Câu sau (J / →)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>

      {/* Mobile Drawer (Bottom Sheet 60% height) */}
      {mobilePaletteOpen && (
        <div className="fixed inset-x-0 bottom-16 bg-[#070e1c] border-t border-slate-800 shadow-2xl z-40 max-h-[60vh] overflow-y-auto p-4 animate-in slide-in-from-bottom-5 lg:hidden rounded-t-3xl">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-cyan-400" /> Bảng câu hỏi ({answeredCount}/{examQuestions.length})
              </h3>
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Mobile Part Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {selectedParts.map((part) => (
                <button
                  key={part}
                  onClick={() => setPalettePartTab(part)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer",
                    palettePartTab === part
                      ? "bg-blue-600 text-white font-black"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  )}
                >
                  {partShortNames[part - 1]}
                </button>
              ))}
            </div>

            {/* Mobile Buttons Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[38vh] overflow-y-auto p-1">
              {examQuestions.map((q: any) => {
                if (q.part_number !== palettePartTab) return null;

                const hasAns = answers[q.sessionIdx] !== undefined;
                const isFlagged = flagged.has(q.sessionIdx);
                const isActive = activeSessionIdx === q.sessionIdx;

                let btnStyle = "bg-slate-900 border-slate-800 text-slate-400";
                if (hasAns) btnStyle = "bg-[#2563EB] text-white border-[#2563EB]";
                if (isFlagged) btnStyle = "bg-[#78350F] text-amber-200 border-amber-500";

                return (
                  <button
                    key={q.sessionIdx}
                    onClick={() => {
                      goToQuestion(q.sessionIdx);
                      setMobilePaletteOpen(false);
                    }}
                    className={cn(
                      "w-10 h-10 text-xs font-bold rounded-xl border flex items-center justify-center relative active:scale-95 cursor-pointer",
                      btnStyle,
                      isActive && "ring-2 ring-cyan-400"
                    )}
                  >
                    <span>{q.sessionIdx + 1}</span>
                    {isFlagged && <span className="absolute -top-1 -right-1 text-amber-400 text-[10px]">⚑</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Submit Dialog with Unanswered Questions Jump */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="p-6 sm:p-8 max-w-lg w-full bg-[#070e1c] border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl">
            <span className="text-4xl block">📢</span>
            <div>
              <h2 className="text-xl font-black text-white">Xác nhận nộp bài thi</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Bạn đã làm <b>{answeredCount}/{examQuestions.length} câu</b>.
                {unansweredCount > 0 ? (
                  <span className="text-amber-400 block mt-1">
                    Còn <b>{unansweredCount} câu</b> chưa trả lời!
                  </span>
                ) : (
                  <span className="text-emerald-400 block mt-1">
                    Chúc mừng! Bạn đã hoàn thành tất cả các câu hỏi.
                  </span>
                )}
              </p>
            </div>

            {/* List of unanswered questions for quick jumps */}
            {unansweredCount > 0 && (
              <div className="space-y-2 text-left bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Bấm vào số câu để xem lại trước khi nộp:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {unansweredIndices.map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setShowConfirm(false);
                        goToQuestion(idx);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      Câu {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm font-bold text-slate-300 cursor-pointer transition-colors"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Xác nhận Nộp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Exit Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="p-6 sm:p-8 max-w-md w-full bg-[#070e1c] border border-slate-800 rounded-3xl text-center space-y-5 shadow-2xl">
            <span className="text-4xl block">⏸</span>
            <h2 className="text-xl font-black text-white">Tạm dừng hoặc Rời bài thi?</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Bạn đã hoàn thành <b>{answeredCount}/{examQuestions.length} câu</b>. Bài làm được tự động lưu trên trình duyệt trong vòng 24 giờ.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  navigate(`/courses/${courseId}/fulltest`, { replace: true });
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all cursor-pointer"
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
                className="py-2 text-xs text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Hủy bài thi này (Không lưu)
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-bold text-slate-300 transition-all cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="p-6 sm:p-7 max-w-md w-full bg-[#070e1c] border border-cyan-500/30 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-cyan-400" /> Bảng phím tắt chuẩn phòng thi
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Chọn đáp án tương ứng:</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400 font-bold">A</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400 font-bold">B</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400 font-bold">C</kbd>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400 font-bold">D</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Gắn cờ / Bỏ cờ câu hỏi:</span>
                <kbd className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-400 font-bold">F</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Câu tiếp theo / Câu trước:</span>
                <span className="flex gap-1">
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">J</kbd>
                  <span className="text-slate-500">/</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">K</kbd>
                  <span className="text-slate-500">(hoặc ← / →)</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Phát / Tạm dừng audio:</span>
                <kbd className="px-3 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">Space</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span>Mở bảng tra cứu phím tắt:</span>
                <kbd className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">?</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Đã hiểu, quay lại làm bài
            </button>
          </div>
        </div>
      )}

      {/* Pause Modal Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="p-8 max-w-md w-full bg-[#070e1c] border border-slate-800 text-center space-y-5 rounded-3xl shadow-2xl">
            <span className="text-4xl block">⏸</span>
            <h2 className="text-xl font-black text-white">Đã tạm dừng bài thi</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Thời gian đang tạm ngưng. Hãy nhấn tiếp tục để tiếp tục trả lời các câu hỏi.
            </p>
            <button
              onClick={() => setIsPaused(false)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md cursor-pointer transition-colors"
            >
              TIẾP TỤC LÀM BÀI 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullTestExam;
