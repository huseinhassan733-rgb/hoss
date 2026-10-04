/**
 * H2pro Desktop Accounting & ERP System
 * Electron Main Process Entry
 * Supports: Windows .exe via electron-builder, SQLite storage in AppData, full Arabic RTL window
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: 'H2pro - نظام المحاسبة وإدارة الأعمال المتكامل',
    backgroundColor: '#0f1d2e',
    icon: path.join(__dirname, 'public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.cjs'),
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Load from local Vite build in production or dev server
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = 'http://localhost:3000';
  const prodUrl = `file://${path.join(__dirname, 'dist/index.html')}`;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadURL(prodUrl);
    });
  } else {
    mainWindow.loadURL(prodUrl);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// AppData SQLite database path configuration
const appDataPath = app.getPath('userData');
const dbFilePath = path.join(appDataPath, 'h2pro_erp.sqlite');

ipcMain.handle('get-appdata-path', () => {
  return { appDataPath, dbFilePath };
});

ipcMain.handle('print-to-pdf', async (event, options) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const pdfData = await win.webContents.printToPDF({
      marginsType: 0,
      printBackground: true,
      printSelectionOnly: false,
      landscape: false,
      pageSize: 'A4',
      ...options,
    });
    return { success: true, data: pdfData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
