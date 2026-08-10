import { describe, it, expect } from 'vitest';
import { tokenize, countTerms, stemWord } from '../src/indexing/tokenizer';

describe('tokenizer', () => {
  it('tokenizes basic text', () => {
    const tokens = tokenize('Swift actors protect mutable state');
    expect(tokens).toContain('swift');
    expect(tokens).toContain('actors');
    expect(tokens).toContain('protect');
    expect(tokens).toContain('mutable');
    expect(tokens).toContain('state');
  });

  it('removes stop words', () => {
    const tokens = tokenize('the quick brown fox');
    expect(tokens).not.toContain('the');
    expect(tokens).toContain('quick');
  });

  it('counts term frequencies', () => {
    const counts = countTerms(['swift', 'actor', 'swift', 'actor', 'swift']);
    expect(counts.get('swift')).toBe(3);
    expect(counts.get('actor')).toBe(2);
  });

  it('stems words', () => {
    expect(stemWord('running')).toBe('runn');
    expect(stemWord('actors')).toBe('actor');
  });
});
