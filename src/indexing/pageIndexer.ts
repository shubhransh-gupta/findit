import type { PageRecord } from '../shared/types';
import { tokenize, countTerms } from './tokenizer';
import { upsertPage, storeTerms } from '../database/repositories/pageRepository';
import { simpleHash } from '../shared/utils';
import { FIELD_WEIGHTS } from '../shared/constants';

interface IndexPageInput {
  url: string;
  title: string;
  description?: string;
  headings: string[];
  content: string;
  favicon?: string;
  savedSelection?: string;
}

export async function indexPage(input: IndexPageInput): Promise<PageRecord> {
  const contentHash = simpleHash(input.content + input.title);

  const page = await upsertPage({
    url: input.url,
    title: input.title,
    description: input.description,
    headings: input.headings,
    content: input.content,
    wordCount: input.content.split(/\s+/).length,
    favicon: input.favicon,
    contentHash,
    savedSelection: input.savedSelection,
  });

  const termMap = buildTermMap(page);
  await storeTerms(page.id, termMap);

  return page;
}

function buildTermMap(page: PageRecord): Map<string, { field: string; count: number }> {
  const termMap = new Map<string, { field: string; count: number }>();

  addFieldTerms(termMap, tokenize(page.title), 'title');
  addFieldTerms(termMap, tokenize(page.domain), 'domain');
  addFieldTerms(termMap, tokenize(page.url), 'url');

  for (const heading of page.headings) {
    addFieldTerms(termMap, tokenize(heading), 'heading');
  }

  addFieldTerms(termMap, tokenize(page.content), 'body');

  return termMap;
}

function addFieldTerms(
  termMap: Map<string, { field: string; count: number }>,
  tokens: string[],
  field: string
): void {
  const counts = countTerms(tokens);
  for (const [term, count] of counts) {
    const existing = termMap.get(term);
    if (!existing || getFieldWeight(field) > getFieldWeight(existing.field)) {
      termMap.set(term, { field, count: (existing?.count ?? 0) + count });
    }
  }
}

function getFieldWeight(field: string): number {
  return FIELD_WEIGHTS[field as keyof typeof FIELD_WEIGHTS] ?? 1;
}

export async function updateVisitOnly(url: string): Promise<void> {
  const { getPageByUrl } = await import('../database/repositories/pageRepository');
  const existing = await getPageByUrl(url);
  if (existing) {
    await upsertPage({
      ...existing,
      url: existing.url,
      title: existing.title,
      headings: existing.headings,
      content: existing.content,
      wordCount: existing.wordCount,
    });
  }
}
