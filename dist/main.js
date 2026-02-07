"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const chokidar = __importStar(require("chokidar"));
class MarkdownReaderApp {
    constructor() {
        this.mainWindow = null;
        this.currentFilePath = null;
        this.fileWatcher = null;
        this.initializeApp();
    }
    initializeApp() {
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.registerIPCHandlers();
            electron_1.app.on('activate', () => {
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
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
    setupDragAndDrop() {
        if (!this.mainWindow)
            return;
        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            event.preventDefault();
        });
    }
    registerIPCHandlers() {
        electron_1.ipcMain.handle('open-file-dialog', async () => {
            const result = await electron_1.dialog.showOpenDialog({
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
        electron_1.ipcMain.handle('read-dropped-file', async (_, filePath) => {
            return this.loadMarkdownFile(filePath);
        });
        electron_1.ipcMain.handle('get-theme', () => {
            return 'light';
        });
    }
    loadMarkdownFile(filePath) {
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
        }
        catch (error) {
            console.error('Error loading file:', error);
            return null;
        }
    }
    watchFile(filePath) {
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
    stopWatchingFile() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
    }
}
new MarkdownReaderApp();
//# sourceMappingURL=main.js.map