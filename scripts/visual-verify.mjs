import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = process.env.CODEX_NODE_MODULES
  ? require(join(process.env.CODEX_NODE_MODULES, "playwright"))
  : require("playwright");

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:4173/game/";
const executablePath = process.env.BROWSER_EXECUTABLE || undefined;
const outputDirectory = join(process.cwd(), "output", "verification");
await mkdir(outputDirectory, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function openApp(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".intro").waitFor({ state: "detached", timeout: 5000 });
}

async function dimensions(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
}

async function topbarGeometry(page) {
  return page.locator(".game-topbar").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const nav = element.querySelector(".top-navigation")?.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      navHeight: Math.round(nav?.height ?? 0),
    };
  });
}

const browser = await chromium.launch({ headless: true, executablePath });
const errors = [];
const failedResponses = [];

try {
  const desktop = await browser.newPage({ viewport: { width: 1960, height: 1272 } });
  desktop.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  desktop.on("pageerror", (error) => errors.push(error.message));
  desktop.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  await openApp(desktop);
  await desktop.locator(".command-home").waitFor();
  const sharedTopbar = await topbarGeometry(desktop);
  await desktop.screenshot({ path: join(outputDirectory, "home-1960.png"), fullPage: false });
  const homeDimensions = await dimensions(desktop);
  assert(homeDimensions.scrollWidth === 1960, `指挥室横向溢出：${JSON.stringify(homeDimensions)}`);

  await desktop.getByRole("button", { name: "图鉴收藏", exact: true }).click();
  await desktop.locator(".collection-view").waitFor();
  assert(JSON.stringify(await topbarGeometry(desktop)) === JSON.stringify(sharedTopbar), "图鉴页顶部导航尺寸发生跳动");
  const archiveCards = desktop.locator(".collection-grid > button");
  const archiveRows = await archiveCards.evaluateAll((elements) => elements.slice(0, 6).map((element) => Math.round(element.getBoundingClientRect().y)));
  assert(new Set(archiveRows.slice(0, 5)).size === 1 && archiveRows[5] > archiveRows[4], `图鉴桌面端未按每行五张排列：${archiveRows.join(",")}`);
  await desktop.screenshot({ path: join(outputDirectory, "collection-five-column.png"), fullPage: false });
  await desktop.getByRole("button", { name: "返回主页" }).click();
  await desktop.locator(".command-home").waitFor();

  for (const [label, selector] of [["整备库", ".builder-view"], ["模拟战场", ".practice-view"], ["任务挑战", ".missions-view"], ["排行榜", ".leaderboard-view"]]) {
    await desktop.getByRole("button", { name: label, exact: true }).click();
    await desktop.locator(selector).waitFor();
    assert(JSON.stringify(await topbarGeometry(desktop)) === JSON.stringify(sharedTopbar), `${label}顶部导航尺寸发生跳动`);
    if (label === "整备库") {
      const alignment = await desktop.locator(".catalog-entry").first().evaluate((entry) => {
        const card = entry.querySelector(".card")?.getBoundingClientRect();
        const cardButton = entry.querySelector(".catalog-card")?.getBoundingClientRect();
        const stepper = entry.querySelector(".catalog-stepper")?.getBoundingClientRect();
        const straySheen = entry.querySelector(".card") ? getComputedStyle(entry.querySelector(".card"), "::before").display : null;
        return { card, cardButton, stepper, straySheen };
      });
      const cardCenter = (alignment.card?.left ?? 0) + (alignment.card?.width ?? 0) / 2;
      const buttonCenter = (alignment.cardButton?.left ?? 0) + (alignment.cardButton?.width ?? 0) / 2;
      const stepperCenter = (alignment.stepper?.left ?? 0) + (alignment.stepper?.width ?? 0) / 2;
      assert(Math.abs(cardCenter - buttonCenter) <= 1 && Math.abs(cardCenter - stepperCenter) <= 1, `卡牌、光效与数量控制器未居中：${JSON.stringify(alignment)}`);
      assert(alignment.straySheen === "none", `卡牌外部仍存在错位扫光：${JSON.stringify(alignment)}`);
      await desktop.screenshot({ path: join(outputDirectory, "builder-card-polish.png"), fullPage: false });
      await desktop.locator(".catalog-card").first().hover();
      await desktop.waitForTimeout(320);
      const clipping = await desktop.locator(".catalog-entry").first().evaluate((entry) => ({
        frameOverflow: getComputedStyle(entry.querySelector(".card-frame")).overflow,
        artOverflow: getComputedStyle(entry.querySelector(".card-art")).overflow,
      }));
      assert(clipping.frameOverflow === "hidden" && clipping.artOverflow === "hidden", `卡牌扫光未被卡图裁切：${JSON.stringify(clipping)}`);
      await desktop.screenshot({ path: join(outputDirectory, "builder-card-hover.png"), fullPage: false });
    }
  }
  await desktop.getByRole("button", { name: "返回主页" }).click();
  await desktop.locator(".command-home").waitFor();

  await desktop.getByRole("button", { name: /设置/ }).last().click();
  await desktop.getByRole("heading", { name: "游戏设置" }).waitFor();
  assert(await desktop.locator(".rank-track article").count() === 6, "段位体系应展示六个等级");
  assert(await desktop.locator(".difficulty-setting [role=radio]").count() === 4, "默认 AI 应提供四个等级");
  await desktop.getByRole("radio", { name: /大神/ }).click();
  assert(await desktop.getByRole("radio", { name: /大神/ }).getAttribute("aria-checked") === "true", "大神 AI 未进入选中态");
  await desktop.getByRole("checkbox", { name: /减少动态效果/ }).check();
  assert(await desktop.locator("html").getAttribute("data-reduce-motion") !== null, "减少动态效果设置未生效");
  await desktop.getByRole("button", { name: "返回主页" }).click();
  await desktop.locator(".command-home").waitFor();

  await desktop.getByRole("button", { name: /快速交战/ }).click();
  await desktop.getByRole("heading", { name: "与 AI 对战" }).waitFor();
  assert(await desktop.locator(".ai-levels button").count() === 4, "AI 难度应提供四个等级");
  await desktop.getByRole("radio", { name: /专家/ }).click();
  assert(await desktop.getByRole("radio", { name: /专家/ }).getAttribute("aria-checked") === "true", "专家 AI 未进入选中态");
  await desktop.getByRole("button", { name: /进入对战/ }).click();
  await desktop.locator(".battle-shell").waitFor({ timeout: 7000 }).catch(async () => {
    const snapshot = await desktop.evaluate(() => ({
      hasHome: Boolean(document.querySelector(".command-home")),
      hasBattle: Boolean(document.querySelector(".battle-shell")),
      bodyText: document.body.innerText.slice(0, 300),
    }));
    throw new Error(`快速交战未进入战场：${JSON.stringify(snapshot)}；浏览器错误：${errors.join(" | ")}`);
  });
  await desktop.locator(".battle-resource-console").waitFor();
  const battleShellGeometry = await desktop.locator(".battle-shell").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), scrollY: Math.round(window.scrollY) };
  });
  assert(battleShellGeometry.x === 0 && battleShellGeometry.y === 0, `战场未锁定到视口原点：${JSON.stringify(battleShellGeometry)}`);
  const firstHandCard = desktop.locator(".hand-slot").first();
  const handLabel = await firstHandCard.getAttribute("aria-label");
  await firstHandCard.hover();
  await desktop.waitForFunction((expected) => document.querySelector(".battle-card-dossier h2")?.textContent?.trim() === expected, handLabel?.replace(/^部署/, ""));
  const dossierName = (await desktop.locator(".battle-card-dossier h2").textContent())?.trim();
  assert(handLabel === `部署${dossierName}`, `卡牌档案联动失败：${handLabel} / ${dossierName}`);
  await desktop.screenshot({ path: join(outputDirectory, "battle-1960.png"), fullPage: false });
  const battleDimensions = await dimensions(desktop);
  const battleBoxes = await desktop.evaluate(() => Object.fromEntries([".enemy-rack", ".hero-console.is-enemy", ".battle-brand", ".battle-card-dossier", ".hand-section"].map((selector) => {
    const element = document.querySelector(selector);
    const rect = element?.getBoundingClientRect();
    return [selector, { display: element ? getComputedStyle(element).display : null, children: element?.children.length ?? 0, rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null }];
  })));
  for (const selector of [".enemy-rack", ".hero-console.is-enemy", ".battle-brand"]) {
    assert(battleBoxes[selector].rect?.y >= 0, `${selector} 被裁出战场顶部：${JSON.stringify(battleBoxes[selector])}`);
  }
  assert(battleDimensions.scrollWidth === 1960, `战场横向溢出：${JSON.stringify(battleDimensions)}`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("console", (message) => { if (message.type() === "error") errors.push(`mobile: ${message.text()}`); });
  mobile.on("pageerror", (error) => errors.push(`mobile: ${error.message}`));
  await openApp(mobile);
  await mobile.getByRole("button", { name: "打开游戏设置" }).click();
  await mobile.getByRole("heading", { name: "游戏设置" }).waitFor();
  const mobileSettingsDimensions = await dimensions(mobile);
  assert(mobileSettingsDimensions.scrollWidth === 390, `游戏设置移动端横向溢出：${JSON.stringify(mobileSettingsDimensions)}`);
  await mobile.getByRole("button", { name: "返回主页" }).click();
  await mobile.locator(".command-home").waitFor();
  await mobile.getByRole("button", { name: /快速交战/ }).click();
  await mobile.getByRole("heading", { name: "与 AI 对战" }).waitFor();
  const setupDimensions = await dimensions(mobile);
  assert(setupDimensions.scrollWidth === 390, `AI 设置移动端横向溢出：${JSON.stringify(setupDimensions)}`);
  await mobile.getByRole("button", { name: /进入对战/ }).click();
  await mobile.locator(".battle-shell").waitFor();
  await mobile.screenshot({ path: join(outputDirectory, "battle-mobile.png"), fullPage: false });
  const mobileDimensions = await dimensions(mobile);
  assert(mobileDimensions.scrollWidth === 390, `移动端横向溢出：${JSON.stringify(mobileDimensions)}`);

  assert(failedResponses.length === 0, `资源请求失败：\n${failedResponses.join("\n")}`);
  assert(errors.length === 0, `浏览器错误：\n${errors.join("\n")}`);
  console.log(`视觉验收通过：指挥室、共享导航、桌面战场、移动战场；档案联动正常；尺寸 ${JSON.stringify({ homeDimensions, battleDimensions, mobileDimensions, battleShellGeometry, battleBoxes })}`);
} finally {
  await browser.close();
}
