import { MUSICAL_KEYS, MusicalKey, NOTE_NAMES } from '../types/synth';
import type { WorshipAudioEngine } from './WorshipAudioEngine';

export type ChordQuality = 'maj' | 'min' | 'maj7' | 'm7' | 'add9' | 'madd9' | 'sus2' | 'sus4';

const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  maj7: 'maj7',
  m7: 'm7',
  add9: 'add9',
  madd9: 'm(add9)',
  sus2: 'sus2',
  sus4: 'sus4',
};

export interface ProgressionChord {
  offset: number; // semitones above the key's tonic
  quality: ChordQuality;
  numeral: string;
}

export interface ProgressionPreset {
  id: string;
  name: string;
  mode: 'major' | 'minor';
  description: string;
  chords: ProgressionChord[];
}

export const PROGRESSIONS: ProgressionPreset[] = [
  {
    id: 'worship-classic',
    name: 'Worship Classic',
    mode: 'major',
    description: 'The familiar I – V – vi – IV. Warm and uplifting.',
    chords: [
      { offset: 0, quality: 'add9', numeral: 'I' },
      { offset: 7, quality: 'maj', numeral: 'V' },
      { offset: 9, quality: 'm7', numeral: 'vi' },
      { offset: 5, quality: 'maj7', numeral: 'IV' },
    ],
  },
  {
    id: 'hopeful-rise',
    name: 'Hopeful Rise',
    mode: 'major',
    description: 'vi – IV – I – V. Starts reflective, then opens up.',
    chords: [
      { offset: 9, quality: 'm7', numeral: 'vi' },
      { offset: 5, quality: 'maj7', numeral: 'IV' },
      { offset: 0, quality: 'add9', numeral: 'I' },
      { offset: 7, quality: 'sus4', numeral: 'V' },
    ],
  },
  {
    id: 'sweet-return',
    name: 'Sweet Return',
    mode: 'major',
    description: 'I – vi – IV – V. Gentle and settled, like coming home.',
    chords: [
      { offset: 0, quality: 'maj', numeral: 'I' },
      { offset: 9, quality: 'm7', numeral: 'vi' },
      { offset: 5, quality: 'maj7', numeral: 'IV' },
      { offset: 7, quality: 'sus4', numeral: 'V' },
    ],
  },
  {
    id: 'peaceful-two',
    name: 'Peaceful Two-Chord',
    mode: 'major',
    description: 'I – IV. Simple and calm. Best for prayer and quiet moments.',
    chords: [
      { offset: 0, quality: 'add9', numeral: 'I' },
      { offset: 5, quality: 'maj7', numeral: 'IV' },
    ],
  },
  {
    id: 'gentle-climb',
    name: 'Gentle Climb',
    mode: 'major',
    description: 'I – iii – IV – V. A slow, hopeful lift.',
    chords: [
      { offset: 0, quality: 'maj', numeral: 'I' },
      { offset: 4, quality: 'm7', numeral: 'iii' },
      { offset: 5, quality: 'maj7', numeral: 'IV' },
      { offset: 7, quality: 'sus4', numeral: 'V' },
    ],
  },
  {
    id: 'soft-lift',
    name: 'Soft Lift',
    mode: 'major',
    description: 'IV – I – V – vi. Floating, with no hard landing.',
    chords: [
      { offset: 5, quality: 'maj7', numeral: 'IV' },
      { offset: 0, quality: 'add9', numeral: 'I' },
      { offset: 7, quality: 'sus4', numeral: 'V' },
      { offset: 9, quality: 'm7', numeral: 'vi' },
    ],
  },
  {
    id: 'reverent-minor',
    name: 'Reverent Minor',
    mode: 'minor',
    description: 'i – VI – III – VII. Deep and reverent.',
    chords: [
      { offset: 0, quality: 'madd9', numeral: 'i' },
      { offset: 8, quality: 'maj7', numeral: 'VI' },
      { offset: 3, quality: 'maj7', numeral: 'III' },
      { offset: 10, quality: 'add9', numeral: 'VII' },
    ],
  },
  {
    id: 'minor-drift',
    name: 'Minor Drift',
    mode: 'minor',
    description: 'i – VII – VI – VII. Slowly rocking, never resolving.',
    chords: [
      { offset: 0, quality: 'madd9', numeral: 'i' },
      { offset: 10, quality: 'add9', numeral: 'VII' },
      { offset: 8, quality: 'maj7', numeral: 'VI' },
      { offset: 10, quality: 'add9', numeral: 'VII' },
    ],
  },
  {
    id: 'still-waters',
    name: 'Still Waters',
    mode: 'minor',
    description: 'i – iv – VI – v. Tender and thoughtful.',
    chords: [
      { offset: 0, quality: 'm7', numeral: 'i' },
      { offset: 5, quality: 'm7', numeral: 'iv' },
      { offset: 8, quality: 'maj7', numeral: 'VI' },
      { offset: 7, quality: 'm7', numeral: 'v' },
    ],
  },
];

