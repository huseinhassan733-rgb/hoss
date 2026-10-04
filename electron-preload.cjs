/**
 * H2pro Desktop Accounting & ERP System
 * Electron Preload Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppDataPath: () => ipcRenderer.invoke('get-appdata-path'),
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  isDesktop: true,
});
