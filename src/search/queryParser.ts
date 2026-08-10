const TIME_PATTERNS: Array<{ pattern: RegExp; range: string }> = [
  { pattern: /\btoday\b/i, range: 'today' },
  { pattern: /\byesterday\b/i, range: 'yesterday' },
  { pattern: /\blast\s*week\b/i, range: 'last7days' },
  { pattern: /\blast\s*7\s*days?\b/i, range: 'last7days' },
  { pattern: /\blast\s*month\b/i, range: 'last30days' },
  { pattern: /\blast\s*30\s*days?\b/i, range: 'last30days' },
  { pattern: /\blast\s*3\s*months?\b/i, range: 'last90days' },
];

const SITE_PATTERN = /site:([\w.-]+)/gi;

export interface ParsedQuery {
  terms: string[];
  phrase?: string;
  domain?: string;
  timeRange?: string;
  raw: string;
}

export function parseQuery(raw: string): ParsedQuery {
  let text = raw.trim();
  let domain: string | undefined;
  let timeRange: string | undefined;

  const siteMatches = text.match(SITE_PATTERN);
  if (siteMatches) {
    for (const match of siteMatches) {
      const domainMatch = match.match(/site:([\w.-]+)/i);
      if (domainMatch) {
        domain = domainMatch[1].toLowerCase();
      }
      text = text.replace(match, '');
    }
  }

  for (const { pattern, range } of TIME_PATTERNS) {
    if (pattern.test(text)) {
      timeRange = range;
      text = text.replace(pattern, '');
    }
  }

  text = text.replace(/\s+/g, ' ').trim();

  let phrase: string | undefined;
  const phraseMatch = text.match(/"([^"]+)"/);
  if (phraseMatch) {
    phrase = phraseMatch[1].toLowerCase();
    text = text.replace(phraseMatch[0], '');
  }

  const terms = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  return { terms, phrase, domain, timeRange, raw };
}
