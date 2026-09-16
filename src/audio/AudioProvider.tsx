import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { assetUrl } from "../assetUrl";
import { getSkillSound } from "./cardSounds";
import { CARD_MAP } from "../data/cards";
import { createSfxGate, DUCK_FACTOR, DUCK_MS, getSfxTier } from "./sfxBus";

export type MusicTrack = "lobby" | "archive" | "battle" | "builder" | "practice" | "missions" | "shop" | "guild";
export type MusicCue = "victory" | "defeat";
type MusicAssetId = MusicTrack | MusicCue | "battleCritical";
export type SfxName = "uiSelect" | "uiError" | "cardDraw" | "cardDeploy" | "cardReturn" | "cardSelect" | "targetLock" | "attackReady" | "attackHit" | "weaponSwing" | "weaponHitMetal" | "summonConstruct" | "spellCastArcane" | "spellImpactVoid" | "secretArm" | "secretTrigger" | "discoverOpen" | "discoverConfirm" | "statusFreeze" | "statusSilence" | "skill" | "skillRadiant" | "skillVoid" | "skillArcane" | "skillIron" | "skillWild" | "buff" | "heroHit" | "turnStart" | "turnEnd" | "manaGain" | "manaSpend" | "shield" | "shieldBreak" | "heal" | "revive" | "unitDeath" | "coreCritical" | "rareReveal" | "reward" | "guard" | "victory" | "defeat";
export type VoiceCue = "summon" | "attack" | "skill" | "death" | "victory" | "encounter"; type VoicePriority = "normal" | "important" | "major" | "terminal";

