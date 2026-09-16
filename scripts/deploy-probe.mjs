// 仙侠战线 · Xianxia Frontline - 部署后资源探测
// 用途: 验证 dist 产物与部署路径合同,并/或对在线 URL 做 HTTP 资源探测。
// 用法:
//   node scripts/deploy-probe.mjs                    # 本地: 校验 dist 清单 + 自动起 preview 探测
//   node scripts/deploy-probe.mjs --url https://...  # 远程: 只探测给定 origin 的资源
// 退出码: 0 = 全部通过; 1 = 存在失败
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);
const root = process.cwd();
const distDir = join(root, "dist");
const args = process.argv.slice(2);
const urlArg = args[args.indexOf("--url") + 1];
const FAIL_KEYS = [/\.map$/, /node_modules/, /\.DS_Store/];

function log(ok, msg) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
}

function collectDistAssetUrls() {
  const urls = new Set();
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const rel = full.slice(distDir.length).replace(/\\/g, "/");
      if (FAIL_KEYS.some((re) => re.test(rel))) continue;
      if (rel.startsWith("/assets/")) urls.add(rel);
    }
  }
  walk(distDir);
  return urls;
}

// 从 index.html 提取入口资源引用
function extractEntryUrls() {
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const urls = new Set();
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  return [...urls];
}

async function probe(url, timeoutMs = 15000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow", cache: "no-store" });
    clearTimeout(timer);
    if (response.ok) return { ok: true, status: response.status };
    // HEAD 可能被部分静态服务器拒绝;用 GET + Range 只读前 8KB 确认可访问性
    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), timeoutMs);
    response = await fetch(url, { method: "GET", signal: controller2.signal, headers: { Range: "bytes=0-8191" }, redirect: "follow", cache: "no-store" });
    clearTimeout(timer2);
    const status = response.status;
    return { ok: status === 206 || (status >= 200 && status < 400) || response.ok, status };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function probeAll(base, urls, concurrency = 12) {
  const results = [];
  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      if (!path) return;
      const { ok, status, error } = await probe(`${base}${path}`);
      results.push({ path, ok, status, error });
      log(ok, `${path} (${status})`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

async function startPreview() {
  const child = spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "preview", "--port", "4199", "--strictPort"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return child;
}

async function main() {
  if (!existsSync(join(distDir, "index.html"))) {
    console.error("✗ 未找到 dist/index.html,请先执行 npm run build");
    process.exit(1);
  }

  const entries = extractEntryUrls();
  log(true, `index.html 引用 ${entries.length} 个入口资源`);
  for (const e of entries) log(true, `  入口: ${e}`);

  if (urlArg) {
    const normalized = urlArg.replace(/\/+$/, "");
    console.log(`\n远程探测 ${normalized} ...`);
    const all = new Set([...entries, ...collectDistAssetUrls()]);
    const results = await probeAll(normalized, [...all]);
    const failed = results.filter((r) => !r.ok);
    console.log(`\n远程: ${results.length - failed.length}/${results.length} 通过`);
    if (failed.length) {
      for (const f of failed.slice(0, 20)) log(false, f.error ? `${f.path} (${f.error})` : `${f.path} (${f.status})`);
      process.exit(1);
    }
    return;
  }

  // 本地: 先校验 dist 内清单自洽,再对 preview 服务探测
  console.log("\n本地清单自洽性检查 ...");
  const assets = collectDistAssetUrls();
  const missingInDist = entries.filter((e) => e.startsWith("/assets/") && !existsSync(join(root, "dist", e.replace(/^\//, ""))));
  if (missingInDist.length) {
    log(false, `入口资源在 dist 缺失: ${missingInDist.join(", ")}`);
    process.exit(1);
  }
  log(true, `dist 清单 ${assets.size} 个资源,入口资源全部存在`);

  console.log("\n启动 vite preview 探测 ...");
  const child = await startPreview();
  try {
    const results = await probeAll("http://127.0.0.1:4199", [...entries, ...assets]);
    const failed = results.filter((r) => !r.ok);
    console.log(`\n本地: ${results.length - failed.length}/${results.length} 通过`);
    if (failed.length) {
      for (const f of failed.slice(0, 20)) log(false, f.error ? `${f.path} (${f.error})` : `${f.path} (${f.status})`);
      process.exit(1);
    }
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error("✗", error);
  process.exit(1);
});
