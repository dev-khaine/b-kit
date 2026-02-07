"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('bkitAPI', {
    // Workspace operations
    workspace: {
        open: () => electron_1.ipcRenderer.invoke('workspace:open'),
        create: (name) => electron_1.ipcRenderer.invoke('workspace:create', name),
        getTree: () => electron_1.ipcRenderer.invoke('workspace:get-tree'),
        onFileChanged: (callback) => {
            electron_1.ipcRenderer.on('workspace:file-changed', (_, filePath) => callback(filePath));
        },
        onTreeChanged: (callback) => {
            electron_1.ipcRenderer.on('workspace:tree-changed', () => callback());
        }
    },
    // File operations
    file: {
        read: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
        write: (filePath, content) => electron_1.ipcRenderer.invoke('file:write', filePath, content),
        openSingle: () => electron_1.ipcRenderer.invoke('file:open-single')
    },
    // Link operations
    link: {
        resolve: (target) => electron_1.ipcRenderer.invoke('link:resolve', target),
        getBacklinks: (filePath) => electron_1.ipcRenderer.invoke('link:get-backlinks', filePath)
    },
    // Search operations
    search: {
        query: (query, limit) => electron_1.ipcRenderer.invoke('search:query', query, limit)
    },
    // Export operations
    export: {
        context: () => electron_1.ipcRenderer.invoke('export:context')
    }
});
//# sourceMappingURL=preload.js.map