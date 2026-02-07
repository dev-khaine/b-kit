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
const WorkspaceManager_1 = require("./core/workspace/WorkspaceManager");
const TemplateGenerator_1 = require("./core/workspace/TemplateGenerator");
const BacklinkIndexer_1 = require("./core/linking/BacklinkIndexer");
const SearchEngine_1 = require("./core/search/SearchEngine");
const ContextExporter_1 = require("./core/export/ContextExporter");
const LinkResolver_1 = require("./core/linking/LinkResolver");
class BKitApp {
    constructor() {
        this.mainWindow = null;
        this.backlinkIndexer = null;
        this.searchEngine = null;
        this.fileWatcher = null;
        this.workspaceManager = new WorkspaceManager_1.WorkspaceManager();
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
    registerIPCHandlers() {
        // Workspace operations
        electron_1.ipcMain.handle('workspace:open', async () => {
            const result = await electron_1.dialog.showOpenDialog({
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
        electron_1.ipcMain.handle('workspace:create', async (_, workspaceName) => {
            const result = await electron_1.dialog.showOpenDialog({
                properties: ['openDirectory', 'createDirectory'],
                title: 'Select Location for New Workspace'
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const parentPath = result.filePaths[0];
                const workspacePath = path.join(parentPath, workspaceName);
                const success = await TemplateGenerator_1.TemplateGenerator.generateWorkspace(workspacePath, workspaceName);
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
        electron_1.ipcMain.handle('workspace:get-tree', () => {
            return this.workspaceManager.getFileTree();
        });
        // File operations
        electron_1.ipcMain.handle('file:read', (_, filePath) => {
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
        electron_1.ipcMain.handle('file:write', (_, filePath, content) => {
            const success = this.workspaceManager.writeFile(filePath, content);
            if (success && this.backlinkIndexer) {
                // Update index for this file
                this.backlinkIndexer.updateFile(filePath);
                this.searchEngine?.rebuild();
            }
            return success;
        });
        electron_1.ipcMain.handle('file:open-single', async () => {
            const result = await electron_1.dialog.showOpenDialog({
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
                }
                catch (error) {
                    console.error('Error reading file:', error);
                }
            }
            return null;
        });
        // Link operations
        electron_1.ipcMain.handle('link:resolve', (_, linkTarget) => {
            const workspacePath = this.workspaceManager.getWorkspacePath();
            if (!workspacePath)
                return null;
            return LinkResolver_1.LinkResolver.resolveLink(linkTarget, workspacePath);
        });
        electron_1.ipcMain.handle('link:get-backlinks', (_, filePath) => {
            if (!this.backlinkIndexer)
                return [];
            return this.backlinkIndexer.getBacklinks(filePath);
        });
        // Search operations
        electron_1.ipcMain.handle('search:query', (_, query, limit) => {
            if (!this.searchEngine)
                return [];
            return this.searchEngine.search(query, limit);
        });
        // Export operations
        electron_1.ipcMain.handle('export:context', async () => {
            if (!this.backlinkIndexer || !this.workspaceManager.getConfig()) {
                return { success: false, error: 'No workspace open' };
            }
            const result = await electron_1.dialog.showSaveDialog({
                title: 'Export AI Context',
                defaultPath: 'bkit-context.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });
            if (!result.canceled && result.filePath) {
                const config = this.workspaceManager.getConfig();
                const exporter = new ContextExporter_1.ContextExporter(this.backlinkIndexer, config?.name || 'BKit Workspace');
                const success = await exporter.exportContext(result.filePath);
                return { success, path: result.filePath };
            }
            return { success: false };
        });
    }
    async initializeWorkspace(workspacePath) {
        // Initialize indexer
        this.backlinkIndexer = new BacklinkIndexer_1.BacklinkIndexer(workspacePath);
        await this.backlinkIndexer.buildIndex();
        // Initialize search
        this.searchEngine = new SearchEngine_1.SearchEngine(this.backlinkIndexer);
        // Watch workspace for changes
        this.watchWorkspace(workspacePath);
    }
    watchWorkspace(workspacePath) {
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
        this.fileWatcher.on('change', (filePath) => {
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
    stopWatchingWorkspace() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
    }
}
new BKitApp();
//# sourceMappingURL=main.js.map