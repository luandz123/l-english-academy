import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';
import { useSound } from '@/hooks/useSound';
import { transcribeSpeech } from '@/lib/api/speaking';
import { StepRibbon } from './shared';

/** Một câu để nhại theo. */
export interface ShadowItem {
  key: string;
  text: string;
  translation?: string;
  /** Nhãn trên thẻ câu, vd. "Câu hỏi", "Đáp án (C)", "Nữ 1" */
  label: string;
  /** Nhãn nút chọn câu, vd. "7·Hỏi", "3" */
  tab: string;
  imageUrl?: string;
}

interface ShadowingStepProps {
  items: ShadowItem[];
  howTo: string;
  onComplete: () => void;
}

const PASS = 60;

// So khớp từng từ giữa câu mẫu và câu nói
function calculateWordAccuracy(target: string, spoken: string): {
  score: number;
  wordStatuses: Array<{ word: string; matched: boolean }>;
} {
  const targetWords = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const spokenWords = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  if (targetWords.length === 0) return { score: 100, wordStatuses: [] };
  if (spokenWords.length === 0) {
    return { score: 0, wordStatuses: targetWords.map((w) => ({ word: w, matched: false })) };
  }

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

  return { score: Math.min(100, Math.max(0, Math.round((matchCount / targetWords.length) * 100))), wordStatuses };
}

const stars = (s: number) => (s >= 90 ? 3 : s >= 75 ? 2 : s >= PASS ? 1 : 0);

