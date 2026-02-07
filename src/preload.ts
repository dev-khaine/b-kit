import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('bkitAPI', {
  // Workspace operations
  workspace: {
    open: () => ipcRenderer.invoke('workspace:open'),
    create: (name: string) => ipcRenderer.invoke('workspace:create', name),
    getTree: () => ipcRenderer.invoke('workspace:get-tree'),
    onFileChanged: (callback: (filePath: string) => void) => {
      ipcRenderer.on('workspace:file-changed', (_, filePath) => callback(filePath));
    },
    onTreeChanged: (callback: () => void) => {
      ipcRenderer.on('workspace:tree-changed', () => callback());
    }
  },

  // File operations
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    openSingle: () => ipcRenderer.invoke('file:open-single')
  },

  // Link operations
  link: {
    resolve: (target: string) => ipcRenderer.invoke('link:resolve', target),
    getBacklinks: (filePath: string) => ipcRenderer.invoke('link:get-backlinks', filePath)
  },

  // Search operations
  search: {
    query: (query: string, limit?: number) => ipcRenderer.invoke('search:query', query, limit)
  },

  // Export operations
  export: {
    context: () => ipcRenderer.invoke('export:context')
  }
});