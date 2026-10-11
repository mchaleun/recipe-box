// Keeps the screen on during Cooking Mode. Uses the Screen Wake Lock API where
// the browser allows it (secure pages), and otherwise falls back to playing a
// tiny silent looping video, which also keeps iPhones and iPads awake.

const VIDEO = 'data:video/mp4;base64,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b21hX21lPTEgdHJlbGxpcz0xIDh4OGRjdD0wIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PS0yIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD0yNTAga2V5aW50X21pbj0xIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAADmWIhAW///8PRQABT3+AARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAcAAAAGQZo4CvqAARggBwEYIAcBGCAHARggBwEYIAcBGCAHARggBwEYIAc=';

export type AwakeMode = 'wakelock' | 'video' | 'off';

export function keepAwake(onChange: (mode: AwakeMode) => void): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let video: HTMLVideoElement | null = null;
  let stopped = false;

  const startVideo = () => {
    if (video || stopped) return;
    video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.muted = true;
    video.loop = true;
    video.src = VIDEO;
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', bottom: '0', left: '0' });
    document.body.appendChild(video);
    video.play().then(() => onChange('video')).catch(() => onChange('off'));
  };

  const request = async () => {
    if (stopped) return;
    if ('wakeLock' in navigator && window.isSecureContext) {
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (stopped) { sentinel.release(); return; }
        onChange('wakelock');
        sentinel.addEventListener('release', () => { if (!stopped) onChange('off'); });
        return;
      } catch { /* fall through to the video */ }
    }
    startVideo();
  };

  const onVisible = () => { if (document.visibilityState === 'visible') { if (video) video.play().catch(() => {}); else request(); } };
  // Video playback needs a user gesture on some browsers; retry on the first tap.
  const onTap = () => { if (video?.paused) video.play().then(() => onChange('video')).catch(() => {}); };

  request();
  document.addEventListener('visibilitychange', onVisible);
  document.addEventListener('pointerdown', onTap);
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisible);
    document.removeEventListener('pointerdown', onTap);
    sentinel?.release().catch(() => {});
    video?.remove();
  };
}
