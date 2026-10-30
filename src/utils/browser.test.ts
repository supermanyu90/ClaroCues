// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_WEDDING } from '../data/initialBlueprint';
import { ApiError, blobToBase64, errorMessage, postJson } from './api';
import { downloadText } from './download';

// Records what the PDF generator draws; any other jsPDF method is a no-op.
const pdf = vi.hoisted(() => ({ texts: [] as string[], saved: [] as string[], pages: 1 }));
vi.mock('jspdf', () => ({
  default: class {
    internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    constructor() {
      return new Proxy(this, {
        get(target, prop) {
          if (prop in target) return target[prop as keyof typeof target];
          if (prop === 'text') return (value: string | string[]) => pdf.texts.push(String(value));
          if (prop === 'save') return (name: string) => pdf.saved.push(name);
          if (prop === 'addPage') return () => (pdf.pages += 1);
          if (prop === 'getNumberOfPages') return () => pdf.pages;
          if (prop === 'splitTextToSize') return (value: string) => [value];
          return () => undefined;
        },
      });
    }
  },
}));

afterEach(() => vi.restoreAllMocks());

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('postJson', () => {
  it('posts JSON and returns the parsed body', async () => {
    const fetchSpy = respond(200, { ok: true });
    await expect(postJson('/api/x', { a: 1 })).resolves.toEqual({ ok: true });
    const [, init] = fetchSpy.mock.calls[0];
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });

  it("surfaces the server's error message with the status", async () => {
    respond(503, { error: 'Needs a key' });
    await expect(postJson('/api/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Needs a key',
      status: 503,
    });
  });

  it('falls back to a generic message for non-JSON errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 500 }));
    await expect(postJson('/api/x', {})).rejects.toThrow('Request failed (500)');
  });

  it('reports network failures as a friendly ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await postJson('/api/x', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
  });

  it('lets aborts propagate unchanged', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(postJson('/api/x', {})).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('browser helpers', () => {
  it('reads a blob as bare base64', async () => {
    await expect(blobToBase64(new Blob(['hi']))).resolves.toBe('aGk=');
  });

  it('formats unknown errors', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('weird')).toMatch(/Something went wrong/);
  });

  it('downloads text through a temporary object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadText('a.csv', 'x,y', 'text/csv');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

describe('generateEventPlanPdf', () => {
  it('builds the report including the access audit and saves it with a safe filename', async () => {
    const { generateEventPlanPdf } = await import('./pdfGenerator');
    generateEventPlanPdf(SAMPLE_WEDDING);

    expect(pdf.saved).toEqual([expect.stringMatching(/^[A-Za-z0-9_]+_Summary_Report\.pdf$/)]);
    const written = pdf.texts.join('\n');
    expect(written).toContain('Access Readiness Audit');
    expect(written).toContain(SAMPLE_WEDDING.budgetAllocation[0].category);
  });
});
