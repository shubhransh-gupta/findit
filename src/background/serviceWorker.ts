import { indexPage, updateVisitOnly } from '../indexing/pageIndexer';
import { searchEngine, findRelatedPages } from '../search/searchEngine';
import {
  getSettings,
  updateSettings,
  deletePage,
  pinPage,
  clearAllData,
  clearOldPages,
  getStorageStats,
  getRecentSearches,
  getRecentPages,
  getPageByUrl,
  addToCollection,
} from '../database/repositories/pageRepository';
import { db } from '../database/schema';
import { DEFAULT_COLLECTIONS } from '../shared/constants';
import { isExcludedUrl, simpleHash } from '../shared/utils';
import type { SearchQuery } from '../shared/types';

let paletteTabId: number | null = null;

async function initContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: 'findit-root',
    title: 'FINDIT',
    contexts: ['page', 'selection'],
  });
  chrome.contextMenus.create({
    id: 'findit-search',
    parentId: 'findit-root',
    title: 'Search my browsing memory',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'findit-save-page',
    parentId: 'findit-root',
    title: 'Save this page',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'findit-save-selection',
    parentId: 'findit-root',
    title: 'Save selected text',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'findit-search-similar',
    parentId: 'findit-root',
    title: 'Search similar pages',
    contexts: ['selection'],
  });
}

async function initCollections(): Promise<void> {
  const existing = await db.collections.count();
  if (existing === 0) {
    for (const col of DEFAULT_COLLECTIONS) {
      await db.collections.add({
        id: `col_${col.name.toLowerCase()}`,
        name: col.name,
        color: col.color,
        createdAt: Date.now(),
      });
    }
  }
}

async function handleIndexPage(payload: Record<string, unknown>): Promise<void> {
  const settings = await getSettings();
  if (!settings.indexingEnabled) return;

  const url = payload.url as string;
  if (isExcludedUrl(url, settings.excludedDomains)) return;

  const existing = await getPageByUrl(url);
  const contentHash = simpleHash(
    (payload.content as string) + (payload.title as string)
  );

  if (existing && existing.contentHash === contentHash) {
    await updateVisitOnly(url);
    return;
  }

  await indexPage({
    url,
    title: payload.title as string,
    description: payload.description as string | undefined,
    headings: payload.headings as string[],
    content: payload.content as string,
    favicon: payload.favicon as string | undefined,
    savedSelection: payload.savedSelection as string | undefined,
  });
}

async function openCommandPalette(query?: string): Promise<void> {
  const paletteUrl = chrome.runtime.getURL('src/commandPalette/index.html');
  const url = query ? `${paletteUrl}?q=${encodeURIComponent(query)}` : paletteUrl;

  if (paletteTabId !== null) {
    try {
      await chrome.tabs.update(paletteTabId, { active: true });
      const tab = await chrome.tabs.get(paletteTabId);
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      chrome.tabs.sendMessage(paletteTabId, { type: 'SET_QUERY', payload: { query } });
      return;
    } catch {
      paletteTabId = null;
    }
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id) {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (iframeSrc: string) => {
        const existing = document.getElementById('findit-palette-frame');
        if (existing) {
          existing.remove();
        }
        const overlay = document.createElement('div');
        overlay.id = 'findit-palette-overlay';
        overlay.style.cssText =
          'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;background:rgba(0,0,0,0.5);display:flex;justify-content:center;padding-top:10vh;';
        const iframe = document.createElement('iframe');
        iframe.id = 'findit-palette-frame';
        iframe.src = iframeSrc;
        iframe.style.cssText =
          'width:640px;height:480px;border:none;border-radius:12px;box-shadow:0 25px 50px rgba(0,0,0,0.5);background:transparent;';
        overlay.appendChild(iframe);
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
      },
      args: [url],
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await initContextMenus();
  await initCollections();
});

chrome.runtime.onStartup.addListener(async () => {
  await initContextMenus();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-command-palette') {
    await openCommandPalette();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'findit-search') {
    await openCommandPalette();
  } else if (info.menuItemId === 'findit-save-page' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'FORCE_INDEX' });
  } else if (info.menuItemId === 'findit-save-selection' && tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
    if (response?.selection && tab.url) {
      await handleIndexPage({
        url: tab.url,
        title: tab.title ?? 'Saved Selection',
        headings: [],
        content: response.selection,
        savedSelection: response.selection,
      });
    }
  } else if (info.menuItemId === 'findit-search-similar' && info.selectionText) {
    await openCommandPalette(info.selectionText);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message });
  });
  return true;
});

async function handleMessage(message: { type: string; payload?: unknown }) {
  switch (message.type) {
    case 'INDEX_PAGE':
      await handleIndexPage(message.payload as Record<string, unknown>);
      return { ok: true };

    case 'SEARCH': {
      const query = message.payload as SearchQuery;
      const results = await searchEngine.search(query);
      return { results };
    }

    case 'GET_STATS':
      return await getStorageStats();

    case 'GET_SETTINGS':
      return await getSettings();

    case 'UPDATE_SETTINGS':
      return await updateSettings(message.payload as Record<string, unknown>);

    case 'DELETE_PAGE':
      await deletePage((message.payload as { id: string }).id);
      return { ok: true };

    case 'PIN_PAGE':
      await pinPage(
        (message.payload as { id: string }).id,
        (message.payload as { pinned: boolean }).pinned
      );
      return { ok: true };

    case 'CLEAR_ALL':
      await clearAllData();
      return { ok: true };

    case 'CLEAR_OLD': {
      const days = (message.payload as { days: number }).days;
      const count = await clearOldPages(days);
      return { count };
    }

    case 'OPEN_PALETTE':
      await openCommandPalette(
        (message.payload as { query?: string })?.query
      );
      return { ok: true };

    case 'GET_RECENT_SEARCHES':
      return { searches: await getRecentSearches() };

    case 'GET_RECENT_PAGES':
      return { pages: await getRecentPages() };

    case 'GET_COLLECTIONS':
      return { collections: await db.collections.toArray() };

    case 'ADD_TO_COLLECTION':
      await addToCollection(
        (message.payload as { pageId: string }).pageId,
        (message.payload as { collectionId: string }).collectionId
      );
      return { ok: true };

    case 'GET_RELATED': {
      const pageId = (message.payload as { pageId: string }).pageId;
      const page = await import('../database/repositories/pageRepository').then(
        (m) => m.getPageById(pageId)
      );
      if (!page) return { pages: [] };
      const related = await findRelatedPages(page);
      return { pages: related };
    }

    case 'CLEAR_SEARCH_HISTORY':
      await import('../database/repositories/pageRepository').then(
        (m) => m.clearSearchHistory()
      );
      return { ok: true };

    default:
      return { error: 'Unknown message type' };
  }
}

export {};
