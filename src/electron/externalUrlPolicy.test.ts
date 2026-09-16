import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isAllowedExternalUrl, parseAllowedHosts, hostMatches } = require("../../electron/external-url-policy.cjs") as {
  isAllowedExternalUrl: (url: string, options?: { allowedProtocols?: string[]; allowedHosts?: string[] | string }) => boolean;
  parseAllowedHosts: (raw: string[] | string) => string[];
  hostMatches: (hostname: string, allowedHosts: string[]) => boolean;
};

describe("electron external-url-policy", () => {
  it("拒绝非法 URL", () => {
    expect(isAllowedExternalUrl("not a url")).toBe(false);
    expect(isAllowedExternalUrl("")).toBe(false);
    expect(isAllowedExternalUrl("ftp://example.com")).toBe(false);
  });

  it("默认只允许 https,拒绝其他协议", () => {
    expect(isAllowedExternalUrl("https://example.com/")).toBe(true);
    expect(isAllowedExternalUrl("http://example.com/")).toBe(false);
    expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("可显式收窄协议白名单", () => {
    expect(isAllowedExternalUrl("http://localhost:3000/", { allowedProtocols: ["http:", "https:"] })).toBe(true);
    expect(isAllowedExternalUrl("http://localhost:3000/", { allowedProtocols: ["https:"] })).toBe(false);
  });

  it("域名白名单: 精确匹配与子域名", () => {
    expect(hostMatches("aixt.website", ["aixt.website"])).toBe(true);
    expect(hostMatches("cdn.aixt.website", ["aixt.website"])).toBe(true);
    expect(hostMatches("evil-aixt.website", ["aixt.website"])).toBe(false);
    expect(hostMatches("aixt.website.evil.com", ["aixt.website"])).toBe(false);
  });

  it("域名白名单: 拒绝白名单外主机", () => {
    const opts = { allowedHosts: ["aixt.website"] };
    expect(isAllowedExternalUrl("https://aixt.website/", opts)).toBe(true);
    expect(isAllowedExternalUrl("https://cdn.aixt.website/x", opts)).toBe(true);
    expect(isAllowedExternalUrl("https://evil.com/", opts)).toBe(false);
    expect(isAllowedExternalUrl("https://aixt.website.evil.com/", opts)).toBe(false);
  });

  it("无白名单时回退到仅协议限制", () => {
    expect(isAllowedExternalUrl("https://anything.example/", {})).toBe(true);
    expect(isAllowedExternalUrl("http://anything.example/", {})).toBe(false);
  });

  it("parseAllowedHosts: 支持逗号分隔字符串与数组,忽略空段", () => {
    expect(parseAllowedHosts("aixt.website, cdn.example.com,, ")).toEqual(["aixt.website", "cdn.example.com"]);
    expect(parseAllowedHosts(["A.COM", " b.org "])).toEqual(["a.com", "b.org"]);
    expect(parseAllowedHosts("")).toEqual([]);
    expect(parseAllowedHosts([])).toEqual([]);
  });
});
