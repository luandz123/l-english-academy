import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundAudioPlayer } from '@/services/soundAudioPlayer';

describe('SoundAudioPlayer playback and sequence behavior', () => {
  beforeEach(() => {
    soundAudioPlayer.stop();
  });

  it('checks notification state during speakSequence remains true continuously', async () => {
    globalThis.Audio = class MockAudio {
      src = '';
      playbackRate = 1.0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onplay: (() => void) | null = null;

      play() {
        setTimeout(() => {
          this.onended?.();
        }, 10);
        return Promise.resolve();
      }

      pause() {}
    } as any;

    const notifications: boolean[] = [];
    const unsub = soundAudioPlayer.subscribe((isPlaying) => {
      notifications.push(isPlaying);
    });

    const items = [
      { text: 'Question 1', pauseAfterMs: 20 },
      { text: '(A) Option A', pauseAfterMs: 20 },
    ];

    await soundAudioPlayer.speakSequence(items);
    unsub();

    // Sequence starts with true, never dips to false in the middle, and ends with false
    expect(notifications[0]).toBe(false); // from initial stop()
    expect(notifications[notifications.length - 1]).toBe(false); // from finish
    // Check all intermediate states are true
    const intermediate = notifications.slice(1, -1);
    expect(intermediate.length).toBeGreaterThan(0);
    expect(intermediate.every((v) => v === true)).toBe(true);
  });

  it('checks what happens when speakSequence is called again during sequence pause', async () => {
    const playedUrls: string[] = [];

    globalThis.Audio = class MockAudio {
      src = '';
      playbackRate = 1.0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onplay: (() => void) | null = null;

      play() {
        playedUrls.push(this.src);
        setTimeout(() => {
          this.onended?.();
        }, 10);
        return Promise.resolve();
      }

      pause() {}
    } as any;

    const items = [
      { text: 'Question 1', pauseAfterMs: 100 },
      { text: '(A) Option A', pauseAfterMs: 100 },
    ];

    // Start sequence 1
    const p1 = soundAudioPlayer.speakSequence(items);

    // Wait 15ms so Question 1 finishes playing and we are in the 100ms pause
    await new Promise((r) => setTimeout(r, 15));

    // Now start sequence 2 (as if user clicked Play again during pause)
    const p2 = soundAudioPlayer.speakSequence(items);

    await Promise.all([p1, p2]);

    console.log('Played URLs when restarted in pause:', playedUrls);
    expect(playedUrls).toHaveLength(3);
  });

  it('checks what happens if audio element triggers error AND play rejects (fallback duplication)', async () => {
    globalThis.Audio = class MockAudio {
      src = '';
      playbackRate = 1.0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onplay: (() => void) | null = null;

      play() {
        setTimeout(() => {
          this.onerror?.();
        }, 5);
        return Promise.reject(new Error('Format error / 404'));
      }

      pause() {}
    } as any;

    const speakMock = vi.fn();
    globalThis.speechSynthesis = {
      speak: speakMock,
      cancel: vi.fn(),
    } as any;
    globalThis.SpeechSynthesisUtterance = class {
      lang = '';
      rate = 1;
      onend: any = null;
      onerror: any = null;
      constructor(public text: string) {
        setTimeout(() => this.onend?.(), 10);
      }
    } as any;

    await soundAudioPlayer.speakText('Test sentence');

    // Exactly 1 speak call, NO duplicate calls!
    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});
