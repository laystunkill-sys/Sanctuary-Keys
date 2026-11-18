import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { WorshipAudioEngine } from './audio/WorshipAudioEngine';
import { DronePadGrid } from './components/DronePadGrid';
import { KeyboardDeck } from './components/KeyboardDeck';
import { LayerMixer } from './components/LayerMixer';
import { PerformanceControls } from './components/PerformanceControls';
import { SceneMorphBar } from './components/SceneMorphBar';
import { TopBar } from './components/TopBar';
import { useMidiInput } from './hooks/useMidiInput';
import {
  CUSTOM_SCENES_STORAGE_KEY,
  ChannelId,
  ChannelState,
  ChordVoicingType,
  FACTORY_SCENES,
  INITIAL_CHANNELS,
  INITIAL_SHAPING,
  MusicalKey,
  OneClickChordPad,
  QWERTY_KEY_MAP,
  ScaleMode,
  ScenePreset,
  ShapingParams,
  getWorshipChordNotes,
} from './types/synth';

function loadCustomSlots(): (ScenePreset | null)[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENES_STORAGE_KEY);
    if (!raw) return [null, null, null, null];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 4) {
      return parsed;
    }
  } catch {
    // Ignore malformed storage
  }
  return [null, null, null, null];
}

interface MorphAnimation {
  startTime: number;
  durationMs: number;
  fromChannels: Record<ChannelId, number>;
  toChannels: Record<ChannelId, number>;
  fromShaping: ShapingParams;
  toShaping: {
    filterCutoff: number;
    reverbMix: number;
    padAttack: number;
    padRelease: number;
  };
}

