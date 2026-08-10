import { describe, it, expect } from 'vitest';
import { scorePage, generateSnippet } from '../src/search/scorer';
import type { PageRecord } from '../src/shared/types';

const mockPage: PageRecord = {
  id: 'test_1',
  url: 'https://swift.org/concurrency',
  title: 'Swift Concurrency',
  domain: 'swift.org',
  description: 'Learn about Swift concurrency features',
  headings: ['Actors', 'Async/Await', 'Structured Concurrency'],
  content: 'Actors protect their mutable state and prevent conflicting access. Swift concurrency provides powerful tools for writing safe concurrent code.',
  timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
  lastVisited: Date.now() - 6 * 24 * 60 * 60 * 1000,
  visitCount: 3,
  wordCount: 20,
};

describe('scorer', () => {
  it('scores title matches higher', () => {
    const titleMatch = scorePage(mockPage, ['swift', 'concurrency']);
    const bodyOnly = scorePage(
      { ...mockPage, title: 'Unrelated Page' },
      ['swift', 'concurrency']
    );
    expect(titleMatch.score).toBeGreaterThan(bodyOnly.score);
  });

  it('gives phrase bonus', () => {
    const withPhrase = scorePage(mockPage, ['actors'], 'actors protect');
    const withoutPhrase = scorePage(mockPage, ['actors']);
    expect(withPhrase.score).toBeGreaterThanOrEqual(withoutPhrase.score);
  });

  it('generates relevant snippet', () => {
    const snippet = generateSnippet(mockPage, ['actors']);
    expect(snippet.toLowerCase()).toContain('actor');
  });

  it('returns matched terms', () => {
    const { matchedTerms } = scorePage(mockPage, ['swift', 'actors']);
    expect(matchedTerms.length).toBeGreaterThan(0);
  });
});
