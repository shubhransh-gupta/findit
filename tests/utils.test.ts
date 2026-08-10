import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  extractDomain,
  generatePageId,
  isExcludedUrl,
  getTimeRangeStart,
  formatRelativeTime,
} from '../src/shared/utils';

describe('URL utilities', () => {
  it('normalizes URLs by removing tracking params', () => {
    const url = 'https://example.com/article?utm_source=twitter&utm_medium=social&id=123';
    const normalized = normalizeUrl(url);
    expect(normalized).not.toContain('utm_source');
    expect(normalized).not.toContain('utm_medium');
    expect(normalized).toContain('id=123');
  });

  it('removes trailing slash', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
  });

  it('extracts domain', () => {
    expect(extractDomain('https://www.github.com/repo')).toBe('github.com');
  });

  it('generates consistent page IDs', () => {
    const id1 = generatePageId('https://example.com/page');
    const id2 = generatePageId('https://example.com/page');
    expect(id1).toBe(id2);
  });

  it('generates different IDs for different URLs', () => {
    const id1 = generatePageId('https://example.com/page1');
    const id2 = generatePageId('https://example.com/page2');
    expect(id1).not.toBe(id2);
  });

  it('detects excluded URLs', () => {
    expect(isExcludedUrl('chrome://settings', [])).toBe(true);
    expect(isExcludedUrl('https://mail.google.com/inbox', ['mail.google.com'])).toBe(true);
    expect(isExcludedUrl('https://swift.org/docs', [])).toBe(false);
  });
});

describe('time utilities', () => {
  it('calculates time range start', () => {
    const start = getTimeRangeStart('last7days');
    expect(start).not.toBeNull();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(start!).toBeLessThanOrEqual(sevenDaysAgo + 86400000);
  });

  it('formats relative time', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3600000)).toContain('hour');
    expect(formatRelativeTime(now - 86400000)).toBe('yesterday');
  });
});
