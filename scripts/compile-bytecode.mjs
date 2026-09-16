// 仙侠战线 · Xianxia Frontline - bytenode 字节码加密脚本
// 将 Electron 主进程逻辑文件编译为 V8 字节码 (.jsc),防止源码被直接查看
// 注意: bytenode 1.6.0 + Electron >= 42 必须使用 electronMain 模式编译
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const bytenode = require('bytenode');

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronDir = join(__dirname, '..', 'electron');

console.log('═══════════════════════════════════════════');
console.log('  仙侠战线 · bytenode 字节码加密');
console.log('═══════════════════════════════════════════\n');

// 编译 main-logic.js -> main-logic.jsc
// 编译 preload.js -> preload.jsc
// electronMain: true → 在 Electron 主进程中编译,确保 V8 字节码版本匹配
const filesToCompile = [
  { input: join(electronDir, 'main-logic.js'), output: join(electronDir, 'main-logic.jsc') },
  { input: join(electronDir, 'preload.js'), output: join(electronDir, 'preload.jsc') }
];

for (const { input, output } of filesToCompile) {
  if (!existsSync(input)) {
    console.error(`✗ 源文件不存在: ${input}`);
    process.exit(1);
  }
  try {
    await bytenode.compileFile({
      filename: input,
      output: output,
      electronMain: true
    });
    console.log(`✓ ${input.split('\\').pop()} → ${output.split('\\').pop()}`);
  } catch (err) {
    console.error(`✗ 编译失败: ${input}`, err.message);
    process.exit(1);
  }
}

console.log('\n═══════════════════════════════════════════');
console.log('  字节码加密完成!');
console.log('  源码保留在构建工作区，.jsc 仅作为当前 Electron 版本的发行产物');
console.log('═══════════════════════════════════════════\n');
