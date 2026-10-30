import { LIVE_OUTPUT_RATE, base64PcmToFloat32, downsampleTo16kPcm, int16ToBase64, rms } from '../utils/pcm';

export function createAudioContext(): AudioContext {
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}

/** Plays Gemini's 24 kHz PCM chunks back-to-back without gaps, and can stop instantly on barge-in. */
export class PcmPlayer {
  private readonly playing = new Set<AudioBufferSourceNode>();
  private nextStart = 0;

  constructor(
    private readonly ctx: AudioContext,
    private readonly onSpeakingChange: (speaking: boolean) => void
  ) {}

  play(base64: string): void {
    const samples = base64PcmToFloat32(base64);
    const buffer = this.ctx.createBuffer(1, samples.length, LIVE_OUTPUT_RATE);
    buffer.getChannelData(0).set(samples);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const startAt = Math.max(this.ctx.currentTime, this.nextStart);
    this.nextStart = startAt + buffer.duration;
    this.playing.add(source);
    source.onended = () => {
      this.playing.delete(source);
      if (this.playing.size === 0) this.onSpeakingChange(false);
    };
    this.onSpeakingChange(true);
    source.start(startAt);
  }

  stop(): void {
    for (const source of this.playing) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    this.playing.clear();
    this.nextStart = this.ctx.currentTime;
    this.onSpeakingChange(false);
  }
}

/** Captures the microphone on an AudioWorklet and emits base64 16 kHz PCM chunks plus an input level. */
export class MicCapture {
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  level = 0;

  constructor(private readonly ctx: AudioContext) {}

  async start(onChunk: (base64Pcm: string) => void): Promise<void> {
    await this.ctx.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    await this.ctx.audioWorklet.addModule(new URL('../audio/pcm-capture.worklet.js', import.meta.url));
    const node = new AudioWorkletNode(this.ctx, 'pcm-capture');
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      this.level = rms(e.data) * 5;
      onChunk(int16ToBase64(downsampleTo16kPcm(e.data, this.ctx.sampleRate)));
    };
    this.ctx.createMediaStreamSource(this.stream).connect(node);
    this.node = node;
  }

  stop(): void {
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.level = 0;
  }
}
