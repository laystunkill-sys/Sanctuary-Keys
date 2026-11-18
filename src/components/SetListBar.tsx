import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ChordVoicingType, MusicalKey, ScaleMode, ScenePreset } from '../types/synth';

export const SET_LIST_STORAGE_KEY = 'sanctuarykeys_set_list_v1';

export interface SetListSong {
  id: string;
  name: string;
  scene: ScenePreset; // full mix snapshot (faders + shaping) captured when the song was saved
  key: MusicalKey;
  droneEnabled: boolean;
  chordMode: boolean;
  chordVoicing: ChordVoicingType;
  scaleMode: ScaleMode;
}

export function loadSetList(): SetListSong[] {
  try {
    const raw = localStorage.getItem(SET_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) => s && typeof s.id === 'string' && typeof s.name === 'string' && s.scene && s.key,
    ) as SetListSong[];
  } catch {
    return [];
  }
}

interface SetListBarProps {
  songs: SetListSong[];
  activeIndex: number | null;
  onSelectSong: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onAddCurrent: (name: string) => void;
  onUpdateSong: (index: number) => void;
  onToggleSongDrone: (index: number) => void;
  onRenameSong: (index: number, name: string) => void;
  onMoveSong: (index: number, direction: -1 | 1) => void;
  onDeleteSong: (index: number) => void;
}

function keyLabel(song: SetListSong): string {
  return `${song.key}${song.scaleMode === 'minor' ? 'm' : ''}`;
}

export function SetListBar({
  songs,
  activeIndex,
  onSelectSong,
  onPrev,
  onNext,
  onAddCurrent,
  onUpdateSong,
  onToggleSongDrone,
  onRenameSong,
  onMoveSong,
  onDeleteSong,
}: SetListBarProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState('');

  const current = activeIndex !== null ? songs[activeIndex] : null;
  const upcoming = activeIndex === null ? songs[0] : songs[activeIndex + 1];
  const canPrev = songs.length > 0 && activeIndex !== null && activeIndex > 0;
  const canNext = songs.length > 0 && (activeIndex === null || activeIndex < songs.length - 1);

  const readout = current
    ? `${(activeIndex ?? 0) + 1}/${songs.length} · ${current.name} · Key ${keyLabel(current)}`
    : songs.length > 0
      ? `${songs.length} song${songs.length === 1 ? '' : 's'} ready · press Next to start`
      : 'Empty — open the list and add your first song';

  const handleAdd = () => {
    onAddCurrent(newName.trim());
    setNewName('');
  };

  return (
    <section
      aria-label="Set List"
      className="flex flex-col gap-2.5 p-3 lg:px-4 lg:py-3 bg-[#151f32] border border-slate-800 rounded-lg shrink-0"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <ListMusic className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-300">Set List</h2>
            <p className="text-xs font-mono text-slate-400 truncate" aria-live="polite">
              {readout}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous song"
            className="inline-flex items-center justify-center w-11 min-h-11 rounded-md border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            aria-label={upcoming ? `Next song: ${upcoming.name}` : 'Next song'}
            title={upcoming ? `Next: ${upcoming.name}` : undefined}
            className="inline-flex items-center justify-center gap-1.5 px-3 min-h-11 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Hide set list' : 'Show set list'}
            className={`inline-flex items-center justify-center w-11 min-h-11 rounded-md border cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
              open
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {upcoming && (
        <p className="text-[11px] text-slate-500 -mt-1 truncate">
          Up next: <span className="text-slate-300">{upcoming.name}</span> · Key {keyLabel(upcoming)}
        </p>
      )}

      {open && (
        <div className="flex flex-col gap-2 border-t border-slate-800 pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Songs</span>
            {songs.length > 0 && (
              <button
                type="button"
                onClick={() => setEditMode((e) => !e)}
                className={`px-3 min-h-9 rounded border text-xs font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  editMode
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {editMode ? 'Done' : 'Edit list'}
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {songs.map((song, idx) => {
              const isActive = idx === activeIndex;
              return (
                <li
                  key={song.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500'
                      : 'bg-[#0f172a]/80 border-slate-800'
                  }`}
                >
                  <span className="w-5 text-center text-xs font-mono text-slate-500 shrink-0">
                    {idx + 1}
                  </span>

                  {editMode ? (
                    <input
                      type="text"
                      value={song.name}
                      onChange={(e) => onRenameSong(idx, e.target.value)}
                      aria-label={`Rename song ${idx + 1}`}
                      className="flex-1 min-w-0 min-h-9 px-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-2 focus:outline-amber-400"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectSong(idx)}
                      className="flex-1 min-w-0 min-h-10 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded"
                    >
                      <span
                        className={`block text-sm font-semibold truncate ${
                          isActive ? 'text-amber-200' : 'text-slate-100'
                        }`}
                      >
                        {song.name}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        Key {keyLabel(song)} · {song.scene.description} ·{' '}
                        {song.chordMode ? `Chords: ${song.chordVoicing}` : 'Single notes'}
                        {song.droneEnabled ? ' · Drone ON' : ' · Drone OFF (silent until you play)'}
                      </span>
                    </button>
                  )}

                  {editMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleSongDrone(idx)}
                        title="Turn the drone on or off for this song"
                        aria-label={`Drone for ${song.name} is ${song.droneEnabled ? 'on' : 'off'}. Tap to switch`}
                        className={`inline-flex items-center justify-center px-2 h-9 rounded border text-[11px] font-semibold cursor-pointer ${
                          song.droneEnabled
                            ? 'border-amber-500 text-amber-300 bg-amber-500/15'
                            : 'border-slate-700 text-slate-400'
                        }`}
                      >
                        Drone {song.droneEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateSong(idx)}
                        title="Replace this song's settings with the current scene, key and chords"
                        aria-label={`Update ${song.name} with current settings`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded border border-slate-700 text-cyan-300 hover:border-cyan-500 cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSong(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${song.name} up`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSong(idx, 1)}
                        disabled={idx === songs.length - 1}
                        aria-label={`Move ${song.name} down`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSong(idx)}
                        aria-label={`Delete ${song.name}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded border border-slate-700 text-red-400 hover:border-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder={`Song ${songs.length + 1} name`}
              aria-label="New song name"
              className="flex-1 min-w-0 min-h-11 px-3 rounded-md bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-amber-400"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-md border border-amber-500/70 bg-amber-500/10 text-amber-200 text-xs font-semibold hover:bg-amber-500/25 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Plus className="w-4 h-4" />
              <span>Add current</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            "Add current" saves your scene mix, key and chord settings, with the drone ON so each
            song starts sounding when you press Next. Use Edit list to switch a song's drone off.
            Next does not press piano keys for you; it sets everything up so you can play.
          </p>
        </div>
      )}
    </section>
  );
}