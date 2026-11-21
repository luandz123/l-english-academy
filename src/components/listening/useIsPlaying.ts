import { useEffect, useState } from "react";
import { soundAudioPlayer } from "@/services/soundAudioPlayer";

/** Đang phát âm thanh (file audio hoặc giọng đọc máy) hay không. */
export function useIsPlaying(): boolean {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const unsubscribe = soundAudioPlayer.subscribe((p) => setPlaying(p));
    return () => {
      unsubscribe();
      soundAudioPlayer.stop();
    };
  }, []);
  return playing;
}
