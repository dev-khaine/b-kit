import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  readDroppedFile: (filePath: string) => ipcRenderer.invoke('read-dropped-file', filePath),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onFileChanged: (callback: (fileData: any) => void) => {
    ipcRenderer.on('file-changed', (_, data) => callback(data));
  }
});