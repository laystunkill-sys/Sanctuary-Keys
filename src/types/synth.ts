export type MusicalKey =
  | 'C'
  | 'C#'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B';

export const MUSICAL_KEYS: { key: MusicalKey; semitone: number; label: string }[] = [
  { key: 'C', semitone: 0, label: 'C' },
  { key: 'C#', semitone: 1, label: 'C#' },
  { key: 'D', semitone: 2, label: 'D' },
  { key: 'Eb', semitone: 3, label: 'Eb' },
  { key: 'E', semitone: 4, label: 'E' },
  { key: 'F', semitone: 5, label: 'F' },
  { key: 'F#', semitone: 6, label: 'F#' },
  { key: 'G', semitone: 7, label: 'G' },
  { key: 'Ab', semitone: 8, label: 'Ab' },
  { key: 'A', semitone: 9, label: 'A' },
  { key: 'Bb', semitone: 10, label: 'Bb' },
  { key: 'B', semitone: 11, label: 'B' },
];

export type ChannelId = 'feltPiano' | 'warmPad' | 'highShimmer' | 'subBass' | 'keyDrone';

export interface ChannelState {
  id: ChannelId;
  label: string;
  shortLabel: string;
  accent: 'amber' | 'cyan';
  gain: number; // 0..1
  muted: boolean;
  soloed: boolean;
}

export interface ShapingParams {
  filterCutoff: number; // 120..12000 Hz
  masterSwell: number; // 0..1
  reverbMix: number; // 0..1
  reverbDecay: number; // 2..10 seconds
  padAttack: number; // 0.5..2.0 seconds
  padRelease: number; // 1.5..5.0 seconds
}

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  isFactory: boolean;
  channels: Record<ChannelId, number>;
  shaping: {
    filterCutoff: number;
    reverbMix: number;
    padAttack: number;
    padRelease: number;
  };
}

export const INITIAL_CHANNELS: Record<ChannelId, ChannelState> = {
  feltPiano: {
    id: 'feltPiano',
    label: 'Felt Piano',
    shortLabel: 'PIANO',
    accent: 'amber',
    gain: 0.78,
    muted: false,
    soloed: false,
  },
  warmPad: {
    id: 'warmPad',
    label: 'Warm Pad',
    shortLabel: 'PAD',
    accent: 'amber',
    gain: 0.65,
    muted: false,
    soloed: false,
  },
  highShimmer: {
    id: 'highShimmer',
    label: 'High Shimmer',
    shortLabel: 'SHIMMER',
    accent: 'cyan',
    gain: 0.42,
    muted: false,
    soloed: false,
  },
  subBass: {
    id: 'subBass',
    label: 'Sub-Bass',
    shortLabel: 'SUB',
    accent: 'amber',
    gain: 0.52,
    muted: false,
    soloed: false,
  },
  keyDrone: {
    id: 'keyDrone',
    label: 'Key Drone',
    shortLabel: 'DRONE',
    accent: 'cyan',
    gain: 0.48,
    muted: false,
    soloed: false,
  },
};

export const INITIAL_SHAPING: ShapingParams = {
  filterCutoff: 3800,
  masterSwell: 0.85,
  reverbMix: 0.48,
  reverbDecay: 5.5,
  padAttack: 1.0,
  padRelease: 2.8,
};

export const FACTORY_SCENES: ScenePreset[] = [
  {
    id: 'intimate-prayer',
    name: 'Intimate Prayer',
    description: 'Dark felt piano with soft low-passed pad & gentle drone',
    isFactory: true,
    channels: {
      feltPiano: 0.85,
      warmPad: 0.36,
      highShimmer: 0.14,
      subBass: 0.3,
      keyDrone: 0.42,
    },
    shaping: {
      filterCutoff: 1350,
      reverbMix: 0.44,
      padAttack: 1.4,
      padRelease: 3.2,
    },
  },
  {
    id: 'warm-verse',
    name: 'Warm Verse',
    description: 'Balanced piano & analog pad foundation for verse dynamics',
    isFactory: true,
    channels: {
      feltPiano: 0.78,
      warmPad: 0.62,
      highShimmer: 0.35,
      subBass: 0.5,
      keyDrone: 0.45,
    },
    shaping: {
      filterCutoff: 3400,
      reverbMix: 0.46,
      padAttack: 1.0,
      padRelease: 2.6,
    },
  },
  {
    id: 'big-chorus',
    name: 'Big Chorus',
    description: 'Wide open filter, soaring shimmer, deep sub & full pad',
    isFactory: true,
    channels: {
      feltPiano: 0.86,
      warmPad: 0.88,
      highShimmer: 0.74,
      subBass: 0.78,
      keyDrone: 0.58,
    },
    shaping: {
      filterCutoff: 9600,
      reverbMix: 0.58,
      padAttack: 0.65,
      padRelease: 3.4,
    },
  },
  {
    id: 'ambient-transition',
    name: 'Ambient Transition',
    description: 'Spacious washed-out pad, celestial shimmer & cathedral drone',
    isFactory: true,
    channels: {
      feltPiano: 0.28,
      warmPad: 0.84,
      highShimmer: 0.82,
      subBass: 0.45,
      keyDrone: 0.74,
    },
    shaping: {
      filterCutoff: 2400,
      reverbMix: 0.78,
      padAttack: 1.8,
      padRelease: 4.8,
    },
  },
];

