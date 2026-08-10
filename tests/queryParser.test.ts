import { describe, it, expect } from 'vitest';
import { parseQuery } from '../src/search/queryParser';

describe('queryParser', () => {
  it('parses simple terms', () => {
    const result = parseQuery('swift actor isolation');
    expect(result.terms).toEqual(['swift', 'actor', 'isolation']);
  });

  it('extracts site filter', () => {
    const result = parseQuery('swift concurrency site:github.com');
    expect(result.domain).toBe('github.com');
    expect(result.terms).toContain('swift');
    expect(result.terms).toContain('concurrency');
  });

  it('extracts time filter', () => {
    const result = parseQuery('swift actor last week');
    expect(result.timeRange).toBe('last7days');
    expect(result.terms).toContain('swift');
    expect(result.terms).not.toContain('week');
  });

  it('extracts quoted phrase', () => {
    const result = parseQuery('"actor isolation" swift');
    expect(result.phrase).toBe('actor isolation');
    expect(result.terms).toContain('swift');
  });

  it('handles combined filters', () => {
    const result = parseQuery('authentication site:github.com last month');
    expect(result.domain).toBe('github.com');
    expect(result.timeRange).toBe('last30days');
    expect(result.terms).toContain('authentication');
  });
});
