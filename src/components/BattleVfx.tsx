import { useEffect, useRef } from "react";
import { AdvancedBloomFilter } from "@pixi/filter-advanced-bloom";
import { Emitter, type EmitterConfigV3 } from "@pixi/particle-emitter";
import { Application, Assets, BLEND_MODES, Container, Graphics, Sprite, Texture } from "pixi.js";
import { CARD_MAP } from "../data/cards";
import type { FxEvent } from "../types";
import { VFX_TEXTURES, KIND_COLORS, colorString, easeOut, skillKind, parseColor } from "./vfx/data";
import type { Props, Point, SkillFxKind, TextureKey, BurstOptions, VfxCore } from "./vfx/types";
import { playSummon } from "./vfx/summon";
import { playSkill, playBuff } from "./vfx/skill";
import { playAttack, playProjectile } from "./vfx/attack";
import { getAttackProfile } from "../data/presentation";

class BattleVfxRenderer implements VfxCore {
  private app: Application<HTMLCanvasElement> | null = null;
  root: Container | null = null;
  private destroyed = false;
  readonly reducedMotion: boolean;
  // 低配设备（核心数少）直接用轻量 Bloom 参数，运行时 FPS 再兜底关闭。
  private readonly lowPerformance = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4;
  private readonly animations = new Set<() => void>();
  private readonly timers = new Set<number>();
  // 持久锚点缓存：init 时填充，为迟到的/已阵亡单位提供兜底坐标。
  private readonly unitAnchors = new Map<number, Point>();
  // 每批特效的锚点快照：一次 querySelectorAll + 单次 host rect 读取批量测量，
  // 替代旧版每个事件单独 querySelector + getBoundingClientRect 的强制同步布局。
  private readonly anchorSnapshot = new Map<string, Point>();
  private readonly spritePool: Sprite[] = [];
  private readonly cacheAnchors = () => {
    const scope = this.host.parentElement;
    if (!scope) return;
    const hostBounds = this.host.getBoundingClientRect();
    for (const element of scope.querySelectorAll<HTMLElement>("[data-unit-uid]")) {
      const uid = Number(element.dataset.unitUid);
      if (!Number.isFinite(uid)) continue;
      const point = this.pointFromBounds(element.getBoundingClientRect(), hostBounds, 0.46);
      if (point) this.unitAnchors.set(uid, point);
    }
  };

  constructor(private readonly host: HTMLDivElement, highIntensityEffects: boolean) {
    this.reducedMotion = !highIntensityEffects || document.documentElement.hasAttribute("data-reduce-motion") || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async init() {
    const app = new Application<HTMLCanvasElement>({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.75),
      powerPreference: "high-performance",
    });
    app.view.className = "battle-vfx-canvas";
    this.host.appendChild(app.view);
    const root = new Container();
    root.sortableChildren = true;
    if (!this.reducedMotion) {
      root.filters = [this.lowPerformance
        ? new AdvancedBloomFilter({ threshold: 0.5, bloomScale: 0.55, brightness: 0.96, blur: 3, quality: 1 })
        : new AdvancedBloomFilter({ threshold: 0.42, bloomScale: 0.82, brightness: 0.96, blur: 4, quality: 2 })];
      root.filterArea = app.screen;
    }
    app.stage.addChild(root);
    this.app = app;
    this.root = root;
    this.cacheAnchors();
    this.startFpsWatchdog();
    await Assets.load(Object.values(VFX_TEXTURES));
  }

