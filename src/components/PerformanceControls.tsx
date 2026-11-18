import { ShapingParams } from '../types/synth';

interface PerformanceControlsProps {
  shaping: ShapingParams;
  onFilterCutoffChange: (hz: number) => void;
  onMasterSwellChange: (val: number) => void;
  onReverbMixChange: (val: number) => void;
  onReverbDecayChange: (sec: number) => void;
  onPadAttackChange: (sec: number) => void;
  onPadReleaseChange: (sec: number) => void;
}

// Logarithmic mapping for musical 120Hz..12000Hz filter sweep
function hzToNorm(hz: number): number {
  return Math.log(hz / 120) / Math.log(12000 / 120);
}

function normToHz(norm: number): number {
  return Math.round(120 * Math.pow(12000 / 120, Math.max(0, Math.min(1, norm))));
}

function formatHz(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(2)} kHz`;
  return `${Math.round(hz)} Hz`;
}

export function PerformanceControls({
  shaping,
  onFilterCutoffChange,
  onMasterSwellChange,
  onReverbMixChange,
  onReverbDecayChange,
  onPadAttackChange,
  onPadReleaseChange,
}: PerformanceControlsProps) {
  const filterNorm = hzToNorm(shaping.filterCutoff);

  return (
    <section
      aria-label="Master Effects and Envelope Shaping"
      className="flex flex-col justify-between gap-2.5 p-3 lg:p-4 bg-[#151f32] border border-slate-800 rounded-lg h-full"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300 whitespace-nowrap">
          Performance &amp; Effects Shaping
        </h2>
        <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
          Cathedral Limiter Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 flex-1 content-center">
        {/* Filter Cutoff (Mod Wheel CC 1) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-cutoff" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Filter Cutoff (Mod)
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-amber-400 whitespace-nowrap">
              {formatHz(shaping.filterCutoff)}
            </span>
          </div>
          <input
            id="ctrl-cutoff"
            type="range"
            min={0}
            max={1}
            step={0.002}
            value={filterNorm}
            onChange={(e) => onFilterCutoffChange(normToHz(parseFloat(e.target.value)))}
            className="stage-slider stage-slider-amber w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>120 Hz</span>
            <span>CC 1</span>
            <span>12 kHz</span>
          </div>
        </div>

        {/* Master Swell (Expression CC 11) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-swell" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Master Swell (Expr)
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-amber-400 whitespace-nowrap">
              {Math.round(shaping.masterSwell * 100)}%
            </span>
          </div>
          <input
            id="ctrl-swell"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={shaping.masterSwell}
            onChange={(e) => onMasterSwellChange(parseFloat(e.target.value))}
            className="stage-slider stage-slider-amber w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0%</span>
            <span>CC 11</span>
            <span>100%</span>
          </div>
        </div>

        {/* Cathedral Reverb Mix */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-reverb-mix" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Reverb Mix
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-cyan-400 whitespace-nowrap">
              {Math.round(shaping.reverbMix * 100)}%
            </span>
          </div>
          <input
            id="ctrl-reverb-mix"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={shaping.reverbMix}
            onChange={(e) => onReverbMixChange(parseFloat(e.target.value))}
            className="stage-slider stage-slider-cyan w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Dry</span>
            <span>Shimmer Bus</span>
            <span>Cathedral</span>
          </div>
        </div>

        {/* Reverb Decay (2s - 10s) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-reverb-decay" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Reverb Decay
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-cyan-400 whitespace-nowrap">
              {shaping.reverbDecay.toFixed(1)} s
            </span>
          </div>
          <input
            id="ctrl-reverb-decay"
            type="range"
            min={2.0}
            max={10.0}
            step={0.5}
            value={shaping.reverbDecay}
            onChange={(e) => onReverbDecayChange(parseFloat(e.target.value))}
            className="stage-slider stage-slider-cyan w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>2.0 s</span>
            <span>IR Tail</span>
            <span>10.0 s</span>
          </div>
        </div>

        {/* Pad Attack (0.5s - 2.0s) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-pad-attack" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Pad Attack
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-100 whitespace-nowrap">
              {shaping.padAttack.toFixed(2)} s
            </span>
          </div>
          <input
            id="ctrl-pad-attack"
            type="range"
            min={0.5}
            max={2.0}
            step={0.05}
            value={shaping.padAttack}
            onChange={(e) => onPadAttackChange(parseFloat(e.target.value))}
            className="stage-slider w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0.50 s</span>
            <span>Swell In</span>
            <span>2.00 s</span>
          </div>
        </div>

        {/* Pad Release (1.5s - 5.0s) */}
        <div className="flex flex-col gap-1.5 p-2.5 bg-[#0f172a]/70 border border-slate-800/90 rounded-md">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="ctrl-pad-release" className="text-xs font-semibold text-slate-200 whitespace-nowrap">
              Pad Release
            </label>
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-100 whitespace-nowrap">
              {shaping.padRelease.toFixed(2)} s
            </span>
          </div>
          <input
            id="ctrl-pad-release"
            type="range"
            min={1.5}
            max={5.0}
            step={0.1}
            value={shaping.padRelease}
            onChange={(e) => onPadReleaseChange(parseFloat(e.target.value))}
            className="stage-slider w-full h-7"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>1.50 s</span>
            <span>Tail Fade</span>
            <span>5.00 s</span>
          </div>
        </div>
      </div>
    </section>
  );
}
