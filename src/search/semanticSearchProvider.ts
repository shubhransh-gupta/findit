import type { SemanticSearchProvider, SearchDocument, SearchResult } from '../shared/types';

/**
 * Future-ready semantic search provider stub.
 * V1 uses LocalSearchEngine only. This interface allows
 * plugging in a local embedding model later without UI changes.
 */
export class LocalSemanticSearchProvider implements SemanticSearchProvider {
  async index(_document: SearchDocument): Promise<void> {
    // Future: generate and store local embeddings
  }

  async search(_query: string): Promise<SearchResult[]> {
    // Future: vector similarity search against local embeddings
    return [];
  }
}

export const semanticSearchProvider: SemanticSearchProvider = new LocalSemanticSearchProvider();
