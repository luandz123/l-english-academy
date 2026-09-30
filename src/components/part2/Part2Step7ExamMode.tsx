import React, { useState, useEffect, useRef } from 'react';
import { Part2CoachQuestion, Part2DiagnosticResult } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  FileCheck2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Award,
  Zap,
  Timer,
  Clock,
  Eye,
  EyeOff,
  Radio,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useSound } from '@/hooks/useSound';
import { Part2StepGuide } from './Part2StepGuide';

interface Part2Step7ExamModeProps {
  questions: Part2CoachQuestion[];
  step1Diagnostics?: Record<number, { guess: 'A' | 'B' | 'C'; rating: number }>;
  onCompleteStep: () => void;
}

type ExamRunMode = 'continuous' | 'self_paced';

export const Part2Step7ExamMode: React.FC<Part2Step7ExamModeProps> = ({
  questions,
  step1Diagnostics,
  onCompleteStep,
}) => {
  const { playSound } = useSound();

  // Test setup & mode
  const [examMode, setExamMode] = useState<ExamRunMode>('continuous');
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');

  // Active question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // User answers
  const [userAnswers, setUserAnswers] = useState<Record<number, 'A' | 'B' | 'C'>>({});

  // Audio & 5s silence countdown states
  const [audioPhase, setAudioPhase] = useState<'question' | 'A' | 'B' | 'C' | 'silence_countdown' | 'idle'>('idle');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);
  const [showScriptHint, setShowScriptHint] = useState(false);

  // Continuous loop ref to control async progression
  const isExamActiveRef = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentIndex];

  // Helper to extract choices for a question
  const getChoicesForQuestion = (q: Part2CoachQuestion) => {
    const letters: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    return letters.map((letter) => {
      if (q.correctChoice.letter === letter) {
        return {
          letter,
          isCorrect: true,
          text: q.correctChoice.text,
          translation: q.correctChoice.translation,
          trap: null,
        };
      }
      const distractor = q.distractors.find((d) => d.letter === letter);
      return {
        letter,
        isCorrect: false,
        text: distractor?.text || '',
        translation: distractor?.translation || '',
        trap: distractor || null,
      };
    });
  };

  // Cleanup on unmount or mode reset
  useEffect(() => {
    return () => {
      isExamActiveRef.current = false;
      soundAudioPlayer.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Run a single question in continuous mode
  const playQuestionContinuous = async (index: number) => {
    if (!isExamActiveRef.current || index >= questions.length) {
      if (index >= questions.length) {
        finishExam();
      }
      return;
    }

    setCurrentIndex(index);
    const q = questions[index];
    const choices = getChoicesForQuestion(q);
    const aText = choices.find((c) => c.letter === 'A')?.text || '';
    const bText = choices.find((c) => c.letter === 'B')?.text || '';
    const cText = choices.find((c) => c.letter === 'C')?.text || '';

    try {
      // 1. Speak Question Text
      setAudioPhase('question');
      await soundAudioPlayer.speakText(q.questionText, 1.0);
      if (!isExamActiveRef.current) return;
      await new Promise((r) => setTimeout(r, 700));
      if (!isExamActiveRef.current) return;

      // 2. Speak Option (A)
      setAudioPhase('A');
      await soundAudioPlayer.speakText(`(A) ${aText}`, 1.0);
      if (!isExamActiveRef.current) return;
      await new Promise((r) => setTimeout(r, 600));
      if (!isExamActiveRef.current) return;

      // 3. Speak Option (B)
      setAudioPhase('B');
      await soundAudioPlayer.speakText(`(B) ${bText}`, 1.0);
      if (!isExamActiveRef.current) return;
      await new Promise((r) => setTimeout(r, 600));
      if (!isExamActiveRef.current) return;

      // 4. Speak Option (C)
      setAudioPhase('C');
      await soundAudioPlayer.speakText(`(C) ${cText}`, 1.0);
      if (!isExamActiveRef.current) return;

      // 5. 5-second silence countdown (real TOEIC Part 2 gap)
      setAudioPhase('silence_countdown');
      setCountdownSeconds(5);

      await new Promise<void>((resolve) => {
        let remaining = 5;
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        countdownIntervalRef.current = setInterval(() => {
          if (!isExamActiveRef.current) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            resolve();
            return;
          }
          remaining -= 1;
          setCountdownSeconds(remaining);

          if (remaining <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            resolve();
          }
        }, 1000);
      });

      if (!isExamActiveRef.current) return;

      // Move to next question or complete
      if (index + 1 < questions.length) {
        playQuestionContinuous(index + 1);
      } else {
        finishExam();
      }
    } catch (e) {
      console.error('Error during continuous exam playback', e);
    }
  };

  // Start Exam
  const handleStartExam = () => {
    isExamActiveRef.current = true;
    setTestState('running');
    setCurrentIndex(0);
    setUserAnswers({});

    if (examMode === 'continuous') {
      playQuestionContinuous(0);
    } else {
      setAudioPhase('idle');
    }
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (testState === 'running') {
      isExamActiveRef.current = false;
      soundAudioPlayer.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setTestState('paused');
      setAudioPhase('idle');
    } else if (testState === 'paused') {
      isExamActiveRef.current = true;
      setTestState('running');
      if (examMode === 'continuous') {
        playQuestionContinuous(currentIndex);
      }
    }
  };

  // Play audio for self-paced mode
  const handlePlaySelfPaced = () => {
    const choices = getChoicesForQuestion(currentQ);
    const aText = choices.find((c) => c.letter === 'A')?.text || '';
    const bText = choices.find((c) => c.letter === 'B')?.text || '';
    const cText = choices.find((c) => c.letter === 'C')?.text || '';

    const items = [
      { text: currentQ.questionText, pauseAfterMs: 800 },
      { text: `(A) ${aText}`, pauseAfterMs: 600 },
      { text: `(B) ${bText}`, pauseAfterMs: 600 },
      { text: `(C) ${cText}`, pauseAfterMs: 400 },
    ];

    soundAudioPlayer.speakSequence(items, { rate: 1.0 });
  };

  // Replay current question in continuous mode
  const handleReplayCurrent = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    soundAudioPlayer.stop();
    if (examMode === 'continuous') {
      isExamActiveRef.current = true;
      setTestState('running');
      playQuestionContinuous(currentIndex);
    } else {
      handlePlaySelfPaced();
    }
  };

  // Answer selection
  const handleSelectAnswer = (choice: 'A' | 'B' | 'C') => {
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: choice }));
    playSound('correct');
  };

  // Fast forward in continuous mode
  const handleSkipToNext = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    soundAudioPlayer.stop();
    if (currentIndex + 1 < questions.length) {
      if (examMode === 'continuous') {
        isExamActiveRef.current = true;
        playQuestionContinuous(currentIndex + 1);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      finishExam();
    }
  };

  // Finish Exam & Calculate Score
  const finishExam = () => {
    isExamActiveRef.current = false;
    soundAudioPlayer.stop();
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setTestState('finished');
    setAudioPhase('idle');
    playSound('complete');
  };

  // Score calculation
  const correctCount = questions.filter(
    (q) => userAnswers[q.id] === q.correctChoice.letter
  ).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);

  // Compare with Step 1 diagnostic if available
  const step1CorrectCount = step1Diagnostics
    ? questions.filter((q) => step1Diagnostics[q.id]?.guess === q.correctChoice.letter).length
    : null;
  const step1Percent = step1CorrectCount !== null ? Math.round((step1CorrectCount / questions.length) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">B7: Nghe như thi thật</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Áp lực 5s ETS, phiếu khoanh A/B/C</span>
        </div>
        {testState === 'running' ? (
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0">
            Câu {currentIndex + 1}/{questions.length}
          </span>
        ) : (
          <span className="text-xs font-bold text-muted-foreground shrink-0">{questions.length} câu</span>
        )}
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={7}
        stepTitle="Nghe như thi thật"
        goal="Làm bài mô phỏng ETS để đo tiến bộ"
        actions={[
          {
            clickTarget: "1. Chọn chế độ & bấm 'Bắt đầu'",
            expectedResult: "Audio tự động chạy hoặc tự bấm từng câu.",
          },
          {
            clickTarget: "2. Chọn (A), (B) hoặc (C)",
            expectedResult: "Khoanh đáp án vào phiếu trong 5s.",
          },
          {
            clickTarget: "3. Nộp bài",
            expectedResult: "Xem bảng điểm và so sánh tiến bộ với Bước 1.",
          }
        ]}
        nextStepName="Bước 8: Nghe liên tục toàn bài (Loop)"
      />

      {/* STATE 1: IDLE - Setup & Mode Selection */}
      {testState === 'idle' && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-sm text-center">
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-foreground">
              Thi thực chiến ({questions.length} câu)
            </h3>
            <p className="text-xs text-muted-foreground">
              Kiểm tra phản xạ thực tế và đo lường độ tiến bộ sau các bước luyện tập
            </p>
          </div>

          {/* Mode Selector Radio Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setExamMode('continuous')}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                examMode === 'continuous'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm text-foreground">
                  ⚡ Thi tự động (Chuẩn ETS)
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Tự chạy liên tục từ câu 1 đến hết. <strong>5s đếm ngược</strong> chuyển câu.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setExamMode('self_paced')}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2',
                examMode === 'self_paced'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm text-foreground">
                  🎯 Tự luyện từng câu
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  Tự do
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Tự bấm phát audio từng câu, không giới hạn thời gian.
              </p>
            </button>
          </div>

          {/* Start CTA Button */}
          <div className="pt-2">
            <Button
              size="lg"
              onClick={handleStartExam}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-8 py-5 text-sm sm:text-base shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Play className="w-4 h-4 mr-2 fill-white" />
              <span>Bắt Đầu Làm Bài Thi</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STATE 2: RUNNING / PAUSED - Exam Simulation Arena */}
      {(testState === 'running' || testState === 'paused') && (
        <div className="space-y-6">
          {/* Question Indicator Bubbles Bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-muted-foreground shrink-0 hidden sm:inline">
                Phiếu câu hỏi:
              </span>
              <div className="flex items-center gap-1.5">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const chosen = userAnswers[q.id];
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        if (examMode === 'self_paced') {
                          setCurrentIndex(idx);
                        }
                      }}
                      disabled={examMode === 'continuous'}
                      className={cn(
                        'w-9 h-9 rounded-xl font-black text-xs transition-all flex flex-col items-center justify-center shrink-0 border cursor-pointer',
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-600/30 scale-105 shadow-md'
                          : chosen
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
                      )}
                    >
                      <span>{q.questionNumber || idx + 1}</span>
                      {chosen && <span className="text-xs font-bold leading-none">({chosen})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePause}
                className="rounded-xl font-bold border-slate-300 dark:border-zinc-700 text-xs"
              >
                {testState === 'running' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1" /> Tạm dừng
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1 fill-emerald-600 text-emerald-600" /> Tiếp tục
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReplayCurrent}
                className="rounded-xl font-bold border-slate-300 dark:border-zinc-700 text-xs"
                title="Nghe lại câu hiện tại"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Nghe lại
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={finishExam}
                className="rounded-xl font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
              >
                Nộp bài sớm
              </Button>
            </div>
          </div>

          {/* Main Question Card with Real Audio Monitor & Answer Sheet */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Audio Broadcast Monitor */}
            <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span>
                  Đang phát: Câu {currentQ.questionNumber} ({currentIndex + 1}/{questions.length})
                </span>
              </div>

              {/* Status Display: Which section is playing */}
              <div className="py-2">
                {audioPhase === 'question' && (
                  <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 animate-pulse">
                    🔊 Đang đọc Câu hỏi... Hãy lắng nghe kỹ từ để hỏi và chủ đề!
                  </div>
                )}
                {audioPhase === 'A' && (
                  <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 animate-pulse">
                    🔊 Đang đọc phương án (A)...
                  </div>
                )}
                {audioPhase === 'B' && (
                  <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 animate-pulse">
                    🔊 Đang đọc phương án (B)...
                  </div>
                )}
                {audioPhase === 'C' && (
                  <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 animate-pulse">
                    🔊 Đang đọc phương án (C)...
                  </div>
                )}
                {audioPhase === 'silence_countdown' && (
                  <div className="space-y-2">
                    <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
                      <Timer className="w-5 h-5 animate-spin" />
                      <span>Khoanh đáp án! Tự động chuyển câu sau: {countdownSeconds}s</span>
                    </div>
                    {/* Progress countdown bar */}
                    <div className="w-full max-w-md mx-auto h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(countdownSeconds / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {audioPhase === 'idle' && (
                  <div className="text-sm font-bold text-muted-foreground">
                    {examMode === 'self_paced'
                      ? 'Nhấn nút "Phát Audio câu này" bên dưới để nghe câu hỏi cùng 3 đáp án.'
                      : 'Đang tạm dừng bài thi. Bấm "Tiếp tục" ở góc trên để chạy tiếp.'}
                  </div>
                )}
              </div>

              {/* Self-paced play button */}
              {examMode === 'self_paced' && (
                <div className="pt-1">
                  <Button
                    size="lg"
                    onClick={handlePlaySelfPaced}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl px-6 shadow-md shadow-emerald-600/20"
                  >
                    <Play className="w-4 h-4 mr-2 fill-white" />
                    <span>Phát Audio Câu {currentQ.questionNumber} (1.0x)</span>
                  </Button>
                </div>
              )}
            </div>

            {/* TOEIC Answer Sheet - Pink/Blue Bubble Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider">
                    Phiếu tô đáp án (Answer Sheet) - Câu {currentQ.questionNumber}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Bấm chọn (A), (B) hoặc (C) theo phán đoán của bạn
                  </p>
                </div>
                {userAnswers[currentQ.id] && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                    ✓ Đã chọn ({userAnswers[currentQ.id]})
                  </span>
                )}
              </div>

              {/* The 3 Big Answer Bubbles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {(['A', 'B', 'C'] as const).map((choice) => {
                  const isSelected = userAnswers[currentQ.id] === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handleSelectAnswer(choice)}
                      className={cn(
                        'py-5 px-6 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-3 cursor-pointer group text-left relative',
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25 -translate-y-0.5'
                          : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110',
                          isSelected
                            ? 'bg-white text-emerald-600 border-white'
                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border-slate-300 dark:border-zinc-600'
                        )}
                      >
                        {choice}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-black">Phương án ({choice})</div>
                        <div className={cn('text-xs font-medium', isSelected ? 'text-emerald-100' : 'text-muted-foreground')}>
                          {isSelected ? 'Đang chọn phương án này' : 'Bấm để chọn'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Emergency Tapescript Peek (collapsible) */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowScriptHint(!showScriptHint)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                {showScriptHint ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
                {showScriptHint ? 'Ẩn tapescript đề thi' : 'Xem trước script (Nếu tai nghe quá nhanh)'}
              </Button>

              {showScriptHint && (
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 max-w-md truncate">
                  &ldquo;{currentQ.questionText}&rdquo;
                </div>
              )}
            </div>

            {/* Bottom Nav: Skip / Next */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="text-xs text-muted-foreground font-medium">
                Đã trả lời: {Object.keys(userAnswers).length}/{questions.length} câu
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSkipToNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm px-5"
                >
                  {currentIndex + 1 < questions.length ? (
                    <>
                      <span>Chuyển câu tiếp theo</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  ) : (
                    <>
                      <span>Hoàn thành &amp; Nộp bài thi</span>
                      <CheckCircle2 className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: FINISHED - Score Report & Detailed Review */}
      {testState === 'finished' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Celebratory Score Card */}
          <div className="bg-gradient-to-br from-white to-emerald-50/50 dark:from-zinc-900 dark:to-emerald-950/20 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-500/30 shrink-0">
                  {scorePercent}%
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Kết quả bài thi thực chiến</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                    Đúng {correctCount} / {questions.length} câu hỏi
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    {scorePercent >= 80
                      ? '🎉 Xuất sắc! Bạn đã làm chủ hoàn toàn phản xạ và bẫy của cụm câu này.'
                      : scorePercent >= 60
                      ? '👍 Khá tốt! Hãy xem lại các câu sai để tránh bẫy ở lần thi tiếp theo.'
                      : '💪 Cần luyện nghe thêm ở Bước 7 (Nghe thụ động)!'}
                  </p>
                </div>
              </div>

              {/* Progress Comparison Badge (Step 1 vs Step 7) */}
              {step1Percent !== null && (
                <div className="bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 shrink-0 sm:max-w-xs shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-700 dark:text-purple-300">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>So sánh tiến bộ</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Bước 1 (Đo tai ban đầu):</div>
                      <div className="text-base font-black text-slate-700 dark:text-zinc-300">
                        {step1Percent}% đúng
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-muted-foreground">Bước 7 (Thực chiến):</div>
                      <div className="text-base font-black text-emerald-600">
                        {scorePercent}% đúng
                      </div>
                    </div>
                  </div>
                  {scorePercent >= step1Percent && (
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🚀 Tăng trưởng +{scorePercent - step1Percent}% độ chuẩn xác!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button
                variant="outline"
                onClick={handleStartExam}
                className="rounded-2xl font-bold border-slate-300 dark:border-zinc-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span>Thi lại lần nữa</span>
              </Button>

              <Button
                size="default"
                onClick={onCompleteStep}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-6 py-2.5 text-xs sm:text-sm shadow-md shadow-purple-600/20"
              >
                <span>Tiếp tục: Nghe liên tục toàn bài (Loop) →</span>
              </Button>
            </div>
          </div>

          {/* Detailed Question-by-Question Review Breakdown */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Phân tích chi tiết từng câu &amp; Bóc mẽ cạm bẫy</span>
            </h4>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const choices = getChoicesForQuestion(q);
                const userChoice = userAnswers[q.id];
                const isCorrect = userChoice === q.correctChoice.letter;

                return (
                  <div
                    key={q.id}
                    className={cn(
                      'border-2 rounded-3xl p-5 sm:p-6 space-y-4 transition-all bg-white dark:bg-zinc-900',
                      isCorrect
                        ? 'border-emerald-200 dark:border-emerald-900/60'
                        : 'border-rose-200 dark:border-rose-900/60'
                    )}
                  >
                    {/* Question Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            'w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0',
                            isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div className="font-black text-base text-foreground">
                          Câu {q.questionNumber}: &ldquo;{q.questionText}&rdquo;
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-xl text-xs font-black inline-flex items-center gap-1',
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          )}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đúng ({userChoice})
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Sai (Bạn chọn {userChoice || 'chưa chọn'} - Đáp án đúng là {q.correctChoice.letter})
                            </>
                          )}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => soundAudioPlayer.speakText(q.questionText, 0.95)}
                          className="rounded-xl font-bold h-8 px-2.5 text-xs"
                          title="Nghe lại câu hỏi"
                        >
                          <Volume2 className="w-3.5 h-3.5 mr-1" /> Nghe
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground italic pl-9">
                      Dịch nghĩa: {q.questionTranslation}
                    </p>

                    {/* Choices Review List */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2 pl-0 sm:pl-9">
                      {choices.map((c) => {
                        const isChosenByUser = userChoice === c.letter;
                        return (
                          <div
                            key={c.letter}
                            className={cn(
                              'p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm',
                              c.isCorrect
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                : isChosenByUser
                                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-50 dark:bg-zinc-950/40 border-slate-200/80 dark:border-zinc-800'
                            )}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <span
                                className={cn(
                                  'w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5',
                                  c.isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isChosenByUser
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                                )}
                              >
                                {c.letter}
                              </span>

                              <div className="min-w-0 space-y-1">
                                <div className="font-bold text-foreground">
                                  &ldquo;{c.text}&rdquo;
                                  {c.isCorrect && (
                                    <span className="ml-2 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                      ✓ ĐÁP ÁN ĐÚNG
                                    </span>
                                  )}
                                  {isChosenByUser && !c.isCorrect && (
                                    <span className="ml-2 text-xs font-black text-rose-600 dark:text-rose-400">
                                      ✗ LỰA CHỌN CỦA BẠN (SAI)
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {c.translation}
                                </div>
                                {c.trap && (
                                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 inline-block">
                                    ⚠️ {c.trap.trapNameVi}: {c.trap.analysisVi}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => soundAudioPlayer.speakText(c.text, 0.95)}
                              className="rounded-xl h-8 px-2.5 shrink-0 self-end sm:self-auto text-xs font-bold"
                            >
                              <Volume2 className="w-3.5 h-3.5 mr-1" /> Nghe
                            </Button>
                          </div>
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
    </div>
  );
};
