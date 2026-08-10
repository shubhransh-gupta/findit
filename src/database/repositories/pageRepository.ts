import { db } from '../schema';
import type { PageRecord, StorageStats } from '../../shared/types';
import { DEFAULT_SETTINGS } from '../../shared/constants';
import { generatePageId, normalizeUrl, extractDomain } from '../../shared/utils';

export async function getPageByUrl(url: string): Promise<PageRecord | undefined> {
  const normalized = normalizeUrl(url);
  return db.pages.where('url').equals(normalized).first();
}

export async function getPageById(id: string): Promise<PageRecord | undefined> {
  return db.pages.get(id);
}

export async function upsertPage(
  data: Partial<PageRecord> & {
    url: string;
    title: string;
    headings: string[];
    content: string;
    wordCount: number;
  }
): Promise<PageRecord> {
  const normalizedUrl = normalizeUrl(data.url);
  const id = data.id ?? generatePageId(normalizedUrl);
  const existing = await db.pages.get(id);

  const now = Date.now();
  const page: PageRecord = {
    id,
    url: normalizedUrl,
    title: data.title,
    domain: data.domain || extractDomain(normalizedUrl),
    description: data.description,
    headings: data.headings,
    content: data.content,
    timestamp: existing?.timestamp ?? data.timestamp ?? now,
    lastVisited: now,
    visitCount: existing ? existing.visitCount + 1 : (data.visitCount ?? 1),
    wordCount: data.wordCount,
    favicon: data.favicon,
    contentHash: data.contentHash,
    pinned: existing?.pinned ?? data.pinned ?? false,
    collections: existing?.collections ?? data.collections ?? [],
    savedSelection: data.savedSelection ?? existing?.savedSelection,
  };

  await db.pages.put(page);
  return page;
}

export async function deletePage(id: string): Promise<void> {
  await db.transaction('rw', [db.pages, db.terms], async () => {
    await db.pages.delete(id);
    await db.terms.where('pageId').equals(id).delete();
  });
}

export async function pinPage(id: string, pinned: boolean): Promise<void> {
  await db.pages.update(id, { pinned });
}

export async function getAllPages(): Promise<PageRecord[]> {
  return db.pages.toArray();
}

export async function getPinnedPages(): Promise<PageRecord[]> {
  return db.pages.where('pinned').equals(1).toArray();
}

export async function getRecentPages(limit = 20): Promise<PageRecord[]> {
  return db.pages.orderBy('lastVisited').reverse().limit(limit).toArray();
}

export async function getPagesByDomain(domain: string): Promise<PageRecord[]> {
  return db.pages.where('domain').equals(domain).toArray();
}

export async function getPagesInTimeRange(
  start: number,
  end?: number
): Promise<PageRecord[]> {
  let collection = db.pages.where('lastVisited').aboveOrEqual(start);
  if (end !== undefined) {
    const pages = await collection.toArray();
    return pages.filter((p: PageRecord) => p.lastVisited < end);
  }
  return collection.toArray();
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.pages, db.terms, db.searches, db.collections], async () => {
    await db.pages.clear();
    await db.terms.clear();
    await db.searches.clear();
    await db.collections.clear();
  });
}

export async function clearOldPages(retentionDays: number): Promise<number> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const oldPages = await db.pages
    .where('lastVisited')
    .below(cutoff)
    .filter((p: PageRecord) => !p.pinned)
    .toArray();

  for (const page of oldPages) {
    await deletePage(page.id);
  }
  return oldPages.length;
}

export async function getStorageStats(): Promise<StorageStats> {
  const pages = await db.pages.toArray();
  let estimatedBytes = 0;
  let oldestTimestamp: number | null = null;

  for (const page of pages) {
    estimatedBytes += JSON.stringify(page).length * 2;
    if (oldestTimestamp === null || page.timestamp < oldestTimestamp) {
      oldestTimestamp = page.timestamp;
    }
  }

  return {
    pageCount: pages.length,
    estimatedBytes,
    oldestTimestamp,
  };
}

export async function getSettings() {
  const settings = await db.settings.get('global');
  if (settings) return settings;
  const defaultSettings = { id: 'global', ...DEFAULT_SETTINGS };
  await db.settings.put(defaultSettings);
  return defaultSettings;
}

export async function updateSettings(updates: Partial<typeof DEFAULT_SETTINGS>) {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await db.settings.put(updated);
  return updated;
}

export async function addSearchHistory(query: string): Promise<void> {
  if (!query.trim()) return;
  await db.searches.add({ query: query.trim(), timestamp: Date.now() });
  const all = await db.searches.orderBy('timestamp').reverse().toArray();
  if (all.length > 100) {
    const toDelete = all.slice(100);
    for (const s of toDelete) {
      if (s.id) await db.searches.delete(s.id);
    }
  }
}

export async function getRecentSearches(limit = 10): Promise<string[]> {
  const searches = await db.searches.orderBy('timestamp').reverse().limit(limit).toArray();
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of searches) {
    const lower = s.query.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(s.query);
    }
  }
  return unique;
}

export async function clearSearchHistory(): Promise<void> {
  await db.searches.clear();
}

export async function addToCollection(pageId: string, collectionId: string): Promise<void> {
  const page = await db.pages.get(pageId);
  if (!page) return;
  const collections = page.collections ?? [];
  if (!collections.includes(collectionId)) {
    await db.pages.update(pageId, { collections: [...collections, collectionId] });
  }
}

export async function getPagesByCollection(collectionId: string): Promise<PageRecord[]> {
  const pages = await db.pages.toArray();
  return pages.filter((p: PageRecord) => p.collections?.includes(collectionId));
}

export async function storeTerms(pageId: string, terms: Map<string, { field: string; count: number }>): Promise<void> {
  await db.terms.where('pageId').equals(pageId).delete();
  const records = Array.from(terms.entries()).map(([term, data]) => ({
    pageId,
    term,
    field: data.field as 'title' | 'heading' | 'domain' | 'url' | 'body',
    count: data.count,
  }));
  if (records.length > 0) {
    await db.terms.bulkAdd(records);
  }
}

export async function getTermsForPage(pageId: string) {
  return db.terms.where('pageId').equals(pageId).toArray();
}

export async function getAllTerms(): Promise<Map<string, Set<string>>> {
  const allTerms = await db.terms.toArray();
  const termToPages = new Map<string, Set<string>>();
  for (const t of allTerms) {
    if (!termToPages.has(t.term)) {
      termToPages.set(t.term, new Set());
    }
    termToPages.get(t.term)!.add(t.pageId);
  }
  return termToPages;
}
