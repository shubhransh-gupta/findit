import type { PageRecord } from '../shared/types';
import { FIELD_WEIGHTS, RECENT_VISIT_BONUS_DAYS, SNIPPET_LENGTH } from '../shared/constants';
import { tokenize, stemWord } from '../indexing/tokenizer';

export function scorePage(
  page: PageRecord,
  terms: string[],
  phrase?: string
): { score: number; matchedTerms: string[] } {
  if (terms.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  let score = 0;
  const matchedTerms: string[] = [];

  const titleTokens = tokenize(page.title);
  const headingTokens = page.headings.flatMap((h) => tokenize(h));
  const domainTokens = tokenize(page.domain);
  const urlTokens = tokenize(page.url);
  const bodyTokens = tokenize(page.content);

  const stemmedTerms = terms.map(stemWord);

  for (const term of stemmedTerms) {
    let termScore = 0;

    termScore += countMatches(titleTokens, term) * FIELD_WEIGHTS.title;
    termScore += countMatches(headingTokens, term) * FIELD_WEIGHTS.heading;
    termScore += countMatches(domainTokens, term) * FIELD_WEIGHTS.domain;
    termScore += countMatches(urlTokens, term) * FIELD_WEIGHTS.url;
    termScore += countMatches(bodyTokens, term) * FIELD_WEIGHTS.body;

    if (termScore > 0) {
      matchedTerms.push(term);
    }

    score += termScore;
  }

  if (phrase) {
    const fullText = `${page.title} ${page.headings.join(' ')} ${page.content}`.toLowerCase();
    if (fullText.includes(phrase)) {
      score += 10;
    }
  }

  if (matchedTerms.length === stemmedTerms.length && stemmedTerms.length > 1) {
    score *= 1 + stemmedTerms.length * 0.1;
  }

  if (matchedTerms.length > 0) {
    const titleLower = page.title.toLowerCase();
    for (const term of stemmedTerms) {
      if (titleLower.includes(term)) {
        score += 3;
        break;
      }
    }
  }

  const daysSinceVisit = (Date.now() - page.lastVisited) / (1000 * 60 * 60 * 24);
  for (const { days, bonus } of RECENT_VISIT_BONUS_DAYS) {
    if (daysSinceVisit <= days) {
      score *= 1 + bonus;
      break;
    }
  }

  if (page.pinned) {
    score *= 1.2;
  }

  return { score, matchedTerms };
}

function countMatches(tokens: string[], term: string): number {
  const stemmed = tokens.map(stemWord);
  return stemmed.filter((t) => t === term || t.includes(term) || term.includes(t)).length;
}

export function generateSnippet(
  page: PageRecord,
  terms: string[],
  phrase?: string
): string {
  const content = page.content || page.description || page.title;
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  let bestIndex = 0;
  let bestScore = -1;

  const searchTerms = phrase ? [phrase, ...terms] : terms;

  for (const term of searchTerms) {
    const idx = lowerContent.indexOf(term.toLowerCase());
    if (idx !== -1) {
      const proximity = Math.abs(idx - content.length / 2);
      const termScore = term.length * 10 - proximity * 0.01;
      if (termScore > bestScore) {
        bestScore = termScore;
        bestIndex = idx;
      }
    }
  }

  const halfLen = Math.floor(SNIPPET_LENGTH / 2);
  let start = Math.max(0, bestIndex - halfLen);
  let end = Math.min(content.length, bestIndex + halfLen);

  if (start > 0) {
    const spaceIdx = content.indexOf(' ', start);
    if (spaceIdx !== -1 && spaceIdx < bestIndex) start = spaceIdx + 1;
  }
  if (end < content.length) {
    const spaceIdx = content.lastIndexOf(' ', end);
    if (spaceIdx !== -1 && spaceIdx > bestIndex) end = spaceIdx;
  }

  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet = snippet + '…';

  return snippet;
}

export function highlightTerms(text: string, terms: string[]): string {
  if (terms.length === 0) return text;
  let result = text;
  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
