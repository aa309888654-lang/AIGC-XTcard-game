const { contextBridge } = require('electron');
const path = require('path');
const fs = require('fs');
let appVersion = '1.0.0';
try {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version) appVersion = pkg.version;
  }
} catch { /* fallback to default version */ }
contextBridge.exposeInMainWorld('xianxiaDesktop', {
  version: appVersion,
  platform: process.platform,
  isDesktop: true
});