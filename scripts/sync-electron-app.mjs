import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const distDir = join(rootDir, "dist");
const appDir = join(rootDir, "app");

if (!existsSync(distDir)) throw new Error("Electron app sync requires dist/");
rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
if (process.platform === "win32") {
  const quote = (value) => value.replaceAll("'", "''");
  const command = `Copy-Item -Path '${quote(distDir)}\\*' -Destination '${quote(appDir)}' -Recurse -Force -ErrorAction Stop`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`PowerShell copy exited with ${result.status}`);
} else {
  cpSync(distDir, appDir, { recursive: true });
}
