/**
 * Sound & Speech Audio Player Service
 * Giải quyết triệt để lỗi không nghe được audio và lỗi phát trùng âm thanh (A A A) khi nhấn lặp lại nhiều lần.
 * 
 * Cơ chế hoạt động:
 * 1. Generation ID Cancellation: Mỗi lượt phát (đơn lẻ hoặc chuỗi) được cấp một mã sequenceId / playId duy nhất.
 *    Khi người dùng bấm "Phát lại" hay chuyển câu, lượt phát cũ lập tức bị hủy bỏ (isStale = true),
 *    tuyệt đối không bao giờ chạy tiếp hoặc chồng âm.
 * 2. Ngắt kết nối sạch: Khi stop(), toàn bộ Audio element được gỡ bỏ event listener (onended, onerror)
 *    và ngắt kết nối trước khi pause, ngăn chặn triệt để việc trigger fallback ngoài ý muốn.
 * 3. 3 Lớp phát âm thanh:
 *    - Lớp 1: Proxy nội bộ /api/tts?q=... (Vite server middleware) - 100% không dính CORS / Referer.
 *    - Lớp 2: Direct Google TTS Stream với referrer-policy: no-referrer.
 *    - Lớp 3: Fallback Web Speech API (speechSynthesis) nếu offline.
 */

export interface SequenceItem {
  text: string;
  pauseAfterMs?: number;
}

class SoundAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlayId: number = 0;
  private currentSequenceId: number = 0;
  private activeTimeout: any = null;
  private activeListeners: Set<(isPlaying: boolean, currentText?: string) => void> = new Set();

  /**
   * Đăng ký lắng nghe trạng thái phát âm thanh
   */
  subscribe(listener: (isPlaying: boolean, currentText?: string) => void) {
    this.activeListeners.add(listener);
    return () => {
      this.activeListeners.delete(listener);
    };
  }

  private notify(isPlaying: boolean, currentText?: string) {
    this.activeListeners.forEach((l) => {
      try {
        l(isPlaying, currentText);
      } catch (e) {
        console.warn('Audio listener error:', e);
      }
    });
  }

  /**
   * Tạo URL phát TTS chuẩn
   */
  getTTSUrl(text: string): string {
    const clean = text.replace(/\[___\]/g, 'blank').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
    const encoded = encodeURIComponent(clean);
    
    // Nếu chạy trên web app có dev server /api/tts
    if (typeof window !== 'undefined' && window.location.origin) {
      return `/api/tts?q=${encoded}`;
    }
    return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encoded}`;
  }

  /**
   * Dừng toàn bộ âm thanh và hủy bỏ mọi lượt phát chuỗi / đơn lẻ đang chạy
   */
  stop() {
    // 1. Tăng mã chuỗi và mã phát để vô hiệu hóa mọi async loop cũ
    this.currentSequenceId++;
    this.currentPlayId++;

    // 2. Xóa timeout nghỉ giữa các câu
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }

    // 3. Tắt và giải phóng Audio Element hiện tại
    if (this.currentAudio) {
      try {
        const audio = this.currentAudio;
        // Gỡ bỏ toàn bộ callbacks trước khi pause để tránh kích hoạt onerror / catch / onFail
        audio.onended = null;
        audio.onerror = null;
        audio.onplay = null;
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
      } catch (e) {}
      this.currentAudio = null;
    }

    // 4. Hủy Web Speech API nếu đang phát
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    this.notify(false);
  }

  /**
   * Phát một file MP3 từ URL
   */
  playUrl(url: string, rate: number = 1.0): Promise<void> {
    this.stop();
    const playId = ++this.currentPlayId;

    if (!url) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        audio.src = url;
        audio.playbackRate = rate;
        this.currentAudio = audio;

        let resolved = false;
        const finish = () => {
          if (!resolved) {
            resolved = true;
            audio.onended = null;
            audio.onerror = null;
            if (this.currentAudio === audio) {
              this.currentAudio = null;
            }
            if (this.currentPlayId === playId) {
              this.notify(false);
            }
            resolve();
          }
        };

        audio.onplay = () => {
          if (this.currentPlayId === playId) {
            this.notify(true);
          }
        };
        audio.onended = finish;
        audio.onerror = finish;

        const timeout = setTimeout(finish, 20000);
        audio.onended = () => {
          clearTimeout(timeout);
          finish();
        };

        audio.play().catch(() => {
          clearTimeout(timeout);
          finish();
        });
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Phát một câu tiếng Anh đơn lẻ (hỗ trợ kiểm tra sequenceId để không phát đè khi bị hủy)
   */
  speakText(text: string, rate: number = 0.95, parentSequenceId?: number): Promise<void> {
    // Nếu gọi trực tiếp (không nằm trong sequence hợp lệ), dừng toàn bộ âm thanh cũ
    if (parentSequenceId === undefined) {
      this.stop();
    }

    const playId = ++this.currentPlayId;
    const cleanText = text.replace(/\[___\]/g, 'blank').trim();
    if (!cleanText) return Promise.resolve();

    return new Promise((resolve) => {
      const isStale = () => {
        if (this.currentPlayId !== playId) return true;
        if (parentSequenceId !== undefined && this.currentSequenceId !== parentSequenceId) return true;
        return false;
      };

      if (isStale()) {
        resolve();
        return;
      }

      this.notify(true, cleanText);

      // Thử phát qua MP3 Audio Element
      const tryAudioElement = (url: string, onFail: () => void) => {
        if (isStale()) {
          resolve();
          return;
        }

        try {
          const audio = new Audio();
          audio.src = url;
          audio.playbackRate = rate;
          this.currentAudio = audio;

          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              audio.onended = null;
              audio.onerror = null;
              if (this.currentAudio === audio) {
                this.currentAudio = null;
              }
              if (!isStale()) {
                this.notify(false);
              }
              resolve();
            }
          };

          const timeout = setTimeout(() => {
            if (!done) {
              try { audio.pause(); } catch (e) {}
              finish();
            }
          }, 8000);

          audio.onended = () => {
            clearTimeout(timeout);
            finish();
          };

          audio.onerror = () => {
            clearTimeout(timeout);
            // Nếu bị stop() hoặc bị thay thế bởi câu mới, tuyệt đối không gọi onFail để tránh kích hoạt fallback đè lên
            if (isStale()) {
              finish();
              return;
            }
            onFail();
          };

          audio.play().catch(() => {
            clearTimeout(timeout);
            if (isStale()) {
              finish();
              return;
            }
            onFail();
          });
        } catch {
          if (!isStale()) {
            onFail();
          } else {
            resolve();
          }
        }
      };

      // 1. Thử qua proxy nội bộ /api/tts
      const proxyUrl = this.getTTSUrl(cleanText);
      tryAudioElement(proxyUrl, () => {
        if (isStale()) { resolve(); return; }
        // 2. Thử trực tiếp Google TTS
        const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(cleanText.slice(0, 200))}`;
        tryAudioElement(directUrl, () => {
          if (isStale()) { resolve(); return; }
          // 3. Fallback sang Web Speech API
          this.fallbackWebSpeech(cleanText, rate).then(() => {
            if (!isStale()) {
              this.notify(false);
            }
            resolve();
          });
        });
      });
    });
  }

  /**
   * Phát một chuỗi câu liên tiếp (ví dụ: Câu hỏi -> Option A -> Option B -> Option C)
   * Tuyệt đối không bao giờ phát trùng lặp khi người dùng nhấn "Phát lại" liên tục.
   */
  async speakSequence(
    items: SequenceItem[],
    options?: {
      rate?: number;
      onStepChange?: (index: number) => void;
      shouldContinue?: () => boolean;
    }
  ): Promise<void> {
    // 1. Hủy bỏ triệt để bất kỳ chuỗi âm thanh nào đang chạy
    this.stop();

    // 2. Cấp mã sequenceId duy nhất cho lần phát này
    const sequenceId = ++this.currentSequenceId;
    const rate = options?.rate ?? 0.95;

    const isStale = () => {
      return this.currentSequenceId !== sequenceId;
    };

    for (let i = 0; i < items.length; i++) {
      if (isStale()) return;
      if (options?.shouldContinue && !options.shouldContinue()) return;

      options?.onStepChange?.(i);
      const item = items[i];

      // Gửi kèm sequenceId để speakText biết nó thuộc chuỗi này
      await this.speakText(item.text, rate, sequenceId);

      if (isStale()) return;
      if (options?.shouldContinue && !options.shouldContinue()) return;

      // Khoảng nghỉ giữa các câu
      const pause = item.pauseAfterMs ?? 500;
      if (pause > 0) {
        await new Promise<void>((resolve) => {
          this.activeTimeout = setTimeout(() => {
            this.activeTimeout = null;
            resolve();
          }, pause);
        });
      }

      if (isStale()) return;
      if (options?.shouldContinue && !options.shouldContinue()) return;
    }

    if (!isStale()) {
      this.notify(false);
    }
  }

  /**
   * Fallback Web Speech API
   */
  private fallbackWebSpeech(text: string, rate: number = 0.9): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  }
}

export const soundAudioPlayer = new SoundAudioPlayer();
