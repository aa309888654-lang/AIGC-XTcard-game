// 仙侠战线 · Xianxia Frontline - secret scan
// 扫描工作区(排除 node_modules/dist/git/构建产物)中的高危敏感信息。
// 退出码: 0 = 无高危; 1 = 发现高危项。
// 用法: node scripts/secret-scan.mjs [--fix]   (--fix 仅打印处置建议,不自动删除)
import { readdirSync, openSync, readSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

const root = process.cwd();
const FAIL = 1;

// 应排除的目录(构建产物/第三方/大资源树/历史基线)
const EXCLUDE_DIRS = new Set([
  "node_modules", "dist", ".git", ".godot", "tmp", "output", "修改备份",
  "app", "public", "exporter", "schema-vault", "godot",
  "exe-build", "win-unpacked.tmp", "bytecode",
  ".next", "coverage", "bytecode", "logs", ".cache", "imports", "release",
]);

const EXCLUDE_FILES = new Set([
  ".gitignore", ".npmrc", ".env.example", "package-lock.json", "package.json",
]);

// 只扫描文本类文件(避免大二进制资源)
const SCAN_EXT = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".txt",
  ".yml", ".yaml", ".toml", ".ini", ".conf", ".cfg", ".sh", ".ps1", ".psm1",
  ".html", ".css", ".env", ".nvmrc", ".gitignore", ".properties", ".xml",
  ".crt", ".csr", ".snap", ".mjs.map",
]);

const MAX_READ_BYTES = 256 * 1024;

// 高危硬编码 token/密钥模式
const PATTERNS = [
  // 私钥块
  { re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/gi, sev: "critical", label: "PRIVATE KEY 块" },
  // 通用 secret 赋值(排除测试/示例)
  { re: /\b((?:sk|pk|ak)[-_][A-Za-z0-9]{20,})\b/g, sev: "high", label: "疑似 API 密钥" },
  { re: /\b(?:password|passwd|passphrase|secret|api[_-]?key|access[_-]?key|token)\s*[:=]\s*["']([^"'\s]{12,})["']/gi, sev: "high", label: "疑似口令/令牌赋值" },
  // 数据库连接串中带口令(排除 localhost/docker 示例默认值)
  { re: /(?:postgres|mysql|mongodb)(?:\+ssl|\+srv|ql)?:\/\/[^\/@\s:]+:([^@\/\s]{4,})@(?!127\.0\.0\.1|localhost)([^\/\s]+)/gi, sev: "high", label: "含口令的连接串(非本机)" },
];

// 敏感扩展名(存在即高危)
const SENSITIVE_EXT = new Set([".key", ".pfx", ".p12", ".pem", ".p8", ".keystore"]);
const SENSITIVE_NAMES = new Set(["keystorepass.txt", ".env"]);

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function checkBinary(file) {
  try {
    const fd = openSync(file, "r");
    const buf = Buffer.alloc(1024);
    const bytes = readSync(fd, buf, 0, 1024, 0);
    const head = buf.subarray(0, bytes);
    return head.includes(0);
  } catch {
    return true;
  }
}

function readHead(file, maxBytes) {
  const fd = openSync(file, "r");
  const buf = Buffer.alloc(maxBytes);
  const bytes = readSync(fd, buf, 0, maxBytes, 0);
  return buf.subarray(0, bytes).toString("utf8");
}

async function main() {
  const fix = process.argv.includes("--fix");
  const files = walk(root).filter((f) => {
    const ext = extname(f).toLowerCase();
    const base = basename(f).toLowerCase();
    return SCAN_EXT.has(ext) || EXCLUDE_FILES.has(base);
  });
  const issues = [];

  for (const file of files) {
    if (EXCLUDE_FILES.has(relative(root, file).replace(/\\/g, "/").split("/").pop())) continue;
    const rel = relative(root, file).replace(/\\/g, "/");
    const ext = extname(file).toLowerCase();
    const base = basename(file).toLowerCase();

    // 敏感文件扩展名/文件名
    if (SENSITIVE_EXT.has(ext) || SENSITIVE_NAMES.has(base)) {
      issues.push({ file: rel, sev: "critical", label: "敏感文件类型" });
      continue;
    }

    if (checkBinary(file)) continue;

    let content;
    try {
      const stat = statSync(file);
      if (stat.size === 0) continue;
      content = readHead(file, Math.min(stat.size, MAX_READ_BYTES));
    } catch {
      continue;
    }
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(content)) !== null) {
        // 忽略 ${VAR} 环境变量模板(非真实凭据)
        const whole = m[0];
        if (/\$\{/.test(whole) || /\$\(/.test(whole)) continue;
        issues.push({ file: rel, sev: p.sev, label: `${p.label}${m[1] ? ` (${m[1].slice(0, 8)}…)` : ""}` });
      }
    }
  }

  const critical = issues.filter((i) => i.sev === "critical");
  const high = issues.filter((i) => i.sev === "high");

  console.log(`扫描 ${files.length} 个文件,发现 ${critical.length} 高危 / ${high.length} 中风险项`);
  for (const i of issues) {
    console.log(`  [${i.sev}] ${i.file} - ${i.label}`);
  }
  if (fix && critical.length) {
    console.log("\n处置建议:");
    console.log("  - 私钥/PFX/口令文件: 移出工作区并限制 ACL,然后轮换证书");
    console.log("  - 硬编码密钥: 若为真实凭据立即撤销,改由环境变量注入");
  }

  process.exit(critical.length ? FAIL : 0);
}

main().catch((error) => {
  console.error("✗ secret-scan 失败:", error);
  process.exit(FAIL);
});