interface AudioSettings {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

interface GameAudioValue extends AudioSettings {
  setMuted: (muted: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setVoiceVolume: (volume: number) => void;
  setMusic: (track: MusicTrack) => void;
  setBattleCritical: (active: boolean) => void;
  playMusicCue: (cue: MusicCue) => void;
  playSfx: (name: SfxName) => void;
  playVoice: (assetKey: string, priority?: VoicePriority) => void;
  playCharacterVoice: (cardId: string, cue: VoiceCue, priority?: VoicePriority) => void;
  playCardSelection: (cardId: string) => void;
  playRandomCharacterSelection: (cardId: string) => void;
}

const SETTINGS_KEY = "astra-audio-settings";
const DEFAULT_SETTINGS: AudioSettings = { muted: false, musicVolume: 0.28, sfxVolume: 0.68, voiceVolume: 0.82 };
const VOICE_MANIFEST_URL = "/assets/audio/voice/manifest.json";
const MUSIC_MANIFEST_URL = "/assets/audio/music/manifest.json";
const MUSIC_FALLBACK_SOURCES: Record<MusicTrack, string[]> = {
  lobby: ["/assets/audio/music/lobby.ogg"],
  archive: ["/assets/audio/music/archive.ogg"],
  battle: ["/assets/audio/music/battle.mp3"],
  builder: ["/assets/audio/music/lobby.ogg"],
  practice: ["/assets/audio/music/battle.minimax.mp3"],
  missions: ["/assets/audio/music/lobby.ogg"],
  shop: ["/assets/audio/music/lobby.ogg"],
  guild: ["/assets/audio/music/lobby.ogg"],
};
const MUSIC_CUE_FALLBACK_SOURCES: Record<MusicCue, string[]> = {
  victory: ["/assets/audio/sfx/victory.ogg"],
  defeat: ["/assets/audio/sfx/defeat.ogg"],
};
const SFX_SOURCES: Record<SfxName, string[]> = {
  uiSelect: ["/assets/audio/sfx/ui-select.ogg"],
  uiError: ["/assets/audio/sfx/ui-error.wav"],
  cardDraw: ["/assets/audio/sfx/card-draw-1.ogg", "/assets/audio/sfx/card-draw-2.ogg", "/assets/audio/sfx/card-draw-3.ogg"],
  cardDeploy: ["/assets/audio/sfx/card-deploy-1.ogg", "/assets/audio/sfx/card-deploy-2.ogg"],
  cardReturn: ["/assets/audio/sfx/card-return.wav"],
  cardSelect: ["/assets/audio/sfx/card-select.wav"],
  targetLock: ["/assets/audio/sfx/target-lock.wav"],
  attackReady: ["/assets/audio/sfx/attack-ready-1.ogg", "/assets/audio/sfx/attack-ready-2.ogg"],
  attackHit: ["/assets/audio/sfx/attack-hit-1.ogg", "/assets/audio/sfx/attack-hit-2.ogg"],
  weaponSwing: ["/assets/audio/sfx/weapon-swing-1.wav", "/assets/audio/sfx/weapon-swing-2.wav"],
  weaponHitMetal: ["/assets/audio/sfx/weapon-hit-metal.wav"],
  summonConstruct: ["/assets/audio/sfx/summon-construct.wav"],
  spellCastArcane: ["/assets/audio/sfx/spell-cast-arcane.wav"],
  spellImpactVoid: ["/assets/audio/sfx/spell-impact-void.wav"],
  secretArm: ["/assets/audio/sfx/secret-arm.wav"],
  secretTrigger: ["/assets/audio/sfx/secret-trigger.wav"],
  discoverOpen: ["/assets/audio/sfx/discover-open.wav"],
  discoverConfirm: ["/assets/audio/sfx/discover-confirm.wav"],
  statusFreeze: ["/assets/audio/sfx/status-freeze.wav"],
  statusSilence: ["/assets/audio/sfx/status-silence.wav"],
  skill: ["/assets/audio/sfx/skill-1.ogg", "/assets/audio/sfx/skill-2.ogg"],
  skillRadiant: ["/assets/audio/sfx/skill-radiant.wav"],
  skillVoid: ["/assets/audio/sfx/skill-void.wav"],
  skillArcane: ["/assets/audio/sfx/skill-arcane.wav"],
  skillIron: ["/assets/audio/sfx/skill-iron.wav"],
  skillWild: ["/assets/audio/sfx/skill-wild.wav"],
  buff: ["/assets/audio/sfx/buff-1.ogg", "/assets/audio/sfx/buff-2.ogg"],
  heroHit: ["/assets/audio/sfx/hero-hit-1.ogg", "/assets/audio/sfx/hero-hit-2.ogg"],
  turnStart: ["/assets/audio/sfx/turn-start.wav"],
  turnEnd: ["/assets/audio/sfx/turn-end.wav"],
  manaGain: ["/assets/audio/sfx/mana-gain.wav"],
  manaSpend: ["/assets/audio/sfx/mana-spend.wav"],
  shield: ["/assets/audio/sfx/shield.wav"],
  shieldBreak: ["/assets/audio/sfx/shield-break.wav"],
  heal: ["/assets/audio/sfx/heal.wav"],
  revive: ["/assets/audio/sfx/revive.wav"],
  unitDeath: ["/assets/audio/sfx/unit-death.wav"],
  coreCritical: ["/assets/audio/sfx/core-critical.wav"],
  rareReveal: ["/assets/audio/sfx/rare-reveal.wav"],
  reward: ["/assets/audio/sfx/reward.wav"],
  guard: ["/assets/audio/sfx/guard.wav"],
  victory: ["/assets/audio/sfx/victory.ogg"],
  defeat: ["/assets/audio/sfx/defeat.ogg"],
};

const GameAudioContext = createContext<GameAudioValue | null>(null);

function loadSettings(): AudioSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AudioProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AudioSettings>(loadSettings);
  const [track, setTrack] = useState<MusicTrack>("lobby");
  const [musicSources, setMusicSources] = useState<Record<MusicTrack, string[]>>(MUSIC_FALLBACK_SOURCES);
  const [currentMusicSource, setCurrentMusicSource] = useState(MUSIC_FALLBACK_SOURCES.lobby[0]);
  const [musicCueSources, setMusicCueSources] = useState<Record<MusicCue, string[]>>(MUSIC_CUE_FALLBACK_SOURCES);
  const [criticalLayerSource, setCriticalLayerSource] = useState<string | null>(null);
  const [battleCritical, setBattleCritical] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const settingsRef = useRef(settings);
  const unlockedRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicCueRef = useRef<HTMLAudioElement | null>(null);
  const musicCueTimerRef = useRef<number | null>(null);
  const criticalLayerRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const cardSelectionRef = useRef<HTMLAudioElement | null>(null);
  const voiceAssetsRef = useRef<Record<string, string>>({});
  const fadeTimerRef = useRef<number | null>(null);
  const musicDuckTimerRef = useRef<number | null>(null);
  const sfxDuckTimerRef = useRef<number | null>(null);
  const sfxGateRef = useRef(createSfxGate());
  const voiceStartedAtRef = useRef(0);
  const voicePriorityRef = useRef<VoicePriority>("normal");
  const voiceHistoryRef = useRef(new Map<string, number>());
  const welcomePlayedRef = useRef(false);
  const musicHistoryRef = useRef(new Map<MusicTrack, string>());
  const previousMusicSourcesRef = useRef(musicSources);

