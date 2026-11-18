import { Power, VolumeX } from 'lucide-react';
import { MidiState } from '../hooks/useMidiInput';

interface TopBarProps {
  audioRunning: boolean;
  onStartAudio: () => void;
  midi: MidiState;
  activeVoicesCount: number;
  onPanic: () => void;
}

export function TopBar({
  audioRunning,
  onStartAudio,
  midi,
  activeVoicesCount,
  onPanic,
}: TopBarProps) {
  const midiLabel = !midi.supported
    ? 'MIDI Unsupported'
    : midi.permissionDenied
      ? 'MIDI Permission Blocked'
      : midi.deviceNames.length > 0
        ? `MIDI: ${midi.deviceNames[0]}${midi.deviceNames.length > 1 ? ` (+${midi.deviceNames.length - 1})` : ''}`
        : 'MIDI: Listening';

  return (
    <header className="flex items-center justify-between gap-6 px-4 lg:px-6 h-13 shrink-0 bg-[#131c2e] border-b border-slate-800">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-4 min-w-0 shrink-0">
        <h1 className="text-base lg:text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
          SanctuaryKeys
        </h1>
      </div>

      {/* Zone 2: Clean unboxed stage telemetry & MIDI readout */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono tabular-nums min-w-0 truncate">
        {audioRunning ? (
          <span className="text-amber-400 font-medium whitespace-nowrap shrink-0">
            Audio Engine Active
          </span>
        ) : (
          <button
            type="button"
            onClick={onStartAudio}
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Start Audio Engine</span>
          </button>
        )}

        <span aria-hidden="true" className="text-slate-600">·</span>

        <span
          className={`truncate max-w-[240px] whitespace-nowrap ${
            midi.deviceNames.length > 0 ? 'text-cyan-400 font-medium' : 'text-slate-400'
          }`}
          title={midi.deviceNames.join(', ') || midiLabel}
        >
          {midiLabel}
        </span>

        <span aria-hidden="true" className="text-slate-600">·</span>

        <span className="text-slate-400 whitespace-nowrap shrink-0">
          Voices: <span className="text-slate-200">{String(activeVoicesCount).padStart(2, '0')}</span>
        </span>
      </div>

      {/* Zone 3: Emergency Panic Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onPanic}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          title="Immediately cut all active & sustained notes"
        >
          <VolumeX className="w-3.5 h-3.5 shrink-0" />
          <span>PANIC (All Notes Off)</span>
        </button>
      </div>
    </header>
  );
}
