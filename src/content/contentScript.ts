import { extractContent, extractSelection } from './contentExtractor';

const INDEX_DEBOUNCE_MS = 2000;
let indexTimeout: ReturnType<typeof setTimeout> | null = null;
let lastIndexedUrl = '';

function scheduleIndex(): void {
  if (indexTimeout) clearTimeout(indexTimeout);
  indexTimeout = setTimeout(() => {
    indexCurrentPage();
  }, INDEX_DEBOUNCE_MS);
}

async function indexCurrentPage(): Promise<void> {
  const url = window.location.href;
  if (url === lastIndexedUrl) return;

  const content = extractContent();
  if (!content) return;

  lastIndexedUrl = url;

  chrome.runtime.sendMessage({
    type: 'INDEX_PAGE',
    payload: {
      url,
      ...content,
    },
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const content = extractContent();
    sendResponse({ content });
    return true;
  }

  if (message.type === 'GET_SELECTION') {
    sendResponse({ selection: extractSelection() });
    return true;
  }

  if (message.type === 'FORCE_INDEX') {
    lastIndexedUrl = '';
    indexCurrentPage();
    sendResponse({ ok: true });
    return true;
  }
});

if (document.readyState === 'complete') {
  scheduleIndex();
} else {
  window.addEventListener('load', scheduleIndex);
}

const observer = new MutationObserver(() => {
  if (document.readyState === 'complete') {
    scheduleIndex();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

export {};
