import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useSound } from '@/hooks/useSound';

interface Part2Step5ShadowingProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
}

// Precise word matching algorithm
function calculateWordAccuracy(target: string, spoken: string): {
  score: number;
  wordStatuses: Array<{ word: string; matched: boolean }>;
} {
  const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const targetWords = cleanTarget.split(/\s+/).filter(Boolean);

  const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);

  if (targetWords.length === 0) return { score: 100, wordStatuses: [] };
  if (spokenWords.length === 0) {
    return {
      score: 0,
      wordStatuses: targetWords.map((w) => ({ word: w, matched: false })),
    };
  }

  // Count matched occurrences
  const spokenPool = [...spokenWords];
  let matchCount = 0;
  const wordStatuses = targetWords.map((tw) => {
    const idx = spokenPool.findIndex((sw) => sw === tw || (tw.length > 3 && sw.includes(tw)));
    if (idx !== -1) {
      spokenPool.splice(idx, 1);
      matchCount += 1;
      return { word: tw, matched: true };
    }
    return { word: tw, matched: false };
  });

  const rawPercent = Math.round((matchCount / targetWords.length) * 100);
  return {
    score: Math.min(100, Math.max(0, rawPercent)),
    wordStatuses,
  };
}

export const Part2Step5Shadowing: React.FC<Part2Step5ShadowingProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subTurn, setSubTurn] = useState<'question' | 'answer'>('question');
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useSound();

  const currentQ = questions[currentIndex];
  const targetText = subTurn === 'question' ? currentQ.questionText : currentQ.correctChoice.text;
  const targetKey = `${currentQ.id}-${subTurn}`;

  const speakCurrentTarget = useCallback(() => {
    soundAudioPlayer.speakText(targetText, 0.9);
  }, [targetText]);

  // Clean and auto-play when question or sub-turn changes
  useEffect(() => {
    soundAudioPlayer.stop();
    stopRecording(false);
    setUserAudioUrl(null);
    setSpokenTranscript('');
    setMicError(null);

    const timer = setTimeout(() => {
      speakCurrentTarget();
    }, 250);

    return () => {
      clearTimeout(timer);
      soundAudioPlayer.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, subTurn, speakCurrentTarget]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
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

  const startRecording = async () => {
    soundAudioPlayer.stop();
    setMicError(null);
    setSpokenTranscript('');
    setUserAudioUrl(null);
    audioChunksRef.current = [];

    // 1. Audio MediaRecorder
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setUserAudioUrl(URL.createObjectURL(audioBlob));
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      }
    } catch (err) {
      setMicError('Vui lòng bật quyền Micro để luyện nói.');
    }

    // 2. SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let recognizedText = '';
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let curr = '';
          for (let i = 0; i < event.results.length; i++) {
            curr += event.results[i][0].transcript + ' ';
          }
          recognizedText = curr.trim();
          setSpokenTranscript(recognizedText);
        };

        recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition error:', e);
      }
    }

    setIsRecording(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setTimeout(() => {
      stopRecording(true);
    }, 10000); // 10s auto stop
  };

  const stopRecording = (evaluate = true) => {
    setIsRecording(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (evaluate) {
      setTimeout(() => {
        setSpokenTranscript((latest) => {
          const { score } = calculateWordAccuracy(targetText, latest);
          setScores((prev) => ({ ...prev, [targetKey]: score }));
          if (score >= 60) {
            playSound('correct');
          } else {
            playSound('incorrect');
          }
          return latest;
        });
      }, 300);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording(true);
    } else {
      startRecording();
    }
  };

  const currentScore = scores[targetKey];
  const { wordStatuses } = calculateWordAccuracy(targetText, spokenTranscript);

  const isQDone = (scores[`${currentQ.id}-question`] || 0) >= 60;
  const isADone = (scores[`${currentQ.id}-answer`] || 0) >= 60;
  const isBothDone = isQDone && isADone;

  const handlePrev = useCallback(() => {
    if (subTurn === 'answer') {
      setSubTurn('question');
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSubTurn('answer');
    }
  }, [subTurn, currentIndex]);

  const handleNext = useCallback(() => {
    if (subTurn === 'question') {
      setSubTurn('answer');
    } else if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSubTurn('question');
    } else {
      onCompleteStep();
    }
  }, [subTurn, currentIndex, questions.length, onCompleteStep]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        speakCurrentTarget();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleRecording();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        speakCurrentTarget();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isRecording, speakCurrentTarget]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse shrink-0" />
          <span className="font-black text-violet-600 dark:text-violet-400">B5: Shadowing</span>
          <span className="text-muted-foreground text-xs">• Luyện giọng 2 lượt</span>
        </div>
        <span className="text-xs font-black text-muted-foreground">
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          const qPass = (scores[`${q.id}-question`] || 0) >= 60;
          const aPass = (scores[`${q.id}-answer`] || 0) >= 60;
          const allPass = qPass && aPass;

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setSubTurn('question');
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                  : allPass
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
              {allPass && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Sub-turn Splitter (Lượt 1: Hỏi vs Lượt 2: Đáp) */}
      <div className="grid grid-cols-2 gap-3 p-1 bg-muted/60 rounded-2xl">
        <button
          onClick={() => setSubTurn('question')}
          className={cn(
            'py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer',
            subTurn === 'question'
              ? 'bg-card text-foreground shadow-xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>1. Câu hỏi</span>
          {isQDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {scores[`${currentQ.id}-question`] !== undefined && (
            <span className="text-[11px] font-mono">({scores[`${currentQ.id}-question`]}%)</span>
          )}
        </button>

        <button
          onClick={() => setSubTurn('answer')}
          className={cn(
            'py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer',
            subTurn === 'answer'
              ? 'bg-card text-foreground shadow-xs font-black'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>2. Đáp án</span>
          {isADone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
          {scores[`${currentQ.id}-answer`] !== undefined && (
            <span className="text-[11px] font-mono">({scores[`${currentQ.id}-answer`]}%)</span>
          )}
        </button>
      </div>

      {/* Main Shadowing Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-soft-sm text-center">
        {/* Target sentence display */}
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-5 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-violet-600 dark:text-violet-400">
              {subTurn === 'question' ? 'Mẫu câu hỏi bản xứ' : `Đáp án (${currentQ.correctChoice.letter})`}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={speakCurrentTarget}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1" />
              Nghe mẫu
            </Button>
          </div>

          <div className="text-lg sm:text-xl font-black text-foreground">
            "{targetText}"
          </div>

          <div className="text-xs text-muted-foreground">
            {subTurn === 'question' ? currentQ.questionTranslation : currentQ.correctChoice.translation}
          </div>
        </div>

        {/* Recording Action Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={toggleRecording}
              className={cn(
                'h-14 px-7 rounded-2xl text-white font-bold text-sm shadow-md transition-transform active:scale-95 cursor-pointer',
                isRecording
                  ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                  : 'bg-violet-600 hover:bg-violet-700'
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
              {isRecording ? 'Dừng thu' : 'Thu âm'}
            </Button>

            {userAudioUrl && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const audio = new Audio(userAudioUrl);
                  audio.play();
                }}
                className="h-14 px-5 rounded-2xl font-bold text-sm border-border cursor-pointer"
              >
                <Volume2 className="w-4 h-4 mr-1.5" />
                Nghe lại
              </Button>
            )}
          </div>

          {micError && (
            <p className="text-xs text-rose-500 flex items-center justify-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> {micError}
            </p>
          )}
        </div>

        {/* Word Match & Accuracy Result Display */}
        {spokenTranscript && (
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-5 space-y-3 text-left animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Bạn đã nói:</span>
              {currentScore !== undefined && (
                <span className={cn(
                  'text-sm font-black',
                  currentScore >= 80 ? 'text-emerald-500' : currentScore >= 60 ? 'text-amber-500' : 'text-rose-500'
                )}>
                  Độ chính xác: {currentScore}%
                </span>
              )}
            </div>

            {/* Word by word highlight */}
            <div className="flex flex-wrap gap-1.5 text-sm sm:text-base font-bold">
              {wordStatuses.map((ws, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs sm:text-sm font-mono transition-colors',
                    ws.matched
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 line-through'
                  )}
                >
                  {ws.word}
                </span>
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic">
              Nhận diện: "{spokenTranscript}"
            </p>
          </div>
        )}

        {/* Navigation Row */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentIndex === 0 && subTurn === 'question'}
            className="h-9 px-3 rounded-xl font-bold text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Trước
          </Button>

          <Button
            onClick={handleNext}
            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
          >
            {currentIndex === questions.length - 1 && subTurn === 'answer' ? 'Xong B5' : 'Tiếp'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
