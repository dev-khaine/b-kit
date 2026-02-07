export interface WorkspaceConfig {
  version: string;
  name: string;
  created: string;
  structure: {
    brand: string[];
    product: string[];
    marketing: string[];
  };
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
}

export interface FileData {
  content: string;
  path: string;
  name: string;
  relativePath?: string;
}

export interface BacklinkReference {
  sourcePath: string;
  sourceName: string;
  lineNumber?: number;
  context?: string;
}

export interface SearchResult {
  path: string;
  name: string;
  type: 'filename' | 'heading' | 'content';
  match: string;
  context?: string;
  score: number;
}

export interface LinkMatch {
  raw: string;
  target: string;
  start: number;
  end: number;
}

export interface WorkspaceIndex {
  files: Map<string, FileIndexEntry>;
  backlinks: Map<string, BacklinkReference[]>;
  lastUpdated: number;
}

export interface FileIndexEntry {
  path: string;
  name: string;
  headings: string[];
  links: string[];
  content: string;
  modified: number;
}

export interface ContextExport {
  workspace: string;
  generated: string;
  files: ContextFile[];
  structure: Record<string, string[]>;
}

export interface ContextFile {
  path: string;
  name: string;
  headings: string[];
  content: string;
}

export type ViewMode = 'read' | 'edit' | 'split';