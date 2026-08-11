import { extractContent, extractSelection } from './contentExtractor';

const INDEX_DEBOUNCE_MS = 1500;
let indexTimeout: ReturnType<typeof setTimeout> | null = null;
let lastIndexedUrl = '';
let lastIndexedAt = 0;

function scheduleIndex(): void {
  if (indexTimeout) clearTimeout(indexTimeout);
  indexTimeout = setTimeout(() => {
    indexCurrentPage();
  }, INDEX_DEBOUNCE_MS);
}

async function sendIndexMessage(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'INDEX_PAGE',
      payload,
    });
    return !response?.error;
  } catch {
    return false;
  }
}

async function indexCurrentPage(force = false): Promise<boolean> {
  const url = window.location.href;

  if (!force && url === lastIndexedUrl && Date.now() - lastIndexedAt < 30_000) {
    return true;
  }

  const content = extractContent();
  if (!content) return false;

  const ok = await sendIndexMessage({ url, ...content });
  if (ok) {
    lastIndexedUrl = url;
    lastIndexedAt = Date.now();
  }
  return ok;
}

function resetIndexState(): void {
  lastIndexedUrl = '';
  lastIndexedAt = 0;
  scheduleIndex();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    sendResponse({ content: extractContent() });
    return true;
  }

  if (message.type === 'GET_SELECTION') {
    sendResponse({ selection: extractSelection() });
    return true;
  }

  if (message.type === 'FORCE_INDEX' || message.type === 'EXTRACT_AND_INDEX') {
    resetIndexState();
    indexCurrentPage(true).then((ok) => sendResponse({ ok }));
    return true;
  }
});

function hookHistoryNavigation(): void {
  const wrap = (fn: typeof history.pushState) =>
    function (this: History, ...args: Parameters<typeof history.pushState>) {
      fn.apply(this, args);
      resetIndexState();
    };

  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  window.addEventListener('popstate', resetIndexState);
  window.addEventListener('hashchange', resetIndexState);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  scheduleIndex();
} else {
  document.addEventListener('DOMContentLoaded', scheduleIndex);
  window.addEventListener('load', scheduleIndex);
}

const observer = new MutationObserver(() => {
  if (document.body && document.body.textContent && document.body.textContent.length > 100) {
    scheduleIndex();
  }
});

if (document.documentElement) {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

hookHistoryNavigation();

export {};
