// Piano tone presets. Each one reshapes the felt-piano layer of the audio engine.
// "felt" reproduces the original sound exactly, so existing scenes sound the same.

export interface PianoToneParams {
  triGain: number; // triangle oscillator level (body)
  sineGain: number; // sine oscillator level (warmth)
  harmGain: number; // upper partial level (sparkle)
  harmMult: number; // upper partial = fundamental x this (2 = octave, 4 = two octaves)
  filterQ: number; // low-pass resonance
  warmMul: number; // resting filter cutoff = note frequency x this
  brightness: number; // overall brightness multiplier (1 = normal)
  attack: number; // seconds to reach full level
  peak: number; // loudness of the strike
  decayBase: number; // seconds of decay for a low note
  decayMin: number; // shortest decay (high notes)
  decaySlope: number; // how much faster high notes decay
  decayLevel: number; // level the note settles to after the decay (0-1 of peak)
  filterDecay: number; // seconds for the bright strike to relax
  release: number; // seconds to fade after the key is released
  pitchShift: number; // semitones (12 = one octave up)
  strike: number; // extra brightness of the first hit only (1 = normal, higher = harder attack)
  triType: 'triangle' | 'sawtooth'; // body waveform (sawtooth = harder, more present)
}

export interface PianoTonePreset {
  id: string;
  name: string;
  description: string;
  params: PianoToneParams;
}