export default function App() {
  const engineRef = useRef<WorshipAudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new WorshipAudioEngine();
  }
  const engine = engineRef.current;

  // Engine & Voice Telemetry
  const [audioRunning, setAudioRunning] = useState(false);
  const [activeVoicesCount, setActiveVoicesCount] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // Mixer & Shaping State
  const [channels, setChannels] = useState<Record<ChannelId, ChannelState>>(() =>
    structuredClone(INITIAL_CHANNELS),
  );
  const [levels, setLevels] = useState<Record<ChannelId, number>>({
    feltPiano: 0,
    warmPad: 0,
    highShimmer: 0,
    subBass: 0,
    keyDrone: 0,
  });
  const [shaping, setShaping] = useState<ShapingParams>(() => ({ ...INITIAL_SHAPING }));

  // Drone State
  const [droneEnabled, setDroneEnabled] = useState(false);
  const [droneKey, setDroneKey] = useState<MusicalKey>('C');
  const [crossfadeState, setCrossfadeState] = useState({ isCrossfading: false, progress: 1 });

  // Scenes & Custom Slots
  const [activeSceneId, setActiveSceneId] = useState<string | null>('warm-verse');
  const [customSlots, setCustomSlots] = useState<(ScenePreset | null)[]>(loadCustomSlots);
  const [saveMode, setSaveMode] = useState(false);
  const [morphProgress, setMorphProgress] = useState(1);
  const [isMorphing, setIsMorphing] = useState(false);
  const morphAnimRef = useRef<MorphAnimation | null>(null);

  // Performance Input State
  const [octaveShift, setOctaveShift] = useState(0);
  const [sustainLatch, setSustainLatch] = useState(false);
  const [spaceSustain, setSpaceSustain] = useState(false);
  const [midiSustain, setMidiSustain] = useState(false);
  const [chordMode, setChordMode] = useState(false);
  const [chordVoicing, setChordVoicing] = useState<ChordVoicingType>('auto');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('major');
  const [activePadChordId, setActivePadChordId] = useState<string | null>(null);

  // Track expanded chord voicings per pressed root key so release always matches press
  const activeChordTriggersRef = useRef<Map<number, number[]>>(new Map());
  const sustainedRootMapRef = useRef<Map<number, number[]>>(new Map());
  const unpressedOnTapRef = useRef<Set<number>>(new Set());
  const activePadChordNotesRef = useRef<number[]>([]);
  const activeQwertyKeysRef = useRef<Map<string, number>>(new Map());

  // Sync sustain state to Audio Engine
  useEffect(() => {
    const combinedSustain = sustainLatch || spaceSustain || midiSustain;
    if (!combinedSustain) {
      sustainedRootMapRef.current.clear();
    }
    engine.setSustain(combinedSustain);
  }, [engine, sustainLatch, spaceSustain, midiSustain]);

  // Subscribe to engine note/state updates
  useEffect(() => {
    engine.setOnStateChange(() => {
      setAudioRunning(engine.isRunning());
      setActiveVoicesCount(engine.getActiveVoiceCount());
      setActiveNotes(engine.getActiveNotes());
    });
    return () => {
      engine.dispose();
    };
  }, [engine]);

  // 60fps Animation Frame loop for channel meters, drone crossfade bar, and scene morph UI interpolation
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      if (engine.isRunning()) {
        setLevels(engine.getChannelLevels());
      }

      const cf = engine.getCrossfadeProgress();
      setCrossfadeState((prev) =>
        prev.isCrossfading === cf.isCrossfading && Math.abs(prev.progress - cf.progress) < 0.01
          ? prev
          : cf,
      );

      const anim = morphAnimRef.current;
      if (anim) {
        const t = Math.min(1, (performance.now() - anim.startTime) / anim.durationMs);
        setMorphProgress(t);
        setChannels((prev) => {
          const next = { ...prev };
          (Object.keys(anim.toChannels) as ChannelId[]).forEach((id) => {
            const fromV = anim.fromChannels[id];
            const toV = anim.toChannels[id];
            next[id] = { ...prev[id], gain: fromV + (toV - fromV) * t };
          });
          return next;
        });
        setShaping((prev) => ({
          ...prev,
          filterCutoff:
            anim.fromShaping.filterCutoff +
            (anim.toShaping.filterCutoff - anim.fromShaping.filterCutoff) * t,
          reverbMix:
            anim.fromShaping.reverbMix +
            (anim.toShaping.reverbMix - anim.fromShaping.reverbMix) * t,
          padAttack:
            anim.fromShaping.padAttack +
            (anim.toShaping.padAttack - anim.fromShaping.padAttack) * t,
          padRelease:
            anim.fromShaping.padRelease +
            (anim.toShaping.padRelease - anim.fromShaping.padRelease) * t,
        }));

        if (t >= 1) {
          morphAnimRef.current = null;
          setIsMorphing(false);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [engine]);

  const handleStartAudio = useCallback(async () => {
    const running = await engine.initOrResume();
    setAudioRunning(running);
  }, [engine]);

  // Note triggers for Touch / QWERTY (supports optional 1-Finger Worship Chord mode + click-again unpress when sustained)
  const triggerPlayKey = useCallback(
    (rootMidi: number, velocity = 0.85, allowUnpressSustained = false) => {
      const sustainOn = sustainLatch || spaceSustain || midiSustain;
      if (allowUnpressSustained && sustainOn && engine.isNoteSustained(rootMidi)) {
        const mappedSustained = sustainedRootMapRef.current.get(rootMidi) ?? [rootMidi];
        mappedSustained.forEach((n) => engine.releasePadNote(n));
        sustainedRootMapRef.current.delete(rootMidi);
        unpressedOnTapRef.current.add(rootMidi);
        return;
      }

      unpressedOnTapRef.current.delete(rootMidi);
      const notes = chordMode ? getWorshipChordNotes(rootMidi, droneKey, chordVoicing, scaleMode) : [rootMidi];
      activeChordTriggersRef.current.set(rootMidi, notes);
      if (sustainOn) {
        sustainedRootMapRef.current.set(rootMidi, notes);
      }
      notes.forEach((n, idx) => {
        // Subtle velocity tapering on upper chord extensions for warm acoustic balance
        const vel = idx === 0 ? velocity : Math.max(0.55, velocity * 0.86);
        engine.noteOn(n, vel);
      });
    },
    [chordMode, chordVoicing, droneKey, scaleMode, sustainLatch, spaceSustain, midiSustain, engine],
  );

  const releasePlayKey = useCallback(
    (rootMidi: number) => {
      if (unpressedOnTapRef.current.has(rootMidi)) {
        unpressedOnTapRef.current.delete(rootMidi);
        return;
      }
      const mapped = activeChordTriggersRef.current.get(rootMidi);
      if (mapped) {
        activeChordTriggersRef.current.delete(rootMidi);
        mapped.forEach((n) => engine.noteOff(n));
      } else {
        engine.noteOff(rootMidi);
      }
    },
    [engine],
  );

  // One-Click Pad Chord Latching & Smooth Transition
  const releaseOneClickChord = useCallback(() => {
    if (activePadChordNotesRef.current.length > 0) {
      activePadChordNotesRef.current.forEach((n) => engine.releasePadNote(n));
      activePadChordNotesRef.current = [];
    }
    setActivePadChordId(null);
  }, [engine]);

  const handleTriggerOneClickChord = useCallback(
    (pad: OneClickChordPad) => {
      const isSamePad = activePadChordId === pad.id;
      if (activePadChordNotesRef.current.length > 0) {
        activePadChordNotesRef.current.forEach((n) => engine.releasePadNote(n));
        activePadChordNotesRef.current = [];
      }
      if (isSamePad) {
        setActivePadChordId(null);
        return;
      }

      activePadChordNotesRef.current = pad.notes;
      setActivePadChordId(pad.id);
      pad.notes.forEach((n, idx) => {
        const vel = idx === 0 ? 0.78 : 0.65;
        engine.noteOn(n, vel, {
          softSwell: true,
          delayOffsetSec: idx * 0.025,
        });
      });
    },
    [activePadChordId, engine],
  );

  // Web MIDI API Callbacks
  const midiState = useMidiInput({
    onNoteOn: (midi, velocity) => {
      engine.noteOn(midi, velocity);
    },
    onNoteOff: (midi) => {
      engine.noteOff(midi);
    },
    onSustainChange: (active) => {
      setMidiSustain(active);
    },
    onModWheelChange: (hzCutoff) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      engine.setFilterCutoff(hzCutoff);
      setShaping((prev) => ({ ...prev, filterCutoff: hzCutoff }));
    },
    onExpressionChange: (swell) => {
      engine.setMasterSwell(swell);
      setShaping((prev) => ({ ...prev, masterSwell: swell }));
    },
  });

  // QWERTY + Spacebar Sustain Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'))) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          setSpaceSustain(true);
        }
        return;
      }

      if (e.repeat) return;
      const mapping = QWERTY_KEY_MAP[e.code];
      if (mapping) {
        e.preventDefault();
        const midi = 60 + octaveShift * 12 + mapping.offset;
        activeQwertyKeysRef.current.set(e.code, midi);
        triggerPlayKey(midi, 0.85);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceSustain(false);
        return;
      }

      const midi = activeQwertyKeysRef.current.get(e.code);
      if (midi !== undefined) {
        activeQwertyKeysRef.current.delete(e.code);
        releasePlayKey(midi);
      }
    };

    const handleBlur = () => {
      setSpaceSustain(false);
      activeQwertyKeysRef.current.forEach((midi) => releasePlayKey(midi));
      activeQwertyKeysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [octaveShift, triggerPlayKey, releasePlayKey]);

  // Mixer Handlers
  const handleChannelGainChange = useCallback(
    (id: ChannelId, gain: number) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      setActiveSceneId(null);
      engine.setChannelGain(id, gain);
      setChannels((prev) => ({
        ...prev,
        [id]: { ...prev[id], gain },
      }));
    },
    [engine],
  );

  const handleToggleMute = useCallback(
    (id: ChannelId) => {
      setChannels((prev) => {
        const nextMuted = !prev[id].muted;
        engine.setChannelMute(id, nextMuted);
        return { ...prev, [id]: { ...prev[id], muted: nextMuted } };
      });
    },
    [engine],
  );

  const handleToggleSolo = useCallback(
    (id: ChannelId) => {
      setChannels((prev) => {
        const nextSoloed = !prev[id].soloed;
        engine.setChannelSolo(id, nextSoloed);
        return { ...prev, [id]: { ...prev[id], soloed: nextSoloed } };
      });
    },
    [engine],
  );

  // Shaping Handlers
  const handleFilterCutoffChange = useCallback(
    (hz: number) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      setActiveSceneId(null);
      engine.setFilterCutoff(hz);
      setShaping((prev) => ({ ...prev, filterCutoff: hz }));
    },
    [engine],
  );

  const handleMasterSwellChange = useCallback(
    (val: number) => {
      engine.setMasterSwell(val);
      setShaping((prev) => ({ ...prev, masterSwell: val }));
    },
    [engine],
  );

  const handleReverbMixChange = useCallback(
    (val: number) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      setActiveSceneId(null);
      engine.setReverbMix(val);
      setShaping((prev) => ({ ...prev, reverbMix: val }));
    },
    [engine],
  );

  const handleReverbDecayChange = useCallback(
    (sec: number) => {
      engine.setReverbDecay(sec);
      setShaping((prev) => ({ ...prev, reverbDecay: sec }));
    },
    [engine],
  );

  const handlePadAttackChange = useCallback(
    (sec: number) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      engine.setPadAttack(sec);
      setShaping((prev) => ({ ...prev, padAttack: sec }));
    },
    [engine],
  );

  const handlePadReleaseChange = useCallback(
    (sec: number) => {
      morphAnimRef.current = null;
      setIsMorphing(false);
      engine.setPadRelease(sec);
      setShaping((prev) => ({ ...prev, padRelease: sec }));
    },
    [engine],
  );

  // Scene Morph & Custom Save Slots
  const handleSelectScene = useCallback(
    async (scene: ScenePreset) => {
      if (!engine.isRunning()) {
        await engine.initOrResume();
      }
      setActiveSceneId(scene.id);
      setSaveMode(false);
      engine.morphToScene(scene);

      morphAnimRef.current = {
        startTime: performance.now(),
        durationMs: 1500,
        fromChannels: {
          feltPiano: channels.feltPiano.gain,
          warmPad: channels.warmPad.gain,
          highShimmer: channels.highShimmer.gain,
          subBass: channels.subBass.gain,
          keyDrone: channels.keyDrone.gain,
        },
        toChannels: { ...scene.channels },
        fromShaping: { ...shaping },
        toShaping: { ...scene.shaping },
      };
      setMorphProgress(0);
      setIsMorphing(true);
    },
    [engine, channels, shaping],
  );

  const handleSelectCustomSlot = useCallback(
    (slotIndex: number) => {
      if (saveMode) {
        const snapshot: ScenePreset = {
          id: `custom-slot-${slotIndex}`,
          name: `User ${slotIndex + 1}`,
          description: 'Custom stage mix saved locally',
          isFactory: false,
          channels: {
            feltPiano: channels.feltPiano.gain,
            warmPad: channels.warmPad.gain,
            highShimmer: channels.highShimmer.gain,
            subBass: channels.subBass.gain,
            keyDrone: channels.keyDrone.gain,
          },
          shaping: {
            filterCutoff: shaping.filterCutoff,
            reverbMix: shaping.reverbMix,
            padAttack: shaping.padAttack,
            padRelease: shaping.padRelease,
          },
        };
        setCustomSlots((prev) => {
          const next = [...prev];
          next[slotIndex] = snapshot;
          try {
            localStorage.setItem(CUSTOM_SCENES_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Ignore quota errors
          }
          return next;
        });
        setActiveSceneId(snapshot.id);
        setSaveMode(false);
      } else {
        const target = customSlots[slotIndex];
        if (target) {
          handleSelectScene(target);
        }
      }
    },
    [saveMode, channels, shaping, customSlots, handleSelectScene],
  );

  // Drone Controls
  const handleToggleDrone = useCallback(async () => {
    const next = !droneEnabled;
    setDroneEnabled(next);
    await engine.setDroneEnabled(next);
  }, [droneEnabled, engine]);

  const handleSelectDroneKey = useCallback(
    async (key: MusicalKey) => {
      if (droneEnabled && droneKey === key) {
        // Clicking the active drone key tile again unpresses it (turns drone off)
        setDroneEnabled(false);
        await engine.setDroneEnabled(false);
        return;
      }
      if (!droneEnabled) {
        setDroneKey(key);
        setDroneEnabled(true);
        await engine.setDroneKey(key);
        await engine.setDroneEnabled(true);
        return;
      }
      setDroneKey(key);
      await engine.setDroneKey(key);
    },
    [droneEnabled, droneKey, engine],
  );

  // Emergency Panic
  const handlePanic = useCallback(() => {
    activeChordTriggersRef.current.clear();
    sustainedRootMapRef.current.clear();
    unpressedOnTapRef.current.clear();
    activePadChordNotesRef.current = [];
    setActivePadChordId(null);
    activeQwertyKeysRef.current.clear();
    setSustainLatch(false);
    setSpaceSustain(false);
    engine.panic();
  }, [engine]);

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-[#0f172a] text-slate-100">
      <TopBar
        audioRunning={audioRunning}
        onStartAudio={handleStartAudio}
        midi={midiState}
        activeVoicesCount={activeVoicesCount}
        onPanic={handlePanic}
      />

      {/* Audio Engine Activation Banner / Overlay when suspended */}
      {!audioRunning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audio Engine Activation"
          className="fixed inset-0 z-50 bg-[#0f172a]/85 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-[#151f32] border border-slate-700 rounded-lg p-6 flex flex-col items-start gap-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-50">SanctuaryKeys Audio Engine</h2>
                <p className="text-xs text-slate-400">Real-time Web Audio Synthesizer &amp; Cathedral Reverb</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Click below to initialize the unified Web Audio synthesizer, 5-channel mixer, and
              hardware MIDI listener for live stage performance.
            </p>
            <button
              type="button"
              onClick={handleStartAudio}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-md bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-sm font-bold tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Start Audio Engine
            </button>
          </div>
        </div>
      )}

      {/* Main Single-Screen Performance Console */}
      <main className="flex-1 min-h-0 flex flex-col gap-2.5 lg:gap-3 p-2.5 lg:p-3.5 max-w-[1600px] w-full mx-auto">
        {/* Upper Deck: Scene Morph Presets + 12-Key Drone Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 lg:gap-3 shrink-0">
          <div className="xl:col-span-7">
            <SceneMorphBar
              factoryScenes={FACTORY_SCENES}
              customSlots={customSlots}
              activeSceneId={activeSceneId}
              morphProgress={morphProgress}
              isMorphing={isMorphing}
              saveMode={saveMode}
              onToggleSaveMode={() => setSaveMode((s) => !s)}
              onSelectScene={handleSelectScene}
              onSelectCustomSlot={handleSelectCustomSlot}
            />
          </div>
          <div className="xl:col-span-5">
            <DronePadGrid
              droneEnabled={droneEnabled}
              activeKey={droneKey}
              isCrossfading={crossfadeState.isCrossfading}
              crossfadeProgress={crossfadeState.progress}
              onToggleDrone={handleToggleDrone}
              onSelectKey={handleSelectDroneKey}
            />
          </div>
        </div>

        {/* Middle Deck: 5-Channel Mixer + Performance Shaping */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3 flex-1 min-h-0">
          <div className="lg:col-span-7 min-h-0">
            <LayerMixer
              channels={channels}
              levels={levels}
              onGainChange={handleChannelGainChange}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
            />
          </div>
          <div className="lg:col-span-5 min-h-0">
            <PerformanceControls
              shaping={shaping}
              onFilterCutoffChange={handleFilterCutoffChange}
              onMasterSwellChange={handleMasterSwellChange}
              onReverbMixChange={handleReverbMixChange}
              onReverbDecayChange={handleReverbDecayChange}
              onPadAttackChange={handlePadAttackChange}
              onPadReleaseChange={handlePadReleaseChange}
            />
          </div>
        </div>

        {/* Bottom Deck: One-Click Pad Chords + 2-Octave Interactive Piano Keyboard */}
        <KeyboardDeck
          octaveShift={octaveShift}
          sustainLatch={sustainLatch}
          spaceSustain={spaceSustain || midiSustain}
          chordMode={chordMode}
          chordVoicing={chordVoicing}
          scaleMode={scaleMode}
          droneKey={droneKey}
          activeNotes={activeNotes}
          activePadChordId={activePadChordId}
          onOctaveChange={(delta) => setOctaveShift((o) => Math.max(-2, Math.min(2, o + delta)))}
          onToggleSustainLatch={() => setSustainLatch((s) => !s)}
          onToggleChordMode={() => setChordMode((c) => !c)}
          onSelectChordVoicing={(v) => {
            setChordVoicing(v);
            setChordMode(true);
          }}
          onSelectScaleMode={(mode) => setScaleMode(mode)}
          onTriggerOneClickChord={handleTriggerOneClickChord}
          onReleaseOneClickChord={releaseOneClickChord}
          onPressKey={(midi) => triggerPlayKey(midi, 0.85, true)}
          onReleaseKey={(midi) => releasePlayKey(midi)}
        />
      </main>
    </div>
  );
}
