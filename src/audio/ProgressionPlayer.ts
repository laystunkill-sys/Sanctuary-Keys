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

export const CHORD_QUALITIES: { id: ChordQuality; label: string; suffix: string }[] = [
  { id: 'maj', label: 'Major', suffix: '' },
  { id: 'min', label: 'Minor', suffix: 'm' },
  { id: 'maj7', label: 'maj7', suffix: 'maj7' },
  { id: 'm7', label: 'm7', suffix: 'm7' },
  { id: 'add9', label: 'add9', suffix: 'add9' },
  { id: 'madd9', label: 'm(add9)', suffix: 'm(add9)' },
  { id: 'sus2', label: 'sus2', suffix: 'sus2' },
  { id: 'sus4', label: 'sus4', suffix: 'sus4' },
];

export const DEGREE_OPTIONS: {
  offset: number;
  majorNumeral: string;
  minorNumeral: string;
  diatonicMajor: boolean;
  diatonicMinor: boolean;
}[] = [
  { offset: 0, majorNumeral: 'I', minorNumeral: 'i', diatonicMajor: true, diatonicMinor: true },
  { offset: 1, majorNumeral: 'bII', minorNumeral: 'bII', diatonicMajor: false, diatonicMinor: false },
  { offset: 2, majorNumeral: 'ii', minorNumeral: 'ii', diatonicMajor: true, diatonicMinor: true },
  { offset: 3, majorNumeral: 'bIII', minorNumeral: 'III', diatonicMajor: false, diatonicMinor: true },
  { offset: 4, majorNumeral: 'iii', minorNumeral: 'iii', diatonicMajor: true, diatonicMinor: false },
  { offset: 5, majorNumeral: 'IV', minorNumeral: 'iv', diatonicMajor: true, diatonicMinor: true },
  { offset: 6, majorNumeral: '#IV', minorNumeral: '#iv', diatonicMajor: false, diatonicMinor: false },
  { offset: 7, majorNumeral: 'V', minorNumeral: 'v', diatonicMajor: true, diatonicMinor: true },
  { offset: 8, majorNumeral: 'bVI', minorNumeral: 'VI', diatonicMajor: false, diatonicMinor: true },
  { offset: 9, majorNumeral: 'vi', minorNumeral: 'vi', diatonicMajor: true, diatonicMinor: false },
  { offset: 10, majorNumeral: 'bVII', minorNumeral: 'VII', diatonicMajor: false, diatonicMinor: true },
  { offset: 11, majorNumeral: 'vii', minorNumeral: 'vii', diatonicMajor: false, diatonicMinor: false },
];

export function getChordNumeral(offset: number, quality: ChordQuality): string {
  const norm = ((offset % 12) + 12) % 12;
  const minorQuality = quality === 'min' || quality === 'm7' || quality === 'madd9';
  const baseUpper: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: '#IV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
  };
  const num = baseUpper[norm] ?? 'I';
  return minorQuality ? num.replace(/[IV]+$/, (m) => m.toLowerCase()) : num;
}

export interface ProgressionChord {
  offset: number; // semitones above the key's tonic
  quality: ChordQuality;
  numeral: string;
}

export interface ProgressionPreset {
  id: string;
  name: string;
  mode: 'major' | 'minor' | 'custom';
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
  { id: 'block', name: 'Sustained Swell', description: 'Smooth 5-note pad chords that bloom and crossfade gently.' },
  { id: 'rolled', name: 'Rolled Bloom', description: 'Pad notes rise gently from low bass to upper shimmer.' },
  { id: 'arpeggio', name: 'Flowing Motion', description: 'Gentle broken pad movement across two octaves.' },
  { id: 'pulse', name: 'Warm Pulse', description: 'Rhythmic pad swells on a worship pulse.' },
];

export interface PlayerConfig {
  progressionId: string;
  customProgression?: ProgressionPreset | null;
  style: PlayStyle;
  bpm: number; // beats per minute
  beatsPerChord: number; // 4 = one bar, 8 = two bars
  level: number; // 0.2 to 1
  key: MusicalKey;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  progressionId: 'worship-classic',
  style: 'block',
  bpm: 60,
  beatsPerChord: 4,
  level: 0.65,
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
  lowBass: number;
  octBass: number;
  upper: number[];
  meanUpper: number;
}

// Concert grand piano 5-note, 2-octave voicing:
// Left hand plays a full bass octave (C2–B2 + C3–B3), right hand plays 3 singing voices
// in the upper octave (F4–G5) with smooth voice-leading between chords.
function voiceChord(rootPc: number, quality: ChordQuality, prevMean: number | null): VoicedChord {
  const lowBass = 36 + rootPc;
  const octBass = lowBass + 12;

  const intervals = QUALITY_INTERVALS[quality];
  // For 4-note chords (maj7, m7, add9, madd9), take 3rd + 5th + color tone since root is doubled in left hand
  const upperIntervals = intervals.length >= 4 ? intervals.slice(1, 4) : intervals.slice(0, 3);

  let rootUp = 60 + rootPc;
  if (rootUp > 67) rootUp -= 12; // keep upper center nicely around Middle C4..G4..E5
  const stack = upperIntervals.map((i) => rootUp + i);

  let best: number[] = stack;
  let bestCost = Number.POSITIVE_INFINITY;
  const target = prevMean ?? 68;
  for (let k = 0; k < stack.length; k++) {
    const candidate = [...stack.slice(k), ...stack.slice(0, k).map((n) => n + 12)].sort((a, b) => a - b);
    // Open up top note by an octave if chord spans less than a 5th for grand spaciousness
    if (candidate[candidate.length - 1] - candidate[0] < 6) {
      candidate[0] -= 12;
      candidate.sort((a, b) => a - b);
    }
    const mean = candidate.reduce((a, b) => a + b, 0) / candidate.length;
    let cost = Math.abs(mean - target);
    if (candidate[candidate.length - 1] > 81) cost += 20;
    if (candidate[0] < 57) cost += 20;
    if (cost < bestCost) {
      bestCost = cost;
      best = candidate;
    }
  }
  return {
    lowBass,
    octBass,
    upper: best,
    meanUpper: best.reduce((a, b) => a + b, 0) / best.length,
  };
}

