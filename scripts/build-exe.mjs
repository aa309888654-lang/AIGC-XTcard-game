// 仙侠战线 · Xianxia Frontline - EXE 一键构建脚本
// 流程: 1.构建前端 → 2.复制到app目录 → 3.为当前 Electron 编译字节码 → 4.electron-builder打包
import { execSync, spawnSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, renameSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const electronDir = join(rootDir, 'electron');
const distDir = join(rootDir, 'dist');
const appDir = join(rootDir, 'app');

// 设置国内镜像源,加速 Electron 及 electron-builder 工具链下载
process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR = process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';
process.env.electron_config_cache = process.env.electron_config_cache || join(rootDir, '.electron-cache');

const log = (msg) => console.log(`\n▶ ${msg}`);
const done = (msg) => console.log(`✓ ${msg}`);
function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });
  if (process.platform !== 'win32') {
    cpSync(source, target, { recursive: true });
    return;
  }
  // PowerShell handles Unicode paths and streams the large asset tree outside Node's heap.
  const quote = (value) => value.replace(/'/g, "''");
  const command = `Copy-Item -Path '${quote(source)}\\*' -Destination '${quote(target)}' -Recurse -Force -ErrorAction Stop`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`PowerShell copy exited with ${result.status}`);
}

console.log('═══════════════════════════════════════════');
console.log('  仙侠战线 · EXE 桌面版构建');
console.log('  加密方案: bytenode 字节码 + asar 打包');
console.log('═══════════════════════════════════════════\n');

// ========== 步骤 1: 构建前端 ==========
log('步骤 1/4: 构建前端 (Electron 相对资源路径)');
execSync('npm run build:electron', { cwd: rootDir, stdio: 'inherit' });
if (!existsSync(distDir)) {
  console.error('✗ 构建失败: dist 目录不存在');
  process.exit(1);
}
done('前端构建完成');

// ========== 步骤 2: 复制 dist → app ==========
log('步骤 2/4: 复制构建产物到 app 目录');
if (existsSync(appDir)) {
  rmSync(appDir, { recursive: true, force: true });
}
mkdirSync(appDir, { recursive: true });
copyDirectory(distDir, appDir);
done(`已复制 ${existsSync(join(appDir, 'index.html')) ? 'index.html' : '文件'} 到 app/`);

// ========== 步骤 3: 编译当前 Electron 对应的字节码 ==========
log('步骤 3/4: bytenode 字节码加密');

const mainLogicSrc = join(electronDir, 'main-logic.js');
const preloadSrc = join(electronDir, 'preload.js');

if (!existsSync(mainLogicSrc) || !existsSync(preloadSrc)) {
  console.error('✗ Electron 源文件缺失，不能复用旧 .jsc 字节码');
  process.exit(1);
}

// 每次发行都从源码重新生成，禁止跨 Electron/V8 版本复用 .jsc。
try {
  execSync('node scripts/compile-bytecode.mjs', { cwd: rootDir, stdio: 'inherit' });
  done('字节码加密完成');
} catch (err) {
  console.error('✗ 字节码编译失败', err.message);
  process.exit(1);
}

// ========== 步骤 4: electron-builder 打包 ==========
log('步骤 4/4: electron-builder 打包 EXE');
const outputDir = join(rootDir, 'output', 'exe-build');
if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}
try {
  execSync('npx electron-builder --win --config electron-builder.yml', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  done('EXE 打包完成');
} catch (err) {
  console.error('✗ electron-builder 打包失败', err.message);
  process.exit(1);
}

// ========== 完成汇总 ==========
console.log('\n═══════════════════════════════════════════');
console.log('  EXE 构建完成!');
console.log('═══════════════════════════════════════════');
console.log(`  输出目录: ${outputDir}`);
console.log('  加密保护:');
console.log('    ✓ 主进程代码 → 当前 Electron/V8 版本的字节码 (.jsc)');
console.log('    ✓ 资源文件 → asar 加密打包');
console.log('    ✓ DevTools 已禁用');
console.log('    ✓ Node 集成已关闭');
console.log('═══════════════════════════════════════════\n');
