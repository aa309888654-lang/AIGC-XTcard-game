import { BLEND_MODES, Container, Graphics } from "pixi.js";
import { CARD_SIGNATURES, easeOut, KIND_COLORS } from "./data";
import type { CardSignature } from "./data";
import type { Point, SkillFxKind, VfxCore } from "./types";

export function playSkill(fx: VfxCore, point: Point, kind: SkillFxKind, color: number, cardId?: string) {
  if (cardId) playSignatureAccent(fx, point, cardId, color);
  if (kind === "lightning") {
    fx.screenFlash(0xa9ecff, 0.16);
    fx.lightningStrike({ x: point.x + 8, y: Math.max(28, point.y - 210), scale: point.scale }, point, color);
    fx.burst(point, { texture: "spark", color, endColor: 0xffffff, count: 30, speed: [110, 360], scale: [0.025, 0.1], lifetime: [0.22, 0.58] });
    fx.pulse(point, color, "magicRing", 0.18, 1.18, 620, 0.8);
    return;
  }
  if (kind === "flame") {
    fx.screenFlash(0xff6a42, 0.08);
    fx.pulse(point, color, "fire", 0.1, 0.8, 720, 0.72, -Math.PI / 2);
    fx.burst(point, { texture: "flame", color, endColor: 0xffd36a, count: 24, speed: [80, 250], scale: [0.035, 0.14], lifetime: [0.38, 0.78], start: 35, arc: 110 });
    return;
  }
  if (kind === "nature") {
    fx.pulse(point, color, "twirl", 0.2, 1.0, 900, 0.7, Math.PI);
    fx.pulse(point, 0xd8ffe5, "magicRing", 0.24, 0.92, 760, 0.72);
    fx.burst(point, { texture: "star", color, endColor: 0xe7ffd4, count: 20, speed: [45, 145], scale: [0.03, 0.1], lifetime: [0.65, 1.05], start: 55, arc: 70 });
    return;
  }
  if (kind === "shield") {
    fx.pulse(point, color, "twirl", 0.12, 1.12, 850, 0.76, Math.PI * 1.4);
    fx.pulse(point, 0xffffff, "magicRing", 0.25, 1.0, 680, 0.68, -Math.PI / 3);
    fx.burst(point, { texture: "flare", color, endColor: 0xffffff, count: 12, speed: [35, 120], scale: [0.025, 0.075], lifetime: [0.4, 0.76] });
    return;
  }
  if (kind === "radiant") {
    fx.screenFlash(0xffe7a0, 0.07);
    fx.pulse(point, color, "flare", 0.08, 0.85, 620, 0.78, Math.PI / 2);
    fx.pulse(point, color, "magicRing", 0.18, 1.15, 760, 0.68);
    fx.burst(point, { texture: "star", color, endColor: 0xffffff, count: 28, speed: [80, 250], scale: [0.025, 0.12], lifetime: [0.42, 0.9] });
    return;
  }
  if (kind === "void") {
    fx.screenFlash(0x6d4bb5, 0.1);
    fx.pulse(point, color, "twirl", 0.08, 1.2, 980, 0.82, Math.PI * 2.1);
    fx.pulse(point, 0xe1ceff, "magicRing", 0.2, 0.95, 760, 0.58, -Math.PI);
    fx.burst(point, { texture: "smoke", color, endColor: 0x341d5e, count: 20, speed: [35, 135], scale: [0.05, 0.18], lifetime: [0.65, 1.15] });
    return;
  }
  fx.pulse(point, color, "magicRing", 0.16, 1.08, 720, 0.72, Math.PI * 1.5);
  fx.burst(point, { texture: "spark", color, endColor: 0xffffff, count: 22, speed: [70, 230], scale: [0.025, 0.1], lifetime: [0.35, 0.75] });
}

