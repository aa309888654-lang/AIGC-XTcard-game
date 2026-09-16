import { BLEND_MODES, Graphics } from "pixi.js";
import { CARD_SIGNATURES, easeOut } from "./data";
import type { TextureKey } from "./data";
import type { AttackFamily } from "../../data/presentation";
import type { Point, SkillFxKind, VfxCore } from "./types";
import { playSignatureAccent } from "./skill";

function signatureOf(cardId?: string) {
  return cardId ? CARD_SIGNATURES[cardId] : undefined;
}

function finishHit(fx: VfxCore, point: Point, kind: SkillFxKind, color: number, secondary: number, particle: TextureKey) {
  fx.screenFlash(secondary, 0.028);
  fx.shockwave(point, 0xffffff, 52, 280);
  fx.shockwave(point, secondary, 78, 460);
  fx.impact(point, kind, color);
  fx.burst(point, { texture: particle, color, endColor: secondary, count: 18, speed: [90, 280], scale: [0.022, 0.085], lifetime: [0.24, 0.62] });
}

function playMelee(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  fx.pulse(from, secondary, "glow", 0.05, 0.5, 300, 0.48);
  const sweep = fx.sprite(signature?.texture === "slash" ? "slash" : "slash", to, color);
  const size = (fx.reducedMotion ? 88 : 124) * (to.scale ?? 1);
  sweep.width = size;
  sweep.height = size;
  sweep.rotation = Math.atan2(from.y - to.y, from.x - to.x) + Math.PI / 2;
  fx.animate(fx.reducedMotion ? 110 : 230, (progress) => {
    const eased = easeOut(progress);
    sweep.alpha = Math.sin(Math.PI * Math.min(1, eased * 1.15)) * 0.95;
    const grow = 0.7 + eased * 0.55;
    sweep.scale.set(grow, grow);
  }, () => fx.remove(sweep));
  fx.shockwave(to, 0xffffff, 38, 240);
  fx.impact(to, kind, color);
  fx.burst(to, { texture: signature?.particle ?? "spark", color, endColor: secondary, count: 14, speed: [150, 420], scale: [0.02, 0.08], lifetime: [0.15, 0.4] });
}

function playDash(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  fx.pulse(from, secondary, "magicRing", 0.16, 0.95, 280, 0.82);
  const ghosts = Array.from({ length: fx.reducedMotion ? 2 : 4 }, (_, index) => {
    const ghost = fx.sprite(index % 2 ? "glow" : signature?.particle ?? "spark", from, index % 2 ? secondary : color);
    ghost.alpha = 0;
    ghost.zIndex = 5;
    return ghost;
  });
  fx.animate(fx.reducedMotion ? 130 : 340, (progress) => {
    const eased = easeOut(progress);
    const ahead = Math.min(1, eased + 0.06);
    for (const [index, ghost] of ghosts.entries()) {
      const ratio = Math.max(0, eased - (index + 1) * 0.045);
      if (ratio <= 0) {
        ghost.alpha = 0;
        continue;
      }
      ghost.position.set(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio);
      ghost.alpha = Math.sin(Math.PI * Math.min(1, ratio * 1.15)) * (0.7 - index * 0.12);
      ghost.rotation += 0.22;
    }
    if (ahead >= 1) fx.pulse({ x: to.x, y: to.y, scale: to.scale }, secondary, "magicRing", 0.2, 1.0, 200, 0.7);
  }, () => ghosts.forEach((ghost) => fx.remove(ghost)));
  fx.pulse(to, secondary, "magicRing", 0.18, 0.9, 320, 0.88);
  finishHit(fx, to, kind, color, secondary, signature?.particle ?? "smoke");
}

