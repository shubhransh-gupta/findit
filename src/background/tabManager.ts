import { handleIndexPage } from './indexManager';
import { getSettings } from '../database/repositories/pageRepository';
import { isExcludedUrl } from '../shared/utils';

const INDEXABLE_SCHEMES = /^https?:/;

function isIndexableTab(url?: string): url is string {
  if (!url) return false;
  return INDEXABLE_SCHEMES.test(url);
}

async function extractViaScripting(tabId: number, url: string): Promise<void> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title?.trim() || 'Untitled';
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map((el) => el.textContent?.trim())
          .filter(Boolean)
          .slice(0, 20) as string[];

        const main =
          document.querySelector('article, main, [role="main"]') ?? document.body;
        const content = (main?.textContent ?? title).replace(/\s+/g, ' ').trim().slice(0, 50000);
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        const description =
          document.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined;

        return { title, content, headings, description, wordCount };
      },
    });

    if (result?.result) {
      await handleIndexPage({ url, ...result.result });
    }
  } catch {
    // Restricted page (chrome://, PDF viewer, etc.)
  }
}

async function requestTabIndex(tabId: number, url: string): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_AND_INDEX' });
  } catch {
    await extractViaScripting(tabId, url);
  }
}

export async function indexTab(tabId: number, url?: string): Promise<void> {
  if (!isIndexableTab(url)) return;

  const settings = await getSettings();
  if (!settings.indexingEnabled) return;
  if (isExcludedUrl(url, settings.excludedDomains)) return;

  await requestTabIndex(tabId, url);
}

export async function indexAllOpenTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url) {
      await indexTab(tab.id, tab.url);
    }
  }
}

export function setupTabIndexing(): void {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      indexTab(tabId, tab.url);
    }
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await indexTab(activeInfo.tabId, tab.url);
      }
    } catch {
      // Tab may have closed
    }
  });

  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) {
      indexTab(details.tabId, details.url);
    }
  });
}
