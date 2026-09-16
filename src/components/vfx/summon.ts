import type { Point, VfxCore } from "./types";

export function playSummon(fx: VfxCore, point: Point, color: number) {
  fx.pulse(point, color, "magicRing", 0.35, 1.35, 760, 0.82);
  fx.pulse(point, 0xffffff, "glow", 0.12, 0.72, 520, 0.6);
  fx.burst(point, { texture: "star", color, endColor: 0xffffff, count: 18, speed: [65, 210], scale: [0.035, 0.13], lifetime: [0.45, 0.85] });
}
