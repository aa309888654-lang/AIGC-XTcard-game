import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = process.env.CODEX_NODE_MODULES
  ? require(join(process.env.CODEX_NODE_MODULES, "playwright"))
  : require("playwright");

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:4173/game/";
const executablePath = process.env.BROWSER_EXECUTABLE || undefined;
const outputDirectory = join(process.cwd(), "output", "full-visual-audit");
await mkdir(outputDirectory, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fileName(index, viewport, name) {
  return `${String(index).padStart(2, "0")}-${viewport}-${name}.png`;
}

async function openApp(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".intro").waitFor({ state: "detached", timeout: 6000 });
  if (await page.locator(".onboarding-shell").count()) {
    await page.getByRole("textbox", { name: "指挥官名" }).fill("视觉审查员");
    await page.getByRole("button", { name: "继续 →", exact: true }).click();
    await page.locator(".faction-choice-grid button").first().click();
    await page.getByRole("button", { name: "确认归属 →", exact: true }).click();
    await page.getByRole("button", { name: "立下誓约 →", exact: true }).click();
    await page.locator(".battle-shell").waitFor({ state: "visible", timeout: 7000 });
    await page.getByRole("button", { name: "全部保留" }).click();
    await page.locator(".hand-slot").first().waitFor({ state: "visible", timeout: 7000 });
    await page.getByRole("button", { name: "暂停战斗" }).click();
    await page.getByRole("button", { name: "保存并返回首页" }).click();
    await page.locator(".command-home").waitFor({ state: "visible", timeout: 7000 });
    await page.evaluate(() => localStorage.removeItem("astra-frontline-battle-save-v1"));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".intro").waitFor({ state: "detached", timeout: 6000 });
    await page.locator(".command-home").waitFor({ state: "visible", timeout: 7000 });
  }
}

async function auditPage(page, label, mainSelector, battle = false) {
  const result = await page.evaluate(({ mainSelector, battle }) => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const main = document.querySelector(mainSelector);
    const mainRect = main?.getBoundingClientRect();
    const topbar = document.querySelector(".game-topbar");
    const topbarRect = topbar && getComputedStyle(topbar).display !== "none" ? topbar.getBoundingClientRect() : null;
    const ignoredOverflowAncestor = (element) => element.closest(".top-navigation,.faction-tabs,.collection-tabs,.chronicle-tabs,.hand-area,.board-row");
    const offscreenControls = [...document.querySelectorAll("button,[role=button],input")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || rect.width < 2 || rect.height < 2 || ignoredOverflowAncestor(element)) return false;
        return rect.right < -2 || rect.left > viewportWidth + 2;
      })
      .slice(0, 8)
      .map((element) => ({ text: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 30), className: element.className }));
    const clippedHeadings = [...document.querySelectorAll("h1,h2,h3")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && rect.width > 0 && element.scrollWidth > element.clientWidth + 2;
      })
      .map((element) => element.textContent?.trim().slice(0, 50));
    return {
      viewportWidth,
      viewportHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      mainRect: mainRect ? { left: mainRect.left, top: mainRect.top, right: mainRect.right, bottom: mainRect.bottom, width: mainRect.width, height: mainRect.height } : null,
      topbarRect: topbarRect ? { left: topbarRect.left, top: topbarRect.top, right: topbarRect.right, bottom: topbarRect.bottom, width: topbarRect.width, height: topbarRect.height } : null,
      offscreenControls,
      clippedHeadings,
      mainFound: Boolean(main),
      battle,
    };
  }, { mainSelector, battle });

  assert(result.mainFound, `${label} 缺少主内容 ${mainSelector}`);
  assert(result.scrollWidth <= result.viewportWidth + 1, `${label} 存在横向溢出：${JSON.stringify(result)}`);
  assert(result.offscreenControls.length === 0, `${label} 存在视口外控件：${JSON.stringify(result.offscreenControls)}`);
  assert(result.clippedHeadings.length === 0, `${label} 标题被裁切：${JSON.stringify(result.clippedHeadings)}`);
  if (!battle && result.topbarRect && result.mainRect) {
    assert(result.mainRect.top >= result.topbarRect.bottom - 1, `${label} 主内容与顶部导航重叠：${JSON.stringify(result)}`);
    assert(result.mainRect.left >= -1 && result.mainRect.right <= result.viewportWidth + 1, `${label} 主内容越出视口：${JSON.stringify(result.mainRect)}`);
  }
  return result;
}

async function capture(page, index, viewport, name, selector, reports, options = {}) {
  await page.locator(selector).waitFor({ state: "visible", timeout: 7000 });
  await page.waitForTimeout(180);
  reports.push({ label: `${viewport}:${name}`, ...(await auditPage(page, `${viewport}:${name}`, selector, options.battle)) });
  await page.screenshot({ path: join(outputDirectory, fileName(index, viewport, name)), fullPage: options.fullPage ?? !options.battle });
}

