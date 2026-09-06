export type SoundCue = "correct" | "review" | "incorrect" | "complete";

export type Tone = {
  frequency: number;
  durationMs: number;
  gapMs?: number;
  gain?: number;
};

export const SAMPLE_RATE = 22_050;

// Selection is deliberately haptic-only. Audible cues are reserved for outcomes
// and completion so they remain informative rather than becoming tap noise.
export const TONES: Record<SoundCue, Tone[]> = {
  correct: [
    { frequency: 523.25, durationMs: 62, gapMs: 14, gain: 0.19 },
    { frequency: 659.25, durationMs: 105, gain: 0.20 },
  ],
  review: [
    { frequency: 493.88, durationMs: 70, gapMs: 12, gain: 0.14 },
    { frequency: 440, durationMs: 100, gain: 0.13 },
  ],
  incorrect: [
    { frequency: 392, durationMs: 70, gapMs: 14, gain: 0.13 },
    { frequency: 329.63, durationMs: 110, gain: 0.12 },
  ],
  complete: [
    { frequency: 523.25, durationMs: 72, gapMs: 14, gain: 0.18 },
    { frequency: 659.25, durationMs: 82, gapMs: 14, gain: 0.19 },
    { frequency: 783.99, durationMs: 150, gain: 0.20 },
  ],
};

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

export function writeWav(notes: Tone[]) {
  // Round each segment ONCE and reuse it for allocation AND writing. Rounding
  // the combined duration under-allocated the old correct/completion buffers.
  const segments = notes.map((note) => ({
    ...note,
    noteSamples: Math.ceil(note.durationMs * SAMPLE_RATE / 1000),
    gapSamples: Math.ceil((note.gapMs ?? 0) * SAMPLE_RATE / 1000),
  }));
  if (segments.some((note) => !Number.isFinite(note.frequency) || note.frequency <= 0 ||
    note.frequency >= SAMPLE_RATE / 2 || !Number.isFinite(note.noteSamples) ||
    note.noteSamples < 1 || !Number.isFinite(note.gapSamples) || note.gapSamples < 0 ||
    !Number.isFinite(note.gain ?? 0.16))) throw new RangeError("Invalid feedback tone");
  const totalSamples = segments.reduce((sum, note) => sum + note.noteSamples + note.gapSamples, 0);
  if (totalSamples > SAMPLE_RATE * 5) throw new RangeError("Feedback must stay under five seconds");
  const bytes = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(bytes.buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, totalSamples * 2, true);

  let outputIndex = 0;
  for (const note of segments) {
    const { noteSamples, gapSamples } = note;
    const attackSamples = Math.max(1, Math.floor(0.006 * SAMPLE_RATE));
    const releaseSamples = Math.max(1, Math.min(noteSamples, Math.floor(0.035 * SAMPLE_RATE)));
    const gain = note.gain ?? 0.16;

    for (let index = 0; index < noteSamples; index += 1) {
      const time = index / SAMPLE_RATE;
      const attack = Math.min(1, index / attackSamples);
      const release = Math.min(1, (noteSamples - 1 - index) / releaseSamples);
      const envelope = Math.sin(Math.PI / 2 * Math.min(attack, release)) ** 2;
      const fundamental = Math.sin(2 * Math.PI * note.frequency * time);
      const harmonic = 0.12 * Math.sin(2 * Math.PI * note.frequency * 2 * time);
      const sample = Math.max(-1, Math.min(1, (fundamental + harmonic) * gain * envelope));
      view.setInt16(44 + outputIndex * 2, Math.round(sample * 32_767), true);
      outputIndex += 1;
    }
    outputIndex += gapSamples;
  }

  return bytes;
}

