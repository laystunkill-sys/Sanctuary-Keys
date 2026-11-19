import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Music2, Play, Square } from 'lucide-react';
import type { WorshipAudioEngine } from '../audio/WorshipAudioEngine';
import { DEFAULT_PIANO_TONE_ID, PIANO_TONES, getPianoTone } from '../audio/pianoTones';
import {
  DEFAULT_PLAYER_CONFIG,
  PLAY_STYLES,
  PROGRESSIONS,
  PlayStyle,
  ProgressionPlayer,
  getProgression,
  progressionLabels,
} from '../audio/ProgressionPlayer';
import { MusicalKey } from '../types/synth';

const STORAGE_KEY = 'sanctuarykeys_bgmusic_v1';

interface SavedSettings {
  progressionId: string;
  style: PlayStyle;
  bpm: number;
  beatsPerChord: number;
  level: number;
  padLayer: boolean;
  padLevel: number;
  toneId: string;
}

const DEFAULT_SETTINGS: SavedSettings = {
  progressionId: DEFAULT_PLAYER_CONFIG.progressionId,
  style: DEFAULT_PLAYER_CONFIG.style,
  bpm: DEFAULT_PLAYER_CONFIG.bpm,
  beatsPerChord: DEFAULT_PLAYER_CONFIG.beatsPerChord,
  level: DEFAULT_PLAYER_CONFIG.level,
  padLayer: DEFAULT_PLAYER_CONFIG.padLayer,
  padLevel: DEFAULT_PLAYER_CONFIG.padLevel,
  toneId: DEFAULT_PIANO_TONE_ID,
};

