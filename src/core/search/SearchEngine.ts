import Fuse from 'fuse.js';
import { SearchResult, FileIndexEntry } from '../../types';
import { BacklinkIndexer } from '../linking/BacklinkIndexer';

export class SearchEngine {
  private indexer: BacklinkIndexer;
  private fuse: Fuse<FileIndexEntry> | null = null;

  constructor(indexer: BacklinkIndexer) {
    this.indexer = indexer;
    this.buildSearchIndex();
  }

  private buildSearchIndex(): void {
    const files = this.indexer.getAllFiles();

    this.fuse = new Fuse(files, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'headings', weight: 1.5 },
        { name: 'content', weight: 1 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2
    });
  }

  search(query: string, limit: number = 20): SearchResult[] {
    if (!this.fuse || query.trim().length < 2) {
      return [];
    }

    const results = this.fuse.search(query, { limit });
    
    return results.map(result => {
      const item = result.item;
      const match = result.matches?.[0];
      
      let type: 'filename' | 'heading' | 'content' = 'content';
      let matchText = query;
      let context = '';

      if (match) {
        if (match.key === 'name') {
          type = 'filename';
          matchText = item.name;
        } else if (match.key === 'headings') {
          type = 'heading';
          matchText = Array.isArray(match.value) ? match.value[0] : String(match.value);
        } else {
          type = 'content';
          const indices = match.indices[0];
          if (indices) {
            const start = Math.max(0, indices[0] - 50);
            const end = Math.min(item.content.length, indices[1] + 50);
            context = '...' + item.content.substring(start, end) + '...';
          }
        }
      }

      return {
        path: item.path,
        name: item.name,
        type,
        match: matchText,
        context,
        score: result.score || 0
      };
    });
  }

  rebuild(): void {
    this.buildSearchIndex();
  }
}