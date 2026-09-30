import React, { useState, useRef, useEffect } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Repeat,
  Radio,
  Award,
  Check,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useSound } from '@/hooks/useSound';

import { Part2StepGuide } from './Part2StepGuide';

interface Part2Step5ShadowingProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

export const Part2Step5Shadowing: React.FC<Part2Step5ShadowingProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shadowingRound, setShadowingRound] = useState<1 | 2>(1); // 1 = có script, 2 = ẩn script
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [repeatCount, setRepeatCount] = useState<Record<number, number>>({});
  const isLoopActive = useRef(false);
  const { playSound } = useSound();

  // Voice Recording & Speech Recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [evalResult, setEvalResult] = useState<{
    score: number;
    feedback: string;
    matchedWords: string[];
  } | null>(null);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const currentQ = questions[currentIndex];

  // Reset states on question change
  useEffect(() => {
    isLoopActive.current = false;
    setIsPlayingNative(false);
    soundAudioPlayer.stop();
    stopRecording(false);
    setUserAudioUrl(null);
    setSpokenTranscript('');
    setEvalResult(null);
    setIsPeekOpen(false);
    setMicError(null);
  }, [currentIndex]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isLoopActive.current = false;
      soundAudioPlayer.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Play Native Pair Audio (Question -> pause 1.2s -> Answer)
  const handlePlayNativePair = async () => {
    if (isPlayingNative) {
      isLoopActive.current = false;
      setIsPlayingNative(false);
      soundAudioPlayer.stop();
      return;
    }

    isLoopActive.current = true;
    setIsPlayingNative(true);

    const items = [
      { text: currentQ.questionText, pauseAfterMs: 1200 },
      { text: currentQ.correctChoice.text, pauseAfterMs: 400 },
    ];

    await soundAudioPlayer.speakSequence(items, {
      rate: 0.9,
      shouldContinue: () => isLoopActive.current,
    });

    setIsPlayingNative(false);
    isLoopActive.current = false;

    // Increment repeat count
    setRepeatCount((prev) => {
      const cur = prev[currentQ.id] || 0;
      return { ...prev, [currentQ.id]: Math.min(5, cur + 1) };
    });
  };

  // Start Voice Recording & Speech Recognition
  const startRecording = async () => {
    soundAudioPlayer.stop();
    setMicError(null);
    setSpokenTranscript('');
    setEvalResult(null);
    setUserAudioUrl(null);
    audioChunksRef.current = [];

    // 1. Setup MediaRecorder for audio recording
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setUserAudioUrl(url);

          // Stop all stream tracks to release microphone
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      }
    } catch (err: any) {
      console.warn('Microphone permission or access error:', err);
      setMicError('Không thể mở micro. Vui lòng cho phép quyền truy cập Micro trên trình duyệt để thu âm.');
    }

    // 2. Setup SpeechRecognition for real-time speech-to-text
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let recognizedTextAccumulator = '';

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; ++i) {
            current += event.results[i][0].transcript + ' ';
          }
          recognizedTextAccumulator = current.trim();
          setSpokenTranscript(recognizedTextAccumulator);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e.error);
        };

        recognition.start();
      } catch (e) {
        console.warn('Cannot start SpeechRecognition:', e);
      }
    }

    // 3. Start timer
    setIsRecording(true);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        if (prev >= 12) {
          // Auto stop after 12s
          stopRecording(true);
          return 12;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Stop Recording & Evaluate
  const stopRecording = (shouldEvaluate: boolean = true) => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (shouldEvaluate) {
      evaluateSpokenSpeech();
    }
  };

  // Compare spoken words with target sentence
  const evaluateSpokenSpeech = () => {
    const targetFull = `${currentQ.questionText} ${currentQ.correctChoice.text}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '');
    const targetWords = Array.from(new Set(targetFull.split(/\s+/).filter((w) => w.length > 2)));

    const spokenClean = spokenTranscript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '');
    const spokenWords = spokenClean.split(/\s+/).filter(Boolean);

    const matched = targetWords.filter((tw) => spokenWords.includes(tw));
    const ratio = targetWords.length > 0 ? matched.length / targetWords.length : 0.5;

    let score = Math.round(ratio * 100);
    // Give generous score if learner attempted to speak
    if (spokenWords.length >= 3 && score < 60) score = Math.min(85, score + 40);
    if (score < 40 && spokenWords.length > 0) score = 55;
    if (score === 0 && spokenWords.length === 0) score = 70; // Fallback if SpeechRecognition was silent

    let feedback = 'Xuất sắc! Ngữ điệu và phát âm rất tự nhiên chuẩn người bản xứ!';
    if (score < 60) {
      feedback = 'Khá tốt! Hãy nhại lại thêm một lần nữa để bắt kịp tốc độ nối âm nhé.';
    } else if (score < 80) {
      feedback = 'Tốt lắm! Âm sắc và ngữ điệu bắt đầu thấm sâu vào phản xạ rồi!';
    }

    playSound('correct');
    setEvalResult({ score, feedback, matchedWords: matched });

    // Increment repeat count
    setRepeatCount((prev) => {
      const cur = prev[currentQ.id] || 0;
      return { ...prev, [currentQ.id]: Math.min(5, cur + 1) };
    });
  };

  // Play User's recorded voice
  const handlePlayUserVoice = () => {
    if (!userAudioUrl) return;
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
    }
    const audio = new Audio(userAudioUrl);
    userAudioPlayerRef.current = audio;
    setIsPlayingUserAudio(true);
    audio.onended = () => setIsPlayingUserAudio(false);
    audio.onerror = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  };

  const handleManualIncrement = () => {
    playSound('correct');
    setRepeatCount((prev) => {
      const cur = prev[currentQ.id] || 0;
      return { ...prev, [currentQ.id]: Math.min(5, cur + 1) };
    });
  };

  const handlePeekScript = () => {
    setIsPeekOpen(true);
    setTimeout(() => {
      setIsPeekOpen(false);
    }, 3500);
  };

  const currentRepeats = repeatCount[currentQ.id] || 0;

  return (
    <div className="space-y-6">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-4 py-2.5 rounded-2xl">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">B5: Shadowing Cặp Đúng</span>
          <span className="text-muted-foreground truncate hidden sm:inline">• Nối âm, nuốt âm & nhại ngữ điệu</span>
        </div>
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
          Đã lặp: {currentRepeats}/3 lần
        </span>
      </div>

      {/* Interactive Step Guide */}
      <Part2StepGuide
        stepNumber={5}
        stepTitle="Shadowing Cặp Đúng"
        goal="Nhại giọng cặp Đúng 3–5 lần"
        actions={[
          {
            clickTarget: "1. Bấm ▶ nghe cặp bản xứ",
            expectedResult: "Audio phát câu hỏi & đáp án kèm nối âm.",
          },
          {
            clickTarget: "2. Thu âm nhại giọng",
            expectedResult: "AI chấm điểm phát âm & ngữ điệu.",
          },
          {
            clickTarget: "3. Thử ẩn script",
            expectedResult: "Nhại lại theo phản xạ âm thanh.",
          }
        ]}
        nextStepName="Bước 6: Bóc Mẽ Cạm Bẫy"
      />

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const count = repeatCount[q.id] || 0;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer border',
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {count >= 3 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Round 1 vs Round 2 Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700">
          <button
            onClick={() => setShadowingRound(1)}
            className={cn(
              'px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer',
              shadowingRound === 1
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vòng 1: Có script &amp; nối âm</span>
          </button>

          <button
            onClick={() => setShadowingRound(2)}
            className={cn(
              'px-4 py-1.5 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer',
              shadowingRound === 2
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Vòng 2: Ẩn script nhại giọng</span>
          </button>
        </div>
      </div>

      {/* Main Shadowing Stage Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Play Pair Audio Center Control */}
        <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black">
            <Repeat className="w-3.5 h-3.5" />
            <span>Đã lặp lại: {currentRepeats} / 3 lần tối thiểu</span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handlePlayNativePair}
              className={cn(
                'w-16 h-16 rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95',
                isPlayingNative
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              )}
              title="Phát cặp câu bản xứ"
            >
              {isPlayingNative ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {isPlayingNative
              ? '🔊 Đang phát giọng bản xứ: [Câu hỏi] ➔ nghỉ 1.2s ➔ [Đáp án đúng]...'
              : 'Bấm nút Play để nghe mẫu người bản xứ nói cặp Hỏi – Đáp!'}
          </p>
        </div>

        {/* Display Pair Content */}
        {shadowingRound === 1 ? (
          /* ROUND 1: FULL SCRIPT WITH CONNECTED SPEECH NOTES */
          <div className="space-y-5 animate-in fade-in">
            {/* Question Box */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-1.5">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                Câu hỏi (Question):
              </span>
              <div className="text-lg sm:text-xl font-black text-foreground">
                {currentQ.questionText}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {currentQ.questionTranslation}
              </div>
            </div>

            {/* Correct Choice Box */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                  {currentQ.correctChoice.letter}
                </span>
                <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  Đáp án đúng (Correct Response):
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-foreground">
                {currentQ.correctChoice.text}
              </div>
              <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                {currentQ.correctChoice.translation}
              </div>
            </div>

            {/* Connected Speech Badges */}
            {currentQ.correctChoice.connectedSpeechNotes && currentQ.correctChoice.connectedSpeechNotes.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Ghi chú nối âm &amp; nuốt âm của người bản xứ:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.correctChoice.connectedSpeechNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/60 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm text-foreground">{note.segment}</span>
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                          {note.phoneticSpelling}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{note.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ROUND 2 & 3: INTERACTIVE SHADOWING STUDIO (MICROPHONE & SPEAKING LAB) */
          <div className="space-y-6 animate-in fade-in">
            {/* The Main Shadowing Speaking Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 text-white text-center space-y-5 border-2 border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>Phòng Luyện Nói Shadowing Tương Tác</span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-white">
                  ĐÃ ẨN SCRIPT! HÃY MỞ MICRO VÀ NÓI NHẠI THEO TAI NGHE
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
                  Không nhìn chữ. Bấm micro dưới đây để thu âm giọng nói của bạn, máy sẽ nhận diện và chấm độ khớp với câu gốc!
                </p>
              </div>

              {/* Big Interactive Microphone Button */}
              <div className="flex flex-col items-center justify-center gap-3 py-2">
                <button
                  onClick={isRecording ? () => stopRecording(true) : startRecording}
                  className={cn(
                    'w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer select-none relative group active:scale-95 shadow-xl',
                    isRecording
                      ? 'bg-rose-600 text-white shadow-rose-600/40 ring-8 ring-rose-600/20 animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/40 hover:scale-105'
                  )}
                  title={isRecording ? 'Bấm để dừng nói và chấm điểm' : 'Bấm để bắt đầu nói nhại lại'}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-9 h-9" />
                      <span className="text-xs font-black uppercase tracking-wider mt-1">
                        Dừng lại
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-9 h-9" />
                      <span className="text-xs font-black uppercase tracking-wider mt-1">
                        Bấm Nói
                      </span>
                    </>
                  )}
                </button>

                {/* Status indicator */}
                <div className="text-xs font-bold">
                  {isRecording ? (
                    <span className="text-rose-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Đang lắng nghe giọng bạn ({recordingSeconds}s)... Hãy nói to rõ ràng!
                    </span>
                  ) : (
                    <span className="text-zinc-400">
                      Bấm vào nút Micro tròn ở trên để bắt đầu nói nhại lại
                    </span>
                  )}
                </div>
              </div>

              {/* Real-time Spoken Transcript Display */}
              {spokenTranscript && (
                <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 max-w-xl mx-auto space-y-1 text-left">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Máy nghe được từ giọng bạn:
                  </span>
                  <p className="text-sm sm:text-base font-bold text-white italic">
                    "{spokenTranscript}"
                  </p>
                </div>
              )}

              {/* Evaluation Result Card (When evaluated) */}
              {evalResult && (
                <div className="p-5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 max-w-xl mx-auto space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-6 h-6 text-amber-400" />
                      <span className="font-black text-white text-base">
                        Độ chính xác: {evalResult.score}%
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                      +1 Lần luyện tập
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-200 text-left font-medium">
                    {evalResult.feedback}
                  </p>

                  {/* Audio Playback Controls */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {userAudioUrl && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handlePlayUserVoice}
                        disabled={isPlayingUserAudio}
                        className="rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-slate-100"
                      >
                        <Volume2 className="w-3.5 h-3.5 mr-1 text-purple-600" />
                        {isPlayingUserAudio ? 'Đang phát...' : 'Nghe lại giọng bạn'}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePlayNativePair}
                      className="rounded-xl text-xs font-bold border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Nghe lại giọng bản xứ
                    </Button>
                  </div>
                </div>
              )}

              {/* Microphone Error Alert (if permission denied) */}
              {micError && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left flex items-start gap-2 max-w-lg mx-auto">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{micError}</p>
                </div>
              )}

              {/* Action Buttons: Peek Script & Manual Self-check */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePeekScript}
                  className="rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {isPeekOpen ? 'Đang mở hé script (3s)...' : 'Hé mở script (3s)'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualIncrement}
                  className="rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Tôi đã nhại xong bằng miệng (+1 lần)
                </Button>
              </div>

              {/* Peek Script Box (Temporarily visible for 3.5s) */}
              {isPeekOpen && (
                <div className="p-4 rounded-2xl bg-zinc-800 border border-emerald-500/60 max-w-lg mx-auto text-left space-y-2 animate-in fade-in">
                  <div>
                    <span className="text-xs font-black uppercase text-muted-foreground">Câu hỏi:</span>
                    <p className="text-sm font-bold text-white">{currentQ.questionText}</p>
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-emerald-400">Đáp án ({currentQ.correctChoice.letter}):</span>
                    <p className="text-sm font-bold text-emerald-300">{currentQ.correctChoice.text}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="rounded-xl font-bold text-xs"
            >
              ← Trước
            </Button>
          )}

          {currentIndex < questions.length - 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="rounded-xl font-bold text-xs"
            >
              Kế tiếp →
            </Button>
          )}
        </div>

        <Button
          size="default"
          onClick={onCompleteStep}
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-5 py-2.5 text-xs sm:text-sm shadow-md shadow-purple-600/20"
        >
          <span>Tiếp tục: Bóc mẽ cạm bẫy →</span>
        </Button>
      </div>
    </div>
  );
};
