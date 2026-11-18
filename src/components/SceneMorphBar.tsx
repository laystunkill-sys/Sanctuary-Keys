import { Bookmark, Check } from 'lucide-react';
import { ScenePreset } from '../types/synth';

interface SceneMorphBarProps {
  factoryScenes: ScenePreset[];
  customSlots: (ScenePreset | null)[];
  activeSceneId: string | null;
  morphProgress: number; // 0..1 when morphing, 1 when settled
  isMorphing: boolean;
  saveMode: boolean;
  onToggleSaveMode: () => void;
  onSelectScene: (scene: ScenePreset) => void;
  onSelectCustomSlot: (slotIndex: number) => void;
}

export function SceneMorphBar({
  factoryScenes,
  customSlots,
  activeSceneId,
  morphProgress,
  isMorphing,
  saveMode,
  onToggleSaveMode,
  onSelectScene,
  onSelectCustomSlot,
}: SceneMorphBarProps) {
  return (
    <section
      aria-label="Scene Morph Presets"
      className="flex flex-col justify-between gap-2.5 p-3 lg:px-4 lg:py-3 bg-[#151f32] border border-slate-800 rounded-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300 whitespace-nowrap shrink-0">
            Scene Morph Presets
          </h2>
          <span aria-hidden="true" className="text-slate-600 text-xs">·</span>
          <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
            {isMorphing ? `Morphing ${(morphProgress * 1.5).toFixed(1)}s / 1.5s` : '1.5s Linear Ramp'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSaveMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
            saveMode
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
          title="Click to arm save mode, then click a User Slot (1–4) to store current mix"
        >
          {saveMode ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          <span>{saveMode ? 'Select Slot to Store' : 'Store Mix'}</span>
        </button>
      </div>

      {/* 4 Factory Scene Morph Buttons + 4 Local User Slots */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {factoryScenes.map((scene) => {
          const isActive = activeSceneId === scene.id;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSelectScene(scene)}
              title={scene.description}
              className={`px-3 py-2 min-h-[42px] rounded-md border text-left transition-colors cursor-pointer flex flex-col justify-center focus-visible:outline-2 focus-visible:outline-amber-400 ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                  : 'bg-[#0f172a]/80 border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              <span className="text-xs font-semibold truncate whitespace-nowrap">{scene.name}</span>
            </button>
          );
        })}

        {customSlots.map((slot, idx) => {
          const slotId = `custom-slot-${idx}`;
          const isActive = activeSceneId === slotId && !saveMode;
          const isFilled = slot !== null;
          return (
            <button
              key={slotId}
              type="button"
              onClick={() => onSelectCustomSlot(idx)}
              className={`px-3 py-2 min-h-[42px] rounded-md border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                saveMode
                  ? 'bg-amber-500/10 border-amber-500/70 text-amber-200 hover:bg-amber-500/25'
                  : isActive
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200'
                    : isFilled
                      ? 'bg-[#0f172a]/80 border-slate-700/80 text-slate-200 hover:border-cyan-500/60'
                      : 'bg-[#0f172a]/40 border-slate-800/80 border-dashed text-slate-500 hover:border-slate-600 hover:text-slate-300'
              }`}
              title={
                saveMode
                  ? `Save current mix to User ${idx + 1}`
                  : isFilled
                    ? `Morph to User ${idx + 1}`
                    : `Empty local slot — click Store Mix to save`
              }
            >
              <span className="text-xs font-medium truncate whitespace-nowrap">
                {saveMode ? `Save → U${idx + 1}` : isFilled ? `User ${idx + 1}` : `Slot ${idx + 1}`}
              </span>
              {isFilled && !saveMode && (
                <span className="text-[10px] font-mono text-cyan-400 shrink-0">SAVED</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subtle morph progress rail */}
      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
        <div
          className={`h-full transition-opacity duration-150 ${
            isMorphing ? 'bg-amber-400 opacity-100' : 'bg-slate-700 opacity-40'
          }`}
          style={{ width: `${isMorphing ? morphProgress * 100 : 100}%` }}
        />
      </div>
    </section>
  );
}
