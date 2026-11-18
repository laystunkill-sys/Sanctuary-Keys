import React, { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Lock, Sparkles, X } from 'lucide-react';
import {
  CHORD_VOICING_OPTIONS,
  ChordVoicingType,
  MusicalKey,
  OneClickChordPad,
  ScaleMode,
  getOneClickPadChords,
  midiToNoteName,
} from '../types/synth';

interface KeyboardDeckProps {
  octaveShift: number;
  sustainLatch: boolean;
  spaceSustain: boolean;
  chordMode: boolean;
  chordVoicing: ChordVoicingType;
  scaleMode: ScaleMode;
  droneKey: MusicalKey;
  activeNotes: Set<number>;
  activePadChordId: string | null;
  onOctaveChange: (delta: number) => void;
  onToggleSustainLatch: () => void;
  onToggleChordMode: () => void;
  onSelectChordVoicing: (voicing: ChordVoicingType) => void;
  onSelectScaleMode: (mode: ScaleMode) => void;
  onTriggerOneClickChord: (pad: OneClickChordPad) => void;
  onReleaseOneClickChord: () => void;
  onPressKey: (midi: number) => void;
  onReleaseKey: (midi: number) => void;
}

interface PianoKeyDef {
  offset: number;
  isBlack: boolean;
  whiteIndex: number; // position among 15 white keys (C..C)
  qwertyHint?: string;
}

// 2 full octaves + top C (25 keys total: 15 white, 10 black)
const PIANO_KEYS: PianoKeyDef[] = [
  { offset: 0, isBlack: false, whiteIndex: 0, qwertyHint: 'A' },
  { offset: 1, isBlack: true, whiteIndex: 0, qwertyHint: 'W' },
  { offset: 2, isBlack: false, whiteIndex: 1, qwertyHint: 'S' },
  { offset: 3, isBlack: true, whiteIndex: 1, qwertyHint: 'E' },
  { offset: 4, isBlack: false, whiteIndex: 2, qwertyHint: 'D' },
  { offset: 5, isBlack: false, whiteIndex: 3, qwertyHint: 'F' },
  { offset: 6, isBlack: true, whiteIndex: 3, qwertyHint: 'T' },
  { offset: 7, isBlack: false, whiteIndex: 4, qwertyHint: 'G' },
  { offset: 8, isBlack: true, whiteIndex: 4, qwertyHint: 'Y' },
  { offset: 9, isBlack: false, whiteIndex: 5, qwertyHint: 'H' },
  { offset: 10, isBlack: true, whiteIndex: 5, qwertyHint: 'U' },
  { offset: 11, isBlack: false, whiteIndex: 6, qwertyHint: 'J' },
  { offset: 12, isBlack: false, whiteIndex: 7, qwertyHint: 'K' },
  { offset: 13, isBlack: true, whiteIndex: 7, qwertyHint: 'O' },
  { offset: 14, isBlack: false, whiteIndex: 8, qwertyHint: 'L' },
  { offset: 15, isBlack: true, whiteIndex: 8, qwertyHint: 'P' },
  { offset: 16, isBlack: false, whiteIndex: 9, qwertyHint: ';' },
  { offset: 17, isBlack: false, whiteIndex: 10, qwertyHint: "'" },
  { offset: 18, isBlack: true, whiteIndex: 10 },
  { offset: 19, isBlack: false, whiteIndex: 11 },
  { offset: 20, isBlack: true, whiteIndex: 11 },
  { offset: 21, isBlack: false, whiteIndex: 12 },
  { offset: 22, isBlack: true, whiteIndex: 12 },
  { offset: 23, isBlack: false, whiteIndex: 13 },
  { offset: 24, isBlack: false, whiteIndex: 14 },
];

const WHITE_KEYS = PIANO_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = PIANO_KEYS.filter((k) => k.isBlack);

