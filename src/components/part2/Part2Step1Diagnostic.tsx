import React, { useState, useEffect, useCallback } from 'react';
import { PART2_STEPS_META } from '@/data/part2CoachData';
import { Part2CoachQuestion } from '@/types/part2Coach';
import { Button } from '@/components/ui/button';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part2SpatialWaveformPlayer, WaveformSegment } from './Part2SpatialWaveformPlayer';

const FOUR_CHOICE_SEGMENTS: WaveformSegment[] = [
  { id: 'q', label: 'Câu hỏi', subLabel: 'Nghe bắt Key' },
  { id: 'p1', label: 'Nghỉ', isPause: true },
  { id: 'a', label: 'Đáp án (A)', subLabel: 'Lựa chọn A' },
  { id: 'p2', label: 'Nghỉ', isPause: true },
  { id: 'b', label: 'Đáp án (B)', subLabel: 'Lựa chọn B' },
  { id: 'p3', label: 'Nghỉ', isPause: true },
  { id: 'c', label: 'Đáp án (C)', subLabel: 'Lựa chọn C' },
  { id: 'p4', label: 'Nghỉ', isPause: true },
  { id: 'd', label: 'Đáp án (D)', subLabel: 'Lựa chọn D' },
];

interface Part2Step1DiagnosticProps {
  questions: Part2CoachQuestion[];
  onCompleteStep: () => void;
  onSaveDiagnostics?: (data: Record<number, { guess: 'A' | 'B' | 'C' | 'D'; rating: number }>) => void;
}

export const Part2Step1Diagnostic: React.FC<Part2Step1DiagnosticProps> = ({
  questions,
  onCompleteStep,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const currentQ = questions[currentIndex];

  const getOptionTexts = useCallback(() => {
    if (!currentQ) return { aText: '', bText: '', cText: '', dText: '', hasD: false };
    const findText = (letter: 'A' | 'B' | 'C' | 'D') =>
      currentQ.correctChoice.letter === letter
        ? currentQ.correctChoice.text
        : currentQ.distractors.find((d) => d.letter === letter)?.text || '';
    const aText = findText('A');
    const bText = findText('B');
    const cText = findText('C');
    const dText = findText('D');
    return { aText, bText, cText, dText, hasD: Boolean(dText) };
  }, [currentQ]);

  const { hasD } = getOptionTexts();

  const playAudioSequence = useCallback(() => {
    if (!currentQ) return;
    if (/^https?:\/\//i.test(currentQ.audioUrl || '')) {
      setIsPlaying(true);
      soundAudioPlayer.playUrl(currentQ.audioUrl, 1.0).catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    const { aText, bText, cText, dText, hasD: qHasD } = getOptionTexts();

    const items = [
      { text: currentQ.questionText, pauseAfterMs: 800 },
      { text: `(A) ${aText}`, pauseAfterMs: 600 },
      { text: `(B) ${bText}`, pauseAfterMs: 600 },
      { text: `(C) ${cText}`, pauseAfterMs: qHasD ? 600 : 400 },
      ...(qHasD ? [{ text: `(D) ${dText}`, pauseAfterMs: 400 }] : []),
    ];

    soundAudioPlayer.speakSequence(items, {
      rate: 0.95,
      onStepChange: (idx) => {
        setActiveStepIndex(idx);
      },
    });
  }, [currentQ, getOptionTexts]);

  // Handle clicking directly on a waveform segment
  const handleSelectSegment = useCallback((segIdx: number) => {
    if (!currentQ) return;
    soundAudioPlayer.stop();
    setIsPlaying(true);
    setActiveStepIndex(segIdx);

    const { aText, bText, cText, dText } = getOptionTexts();
    let textToSpeak = '';
    if (segIdx === 0) textToSpeak = currentQ.questionText;
    else if (segIdx === 1) textToSpeak = `(A) ${aText}`;
    else if (segIdx === 2) textToSpeak = `(B) ${bText}`;
    else if (segIdx === 3) textToSpeak = `(C) ${cText}`;
    else if (segIdx === 4 && dText) textToSpeak = `(D) ${dText}`;

    if (textToSpeak) {
      soundAudioPlayer.speakText(textToSpeak, 0.95).finally(() => {
        setIsPlaying(false);
        setActiveStepIndex(null);
      });
    } else {
      setIsPlaying(false);
      setActiveStepIndex(null);
    }
  }, [currentQ, getOptionTexts]);

  // Subscribe to audio state
  useEffect(() => {
    const unsubscribe = soundAudioPlayer.subscribe((playing) => {
      setIsPlaying(playing);
      if (!playing) {
        setActiveStepIndex(null);
      }
    });
    return () => {
      unsubscribe();
      soundAudioPlayer.stop();
    };
  }, []);

  // Auto-play when changing question
  useEffect(() => {
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    const timer = setTimeout(() => {
      playAudioSequence();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentIndex, playAudioSequence]);

  const togglePlayAudio = () => {
    if (isPlaying) {
      soundAudioPlayer.stop();
      setIsPlaying(false);
      setActiveStepIndex(null);
    } else {
      playAudioSequence();
    }
  };

  const handleReplay = () => {
    soundAudioPlayer.stop();
    setIsPlaying(false);
    setActiveStepIndex(null);
    playAudioSequence();
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      soundAudioPlayer.stop();
      onCompleteStep();
    }
  }, [currentIndex, questions.length, onCompleteStep]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto font-sans">
      {/* Sleek Minimal Ribbon */}
      <div className="flex items-center justify-between gap-3 bg-card border border-border/70 px-4 py-2.5 rounded-2xl shadow-soft-xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm text-muted-foreground font-medium leading-snug">{PART2_STEPS_META[0].howTo}</span>
        </div>
        <span className="text-xs font-black text-muted-foreground">
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {questions.map((q, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border',
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              <span>Câu {q.questionNumber || idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Optional Photo / Chart Image (Part 1 & Graphic Part 3/4) */}
      {currentQ?.imageUrl && (
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex justify-center shadow-soft-xs">
          <img
            src={currentQ.imageUrl}
            alt={`Câu ${currentQ.questionNumber}`}
            className="max-h-64 sm:max-h-72 w-auto rounded-xl object-contain"
          />
        </div>
      )}

      {/* Spatial Waveform Player Component */}
      <Part2SpatialWaveformPlayer
        isPlaying={isPlaying}
        activeSegmentIndex={activeStepIndex}
        onTogglePlay={togglePlayAudio}
        onReplay={handleReplay}
        onPrevQuestion={handlePrev}
        onNextQuestion={handleNext}
        canPrev={currentIndex > 0}
        canNext={true}
        onSelectSegment={handleSelectSegment}
        segments={hasD ? FOUR_CHOICE_SEGMENTS : undefined}
        currentQuestionText={currentQ?.part === 'part1' ? undefined : currentQ?.questionText}
      />

      {/* Bottom Step Forward Button */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleNext}
          className="h-10 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-sm"
        >
          {currentIndex === questions.length - 1 ? 'Hoàn thành Bước 1' : 'Câu tiếp theo'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Part2Step1Diagnostic;
