import { describe, it, expect } from 'vitest';
import { normalizeRelativePath } from '../../src/app/lib/spaces/paths';

describe('storage.normalizeRelativePath', () => {
  it('normalizes simple path', () => {
    expect(normalizeRelativePath('docs/readme.md')).toBe('docs/readme.md');
  });

  it('trims leading slash and collapses duplicates', () => {
    expect(normalizeRelativePath('/docs//a///b.md')).toBe('docs/a/b.md');
  });

  it('rejects traversal', () => {
    expect(() => normalizeRelativePath('../secret.txt')).toThrowError(/traversal/i);
    expect(() => normalizeRelativePath('a/../../b')).toThrowError();
  });

  it('rejects backslashes', () => {
    expect(() => normalizeRelativePath('a\\b.txt')).toThrowError();
  });
});