export const CUSTOM_SCENES_STORAGE_KEY = 'sanctuarykeys_custom_scenes_v1';

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export type ScaleMode = 'major' | 'minor';

export type ChordVoicingType =
  | 'auto'
  | 'major'
  | 'minor'
  | 'sus2'
  | 'sus4'
  | 'maj7'
  | 'm7'
  | 'add9'
  | 'madd9'
  | 'maj6'
  | 'open5'
  | 'octave';

export const CHORD_VOICING_OPTIONS: { id: ChordVoicingType; label: string }[] = [
  { id: 'auto', label: 'Auto (Key)' },
  { id: 'major', label: 'Major' },
  { id: 'minor', label: 'Minor' },
  { id: 'sus2', label: 'sus2' },
  { id: 'sus4', label: 'sus4' },
  { id: 'maj7', label: 'maj7' },
  { id: 'm7', label: 'm7' },
  { id: 'add9', label: 'add9' },
  { id: 'madd9', label: 'm(add9)' },
  { id: 'maj6', label: 'maj6' },
  { id: 'open5', label: 'Open 5th' },
  { id: 'octave', label: 'Octave' },
];

export interface OneClickChordPad {
  id: string;
  label: string;
  subLabel: string;
  notes: number[];
}

// Open-voiced interval formulas (in semitones from root) tailored for lush ambient pads
// Avoiding tight low-mid clusters so 3rds/7ths/9ths bloom clearly without mud
export function getOpenChordVoicing(rootMidi: number, voicing: Exclude<ChordVoicingType, 'auto'>): number[] {
  switch (voicing) {
    case 'major':
      // 1 - 5 - 8 - 10 (open major triad)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 16];
    case 'minor':
      // 1 - 5 - 8 - b10 (open minor triad)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 15];
    case 'sus2':
      // 1 - 5 - 8 - 9 (open suspended 2nd)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 14];
    case 'sus4':
      // 1 - 5 - 8 - 11 (open suspended 4th)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 17];
    case 'maj7':
      // 1 - 5 - 7 - 10 (open major 7th)
      return [rootMidi, rootMidi + 7, rootMidi + 11, rootMidi + 16];
    case 'm7':
      // 1 - 5 - b7 - b10 (open minor 7th)
      return [rootMidi, rootMidi + 7, rootMidi + 10, rootMidi + 15];
    case 'add9':
      // 1 - 5 - 8 - 9 - 10 (open add9 worship voicing)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 14, rootMidi + 16];
    case 'madd9':
      // 1 - 5 - 8 - 9 - b10 (open minor add9 voicing)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 14, rootMidi + 15];
    case 'maj6':
      // 1 - 5 - 6 - 10 (open major 6th)
      return [rootMidi, rootMidi + 7, rootMidi + 9, rootMidi + 16];
    case 'open5':
      // 1 - 5 - 8 - 12 (open-voiced fifths across two octaves)
      return [rootMidi, rootMidi + 7, rootMidi + 12, rootMidi + 19];
    case 'octave':
      // 1 - 8 - 15 (pure open octaves)
      return [rootMidi, rootMidi + 12, rootMidi + 24];
  }
}

