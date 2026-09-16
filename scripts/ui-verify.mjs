import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const playwright = process.env.CODEX_NODE_MODULES
  ? require(join(process.env.CODEX_NODE_MODULES, "playwright"))
  : require("playwright");
const { chromium } = playwright;

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:4173/game/";
const outputDirectory = join(process.cwd(), "output", "verification");
await mkdir(outputDirectory, { recursive: true });
const musicManifest = JSON.parse(await readFile(join(process.cwd(), "public", "assets", "audio", "music", "manifest.json"), "utf8"));
const expectedMusic = musicManifest.active
  ? [musicManifest.tracks.lobby, musicManifest.tracks.archive, musicManifest.tracks.battle]
  : ["/assets/audio/music/lobby.ogg", "/assets/audio/music/archive.ogg", "/assets/audio/music/battle.mp3"];
const optionalMusicRoutes = musicManifest.active
  ? [
      ["整备库", musicManifest.tracks.builder],
      ["模拟战场", musicManifest.tracks.battle],
      ["任务挑战", musicManifest.tracks.missions],
      ["商城", musicManifest.tracks.shop],
      ["作战连队", musicManifest.tracks.guild],
    ].filter(([, source]) => typeof source === "string")
  : [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForApp(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".intro").waitFor({ state: "detached", timeout: 5000 });
}

async function assertNoPageOverflow(page, viewportWidth) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(dimensions.clientWidth === viewportWidth, `视口宽度异常：${JSON.stringify(dimensions)}`);
  assert(dimensions.scrollWidth <= dimensions.clientWidth, `页面存在横向溢出：${JSON.stringify(dimensions)}`);
}