function playBolt(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  fx.pulse(from, secondary, "glow", 0.05, 0.45, 300, 0.5);
  if (!fx.root) return;
  const distance = Math.max(24, Math.hypot(to.x - from.x, to.y - from.y));
  const effectScale = Math.min(1.18, Math.max(0.72, ((from.scale ?? 1) + (to.scale ?? 1)) / 2));
  const boltSprite = fx.sprite(signature?.texture === "trace" ? "trace" : "star", from, color);
  boltSprite.width = boltSprite.height = 52 * effectScale;
  const trail = new Graphics();
  trail.blendMode = BLEND_MODES.ADD;
  trail.zIndex = 4;
  trail.alpha = 0;
  fx.root.addChild(trail);
  const baseScale = { x: boltSprite.scale.x, y: boltSprite.scale.y };
  fx.animate(fx.reducedMotion ? 150 : 420, (progress) => {
    const eased = easeOut(progress);
    const position = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
    const back = { x: from.x + (to.x - from.x) * Math.max(0, eased - 0.14), y: from.y + (to.y - from.y) * Math.max(0, eased - 0.14) };
    boltSprite.position.set(position.x, position.y);
    boltSprite.rotation = progress * (signature?.spin ?? 0.6);
    boltSprite.alpha = Math.sin(Math.PI * Math.min(1, progress * 1.08)) * 0.96;
    boltSprite.scale.set(baseScale.x * (0.78 + Math.sin(Math.PI * progress) * 0.34), baseScale.y * (0.78 + Math.sin(Math.PI * progress) * 0.34));
    trail.clear();
    trail.lineStyle(2.6 * effectScale, secondary, 0.5 * boltSprite.alpha).moveTo(back.x, back.y).lineTo(position.x, position.y);
    trail.alpha = boltSprite.alpha;
  }, () => {
    fx.remove(boltSprite);
    fx.remove(trail);
    finishHit(fx, to, kind, color, secondary, signature?.particle ?? "spark");
  });
}

function playArc(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  fx.lightningStrike(from, to, color);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const distance = Math.max(24, Math.hypot(to.x - from.x, to.y - from.y));
  const normalX = distance ? -(to.y - from.y) / distance : 0;
  const normalY = distance ? (to.x - from.x) / distance : 0;
  const forkTarget = { x: to.x + normalX * 46 * (to.scale ?? 1), y: to.y + normalY * 46 * (to.scale ?? 1) };
  fx.lightningStrike(mid, forkTarget, 0xffffff);
  fx.shockwave(to, secondary, 44, 300);
  fx.impact(to, kind, color);
  fx.burst(to, { texture: signature?.particle ?? "spark", color, endColor: 0xffffff, count: 16, speed: [90, 260], scale: [0.02, 0.07], lifetime: [0.18, 0.5] });
}

function playSwarm(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  const drops = fx.reducedMotion ? 2 : 4;
  const landing = Array.from({ length: drops }, (_, index) => {
    const angle = index * 2.4 + 0.6;
    return { x: to.x + Math.cos(angle) * 24 * (to.scale ?? 1), y: to.y + Math.sin(angle) * 19 * (to.scale ?? 1) };
  });
  const motes = landing.map((point, index) => {
    const sprite = fx.sprite("star", from, index % 2 ? secondary : color);
    sprite.width = sprite.height = 30 * (to.scale ?? 1);
    sprite.alpha = 0;
    sprite.zIndex = 5;
    return { sprite, point };
  });
  fx.animate(fx.reducedMotion ? 220 : 560, (progress) => {
    for (const [index, { sprite, point }] of motes.entries()) {
      const windowStart = index / motes.length;
      const windowEnd = (index + 1) / motes.length;
      const local = Math.max(0, Math.min(1, (progress - windowStart) / (windowEnd - windowStart)));
      if (local <= 0) {
        sprite.alpha = 0;
        continue;
      }
      sprite.position.set(from.x + (point.x - from.x) * easeOut(local), from.y + (point.y - from.y) * easeOut(local));
      sprite.alpha = Math.sin(Math.PI * local) * 0.55;
    }
  }, () => motes.forEach(({ sprite }) => fx.remove(sprite)));
  finishHit(fx, to, kind, color, secondary, signature?.particle ?? "star");
}

function playPulse(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId) playSignatureAccent(fx, from, cardId, color);
  fx.shockwave(from, secondary, 58, 380);
  fx.shockwave(from, color, 30, 300);
  fx.animate(fx.reducedMotion ? 60 : 150, () => {}, () => {
    fx.shockwave(to, 0xffffff, 68, 360);
    fx.shockwave(to, color, 42, 280);
    fx.impact(to, kind, color);
    fx.burst(to, { texture: signature?.particle ?? "spark", color, endColor: secondary, count: 20, speed: [60, 200], scale: [0.025, 0.09], lifetime: [0.4, 0.9] });
  });
}

