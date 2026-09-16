// 仙侠战线 · Xianxia Frontline - Electron 主进程逻辑
// 此文件会被编译为 main-logic.jsc 字节码
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { isAllowedExternalUrl } = require('./external-url-policy.cjs');

let mainWindow = null;

function externalUrlOptions() {
  return {
    allowedProtocols: ['https:'],
    allowedHosts: (process.env.EXTERNAL_LINK_ALLOWLIST || '').split(',').map((h) => h.trim()).filter(Boolean)
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    title: '仙侠战线 · Xianxia Frontline',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#0a0a14',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      devTools: false,
      preload: path.join(__dirname, 'preload.jsc')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url, externalUrlOptions())) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
});