async function auditBuilderGeometry(page) {
  const geometry = await page.locator(".catalog-entry").first().evaluate((entry) => {
    const rect = (selector) => {
      const value = entry.querySelector(selector)?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const card = entry.querySelector(".card");
    return {
      card: rect(".card"),
      cardButton: rect(".catalog-card"),
      frame: rect(".card-frame"),
      crown: rect(".card-crown"),
      cost: rect(".card-cost"),
      attack: rect(".stat-atk"),
      health: rect(".stat-hp"),
      attackGlyph: rect(".stat-atk .stat-glyph"),
      healthGlyph: rect(".stat-hp .stat-glyph"),
      crest: rect(".card-faction-crest"),
      stepper: rect(".catalog-stepper"),
      controls: [...entry.querySelectorAll(".stepper-control")].map((element) => {
        const value = element.getBoundingClientRect();
        return { width: value.width, height: value.height };
      }),
      cardOverflowSheen: card ? getComputedStyle(card, "::before").display : null,
      frameOverflow: getComputedStyle(entry.querySelector(".card-frame")).overflow,
      artOverflow: getComputedStyle(entry.querySelector(".card-art")).overflow,
    };
  });
  const center = (rect) => rect.left + rect.width / 2;
  assert(Math.abs(center(geometry.card) - center(geometry.cardButton)) <= 1, `卡牌与交互容器错位：${JSON.stringify(geometry)}`);
  assert(Math.abs(center(geometry.card) - center(geometry.crown)) <= 1, `卡牌冠饰错位：${JSON.stringify(geometry)}`);
  assert(Math.abs(center(geometry.card) - center(geometry.crest)) <= 1, `阵营宝石错位：${JSON.stringify(geometry)}`);
  assert(Math.abs(geometry.attack.bottom - geometry.health.bottom) <= 1, `攻防宝石未对齐：${JSON.stringify(geometry)}`);
  assert(geometry.attackGlyph.bottom <= geometry.card.bottom + geometry.attackGlyph.height && geometry.healthGlyph.bottom <= geometry.card.bottom + geometry.healthGlyph.height, `攻防铭记偏离卡框：${JSON.stringify(geometry)}`);
  assert(geometry.cost.top >= geometry.card.top - geometry.cost.height * .25 && geometry.cost.left >= geometry.card.left - geometry.cost.width * .25, `费用宝石偏离卡框：${JSON.stringify(geometry)}`);
  assert(Math.abs(center(geometry.card) - center(geometry.stepper)) <= 1, `卡牌数量控制器错位：${JSON.stringify(geometry)}`);
  assert(geometry.frame.left >= geometry.card.left && geometry.frame.right <= geometry.card.right, `卡图边框越出卡牌：${JSON.stringify(geometry)}`);
  assert(geometry.stepper.top >= geometry.card.bottom, `数量控制器遮挡卡牌：${JSON.stringify(geometry)}`);
  assert(geometry.controls.every((control) => control.width >= 44 && control.height >= 44), `数量按钮点击区域过小：${JSON.stringify(geometry.controls)}`);
  assert(geometry.cardOverflowSheen === "none" && geometry.frameOverflow === "hidden" && geometry.artOverflow === "hidden", `卡牌扫光裁切异常：${JSON.stringify(geometry)}`);
  return geometry;
}

async function auditCollection(page) {
  const cards = page.locator(".collection-grid > button");
  const rows = await cards.evaluateAll((elements) => elements.slice(0, 6).map((element) => Math.round(element.getBoundingClientRect().top)));
  assert(new Set(rows.slice(0, 5)).size === 1 && rows[5] > rows[4], `图鉴未按每行五张排列：${rows.join(",")}`);
  return rows;
}

async function auditBattle(page) {
  const geometry = await page.evaluate(() => Object.fromEntries([".battle-shell", ".battle-brand", ".enemy-rack", ".hero-console.is-enemy", ".battle-card-dossier", ".battle-resource-console", ".hand-section"].map((selector) => {
    const element = document.querySelector(selector);
    const rect = element?.getBoundingClientRect();
    return [selector, rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null];
  }))); 
  const hand = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".hand-slot .card")].map((card) => {
      const rect = card.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    const pause = document.querySelector(".battle-pause-trigger");
    const rect = pause?.getBoundingClientRect();
    const target = rect ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
    return {
      cards,
      pauseReceivesPointer: target === pause,
      pauseBlockedByModal: Boolean(document.querySelector(".battle-mulligan-backdrop,.battle-discover-backdrop,.battle-pause-backdrop")),
    };
  });
  assert(geometry[".battle-shell"]?.left === 0 && geometry[".battle-shell"]?.top === 0, `战场未锁定视口原点：${JSON.stringify(geometry)}`);
  for (const selector of [".battle-brand", ".enemy-rack", ".hero-console.is-enemy", ".battle-card-dossier", ".battle-resource-console"]) {
    const rect = geometry[selector];
    if (rect) assert(rect.left >= 0 && rect.top >= 0 && rect.right <= windowSize(page).width + 1, `${selector} 越出战场：${JSON.stringify(rect)}`);
  }
  assert(hand.cards.every((card) => card.left >= 0 && card.top >= 0 && card.right <= windowSize(page).width && card.bottom <= windowSize(page).height), `手牌被裁切：${JSON.stringify(hand.cards)}`);
  assert(hand.pauseBlockedByModal || hand.pauseReceivesPointer, "暂停按钮被其他元素遮挡");
  return geometry;
}