export function playAttack(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string, family: AttackFamily = "beam") {
  if (family === "melee") return playMelee(fx, from, to, kind, color, cardId);
  if (family === "dash") return playDash(fx, from, to, kind, color, cardId);
  if (family === "bolt") return playBolt(fx, from, to, kind, color, cardId);
  if (family === "arc") return playArc(fx, from, to, kind, color, cardId);
  if (family === "swarm") return playSwarm(fx, from, to, kind, color, cardId);
  if (family === "pulse") return playPulse(fx, from, to, kind, color, cardId);
  return playProjectile(fx, from, to, kind, color, cardId);
}

export function playProjectile(fx: VfxCore, from: Point, to: Point, kind: SkillFxKind, color: number, cardId?: string, withSignature = true) {
  const signature = signatureOf(cardId);
  const secondary = signature?.secondary ?? 0xffffff;
  if (cardId && withSignature) playSignatureAccent(fx, from, cardId, color);
  fx.pulse(from, secondary, "glow", 0.06, 0.48, 420, 0.48);
  fx.shockwave(from, secondary, 36, 320);
  if (kind === "lightning") {
    fx.lightningStrike(from, to, color);
    fx.shockwave(to, 0xffffff, 48, 360);
    fx.burst(to, { texture: signature?.particle ?? "spark", color, endColor: secondary, count: 16, speed: [90, 280], scale: [0.018, 0.072], lifetime: [0.2, 0.5] });
    return;
  }
  if (!fx.root) return;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const effectScale = Math.min(1.18, Math.max(0.72, ((from.scale ?? 1) + (to.scale ?? 1)) / 2));
  const normalX = distance ? -(to.y - from.y) / distance : 0;
  const normalY = distance ? (to.x - from.x) / distance : 0;
  const curveDirection = (signature?.spin ?? 1) < 0 ? -1 : 1;
  const bend = Math.min(84, distance * 0.17) * curveDirection;
  const control = { x: (from.x + to.x) / 2 + normalX * bend, y: (from.y + to.y) / 2 + normalY * bend };
  const curvePoint = (progress: number) => {
    const inverse = 1 - progress;
    return {
      x: inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
      y: inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
    };
  };
  const path = new Graphics();
  path.lineStyle(22 * effectScale, secondary, 0.12).moveTo(from.x, from.y).quadraticCurveTo(control.x, control.y, to.x, to.y);
  path.lineStyle(11 * effectScale, color, 0.3).moveTo(from.x, from.y).quadraticCurveTo(control.x, control.y, to.x, to.y);
  path.lineStyle(4.2 * effectScale, color, 0.94).moveTo(from.x, from.y).quadraticCurveTo(control.x, control.y, to.x, to.y);
  path.lineStyle(1.4 * effectScale, 0xffffff, 0.92).moveTo(from.x, from.y).quadraticCurveTo(control.x, control.y, to.x, to.y);
  for (const offset of [-11, 11]) {
    path.lineStyle(2.2 * effectScale, secondary, 0.52)
      .moveTo(from.x + normalX * offset, from.y + normalY * offset)
      .quadraticCurveTo(control.x + normalX * offset * 1.65, control.y + normalY * offset * 1.65, to.x + normalX * offset, to.y + normalY * offset);
  }
  path.blendMode = BLEND_MODES.ADD;
  path.zIndex = 4;
  path.alpha = 0;
  fx.root.addChild(path);
  const defaultTexture: TextureKey = kind === "flame" ? "flame" : kind === "void" ? "twirl" : kind === "nature" || kind === "radiant" ? "star" : "flare";
  const projectileTexture = signature?.texture === "trace" ? defaultTexture : signature?.texture ?? defaultTexture;
  const projectile = fx.sprite(projectileTexture, from, color);
  const projectileSize = signature?.texture === "slash" ? 112 : kind === "flame" ? 96 : 78;
  projectile.width = projectile.height = projectileSize * effectScale;
  const baseProjectileScale = { x: projectile.scale.x, y: projectile.scale.y };
  const core = fx.sprite("glow", from, 0xffffff);
  core.width = core.height = 52 * effectScale;
  const baseCoreScale = { x: core.scale.x, y: core.scale.y };
  const halo = fx.sprite("glow", from, secondary);
  halo.width = halo.height = 132 * effectScale;
  halo.zIndex = 4;
  const baseHaloScale = { x: halo.scale.x, y: halo.scale.y };
  const echoTexture = signature?.particle ?? (kind === "void" ? "smoke" : "spark");
  const echoes = Array.from({ length: fx.reducedMotion ? 2 : 6 }, (_, index) => {
    const echo = fx.sprite(index % 2 ? "glow" : echoTexture, from, index % 2 ? secondary : color);
    echo.width = echo.height = (38 - index * 3) * effectScale;
    echo.alpha = 0;
    echo.zIndex = 5;
    return echo;
  });
  const pathNodes = Array.from({ length: fx.reducedMotion ? 3 : 9 }, (_, index) => {
    const point = curvePoint((index + 1) / (fx.reducedMotion ? 4 : 10));
    const node = fx.sprite("glow", point, index % 2 ? secondary : color);
    node.width = node.height = (index % 2 ? 17 : 24) * effectScale;
    node.alpha = 0;
    node.zIndex = 5;
    return { node, baseScale: { x: node.scale.x, y: node.scale.y } };
  });
  fx.animate(fx.reducedMotion ? 180 : 650, (progress) => {
    const eased = easeOut(progress);
    const position = curvePoint(eased);
    const nextPosition = curvePoint(Math.min(1, eased + 0.018));
    projectile.position.set(position.x, position.y);
    core.position.set(position.x, position.y);
    halo.position.set(position.x, position.y);
    projectile.rotation = Math.atan2(nextPosition.y - position.y, nextPosition.x - position.x) + (kind === "flame" || signature?.texture === "slash" ? Math.PI / 2 : progress * (signature?.spin ?? 0.6));
    projectile.alpha = Math.sin(Math.PI * Math.min(1, progress * 1.04)) * 0.96;
    const pulse = 0.76 + Math.sin(Math.PI * progress) * 0.42;
    projectile.scale.set(baseProjectileScale.x * pulse, baseProjectileScale.y * pulse);
    core.alpha = Math.sin(Math.PI * progress) * 0.96;
    core.scale.set(baseCoreScale.x * (0.68 + pulse * 0.42), baseCoreScale.y * (0.68 + pulse * 0.42));
    halo.alpha = Math.sin(Math.PI * progress) * 0.34;
    halo.scale.set(baseHaloScale.x * (0.72 + pulse * 0.3), baseHaloScale.y * (0.72 + pulse * 0.3));
    path.alpha = Math.sin(Math.PI * Math.min(1, progress * 1.22)) * 0.9;
    for (const [index, echo] of echoes.entries()) {
      const echoProgress = Math.max(0, eased - (index + 1) * 0.05);
      const echoPoint = curvePoint(echoProgress);
      echo.position.set(echoPoint.x, echoPoint.y);
      echo.alpha = progress < 0.08 ? 0 : Math.sin(Math.PI * progress) * (0.58 - index * 0.065);
      echo.rotation += 0.08 * (index % 2 ? -1 : 1);
    }
    for (const [index, { node, baseScale }] of pathNodes.entries()) {
      const wave = 0.5 + Math.sin(progress * Math.PI * 10 - index * 0.9) * 0.5;
      node.alpha = path.alpha * (0.2 + wave * 0.42);
      const nodeScale = 0.72 + wave * 0.48;
      node.scale.set(baseScale.x * nodeScale, baseScale.y * nodeScale);
    }
  }, () => {
    fx.remove(projectile);
    fx.remove(core);
    fx.remove(halo);
    fx.remove(path);
    echoes.forEach((echo) => fx.remove(echo));
    pathNodes.forEach(({ node }) => fx.remove(node));
    fx.screenFlash(secondary, 0.035);
    fx.shockwave(to, 0xffffff, 58, 300);
    fx.shockwave(to, secondary, 86, 520);
    fx.impact(to, kind, color);
    fx.burst(to, { texture: echoTexture, color, endColor: secondary, count: 18, speed: [90, 280], scale: [0.022, 0.085], lifetime: [0.24, 0.62] });
  });
}