export const ShadowingStep: React.FC<ShadowingStepProps> = ({ items, howTo, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingActiveRef = useRef(false);
  const recognitionFailedRef = useRef(false);
  // Nhận giọng của trình duyệt không chạy → khi dừng, gửi bản ghi lên server (Whisper) để chấm
  const serverEvalRef = useRef(false);
  const recognitionSupportedRef = useRef(false);
  const attemptRef = useRef(0);
  const audioChunksRef = useRef<Blob[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playSound } = useSound();

  const current = items[index];
  const targetText = current?.text ?? '';
  const targetKey = current?.key ?? '';

  const speakCurrentTarget = useCallback(() => {
    void soundAudioPlayer.speakText(targetText, 0.9);
  }, [targetText]);

  // Đổi câu: dọn bản ghi cũ và đọc mẫu
  useEffect(() => {
    soundAudioPlayer.stop();
    stopRecording(false);
    setUserAudioUrl(null);
    setSpokenTranscript('');
    setMicError(null);
    const timer = setTimeout(() => speakCurrentTarget(), 250);
    return () => {
      clearTimeout(timer);
      soundAudioPlayer.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, speakCurrentTarget]);

  useEffect(() => {
    return () => {
      soundAudioPlayer.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // đã dừng
        }
      }
    };
  }, []);

  const applyScoreFor = (key: string, text: string, spoken: string) => {
    const { score } = calculateWordAccuracy(text, spoken);
    setScores((prev) => ({ ...prev, [key]: score }));
    playSound(score >= PASS ? 'correct' : 'incorrect');
  };

  const startRecording = async () => {
    soundAudioPlayer.stop();
    setMicError(null);
    setSpokenTranscript('');
    setUserAudioUrl(null);
    audioChunksRef.current = [];
    recordingActiveRef.current = true;
    recognitionFailedRef.current = false;
    serverEvalRef.current = false;
    const attempt = ++attemptRef.current;
    const key = targetKey;
    const text = targetText;

    const evaluateOnServer = async (audioBlob: Blob) => {
      const { data, error } = await transcribeSpeech(audioBlob);
      if (attempt !== attemptRef.current) return; // đã sang câu khác hoặc ghi lại
      if (data) {
        setMicError(null);
        setSpokenTranscript(data.text);
        applyScoreFor(key, text, data.text);
      } else {
        console.warn('transcribeSpeech error:', error?.message);
        // Trình duyệt không có nhận giọng: giữ như cũ (chấm với chữ rỗng)
        if (!recognitionSupportedRef.current) applyScoreFor(key, text, '');
      }
    };

    // 1. Ghi âm để nghe lại
    const startMediaRecorder = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!recordingActiveRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
          };
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setUserAudioUrl(URL.createObjectURL(audioBlob));
            stream.getTracks().forEach((track) => track.stop());
            if (serverEvalRef.current && attempt === attemptRef.current) {
              serverEvalRef.current = false;
              void evaluateOnServer(new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' }));
            }
          };
          mediaRecorder.start();
        }
      } catch {
        setMicError('Vui lòng bật quyền Micro để luyện nói.');
      }
    };

    // 2. Nhận giọng của trình duyệt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionSupportedRef.current = Boolean(SpeechRecognition);
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let curr = '';
          for (let i = 0; i < event.results.length; i++) curr += event.results[i][0].transcript + ' ';
          setSpokenTranscript(curr.trim());
        };

        // Mở MediaRecorder sau khi nhận giọng đã giữ micro: mở cùng lúc làm tai nghe
        // (nhất là Bluetooth) đổi chế độ micro giữa chừng → nhận giọng lỗi audio-capture.
        recognition.onaudiostart = () => {
          void startMediaRecorder();
        };

        recognition.onerror = (event: { error: string }) => {
          const messages: Record<string, string> = {
            'not-allowed': 'Vui lòng bật quyền Micro để luyện nói.',
            'service-not-allowed': 'Vui lòng bật quyền Micro để luyện nói.',
            'audio-capture': 'Không lấy được micro. Kiểm tra tai nghe/micro đang chọn rồi thử lại.',
            network:
              'Trình duyệt không kết nối được dịch vụ nhận giọng nói nên không chấm điểm được. Bạn vẫn nghe lại được bản ghi để tự so với câu mẫu.',
            'no-speech': 'Không nghe thấy giọng nói. Hãy nói gần micro hơn.',
          };
          if (event.error === 'aborted') return;
          setMicError(messages[event.error] ?? 'Không nhận được giọng nói. Hãy thử lại.');
          if (event.error !== 'no-speech') {
            recognitionFailedRef.current = true;
            if (mediaRecorderRef.current?.state !== 'recording') void startMediaRecorder();
          }
        };

        recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition error:', e);
        recognitionFailedRef.current = true;
        await startMediaRecorder();
      }
    } else {
      await startMediaRecorder();
    }

    setIsRecording(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => stopRecording(true), 15000); // tự dừng sau 15 giây
  };

  const stopRecording = (evaluate = true) => {
    recordingActiveRef.current = false;
    const recorderRunning = mediaRecorderRef.current?.state === 'recording';
    const useServer = evaluate && (recognitionFailedRef.current || !recognitionSupportedRef.current);
    if (!evaluate) attemptRef.current++;
    serverEvalRef.current = useServer && recorderRunning;
    setIsRecording(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // đã dừng
      }
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // đã dừng
      }
    }
    if (evaluate && !useServer) {
      const key = targetKey;
      const text = targetText;
      setTimeout(() => {
        setSpokenTranscript((latest) => {
          applyScoreFor(key, text, latest);
          return latest;
        });
      }, 300);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording(true);
    else void startRecording();
  };

  const handlePrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const handleNext = useCallback(() => {
    if (index < items.length - 1) setIndex(index + 1);
    else onComplete();
  }, [index, items.length, onComplete]);

  // Phím tắt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        speakCurrentTarget();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleRecording();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePrev, handleNext, isRecording, speakCurrentTarget]);

  if (!current) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <StepRibbon howTo={howTo} />
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <Button onClick={onComplete} className="h-10 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950">
            Sang bước tiếp
          </Button>
        </div>
      </div>
    );
  }

  const currentScore = scores[targetKey];
  const { wordStatuses } = calculateWordAccuracy(targetText, spokenTranscript);
  const passedCount = items.filter((it) => (scores[it.key] ?? 0) >= PASS).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <StepRibbon howTo={howTo} right={`Đạt ${passedCount}/${items.length} câu`} />

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {items.map((it, idx) => {
          const pass = (scores[it.key] ?? 0) >= PASS;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => setIndex(idx)}
              aria-current={idx === index ? 'step' : undefined}
              className={cn(
                'min-h-10 px-3 rounded-xl font-black text-xs shrink-0 flex items-center gap-1 border',
                idx === index
                  ? 'bg-violet-600 text-white border-violet-600'
                  : pass
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-card text-muted-foreground border-border',
              )}
            >
              {it.tab}
              {pass && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {current.imageUrl && (
        <div className="bg-card border border-border/80 rounded-2xl p-3 flex justify-center">
          <img src={current.imageUrl} alt="Tranh của câu" className="max-h-56 sm:max-h-64 w-auto rounded-xl object-contain" />
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 space-y-6 text-center">
        <div className="bg-muted/40 border border-border/80 rounded-2xl p-4 sm:p-5 space-y-2 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase text-violet-400">{current.label}</span>
            <Button size="sm" variant="outline" onClick={speakCurrentTarget} className="h-10 rounded-xl text-xs font-bold">
              <Volume2 className="w-3.5 h-3.5 mr-1" /> Nghe mẫu
            </Button>
          </div>
          <div className="text-lg sm:text-xl font-black text-foreground">"{targetText}"</div>
          {current.translation && <div className="text-xs text-muted-foreground">{current.translation}</div>}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={toggleRecording}
              className={cn(
                'h-14 px-7 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95',
                isRecording ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' : 'bg-violet-600 hover:bg-violet-700',
              )}
            >
              {isRecording ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
              {isRecording ? 'Dừng thu' : 'Thu âm'}
            </Button>
            {userAudioUrl && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => void new Audio(userAudioUrl).play()}
                className="h-14 px-5 rounded-2xl font-bold text-sm"
              >
                <Volume2 className="w-4 h-4 mr-1.5" /> Nghe lại
              </Button>
            )}
          </div>
          {micError && (
            <p className="text-xs text-rose-500 flex items-center justify-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> {micError}
            </p>
          )}
        </div>

        {spokenTranscript && (
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 sm:p-5 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Bạn đã nói:</span>
              {currentScore !== undefined && (
                <span
                  className={cn(
                    'text-sm font-black',
                    currentScore >= 80 ? 'text-emerald-500' : currentScore >= PASS ? 'text-amber-500' : 'text-rose-500',
                  )}
                >
                  Độ chính xác: {currentScore}%
                </span>
              )}
            </div>
            {currentScore !== undefined && (
              <div className="flex items-center gap-2" aria-label={`${stars(currentScore)} trên 3 sao`}>
                <span className="text-lg leading-none tracking-wider" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={stars(currentScore) >= n ? 'text-amber-400' : 'text-muted-foreground/30'}>
                      ★
                    </span>
                  ))}
                </span>
                <span className="text-xs font-bold text-foreground">
                  {currentScore >= 90
                    ? 'Tuyệt vời, nghe như người bản xứ!'
                    : currentScore >= 75
                    ? 'Rất tốt! Thử lại để lấy đủ 3 sao.'
                    : currentScore >= PASS
                    ? 'Đạt rồi! Nhìn các từ gạch đỏ và nói lại nhé.'
                    : 'Chưa đạt 60%. Bấm Nghe mẫu rồi nói chậm, rõ từng từ.'}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {wordStatuses.map((ws, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs sm:text-sm font-mono',
                    ws.matched
                      ? 'bg-emerald-500/20 text-emerald-300 font-black'
                      : 'bg-rose-500/15 text-rose-400 line-through',
                  )}
                >
                  {ws.word}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">Nhận diện: "{spokenTranscript}"</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button variant="ghost" onClick={handlePrev} disabled={index === 0} className="h-11 px-3 rounded-xl font-bold text-xs">
            <ChevronLeft className="w-4 h-4 mr-1" /> Trước
          </Button>
          <Button
            onClick={handleNext}
            className="h-11 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs"
          >
            {index === items.length - 1 ? 'Xong bước này' : 'Câu tiếp'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShadowingStep;
