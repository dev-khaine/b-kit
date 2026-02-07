"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: () => electron_1.ipcRenderer.invoke('open-file-dialog'),
    readDroppedFile: (filePath) => electron_1.ipcRenderer.invoke('read-dropped-file', filePath),
    getTheme: () => electron_1.ipcRenderer.invoke('get-theme'),
    onFileChanged: (callback) => {
        electron_1.ipcRenderer.on('file-changed', (_, data) => callback(data));
    }
});
//# sourceMappingURL=preload.js.map