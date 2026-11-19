import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Music2, Pencil, Play, Plus, Square, Trash2, X } from 'lucide-react';
import type { WorshipAudioEngine } from '../audio/WorshipAudioEngine';
import {
  CHORD_QUALITIES,
  ChordQuality,
  DEFAULT_PLAYER_CONFIG,
  DEGREE_OPTIONS,
  PLAY_STYLES,
  PROGRESSIONS,
  PlayStyle,
  ProgressionChord,
  ProgressionPlayer,
  ProgressionPreset,
  chordLabel,
  getChordNumeral,
  getProgression,
  progressionLabels,
} from '../audio/ProgressionPlayer';
import { MUSICAL_KEYS, MusicalKey, NOTE_NAMES } from '../types/synth';

const STORAGE_KEY = 'sanctuarykeys_bgmusic_v1';
const CUSTOM_SETS_STORAGE_KEY = 'sanctuarykeys_custom_chord_sets_v1';
const MAX_CUSTOM_CHORDS = 12;

interface SavedSettings {
  progressionId: string;
  style: PlayStyle;
  bpm: number;
  beatsPerChord: number;
  level: number;
}

const DEFAULT_SETTINGS: SavedSettings = {
  progressionId: DEFAULT_PLAYER_CONFIG.progressionId,
  style: DEFAULT_PLAYER_CONFIG.style,
  bpm: DEFAULT_PLAYER_CONFIG.bpm,
  beatsPerChord: DEFAULT_PLAYER_CONFIG.beatsPerChord,
  level: DEFAULT_PLAYER_CONFIG.level,
};

// One-tap pad progression setups
const QUICK_SOUNDS: { id: string; name: string; note: string; settings: Partial<SavedSettings> }[] = [
  {
    id: 'warm-pad',
    name: 'Warm Worship Pad',
    note: 'Smooth 5-note pad chords that bloom and crossfade',
    settings: { style: 'block', bpm: 58, level: 0.7, beatsPerChord: 4 },
  },
  {
    id: 'rolled-pad',
    name: 'Rolled Swell Pad',
    note: 'Ascending pad bloom from deep bass to upper shimmer',
    settings: { style: 'rolled', bpm: 64, level: 0.72, beatsPerChord: 4 },
  },
  {
    id: 'prayer-pad',
    name: 'Deep Prayer Pad',
    note: 'Slow 2-bar swells for quiet prayer and speaking',
    settings: { style: 'block', bpm: 52, level: 0.58, beatsPerChord: 8 },
  },
];

function loadCustomChordSets(): ProgressionPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ProgressionPreset =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Array.isArray(item.chords) &&
        item.chords.length > 0,
    );
  } catch {
    return [];
  }
}