export function KeyboardDeck({
  octaveShift,
  sustainLatch,
  spaceSustain,
  chordMode,
  chordVoicing,
  scaleMode,
  droneKey,
  activeNotes,
  activePadChordId,
  onOctaveChange,
  onToggleSustainLatch,
  onToggleChordMode,
  onSelectChordVoicing,
  onSelectScaleMode,
  onTriggerOneClickChord,
  onReleaseOneClickChord,
  onPressKey,
  onReleaseKey,
}: KeyboardDeckProps) {
  const baseMidi = 60 + octaveShift * 12; // Default C4 = 60
  const pointerNotesRef = useRef<Map<number, number>>(new Map());
  const oneClickPads = useMemo(() => getOneClickPadChords(droneKey, scaleMode), [droneKey, scaleMode]);

  const handleKeyDownPointer = (e: React.PointerEvent, midi: number) => {
    e.stopPropagation();
    e.preventDefault();
    const prev = pointerNotesRef.current.get(e.pointerId);
    if (prev !== undefined && prev !== midi) {
      onReleaseKey(prev);
    }
    if (prev !== midi) {
      pointerNotesRef.current.set(e.pointerId, midi);
      onPressKey(midi);
    }
  };

  const handleKeyEnterPointer = (e: React.PointerEvent, midi: number) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    if (!pointerNotesRef.current.has(e.pointerId)) return;
    e.stopPropagation();
    const prev = pointerNotesRef.current.get(e.pointerId);
    if (prev !== undefined && prev !== midi) {
      onReleaseKey(prev);
      pointerNotesRef.current.set(e.pointerId, midi);
      onPressKey(midi);
    }
  };

  const handleKeyUpPointer = (e: React.PointerEvent) => {
    const prev = pointerNotesRef.current.get(e.pointerId);
    if (prev !== undefined) {
      pointerNotesRef.current.delete(e.pointerId);
      onReleaseKey(prev);
    }
  };

  const activeNames = Array.from(activeNotes)
    .sort((a, b) => a - b)
    .slice(0, 6)
    .map(midiToNoteName)
    .join(' · ');

  const sustainOn = sustainLatch || spaceSustain;

  return (
    <section
      aria-label="2-Octave Performance Keyboard and One-Click Pad Chords"
      className="flex flex-col gap-2.5 p-3 lg:px-4 lg:py-3 bg-[#151f32] border border-slate-800 rounded-lg flex-1 min-h-0"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sustain / Latch Toggle */}
          <button
            type="button"
            onClick={onToggleSustainLatch}
            aria-pressed={sustainLatch}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
              sustainOn
                ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                : 'bg-[#0f172a]/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Sustain {sustainOn ? 'On' : 'Off'}</span>
            <span className="text-[10px] font-mono text-slate-400">[Space]</span>
          </button>

          {/* Major / Minor Key Quality Buttons */}
          <div
            role="group"
            aria-label="Scale Mode"
            className="inline-flex items-center rounded-md border border-slate-700 bg-[#0f172a]/80 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onSelectScaleMode('major')}
              aria-pressed={scaleMode === 'major'}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border-r border-slate-700 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                scaleMode === 'major'
                  ? 'bg-amber-500/20 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Major
            </button>
            <button
              type="button"
              onClick={() => onSelectScaleMode('minor')}
              aria-pressed={scaleMode === 'minor'}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                scaleMode === 'minor'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Minor
            </button>
          </div>

          {/* 1-Finger Keyboard Chord Toggle + Voicing Selector */}
          <div className="inline-flex items-center rounded-md border border-slate-700 bg-[#0f172a]/80 overflow-hidden">
            <button
              type="button"
              onClick={onToggleChordMode}
              aria-pressed={chordMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                chordMode
                  ? 'bg-cyan-500/20 text-cyan-200 border-r border-cyan-500/50'
                  : 'text-slate-300 hover:text-white border-r border-slate-700'
              }`}
              title="Play full open pad chords from any single piano or QWERTY key"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>1-Finger Keys</span>
            </button>
            <label htmlFor="chord-voicing-select" className="sr-only">
              1-Finger Chord Voicing
            </label>
            <select
              id="chord-voicing-select"
              value={chordVoicing}
              onChange={(e) => onSelectChordVoicing(e.target.value as ChordVoicingType)}
              className="bg-[#0f172a] text-xs font-mono font-medium text-slate-200 px-2.5 min-h-[36px] cursor-pointer focus-visible:outline-none"
              title="Voicing applied when 1-Finger Keys is active"
            >
              {CHORD_VOICING_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Octave Shift */}
          <div className="inline-flex items-center border border-slate-700 rounded-md bg-[#0f172a]/80 overflow-hidden">
            <button
              type="button"
              onClick={() => onOctaveChange(-1)}
              disabled={octaveShift <= -2}
              aria-label="Octave Down"
              className="px-2 min-h-[36px] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono tabular-nums text-slate-200 whitespace-nowrap">
              Oct {octaveShift >= 0 ? `+${octaveShift}` : octaveShift} ({midiToNoteName(baseMidi)})
            </span>
            <button
              type="button"
              onClick={() => onOctaveChange(1)}
              disabled={octaveShift >= 2}
              aria-label="Octave Up"
              className="px-2 min-h-[36px] text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Notes & Clear Latched Pad Chord */}
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400">
          {activePadChordId && (
            <button
              type="button"
              onClick={onReleaseOneClickChord}
              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:text-white text-[11px] cursor-pointer whitespace-nowrap"
            >
              <X className="w-3 h-3" />
              <span>Release Chord</span>
            </button>
          )}
          <span className="hidden xl:inline whitespace-nowrap">QWERTY: A–L / W–P</span>
          <span aria-hidden="true" className="hidden xl:inline text-slate-600">·</span>
          <span className="text-slate-200 min-w-[100px] text-right whitespace-nowrap">
            {activeNames || 'Ready'}
          </span>
        </div>
      </div>

      {/* One-Click Pad Chords Strip (Major/Minor, Suspended, Extended, Open 5ths & Octaves) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
        {oneClickPads.map((pad) => {
          const isLatched = activePadChordId === pad.id;
          return (
            <button
              key={pad.id}
              type="button"
              onClick={() => onTriggerOneClickChord(pad)}
              aria-pressed={isLatched}
              className={`px-2 py-1.5 min-h-[40px] rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-center focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isLatched
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#0f172a]/85 border-slate-800 text-slate-200 hover:border-amber-500/60 hover:bg-slate-800/70'
              }`}
              title={`One-click latch ${pad.label} (${pad.subLabel}) — click again to release`}
            >
              <span className="text-xs font-semibold leading-tight truncate whitespace-nowrap">
                {pad.label}
              </span>
              <span
                className={`text-[10px] font-mono leading-tight truncate whitespace-nowrap ${
                  isLatched ? 'text-cyan-300' : 'text-slate-400'
                }`}
              >
                {pad.subLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive 2-Octave Piano Keybed */}
      <div
        className="relative w-full h-32 select-none touch-none rounded-md overflow-hidden border border-slate-800 bg-[#0b1120]"
        onPointerUp={handleKeyUpPointer}
        onPointerCancel={handleKeyUpPointer}
        onPointerLeave={handleKeyUpPointer}
      >
        {/* 15 White Keys */}
        <div className="grid grid-cols-15 w-full h-full">
          {WHITE_KEYS.map((keyDef) => {
            const midi = baseMidi + keyDef.offset;
            const isActive = activeNotes.has(midi);
            const noteLabel = midiToNoteName(midi);

            return (
              <button
                key={keyDef.offset}
                type="button"
                aria-label={`Play ${noteLabel}`}
                onPointerDown={(e) => handleKeyDownPointer(e, midi)}
                onPointerEnter={(e) => handleKeyEnterPointer(e, midi)}
                onPointerUp={handleKeyUpPointer}
                className={`relative h-full border-r last:border-r-0 border-slate-700/80 flex flex-col justify-end items-center pb-1.5 transition-colors cursor-pointer focus-visible:outline-none ${
                  isActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-200 hover:bg-white text-slate-700'
                }`}
              >
                {keyDef.qwertyHint && (
                  <span
                    className={`text-[10px] font-mono leading-none mb-0.5 ${
                      isActive ? 'text-slate-900 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {keyDef.qwertyHint}
                  </span>
                )}
                <span className="text-[10px] font-mono font-semibold leading-none">
                  {noteLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* 10 Black Keys */}
        {BLACK_KEYS.map((keyDef) => {
          const midi = baseMidi + keyDef.offset;
          const isActive = activeNotes.has(midi);
          const noteLabel = midiToNoteName(midi);
          const leftPercent = ((keyDef.whiteIndex + 0.68) / 15) * 100;
          const widthPercent = (0.64 / 15) * 100;

          return (
            <button
              key={keyDef.offset}
              type="button"
              aria-label={`Play ${noteLabel}`}
              onPointerDown={(e) => handleKeyDownPointer(e, midi)}
              onPointerEnter={(e) => handleKeyEnterPointer(e, midi)}
              onPointerUp={handleKeyUpPointer}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
              className={`absolute top-0 h-[62%] z-10 rounded-b-md border border-slate-950 shadow-md flex flex-col justify-end items-center pb-1.5 transition-colors cursor-pointer focus-visible:outline-none ${
                isActive
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-[#0f172a] hover:bg-slate-800 text-slate-400'
              }`}
            >
              {keyDef.qwertyHint && (
                <span
                  className={`text-[9px] font-mono leading-none ${
                    isActive ? 'text-slate-950 font-bold' : 'text-slate-500'
                  }`}
                >
                  {keyDef.qwertyHint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
