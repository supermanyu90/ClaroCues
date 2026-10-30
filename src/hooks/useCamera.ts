import { useEffect, useEffectEvent, useRef, useState } from 'react';

/**
 * Streams the user's camera into a <video> while `active` is true. Tracks are always stopped when
 * the camera is turned off or the component unmounts.
 */
export function useCamera(active: boolean, onError: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  // Stable wrapper so a new onError function on each render doesn't restart the camera.
  const reportError = useEffectEvent(onError);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          void video.play().then(() => setIsReady(true));
        }
      })
      .catch(() => reportError('Camera access was blocked. Allow camera permission to practise signs.'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setIsReady(false);
    };
  }, [active]);

  /** Grabs the current frame as base64 JPEG, downscaled to keep uploads small. */
  const captureJpeg = (width = 480, quality = 0.8): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * width);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? null;
  };

  return { videoRef, isReady, captureJpeg };
}