// Compute a lush 1-finger open worship chord voicing relative to the active Drone Key, scale mode, or explicit voicing.
export function getWorshipChordNotes(
  rootMidi: number,
  droneKey: MusicalKey,
  voicing: ChordVoicingType = 'auto',
  scaleMode: ScaleMode = 'major',
): number[] {
  if (voicing !== 'auto') {
    return getOpenChordVoicing(rootMidi, voicing);
  }

  const keyEntry = MUSICAL_KEYS.find((k) => k.key === droneKey);
  const keySemitone = keyEntry ? keyEntry.semitone : 0;
  const degree = (((rootMidi % 12) - keySemitone) + 12) % 12;

  if (scaleMode === 'minor') {
    switch (degree) {
      case 0: // i m(add9)
        return getOpenChordVoicing(rootMidi, 'madd9');
      case 2: // ii sus2
        return getOpenChordVoicing(rootMidi, 'sus2');
      case 3: // bIII maj7
        return getOpenChordVoicing(rootMidi, 'maj7');
      case 5: // iv m7
        return getOpenChordVoicing(rootMidi, 'm7');
      case 7: // v m7
        return getOpenChordVoicing(rootMidi, 'm7');
      case 8: // bVI maj7
        return getOpenChordVoicing(rootMidi, 'maj7');
      case 10: // bVII add9
        return getOpenChordVoicing(rootMidi, 'add9');
      default:
        return getOpenChordVoicing(rootMidi, 'sus2');
    }
  }

  switch (degree) {
    case 0: // I add9
      return getOpenChordVoicing(rootMidi, 'add9');
    case 2: // ii m7
      return getOpenChordVoicing(rootMidi, 'm7');
    case 4: // iii m7
      return getOpenChordVoicing(rootMidi, 'm7');
    case 5: // IV maj7
      return getOpenChordVoicing(rootMidi, 'maj7');
    case 7: // V sus4
      return getOpenChordVoicing(rootMidi, 'sus4');
    case 9: // vi m7
      return getOpenChordVoicing(rootMidi, 'm7');
    default:
      return getOpenChordVoicing(rootMidi, 'sus2');
  }
}

function semitoneToNoteLabel(semitone: number): string {
  return NOTE_NAMES[((semitone % 12) + 12) % 12];
}

