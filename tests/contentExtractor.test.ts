/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { extractContent } from '../src/content/contentExtractor';

describe('contentExtractor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    document.title = '';
  });

  it('extracts article content', () => {
    document.title = 'Swift Concurrency';
    document.body.innerHTML = `
      <article>
        <h1>Swift Concurrency</h1>
        <p>Actors protect their mutable state and prevent conflicting access in concurrent code.</p>
        <p>Swift async await provides readable asynchronous programming for all developers.</p>
      </article>
    `;
    const result = extractContent(document);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Swift');
    expect(result!.content.toLowerCase()).toContain('actors');
  });

  it('falls back to title and headings when body is short', () => {
    document.title = 'GitHub OAuth Guide';
    document.body.innerHTML = `
      <nav>Menu</nav>
      <h1>OAuth Setup</h1>
      <h2>Authorization Code Flow</h2>
    `;
    const result = extractContent(document);
    expect(result).not.toBeNull();
    expect(result!.content).toContain('OAuth');
  });
});
