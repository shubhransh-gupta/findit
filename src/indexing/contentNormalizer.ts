import { MAX_CONTENT_LENGTH } from '../shared/constants';

export function normalizeContent(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}

export function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

export function extractDescriptionFromMeta(doc: Document): string | undefined {
  const meta =
    doc.querySelector('meta[name="description"]') ??
    doc.querySelector('meta[property="og:description"]');
  return meta?.getAttribute('content')?.trim() || undefined;
}

export function cleanTextContent(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}
