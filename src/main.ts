import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { WorkspaceManager } from './core/workspace/WorkspaceManager';
import { WorkspaceConfigManager } from './core/workspace/WorkspaceConfig';
import { TemplateGenerator } from './core/workspace/TemplateGenerator';
import { BacklinkIndexer } from './core/linking/BacklinkIndexer';
import { SearchEngine } from './core/search/SearchEngine';
import { ContextExporter } from './core/export/ContextExporter';
import { LinkResolver } from './core/linking/LinkResolver';

class BKitApp {
  private mainWindow: BrowserWindow | null = null;
  private workspaceManager: WorkspaceManager;
  private backlinkIndexer: BacklinkIndexer | null = null;
  private searchEngine: SearchEngine | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;

  constructor() {
    this.workspaceManager = new WorkspaceManager();
    this.initializeApp();
  }

  private initializeApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.registerIPCHandlers();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 1000,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      },
      backgroundColor: '#ffffff',
      titleBarStyle: 'default',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.stopWatchingWorkspace();
      this.mainWindow = null;
    });
  }

  private registerIPCHandlers(): void {
    // Workspace operations
    ipcMain.handle('workspace:open', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Open BKit Workspace'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const workspacePath = result.filePaths[0];
        const success = await this.workspaceManager.openWorkspace(workspacePath);
        
        if (success) {
          await this.initializeWorkspace(workspacePath);
          return {
            path: workspacePath,
            config: this.workspaceManager.getConfig(),
            tree: this.workspaceManager.getFileTree()
          };
        }
      }

      return null;
    });

    ipcMain.handle('workspace:create', async (_, workspaceName: string) => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Location for New Workspace'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const parentPath = result.filePaths[0];
        const workspacePath = path.join(parentPath, workspaceName);

        const success = await TemplateGenerator.generateWorkspace(workspacePath, workspaceName);
        
        if (success) {
          await this.workspaceManager.openWorkspace(workspacePath);
          await this.initializeWorkspace(workspacePath);
          
          return {
            path: workspacePath,
            config: this.workspaceManager.getConfig(),
            tree: this.workspaceManager.getFileTree()
          };
        }
      }

      return null;
    });

    ipcMain.handle('workspace:get-tree', () => {
      return this.workspaceManager.getFileTree();
    });

    // File operations
    ipcMain.handle('file:read', (_, filePath: string) => {
      const content = this.workspaceManager.readFile(filePath);
      if (content !== null) {
        const relativePath = this.workspaceManager.getRelativePath(filePath);
        return {
          content,
          path: filePath,
          name: path.basename(filePath),
          relativePath
        };
      }
      return null;
    });

    ipcMain.handle('file:write', (_, filePath: string, content: string) => {
      const success = this.workspaceManager.writeFile(filePath, content);
      
      if (success && this.backlinkIndexer) {
        // Update index for this file
        this.backlinkIndexer.updateFile(filePath);
        this.searchEngine?.rebuild();
      }
      
      return success;
    });

    ipcMain.handle('file:open-single', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          return {
            content,
            path: filePath,
            name: path.basename(filePath)
          };
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }

      return null;
    });

    // Link operations
    ipcMain.handle('link:resolve', (_, linkTarget: string) => {
      const workspacePath = this.workspaceManager.getWorkspacePath();
      if (!workspacePath) return null;
      
      return LinkResolver.resolveLink(linkTarget, workspacePath);
    });

    ipcMain.handle('link:get-backlinks', (_, filePath: string) => {
      if (!this.backlinkIndexer) return [];
      return this.backlinkIndexer.getBacklinks(filePath);
    });

    // Search operations
    ipcMain.handle('search:query', (_, query: string, limit?: number) => {
      if (!this.searchEngine) return [];
      return this.searchEngine.search(query, limit);
    });

    // Export operations
    ipcMain.handle('export:context', async () => {
      if (!this.backlinkIndexer || !this.workspaceManager.getConfig()) {
        return { success: false, error: 'No workspace open' };
      }

      const result = await dialog.showSaveDialog({
        title: 'Export AI Context',
        defaultPath: 'bkit-context.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        const config = this.workspaceManager.getConfig();
        const exporter = new ContextExporter(
          this.backlinkIndexer,
          config?.name || 'BKit Workspace'
        );
        
        const success = await exporter.exportContext(result.filePath);
        return { success, path: result.filePath };
      }

      return { success: false };
    });
  }

  private async initializeWorkspace(workspacePath: string): Promise<void> {
    // Initialize indexer
    this.backlinkIndexer = new BacklinkIndexer(workspacePath);
    await this.backlinkIndexer.buildIndex();

    // Initialize search
    this.searchEngine = new SearchEngine(this.backlinkIndexer);

    // Watch workspace for changes
    this.watchWorkspace(workspacePath);
  }

  private watchWorkspace(workspacePath: string): void {
    this.stopWatchingWorkspace();

    this.fileWatcher = chokidar.watch(workspacePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: /(^|[\/\\])\.|workspace\.json/,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.fileWatcher.on('change', (filePath: string) => {
      if (this.mainWindow && filePath.endsWith('.md')) {
        // Update index
        if (this.backlinkIndexer) {
          this.backlinkIndexer.updateFile(filePath);
          this.searchEngine?.rebuild();
        }

        // Notify renderer
        this.mainWindow.webContents.send('workspace:file-changed', filePath);
      }
    });

    this.fileWatcher.on('add', () => {
      this.mainWindow?.webContents.send('workspace:tree-changed');
    });

    this.fileWatcher.on('unlink', () => {
      this.mainWindow?.webContents.send('workspace:tree-changed');
    });
  }

  private stopWatchingWorkspace(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }
}

new BKitApp();