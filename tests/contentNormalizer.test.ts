import { describe, it, expect } from 'vitest';
import { normalizeContent, cleanTextContent } from '../src/indexing/contentNormalizer';

describe('contentNormalizer', () => {
  it('normalizes whitespace', () => {
    const result = normalizeContent('Hello   world\n\n\n\nTest');
    expect(result).not.toContain('   ');
    expect(result).toContain('Hello world');
  });

  it('truncates to max length', () => {
    const long = 'word '.repeat(30000);
    const result = normalizeContent(long);
    expect(result.length).toBeLessThanOrEqual(100_000);
  });

  it('cleans invisible characters', () => {
    const result = cleanTextContent('Hello\u200BWorld');
    expect(result).toBe('HelloWorld');
  });
});