  useEffect(() => {
    settingsRef.current = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (musicRef.current) musicRef.current.volume = settings.muted ? 0 : settings.musicVolume;
    if (musicCueRef.current) musicCueRef.current.volume = settings.muted ? 0 : Math.min(1, settings.musicVolume * 1.15);
    if (criticalLayerRef.current) criticalLayerRef.current.volume = settings.muted ? 0 : settings.musicVolume * 0.34;
    if (voiceRef.current) voiceRef.current.volume = settings.muted ? 0 : settings.voiceVolume;
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    void fetch(assetUrl(VOICE_MANIFEST_URL))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("voice manifest unavailable")))
      .then((manifest: { files?: Record<string, string> }) => {
        if (!cancelled) voiceAssetsRef.current = Object.fromEntries(Object.entries(manifest.files ?? {}).map(([key, source]) => [key, assetUrl(source)]));
      })
      .catch(() => {
        if (!cancelled) voiceAssetsRef.current = {};
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(assetUrl(MUSIC_MANIFEST_URL))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("music manifest unavailable")))
      .then((manifest: {
        active?: boolean;
        tracks?: Partial<Record<MusicAssetId, string>>;
        variants?: Partial<Record<MusicTrack, string[]>>;
        cueVariants?: Partial<Record<MusicCue, string[]>>;
      }) => {
        const tracks = manifest.tracks;
        if (!cancelled && manifest.active && tracks?.lobby && tracks.archive && tracks.battle) {
          setMusicSources((current) => ({
            ...current,
            ...Object.fromEntries((Object.keys(MUSIC_FALLBACK_SOURCES) as MusicTrack[])
              .filter((id) => Boolean(manifest.variants?.[id]?.some((source) => typeof source === "string" && source.length > 0) || tracks[id]))
              .map((id) => {
                const variants = manifest.variants?.[id]?.filter((source): source is string => typeof source === "string" && source.length > 0).map(assetUrl) ?? [];
                return [id, variants.length ? variants : [assetUrl(tracks[id]!)]];
              })) as Partial<Record<MusicTrack, string[]>>,
          }));
          setMusicCueSources((current) => ({
            ...current,
            ...Object.fromEntries((Object.keys(MUSIC_CUE_FALLBACK_SOURCES) as MusicCue[])
              .filter((id) => Boolean(manifest.cueVariants?.[id]?.length || tracks[id]))
              .map((id) => {
                const variants = manifest.cueVariants?.[id]?.filter((source): source is string => typeof source === "string" && source.length > 0).map(assetUrl) ?? [];
                return [id, variants.length ? variants : [assetUrl(tracks[id]!)] ];
              })) as Partial<Record<MusicCue, string[]>>,
          }));
          setCriticalLayerSource(tracks.battleCritical ? assetUrl(tracks.battleCritical) : null);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const selectMusicSource = useCallback((nextTrack: MusicTrack, candidates = musicSources[nextTrack]) => {
    const previous = musicHistoryRef.current.get(nextTrack);
    const eligible = candidates.length > 1 ? candidates.filter((source) => source !== previous) : candidates;
    const source = eligible[Math.floor(Math.random() * eligible.length)] ?? candidates[0];
    if (!source) return;
    musicHistoryRef.current.set(nextTrack, source);
    setCurrentMusicSource(source);
  }, [musicSources]);

  useEffect(() => {
    if (previousMusicSourcesRef.current === musicSources) return;
    previousMusicSourcesRef.current = musicSources;
    selectMusicSource(track);
  }, [musicSources, selectMusicSource, track]);

  const setMusicForScene = useCallback((nextTrack: MusicTrack) => {
    setTrack(nextTrack);
    selectMusicSource(nextTrack);
  }, [selectMusicSource]);

  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    setUnlocked(true);
    void musicRef.current?.play().catch(() => undefined);
  }, []);

  // SFX 音频对象池：每个音源最多 3 个复用实例，替代「每次播放 new Audio() 即弃」，
  // 高频战斗连击时显著降低对象创建与 GC 压力（音频文件由浏览器 HTTP 缓存复用）。
  const sfxPoolRef = useRef(new Map<string, HTMLAudioElement[]>());
  const sfxPoolIndexRef = useRef(new Map<string, number>());
  const acquireSfxElement = useCallback((source: string) => {
    const pool = sfxPoolRef.current.get(source) ?? [];
    sfxPoolRef.current.set(source, pool);
    const index = sfxPoolIndexRef.current.get(source) ?? 0;
    for (let attempt = 0; attempt < pool.length; attempt += 1) {
      const slot = pool[(index + attempt) % pool.length]!;
      if (slot.paused || slot.ended) {
        sfxPoolIndexRef.current.set(source, (index + attempt + 1) % pool.length);
        return slot;
      }
    }
    if (pool.length < 3) {
      const audio = new Audio(source);
      audio.preload = "auto";
      pool.push(audio);
      sfxPoolIndexRef.current.set(source, 0);
      return audio;
    }
    const recycled = pool[index % pool.length]!;
    sfxPoolIndexRef.current.set(source, (index + 1) % pool.length);
    return recycled;
  }, []);

  const playSfx = useCallback((name: SfxName) => {
    const current = settingsRef.current;
    if (!unlockedRef.current || current.muted || current.sfxVolume <= 0) return;
    if (!sfxGateRef.current.request(name)) return;
    const tier = getSfxTier(name);
    const sources = SFX_SOURCES[name];
    const audio = acquireSfxElement(sources[Math.floor(Math.random() * sources.length)]);
    audio.volume = current.sfxVolume;
    audio.playbackRate = 0.97 + Math.random() * 0.06;
    try { audio.currentTime = 0; } catch { /* 元数据未加载时忽略 */ }
    void audio.play().catch(() => undefined);
    if (tier === "major" || tier === "terminal") {
      if (sfxDuckTimerRef.current !== null) window.clearTimeout(sfxDuckTimerRef.current);
      const music = musicRef.current;
      if (music) {
        const restoreVolume = current.muted ? 0 : current.musicVolume;
        music.volume = Math.min(music.volume, restoreVolume * DUCK_FACTOR[tier]);
        sfxDuckTimerRef.current = window.setTimeout(() => {
          sfxDuckTimerRef.current = null;
          if (musicRef.current) musicRef.current.volume = settingsRef.current.muted ? 0 : settingsRef.current.musicVolume;
        }, DUCK_MS[tier]);
      }
    }
  }, []);

  const playMusicCue = useCallback((cue: MusicCue) => {
    const current = settingsRef.current;
    if (!unlockedRef.current || current.muted || current.musicVolume <= 0) return;
    musicCueRef.current?.pause();
    const candidates = musicCueSources[cue];
    const audio = new Audio(candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0]);
    audio.preload = "auto";
    audio.volume = Math.min(1, current.musicVolume * 1.15);
    musicCueRef.current = audio;
    void audio.play().catch(() => undefined);
    if (musicCueTimerRef.current !== null) window.clearTimeout(musicCueTimerRef.current);
    musicCueTimerRef.current = window.setTimeout(() => {
      musicCueTimerRef.current = null;
      if (musicCueRef.current === audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }, 18000);
  }, [musicCueSources]);

  const playVoice = useCallback((assetKey: string, priority: VoicePriority = "normal") => {
    const current = settingsRef.current;
    const source = voiceAssetsRef.current[assetKey];
    const now = performance.now();
    const priorityRank: Record<VoicePriority, number> = { normal: 1, important: 2, major: 3, terminal: 4 };
    const recentlyPlayed = voiceHistoryRef.current.get(assetKey) ?? Number.NEGATIVE_INFINITY;
    const isWithinVoiceWindow = now - voiceStartedAtRef.current < 2500;
    if (!source || !unlockedRef.current || current.muted || current.voiceVolume <= 0 || now - recentlyPlayed < 20_000) return;
    if (isWithinVoiceWindow && priorityRank[priority] <= priorityRank[voicePriorityRef.current]) return;
    voiceRef.current?.pause();
    cardSelectionRef.current?.pause();
    if (musicDuckTimerRef.current !== null) {
      window.clearTimeout(musicDuckTimerRef.current);
      musicDuckTimerRef.current = null;
      if (musicRef.current) musicRef.current.volume = current.muted ? 0 : current.musicVolume;
    }
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = current.voiceVolume;
    const finishVoice = () => {
      if (voiceRef.current !== audio) return;
      voicePriorityRef.current = "normal";
      if (musicDuckTimerRef.current !== null) window.clearTimeout(musicDuckTimerRef.current);
      musicDuckTimerRef.current = null;
      if (sfxDuckTimerRef.current === null && musicRef.current) musicRef.current.volume = settingsRef.current.muted ? 0 : settingsRef.current.musicVolume;
    };
    audio.onended = finishVoice;
    audio.onerror = finishVoice;
    voiceRef.current = audio;
    voicePriorityRef.current = priority;
    voiceStartedAtRef.current = now;
    voiceHistoryRef.current.set(assetKey, now);
    if (priorityRank[priority] >= priorityRank.important && musicRef.current) {
      if (musicDuckTimerRef.current !== null) window.clearTimeout(musicDuckTimerRef.current);
      const music = musicRef.current;
      const restoreVolume = current.muted ? 0 : current.musicVolume;
      music.volume = Math.min(music.volume, restoreVolume * (priority === "terminal" ? 0.52 : 0.68));
      musicDuckTimerRef.current = window.setTimeout(finishVoice, 60_000);
    }
    void audio.play().catch(() => undefined);
  }, []);

  const playCharacterVoice = useCallback((cardId: string, cue: VoiceCue, priority?: VoicePriority) => {
    playVoice(`character/${cardId}/${cue}`, priority);
  }, [playVoice]);

  const playCardSelection = useCallback((cardId: string) => {
    const current = settingsRef.current;
    if (!unlockedRef.current || current.muted) return;

    const prefix = `character/${cardId}/select-`;
    const selectionKeys = Object.keys(voiceAssetsRef.current).filter((key) => key.startsWith(prefix));
    const voiceSource = selectionKeys.length
      ? voiceAssetsRef.current[selectionKeys[Math.floor(Math.random() * selectionKeys.length)]]
      : voiceAssetsRef.current[`character/${cardId}/encounter`];
    const card = CARD_MAP[cardId];
    const fallbackName = card ? getSkillSound(cardId, card.type).sfx : "cardSelect";
    const fallbackSources = SFX_SOURCES[fallbackName] ?? SFX_SOURCES.cardSelect;
    const source = voiceSource ?? fallbackSources[Math.floor(Math.random() * fallbackSources.length)];
    const volume = voiceSource ? current.voiceVolume : current.sfxVolume;
    if (!source || volume <= 0) return;

    // A card switch owns one exclusive channel, so fast browsing never layers clips.
    voiceRef.current?.pause();
    voiceRef.current = null;
    voicePriorityRef.current = "normal";
    if (musicDuckTimerRef.current !== null) {
      window.clearTimeout(musicDuckTimerRef.current);
      musicDuckTimerRef.current = null;
      if (musicRef.current) musicRef.current.volume = current.musicVolume;
    }
    cardSelectionRef.current?.pause();
    if (cardSelectionRef.current) cardSelectionRef.current.currentTime = 0;

    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = volume;
    audio.onended = () => { if (cardSelectionRef.current === audio) cardSelectionRef.current = null; };
    cardSelectionRef.current = audio;
    void audio.play().catch(() => undefined);
  }, []);
  const playRandomCharacterSelection = useCallback((cardId: string) => {
    const prefix = `character/${cardId}/select-`;
    const choices = Object.keys(voiceAssetsRef.current).filter((key) => key.startsWith(prefix));
    playVoice(choices[Math.floor(Math.random() * choices.length)] ?? `character/${cardId}/encounter`);
  }, [playVoice]);

  const playRandomWelcome = useCallback(() => {
    if (welcomePlayedRef.current) return;
    const choices = Object.keys(voiceAssetsRef.current).filter((key) => key.startsWith("welcome/intro-"));
    if (!choices.length) return;
    welcomePlayedRef.current = true;
    playVoice(choices[Math.floor(Math.random() * choices.length)], "important");
  }, [playVoice]);

  useEffect(() => {
    const onFirstInteraction = () => { unlockAudio(); playRandomWelcome(); };
    const onButtonInteraction = (event: PointerEvent) => {
      unlockAudio();
      playRandomWelcome();
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-card-id]") : null;
      if (card && !card.closest(".battle-shell") && !card.closest("[data-card-selection]") && !card.closest(".catalog-card")) playCardSelection(card.dataset.cardId!);
      if (target && !target.hasAttribute("disabled") && !target.closest(".battle-shell") && !target.closest(".audio-controls") && !target.closest("[data-card-selection]")) playSfx("uiSelect");
    };
    window.addEventListener("pointerdown", onButtonInteraction, true);
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onButtonInteraction, true);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [playCardSelection, playRandomWelcome, playSfx, unlockAudio]);

