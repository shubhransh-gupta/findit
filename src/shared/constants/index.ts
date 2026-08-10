export const APP_NAME = 'FINDIT';
export const APP_TAGLINE = "You don't need to remember where you saw it. FINDIT remembers for you.";
export const PRIVACY_MESSAGE = 'Your browsing memory stays on your device.';

export const MAX_CONTENT_LENGTH = 100_000;
export const MAX_HEADINGS = 50;
export const SNIPPET_LENGTH = 200;
export const SEARCH_DEBOUNCE_MS = 150;
export const INDEX_DEBOUNCE_MS = 2000;
export const MIN_CONTENT_WORDS = 10;

export const FIELD_WEIGHTS = {
  title: 5,
  heading: 4,
  url: 3,
  domain: 2,
  body: 1,
} as const;

export const RECENT_VISIT_BONUS_DAYS = [
  { days: 1, bonus: 0.5 },
  { days: 7, bonus: 0.3 },
  { days: 30, bonus: 0.15 },
  { days: 90, bonus: 0.05 },
];

export const DEFAULT_EXCLUDED_DOMAINS = [
  'mail.google.com',
  'accounts.google.com',
  'login.live.com',
  'paypal.com',
  'chase.com',
  'bankofamerica.com',
  '1password.com',
  'lastpass.com',
  'bitwarden.com',
  'dashlane.com',
];

export const DEFAULT_EXCLUDED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'brave://',
  'edge://',
  'about:',
  'devtools://',
];

export const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
];

export const DEFAULT_SETTINGS = {
  indexingEnabled: true,
  theme: 'system' as const,
  retentionDays: 365,
  excludedDomains: [...DEFAULT_EXCLUDED_DOMAINS],
};

export const DEFAULT_COLLECTIONS = [
  { name: 'Research', color: '#e63946' },
  { name: 'Work', color: '#457b9d' },
  { name: 'Reading', color: '#2a9d8f' },
  { name: 'Shopping', color: '#e9c46a' },
];