  // 持续低帧率（约 3 秒 <42fps）时移除全屏 Bloom，把 GPU 让给主战场渲染。
  private startFpsWatchdog() {
    if (this.reducedMotion || !this.app) return;
    const ticker = this.app.ticker;
    let lowFrames = 0;
    let last = performance.now();
    const check = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      if (delta > 1000 / 42) lowFrames += 1;
      else lowFrames = Math.max(0, lowFrames - 1);
      if (lowFrames >= 120) {
        if (this.root?.filters?.length) this.root.filters = [];
        ticker.remove(check);
      }
    };
    ticker.add(check);
  }

  destroy() {
    this.destroyed = true;
    for (const stop of this.animations) stop();
    this.animations.clear();
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.unitAnchors.clear();
    this.anchorSnapshot.clear();
    this.spritePool.length = 0;
    this.app?.destroy(true, { children: true, texture: false, baseTexture: false });
    this.app = null;
    this.root = null;
  }

  playEvents(events: FxEvent[], unitCards: ReadonlyMap<number, string>) {
    if (!this.app || !this.root || this.destroyed) return;
    this.snapshotAnchors();
    for (const event of events) {
      const cardId = event.uid === undefined ? undefined : unitCards.get(event.uid);
      const kind = skillKind(event.label, cardId);
      const cardColor = parseColor(cardId ? CARD_MAP[cardId]?.color : undefined, KIND_COLORS[kind]);
      const color = kind === "lightning" ? KIND_COLORS.lightning : cardColor;

      if (event.type === "summon" && event.uid !== undefined) {
        playSummon(this, this.unitPoint(event.uid) ?? this.sidePoint(event.side), color);
      } else if (event.type === "attack" && event.uid !== undefined) {
        const source = this.unitPoint(event.uid);
        const damage = events.find((candidate) => candidate.id > event.id && candidate.type === "damage" && candidate.uid === event.uid);
        const target = damage ? this.damagePoint(damage) : null;
        if (source && target) playAttack(this, source, target, kind, color, cardId, cardId ? getAttackProfile(cardId).family : "beam");
      } else if (event.type === "skill") {
        const source = event.uid === undefined ? this.sidePoint(event.side) : this.unitPoint(event.uid) ?? this.sidePoint(event.side);
        playSkill(this, source, kind, color, cardId);
        const nextSkillId = events.find((candidate) => candidate.id > event.id && candidate.type === "skill")?.id ?? Number.POSITIVE_INFINITY;
        const targets = events.filter((candidate) => candidate.id > event.id && candidate.id < nextSkillId && ((candidate.type === "damage" && candidate.uid === event.uid) || (candidate.type === "buff" && candidate.side === event.side)));
        targets.slice(0, 6).forEach((targetEvent, index) => {
          const target = targetEvent.type === "damage" ? this.damagePoint(targetEvent) : targetEvent.uid === undefined ? this.heroPoint(targetEvent.side) : this.unitPoint(targetEvent.uid);
          if (target && Math.hypot(target.x - source.x, target.y - source.y) > 24) {
            const delay = Math.min(360, index * 90);
            if (index === 0) {
              this.schedule(delay, () => playProjectile(this, source, target, kind, color, cardId, false));
            } else if (index < 3) {
              this.schedule(delay, () => playAttack(this, source, target, kind, color, cardId, "bolt"));
            } else {
              this.schedule(delay, () => this.impact(target, kind, color));
            }
          }
        });
      } else if (event.type === "damage") {
        const point = this.damagePoint(event);
        if (point) this.impact(point, kind, color);
      } else if (event.type === "buff") {
        const point = event.uid === undefined ? this.heroPoint(event.side) : this.unitPoint(event.uid);
        const sourceSkill = [...events].reverse().find((candidate) => candidate.id < event.id && candidate.type === "skill" && candidate.side === event.side);
        if (point) playBuff(this, point, skillKind(sourceSkill?.label, cardId), color);
      } else if (event.type === "win") {
        const winnerKind: SkillFxKind = event.side === "player" ? "radiant" : "void";
        playSkill(this, this.heroPoint(event.side) ?? this.sidePoint(event.side), winnerKind, KIND_COLORS[winnerKind]);
      }
    }
  }

  private snapshotAnchors() {
    this.anchorSnapshot.clear();
    const scope = this.host.parentElement;
    if (!scope) return;
    const hostBounds = this.host.getBoundingClientRect();
    for (const element of scope.querySelectorAll<HTMLElement>("[data-unit-uid], [data-hero-side]")) {
      const uid = element.dataset.unitUid;
      const side = element.dataset.heroSide;
      if (uid !== undefined) {
        const parsedUid = Number(uid);
        if (!Number.isFinite(parsedUid)) continue;
        const point = this.pointFromBounds(element.getBoundingClientRect(), hostBounds, 0.46);
        if (point) {
          this.anchorSnapshot.set(`u${parsedUid}`, point);
          this.unitAnchors.set(parsedUid, point);
        }
      } else if (side) {
        const point = this.pointFromBounds(element.getBoundingClientRect(), hostBounds, 0.52);
        if (point) this.anchorSnapshot.set(`h${side}`, point);
      }
    }
  }

  private pointFromBounds(bounds: DOMRect, hostBounds: DOMRect, verticalRatio: number): Point | null {
    if (!bounds.width || !bounds.height) return null;
    return this.confinePoint({
      x: bounds.left - hostBounds.left + bounds.width / 2,
      y: bounds.top - hostBounds.top + bounds.height * verticalRatio,
      scale: Math.min(1.18, Math.max(0.72, bounds.width / 140)),
    });
  }

  private unitPoint(uid: number) {
    return this.anchorSnapshot.get(`u${uid}`) ?? this.unitAnchors.get(uid) ?? null;
  }

  private heroPoint(side: FxEvent["side"]) {
    return this.anchorSnapshot.get(`h${side}`) ?? null;
  }

  confinePoint(point: Point): Point {
    const width = this.app?.screen.width ?? this.host.clientWidth;
    const height = this.app?.screen.height ?? this.host.clientHeight;
    return { ...point, x: Math.min(width - 28, Math.max(28, point.x)), y: Math.min(height - 28, Math.max(28, point.y)) };
  }

  private sidePoint(side: FxEvent["side"]): Point {
    const screen = this.app?.screen;
    const width = screen?.width ?? this.host.clientWidth;
    const height = screen?.height ?? this.host.clientHeight;
    return this.confinePoint({ x: width * 0.52, y: height * (side === "enemy" ? 0.29 : 0.69), scale: Math.min(1.16, Math.max(0.82, width / 1440)) });
  }

  private damagePoint(event: FxEvent) {
    if (event.targetUid !== undefined) return this.unitPoint(event.targetUid);
    return this.heroPoint(event.side) ?? this.sidePoint(event.side);
  }

  pulse(point: Point, color: number, texture: TextureKey, fromScale: number, toScale: number, duration: number, peakAlpha: number, rotation = Math.PI) {
    const sprite = this.sprite(texture, point, color);
    const viewportFactor = Math.min(1, Math.max(0.58, this.host.clientWidth / 900));
    const scaleFactor = 0.44 * viewportFactor * (point.scale ?? 1);
    sprite.scale.set(fromScale * scaleFactor);
    sprite.alpha = 0;
    const startRotation = -rotation * 0.35;
    this.animate(this.reducedMotion ? Math.min(duration, 180) : duration, (progress) => {
      sprite.alpha = Math.sin(Math.PI * progress) * peakAlpha * 0.84;
      sprite.scale.set((fromScale + (toScale - fromScale) * easeOut(progress)) * scaleFactor);
      sprite.rotation = startRotation + rotation * progress;
    }, () => this.remove(sprite));
  }

  burst(point: Point, options: BurstOptions) {
    if (!this.root) return;
    const count = this.reducedMotion ? Math.min(5, options.count) : options.count;
    const viewportFactor = Math.min(1, Math.max(0.58, this.host.clientWidth / 900));
    const scaleFactor = 0.62 * viewportFactor * (point.scale ?? 1);
    const layer = new Container();
    layer.zIndex = 4;
    this.root.addChild(layer);
    const config: EmitterConfigV3 = {
      lifetime: { min: options.lifetime?.[0] ?? 0.35, max: options.lifetime?.[1] ?? 0.72 },
      frequency: 0.001,
      emitterLifetime: 0.012,
      particlesPerWave: count,
      maxParticles: count,
      pos: point,
      emit: false,
      autoUpdate: true,
      behaviors: [
        { type: "alpha", config: { alpha: { list: [{ value: 0, time: 0 }, { value: 0.92, time: 0.08 }, { value: 0, time: 1 }] } } },
        { type: "scale", config: { scale: { list: [{ value: (options.scale?.[1] ?? 0.1) * scaleFactor, time: 0 }, { value: (options.scale?.[0] ?? 0.025) * scaleFactor, time: 1 }] }, minMult: 0.72 } },
        { type: "color", config: { color: { list: [{ value: colorString(options.color), time: 0 }, { value: colorString(options.endColor ?? options.color), time: 1 }] } } },
        { type: "moveSpeed", config: { speed: { list: [{ value: options.speed?.[1] ?? 220, time: 0 }, { value: options.speed?.[0] ?? 55, time: 1 }] }, minMult: 0.68 } },
        { type: "rotation", config: { minStart: 0, maxStart: 360, minSpeed: -170, maxSpeed: 170, accel: 0 } },
        { type: "textureSingle", config: { texture: Texture.from(VFX_TEXTURES[options.texture]) } },
        { type: "spawnBurst", config: { spacing: count > 1 ? (options.arc ?? 360) / (count - 1) : 0, start: options.start ?? Math.random() * 360, distance: options.distance ?? 0 } },
      ],
    };
    const emitter = new Emitter(layer, config);
    emitter.playOnce(() => {
      emitter.destroy();
      this.remove(layer);
    });
  }

  screenFlash(color: number, alpha: number) {
    if (!this.app || !this.root || this.reducedMotion) return;
    const flash = new Graphics();
    flash.beginFill(color, 1).drawRect(0, 0, this.app.screen.width, this.app.screen.height).endFill();
    flash.blendMode = BLEND_MODES.ADD;
    flash.alpha = 0;
    flash.zIndex = 1;
    this.root.addChild(flash);
    this.animate(360, (progress) => {
      flash.alpha = Math.sin(Math.PI * progress) * alpha;
    }, () => this.remove(flash));
  }

  sprite(texture: TextureKey, point: Point, color: number) {
    // Sprite 短生命周期高频创建/销毁（连击时每秒数十个）→ 对象池复用，降低 GC 峰值。
    const sprite = this.spritePool.pop() ?? new Sprite();
    sprite.texture = Texture.from(VFX_TEXTURES[texture]);
    sprite.anchor.set(0.5);
    sprite.position.set(point.x, point.y);
    sprite.tint = color;
    sprite.blendMode = BLEND_MODES.ADD;
    sprite.zIndex = 6;
    sprite.alpha = 1;
    sprite.rotation = 0;
    sprite.scale.set(1);
    this.root?.addChild(sprite);
    return sprite;
  }

  shockwave(point: Point, color: number, radius = 54, duration = 420) {
    if (!this.root) return;
    const ring = new Graphics();
    ring.position.set(point.x, point.y);
    ring.blendMode = BLEND_MODES.ADD;
    ring.zIndex = 5;
    this.root.addChild(ring);
    this.animate(this.reducedMotion ? 140 : duration, (progress) => {
      ring.clear();
      ring.lineStyle(Math.max(0.7, 2.8 * (1 - progress)), color, (1 - progress) * 0.82);
      ring.drawCircle(0, 0, (8 + easeOut(progress) * radius) * (point.scale ?? 1));
    }, () => this.remove(ring));
  }

  impact(point: Point, kind: SkillFxKind, color: number) {
    const impactColor = kind === "flame" ? 0xff6548 : color;
    this.pulse(point, 0xffffff, "flare", 0.05, 0.52, 340, 0.86, Math.PI / 2);
    this.pulse(point, impactColor, kind === "shield" ? "twirl" : "slash", 0.1, 0.68, 440, 0.7, Math.PI / 3);
    this.burst(point, { texture: "spark", color: impactColor, endColor: 0xffffff, count: 18, speed: [130, 390], scale: [0.018, 0.07], lifetime: [0.18, 0.46] });
    if (kind === "flame") this.burst(point, { texture: "smoke", color: 0x945146, endColor: 0x251d22, count: 8, speed: [25, 85], scale: [0.04, 0.13], lifetime: [0.55, 0.95], start: 45, arc: 90 });
  }

  lightningStrike(from: Point, to: Point, color: number) {
    if (!this.root) return;
    const distance = Math.max(32, Math.hypot(to.x - from.x, to.y - from.y));
    const effectScale = Math.min(1.18, Math.max(0.72, (from.scale ?? to.scale ?? 1)));
    const normalX = -(to.y - from.y) / distance;
    const normalY = (to.x - from.x) / distance;
    const segmentCount = this.reducedMotion ? 7 : Math.min(16, Math.max(10, Math.round(distance / 34)));
    const arcs = Array.from({ length: this.reducedMotion ? 1 : 3 }, (_, index) => {
      const arc = new Graphics();
      arc.blendMode = BLEND_MODES.ADD;
      arc.zIndex = 7 - index;
      this.root?.addChild(arc);
      return arc;
    });
    this.animate(this.reducedMotion ? 150 : 540, (progress) => {
      const fade = (1 - progress) * (0.72 + Math.sin(progress * Math.PI * 13) * 0.28);
      for (const [arcIndex, arc] of arcs.entries()) {
        const points = Array.from({ length: segmentCount + 1 }, (_, segment) => {
          const ratio = segment / segmentCount;
          const envelope = Math.sin(Math.PI * ratio);
          const noise = Math.sin(segment * 12.73 + arcIndex * 4.91 + progress * (37 + arcIndex * 11));
          const branchOffset = (arcIndex - 1) * 6 * effectScale * envelope;
          const jitter = noise * (10 + arcIndex * 3) * effectScale * envelope;
          return {
            x: from.x + (to.x - from.x) * ratio + normalX * (jitter + branchOffset),
            y: from.y + (to.y - from.y) * ratio + normalY * (jitter + branchOffset),
          };
        });
        const trace = (width: number, traceColor: number, alpha: number) => {
          arc.lineStyle(width * effectScale, traceColor, alpha);
          arc.moveTo(points[0].x, points[0].y);
          for (const point of points.slice(1)) arc.lineTo(point.x, point.y);
        };
        arc.clear();
        trace(arcIndex === 0 ? 14 : 8, color, fade * (arcIndex === 0 ? 0.16 : 0.1));
        trace(arcIndex === 0 ? 4.8 : 2.4, arcIndex === 0 ? 0xffffff : color, fade * (arcIndex === 0 ? 0.98 : 0.62));
        if (arcIndex === 0) trace(1.35, 0xdff9ff, fade);
      }
    }, () => arcs.forEach((arc) => this.remove(arc)));
  }

  private schedule(delay: number, callback: () => void) {
    if (this.reducedMotion || delay <= 0) {
      callback();
      return;
    }
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (!this.destroyed) callback();
    }, delay);
    this.timers.add(timer);
  }

  animate(duration: number, update: (progress: number) => void, complete: () => void) {
    if (!this.app) return;
    const ticker = this.app.ticker;
    const started = performance.now();
    let stopped = false;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      update(progress);
      if (progress >= 1) stop(true);
    };
    const stop = (finish = false) => {
      if (stopped) return;
      stopped = true;
      ticker.remove(tick);
      this.animations.delete(cancel);
      if (finish) complete();
    };
    const cancel = () => stop(false);
    this.animations.add(cancel);
    ticker.add(tick);
    tick();
  }

  remove(node: Container) {
    if (node.destroyed) return;
    node.parent?.removeChild(node);
    // Sprite 回池复用；其余（Graphics/Container/Emitter 层）正常销毁。
    if (node instanceof Sprite && this.spritePool.length < 64) {
      this.spritePool.push(node);
      return;
    }
    node.destroy({ children: true });
  }
}

