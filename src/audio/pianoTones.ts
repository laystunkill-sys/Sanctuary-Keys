// Acoustic Piano tone presets — full-bodied Concert Acoustic Grand voicing.
// Warm soundboard resonance, deep wound bass strings, wool-felt hammer thump,
// natural string ring, and clean damper release (un-padded).

export interface PianoToneParams {
  waveProfile: 'grand' | 'warm' | 'upright' | 'felt';
  unisonCents: number; // subtle micro-spread between unison grand strings (cents)
  stretchCents: number; // steel-string octave inharmonicity stretch (cents)
  upperMix: number; // initial upper-string harmonic bloom on hammer strike
  upperDecay: number; // how quickly upper string harmonics settle (seconds)
  hammerGain: number; // wool-felt/wood hammer thump level (0..1)
  hammerBrightHz: number; // bandpass center multiplier for hammer body
  filterQ: number; // low-pass resonance
  warmMul: number; // resting filter cutoff = note frequency x this
  brightness: number; // overall harmonic clarity multiplier
  attack: number; // seconds to hammer contact
  peak: number; // strike loudness
  fastDropTime: number; // initial hammer-bounce settling time (seconds)
  fastDropRatio: number; // level ratio after initial string bounce (0..1)
  decayBase: number; // natural string ring for bass notes (seconds)
  decayMin: number; // shortest decay for treble notes (seconds)
  decaySlope: number; // pitch scaling for decay time
  filterDecay: number; // seconds for strike brightness to settle
  release: number; // crisp acoustic damper fade time after key release (seconds)
  strike: number; // strike brightness boost
}

export interface PianoTonePreset {
  id: string;
  name: string;
  description: string;
  params: PianoToneParams;
}

export const PIANO_TONES: PianoTonePreset[] = [
  {
    id: 'acoustic-grand',
    name: 'Acoustic Grand',
    description: 'Full 9-foot concert grand — deep resonant bass, warm wooden body, singing sustain, no pad wash.',
    params: {
      waveProfile: 'grand',
      unisonCents: 0.55,
      stretchCents: 2.6,
      upperMix: 0.24,
      upperDecay: 0.2,
      hammerGain: 0.56,
      hammerBrightHz: 2.4,
      filterQ: 0.5,
      warmMul: 3.3,
      brightness: 1.0,
      attack: 0.0025,
      peak: 0.5,
      fastDropTime: 0.16,
      fastDropRatio: 0.52,
      decayBase: 5.4,
      decayMin: 1.45,
      decaySlope: 0.075,
      filterDecay: 0.22,
      release: 0.26,
      strike: 1.2,
    },
  },
  {
    id: 'live-grand',
    name: 'Bright Stage Grand',
    description: 'Open concert grand with clearer upper-string articulation while keeping full grand bass weight.',
    params: {
      waveProfile: 'grand',
      unisonCents: 0.5,
      stretchCents: 3.0,
      upperMix: 0.32,
      upperDecay: 0.19,
      hammerGain: 0.64,
      hammerBrightHz: 2.9,
      filterQ: 0.52,
      warmMul: 3.8,
      brightness: 1.16,
      attack: 0.002,
      peak: 0.52,
      fastDropTime: 0.14,
      fastDropRatio: 0.48,
      decayBase: 4.8,
      decayMin: 1.3,
      decaySlope: 0.07,
      filterDecay: 0.19,
      release: 0.24,
      strike: 1.32,
    },
  },
  {
    id: 'warm-grand',
    name: 'Warm Studio Grand',
    description: 'Rich, dark-wood close concert grand with generous singing decay.',
    params: {
      waveProfile: 'warm',
      unisonCents: 0.6,
      stretchCents: 2.0,
      upperMix: 0.18,
      upperDecay: 0.22,
      hammerGain: 0.46,
      hammerBrightHz: 2.0,
      filterQ: 0.48,
      warmMul: 2.8,
      brightness: 0.88,
      attack: 0.003,
      peak: 0.48,
      fastDropTime: 0.18,
      fastDropRatio: 0.56,
      decayBase: 5.8,
      decayMin: 1.6,
      decaySlope: 0.075,
      filterDecay: 0.25,
      release: 0.3,
      strike: 1.08,
    },
  },
  {
    id: 'bright-upright',
    name: 'Studio Upright',
    description: 'Woody acoustic upright with focused midrange punch and tighter decay.',
    params: {
      waveProfile: 'upright',
      unisonCents: 0.65,
      stretchCents: 3.4,
      upperMix: 0.28,
      upperDecay: 0.17,
      hammerGain: 0.6,
      hammerBrightHz: 2.7,
      filterQ: 0.54,
      warmMul: 3.5,
      brightness: 1.1,
      attack: 0.0022,
      peak: 0.5,
      fastDropTime: 0.13,
      fastDropRatio: 0.46,
      decayBase: 4.1,
      decayMin: 1.1,
      decaySlope: 0.06,
      filterDecay: 0.18,
      release: 0.2,
      strike: 1.25,
    },
  },
  {
    id: 'felt-piano',
    name: 'Close Felt Upright',
    description: 'Intimate acoustic upright with felt hammer cloth — soft wooden thump and warm body.',
    params: {
      waveProfile: 'felt',
      unisonCents: 0.45,
      stretchCents: 1.6,
      upperMix: 0.12,
      upperDecay: 0.18,
      hammerGain: 0.42,
      hammerBrightHz: 1.7,
      filterQ: 0.46,
      warmMul: 2.4,
      brightness: 0.78,
      attack: 0.004,
      peak: 0.46,
      fastDropTime: 0.18,
      fastDropRatio: 0.52,
      decayBase: 4.5,
      decayMin: 1.35,
      decaySlope: 0.065,
      filterDecay: 0.22,
      release: 0.26,
      strike: 0.96,
    },
  },
];

export const DEFAULT_PIANO_TONE_ID = 'acoustic-grand';

const LEGACY_TONE_ALIASES: Record<string, string> = {
  felt: 'felt-piano',
  'worship-live': 'live-grand',
  'hard-hammer': 'live-grand',
  'soft-ambient': 'warm-grand',
  'punchy-pop': 'bright-upright',
  'mellow-keys': 'warm-grand',
  'music-box': 'acoustic-grand',
};

export function getPianoTone(id: string): PianoTonePreset {
  const resolved = LEGACY_TONE_ALIASES[id] ?? id;
  return PIANO_TONES.find((t) => t.id === resolved) ?? PIANO_TONES[0];
}