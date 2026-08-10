export interface PageRecord {
  id: string;
  url: string;
  title: string;
  domain: string;
  description?: string;
  headings: string[];
  content: string;
  timestamp: number;
  lastVisited: number;
  visitCount: number;
  wordCount: number;
  favicon?: string;
  contentHash?: string;
  pinned?: boolean;
  collections?: string[];
  savedSelection?: string;
}

export interface TermRecord {
  id?: number;
  pageId: string;
  term: string;
  field: 'title' | 'heading' | 'domain' | 'url' | 'body';
  count: number;
}

export interface CollectionRecord {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface SearchHistoryRecord {
  id?: number;
  query: string;
  timestamp: number;
}

export interface SettingsRecord {
  id: string;
  indexingEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
  retentionDays: number | null;
  excludedDomains: string[];
}

export interface SearchQuery {
  text: string;
  domain?: string;
  timeRange?: TimeRange;
  pinnedOnly?: boolean;
  collection?: string;
}

export type TimeRange =
  | 'any'
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'custom';

export interface SearchResult {
  page: PageRecord;
  score: number;
  snippet: string;
  matchedTerms: string[];
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  headings: string[];
  domain: string;
  url: string;
}

export interface ExtractedContent {
  title: string;
  description?: string;
  headings: string[];
  content: string;
  wordCount: number;
  favicon?: string;
}

export interface StorageStats {
  pageCount: number;
  estimatedBytes: number;
  oldestTimestamp: number | null;
}

export interface MessagePayload {
  type: string;
  payload?: unknown;
}

export type MessageType =
  | 'INDEX_PAGE'
  | 'SAVE_SELECTION'
  | 'SEARCH'
  | 'GET_STATS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'DELETE_PAGE'
  | 'PIN_PAGE'
  | 'CLEAR_ALL'
  | 'CLEAR_OLD'
  | 'OPEN_PALETTE'
  | 'GET_RECENT_SEARCHES'
  | 'GET_RECENT_PAGES'
  | 'ADD_COLLECTION'
  | 'GET_COLLECTIONS'
  | 'ADD_TO_COLLECTION'
  | 'GET_RELATED';

export interface SemanticSearchProvider {
  index(document: SearchDocument): Promise<void>;
  search(query: string): Promise<SearchResult[]>;
}

export interface SearchEngine {
  search(query: SearchQuery): Promise<SearchResult[]>;
}