export type PlayStyle = 'block' | 'rolled' | 'arpeggio' | 'pulse';

export const PLAY_STYLES: { id: PlayStyle; name: string; description: string }[] = [
  { id: 'block', name: 'Sustained Chords', description: 'Full chords that ring and breathe. Calmest option.' },
  { id: 'rolled', name: 'Rolled Chords', description: 'Chords spread gently from the bass upward.' },
  { id: 'arpeggio', name: 'Soft Arpeggio', description: 'Flowing broken chords. Gives the most movement.' },
  { id: 'pulse', name: 'Driving Pulse', description: 'Short, firm chord hits on a worship-band rhythm. Pairs well with pads and the hard piano tones.' },
];

export interface PlayerConfig {
  progressionId: string;
  style: PlayStyle;
  bpm: number; // beats per minute
  beatsPerChord: number; // 4 = one bar, 8 = two bars
  level: number; // 0.2 to 1
  padLayer: boolean; // hold a soft pad under the piano
  padLevel: number; // 0.2 to 1
  key: MusicalKey;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  progressionId: 'worship-classic',
  style: 'block',
  bpm: 60,
  beatsPerChord: 4,
  level: 0.6,
  padLayer: false,
  padLevel: 0.6,
  key: 'C',
};

export function getProgression(id: string): ProgressionPreset {
  return PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0];
}

function keySemitone(key: MusicalKey): number {
  return MUSICAL_KEYS.find((k) => k.key === key)?.semitone ?? 0;
}

export function chordLabel(chord: ProgressionChord, key: MusicalKey): string {
  const pc = (keySemitone(key) + chord.offset) % 12;
  return `${NOTE_NAMES[pc]}${QUALITY_SUFFIX[chord.quality]}`;
}

export function progressionLabels(preset: ProgressionPreset, key: MusicalKey): string[] {
  return preset.chords.map((c) => chordLabel(c, key));
}

interface VoicedChord {
  bass: number;
  upper: number[];
  meanUpper: number;
}

