import { describe, it, expect } from 'vitest';

// Simple unauthenticated checks against dev server
async function http(method: string, path: string, init?: RequestInit) {
  const res = await fetch(`http://localhost:3000${path}`, { method, ...init });
  return { status: res.status, body: await res.text(), contentType: res.headers.get('content-type') };
}

describe('Files API (unauthenticated)', () => {
  it('GET list returns 401', async () => {
    const r = await http('GET', '/api/spaces/e2e/files');
    expect(r.status).toBe(401);
    expect(r.contentType).toMatch(/application\/json/);
  });

  it('PUT write returns 401', async () => {
    const r = await http('PUT', '/api/spaces/e2e/files/index.md', {
      headers: { 'Content-Type': 'text/markdown' },
      body: '# test',
    });
    expect(r.status).toBe(401);
  });

  it('GET read returns 401', async () => {
    const r = await http('GET', '/api/spaces/e2e/files/index.md');
    expect(r.status).toBe(401);
  });
});