async function expectCount(locator, count, label) {
  const actual = await locator.count();
  assert(actual === count, `${label}数量应为 ${count}，实际为 ${actual}`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
});
const errors = [];
const failedResponses = [];
const audioResponses = new Set();

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  desktop.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  desktop.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    if (response.url().includes("/assets/audio/")) audioResponses.add(new URL(response.url()).pathname);
  });
  await waitForApp(desktop);

  await desktop.getByRole("heading", { name: "" }).waitFor();
  await desktop.locator(".audio-control-toggle").click();
  await desktop.locator('input[aria-label="音乐音量"]').fill("0.4");
  await desktop.locator('input[aria-label="音效音量"]').fill("0.55");
  await desktop.locator('input[aria-label="角色语音音量"]').fill("0.65");
  await desktop.getByRole("button", { name: "静音", exact: true }).click();
  assert(await desktop.evaluate(() => JSON.parse(localStorage.getItem("astra-audio-settings")).muted) === true, "静音状态未保存");
  await desktop.getByRole("button", { name: "取消静音", exact: true }).click();
  const savedAudio = await desktop.evaluate(() => JSON.parse(localStorage.getItem("astra-audio-settings")));
  assert(savedAudio.muted === false && savedAudio.musicVolume === 0.4 && savedAudio.sfxVolume === 0.55 && savedAudio.voiceVolume === 0.65, "音量设置未完整保存");
  await desktop.locator(".audio-control-toggle").click();
  await desktop.getByRole("button", { name: "编年史", exact: true }).click();
  await desktop.getByRole("heading", { name: "仙侠编年史" }).waitFor();
  await expectCount(desktop.locator(".chronicle-tabs button"), 5, "阵营页签");
  await expectCount(desktop.locator(".story-timeline > li"), 12, "编年节点");
  await expectCount(desktop.locator(".story-arc-list > article"), 8, "主线篇章");
  await expectCount(desktop.locator(".character-ledger article"), 22, "人物档案");
  await expectCount(desktop.locator(".timeline-voice"), 12, "编年旁白按钮");
  await expectCount(desktop.locator(".story-arc-list header button"), 8, "篇章旁白按钮");
  await expectCount(desktop.locator(".testimony-voice"), 22, "人物证词按钮");
  await desktop.getByRole("button", { name: "播放世界序章" }).click();

  for (const faction of ["天衡", "幽冥", "天机", "铁律", "山海"]) {
    const tab = desktop.locator(".chronicle-tabs button", { hasText: faction });
    await tab.click();
    assert(await tab.getAttribute("aria-selected") === "true", `${faction} 阵营未进入选中态`);
    assert((await desktop.locator(".faction-dossier h3").textContent()).includes(faction), `${faction} 档案未显示`);
  }

  await assertNoPageOverflow(desktop, 1440);
  await desktop.screenshot({ path: join(outputDirectory, "chronicle-desktop.png"), fullPage: true });

  await desktop.getByRole("button", { name: "图鉴收藏", exact: true }).click();
  await desktop.getByRole("heading", { name: "图鉴收藏" }).waitFor();
  await expectCount(desktop.locator(".collection-grid > button"), 56, "图鉴卡牌");
  const archiveText = await desktop.locator(".archive-inspector dl").textContent();
  for (const label of ["证词归档", "当事人身份", "供述关联", "性别", "年龄", "性格", "成长经历", "活动轨迹"]) {
    assert(archiveText.includes(label), `图鉴详情缺少${label}`);
  }
  await expectCount(desktop.locator(".archive-voice-actions button"), 2, "图鉴语音按钮");
  await desktop.locator(".collection-tabs button", { hasText: "幽冥" }).click();
  await expectCount(desktop.locator(".collection-grid > button"), 11, "幽冥卡牌");
  await desktop.locator(".collection-grid > button").nth(2).click();
  assert((await desktop.locator(".archive-inspector h2").textContent()).trim() === "夜幕都统", "图鉴选中联动错误");

  for (const [label] of optionalMusicRoutes) {
    await desktop.getByRole("button", { name: label, exact: true }).click();
    await desktop.waitForTimeout(160);
  }

  await desktop.getByRole("button", { name: "返回主页" }).click();
  await desktop.getByRole("button", { name: "快速交战" }).click();
  await desktop.getByRole("heading", { name: "与 AI 对战" }).waitFor();
  await desktop.getByRole("button", { name: "进入对战" }).click();
  await desktop.locator(".battle-shell").waitFor();
  await desktop.waitForTimeout(800);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("console", (message) => { if (message.type() === "error") errors.push(`mobile console: ${message.text()}`); });
  mobile.on("pageerror", (error) => errors.push(`mobile pageerror: ${error.message}`));
  mobile.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`mobile ${response.status()} ${response.url()}`); });
  await waitForApp(mobile);
  await mobile.getByRole("button", { name: "编年史", exact: true }).evaluate((button) => button.click());
  await mobile.getByRole("heading", { name: "仙侠编年史" }).waitFor();
  await expectCount(mobile.locator(".story-timeline > li"), 12, "移动端编年节点");
  await expectCount(mobile.locator(".story-arc-list > article"), 8, "移动端主线篇章");
  await expectCount(mobile.locator(".character-ledger article"), 22, "移动端人物档案");
  await assertNoPageOverflow(mobile, 390);
  await mobile.screenshot({ path: join(outputDirectory, "chronicle-mobile.png"), fullPage: true });

  for (const path of [...expectedMusic, ...optionalMusicRoutes.map(([, source]) => source), "/assets/audio/sfx/ui-select.ogg", "/assets/audio/sfx/turn-start.wav", "/assets/audio/sfx/mana-gain.wav"]) {
    assert(audioResponses.has(path), `浏览器未成功请求音频 ${path}`);
  }
  assert(audioResponses.has("/assets/audio/voice/manifest.json"), "浏览器未成功请求角色语音资产清单");
  assert([...audioResponses].some((path) => path.includes("/assets/audio/sfx/card-draw-")), "浏览器未成功请求抽牌音效");
  assert(failedResponses.length === 0, `资源请求失败：\n${failedResponses.join("\n")}`);
  assert(errors.length === 0, `浏览器异常：\n${errors.join("\n")}`);
  console.log("界面验收通过：桌面/移动端布局、叙事配音入口、三路音量持久化、已激活循环曲、音乐音效与语音清单请求均正常");
} finally {
  await browser.close();
}