// Generate 12 instant one-click pad chord buttons transposed to the active musical key & Major/Minor mode
export function getOneClickPadChords(
  droneKey: MusicalKey,
  scaleMode: ScaleMode = 'major',
): OneClickChordPad[] {
  const keyEntry = MUSICAL_KEYS.find((k) => k.key === droneKey);
  const keySemi = keyEntry ? keyEntry.semitone : 0;
  // Base tonic in octave 3 (C3=48..G3=55, Ab2=44..B2=47) for rich warm pad foundation
  const tonicBase = keySemi >= 8 ? 36 + keySemi : 48 + keySemi;

  const noteAtDegree = (deg: number) => {
    const raw = tonicBase + deg;
    return raw < 46 ? raw + 12 : raw > 60 ? raw - 12 : raw;
  };

  const degName = (deg: number) => semitoneToNoteLabel(keySemi + deg);

  if (scaleMode === 'minor') {
    return [
      {
        id: 'pad-i-minor',
        label: `${degName(0)}m`,
        subLabel: 'i Minor',
        notes: getOpenChordVoicing(noteAtDegree(0), 'minor'),
      },
      {
        id: 'pad-i-sus2',
        label: `${degName(0)}sus2`,
        subLabel: 'i sus2',
        notes: getOpenChordVoicing(noteAtDegree(0), 'sus2'),
      },
      {
        id: 'pad-i-sus4',
        label: `${degName(0)}sus4`,
        subLabel: 'i sus4',
        notes: getOpenChordVoicing(noteAtDegree(0), 'sus4'),
      },
      {
        id: 'pad-i-m7',
        label: `${degName(0)}m7`,
        subLabel: 'i m7',
        notes: getOpenChordVoicing(noteAtDegree(0), 'm7'),
      },
      {
        id: 'pad-i-madd9',
        label: `${degName(0)}m(add9)`,
        subLabel: 'i madd9',
        notes: getOpenChordVoicing(noteAtDegree(0), 'madd9'),
      },
      {
        id: 'pad-bIII-maj7',
        label: `${degName(3)}maj7`,
        subLabel: 'bIII maj7',
        notes: getOpenChordVoicing(noteAtDegree(3), 'maj7'),
      },
      {
        id: 'pad-iv-m7',
        label: `${degName(5)}m7`,
        subLabel: 'iv m7',
        notes: getOpenChordVoicing(noteAtDegree(5), 'm7'),
      },
      {
        id: 'pad-v-m7',
        label: `${degName(7)}m7`,
        subLabel: 'v m7',
        notes: getOpenChordVoicing(noteAtDegree(7), 'm7'),
      },
      {
        id: 'pad-bVI-maj7',
        label: `${degName(8)}maj7`,
        subLabel: 'bVI maj7',
        notes: getOpenChordVoicing(noteAtDegree(8), 'maj7'),
      },
      {
        id: 'pad-bVII-sus2',
        label: `${degName(10)}sus2`,
        subLabel: 'bVII sus2',
        notes: getOpenChordVoicing(noteAtDegree(10), 'sus2'),
      },
      {
        id: 'pad-i-open5',
        label: `${degName(0)}5`,
        subLabel: 'Open 5th',
        notes: getOpenChordVoicing(noteAtDegree(0), 'open5'),
      },
      {
        id: 'pad-i-octave',
        label: `${degName(0)} Oct`,
        subLabel: 'Octaves',
        notes: getOpenChordVoicing(noteAtDegree(0), 'octave'),
      },
    ];
  }

  return [
    {
      id: 'pad-I-major',
      label: `${degName(0)} Maj`,
      subLabel: 'I Major',
      notes: getOpenChordVoicing(noteAtDegree(0), 'major'),
    },
    {
      id: 'pad-I-sus2',
      label: `${degName(0)}sus2`,
      subLabel: 'I sus2',
      notes: getOpenChordVoicing(noteAtDegree(0), 'sus2'),
    },
    {
      id: 'pad-I-sus4',
      label: `${degName(0)}sus4`,
      subLabel: 'I sus4',
      notes: getOpenChordVoicing(noteAtDegree(0), 'sus4'),
    },
    {
      id: 'pad-I-maj7',
      label: `${degName(0)}maj7`,
      subLabel: 'I maj7',
      notes: getOpenChordVoicing(noteAtDegree(0), 'maj7'),
    },
    {
      id: 'pad-I-add9',
      label: `${degName(0)}add9`,
      subLabel: 'I add9',
      notes: getOpenChordVoicing(noteAtDegree(0), 'add9'),
    },
    {
      id: 'pad-I-maj6',
      label: `${degName(0)}maj6`,
      subLabel: 'I maj6',
      notes: getOpenChordVoicing(noteAtDegree(0), 'maj6'),
    },
    {
      id: 'pad-ii-m7',
      label: `${degName(2)}m7`,
      subLabel: 'ii m7',
      notes: getOpenChordVoicing(noteAtDegree(2), 'm7'),
    },
    {
      id: 'pad-IV-maj7',
      label: `${degName(5)}maj7`,
      subLabel: 'IV maj7',
      notes: getOpenChordVoicing(noteAtDegree(5), 'maj7'),
    },
    {
      id: 'pad-V-sus4',
      label: `${degName(7)}sus4`,
      subLabel: 'V sus4',
      notes: getOpenChordVoicing(noteAtDegree(7), 'sus4'),
    },
    {
      id: 'pad-vi-m7',
      label: `${degName(9)}m7`,
      subLabel: 'vi m7',
      notes: getOpenChordVoicing(noteAtDegree(9), 'm7'),
    },
    {
      id: 'pad-I-open5',
      label: `${degName(0)}5`,
      subLabel: 'Open 5th',
      notes: getOpenChordVoicing(noteAtDegree(0), 'open5'),
    },
    {
      id: 'pad-I-octave',
      label: `${degName(0)} Oct`,
      subLabel: 'Octaves',
      notes: getOpenChordVoicing(noteAtDegree(0), 'octave'),
    },
  ];
}

// QWERTY keyboard mapping (relative to baseMidi C4=60, shifted by octaveShift)
export const QWERTY_KEY_MAP: Record<string, { offset: number; label: string }> = {
  KeyA: { offset: 0, label: 'A' }, // C
  KeyW: { offset: 1, label: 'W' }, // C#
  KeyS: { offset: 2, label: 'S' }, // D
  KeyE: { offset: 3, label: 'E' }, // Eb
  KeyD: { offset: 4, label: 'D' }, // E
  KeyF: { offset: 5, label: 'F' }, // F
  KeyT: { offset: 6, label: 'T' }, // F#
  KeyG: { offset: 7, label: 'G' }, // G
  KeyY: { offset: 8, label: 'Y' }, // Ab
  KeyH: { offset: 9, label: 'A' }, // A
  KeyU: { offset: 10, label: 'U' }, // Bb
  KeyJ: { offset: 11, label: 'J' }, // B
  KeyK: { offset: 12, label: 'K' }, // C+1
  KeyO: { offset: 13, label: 'O' }, // C#+1
  KeyL: { offset: 14, label: 'L' }, // D+1
  KeyP: { offset: 15, label: 'P' }, // Eb+1
  Semicolon: { offset: 16, label: ';' }, // E+1
  Quote: { offset: 17, label: "'" }, // F+1
};
