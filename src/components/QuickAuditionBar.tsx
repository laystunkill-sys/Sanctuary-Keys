import { useMemo } from 'react';
import { Lock, X } from 'lucide-react';
import {
  MusicalKey,
  OneClickChordPad,
  ScaleMode,
  getOneClickPadChords,
} from '../types/synth';

interface QuickAuditionBarProps {
  droneKey: MusicalKey;
  scaleMode: ScaleMode;
  sustainOn: boolean;
  activePadChordId: string | null;
  onToggleSustain: () => void;
  onTriggerPadChord: (pad: OneClickChordPad) => void;
  onReleasePadChord: () => void;
}

export function QuickAuditionBar({
  droneKey,
  scaleMode,
  sustainOn,
  activePadChordId,
  onToggleSustain,
  onTriggerPadChord,
  onReleasePadChord,
}: QuickAuditionBarProps) {
  // Pick 6 essential chords (I, sus2, sus4, IV/bIII, V/v, vi/bVI) for quick audition while mixing/shaping
  const quickPads = useMemo(() => {
    const all = getOneClickPadChords(droneKey, scaleMode);
    return [all[0], all[1], all[2], all[7], all[8], all[9]].filter(Boolean);
  }, [droneKey, scaleMode]);

  return (
    <section
      aria-label="Quick Chord Audition"
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#151f32] border border-slate-800 rounded-lg shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-300 whitespace-nowrap shrink-0">
          Quick Audition
        </span>
        <span aria-hidden="true" className="text-slate-600 text-xs">·</span>
        <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
          {droneKey} {scaleMode === 'major' ? 'Major' : 'Minor'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {quickPads.map((pad) => {
          const isLatched = activePadChordId === pad.id;
          return (
            <button
              key={pad.id}
              type="button"
              onClick={() => onTriggerPadChord(pad)}
              aria-pressed={isLatched}
              className={`px-3 py-1.5 min-h-[36px] rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isLatched
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#0f172a]/85 border-slate-800 text-slate-200 hover:border-amber-500/60 hover:text-white'
              }`}
            >
              {pad.label}
            </button>
          );
        })}

        {activePadChordId && (
          <button
            type="button"
            onClick={onReleasePadChord}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 text-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSustain}
          aria-pressed={sustainOn}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            sustainOn
              ? 'bg-amber-500/20 border-amber-500 text-amber-200'
              : 'bg-[#0f172a]/80 border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Sustain</span>
        </button>
      </div>
    </section>
  );
}
