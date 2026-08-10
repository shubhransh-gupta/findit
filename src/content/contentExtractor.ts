import type { ExtractedContent } from '../shared/types';
import { MAX_CONTENT_LENGTH, MAX_HEADINGS, MIN_CONTENT_WORDS } from '../shared/constants';
import { cleanTextContent, extractDescriptionFromMeta, normalizeContent } from '../indexing/contentNormalizer';

const IRRELEVANT_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[role="complementary"]', '[aria-hidden="true"]',
  '.cookie-banner', '.cookie-consent', '.ad', '.ads', '.advertisement',
  '.sidebar', '.nav', '.menu', '.footer', '.header',
  '#cookie-notice', '#gdpr', '.popup', '.modal',
  '.social-share', '.comments', '#comments',
];

const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '.markdown-body',
  '#readme',
  '.repository-content',
  '.post-body',
  '.article-body',
];

export function extractContent(doc: Document = document): ExtractedContent | null {
  try {
    const title = extractTitle(doc);
    const description = extractDescriptionFromMeta(doc);
    const headings = extractHeadings(doc);
    const content = extractMainContent(doc);

    if (!content || content.split(/\s+/).length < MIN_CONTENT_WORDS) {
      return null;
    }

    const favicon = extractFavicon(doc);

    return {
      title: title || doc.title || 'Untitled',
      description,
      headings,
      content: normalizeContent(content),
      wordCount: content.split(/\s+/).length,
      favicon,
    };
  } catch {
    return null;
  }
}

function extractTitle(doc: Document): string {
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (ogTitle) return cleanTextContent(ogTitle);

  const h1 = doc.querySelector('h1');
  if (h1?.textContent) return cleanTextContent(h1.textContent);

  return cleanTextContent(doc.title);
}

function extractHeadings(doc: Document): string[] {
  const headings: string[] = [];
  const elements = doc.querySelectorAll('h1, h2, h3, h4');

  for (const el of elements) {
    if (headings.length >= MAX_HEADINGS) break;
    const text = el.textContent?.trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push(cleanTextContent(text));
    }
  }

  return [...new Set(headings)];
}

function extractMainContent(doc: Document): string {
  const clone = doc.cloneNode(true) as Document;

  for (const selector of IRRELEVANT_SELECTORS) {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  }

  for (const selector of CONTENT_SELECTORS) {
    const el = clone.querySelector(selector);
    if (el?.textContent && el.textContent.split(/\s+/).length >= MIN_CONTENT_WORDS) {
      return cleanTextContent(el.textContent).slice(0, MAX_CONTENT_LENGTH);
    }
  }

  const body = clone.body;
  if (!body) return '';

  const paragraphs = body.querySelectorAll('p, li, td, pre, code, blockquote');
  const texts: string[] = [];

  for (const p of paragraphs) {
    const text = p.textContent?.trim();
    if (text && text.length > 20) {
      texts.push(text);
    }
  }

  if (texts.length > 0) {
    return cleanTextContent(texts.join('\n\n')).slice(0, MAX_CONTENT_LENGTH);
  }

  return cleanTextContent(body.textContent ?? '').slice(0, MAX_CONTENT_LENGTH);
}

function extractFavicon(doc: Document): string | undefined {
  const icon =
    doc.querySelector('link[rel="icon"]') ??
    doc.querySelector('link[rel="shortcut icon"]') ??
    doc.querySelector('link[rel="apple-touch-icon"]');

  if (icon) {
    const href = icon.getAttribute('href');
    if (href) {
      try {
        return new URL(href, doc.baseURI).href;
      } catch {
        return href;
      }
    }
  }
  return undefined;
}

export function extractSelection(): string {
  const selection = window.getSelection();
  return selection?.toString().trim() ?? '';
}
