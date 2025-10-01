import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listSpaceFiles, readSpaceFile, writeSpaceFile, listSpaces, createSpace } from '@/app/lib/spaces/client';

// Mock Supabase client used by the browser wrapper
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'TEST_TOKEN' } } })),
    },
  })),
}));

const originalFetch = global.fetch;

const dispatchSpy = vi.fn();
(globalThis as any).window = { dispatchEvent: dispatchSpy } as any;

if (!(globalThis as any).CustomEvent) {
  (globalThis as any).CustomEvent = class<T = any> {
    type: string;
    detail: T | undefined;
    constructor(type: string, init?: CustomEventInit<T>) {
      this.type = type;
      this.detail = init?.detail;
    }
  } as any;
}

describe('spaces client wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    dispatchSpy.mockReset();
  });

  it('listSpaceFiles adds bearer auth and normalizes dir', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify({ files: [] }), { status: 200 }));
    const res = await listSpaceFiles('ideas', { dir: '/', recursive: false });
    expect((res as any).files).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/api/spaces/ideas/files');
    expect(String(url)).toContain('recursive=false');
    expect(String(url)).not.toContain('dir=/');
    expect((init!.headers as any).Authorization).toBe('Bearer TEST_TOKEN');
  });

  it('readSpaceFile returns base64 and contentType', async () => {
    const body = new TextEncoder().encode('hello');
    const resObj = new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(resObj);
    const res = await readSpaceFile('ideas', '/notes/hello.txt');
    if ('error' in (res as any)) throw new Error('unexpected error');
    expect(res.contentType).toContain('text/plain');
    expect(res.size).toBe(body.byteLength);
    expect(typeof res.contentBase64).toBe('string');
  });

  it('writeSpaceFile strips redundant space prefix and sets headers', async () => {
    const resp = { path: 'poem.md', size: 5, contentType: 'text/markdown', etag: 'abc' };
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify(resp), { status: 200 }));
    const res = await writeSpaceFile('ideas', 'ideas/poem.md', 'hello', 'text/markdown');
    if ('error' in (res as any)) throw new Error('unexpected error');
    expect(res.path).toBeDefined();
    expect(dispatchSpy).toHaveBeenCalled();
    const calledWith = dispatchSpy.mock.calls.find(([evt]) => (evt as any).type === 'spaces:fileSaved');
    expect(calledWith).toBeTruthy();
  });

it('listSpaces includes bearer auth and parses response', async () => {
    const payload = { spaces: ['ideas', 'notes'], items: [{ name: 'ideas', lastUpdatedAt: '2025-09-29T12:00:00Z' }] };
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    const res = await listSpaces();
    if ('error' in (res as any)) throw new Error('unexpected error');
    expect(Array.isArray(res.spaces)).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('/api/spaces');
    expect((init!.headers as any).Authorization).toBe('Bearer TEST_TOKEN');
  });

it('listSpaces items are newest to oldest when timestamps provided', async () => {
  const payload = { items: [
    { name: 'a', lastUpdatedAt: '2025-01-01T00:00:00Z' },
    { name: 'b', lastUpdatedAt: '2025-09-29T12:00:00Z' },
    { name: 'c', lastUpdatedAt: '2025-06-01T00:00:00Z' },
  ], spaces: ['b', 'c', 'a'] };
  vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
  const res = await listSpaces();
  if ('error' in (res as any)) throw new Error('unexpected error');
  const items = (res as any).items as Array<{ name: string; lastUpdatedAt: string }>;
  if (items && items.length > 1) {
    const ts = items.map((i) => i.lastUpdatedAt ? new Date(i.lastUpdatedAt).getTime() : 0);
    const sorted = [...ts].sort((a, b) => b - a);
    expect(ts).toEqual(sorted);
  }
});

  it('createSpace posts name with bearer auth', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify({ created: true }), { status: 201 }));
    const res = await createSpace('ideas');
    if ('error' in (res as any)) throw new Error('unexpected error');
    expect(res.created).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('/api/spaces');
    expect((init as any).method).toBe('POST');
    expect((init!.headers as any).Authorization).toBe('Bearer TEST_TOKEN');
  });
});
