import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './api';
import { budgetToCsv, csvCell } from './csv';
import { base64PcmToFloat32, downsampleTo16kPcm, int16ToBase64, rms } from './pcm';

describe('csv export', () => {
  it('neutralises spreadsheet formula injection', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
  });

  it('leaves numbers and plain text alone', () => {
    expect(csvCell(-250)).toBe('-250');
    expect(csvCell('Catering')).toBe('Catering');
    expect(csvCell('Bar, wine')).toBe('"Bar, wine"');
  });

  it('writes a header and one row per item', () => {
    const csv = budgetToCsv([
      { id: '1', category: 'Venue', amount: 100, priority: 'High', notes: '', status: 'Booked' },
    ]);
    expect(csv.split('\n')).toEqual(['Category,Amount,Priority,Status,Notes', 'Venue,100,High,Booked,']);
  });
});

describe('safeExternalUrl', () => {
  it('allows http(s) links', () => {
    expect(safeExternalUrl('https://maps.google.com/?q=x')).toBe('https://maps.google.com/?q=x');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>', '/relative', '', null, undefined])('rejects %s', (url) => {
    expect(safeExternalUrl(url)).toBeNull();
  });
});

describe('pcm', () => {
  it('downsamples 48 kHz to 16 kHz', () => {
    const out = downsampleTo16kPcm(new Float32Array(4800).fill(0.5), 48000);
    expect(out.length).toBe(1600);
    expect(Math.abs(out[800] - 0.5 * 0x7fff)).toBeLessThan(1);
  });

  it('clips out-of-range samples', () => {
    const out = downsampleTo16kPcm(Float32Array.from([2, -2]), 16000);
    expect(Array.from(out)).toEqual([0x7fff, -0x8000]);
  });

  it('round-trips through base64', () => {
    const pcm = Int16Array.from([0, 16384, -16384, 32767]);
    const back = base64PcmToFloat32(int16ToBase64(pcm));
    expect(Array.from(back)).toEqual([0, 0.5, -0.5, 32767 / 0x8000]);
  });

  it('computes RMS level', () => {
    expect(rms(Float32Array.from([1, -1, 1, -1]))).toBe(1);
    expect(rms(new Float32Array())).toBe(0);
  });
});