export function playSignatureAccent(fx: VfxCore, point: Point, cardId: string, color: number) {
  const signature = CARD_SIGNATURES[cardId];
  if (!signature) return;
  playEnergySeal(fx, point, color, signature);
  const accentPoint = signature.pattern === "crown" ? fx.confinePoint({ x: point.x, y: point.y - 32, scale: point.scale }) : point;
  const pulseTexture = signature.texture === "lightning" ? "flare" : signature.texture;
  fx.pulse(accentPoint, signature.secondary, pulseTexture, 0.06, signature.pattern === "guard" ? 0.88 : 0.64, 560, 0.54, Math.PI * signature.spin);

  if (signature.pattern === "storm") {
    fx.lightningStrike(fx.confinePoint({ x: point.x - 34, y: point.y - 170, scale: point.scale }), fx.confinePoint({ x: point.x - 8, y: point.y + 4, scale: point.scale }), signature.secondary);
    fx.lightningStrike(fx.confinePoint({ x: point.x + 42, y: point.y - 145, scale: point.scale }), fx.confinePoint({ x: point.x + 18, y: point.y + 10, scale: point.scale }), color);
    return;
  }
  if (signature.pattern === "guard") {
    fx.pulse(point, color, "magicRing", 0.2, 0.82, 680, 0.5, -Math.PI * signature.spin);
    fx.burst(point, { texture: signature.particle, color, endColor: signature.secondary, count: 8, speed: [24, 78], scale: [0.018, 0.055], lifetime: [0.42, 0.68], distance: 18 });
    return;
  }
  if (signature.pattern === "dash" || signature.pattern === "slash") {
    fx.pulse(point, signature.secondary, signature.pattern === "slash" ? "slash" : signature.texture, 0.08, 0.7, 430, 0.64, Math.PI * 0.55);
    fx.burst(point, { texture: signature.particle, color, endColor: signature.secondary, count: 9, speed: [90, 240], scale: [0.018, 0.065], lifetime: [0.28, 0.55], start: signature.pattern === "slash" ? 345 : 165, arc: 30 });
    return;
  }
  if (signature.pattern === "rise") {
    fx.burst(point, { texture: signature.particle, color, endColor: signature.secondary, count: 10, speed: [38, 125], scale: [0.02, 0.075], lifetime: [0.55, 0.9], start: 58, arc: 64 });
    return;
  }
  if (signature.pattern === "vortex") {
    fx.pulse(point, signature.secondary, "twirl", 0.05, 0.82, 760, 0.62, Math.PI * signature.spin);
    fx.burst(point, { texture: signature.particle, color, endColor: 0x241638, count: 10, speed: [20, 82], scale: [0.035, 0.11], lifetime: [0.62, 1.0], distance: 24 });
    return;
  }
  if (signature.pattern === "scan") {
    fx.pulse(point, signature.secondary, "magicRing", 0.1, 0.92, 500, 0.5, -Math.PI * 0.35);
    fx.burst(point, { texture: signature.particle, color, endColor: signature.secondary, count: 7, speed: [30, 88], scale: [0.015, 0.05], lifetime: [0.42, 0.68], distance: 30 });
    return;
  }
  if (signature.pattern === "crown") {
    for (const offset of [-26, 0, 26]) fx.pulse({ x: point.x + offset, y: point.y - 30 - Math.abs(offset) * 0.25 }, signature.secondary, "star", 0.03, 0.22, 620, 0.62, Math.PI / 2);
    return;
  }
  const isSpiral = signature.pattern === "spiral";
  fx.burst(point, { texture: signature.particle, color, endColor: signature.secondary, count: 9, speed: isSpiral ? [28, 92] : [55, 145], scale: [0.018, 0.065], lifetime: [0.45, 0.78], distance: isSpiral ? 28 : 0 });
}

export function playEnergySeal(fx: VfxCore, point: Point, color: number, signature: CardSignature) {
  if (!fx.root) return;
  const scale = point.scale ?? 1;
  const layer = new Container();
  const outer = new Graphics();
  const inner = new Graphics();
  const spokes = new Graphics();
  const segmentCount = signature.pattern === "crown" ? 10 : signature.pattern === "storm" ? 8 : signature.pattern === "guard" ? 6 : signature.pattern === "vortex" ? 5 : 4;
  outer.lineStyle(1.5, signature.secondary, 0.88).drawCircle(0, 0, 48 * scale);
  outer.lineStyle(1, color, 0.42).drawCircle(0, 0, 41 * scale);
  inner.lineStyle(1.25, 0xffffff, 0.68).drawCircle(0, 0, 20 * scale);
  outer.blendMode = BLEND_MODES.ADD;
  inner.blendMode = BLEND_MODES.ADD;
  spokes.blendMode = BLEND_MODES.ADD;
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = index / segmentCount * Math.PI * 2;
    const innerRadius = (index % 2 ? 25 : 29) * scale;
    const outerRadius = 42 * scale;
    spokes.lineStyle(index % 2 ? 1 : 1.7, index % 2 ? color : signature.secondary, index % 2 ? 0.42 : 0.72);
    spokes.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    spokes.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
  }
  layer.addChild(outer, inner, spokes);
  layer.position.set(point.x, point.y);
  layer.alpha = 0;
  layer.zIndex = 3;
  fx.root.addChild(layer);
  const rotation = Math.PI * (signature.spin || 0.5);
  fx.animate(fx.reducedMotion ? 180 : 760, (progress) => {
    layer.alpha = Math.sin(Math.PI * progress) * 0.78;
    layer.scale.set(0.5 + easeOut(progress) * 0.72);
    outer.rotation = rotation * progress;
    inner.rotation = -rotation * 0.7 * progress;
    spokes.rotation = rotation * 0.34 * progress;
  }, () => fx.remove(layer));
}

export function playBuff(fx: VfxCore, point: Point, kind: SkillFxKind, color: number) {
  const resolvedColor = kind === "nature" ? KIND_COLORS.nature : kind === "radiant" ? KIND_COLORS.radiant : color;
  fx.pulse(point, resolvedColor, kind === "shield" ? "twirl" : "glow", 0.08, 0.72, 620, 0.58);
  fx.burst(point, { texture: kind === "nature" || kind === "radiant" ? "star" : "flare", color: resolvedColor, endColor: 0xffffff, count: 12, speed: [35, 115], scale: [0.02, 0.07], lifetime: [0.45, 0.78], start: 55, arc: 70 });
}