// Bass note in C2-B2; upper notes as a close voicing near middle C, picking the inversion
// that moves least from the previous chord so the progression sounds smooth.
function voiceChord(rootPc: number, quality: ChordQuality, prevMean: number | null): VoicedChord {
  const bass = 36 + rootPc;
  let rootUp = 48 + rootPc;
  while (rootUp < 55) rootUp += 12;
  const stack = QUALITY_INTERVALS[quality].map((i) => rootUp + i);

  let best: number[] = stack;
  let bestCost = Number.POSITIVE_INFINITY;
  const target = prevMean ?? 66;
  for (let k = 0; k < stack.length; k++) {
    const candidate = [...stack.slice(k), ...stack.slice(0, k).map((n) => n + 12)].sort((a, b) => a - b);
    const mean = candidate.reduce((a, b) => a + b, 0) / candidate.length;
    let cost = Math.abs(mean - target);
    if (candidate[candidate.length - 1] > 79) cost += 20;
    if (candidate[0] < 55) cost += 20;
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return { bass, upper: best, meanUpper: best.reduce((a, b) => a + b, 0) / best.length };
}

interface PlayEvent {
  beat: number; // beats after the chord starts
  midi: number;
  velocity: number; // 0-1 multiplier
  holdBeats?: number; // undefined = until the chord ends
}

function buildEvents(voiced: VoicedChord, style: PlayStyle, beatsPerChord: number): PlayEvent[] {
  const events: PlayEvent[] = [];
  const { bass, upper } = voiced;

  if (style === 'block') {
    events.push({ beat: 0, midi: bass, velocity: 0.9 });
    upper.forEach((m, i) => events.push({ beat: 0.04 * i, midi: m, velocity: 0.8 }));
    if (beatsPerChord >= 8) {
      upper.forEach((m, i) => events.push({ beat: 4 + 0.04 * i, midi: m, velocity: 0.5 }));
    }
    return events;
  }

  if (style === 'pulse') {
    // Worship-band rhythm: bass on 1 and 3, chord hits on 1, the "and" of 2, and 4 ("x . . x . x . .")
    const bars = beatsPerChord >= 8 ? [0, 4] : [0];
    bars.forEach((start) => {
      events.push({ beat: start, midi: bass, velocity: 0.95, holdBeats: 1.9 });
      events.push({ beat: start + 2, midi: bass, velocity: 0.8, holdBeats: 1.9 });
      [
        { b: 0, v: 1, hold: 1.3 },
        { b: 1.5, v: 0.78, hold: 0.9 },
        { b: 2.5, v: 0.9, hold: 1.3 },
      ].forEach(({ b, v, hold }) => {
        upper.forEach((m) =>
          events.push({ beat: start + b, midi: m, velocity: v * 0.85, holdBeats: Math.min(hold, beatsPerChord - start - b - 0.05) }),
        );
      });
    });
    return events;
  }

  if (style === 'rolled') {
    const rollStep = 0.25;
    const repeats = beatsPerChord >= 8 ? [0, 4] : [0];
    repeats.forEach((start, r) => {
      const v = r === 0 ? 1 : 0.62;
      events.push({ beat: start, midi: bass, velocity: 0.9 * v });
      upper.forEach((m, i) =>
        events.push({ beat: start + rollStep * (i + 1), midi: m, velocity: 0.78 * v }),
      );
    });
    return events;
  }

  // arpeggio: eighth notes. Bass on every half bar, upper notes flowing up and back down.
  const slots = beatsPerChord * 2;
  const cycle = [...upper, ...upper.slice(1, -1).reverse()];
  for (let slot = 0; slot < slots; slot++) {
    const beat = slot * 0.5;
    if (slot % 4 === 0) {
      events.push({ beat, midi: bass, velocity: slot === 0 ? 0.9 : 0.7, holdBeats: Math.min(3, beatsPerChord - beat - 0.05) });
    } else {
      const m = cycle[(slot - 1) % cycle.length];
      events.push({ beat, midi: m, velocity: 0.62, holdBeats: Math.min(2.5, beatsPerChord - beat - 0.05) });
    }
  }
  return events;
}

interface ScheduledItem {
  at: number;
  run: () => void;
}

export class ProgressionPlayer {
  private engine: WorshipAudioEngine;
  private config: PlayerConfig = { ...DEFAULT_PLAYER_CONFIG };
  private timer: number | null = null;
  private queue: ScheduledItem[] = [];
  private held = new Set<number>();
  private padHeld = new Set<number>();
  private strikeIds = new Map<number, number>();
  private strikeCounter = 0;
  private chordIndex = 0;
  private nextChordAt = 0;
  private prevMean: number | null = null;
  private playing = false;

  // Called with the index of the chord that just started, or -1 when stopped.
  public onChordChange?: (index: number) => void;

  constructor(engine: WorshipAudioEngine) {
    this.engine = engine;
  }

  public setConfig(partial: Partial<PlayerConfig>) {
    this.config = { ...this.config, ...partial };
    // A different progression starts from its first chord at the next chord change.
    if (partial.progressionId !== undefined) {
      this.chordIndex = 0;
    }
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public async start() {
    if (this.playing) return;
    await this.engine.initOrResume();
    this.playing = true;
    this.chordIndex = 0;
    this.prevMean = null;
    this.queue = [];
    this.nextChordAt = performance.now() + 120;
    this.timer = window.setInterval(() => this.tick(), 20);
    this.tick();
  }

  public stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.queue = [];
    this.releaseAllHeld();
    const wasPlaying = this.playing;
    this.playing = false;
    if (wasPlaying) this.onChordChange?.(-1);
  }

  private releaseAllHeld() {
    this.held.forEach((m) => this.engine.releaseNote(m, 'piano'));
    this.held.clear();
    this.padHeld.forEach((m) => this.engine.releaseNote(m, 'pad'));
    this.padHeld.clear();
  }

  private strike(midi: number, velocity: number): number {
    const jitter = (Math.random() - 0.5) * 0.08;
    const v = Math.max(0.1, Math.min(1, this.config.level * velocity + jitter));
    this.held.add(midi);
    const token = ++this.strikeCounter;
    this.strikeIds.set(midi, token);
    void this.engine.noteOn(midi, v, { pianoOnly: true });
    return token;
  }

  private release(midi: number, token: number) {
    // Only release the strike this timer belongs to (not a later re-strike of the same pitch)
    if (this.held.has(midi) && this.strikeIds.get(midi) === token) {
      this.held.delete(midi);
      this.engine.releaseNote(midi, 'piano');
    }
  }

  // Soft pad under the piano: root, fifth and third. Notes shared with the previous chord keep sounding.
  private updatePad(rootPc: number, quality: ChordQuality) {
    const wanted = new Set<number>();
    if (this.config.padLayer) {
      const root = 48 + rootPc;
      const third = QUALITY_INTERVALS[quality][1];
      [root, root + 7, root + 12 + third].forEach((m) => wanted.add(m));
    }
    this.padHeld.forEach((m) => {
      if (!wanted.has(m)) {
        this.engine.releaseNote(m, 'pad');
        this.padHeld.delete(m);
      }
    });
    wanted.forEach((m) => {
      if (!this.padHeld.has(m)) {
        this.padHeld.add(m);
        void this.engine.noteOn(m, Math.max(0.2, Math.min(1, this.config.padLevel)), {
          padOnly: true,
          softSwell: false,
        });
      }
    });
  }

  private beginChord(startAt: number) {
    const preset = getProgression(this.config.progressionId);
    if (this.chordIndex >= preset.chords.length) this.chordIndex = 0;
    const chord = preset.chords[this.chordIndex];
    const index = this.chordIndex;
    const beatMs = 60000 / Math.max(30, this.config.bpm);

    const rootPc = (keySemitone(this.config.key) + chord.offset) % 12;
    const voiced = voiceChord(rootPc, chord.quality, this.prevMean);
    this.prevMean = voiced.meanUpper;

    // Let the previous piano chord go, then play the new one
    this.held.forEach((m) => this.engine.releaseNote(m, 'piano'));
    this.held.clear();
    this.updatePad(rootPc, chord.quality);
    this.onChordChange?.(index);

    const events = buildEvents(voiced, this.config.style, this.config.beatsPerChord);
    events.forEach((ev) => {
      let token = 0;
      this.queue.push({
        at: startAt + ev.beat * beatMs,
        run: () => {
          token = this.strike(ev.midi, ev.velocity);
        },
      });
      if (ev.holdBeats !== undefined) {
        this.queue.push({
          at: startAt + (ev.beat + ev.holdBeats) * beatMs,
          run: () => this.release(ev.midi, token),
        });
      }
    });
    this.queue.sort((a, b) => a.at - b.at);

    this.chordIndex = (this.chordIndex + 1) % preset.chords.length;
    this.nextChordAt = startAt + this.config.beatsPerChord * beatMs;
  }

  private tick() {
    if (!this.playing) return;
    const now = performance.now();

    // If the page was paused for a long time, restart the timing instead of replaying a burst
    if (now - this.nextChordAt > 1500) {
      this.queue = [];
      this.nextChordAt = now;
    }

    if (now >= this.nextChordAt) {
      this.beginChord(this.nextChordAt);
    }

    while (this.queue.length > 0 && this.queue[0].at <= now) {
      const item = this.queue.shift();
      item?.run();
    }
  }
}