import * as fs from 'fs';
import * as path from 'path';
import { FileNode, WorkspaceConfig } from '../../types';
import { WorkspaceConfigManager } from './WorkspaceConfig';

export class WorkspaceManager {
  private workspacePath: string | null = null;
  private config: WorkspaceConfig | null = null;

  async openWorkspace(workspacePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(workspacePath)) {
        throw new Error('Workspace path does not exist');
      }

      const stats = fs.statSync(workspacePath);
      if (!stats.isDirectory()) {
        throw new Error('Workspace path is not a directory');
      }

      this.workspacePath = workspacePath;
      this.config = WorkspaceConfigManager.load(workspacePath);

      return true;
    } catch (error) {
      console.error('Failed to open workspace:', error);
      return false;
    }
  }

  getWorkspacePath(): string | null {
    return this.workspacePath;
  }

  getConfig(): WorkspaceConfig | null {
    return this.config;
  }

  getFileTree(): FileNode | null {
    if (!this.workspacePath) return null;
    return this.buildFileTree(this.workspacePath);
  }

  private buildFileTree(dirPath: string, relativePath: string = ''): FileNode {
    const name = path.basename(dirPath);
    const node: FileNode = {
      name,
      path: dirPath,
      type: 'directory',
      children: []
    };

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        // Skip hidden files and workspace config
        if (item.startsWith('.') || item === 'workspace.json') continue;

        const itemPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          node.children!.push(this.buildFileTree(itemPath, itemRelativePath));
        } else if (stats.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (ext === '.md' || ext === '.markdown') {
            node.children!.push({
              name: item,
              path: itemPath,
              type: 'file',
              extension: ext
            });
          }
        }
      }

      // Sort: directories first, then files, both alphabetically
      node.children!.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

    } catch (error) {
      console.error('Error building file tree:', error);
    }

    return node;
  }

  readFile(filePath: string): string | null {
    try {
      if (!this.workspacePath) return null;
      
      // Ensure file is within workspace
      const resolvedPath = path.resolve(filePath);
      const workspaceResolved = path.resolve(this.workspacePath);
      
      if (!resolvedPath.startsWith(workspaceResolved)) {
        throw new Error('File is outside workspace');
      }

      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Failed to read file:', error);
      return null;
    }
  }

  writeFile(filePath: string, content: string): boolean {
    try {
      if (!this.workspacePath) return false;

      // Ensure file is within workspace
      const resolvedPath = path.resolve(filePath);
      const workspaceResolved = path.resolve(this.workspacePath);
      
      if (!resolvedPath.startsWith(workspaceResolved)) {
        throw new Error('File is outside workspace');
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to write file:', error);
      return false;
    }
  }

  getRelativePath(filePath: string): string {
    if (!this.workspacePath) return filePath;
    return path.relative(this.workspacePath, filePath);
  }

  resolveWorkspacePath(relativePath: string): string | null {
    if (!this.workspacePath) return null;
    return path.join(this.workspacePath, relativePath);
  }
}