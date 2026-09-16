"use strict";
// 仙侠战线 · Xianxia Frontline - Electron 外链策略
// 独立 CommonJS 模块:不依赖 electron,便于被 main-logic 与单元测试共同引用。
// 安全原则:默认仅允许 https,并可配置业务域名白名单;其他协议一律拒绝。

const DEFAULT_ALLOWED_PROTOCOLS = ["https:"];

function parseAllowedHosts(raw) {
  if (Array.isArray(raw)) return raw.filter((h) => typeof h === "string" && h.trim()).map((h) => h.trim().toLowerCase());
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function hostMatches(hostname, allowedHosts) {
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => {
    const clean = allowed.replace(/^\./, "");
    return host === clean || host.endsWith("." + clean);
  });
}

function isAllowedExternalUrl(url, options = {}) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const allowedProtocols = options.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;
  if (!allowedProtocols.includes(parsed.protocol)) return false;

  const allowedHosts = parseAllowedHosts(options.allowedHosts);
  if (allowedHosts.length > 0 && !hostMatches(parsed.hostname, allowedHosts)) return false;

  return true;
}

module.exports = { isAllowedExternalUrl, parseAllowedHosts, hostMatches };
