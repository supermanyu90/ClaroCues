import { useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '../services/apiClient';
import { errorMessage } from '../utils/api';

interface DictationOptions {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}

/**
 * Records from the microphone and transcribes the clip when recording stops. The microphone and
 * timer are always released, including when the component unmounts mid-recording.
 */
export function useDictation({ onTranscript, onError }: DictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }
      release();
    },
    []
  );

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError('Voice recording is not supported in this browser. You can type instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        release();
        setIsTranscribing(true);
        try {
          onTranscript(await transcribeAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })));
        } catch (err) {
          onError(errorMessage(err));
        } finally {
          setIsTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.warn('Microphone unavailable:', err);
      onError('Could not access the microphone. Allow microphone permission, or type instead.');
    }
  };

  /** Stops recording and transcribes what was captured. */
  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setIsRecording(false);
  };

  /** Stops recording and discards the clip. */
  const cancel = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    release();
    setIsRecording(false);
  };

  return { isRecording, isTranscribing, seconds, start, stop, cancel };
}
