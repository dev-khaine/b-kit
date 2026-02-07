import * as fs from 'fs';
import * as path from 'path';
import { BacklinkReference, FileIndexEntry, WorkspaceIndex } from '../../types';
import { LinkResolver } from './LinkResolver';

export class BacklinkIndexer {
  private workspacePath: string;
  private index: WorkspaceIndex;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.index = {
      files: new Map(),
      backlinks: new Map(),
      lastUpdated: Date.now()
    };
  }

  async buildIndex(): Promise<void> {
    this.index.files.clear();
    this.index.backlinks.clear();

    await this.indexDirectory(this.workspacePath);
    this.buildBacklinks();
    
    this.index.lastUpdated = Date.now();
  }

  private async indexDirectory(dirPath: string): Promise<void> {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        if (item.startsWith('.') || item === 'workspace.json') continue;

        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          await this.indexDirectory(itemPath);
        } else if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (ext === '.md' || ext === '.markdown') {
            this.indexFile(itemPath, stats.mtimeMs);
          }
        }
      }
    } catch (error) {
      console.error('Error indexing directory:', error);
    }
  }

  private indexFile(filePath: string, modified: number): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath);
      const headings = this.extractHeadings(content);
      const links = LinkResolver.extractLinks(content).map(l => l.target);

      const entry: FileIndexEntry = {
        path: filePath,
        name,
        headings,
        links,
        content: content.substring(0, 5000), // First 5000 chars for search
        modified
      };

      this.index.files.set(filePath, entry);
    } catch (error) {
      console.error('Error indexing file:', error);
    }
  }

  private extractHeadings(content: string): string[] {
    const headings: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push(match[2].trim());
      }
    }

    return headings;
  }

  private buildBacklinks(): void {
    // For each file, find all files that link to it
    for (const [sourcePath, sourceEntry] of this.index.files) {
      for (const linkTarget of sourceEntry.links) {
        const targetPath = LinkResolver.resolveLink(linkTarget, this.workspacePath);
        
        if (targetPath) {
          if (!this.index.backlinks.has(targetPath)) {
            this.index.backlinks.set(targetPath, []);
          }

          const backlink: BacklinkReference = {
            sourcePath,
            sourceName: sourceEntry.name,
            context: this.extractLinkContext(sourceEntry.content, linkTarget)
          };

          this.index.backlinks.get(targetPath)!.push(backlink);
        }
      }
    }
  }

  private extractLinkContext(content: string, linkTarget: string): string {
    const pattern = new RegExp(`(.{0,50}\\[\\[${linkTarget}\\]\\].{0,50})`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : '';
  }

  getBacklinks(filePath: string): BacklinkReference[] {
    return this.index.backlinks.get(filePath) || [];
  }

  getFileEntry(filePath: string): FileIndexEntry | undefined {
    return this.index.files.get(filePath);
  }

  updateFile(filePath: string): void {
    const stats = fs.statSync(filePath);
    this.indexFile(filePath, stats.mtimeMs);
    this.buildBacklinks();
  }

  getAllFiles(): FileIndexEntry[] {
    return Array.from(this.index.files.values());
  }

  getIndex(): WorkspaceIndex {
    return this.index;
  }
}