// One-tap sounds: tone + style + pads + tempo together
const QUICK_SOUNDS: { id: string; name: string; note: string; settings: Partial<SavedSettings> }[] = [
  {
    id: 'live',
    name: 'Live Worship',
    note: 'Firm, clear piano with pads underneath',
    settings: { toneId: 'worship-live', style: 'pulse', padLayer: true, padLevel: 0.6, bpm: 72, level: 0.75, beatsPerChord: 4 },
  },
  {
    id: 'hard',
    name: 'Hard Piano + Pads',
    note: 'Hard hammer strike over soft pads',
    settings: { toneId: 'hard-hammer', style: 'pulse', padLayer: true, padLevel: 0.55, bpm: 68, level: 0.8, beatsPerChord: 4 },
  },
  {
    id: 'calm',
    name: 'Soft & Calm',
    note: 'Gentle keys with warm pads',
    settings: { toneId: 'soft-ambient', style: 'block', padLayer: true, padLevel: 0.7, bpm: 56, level: 0.5, beatsPerChord: 8 },
  },
];

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw);
    return {
      progressionId: PROGRESSIONS.some((x) => x.id === p.progressionId)
        ? p.progressionId
        : DEFAULT_SETTINGS.progressionId,
      style: PLAY_STYLES.some((x) => x.id === p.style) ? p.style : DEFAULT_SETTINGS.style,
      bpm: Math.min(100, Math.max(40, Number(p.bpm) || DEFAULT_SETTINGS.bpm)),
      beatsPerChord: p.beatsPerChord === 8 ? 8 : 4,
      level: Math.min(1, Math.max(0.2, Number(p.level) || DEFAULT_SETTINGS.level)),
      padLayer: typeof p.padLayer === 'boolean' ? p.padLayer : DEFAULT_SETTINGS.padLayer,
      padLevel: Math.min(1, Math.max(0.2, Number(p.padLevel) || DEFAULT_SETTINGS.padLevel)),
      toneId: PIANO_TONES.some((x) => x.id === p.toneId) ? p.toneId : DEFAULT_SETTINGS.toneId,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface BackgroundMusicPanelProps {
  engine: WorshipAudioEngine;
  droneKey: MusicalKey;
}

export function BackgroundMusicPanel({ engine, droneKey }: BackgroundMusicPanelProps) {
  const [settings, setSettings] = useState<SavedSettings>(loadSettings);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeChord, setActiveChord] = useState(-1);

  const playerRef = useRef<ProgressionPlayer | null>(null);
  if (!playerRef.current) {
    playerRef.current = new ProgressionPlayer(engine);
  }
  const player = playerRef.current;

  const progression = getProgression(settings.progressionId);
  const labels = useMemo(() => progressionLabels(progression, droneKey), [progression, droneKey]);
  const tone = getPianoTone(settings.toneId);
  const style = PLAY_STYLES.find((s) => s.id === settings.style) ?? PLAY_STYLES[0];

  // Keep the player and the engine in step with the settings
  useEffect(() => {
    player.setConfig({
      progressionId: settings.progressionId,
      style: settings.style,
      bpm: settings.bpm,
      beatsPerChord: settings.beatsPerChord,
      level: settings.level,
      padLayer: settings.padLayer,
      padLevel: settings.padLevel,
      key: droneKey,
    });
  }, [player, settings, droneKey]);

  useEffect(() => {
    engine.setPianoTone(settings.toneId);
  }, [engine, settings.toneId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
  }, [settings]);

  // Stop when the Panic button is used, and when this panel goes away
  useEffect(() => {
    player.onChordChange = (index) => {
      setActiveChord(index);
      setPlaying(index >= 0);
    };
    const unsubscribe = engine.addPanicListener(() => player.stop());
    return () => {
      unsubscribe();
      player.onChordChange = undefined;
      player.stop();
    };
  }, [engine, player]);

  const update = (partial: Partial<SavedSettings>) => setSettings((s) => ({ ...s, ...partial }));

  const handleTogglePlay = async () => {
    if (player.isPlaying()) {
      player.stop();
    } else {
      await player.start();
    }
  };

  const majorList = PROGRESSIONS.filter((p) => p.mode === 'major');
  const minorList = PROGRESSIONS.filter((p) => p.mode === 'minor');

  return (
    <section
      aria-label="Background Music"
      className="flex flex-col gap-2.5 p-3 lg:px-4 lg:py-3 bg-[#151f32] border border-slate-800 rounded-lg shrink-0"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Music2 className="w-4 h-4 text-cyan-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Background Music
            </h2>
            <p className="text-xs font-mono text-slate-400 truncate">
              {progression.name} · Key {droneKey} · {settings.bpm} BPM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleTogglePlay()}
            aria-pressed={playing}
            aria-label={playing ? 'Stop background music' : 'Play background music'}
            className={`inline-flex items-center justify-center gap-1.5 px-3 min-h-11 rounded-md text-sm font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              playing
                ? 'bg-red-500/90 hover:bg-red-400 text-white'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {playing ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{playing ? 'Stop' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Hide background music settings' : 'Show background music settings'}
            className={`inline-flex items-center justify-center w-11 min-h-11 rounded-md border cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              open
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Chord progression">
        {labels.map((label, i) => (
          <li
            key={`${label}-${i}`}
            aria-current={i === activeChord ? 'true' : undefined}
            className={`px-2.5 py-1 rounded-md border text-sm font-mono font-semibold ${
              i === activeChord
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
                : 'bg-[#0f172a]/80 border-slate-800 text-slate-300'
            }`}
          >
            {label}
            <span className="ml-1.5 text-[10px] text-slate-500">{progression.chords[i].numeral}</span>
          </li>
        ))}
      </ol>

      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Quick sounds</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" role="group" aria-label="Quick sounds">
              {QUICK_SOUNDS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => update(q.settings)}
                  className="flex flex-col items-start text-left min-h-11 px-3 py-1.5 rounded-md border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  <span className="text-xs font-semibold text-cyan-100">{q.name}</span>
                  <span className="text-[11px] text-slate-400">{q.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="bg-progression" className="text-xs font-semibold text-slate-200">
              Chord progression
            </label>
            <select
              id="bg-progression"
              value={settings.progressionId}
              onChange={(e) => update({ progressionId: e.target.value })}
              className="min-h-11 px-3 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-2 focus:outline-cyan-400"
            >
              <optgroup label="Major (bright, hopeful)">
                {majorList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Minor (deep, reverent)">
                {minorList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-500">
              {progression.description} Plays in the key chosen on the key grid.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Style</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="group" aria-label="Playing style">
              {PLAY_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => update({ style: st.id })}
                  aria-pressed={settings.style === st.id}
                  className={`min-h-11 px-2 rounded-md border text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    settings.style === st.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{style.description}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Piano tone</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="group" aria-label="Piano tone">
              {PIANO_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => update({ toneId: t.id })}
                  aria-pressed={settings.toneId === t.id}
                  className={`min-h-11 px-2 rounded-md border text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    settings.toneId === t.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {tone.description} The tone also applies when you play the keyboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="bg-tempo" className="text-xs font-semibold text-slate-200">
                  Tempo
                </label>
                <span className="text-sm font-mono font-semibold tabular-nums text-cyan-300">
                  {settings.bpm} BPM
                </span>
              </div>
              <input
                id="bg-tempo"
                type="range"
                min={40}
                max={100}
                step={1}
                value={settings.bpm}
                onChange={(e) => update({ bpm: parseInt(e.target.value, 10) })}
                className="stage-slider stage-slider-amber w-full h-7"
              />
            </div>

            <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="bg-level" className="text-xs font-semibold text-slate-200">
                  Softness / Level
                </label>
                <span className="text-sm font-mono font-semibold tabular-nums text-cyan-300">
                  {Math.round(settings.level * 100)}%
                </span>
              </div>
              <input
                id="bg-level"
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={settings.level}
                onChange={(e) => update({ level: parseFloat(e.target.value) })}
                className="stage-slider stage-slider-amber w-full h-7"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-200">Pads underneath</span>
                <p className="text-[11px] text-slate-500">
                  A soft pad holds each chord while the piano plays on top.
                </p>
              </div>
              <button
                type="button"
                onClick={() => update({ padLayer: !settings.padLayer })}
                aria-pressed={settings.padLayer}
                className={`min-h-11 px-4 rounded-md border text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  settings.padLayer
                    ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {settings.padLayer ? 'Pads ON' : 'Pads OFF'}
              </button>
            </div>
            {settings.padLayer && (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="bg-pad-level" className="text-xs font-semibold text-slate-200">
                    Pad level
                  </label>
                  <span className="text-sm font-mono font-semibold tabular-nums text-cyan-300">
                    {Math.round(settings.padLevel * 100)}%
                  </span>
                </div>
                <input
                  id="bg-pad-level"
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={settings.padLevel}
                  onChange={(e) => update({ padLevel: parseFloat(e.target.value) })}
                  className="stage-slider stage-slider-amber w-full h-7"
                />
                <p className="text-[11px] text-slate-500">
                  The pad also follows the Warm Pad fader and the pad attack and release settings.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Time on each chord</span>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Chord length">
              {[
                { beats: 4, label: '1 bar (4 beats)' },
                { beats: 8, label: '2 bars (8 beats)' },
              ].map((opt) => (
                <button
                  key={opt.beats}
                  type="button"
                  onClick={() => update({ beatsPerChord: opt.beats })}
                  aria-pressed={settings.beatsPerChord === opt.beats}
                  className={`min-h-11 px-2 rounded-md border text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    settings.beatsPerChord === opt.beats
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}