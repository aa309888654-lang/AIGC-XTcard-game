import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const SERVERS = [
  "cloud-server.mjs",
  "authoritative-platform.mjs",
  "authoritative-match-engine.mjs",
  "social-liveops-service.mjs",
];

function runServer(server: string, env: Record<string, string>) {
  return new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [join("server", server)], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    let timedOut = false;
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, 8000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: null, stderr: stderr + String(err) });
    });
  });
}

describe("服务端生产环境 fail-fast", () => {
  it.each(SERVERS)("%s 缺少 DATABASE_URL 时拒绝启动", async (server) => {
    const { code, stderr } = await runServer(server, {});
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toContain("production");
  });

  it("缺少高熵 CLOUD_SIGNING_SECRET 时 cloud-server 拒绝启动", async () => {
    const { code, stderr } = await runServer("cloud-server.mjs", { DATABASE_URL: "postgres://x:x@localhost:1/x" });
    expect(code).not.toBe(0);
    expect(stderr.toLowerCase()).toContain("cloud_signing_secret");
  });

  it("生产模式 + 足够密钥时可在缺库阶段继续运行(不因密钥报错)", async () => {
    const secret = "a".repeat(64);
    const dbRefused = "ECONNREFUSED";
    const { code, stderr } = await runServer("cloud-server.mjs", {
      DATABASE_URL: "postgres://x:x@127.0.0.1:1/nonexistent",
      CLOUD_SIGNING_SECRET: secret,
    });
    expect(stderr.toLowerCase()).not.toContain("cloud_signing_secret");
    expect(stderr.toLowerCase()).toContain(dbRefused.toLowerCase());
  });

  it("服务端 catch 错误路径必须定义 status(修复崩溃级回归)", () => {
    const engineSrc = readFileSync(join("server", "authoritative-match-engine.mjs"), "utf8");
    const engineCatch = engineSrc.slice(engineSrc.indexOf("} catch (error)"));
    expect(engineCatch).toContain("const status =");
    expect(engineCatch.match(/return json\(response, status,/)).not.toBeNull();

    const platformSrc = readFileSync(join("server", "authoritative-platform.mjs"), "utf8");
    const platformCatch = platformSrc.slice(platformSrc.indexOf("} catch (error)"));
    expect(platformCatch).toContain("const status =");
  });

  it("入库幂等 SQL 必须显式 cast 参数类型(修复 pg 类型推断 500)", () => {
    const platformSrc = readFileSync(join("server", "authoritative-platform.mjs"), "utf8");
    const ensureEconomy = platformSrc.slice(platformSrc.indexOf("async function ensureEconomy"));
    expect(ensureEconomy).toContain("idempotency_key=$5::varchar");
    expect(ensureEconomy.match(/\$5::varchar/)).not.toBeNull();
  });
});
