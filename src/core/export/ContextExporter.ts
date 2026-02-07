import * as fs from 'fs';
import * as path from 'path';
import { ContextExport, ContextFile } from '../../types';
import { BacklinkIndexer } from '../linking/BacklinkIndexer';

export class ContextExporter {
  private indexer: BacklinkIndexer;
  private workspaceName: string;

  constructor(indexer: BacklinkIndexer, workspaceName: string) {
    this.indexer = indexer;
    this.workspaceName = workspaceName;
  }

  async exportContext(outputPath: string): Promise<boolean> {
    try {
      const files = this.indexer.getAllFiles();
      
      const contextFiles: ContextFile[] = files.map(file => ({
        path: file.path,
        name: file.name,
        headings: file.headings,
        content: this.cleanContent(fs.readFileSync(file.path, 'utf-8'))
      }));

      const structure = this.buildStructure(files);

      const exportData: ContextExport = {
        workspace: this.workspaceName,
        generated: new Date().toISOString(),
        files: contextFiles,
        structure
      };

      fs.writeFileSync(
        outputPath,
        JSON.stringify(exportData, null, 2),
        'utf-8'
      );

      return true;
    } catch (error) {
      console.error('Failed to export context:', error);
      return false;
    }
  }

  private cleanContent(content: string): string {
    // Remove multiple blank lines
    return content
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private buildStructure(files: FileIndexEntry[]): Record<string, string[]> {
    const structure: Record<string, string[]> = {};

    for (const file of files) {
      const parts = file.path.split(path.sep);
      const folderIndex = parts.length - 2;
      
      if (folderIndex >= 0) {
        const folder = parts[folderIndex];
        if (!structure[folder]) {
          structure[folder] = [];
        }
        structure[folder].push(file.name);
      }
    }

    return structure;
  }
}