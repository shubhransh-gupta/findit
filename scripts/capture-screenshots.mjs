import { chromium } from '@playwright/test';
import { createServer } from 'http';
import { readFileSync, statSync, mkdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs', 'screenshots');

const MOCK_RESULTS = [
  {
    page: {
      id: 'page_swift1',
      url: 'https://swift.org/documentation/concurrency',
      title: 'Swift Concurrency',
      domain: 'swift.org',
      description: 'Learn about Swift concurrency features',
      headings: ['Actors', 'Async/Await', 'Structured Concurrency'],
      content: 'Actors protect their mutable state and prevent conflicting access to that state in concurrent code.',
      timestamp: Date.now() - 6 * 86400000,
      lastVisited: Date.now() - 6 * 86400000,
      visitCount: 3,
      wordCount: 120,
      pinned: false,
    },
    score: 42,
    snippet: 'Actors protect their mutable state and prevent conflicting access...',
    matchedTerms: ['swift', 'actor'],
  },
  {
    page: {
      id: 'page_swift2',
      url: 'https://developer.apple.com/documentation/swift/actor',
      title: 'Actor Isolation',
      domain: 'developer.apple.com',
      description: 'Understanding actor isolation in Swift',
      headings: ['Isolated State', 'Nonisolated Members'],
      content: 'Actor isolation ensures that mutable state within an actor is protected from data races.',
      timestamp: Date.now() - 8 * 86400000,
      lastVisited: Date.now() - 8 * 86400000,
      visitCount: 2,
      wordCount: 95,
      pinned: false,
    },
    score: 38,
    snippet: 'Actor isolation ensures that mutable state within an actor is protected...',
    matchedTerms: ['actor', 'isolation'],
  },
  {
    page: {
      id: 'page_github',
      url: 'https://github.com/apple/swift-evolution/blob/main/proposals/0306-actors.md',
      title: 'SE-0306: Actors',
      domain: 'github.com',
      headings: ['Motivation', 'Proposed solution'],
      content: 'Actors provide a model for protecting shared mutable state in Swift concurrent programs.',
      timestamp: Date.now() - 12 * 86400000,
      lastVisited: Date.now() - 12 * 86400000,
      visitCount: 1,
      wordCount: 200,
      pinned: true,
    },
    score: 25,
    snippet: 'Actors provide a model for protecting shared mutable state...',
    matchedTerms: ['actors'],
  },
];

const MOCK_STATS = {
  pageCount: 1248,
  estimatedBytes: 184000000,
  oldestTimestamp: Date.now() - 120 * 86400000,
};

const MOCK_SETTINGS = {
  id: 'global',
  indexingEnabled: true,
  theme: 'dark',
  retentionDays: 365,
  excludedDomains: ['mail.google.com', 'paypal.com'],
};

const CHROME_MOCK = `
window.chrome = {
  runtime: {
    sendMessage: (msg) => {
      switch (msg.type) {
        case 'SEARCH':
          if (msg.payload?.text?.trim()) {
            return Promise.resolve({ results: ${JSON.stringify(MOCK_RESULTS)} });
          }
          return Promise.resolve({
            results: ${JSON.stringify(MOCK_RESULTS)}.map(r => ({ ...r, score: 0 })),
          });
        case 'GET_STATS':
          return Promise.resolve(${JSON.stringify(MOCK_STATS)});
        case 'GET_SETTINGS':
          return Promise.resolve(${JSON.stringify(MOCK_SETTINGS)});
        case 'GET_RECENT_SEARCHES':
          return Promise.resolve({ searches: ['swift actor isolation', 'iphone camera comparison', 'github oauth', 'AI agents'] });
        case 'GET_RECENT_PAGES':
          return Promise.resolve({ pages: ${JSON.stringify(MOCK_RESULTS.map(r => r.page))} });
        case 'UPDATE_SETTINGS':
          return Promise.resolve({ ...${JSON.stringify(MOCK_SETTINGS)}, ...msg.payload });
        default:
          return Promise.resolve({ ok: true });
      }
    },
    getURL: (p) => 'chrome-extension://findit/' + p,
  },
  tabs: { create: () => Promise.resolve({}) },
};
`;

function startServer(port) {
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.json': 'application/json',
  };

  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = req.url?.split('?')[0] ?? '/';
      if (path === '/') path = '/src/commandPalette/index.html';
      const filePath = join(DIST, path);
      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function capture(page, url, selector, outPath, options = {}) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(options.wait ?? 800);

  const el = selector ? page.locator(selector) : page;
  await el.screenshot({
    path: outPath,
    type: 'png',
    ...(options.clip ? {} : {}),
  });
  console.log('Saved', outPath);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const port = 4173;
  const server = await startServer(port);
  const base = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(CHROME_MOCK);

  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'dark' });

  // Command palette with search results
  await capture(
    page,
    `${base}/src/commandPalette/index.html?q=swift+actor+article`,
    '.search-interface',
    join(OUT, 'command-palette.png'),
    { wait: 1200 }
  );

  // Popup
  const popupPage = await context.newPage();
  await popupPage.emulateMedia({ colorScheme: 'dark' });
  await capture(
    popupPage,
    `${base}/src/popup/index.html`,
    '.popup',
    join(OUT, 'popup.png'),
    { wait: 600 }
  );

  // Dashboard
  const dashPage = await context.newPage();
  await dashPage.emulateMedia({ colorScheme: 'dark' });
  await dashPage.goto(`${base}/src/main/index.html`, { waitUntil: 'networkidle' });
  await dashPage.waitForTimeout(600);
  await dashPage.screenshot({
    path: join(OUT, 'dashboard.png'),
    type: 'png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 900, height: 700 },
  });
  console.log('Saved', join(OUT, 'dashboard.png'));

  // Search with results on dashboard
  const searchInput = dashPage.locator('.findit-input').first();
  await searchInput.fill('swift actor');
  await dashPage.waitForTimeout(400);
  await dashPage.locator('.search-interface').screenshot({
    path: join(OUT, 'search-results.png'),
    type: 'png',
  });
  console.log('Saved', join(OUT, 'search-results.png'));

  await browser.close();
  server.close();
  console.log('Done — screenshots saved to docs/screenshots/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
