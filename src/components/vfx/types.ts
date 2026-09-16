import type { Container, Sprite } from "pixi.js";
import type { FxEvent } from "../../types";
import type { TextureKey } from "./data";

export type { TextureKey } from "./data";

export interface Props {
  events: FxEvent[];
  unitCards: ReadonlyMap<number, string>;
  highIntensityEffects: boolean;
}

export type Point = { x: number; y: number; scale?: number };
export type SkillFxKind = "lightning" | "flame" | "nature" | "shield" | "radiant" | "void" | "arcane";

export interface BurstOptions {
  texture: TextureKey;
  color: number;
  endColor?: number;
  count: number;
  lifetime?: [number, number];
  speed?: [number, number];
  scale?: [number, number];
  start?: number;
  arc?: number;
  distance?: number;
}

export interface VfxCore {
  readonly reducedMotion: boolean;
  readonly root: Container | null;
  screenFlash(color: number, alpha: number): void;
  sprite(texture: TextureKey, point: Point, color: number): Sprite;
  pulse(point: Point, color: number, texture: TextureKey, fromScale: number, toScale: number, duration: number, peakAlpha: number, rotation?: number): void;
  burst(point: Point, options: BurstOptions): void;
  shockwave(point: Point, color: number, radius?: number, duration?: number): void;
  impact(point: Point, kind: SkillFxKind, color: number): void;
  lightningStrike(from: Point, to: Point, color: number): void;
  confinePoint(point: Point): Point;
  animate(duration: number, update: (progress: number) => void, complete: () => void): void;
  remove(node: Container): void;
}
