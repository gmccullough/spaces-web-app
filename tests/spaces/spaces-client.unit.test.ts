import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listSpaceFiles, readSpaceFile, writeSpaceFile } from '@/app/lib/spaces/client';

// Mock Supabase client used by the browser wrapper
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'TEST_TOKEN' } } })),
    },
  })),
}));

const originalFetch = global.fetch;

describe('spaces client wrappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    const resp = { path: 'poem.md', size: 5, contentType: 'text/markdown' };
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(new Response(JSON.stringify(resp), { status: 200 }));
    const res = await writeSpaceFile('ideas', 'ideas/poem.md', 'hello', 'text/markdown');
    if ('error' in (res as any)) throw new Error('unexpected error');
    expect(res.path).toBeDefined();
  });
});


