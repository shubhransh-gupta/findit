import Dexie, { type EntityTable } from 'dexie';
import type {
  PageRecord,
  TermRecord,
  CollectionRecord,
  SearchHistoryRecord,
  SettingsRecord,
} from '../shared/types';

export class FindItDatabase extends Dexie {
  pages!: EntityTable<PageRecord, 'id'>;
  terms!: EntityTable<TermRecord, 'id'>;
  collections!: EntityTable<CollectionRecord, 'id'>;
  searches!: EntityTable<SearchHistoryRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'id'>;

  constructor() {
    super('FindItDB');

    this.version(1).stores({
      pages: 'id, url, domain, timestamp, lastVisited, title, pinned',
      terms: '++id, pageId, term, field, [term+field]',
      collections: 'id, name, createdAt',
      searches: '++id, query, timestamp',
      settings: 'id',
    });
  }
}

export const db = new FindItDatabase();