export const PIANO_TONES: PianoTonePreset[] = [
  {
    id: 'felt',
    name: 'Felt Piano',
    description: 'The original soft, intimate felt piano.',
    params: {
      triGain: 0.52,
      sineGain: 0.36,
      harmGain: 0.11,
      harmMult: 2,
      filterQ: 0.65,
      warmMul: 2.2,
      brightness: 1,
      attack: 0.01,
      peak: 0.34,
      decayBase: 4.6,
      decayMin: 1.8,
      decaySlope: 0.045,
      decayLevel: 0.18,
      filterDecay: 0.19,
      release: 0.38,
      pitchShift: 0,
      strike: 1,
      triType: 'triangle',
    },
  },
  {
    id: 'worship-live',
    name: 'Live Worship Piano',
    description: 'Clear, present notes with a firm hit that cut through pads. A good all-round live sound.',
    params: {
      triGain: 0.55,
      sineGain: 0.3,
      harmGain: 0.22,
      harmMult: 2,
      filterQ: 0.9,
      warmMul: 2.8,
      brightness: 1.35,
      attack: 0.004,
      peak: 0.42,
      decayBase: 4.2,
      decayMin: 1.4,
      decaySlope: 0.05,
      decayLevel: 0.12,
      filterDecay: 0.13,
      release: 0.32,
      pitchShift: 0,
      strike: 1.35,
      triType: 'triangle',
    },
  },
  {
    id: 'hard-hammer',
    name: 'Hard Hammer Piano',
    description: 'A hard, percussive strike that rings out clearly over soft pads.',
    params: {
      triGain: 0.6,
      sineGain: 0.28,
      harmGain: 0.3,
      harmMult: 2,
      filterQ: 1.0,
      warmMul: 2.6,
      brightness: 1.6,
      attack: 0.003,
      peak: 0.5,
      decayBase: 2.8,
      decayMin: 0.9,
      decaySlope: 0.06,
      decayLevel: 0.08,
      filterDecay: 0.1,
      release: 0.25,
      pitchShift: 0,
      strike: 1.7,
      triType: 'triangle',
    },
  },
  {
    id: 'punchy-pop',
    name: 'Punchy Pop Keys',
    description: 'Bright and edgy with a quick bite. Modern, driving feel.',
    params: {
      triGain: 0.3,
      sineGain: 0.45,
      harmGain: 0.2,
      harmMult: 2,
      filterQ: 1.1,
      warmMul: 3.0,
      brightness: 1.3,
      attack: 0.004,
      peak: 0.42,
      decayBase: 3.4,
      decayMin: 1.0,
      decaySlope: 0.06,
      decayLevel: 0.12,
      filterDecay: 0.16,
      release: 0.3,
      pitchShift: 0,
      strike: 1.5,
      triType: 'sawtooth',
    },
  },
  {
    id: 'warm-grand',
    name: 'Warm Grand',
    description: 'Rounder and fuller, with a long ring. Good for slow worship.',
    params: {
      triGain: 0.4,
      sineGain: 0.46,
      harmGain: 0.16,
      harmMult: 2,
      filterQ: 0.7,
      warmMul: 2.6,
      brightness: 1.25,
      attack: 0.008,
      peak: 0.36,
      decayBase: 6.5,
      decayMin: 2.6,
      decaySlope: 0.05,
      decayLevel: 0.22,
      filterDecay: 0.26,
      release: 0.55,
      pitchShift: 0,
      strike: 1,
      triType: 'triangle',
    },
  },
  {
    id: 'soft-ambient',
    name: 'Soft Ambient Keys',
    description: 'Very gentle and dark, with a soft start. Great under prayer or speaking.',
    params: {
      triGain: 0.3,
      sineGain: 0.62,
      harmGain: 0.05,
      harmMult: 2,
      filterQ: 0.5,
      warmMul: 1.6,
      brightness: 0.7,
      attack: 0.09,
      peak: 0.3,
      decayBase: 7.5,
      decayMin: 3.5,
      decaySlope: 0.04,
      decayLevel: 0.35,
      filterDecay: 0.6,
      release: 1.1,
      pitchShift: 0,
      strike: 1,
      triType: 'triangle',
    },
  },
  {
    id: 'bright-upright',
    name: 'Bright Upright',
    description: 'Clear and present, with a shorter decay. Cuts through at a gathering.',
    params: {
      triGain: 0.58,
      sineGain: 0.22,
      harmGain: 0.24,
      harmMult: 2,
      filterQ: 0.9,
      warmMul: 3.2,
      brightness: 1.6,
      attack: 0.006,
      peak: 0.36,
      decayBase: 3.2,
      decayMin: 1.1,
      decaySlope: 0.05,
      decayLevel: 0.1,
      filterDecay: 0.14,
      release: 0.28,
      pitchShift: 0,
      strike: 1,
      triType: 'triangle',
    },
  },
  {
    id: 'mellow-keys',
    name: 'Mellow Keys',
    description: 'A smooth electric-piano feel with a soft bell on top.',
    params: {
      triGain: 0.2,
      sineGain: 0.62,
      harmGain: 0.26,
      harmMult: 2,
      filterQ: 0.8,
      warmMul: 2.0,
      brightness: 1.1,
      attack: 0.012,
      peak: 0.34,
      decayBase: 5.5,
      decayMin: 2.2,
      decaySlope: 0.04,
      decayLevel: 0.3,
      filterDecay: 0.35,
      release: 0.45,
      pitchShift: 0,
      strike: 1,
      triType: 'triangle',
    },
  },
  {
    id: 'music-box',
    name: 'Music Box',
    description: 'Sparkling and delicate, one octave higher. Lovely for children or lullabies.',
    params: {
      triGain: 0.05,
      sineGain: 0.8,
      harmGain: 0.3,
      harmMult: 4,
      filterQ: 0.6,
      warmMul: 3.5,
      brightness: 1.4,
      attack: 0.004,
      peak: 0.3,
      decayBase: 2.4,
      decayMin: 0.9,
      decaySlope: 0.05,
      decayLevel: 0.06,
      filterDecay: 0.1,
      release: 0.25,
      pitchShift: 12,
      strike: 1,
      triType: 'triangle',
    },
  },
];

export const DEFAULT_PIANO_TONE_ID = 'felt';

export function getPianoTone(id: string): PianoTonePreset {
  return PIANO_TONES.find((t) => t.id === id) ?? PIANO_TONES[0];
}