import { Power } from 'lucide-react';
import { MUSICAL_KEYS, MusicalKey } from '../types/synth';

interface DronePadGridProps {
  droneEnabled: boolean;
  activeKey: MusicalKey;
  isCrossfading: boolean;
  crossfadeProgress: number; // 0..1
  onToggleDrone: () => void;
  onSelectKey: (key: MusicalKey) => void;
}

export function DronePadGrid({
  droneEnabled,
  activeKey,
  isCrossfading,
  crossfadeProgress,
  onToggleDrone,
  onSelectKey,
}: DronePadGridProps) {
  return (
    <section
      aria-label="12-Key Continuous Drone Generator"
      className="flex flex-col justify-between gap-2.5 p-3 lg:px-4 lg:py-3 bg-[#151f32] border border-slate-800 rounded-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300 whitespace-nowrap shrink-0">
            Key Drone
          </h2>
          <span aria-hidden="true" className="text-slate-600 text-xs">·</span>
          <span className="text-xs font-mono tabular-nums text-slate-400 truncate whitespace-nowrap">
            {droneEnabled ? `${activeKey} Root + 5th (No 3rd)` : `Standby · Key: ${activeKey}`}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleDrone}
          aria-pressed={droneEnabled}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[34px] rounded-md border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            droneEnabled
              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
              : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5 shrink-0" />
          <span>{droneEnabled ? 'Drone On' : 'Drone Off'}</span>
        </button>
      </div>

      {/* 12-Key Selector Grid (C through B) */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {MUSICAL_KEYS.map(({ key, label }) => {
          const isActive = droneEnabled && activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectKey(key)}
              aria-pressed={isActive}
              title={isActive ? `Click again to unpress ${label} drone` : `Start ${label} drone`}
              className={`min-h-[42px] rounded-md border text-sm font-semibold font-mono tabular-nums transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                  : 'bg-[#0f172a]/80 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 4-Second Equal-Power Crossfade Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className={`h-full transition-opacity duration-150 ${
              isCrossfading
                ? 'bg-cyan-400 opacity-100'
                : droneEnabled
                  ? 'bg-cyan-500/50 opacity-100'
                  : 'bg-slate-700 opacity-40'
            }`}
            style={{ width: `${isCrossfading ? crossfadeProgress * 100 : droneEnabled ? 100 : 0}%` }}
          />
        </div>
        <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0 w-28 text-right">
          {isCrossfading
            ? `Fade ${(crossfadeProgress * 4).toFixed(1)}s / 4.0s`
            : '4.0s Equal-Power'}
        </span>
      </div>
    </section>
  );
}
