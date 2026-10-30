// PCM helpers for the Gemini Live audio stream: 16 kHz Int16 mono up, 24 kHz Int16 mono down.

export const LIVE_INPUT_RATE = 16000;
export const LIVE_OUTPUT_RATE = 24000;

const toInt16 = (sample: number) => {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? s * 0x8000 : s * 0x7fff;
};

/** Box-filter downsample of Float32 [-1, 1] samples to 16 kHz Int16 PCM. */
export function downsampleTo16kPcm(input: Float32Array, inputRate: number): Int16Array {
  if (inputRate === LIVE_INPUT_RATE) return Int16Array.from(input, toInt16);
  const ratio = inputRate / LIVE_INPUT_RATE;
  const out = new Int16Array(Math.round(input.length / ratio));
  let inOffset = 0;
  for (let i = 0; i < out.length; i++) {
    const next = Math.min(input.length, Math.round((i + 1) * ratio));
    let sum = 0;
    for (let j = inOffset; j < next; j++) sum += input[j];
    out[i] = toInt16(next > inOffset ? sum / (next - inOffset) : 0);
    inOffset = next;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  // Chunked to stay under the argument-count limit of String.fromCharCode.apply.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function int16ToBase64(pcm: Int16Array): string {
  return bytesToBase64(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
}

/** Decodes base64 Int16 little-endian PCM into Float32 samples. */
export function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}