  useEffect(() => {
    const next = new Audio(currentMusicSource);
    const previous = musicRef.current;
    next.loop = true;
    next.preload = "auto";
    next.volume = 0;
    musicRef.current = next;
    if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
    if (unlockedRef.current) void next.play().catch(() => undefined);
    const startedAt = performance.now();
    const previousVolume = previous?.volume ?? 0;
    fadeTimerRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 650);
      const targetVolume = settingsRef.current.muted ? 0 : settingsRef.current.musicVolume;
      next.volume = targetVolume * progress;
      if (previous) previous.volume = previousVolume * (1 - progress);
      if (progress >= 1) {
        if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        if (previous) { previous.pause(); previous.currentTime = 0; }
      }
    }, 32);
  }, [currentMusicSource]);

  useEffect(() => {
    const current = criticalLayerRef.current;
    if (!battleCritical || !criticalLayerSource || !unlockedRef.current) {
      if (current) {
        const startVolume = current.volume;
        const startedAt = performance.now();
        const fade = window.setInterval(() => {
          const progress = Math.min(1, (performance.now() - startedAt) / 320);
          current.volume = startVolume * (1 - progress);
          if (progress >= 1) {
            window.clearInterval(fade);
            current.pause();
            current.currentTime = 0;
            if (criticalLayerRef.current === current) criticalLayerRef.current = null;
          }
        }, 32);
        return () => window.clearInterval(fade);
      }
      return undefined;
    }

    const layer = current?.src.endsWith(criticalLayerSource) ? current : new Audio(criticalLayerSource);
    if (layer !== current) {
      current?.pause();
      layer.loop = true;
      layer.preload = "auto";
      layer.volume = 0;
      criticalLayerRef.current = layer;
    }
    void layer.play().catch(() => undefined);
    const startedAt = performance.now();
    const fade = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 480);
      layer.volume = (settingsRef.current.muted ? 0 : settingsRef.current.musicVolume * 0.34) * progress;
      if (progress >= 1) window.clearInterval(fade);
    }, 32);
    return () => window.clearInterval(fade);
  }, [battleCritical, criticalLayerSource, unlocked]);

  useEffect(() => {
    if (unlocked) void musicRef.current?.play().catch(() => undefined);
  }, [unlocked]);

  useEffect(() => () => {
    if (fadeTimerRef.current !== null) window.clearInterval(fadeTimerRef.current);
    if (musicDuckTimerRef.current !== null) window.clearTimeout(musicDuckTimerRef.current);
    if (sfxDuckTimerRef.current !== null) window.clearTimeout(sfxDuckTimerRef.current);
    if (musicCueTimerRef.current !== null) window.clearTimeout(musicCueTimerRef.current);
    musicRef.current?.pause();
    musicCueRef.current?.pause();
    criticalLayerRef.current?.pause();
    voiceRef.current?.pause();
    cardSelectionRef.current?.pause();
  }, []);

  const value = useMemo<GameAudioValue>(() => ({
    ...settings,
    setMuted: (muted) => setSettings((current) => ({ ...current, muted })),
    setMusicVolume: (musicVolume) => setSettings((current) => ({ ...current, musicVolume })),
    setSfxVolume: (sfxVolume) => setSettings((current) => ({ ...current, sfxVolume })),
    setVoiceVolume: (voiceVolume) => setSettings((current) => ({ ...current, voiceVolume })),
    setMusic: setMusicForScene,
    setBattleCritical,
    playMusicCue,
    playSfx,
    playVoice,
    playCharacterVoice,
    playCardSelection,
    playRandomCharacterSelection,
  }), [playCardSelection, playCharacterVoice, playMusicCue, playRandomCharacterSelection, playSfx, playVoice, setMusicForScene, settings]);

  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio() {
  const context = useContext(GameAudioContext);
  if (!context) throw new Error("useGameAudio must be used inside AudioProvider");
  return context;
}
