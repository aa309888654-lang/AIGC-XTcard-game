# Audio Asset Manifest

Unless a track is explicitly marked otherwise, the music and sound-effect assets listed below are released under Creative Commons CC0 1.0. The builder track is CC BY 3.0 and requires the credit recorded below. AI-generated voice assets under `voice/` are covered separately and are not presented as open-license source material.

## Sound Effects

- Original creator: Kenney (https://kenney.nl/)
- Repack repositories:
  - https://github.com/Boyquotes/kenney-rpg-audio-for-godot
  - https://github.com/Boyquotes/kenney-digital-audio-for-godot
- License: CC0-1.0
- Imported file groups: `card-draw-*.ogg`, `card-deploy-*.ogg`, `attack-ready-*.ogg`, `attack-hit-*.ogg`, `skill-1.ogg`, `skill-2.ogg`, `buff-*.ogg`, `hero-hit-*.ogg`, `ui-select.ogg`, `victory.ogg`, `defeat.ogg`
- Runtime usage: draw, deploy, attack windup, hit confirm, generic skill, buff, hero damage, UI confirm, victory and defeat stingers
- Changes: Files were selected and renamed for event-based game integration. Audio content was not edited.

### OpenGameArt RPG Sound Pack Import

- Original creator: artisticdude
- Source: https://opengameart.org/content/rpg-sound-pack
- License: CC0 1.0
- Downloaded archive: `rpg_sound_pack.zip`, downloaded on 2026-08-04
- Imported mappings:
  - `battle/swing.wav` -> `weapon-swing-1.wav`
  - `battle/swing2.wav` -> `weapon-swing-2.wav`
  - `battle/sword-unsheathe.wav` -> `weapon-hit-metal.wav`
  - `battle/spell.wav` -> `spell-cast-arcane.wav`
  - `battle/magic1.wav` -> `spell-impact-void.wav`
  - `interface/interface1.wav` -> `secret-arm.wav`
  - `interface/interface2.wav` -> `secret-trigger.wav`
  - `inventory/metal-ringing.wav` -> `summon-construct.wav`
- Changes: Files were selected and renamed only. The source waveform was not edited.

## Original Procedural Sound Effects

- Files: `turn-start.wav`, `turn-end.wav`, `mana-gain.wav`, `mana-spend.wav`, `ui-error.wav`, `shield.wav`, `shield-break.wav`, `heal.wav`, `revive.wav`, `unit-death.wav`, `core-critical.wav`, `rare-reveal.wav`, `reward.wav`, `card-return.wav`, `guard.wav`, `card-select.wav`, `target-lock.wav`, `skill-radiant.wav`, `skill-void.wav`, `skill-arcane.wav`, `skill-iron.wav`, `skill-wild.wav`, `status-freeze.wav`, `status-silence.wav`, `discover-open.wav`, `discover-confirm.wav`
- Generator: `scripts/generate-procedural-audio.mjs`
- License: CC0-1.0
- Runtime usage: guard, shield, revive, heal, card focus, target preview, rare reveal, faction-marked skills, mana and turn-state cues, freeze, silence, and discover open/confirm steps
- Copyright dedication: These original synthesized sounds are dedicated to the public domain under CC0 and may be used, modified, and redistributed commercially without attribution.

## Skill Routing Notes

- `src/audio/cardSounds.ts` routes skill playback from both card rarity and `src/data/presentation.ts` `soundSet` metadata.
- Priority-first skill sets use dedicated cues when available: `guard`, `shield`, `revive`, `heal`, `attackReady`, `attackHit`, `buff`, `manaGain`.
- Fallback faction identity remains enabled through the five synthesized signature cues: `skill-radiant.wav`, `skill-void.wav`, `skill-arcane.wav`, `skill-iron.wav`, `skill-wild.wav`.
- This keeps high-value combat events commercially usable without introducing untracked third-party samples.

## Music

- `music/lobby.ogg`: "Tragic ambient main menu" by HaelDB
  - Source: https://opengameart.org/content/tragic-ambient-main-menu
  - License selected: CC0
- `music/archive.ogg`: "Cold Silence" by Eponasoft
  - Source: https://opengameart.org/content/cold-silence
  - License: CC0
- `music/battle.mp3`: "Battle Theme A" by cynicmusic
  - Source: https://opengameart.org/content/battle-theme-a
  - License: CC0
- `music/builder.open.mp3`: "The Fall of Arcana" by Matthew Pablo, used for the home lobby and builder/armory
  - Source: https://opengameart.org/content/the-fall-of-arcana-epic-game-theme-music
  - License: Creative Commons Attribution 3.0 (CC BY 3.0)
  - License text: https://creativecommons.org/licenses/by/3.0/
  - Required credit: `The Fall of Arcana` by Matthew Pablo, licensed under CC BY 3.0.
- `music/lobby-new-era.open.mp3`: "The Fall of Arcana (New Era Version)" by Matthew Pablo, a lobby and builder/armory rotation
  - Source: https://opengameart.org/content/the-fall-of-arcana-new-era-version
  - License: Creative Commons Attribution 3.0 (CC BY 3.0)
  - Required credit: `The Fall of Arcana (New Era Version)` by Matthew Pablo, licensed under CC BY 3.0.
- `music/battle-heroic-demise.open.mp3`: "Heroic Demise [Updated Version]" by Matthew Pablo, a battle rotation
  - Source: https://opengameart.org/content/heroic-demise-updated-version
  - License: Creative Commons Attribution 3.0 (CC BY 3.0)
  - Required credit: `Heroic Demise [Updated Version]` by Matthew Pablo, licensed under CC BY 3.0.

The lobby, builder, and battle scenes choose from their licensed candidate pools on entry. The audio provider excludes the last selection for that scene whenever another candidate is available.

Downloaded for Xianxia Frontline on 2026-08-03. Source pages and repository licenses should remain archived with distributed project materials.

## AI-Generated Character Voices and Narration

- Provider: StepFun
- Model: `stepaudio-2.5-tts`
- Output directory: `voice/`
- Source scripts and voice direction: `scripts/stepaudio-voice-plan.mjs`
- Generation manifest: `voice/manifest.json`
- Rights note: StepFun's official TTS FAQ states that generated audio belongs to the creator. API use and distribution remain subject to the active StepFun service terms.
- Disclosure: The product and release materials should state that character voices and story narration are AI-generated.
- License note: These generated files are not third-party CC0 samples and must not be described as part of the CC0 music/SFX bundle.

## AI-Generated Background Music

- Provider: MiniMax
- Models: `music-3.0` or `music-2.6`
- Output directory: `music/`
- Activation manifest: `music/manifest.json`
- Source scripts and music direction: `scripts/minimax-music-plan.mjs`
- Rights note: Generated music is not part of the CC0 music/SFX bundle. Commercial use and distribution must follow the active MiniMax service terms.
- Disclosure: Product and release materials should identify generated background music as AI-generated.
- Runtime exception: the builder/armory track is the CC BY 3.0 OpenGameArt track listed above and must not be described as AI-generated.