function loadSettings(customSets: ProgressionPreset[]): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw);
    const validProg =
      PROGRESSIONS.some((x) => x.id === p.progressionId) ||
      customSets.some((x) => x.id === p.progressionId);
    return {
      progressionId: validProg ? p.progressionId : DEFAULT_SETTINGS.progressionId,
      style: PLAY_STYLES.some((x) => x.id === p.style) ? p.style : DEFAULT_SETTINGS.style,
      bpm: Math.min(160, Math.max(40, Number(p.bpm) || DEFAULT_SETTINGS.bpm)),
      beatsPerChord: p.beatsPerChord === 8 ? 8 : 4,
      level: Math.min(1, Math.max(0.2, Number(p.level) || DEFAULT_SETTINGS.level)),
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
  const [customSets, setCustomSets] = useState<ProgressionPreset[]>(loadCustomChordSets);
  const [settings, setSettings] = useState<SavedSettings>(() => loadSettings(loadCustomChordSets()));
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeChord, setActiveChord] = useState(-1);

  // Custom Chord Set Editor state
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftChords, setDraftChords] = useState<ProgressionChord[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<ChordQuality>('maj');

  const playerRef = useRef<ProgressionPlayer | null>(null);
  if (!playerRef.current) {
    playerRef.current = new ProgressionPlayer(engine);
  }
  const player = playerRef.current;

  const activeCustomSet = useMemo(
    () => customSets.find((c) => c.id === settings.progressionId) ?? null,
    [customSets, settings.progressionId],
  );
  const progression = activeCustomSet ?? getProgression(settings.progressionId);
  const labels = useMemo(() => progressionLabels(progression, droneKey), [progression, droneKey]);
  const style = PLAY_STYLES.find((s) => s.id === settings.style) ?? PLAY_STYLES[0];
  const keySemi = MUSICAL_KEYS.find((k) => k.key === droneKey)?.semitone ?? 0;

  // Keep the player in step with the settings
  useEffect(() => {
    player.setConfig({
      progressionId: settings.progressionId,
      customProgression: activeCustomSet,
      style: settings.style,
      bpm: settings.bpm,
      beatsPerChord: settings.beatsPerChord,
      level: settings.level,
      key: droneKey,
    });
  }, [player, settings, activeCustomSet, droneKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_SETS_STORAGE_KEY, JSON.stringify(customSets));
    } catch {
      // Ignore quota errors
    }
  }, [customSets]);

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

  // Custom Chord Set Editor handlers
  const openNewChordSetEditor = () => {
    setEditingSetId(null);
    setDraftName(`Custom Set ${customSets.length + 1}`);
    setDraftChords([]);
    setSelectedQuality('maj');
    setEditorOpen(true);
  };

  const openEditChordSetEditor = () => {
    if (!activeCustomSet) return;
    setEditingSetId(activeCustomSet.id);
    setDraftName(activeCustomSet.name);
    setDraftChords([...activeCustomSet.chords]);
    setSelectedQuality('maj');
    setEditorOpen(true);
  };

  const handleCopyCurrentToDraft = () => {
    setDraftChords(progression.chords.slice(0, MAX_CUSTOM_CHORDS).map((c) => ({ ...c })));
  };

  const handleAddDraftChord = (offset: number) => {
    if (draftChords.length >= MAX_CUSTOM_CHORDS) return;
    const numeral = getChordNumeral(offset, selectedQuality);
    setDraftChords((prev) => [...prev, { offset, quality: selectedQuality, numeral }]);
  };

  const handleRemoveDraftChord = (idx: number) => {
    setDraftChords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveDraftChord = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draftChords.length) return;
    setDraftChords((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSaveCustomSet = () => {
    if (draftChords.length === 0) return;
    const cleanName = draftName.trim() || `Custom Set ${customSets.length + 1}`;
    const summaryChords = draftChords.map((c) => c.numeral).join(' – ');
    if (editingSetId) {
      setCustomSets((prev) =>
        prev.map((item) =>
          item.id === editingSetId
            ? {
                ...item,
                name: cleanName,
                description: `Custom chord set (${summaryChords}).`,
                chords: draftChords,
              }
            : item,
        ),
      );
      update({ progressionId: editingSetId });
    } else {
      const newId = `custom-${Date.now()}`;
      const newSet: ProgressionPreset = {
        id: newId,
        name: cleanName,
        mode: 'custom',
        description: `Custom chord set (${summaryChords}).`,
        chords: draftChords,
      };
      setCustomSets((prev) => [...prev, newSet]);
      update({ progressionId: newId });
    }
    setEditorOpen(false);
    setEditingSetId(null);
  };

  const handleDeleteActiveCustomSet = () => {
    if (!activeCustomSet) return;
    const deletedId = activeCustomSet.id;
    setCustomSets((prev) => prev.filter((item) => item.id !== deletedId));
    update({ progressionId: DEFAULT_PLAYER_CONFIG.progressionId });
    if (editingSetId === deletedId) {
      setEditorOpen(false);
      setEditingSetId(null);
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
              Background Pad Progression
            </h2>
            <p className="text-xs font-mono text-slate-400 truncate">
              {progression.name} · Pad · Key {droneKey} · {settings.bpm} BPM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleTogglePlay()}
            aria-pressed={playing}
            aria-label={playing ? 'Stop background pad progression' : 'Play background pad progression'}
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
            aria-label={open ? 'Hide pad progression settings' : 'Show pad progression settings'}
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
            <span className="text-xs font-semibold text-slate-200">Quick pad setups</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5" role="group" aria-label="Quick pad setups">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="bg-progression" className="text-xs font-semibold text-slate-200">
                Chord progression
              </label>
              <div className="flex items-center gap-1.5">
                {activeCustomSet && (
                  <>
                    <button
                      type="button"
                      onClick={openEditChordSetEditor}
                      className="inline-flex items-center gap-1 min-h-9 px-2.5 rounded-md border border-slate-700 bg-slate-900/70 hover:border-cyan-500/60 text-xs font-semibold text-slate-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteActiveCustomSet}
                      aria-label={`Delete custom chord set ${activeCustomSet.name}`}
                      className="inline-flex items-center gap-1 min-h-9 px-2.5 rounded-md border border-red-900/70 bg-red-950/30 hover:bg-red-900/40 text-xs font-semibold text-red-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={openNewChordSetEditor}
                  className="inline-flex items-center gap-1 min-h-9 px-2.5 rounded-md border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-semibold text-amber-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New Chord Set</span>
                </button>
              </div>
            </div>

            <select
              id="bg-progression"
              value={settings.progressionId}
              onChange={(e) => update({ progressionId: e.target.value })}
              className="min-h-11 px-3 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-2 focus:outline-cyan-400"
            >
              {customSets.length > 0 && (
                <optgroup label="Custom Chord Sets">
                  {customSets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
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
              {progression.description} Plays in the key chosen on the key grid using Warm Pad, Shimmer &amp; Sub-Bass faders.
            </p>
          </div>

          {editorOpen && (
            <div
              role="region"
              aria-label="Custom chord set builder"
              className="flex flex-col gap-3 p-3 bg-[#0f172a]/90 border border-amber-500/40 rounded-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-amber-300">
                  {editingSetId ? 'Edit Custom Chord Set' : 'New Custom Chord Set'}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCurrentToDraft}
                    className="min-h-9 px-2.5 rounded border border-slate-700 bg-slate-900 hover:border-slate-500 text-[11px] font-semibold text-slate-300 cursor-pointer"
                  >
                    Copy Current
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorOpen(false);
                      setEditingSetId(null);
                    }}
                    aria-label="Close chord set editor"
                    className="inline-flex items-center justify-center w-9 h-9 rounded border border-slate-700 bg-slate-900 hover:border-slate-500 text-slate-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="custom-set-name" className="text-[11px] font-semibold text-slate-300">
                  Set name
                </label>
                <input
                  id="custom-set-name"
                  type="text"
                  maxLength={40}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Sunday Bridge or Altar Call"
                  className="min-h-10 px-3 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-2 focus:outline-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Chord sequence ({draftChords.length}/{MAX_CUSTOM_CHORDS}) — Key {droneKey}
                  </span>
                  {draftChords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftChords([])}
                      className="text-[11px] text-slate-400 hover:text-red-300 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {draftChords.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 px-3 rounded border border-dashed border-slate-700">
                    Choose a chord quality below, then tap roots to build your progression.
                  </p>
                ) : (
                  <ol className="flex flex-wrap gap-1.5">
                    {draftChords.map((ch, idx) => (
                      <li
                        key={`${ch.offset}-${ch.quality}-${idx}`}
                        className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                      >
                        <span className="text-[10px] text-slate-500 mr-0.5">{idx + 1}.</span>
                        <span className="font-semibold text-amber-200">{chordLabel(ch, droneKey)}</span>
                        <span className="text-[10px] text-slate-500">{ch.numeral}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveDraftChord(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move chord ${idx + 1} left`}
                          className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDraftChord(idx, 1)}
                          disabled={idx === draftChords.length - 1}
                          aria-label={`Move chord ${idx + 1} right`}
                          className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftChord(idx)}
                          aria-label={`Remove chord ${idx + 1}`}
                          className="p-1 text-slate-400 hover:text-red-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300">1. Pick chord type</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {CHORD_QUALITIES.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setSelectedQuality(q.id)}
                      aria-pressed={selectedQuality === q.id}
                      className={`min-h-10 px-1.5 rounded border text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                        selectedQuality === q.id
                          ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300">
                  2. Tap a chord root to add (transposes automatically with key)
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                  {DEGREE_OPTIONS.map((deg) => {
                    const pc = (keySemi + deg.offset) % 12;
                    const suffix = CHORD_QUALITIES.find((q) => q.id === selectedQuality)?.suffix ?? '';
                    const previewLabel = `${NOTE_NAMES[pc]}${suffix}`;
                    const numeral = getChordNumeral(deg.offset, selectedQuality);
                    const inKeyHighlight = deg.diatonicMajor || deg.diatonicMinor;
                    return (
                      <button
                        key={deg.offset}
                        type="button"
                        disabled={draftChords.length >= MAX_CUSTOM_CHORDS}
                        onClick={() => handleAddDraftChord(deg.offset)}
                        className={`flex flex-col items-center justify-center min-h-11 px-2 py-1 rounded-md border font-mono cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                          inKeyHighlight
                            ? 'bg-slate-900 border-slate-600 hover:border-cyan-400 hover:bg-cyan-500/15 text-slate-100'
                            : 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/60 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-bold">{previewLabel}</span>
                        <span className="text-[10px] text-slate-500">{numeral}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setEditingSetId(null);
                  }}
                  className="min-h-10 px-3.5 rounded-md border border-slate-700 bg-slate-900 hover:border-slate-500 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={draftChords.length === 0}
                  onClick={handleSaveCustomSet}
                  className="min-h-10 px-4 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-950 cursor-pointer"
                >
                  {editingSetId ? 'Save Changes' : 'Save Chord Set'}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-200">Pad style</span>
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
                max={160}
                step={1}
                value={settings.bpm}
                onChange={(e) => update({ bpm: parseInt(e.target.value, 10) })}
                className="stage-slider stage-slider-amber w-full h-7"
              />
            </div>

            <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="bg-level" className="text-xs font-semibold text-slate-200">
                  Pad Level
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