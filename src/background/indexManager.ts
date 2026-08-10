import { indexPage, updateVisitOnly } from '../indexing/pageIndexer';
import { getPageByUrl, getSettings } from '../database/repositories/pageRepository';
import { isExcludedUrl, simpleHash } from '../shared/utils';
import type { ExtractedContent } from '../shared/types';

interface IndexPayload extends ExtractedContent {
  url: string;
  savedSelection?: string;
}

const pendingIndexes = new Map<string, ReturnType<typeof setTimeout>>();

export async function handleIndexPage(payload: IndexPayload): Promise<{ indexed: boolean }> {
  const settings = await getSettings();
  if (!settings.indexingEnabled) {
    return { indexed: false };
  }

  if (isExcludedUrl(payload.url, settings.excludedDomains)) {
    return { indexed: false };
  }

  const existing = await getPageByUrl(payload.url);
  const contentHash = simpleHash(payload.content + payload.title);

  if (existing && existing.contentHash === contentHash) {
    await updateVisitOnly(payload.url);
    return { indexed: false };
  }

  const pendingKey = payload.url;
  if (pendingIndexes.has(pendingKey)) {
    clearTimeout(pendingIndexes.get(pendingKey)!);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pendingIndexes.delete(pendingKey);
      await indexPage({
        url: payload.url,
        title: payload.title,
        description: payload.description,
        headings: payload.headings,
        content: payload.content,
        favicon: payload.favicon,
        savedSelection: payload.savedSelection,
      });
      resolve({ indexed: true });
    }, 500);

    pendingIndexes.set(pendingKey, timer);
  });
}

export async function handleSaveSelection(payload: {
  url: string;
  selection: string;
}): Promise<void> {
  const settings = await getSettings();
  if (!settings.indexingEnabled) return;

  const existing = await getPageByUrl(payload.url);
  if (existing) {
    await indexPage({
      url: payload.url,
      title: existing.title + ' [Selection]',
      description: payload.selection,
      headings: existing.headings,
      content: existing.content + '\n\n[Saved Selection]\n' + payload.selection,
      favicon: existing.favicon,
      savedSelection: payload.selection,
    });
  }
}