interface PlayEvent {
  beat: number; // beats after the chord starts
  midi: number;
  velocity: number; // 0-1 multiplier
  holdBeats?: number; // undefined = until the chord ends
}

function buildEvents(voiced: VoicedChord, style: PlayStyle, beatsPerChord: number): PlayEvent[] {
  const events: PlayEvent[] = [];
  const { lowBass, octBass, upper } = voiced;
  const allFive = [lowBass, octBass, ...upper];

  if (style === 'block') {
    events.push({ beat: 0, midi: lowBass, velocity: 0.92 });
    events.push({ beat: 0.02, midi: octBass, velocity: 0.84 });
    upper.forEach((m, i) => events.push({ beat: 0.04 + 0.025 * i, midi: m, velocity: 0.8 }));
    return events;
  }

  if (style === 'pulse') {
    // Worship-band rhythm: full bass octave on 1 and 3, 3-note upper chord hits on 1, and-of-2, and 4
    const bars = beatsPerChord >= 8 ? [0, 4] : [0];
    bars.forEach((start) => {
      events.push({ beat: start, midi: lowBass, velocity: 0.95, holdBeats: 1.9 });
      events.push({ beat: start + 0.01, midi: octBass, velocity: 0.84, holdBeats: 1.9 });
      events.push({ beat: start + 2, midi: lowBass, velocity: 0.82, holdBeats: 1.9 });
      events.push({ beat: start + 2.01, midi: octBass, velocity: 0.72, holdBeats: 1.9 });
      [
        { b: 0, v: 1, hold: 1.3 },
        { b: 1.5, v: 0.78, hold: 0.9 },
        { b: 2.5, v: 0.9, hold: 1.3 },
      ].forEach(({ b, v, hold }) => {
        upper.forEach((m) =>
          events.push({
            beat: start + b,
            midi: m,
            velocity: v * 0.86,
            holdBeats: Math.min(hold, beatsPerChord - start - b - 0.05),
          }),
        );
      });
    });
    return events;
  }

  if (style === 'rolled') {
    const rollStep = 0.2;
    const repeats = beatsPerChord >= 8 ? [0, 4] : [0];
    repeats.forEach((start, r) => {
      const v = r === 0 ? 1 : 0.65;
      allFive.forEach((m, i) =>
        events.push({
          beat: start + rollStep * i,
          midi: m,
          velocity: (i === 0 ? 0.92 : i === 1 ? 0.84 : 0.8) * v,
        }),
      );
    });
    return events;
  }

  // arpeggio: eighth notes sweeping across all 5 notes in 2+ octaves
  const slots = beatsPerChord * 2;
  const arpPattern = [lowBass, octBass, upper[0], upper[1], upper[2], upper[1], upper[0], octBass];
  for (let slot = 0; slot < slots; slot++) {
    const beat = slot * 0.5;
    const m = arpPattern[slot % arpPattern.length];
    const isBass = slot % 8 === 0;
    events.push({
      beat,
      midi: m,
      velocity: isBass ? 0.9 : slot % 8 === 4 ? 0.78 : 0.66,
      holdBeats: Math.min(isBass ? 3.5 : 2.2, beatsPerChord - beat - 0.05),
    });
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
    this.held.forEach((m) => this.engine.releaseNote(m, 'pad'));
    this.held.clear();
  }

  private strike(midi: number, velocity: number): number {
    const jitter = (Math.random() - 0.5) * 0.06;
    const v = Math.max(0.15, Math.min(1, this.config.level * velocity + jitter));
    this.held.add(midi);
    const token = ++this.strikeCounter;
    this.strikeIds.set(midi, token);
    const useSoftSwell = this.config.style === 'block' || this.config.style === 'rolled';
    void this.engine.noteOn(midi, v, { padOnly: true, softSwell: useSoftSwell });
    return token;
  }

  private release(midi: number, token: number) {
    // Only release the strike this timer belongs to (not a later re-strike of the same pitch)
    if (this.held.has(midi) && this.strikeIds.get(midi) === token) {
      this.held.delete(midi);
      this.engine.releaseNote(midi, 'pad');
    }
  }

  private beginChord(startAt: number) {
    const preset =
      this.config.customProgression && this.config.customProgression.id === this.config.progressionId
        ? this.config.customProgression
        : getProgression(this.config.progressionId);
    if (preset.chords.length === 0) return;
    if (this.chordIndex >= preset.chords.length) this.chordIndex = 0;
    const chord = preset.chords[this.chordIndex];
    const index = this.chordIndex;
    const beatMs = 60000 / Math.max(30, this.config.bpm);

    const rootPc = (keySemitone(this.config.key) + chord.offset) % 12;
    const voiced = voiceChord(rootPc, chord.quality, this.prevMean);
    this.prevMean = voiced.meanUpper;

    // Crossfade previous pad chord out smoothly as the new pad chord swells in
    this.held.forEach((m) => this.engine.releaseNote(m, 'pad'));
    this.held.clear();
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