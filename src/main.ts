import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';

class MarkdownReaderApp {
  private mainWindow: BrowserWindow | null = null;
  private currentFilePath: string | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;

  constructor() {
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
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
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
      this.stopWatchingFile();
      this.mainWindow = null;
    });

    this.setupDragAndDrop();
  }

  private setupDragAndDrop(): void {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault();
    });
  }

  private registerIPCHandlers(): void {
    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        return this.loadMarkdownFile(filePath);
      }

      return null;
    });

    ipcMain.handle('read-dropped-file', async (_, filePath: string) => {
      return this.loadMarkdownFile(filePath);
    });

    ipcMain.handle('get-theme', () => {
      return 'light';
    });
  }

  private loadMarkdownFile(filePath: string): { content: string; path: string; name: string } | null {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.md' && ext !== '.markdown') {
        throw new Error('File is not a Markdown file');
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      this.currentFilePath = filePath;
      this.watchFile(filePath);

      return {
        content,
        path: filePath,
        name: fileName
      };
    } catch (error) {
      console.error('Error loading file:', error);
      return null;
    }
  }

  private watchFile(filePath: string): void {
    this.stopWatchingFile();

    this.fileWatcher = chokidar.watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.fileWatcher.on('change', () => {
      if (this.mainWindow && this.currentFilePath) {
        const fileData = this.loadMarkdownFile(this.currentFilePath);
        if (fileData) {
          this.mainWindow.webContents.send('file-changed', fileData);
        }
      }
    });
  }

  private stopWatchingFile(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }
}

new MarkdownReaderApp();