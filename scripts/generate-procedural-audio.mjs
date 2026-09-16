import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const sampleRate = 44100;
const outputDirectory = join(process.cwd(), "public", "assets", "audio", "sfx");
await mkdir(outputDirectory, { recursive: true });

let seed = 0x5a17c9e3;
function noise() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return ((seed >>> 0) / 0xffffffff) * 2 - 1;
}
function envelope(t, duration, attack = 0.015, release = 0.24) {
  return Math.min(1, t / attack) * Math.min(1, (duration - t) / release);
}
function sine(frequency, t, phase = 0) { return Math.sin(Math.PI * 2 * frequency * t + phase); }
function clamp(value) { return Math.max(-1, Math.min(1, value)); }

async function render(name, duration, synth) {
  const samples = Math.floor(sampleRate * duration);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    buffer.writeInt16LE(Math.round(clamp(synth(t, duration)) * 32767), 44 + index * 2);
  }
  await writeFile(join(outputDirectory, name), buffer);
}

const arpeggio = (notes, spacing, decay = 0.42) => (t, duration) => notes.reduce((sum, note, index) => {
  const local = t - index * spacing;
  return local < 0 ? sum : sum + sine(note, local) * Math.exp(-local / decay) * envelope(t, duration);
}, 0) / Math.max(1, notes.length * 0.58);

await render("turn-start.wav", 0.9, arpeggio([392, 523.25, 659.25, 783.99], 0.11));
await render("turn-end.wav", 0.75, arpeggio([659.25, 523.25, 392], 0.12, 0.32));
await render("mana-gain.wav", 0.65, (t, d) => (sine(520 + t * 620, t) * 0.55 + sine(1040 + t * 320, t) * 0.2) * Math.exp(-t * 3.2) * envelope(t, d));
await render("mana-spend.wav", 0.38, (t, d) => sine(310 - t * 140, t) * Math.exp(-t * 7) * envelope(t, d));
await render("ui-error.wav", 0.48, (t, d) => (sine(146.83, t) + sine(155.56, t)) * 0.34 * envelope(t, d, 0.01, 0.12));
await render("shield.wav", 0.7, (t, d) => (sine(340 + t * 720, t) * 0.42 + noise() * 0.08) * Math.exp(-t * 2.3) * envelope(t, d));
await render("shield-break.wav", 0.62, (t, d) => (noise() * Math.exp(-t * 7) * 0.5 + sine(210 - t * 120, t) * 0.28) * envelope(t, d, 0.005, 0.14));
await render("heal.wav", 1.0, arpeggio([523.25, 659.25, 783.99, 1046.5], 0.14, 0.55));
await render("revive.wav", 1.45, (t, d) => (sine(180 + t * 420, t) * 0.34 + sine(270 + t * 610, t) * 0.22) * envelope(t, d, 0.22, 0.3));
await render("unit-death.wav", 0.72, (t, d) => (noise() * Math.exp(-t * 8) * 0.42 + sine(125 - t * 65, t) * Math.exp(-t * 3) * 0.45) * envelope(t, d, 0.004, 0.18));
await render("core-critical.wav", 1.15, (t, d) => sine(110, t) * (Math.sin(Math.PI * 2 * 2.7 * t) > 0 ? 0.48 : 0.1) * envelope(t, d, 0.01, 0.12));
await render("rare-reveal.wav", 1.3, arpeggio([392, 523.25, 659.25, 783.99, 1046.5], 0.12, 0.65));
await render("reward.wav", 0.82, arpeggio([987.77, 1318.51, 1567.98], 0.1, 0.26));
await render("card-return.wav", 0.3, (t, d) => (noise() * 0.12 + sine(440 - t * 250, t) * 0.25) * Math.exp(-t * 8) * envelope(t, d, 0.005, 0.08));
await render("guard.wav", 0.45, (t, d) => (sine(180, t) * 0.42 + sine(540, t) * 0.18 + noise() * 0.08) * Math.exp(-t * 5) * envelope(t, d));

await render("card-select.wav", 0.24, (t, d) => (sine(660 + t * 260, t) * 0.3 + sine(1320 + t * 420, t) * 0.12) * Math.exp(-t * 9) * envelope(t, d, 0.006, 0.08));
await render("target-lock.wav", 0.32, (t, d) => (sine(290 + t * 120, t) * 0.3 + sine(580 + t * 240, t) * 0.14) * (Math.sin(Math.PI * 2 * 11 * t) > 0 ? 1 : 0.24) * envelope(t, d, 0.006, 0.07));
await render("skill-radiant.wav", 0.72, arpeggio([523.25, 659.25, 783.99, 1046.5], 0.09, 0.34));
await render("skill-void.wav", 0.8, (t, d) => (sine(196 - t * 76, t) * 0.42 + sine(98 - t * 30, t) * 0.25 + noise() * 0.08) * Math.exp(-t * 2.8) * envelope(t, d, 0.012, 0.24));
await render("skill-arcane.wav", 0.74, (t, d) => (sine(440 + Math.sin(t * 17) * 90 + t * 270, t) * 0.28 + sine(880 + t * 420, t) * 0.15) * Math.exp(-t * 2.7) * envelope(t, d, 0.02, 0.2));
await render("skill-iron.wav", 0.54, (t, d) => (noise() * 0.25 * Math.exp(-t * 12) + sine(165, t) * 0.36 * Math.exp(-t * 4) + sine(1240, t) * 0.1 * Math.exp(-t * 9)) * envelope(t, d, 0.004, 0.14));
await render("skill-wild.wav", 0.86, (t, d) => (sine(240 + t * 150, t) * 0.25 + sine(360 + t * 210, t) * 0.14 + noise() * 0.1) * Math.exp(-t * 2.5) * envelope(t, d, 0.025, 0.26));
await render("status-freeze.wav", 0.68, (t, d) => (sine(1180 - t * 460, t) * 0.24 + sine(1760 - t * 680, t) * 0.12 + noise() * 0.05) * Math.exp(-t * 4.8) * envelope(t, d, 0.008, 0.16));
await render("status-silence.wav", 0.6, (t, d) => (sine(510 - t * 330, t) * 0.24 + noise() * 0.09) * Math.exp(-t * 5.8) * envelope(t, d, 0.012, 0.18));
await render("discover-open.wav", 0.66, arpeggio([392, 493.88, 659.25], 0.1, 0.35));
await render("discover-confirm.wav", 0.82, arpeggio([659.25, 783.99, 987.77, 1318.51], 0.09, 0.32));
console.log("已生成 26 个原创 CC0 程序化游戏音效");