function windowSize(page) {
  return page.viewportSize();
}

async function createPage(browser, viewport, failures) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    localStorage.setItem("astra-frontline-theme", "dark");
    localStorage.setItem("astra-frontline-accent", "indigo");
    localStorage.setItem("astra-frontline-reduce-motion", "false");
    localStorage.setItem("astra-frontline-audio-muted", "true");
  });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") failures.console.push(message.text()); });
  page.on("pageerror", (error) => failures.console.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failures.responses.push(`${response.status()} ${response.url()}`); });
  return { context, page };
}

const browser = await chromium.launch({ headless: true, executablePath });
const failures = { console: [], responses: [] };
const reports = [];
const geometry = {};

try {
  const desktopSession = await createPage(browser, { width: 1960, height: 1272 }, failures);
  const desktop = desktopSession.page;
  await openApp(desktop);
  let shot = 1;
  await capture(desktop, shot++, "desktop", "home-dark", ".command-home", reports);

  await desktop.getByRole("button", { name: "切换明暗主题" }).click();
  await desktop.getByRole("button", { name: "使用鎏金色调" }).click();
  await capture(desktop, shot++, "desktop", "home-light-gold", ".command-home", reports);
  await desktop.getByRole("button", { name: "切换明暗主题" }).click();
  await desktop.getByRole("button", { name: "使用靛蓝色调" }).click();

  const desktopPages = [
    ["整备库", ".builder-view", "builder"],
    ["模拟战场", ".practice-view", "practice"],
    ["任务挑战", ".missions-view", "missions"],
    ["排行榜", ".leaderboard-view", "leaderboard"],
    ["图鉴收藏", ".collection-view", "collection"],
    ["编年史", ".chronicle-view", "chronicle"],
    ["商城", ".shop-view", "shop"],
    ["作战连队", ".guild-view", "guild"],
  ];
  for (const [nav, selector, name] of desktopPages) {
    await desktop.getByLabel("主导航").getByRole("button", { name: nav, exact: true }).click();
    await capture(desktop, shot++, "desktop", name, selector, reports);
  }

  await desktop.getByLabel("主导航").getByRole("button", { name: "指挥室", exact: true }).click();
  await desktop.locator(".command-home").waitFor();
  await desktop.locator(".side-navigation button", { hasText: "设置" }).click();
  await capture(desktop, shot++, "desktop", "settings", ".settings-view", reports);

  await desktop.getByLabel("主导航").getByRole("button", { name: "指挥室", exact: true }).click();
  await desktop.getByRole("button", { name: /快速交战/ }).click();
  await capture(desktop, shot++, "desktop", "ai-setup", ".ai-setup", reports, { fullPage: false });
  await desktop.getByRole("radio", { name: /专家/ }).click();
  await desktop.getByRole("button", { name: /进入对战/ }).click();
  await capture(desktop, shot++, "desktop", "battle", ".battle-shell", reports, { fullPage: false, battle: true });
  geometry.battle = await auditBattle(desktop);
  const playable = desktop.locator(".hand-slot.is-playable").first();
  if (await playable.count()) {
    await playable.click();
    await desktop.waitForTimeout(180);
    await capture(desktop, shot++, "desktop", "battle-summon", ".battle-shell", reports, { fullPage: false, battle: true });
  }
  await desktopSession.context.close();

  assert(failures.responses.length === 0, `资源请求失败：\n${failures.responses.join("\n")}`);
  assert(failures.console.length === 0, `浏览器控制台错误：\n${failures.console.join("\n")}`);
  await writeFile(join(outputDirectory, "audit-report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, reports, geometry, failures }, null, 2)}\n`);
  console.log(`全量视觉审计通过：${reports.length} 个页面状态，截图目录 ${outputDirectory}`);
} finally {
  await browser.close();
}