export default function BattleVfx({ events, unitCards, highIntensityEffects }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BattleVfxRenderer | null>(null);
  const eventsRef = useRef(events);
  const unitCardsRef = useRef(unitCards);
  const lastPlayedId = useRef(0);
  eventsRef.current = events;
  unitCardsRef.current = unitCards;

  const playFresh = (renderer: BattleVfxRenderer) => {
    const fresh = eventsRef.current.filter((event) => event.id > lastPlayedId.current);
    if (!fresh.length) return;
    lastPlayedId.current = fresh[fresh.length - 1].id;
    renderer.playEvents(fresh, unitCardsRef.current);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new BattleVfxRenderer(host, highIntensityEffects);
    let active = true;
    void renderer.init().then(() => {
      if (!active) {
        renderer.destroy();
        return;
      }
      rendererRef.current = renderer;
      playFresh(renderer);
    }).catch(() => {
      // 贴图加载失败（离线/404）时优雅降级：销毁渲染器，战斗继续无特效运行。
      if (active) rendererRef.current = null;
      renderer.destroy();
    });
    return () => {
      active = false;
      if (rendererRef.current === renderer) rendererRef.current = null;
      renderer.destroy();
    };
  }, [highIntensityEffects]);

  useEffect(() => {
    if (rendererRef.current) playFresh(rendererRef.current);
  }, [events]);

  return <div className="battle-vfx-layer" ref={hostRef} aria-hidden="true" />;
}
