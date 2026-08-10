import type { SearchQuery, SearchResult, PageRecord } from '../shared/types';
import type { SearchEngine } from '../shared/types';
import { getAllPages, getPagesInTimeRange, addSearchHistory } from '../database/repositories/pageRepository';
import { parseQuery } from './queryParser';
import { scorePage, generateSnippet } from './scorer';
import { getTimeRangeStart, getTimeRangeEnd } from '../shared/utils';

export class LocalSearchEngine implements SearchEngine {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const parsed = parseQuery(query.text);
    const domain = query.domain ?? parsed.domain;
    const timeRange = query.timeRange ?? parsed.timeRange;

    let pages = await getAllPages();

    if (domain) {
      pages = pages.filter(
        (p) => p.domain === domain || p.domain.endsWith('.' + domain)
      );
    }

    if (timeRange && timeRange !== 'any') {
      const start = getTimeRangeStart(timeRange);
      const end = getTimeRangeEnd(timeRange);
      if (start !== null) {
        pages = await getPagesInTimeRange(start, end ?? undefined);
        if (domain) {
          pages = pages.filter(
            (p) => p.domain === domain || p.domain.endsWith('.' + domain)
          );
        }
      }
    }

    if (query.pinnedOnly) {
      pages = pages.filter((p) => p.pinned);
    }

    if (query.collection) {
      pages = pages.filter((p) => p.collections?.includes(query.collection!));
    }

    const searchTerms = parsed.terms;
    if (searchTerms.length === 0 && !domain && !timeRange) {
      return pages
        .sort((a, b) => b.lastVisited - a.lastVisited)
        .slice(0, 20)
        .map((page) => ({
          page,
          score: 0,
          snippet: page.description ?? page.content.slice(0, 200),
          matchedTerms: [],
        }));
    }

    const results: SearchResult[] = [];

    for (const page of pages) {
      const { score, matchedTerms } = scorePage(page, searchTerms, parsed.phrase);
      if (score > 0 || searchTerms.length === 0) {
        results.push({
          page,
          score,
          snippet: generateSnippet(page, searchTerms, parsed.phrase),
          matchedTerms,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    if (query.text.trim()) {
      await addSearchHistory(query.text.trim());
    }

    return results.slice(0, 50);
  }
}

export async function findRelatedPages(page: PageRecord, limit = 5): Promise<PageRecord[]> {
  const allPages = await getAllPages();
  const pageTerms = new Set(
    (page.title + ' ' + page.headings.join(' ') + ' ' + page.content)
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );

  const scored = allPages
    .filter((p) => p.id !== page.id)
    .map((p) => {
      const otherTerms = new Set(
        (p.title + ' ' + p.headings.join(' ') + ' ' + p.content)
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 3)
      );
      let overlap = 0;
      for (const term of pageTerms) {
        if (otherTerms.has(term)) overlap++;
      }
      return { page: p, overlap };
    })
    .filter((s) => s.overlap > 2)
    .sort((a, b) => b.overlap - a.overlap);

  return scored.slice(0, limit).map((s) => s.page);
}

export const searchEngine = new LocalSearchEngine();
