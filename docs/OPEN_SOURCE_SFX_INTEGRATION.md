# Open-source Commercial SFX Candidates and Integration Plan

This document defines approved discovery sources, license gates, and a repeatable import workflow for Xianxia Frontline sound effects. It is intentionally conservative: a file is not added to the shipped game until its source URL, author, license, and target gameplay event are recorded.

## License Gate

| Status | License | Commercial distribution | Attribution | Project rule |
| --- | --- | --- | --- | --- |
| Preferred | CC0 1.0 | Allowed | Not required | Import after provenance is recorded |
| Allowed | CC BY 3.0 / 4.0 | Allowed | Required | Import only with release-credit entry |
| Review | Custom commercial-friendly license | Depends on exact text | Depends | Add only after manual legal review |
| Blocked | CC BY-NC, non-commercial, unclear, missing license | Not allowed | N/A | Never import |

Do not treat a GitHub repository, Discord attachment, forum post, or a file marked only as "free" as a commercial-use license. The actual asset license must be available in the upstream repository, download page, or included archive.

## Candidate Sources

| Priority | Source | License posture | Best use in Xianxia Frontline | Notes |
| --- | --- | --- | --- | --- |
| P0 | [Kenney Audio Assets](https://kenney.nl/assets/category:Audio) | Kenney packs are commonly CC0; verify the downloaded pack license | UI, card handling, impact, digital and fantasy utility layers | Already used by this project through the `kenney-rpg-audio-for-godot` and `kenney-digital-audio-for-godot` repacks |
| P0 | [OpenGameArt RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) by artisticdude | CC0 | Sword clash, swoosh, spell, coin, metal, UI and creature effects | 95 WAV files intended for RPG usage; strongest immediate candidate for melee, weapon and encounter layers |
| P0 | [OpenGameArt 512 Sound Effects](https://opengameart.org/content/512-sound-effects-8-bit-style) by SubspaceAudio | CC0 | Discover, reward, small UI confirmations, alternate card draw and tactical notifications | Use sparingly as a stylized accent; it should not replace the game's cinematic primary combat layer |
| P1 | [Freesound](https://freesound.org/) | Per-file CC0, CC BY, or CC BY-NC | Foley, elemental texture, ambience, one-shot accents | Search only with a CC0 or CC BY license filter. Record each individual sound page, author, license and download date. Never import CC BY-NC. |
| P1 | [Bfxr](https://www.bfxr.net/) | Open-source generator; verify the current repository license before tool redistribution | Short UI, arpeggio, confirmation, alert and retro tactical stingers | Prefer generating project-owned exports rather than shipping third-party one-shots. Keep `.bfxr` presets under version control. |
| P2 | GitHub repositories with an explicit `LICENSE` file | Repository-specific | Narrow gaps after P0/P1 sources are exhausted | Treat GitHub as a discovery channel, not a license category. Archive the upstream license next to the imported files. |
| P2 | Discord creator communities | Attachment-specific | Commission leads or creator-provided packs | Do not import from Discord unless the creator posts an explicit commercial license and a durable source URL. Keep the written permission in `docs/licenses/`. |

## First Import Batch

The current game already has core UI, skill, heal, revive, shield, attack, defeat, and victory sounds. The next batch should improve differentiation, not add volume indiscriminately.

| Target file | Event | Source preference | Playback role | Acceptance rule |
| --- | --- | --- | --- | --- |
| `weapon-swing-1.ogg` / `weapon-swing-2.ogg` | Weapon attack windup | OpenGameArt RPG Sound Pack | Replace generic `attackReady` for equipped weapons | Two distinct samples; each under 700 ms |
| `weapon-hit-metal.ogg` | Weapon hits unit | OpenGameArt RPG Sound Pack | Layer after `attackHit` for steel weapons | Must remain intelligible with hero-hit audio |
| `spell-cast-arcane.ogg` | Arcane spell cast | Kenney or generated CC0 | Short pre-cast layer for `spell-*` effects | Under 500 ms; no sustained melody |
| `spell-impact-void.ogg` | Void burst, silence, venom | Freesound CC0 or generated CC0 | Secondary impact for void effects | Source must be CC0 unless a credit entry is approved |
| `summon-construct.ogg` | Stone golem and construct summon | OpenGameArt RPG Sound Pack | Layer with `cardDeploy` | Metallic/stone identity, no voice sample |
| `secret-arm.ogg` | Secret card is armed | Kenney or generated CC0 | Low-volume setup cue | Must not reveal the secret effect type to the opponent |
| `secret-trigger.ogg` | Secret resolves | Kenney / OpenGameArt | Major tactical reveal accent | Must route as `major` in `sfxBus.ts` |
| `discover-open.ogg` / `discover-confirm.ogg` | Discover selection | OpenGameArt 512 Sound Effects | Two-step UI progression | Audible but below combat cues |
| `status-freeze.ogg` | Freeze applied | Freesound CC0 or generated CC0 | Short crystalline status layer | Under 800 ms; no harsh high-frequency peak |
| `status-silence.ogg` | Silence applied | Freesound CC0 or generated CC0 | Dampened magical cutoff | Must be audibly distinct from void damage |

## Runtime Mapping

New source files should not be referenced directly by card components. Keep the existing central mapping pattern.

1. Add a semantic `SfxName` in `src/audio/AudioProvider.tsx`.
2. Define a small candidate list in `SFX_SOURCES`; use two or three variants for commonly repeated effects.
3. Add its priority in `src/audio/sfxBus.ts`.
4. Route the effect from `src/audio/cardSounds.ts` or the battle event translation in `src/components/Battle.tsx`.
5. Add the path to `scripts/audio-smoke.mjs` so packaging fails when the asset is missing or malformed.
6. Register each shipped file in `public/assets/audio/ATTRIBUTION.md`.
7. Add a focused Vitest assertion when a new effect changes routing behavior.

Example target mapping after the first import batch:

| Gameplay intent | SFX key | SFX tier | Duck music |
| --- | --- | --- | --- |
| Weapon swing | `weaponSwing` | combat | No |
| Weapon metal hit | `weaponHitMetal` | combat | No |
| Construct summon | `summonConstruct` | combat | No |
| Secret armed | `secretArm` | ui | No |
| Secret triggered | `secretTrigger` | major | Yes |
| Discover open / confirm | `discoverOpen` / `discoverConfirm` | ui / major | Confirm only |
| Freeze / silence | `statusFreeze` / `statusSilence` | combat | No |

## Import Procedure

1. Download the smallest viable upstream pack or individual CC0 file. Do not bulk-copy a whole library into `public/`.
2. Preserve the original archive and license text outside runtime assets under `docs/licenses/<source-id>/`.
3. Audition each candidate against existing music at the default SFX volume of `0.68`.
4. Trim leading silence, normalize conservatively, and export OGG for short SFX. Retain the original WAV or FLAC only in the source archive.
5. Use kebab-case filenames based on intent, not the upstream filename: `status-freeze-1.ogg`, not `magic_009.wav`.
6. Update `ATTRIBUTION.md` with source page, author, license, original filename, local filename, and modifications.
7. Run `npm run audio-smoke`, targeted Vitest tests, and `npm run build` before committing.

## Mixing Rules

- UI confirmations: target perceived level below `cardDeploy`; keep under 350 ms when possible.
- Repeated combat actions: provide two variants and let `AudioProvider` select randomly.
- Major events: revive, secret trigger, full-board effect, and rare reveal may duck music. Do not stack more than two major sounds in the 350 ms gate.
- Spell events: use a short cast cue plus a separate hit cue only for S3/S4 effects; S1/S2 should use one clear one-shot.
- Do not use raw third-party character voices, creature voices, or vocal phrases. Voice identity remains limited to the project's generated character voice system.

## Release Checklist

- Every shipped third-party file has a source URL and license in `ATTRIBUTION.md`.
- Every CC BY file has a release-credit line in the game's credit surface.
- No CC BY-NC, "personal use", "free with credit" without an explicit commercial clause, or unknown-license asset is present.
- Every new runtime SFX key is present in `SFX_SOURCES`, `SFX_TIER`, and `audio-smoke.mjs`.
- The full battle flow has been checked with music enabled, reduced volume, mute, and rapid multi-target resolution.
