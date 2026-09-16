// 仙侠战线 · Xianxia Frontline - Electron 主进程入口
// 此文件加载 bytenode 并启动字节码编译后的主进程逻辑
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

require('bytenode');
require('./main-logic.jsc');
