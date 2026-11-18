import React, { useRef } from 'react';
import { ChannelId, ChannelState } from '../types/synth';

interface LayerMixerProps {
  channels: Record<ChannelId, ChannelState>;
  levels: Record<ChannelId, number>;
  onGainChange: (id: ChannelId, gain: number) => void;
  onToggleMute: (id: ChannelId) => void;
  onToggleSolo: (id: ChannelId) => void;
}

const CHANNEL_ORDER: ChannelId[] = ['feltPiano', 'warmPad', 'highShimmer', 'subBass', 'keyDrone'];

function gainToDbLabel(gain: number): string {
  if (gain <= 0.005) return '-inf';
  const db = 20 * Math.log10(gain);
  return `${db >= 0 ? '+' : ''}${db.toFixed(1)}`;
}

interface VerticalFaderProps {
  channel: ChannelState;
  level: number;
  anySoloed: boolean;
  onGainChange: (gain: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}

function VerticalFader({
  channel,
  level,
  anySoloed,
  onGainChange,
  onToggleMute,
  onToggleSolo,
}: VerticalFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onGainChange(Math.max(0, Math.min(1, ratio)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      updateFromPointer(e.clientY);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onGainChange(Math.min(1, channel.gain + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onGainChange(Math.max(0, channel.gain - step));
    }
  };

  const isAudible = anySoloed ? channel.soloed && !channel.muted : !channel.muted;
  const accentColor = channel.accent === 'cyan' ? 'bg-cyan-400' : 'bg-amber-400';
  const faderFillColor = channel.accent === 'cyan' ? 'bg-cyan-500/35' : 'bg-amber-500/35';
  const meterColor =
    level > 0.88 ? 'bg-red-500' : channel.accent === 'cyan' ? 'bg-cyan-400' : 'bg-amber-400';

  return (
    <div className="flex flex-col items-center justify-between gap-1.5 py-2 px-2 bg-[#0f172a]/70 border border-slate-800/90 rounded-md h-full min-h-[168px]">
      {/* Channel Label & dB readout */}
      <div className="text-center w-full">
        <div className="text-xs font-semibold text-slate-100 truncate whitespace-nowrap">
          {channel.label}
        </div>
        <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
          {gainToDbLabel(channel.gain)} dB
        </div>
      </div>

      {/* Fader Track + Live Level Meter side-by-side */}
      <div className="flex items-stretch justify-center gap-2.5 flex-1 w-full min-h-[100px] py-1">
        {/* Interactive Vertical Fader */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={`${channel.label} Volume`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(channel.gain * 100)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
          className="relative w-10 h-full bg-slate-900 border border-slate-800 rounded touch-none select-none cursor-ns-resize flex items-center justify-center focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {/* Center hairline rail */}
          <div className="w-1 h-[calc(100%-16px)] bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`absolute bottom-0 left-0 right-0 ${faderFillColor}`}
              style={{ height: `${channel.gain * 100}%` }}
            />
          </div>

          {/* Hardware fader cap */}
          <div
            className="absolute left-1 right-1 h-4 rounded-sm bg-slate-100 border border-slate-950 shadow-md flex items-center justify-center pointer-events-none"
            style={{
              bottom: `calc(${channel.gain * 100}% - ${channel.gain * 16}px)`,
            }}
          >
            <div className={`w-4 h-0.5 ${accentColor}`} />
          </div>
        </div>

        {/* Live RMS Level Meter */}
        <div
          aria-hidden="true"
          className="w-2 h-full bg-slate-950 border border-slate-800/80 rounded-sm overflow-hidden flex flex-col justify-end"
        >
          <div
            className={`w-full transition-none ${isAudible ? meterColor : 'bg-slate-700'}`}
            style={{ height: `${Math.round((isAudible ? level : 0) * 100)}%` }}
          />
        </div>
      </div>

      {/* Mute (M) and Solo (S) Buttons */}
      <div className="grid grid-cols-2 gap-1.5 w-full">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={channel.muted}
          title={`Mute ${channel.label}`}
          className={`min-h-[36px] rounded border text-xs font-mono font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-red-400 ${
            channel.muted
              ? 'bg-red-500/25 border-red-500 text-red-200'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          M
        </button>
        <button
          type="button"
          onClick={onToggleSolo}
          aria-pressed={channel.soloed}
          title={`Solo ${channel.label}`}
          className={`min-h-[36px] rounded border text-xs font-mono font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
            channel.soloed
              ? 'bg-amber-500/25 border-amber-500 text-amber-200'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          S
        </button>
      </div>
    </div>
  );
}

export function LayerMixer({
  channels,
  levels,
  onGainChange,
  onToggleMute,
  onToggleSolo,
}: LayerMixerProps) {
  const anySoloed = CHANNEL_ORDER.some((id) => channels[id].soloed);

  return (
    <section
      aria-label="5-Channel Layer Mixer"
      className="flex flex-col gap-2.5 p-3 lg:p-4 bg-[#151f32] border border-slate-800 rounded-lg h-full"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300 whitespace-nowrap">
          5-Channel Layer Mixer
        </h2>
        <span className="text-xs font-mono text-slate-400 whitespace-nowrap">
          {anySoloed ? 'Solo Isolated' : 'All Buses Active'}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 lg:gap-3 flex-1 min-h-0">
        {CHANNEL_ORDER.map((id) => (
          <VerticalFader
            key={id}
            channel={channels[id]}
            level={levels[id] ?? 0}
            anySoloed={anySoloed}
            onGainChange={(g) => onGainChange(id, g)}
            onToggleMute={() => onToggleMute(id)}
            onToggleSolo={() => onToggleSolo(id)}
          />
        ))}
      </div>
    </section>
  );
}
