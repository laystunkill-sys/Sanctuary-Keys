import { DEFAULT_PIANO_TONE_ID, PianoToneParams, getPianoTone } from './pianoTones';
import {
  ChannelId,
  ChannelState,
  INITIAL_CHANNELS,
  INITIAL_SHAPING,
  MUSICAL_KEYS,
  MusicalKey,
  ScenePreset,
  ShapingParams,
  midiToFreq,
} from '../types/synth';

interface ChannelBus {
  input: GainNode;
  faderGain: GainNode;
  muteSoloGain: GainNode;
  analyser: AnalyserNode;
  dataArray: Float32Array<ArrayBuffer>;
}

interface ActiveVoice {
  id: number;
  midi: number;
  startTime: number;
  released: boolean;
  stopTimeout?: number;
  pianoOnly?: boolean;
  padOnly?: boolean;
  // Layer gain envelopes
  pianoEnv: GainNode;
  padEnv: GainNode;
  shimmerEnv: GainNode;
  subEnv: GainNode;
  cleanup: () => void;
}

interface DroneBus {
  busGain: GainNode;
  stopNodes: () => void;
}

export interface VoiceTriggerOptions {
  softSwell?: boolean;
  delayOffsetSec?: number;
  // Piano layer only (used by the background player): cheaper, no pad/shimmer/sub layers
  pianoOnly?: boolean;
  // Pad layer only (used by the background player underneath the piano)
  padOnly?: boolean;
}

const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

// Fewer simultaneous notes on phones keeps the audio thread from running dry.
const MAX_POLY_VOICES = IS_MOBILE ? 5 : 18;
const MAX_REVERB_SEC = IS_MOBILE ? 1.8 : 10;
// Phones run the whole engine at half sample-rate (about half the CPU work).
const MOBILE_SAMPLE_RATE = 24000;
// Piano-only voices (background player): headroom for 5-note 2-octave grand piano chords
const MAX_PIANO_ONLY_VOICES = IS_MOBILE ? 14 : 28;
const MAX_PAD_ONLY_VOICES = IS_MOBILE ? 10 : 20;
// The convolution reverb is the heaviest single node. Off on phones; echo tail is used instead.
// Set to true to bring it back on phones.
const MOBILE_CONVOLVER = false;
const USE_CONVOLVER = !IS_MOBILE || MOBILE_CONVOLVER;
const DRONE_CROSSFADE_SEC = 4.0;
const SCENE_MORPH_SEC = 1.5;

type VoiceKind = 'full' | 'piano' | 'pad';
const kindOf = (v: { pianoOnly?: boolean; padOnly?: boolean }): VoiceKind =>
  v.pianoOnly ? 'piano' : v.padOnly ? 'pad' : 'full';

export class WorshipAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // 5-Channel Mixer Buses
  private channels: Record<ChannelId, ChannelBus> | null = null;
  private channelStates: Record<ChannelId, ChannelState> = structuredClone(INITIAL_CHANNELS);
  private shaping: ShapingParams = { ...INITIAL_SHAPING };

  // Master Effects Chain
  private preMasterSum: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private pianoTone: PianoToneParams = getPianoTone(DEFAULT_PIANO_TONE_ID).params;
  private pianoWaves: Record<string, PeriodicWave> = {};
  private pianoUpperWaves: Record<string, PeriodicWave> = {};
  private hammerBuffer: AudioBuffer | null = null;
  private panicListeners = new Set<() => void>();
  private shimmerDelayL: DelayNode | null = null;
  private shimmerDelayR: DelayNode | null = null;
  private shimmerFeedbackL: GainNode | null = null;
  private shimmerFeedbackR: GainNode | null = null;
  private shimmerHighOsc: OscillatorNode | null = null;
  private masterSwellGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;

  // Polyphonic Voices
  private voiceCounter = 0;
  private heldKeys = new Set<number>();
  private sustainedNotes = new Set<number>();
  private activeVoices = new Map<number, ActiveVoice[]>(); // midi -> voices
  private sustainActive = false;

  // Drone Engine (Dual alternating buses for 4s equal-power crossfades)
  private droneEnabled = false;
  private droneKey: MusicalKey = 'C';
  private activeDroneBus: DroneBus | null = null;
  private outgoingDroneCleanupTimer: number | null = null;
  private crossfadeStartMs = 0;
  private isCrossfading = false;

  // Listeners
  private onStateChange?: () => void;

  public setPianoTone(id: string) {
    this.pianoTone = getPianoTone(id).params;
  }

  public addPanicListener(cb: () => void): () => void {
    this.panicListeners.add(cb);
    return () => {
      this.panicListeners.delete(cb);
    };
  }

  public setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  public getContextState(): AudioContextState | 'uninitialized' {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  public isRunning(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  public async initOrResume(): Promise<boolean> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Phones: bigger buffer + half sample-rate to prevent audio-thread underrun crackles
      this.ctx = new AudioCtx(
        IS_MOBILE
          ? { latencyHint: 'playback', sampleRate: MOBILE_SAMPLE_RATE }
          : { latencyHint: 'balanced' },
      );
      this.buildGraph();
      this.isInitialized = true;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.onStateChange?.();
    return this.ctx.state === 'running';
  }

  private buildGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Master Summing & Effects Chain (calibrated headroom for polyphonic chords)
    this.preMasterSum = ctx.createGain();
    this.preMasterSum.gain.value = 0.36;

    // Strip subsonic <45Hz rumble that causes phone speakers to boom and rattle
    const subsonicHP = ctx.createBiquadFilter();
    subsonicHP.type = 'highpass';
    subsonicHP.frequency.value = 45;
    subsonicHP.Q.value = 0.7;

    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = this.shaping.filterCutoff;
    this.masterFilter.Q.value = 0.85;

    // Dry / Wet Cathedral + Shimmer Reverb Bus
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.applyReverbMixImmediate(this.shaping.reverbMix);

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.72;

    this.convolver = ctx.createConvolver();
    // Keep explicit IR gain without unpredictable RMS auto-boost
    this.convolver.normalize = false;
    if (USE_CONVOLVER) {
      this.convolver.buffer = this.generateCathedralIR(this.shaping.reverbDecay);
    }

    // Clean Stereo Feedback Delay feeding the Cathedral Convolver (no nonlinear waveshaper crackle)
    const delayInputLP = ctx.createBiquadFilter();
    delayInputLP.type = 'lowpass';
    delayInputLP.frequency.value = 4200;

    const delayInputHP = ctx.createBiquadFilter();
    delayInputHP.type = 'highpass';
    delayInputHP.frequency.value = 280;

    this.shimmerDelayL = ctx.createDelay(2.0);
    this.shimmerDelayL.delayTime.value = 0.29;
    this.shimmerDelayR = ctx.createDelay(2.0);
    this.shimmerDelayR.delayTime.value = 0.41;

    // Gentle chorus modulation on delay tail
    const modLfo = ctx.createOscillator();
    modLfo.type = 'sine';
    modLfo.frequency.value = 0.24;
    const modDepthL = ctx.createGain();
    modDepthL.gain.value = 0.0014;
    const modDepthR = ctx.createGain();
    modDepthR.gain.value = -0.0012;
    modLfo.connect(modDepthL);
    modLfo.connect(modDepthR);
    modDepthL.connect(this.shimmerDelayL.delayTime);
    modDepthR.connect(this.shimmerDelayR.delayTime);
    modLfo.start();
    this.shimmerHighOsc = modLfo;

    this.shimmerFeedbackL = ctx.createGain();
    this.shimmerFeedbackL.gain.value = 0.26;
    this.shimmerFeedbackR = ctx.createGain();
    this.shimmerFeedbackR.gain.value = 0.24;

    const merger = ctx.createChannelMerger(2);
    const wetToneFilter = ctx.createBiquadFilter();
    wetToneFilter.type = 'lowpass';
    wetToneFilter.frequency.value = 6400;

    // Master Swell (Expression Pedal CC 11 / Slider)
    this.masterSwellGain = ctx.createGain();
    this.masterSwellGain.gain.value = this.shaping.masterSwell;

    // Master Dynamics Limiter
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -10.0;
    this.masterLimiter.knee.value = 10.0;
    this.masterLimiter.ratio.value = 8.0;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.22;

    // Final soft-saturation ceiling so peak samples never exceed +/- 0.88 on phone DACs
    const safetyClipper = ctx.createWaveShaper();
    const clipLen = 1024;
    const clipCurve = new Float32Array(clipLen);
    for (let i = 0; i < clipLen; i++) {
      const x = (i * 2) / (clipLen - 1) - 1;
      clipCurve[i] = Math.tanh(x * 1.15) * 0.88;
    }
    safetyClipper.curve = clipCurve;
    safetyClipper.oversample = IS_MOBILE ? 'none' : '2x';

    // Wire Master Signal Chain
    this.preMasterSum.connect(subsonicHP);
    subsonicHP.connect(this.masterFilter);

    // Dry path
    this.masterFilter.connect(this.dryGain);
    this.dryGain.connect(this.masterSwellGain);

    // Wet path: Filter -> Reverb Send -> Convolver + Clean Stereo Delay Tail -> Wet Gain
    this.masterFilter.connect(this.reverbSend);
    if (USE_CONVOLVER) this.reverbSend.connect(this.convolver);

    this.reverbSend.connect(delayInputHP);
    delayInputHP.connect(delayInputLP);
    delayInputLP.connect(this.shimmerDelayL);
    delayInputLP.connect(this.shimmerDelayR);

    this.shimmerDelayL.connect(this.shimmerFeedbackL);
    this.shimmerFeedbackL.connect(this.shimmerDelayR);
    this.shimmerDelayR.connect(this.shimmerFeedbackR);
    this.shimmerFeedbackR.connect(this.shimmerDelayL);

    this.shimmerDelayL.connect(merger, 0, 0);
    this.shimmerDelayR.connect(merger, 0, 1);
    if (USE_CONVOLVER) merger.connect(this.convolver);

    if (USE_CONVOLVER) {
      this.convolver.connect(wetToneFilter);
    } else {
      merger.connect(wetToneFilter);
    }
    wetToneFilter.connect(this.wetGain);
    this.wetGain.connect(this.masterSwellGain);

    this.masterSwellGain.connect(this.masterLimiter);
    this.masterLimiter.connect(safetyClipper);
    safetyClipper.connect(ctx.destination);

    // 2. Build 5-Channel Mixer Buses
    const ids: ChannelId[] = ['feltPiano', 'warmPad', 'highShimmer', 'subBass', 'keyDrone'];
    const buses = {} as Record<ChannelId, ChannelBus>;

    for (const id of ids) {
      const input = ctx.createGain();
      input.gain.value = 1.0;

      const faderGain = ctx.createGain();
      faderGain.gain.value = this.channelStates[id].gain;

      const muteSoloGain = ctx.createGain();
      muteSoloGain.gain.value = 1.0;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      if (id === 'feltPiano') {
        // 9-foot Concert Grand soundboard cabinet EQ (built once per graph, zero per-note CPU)
        const boardLowCut = ctx.createBiquadFilter();
        boardLowCut.type = 'highpass';
        boardLowCut.frequency.value = 28;
        boardLowCut.Q.value = 0.7;

        const boardChest = ctx.createBiquadFilter();
        boardChest.type = 'peaking';
        boardChest.frequency.value = 145;
        boardChest.Q.value = 0.85;
        boardChest.gain.value = 2.6;

        const boardWood = ctx.createBiquadFilter();
        boardWood.type = 'peaking';
        boardWood.frequency.value = 380;
        boardWood.Q.value = 0.8;
        boardWood.gain.value = 1.2;

        const boardSilk = ctx.createBiquadFilter();
        boardSilk.type = 'highshelf';
        boardSilk.frequency.value = 3000;
        boardSilk.gain.value = -2.2;

        input.connect(boardLowCut);
        boardLowCut.connect(boardChest);
        boardChest.connect(boardWood);
        boardWood.connect(boardSilk);
        boardSilk.connect(faderGain);

        faderGain.connect(muteSoloGain);
        muteSoloGain.connect(analyser);

        // Route piano dry-forward straight to master swell, bypassing the dark pad filter & chorus-shimmer wash
        const pianoDirect = ctx.createGain();
        pianoDirect.gain.value = 0.46;
        analyser.connect(pianoDirect);
        pianoDirect.connect(this.masterSwellGain);

        // Light natural concert hall room ambiance (unmodulated, zero pad wash)
        if (USE_CONVOLVER) {
          const pianoRoomSend = ctx.createGain();
          pianoRoomSend.gain.value = 0.1;
          analyser.connect(pianoRoomSend);
          pianoRoomSend.connect(this.convolver);
        }
      } else {
        input.connect(faderGain);
        faderGain.connect(muteSoloGain);
        muteSoloGain.connect(analyser);
        analyser.connect(this.preMasterSum);
      }

      buses[id] = {
        input,
        faderGain,
        muteSoloGain,
        analyser,
        dataArray: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)),
      };
    }

    this.channels = buses;
    this.buildAcousticPianoAssets(ctx);
    this.recomputeMuteSolo();
  }

  // Precompute Concert Grand string harmonic tables (wound bass + singing treble) & wool-felt hammer buffer
  private buildAcousticPianoAssets(ctx: AudioContext) {
    // Tier 1: rich concert grand string body (strong 2nd/3rd harmonics in bass give real grand piano authority)
    const bodyProfiles: Record<PianoToneParams['waveProfile'], Record<'bass' | 'mid' | 'treble', number[]>> = {
      grand: {
        bass: [0, 0.82, 1.0, 0.78, 0.56, 0.36, 0.22, 0.13, 0.07, 0.035],
        mid: [0, 1.0, 0.62, 0.34, 0.17, 0.085, 0.04, 0.018],
        treble: [0, 1.0, 0.42, 0.14, 0.04, 0.01],
      },
      warm: {
        bass: [0, 0.86, 1.0, 0.7, 0.46, 0.28, 0.15, 0.075],
        mid: [0, 1.0, 0.54, 0.26, 0.12, 0.05, 0.02],
        treble: [0, 1.0, 0.32, 0.09, 0.02],
      },
      upright: {
        bass: [0, 0.76, 1.0, 0.8, 0.58, 0.38, 0.24, 0.14, 0.08],
        mid: [0, 1.0, 0.64, 0.38, 0.2, 0.1, 0.048],
        treble: [0, 1.0, 0.45, 0.16, 0.048],
      },
      felt: {
        bass: [0, 0.92, 0.85, 0.5, 0.26, 0.12, 0.05],
        mid: [0, 1.0, 0.4, 0.14, 0.045, 0.015],
        treble: [0, 1.0, 0.24, 0.05],
      },
    };

    // Tier 2: gentle steel-string overtone warmth at 2*freq (no harsh metallic mini-piano chime)
    const upperProfiles: Record<PianoToneParams['waveProfile'], number[]> = {
      grand: [0, 0.65, 0.28, 0.1, 0.035],
      warm: [0, 0.55, 0.2, 0.06],
      upright: [0, 0.72, 0.34, 0.13, 0.045],
      felt: [0, 0.42, 0.12, 0.03],
    };

    const waves: Record<string, PeriodicWave> = {};
    const upperWaves: Record<string, PeriodicWave> = {};
    (Object.keys(bodyProfiles) as PianoToneParams['waveProfile'][]).forEach((profile) => {
      (['bass', 'mid', 'treble'] as const).forEach((reg) => {
        const harmonics = bodyProfiles[profile][reg];
        const real = new Float32Array(harmonics.length);
        const imag = new Float32Array(harmonics.length);
        for (let n = 1; n < harmonics.length; n++) {
          imag[n] = harmonics[n];
          real[n] = harmonics[n] * (n % 2 === 0 ? 0.06 : -0.04);
        }
        waves[`${profile}-${reg}`] = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
      });

      const uh = upperProfiles[profile];
      const uReal = new Float32Array(uh.length);
      const uImag = new Float32Array(uh.length);
      for (let n = 1; n < uh.length; n++) {
        uImag[n] = uh[n];
      }
      upperWaves[profile] = ctx.createPeriodicWave(uReal, uImag, { disableNormalization: false });
    });
    this.pianoWaves = waves;
    this.pianoUpperWaves = upperWaves;

    // 55ms heavy wool-felt hammer thump + warm wood bridge knock
    const len = Math.max(256, Math.floor(ctx.sampleRate * 0.055));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      const knock = Math.sin(2 * Math.PI * 105 * t) * Math.exp(-t / 0.008) * 0.65;
      const white = Math.random() * 2 - 1;
      lp = lp + 0.28 * (white - lp);
      const feltEnv = Math.exp(-t / 0.009);
      data[i] = knock + lp * feltEnv * 0.68;
    }
    this.hammerBuffer = buf;
  }

  private generateCathedralIR(decaySeconds: number): AudioBuffer {
    decaySeconds = Math.min(decaySeconds, MAX_REVERB_SEC);
    const ctx = this.ctx!;
    const sampleRate = ctx.sampleRate;
    // Cap IR length on mobile phones so convolution never starves the audio thread
    const effectiveDecay = IS_MOBILE ? Math.min(decaySeconds, 2.8) : Math.min(decaySeconds, 6.0);
    const length = Math.max(sampleRate, Math.floor(sampleRate * effectiveDecay));
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Smooth low-passed cathedral tail with calibrated gain (normalize = false)
    let lpL = 0;
    let lpR = 0;
    const damp = 0.28;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.pow(1 - i / length, 2.2) * Math.exp((-3.0 * t) / effectiveDecay);
      const preBloom = t < 0.025 ? t / 0.025 : 1;

      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      lpL = lpL + damp * (whiteL - lpL);
      lpR = lpR + damp * (whiteR - lpR);

      left[i] = lpL * env * preBloom * 0.045;
      right[i] = lpR * env * preBloom * 0.045;
    }

    const taps = [0.024, 0.043, 0.068, 0.097];
    taps.forEach((tapSec, idx) => {
      const idxSample = Math.floor(tapSec * sampleRate);
      if (idxSample < length) {
        const amp = 0.032 / (idx + 1);
        left[idxSample] += amp * (idx % 2 === 0 ? 1 : 0.7);
        right[idxSample] += amp * (idx % 2 === 1 ? 1 : 0.7);
      }
    });

    return buffer;
  }

  // --- Mixer & Effects Parameter Setters ---

  public setChannelGain(id: ChannelId, gain: number) {
    const clamped = Math.max(0, Math.min(1, gain));
    this.channelStates[id].gain = clamped;
    if (this.channels && this.ctx) {
      const now = this.ctx.currentTime;
      const param = this.channels[id].faderGain.gain;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(clamped, now, 0.015);
    }
  }

  public setChannelMute(id: ChannelId, muted: boolean) {
    this.channelStates[id].muted = muted;
    this.recomputeMuteSolo();
  }

  public setChannelSolo(id: ChannelId, soloed: boolean) {
    this.channelStates[id].soloed = soloed;
    this.recomputeMuteSolo();
  }

  private recomputeMuteSolo() {
    if (!this.channels || !this.ctx) return;
    const now = this.ctx.currentTime;
    const anySoloed = Object.values(this.channelStates).some((c) => c.soloed);

    (Object.keys(this.channelStates) as ChannelId[]).forEach((id) => {
      const ch = this.channelStates[id];
      const audible = anySoloed ? ch.soloed && !ch.muted : !ch.muted;
      const target = audible ? 1.0 : 0.0;
      const param = this.channels![id].muteSoloGain.gain;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(target, now, 0.02);
    });
  }

  public setFilterCutoff(hz: number) {
    const clamped = Math.max(120, Math.min(12000, hz));
    this.shaping.filterCutoff = clamped;
    if (this.masterFilter && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterFilter.frequency.cancelScheduledValues(now);
      this.masterFilter.frequency.setTargetAtTime(clamped, now, 0.02);
    }
  }

  public setMasterSwell(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.shaping.masterSwell = clamped;
    if (this.masterSwellGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterSwellGain.gain.cancelScheduledValues(now);
      this.masterSwellGain.gain.setTargetAtTime(clamped, now, 0.02);
    }
  }

  private applyReverbMixImmediate(mix: number) {
    if (!this.dryGain || !this.wetGain) return;
    const dry = Math.cos(mix * Math.PI * 0.5);
    const wet = Math.sin(mix * Math.PI * 0.5) * 1.15;
    this.dryGain.gain.value = dry;
    this.wetGain.gain.value = wet;
  }

  public setReverbMix(mix: number) {
    const clamped = Math.max(0, Math.min(1, mix));
    this.shaping.reverbMix = clamped;
    if (this.dryGain && this.wetGain && this.ctx) {
      const now = this.ctx.currentTime;
      const dry = Math.cos(clamped * Math.PI * 0.5);
      const wet = Math.sin(clamped * Math.PI * 0.5) * 1.15;
      this.dryGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.setTargetAtTime(dry, now, 0.02);
      this.wetGain.gain.setTargetAtTime(wet, now, 0.02);
    }
  }

  private irTimer: number | undefined;

  public setReverbDecay(decaySec: number) {
    const clamped = Math.max(2, Math.min(10, decaySec));
    this.shaping.reverbDecay = clamped;
    window.clearTimeout(this.irTimer);
    this.irTimer = window.setTimeout(() => {
      if (USE_CONVOLVER && this.convolver && this.ctx) {
        this.convolver.buffer = this.generateCathedralIR(clamped);
      }
    }, 250);
  }

  public setPadAttack(sec: number) {
    this.shaping.padAttack = Math.max(0.5, Math.min(2.0, sec));
  }

  public setPadRelease(sec: number) {
    this.shaping.padRelease = Math.max(1.5, Math.min(5.0, sec));
  }

  // Smooth 1.5s Scene Morph using linearRampToValueAtTime
  public morphToScene(scene: ScenePreset) {
    (Object.keys(scene.channels) as ChannelId[]).forEach((id) => {
      this.channelStates[id].gain = scene.channels[id];
    });
    this.shaping.filterCutoff = scene.shaping.filterCutoff;
    this.shaping.reverbMix = scene.shaping.reverbMix;
    this.shaping.padAttack = scene.shaping.padAttack;
    this.shaping.padRelease = scene.shaping.padRelease;

    if (!this.ctx || !this.channels || !this.masterFilter || !this.dryGain || !this.wetGain) {
      return;
    }

    const now = this.ctx.currentTime;
    const end = now + SCENE_MORPH_SEC;

    (Object.keys(scene.channels) as ChannelId[]).forEach((id) => {
      const param = this.channels![id].faderGain.gain;
      const currentVal = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(currentVal, now);
      param.linearRampToValueAtTime(scene.channels[id], end);
    });

    const filterParam = this.masterFilter.frequency;
    const curFilter = filterParam.value;
    filterParam.cancelScheduledValues(now);
    filterParam.setValueAtTime(curFilter, now);
    filterParam.linearRampToValueAtTime(scene.shaping.filterCutoff, end);

    const mix = scene.shaping.reverbMix;
    const targetDry = Math.cos(mix * Math.PI * 0.5);
    const targetWet = Math.sin(mix * Math.PI * 0.5) * 1.15;

    const curDry = this.dryGain.gain.value;
    this.dryGain.gain.cancelScheduledValues(now);
    this.dryGain.gain.setValueAtTime(curDry, now);
    this.dryGain.gain.linearRampToValueAtTime(targetDry, end);

    const curWet = this.wetGain.gain.value;
    this.wetGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.setValueAtTime(curWet, now);
    this.wetGain.gain.linearRampToValueAtTime(targetWet, end);
  }

  // --- Channel Live Level Metering ---

  public getChannelLevels(): Record<ChannelId, number> {
    const out: Record<ChannelId, number> = {
      feltPiano: 0,
      warmPad: 0,
      highShimmer: 0,
      subBass: 0,
      keyDrone: 0,
    };
    if (!this.channels || !this.isRunning()) return out;

    (Object.keys(this.channels) as ChannelId[]).forEach((id) => {
      const bus = this.channels![id];
      bus.analyser.getFloatTimeDomainData(bus.dataArray);
      let sum = 0;
      for (let i = 0; i < bus.dataArray.length; i++) {
        const s = bus.dataArray[i];
        sum += s * s;
      }
      const rms = Math.sqrt(sum / bus.dataArray.length);
      // Musical meter curve (~ -42dB to 0dB mapped cleanly 0..1)
      const normalized = Math.min(1, Math.pow(rms * 3.8, 0.65));
      out[id] = normalized;
    });

    return out;
  }

  // --- Polyphonic 4-Layer Voice Engine ---

  public async noteOn(midi: number, velocity = 0.85, options?: VoiceTriggerOptions) {
    if (!this.isInitialized || this.ctx?.state === 'suspended') {
      await this.initOrResume();
    }
    if (!this.ctx || !this.channels) return;

    this.heldKeys.add(midi);
    this.sustainedNotes.delete(midi);

    // Release any existing sounding voice of the same pitch gently to prevent buildup
    const wantKind: VoiceKind = options?.pianoOnly ? 'piano' : options?.padOnly ? 'pad' : 'full';
    const existing = this.activeVoices.get(midi);
    if (existing && existing.length > 0) {
      existing.forEach((v) => {
        if (!v.released && kindOf(v) === wantKind) {
          this.releaseVoice(v, options?.softSwell ? 0.35 : 0.08);
        }
      });
    }

    // Voice stealing if polyphony exceeds the cap (full voices and piano-only voices are counted separately)
    const pool: ActiveVoice[] = [];
    this.activeVoices.forEach((list) => {
      list.forEach((v) => {
        if (kindOf(v) === wantKind) pool.push(v);
      });
    });
    const cap =
      wantKind === 'piano' ? MAX_PIANO_ONLY_VOICES : wantKind === 'pad' ? MAX_PAD_ONLY_VOICES : MAX_POLY_VOICES;
    if (pool.length >= cap) {
      const oldest = pool.filter((v) => !v.released).sort((a, b) => a.startTime - b.startTime)[0];
      if (oldest) {
        this.releaseVoice(oldest, 0.04);
      }
    }

    const voice = this.spawnPolyVoice(midi, Math.max(0.1, Math.min(1, velocity)), options);
    const list = this.activeVoices.get(midi) ?? [];
    list.push(voice);
    this.activeVoices.set(midi, list);
    this.onStateChange?.();
  }

  public noteOff(midi: number) {
    this.heldKeys.delete(midi);
    if (this.sustainActive) {
      this.sustainedNotes.add(midi);
      this.onStateChange?.();
      return;
    }

    const list = this.activeVoices.get(midi);
    if (list) {
      list.forEach((v) => {
        if (!v.released && kindOf(v) === 'full') {
          this.releaseVoice(v);
        }
      });
    }
    this.onStateChange?.();
  }

  // Used by the background player: releases only that player's piano or pad voices for a pitch
  public releaseNote(midi: number, kind: 'piano' | 'pad') {
    this.heldKeys.delete(midi);
    const list = this.activeVoices.get(midi);
    if (list) {
      list.forEach((v) => {
        if (!v.released && kindOf(v) === kind) {
          this.releaseVoice(v);
        }
      });
    }
    this.onStateChange?.();
  }

  public releasePadNote(midi: number) {
    this.heldKeys.delete(midi);
    this.sustainedNotes.delete(midi);
    const list = this.activeVoices.get(midi);
    if (list) {
      list.forEach((v) => {
        if (!v.released && kindOf(v) === 'full') {
          this.releaseVoice(v);
        }
      });
    }
    this.onStateChange?.();
  }

  public setSustain(active: boolean) {
    this.sustainActive = active;
    if (!active) {
      const toRelease = Array.from(this.sustainedNotes);
      this.sustainedNotes.clear();
      toRelease.forEach((midi) => {
        if (!this.heldKeys.has(midi)) {
          const list = this.activeVoices.get(midi);
          if (list) {
            list.forEach((v) => {
              if (!v.released && kindOf(v) === 'full') this.releaseVoice(v);
            });
          }
        }
      });
    }
    this.onStateChange?.();
  }

  public panic() {
    this.panicListeners.forEach((cb) => cb());
    this.heldKeys.clear();
    this.sustainedNotes.clear();
    this.sustainActive = false;

    const all: ActiveVoice[] = [];
    this.activeVoices.forEach((list) => all.push(...list));
    all.forEach((v) => this.releaseVoice(v, 0.02));
    this.activeVoices.clear();
    this.onStateChange?.();
  }

  public getActiveNotes(): Set<number> {
    const set = new Set<number>(this.heldKeys);
    this.sustainedNotes.forEach((n) => set.add(n));
    return set;
  }

  public isNoteSustained(midi: number): boolean {
    return this.sustainedNotes.has(midi) && !this.heldKeys.has(midi);
  }

  public getActiveVoiceCount(): number {
    let count = 0;
    this.activeVoices.forEach((list) => {
      count += list.length;
    });
    return count;
  }

  private buildRisingCurve(target: number, power: number): Float32Array {
    const steps = 64;
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      curve[i] = target * Math.pow(t, power);
    }
    return curve;
  }

  private spawnPolyVoice(
    midi: number,
    velocity: number,
    options?: VoiceTriggerOptions,
  ): ActiveVoice {
    const ctx = this.ctx!;
    const channels = this.channels!;
    const startAt = ctx.currentTime + (options?.delayOffsetSec ?? 0);
    const freq = midiToFreq(midi);
    const id = ++this.voiceCounter;
    const isSoftSwell = Boolean(options?.softSwell);
    const swellDuration = Math.max(1.5, this.shaping.padAttack * 1.45);

    const nodesToStop: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const nodesToDisconnect: AudioNode[] = [];

    // =========================================================================
    // LAYER 1: CONCERT ACOUSTIC GRAND PIANO (Un-padded, full-bodied)
    // Micro-unison grand string pair + stretched upper steel overtones +
    // heavy wool-felt hammer thump
    // =========================================================================
    const tone = this.pianoTone;
    const register: 'bass' | 'mid' | 'treble' = midi < 54 ? 'bass' : midi < 72 ? 'mid' : 'treble';
    const bodyWave = this.pianoWaves[`${tone.waveProfile}-${register}`];
    const upperWave = this.pianoUpperWaves[tone.waveProfile];

    const stringBody = ctx.createOscillator();
    if (bodyWave) stringBody.setPeriodicWave(bodyWave);
    else stringBody.type = 'triangle';
    stringBody.frequency.value = freq;
    stringBody.detune.value = -tone.unisonCents;

    // Micro-unison grand piano string partner on desktop (0.55 cents gives 3D grand size without chorus wobble)
    const stringBodyB = !IS_MOBILE ? ctx.createOscillator() : null;
    if (stringBodyB) {
      if (bodyWave) stringBodyB.setPeriodicWave(bodyWave);
      else stringBodyB.type = 'triangle';
      stringBodyB.frequency.value = freq;
      stringBodyB.detune.value = tone.unisonCents;
    }

    // Tier 2: Upper steel-string harmonics at 2x pitch with subtle inharmonic stretch
    const stringUpper = ctx.createOscillator();
    if (upperWave) stringUpper.setPeriodicWave(upperWave);
    else stringUpper.type = 'sine';
    stringUpper.frequency.value = freq * 2;
    stringUpper.detune.value = tone.stretchCents;

    const bodyGain = ctx.createGain();
    bodyGain.gain.value = stringBodyB ? 0.5 : 0.92;
    const bodyBGain = stringBodyB ? ctx.createGain() : null;
    if (bodyBGain) bodyBGain.gain.value = 0.44;
    const upperGain = ctx.createGain();
    upperGain.gain.value = 0;

    const pianoFilter = ctx.createBiquadFilter();
    pianoFilter.type = 'lowpass';
    pianoFilter.Q.value = tone.filterQ;
    const pitchWarmBase = Math.max(680 * tone.brightness, Math.min(3800 * tone.brightness, freq * tone.warmMul));
    if (isSoftSwell) {
      pianoFilter.frequency.setValueAtTime(Math.max(360, pitchWarmBase * 0.5), startAt);
      pianoFilter.frequency.exponentialRampToValueAtTime(pitchWarmBase, startAt + 0.9);
    } else {
      const brightPeak = Math.min(7800, freq * (3.6 + velocity * 3.8) * tone.brightness * tone.strike);
      pianoFilter.frequency.setValueAtTime(Math.max(pitchWarmBase + 180, brightPeak), startAt);
      pianoFilter.frequency.exponentialRampToValueAtTime(pitchWarmBase, startAt + tone.filterDecay);
    }

    const pianoEnv = ctx.createGain();
    pianoEnv.gain.value = 0;
    const decayTime = Math.max(tone.decayMin, tone.decayBase - (midi - 36) * tone.decaySlope);

    if (isSoftSwell) {
      const softPianoTarget = 0.16 * (0.45 + velocity * 0.55);
      pianoEnv.gain.setValueCurveAtTime(
        this.buildRisingCurve(softPianoTarget, 2.2),
        startAt + 0.002,
        Math.max(0.85, swellDuration * 0.65),
      );
    } else {
      const pianoPeak = tone.peak * (0.4 + velocity * 0.6);
      const peakAt = startAt + tone.attack;
      const bounceAt = peakAt + tone.fastDropTime;
      pianoEnv.gain.setValueAtTime(0.0001, startAt);
      pianoEnv.gain.linearRampToValueAtTime(pianoPeak, peakAt);
      pianoEnv.gain.exponentialRampToValueAtTime(Math.max(0.001, pianoPeak * tone.fastDropRatio), bounceAt);
      pianoEnv.gain.setTargetAtTime(0.0004, bounceAt + 0.001, Math.max(0.32, decayTime / 2.8));

      const upperPeak = tone.upperMix * (0.38 + velocity * 0.62);
      const upperTau = Math.max(0.055, tone.upperDecay * (midi >= 72 ? 0.6 : midi < 54 ? 1.2 : 1.0));
      upperGain.gain.setValueAtTime(0.0001, startAt);
      upperGain.gain.linearRampToValueAtTime(upperPeak, peakAt);
      upperGain.gain.setTargetAtTime(0.0001, peakAt + 0.001, upperTau);
    }

    // Grand piano stereo soundboard perspective (bass left, middle center, treble right)
    const keyPanVal = Math.max(-0.34, Math.min(0.34, ((midi - 60) / 34) * 0.34));
    const pianoPan = !IS_MOBILE ? ctx.createStereoPanner() : null;
    if (pianoPan) {
      pianoPan.pan.value = keyPanVal;
    }

    stringBody.connect(bodyGain);
    bodyGain.connect(pianoFilter);
    if (stringBodyB && bodyBGain) {
      stringBodyB.connect(bodyBGain);
      bodyBGain.connect(pianoFilter);
      nodesToDisconnect.push(bodyBGain);
    }
    stringUpper.connect(upperGain);
    upperGain.connect(pianoFilter);
    pianoFilter.connect(pianoEnv);

    if (pianoPan) {
      pianoEnv.connect(pianoPan);
      pianoPan.connect(channels.feltPiano.input);
      nodesToDisconnect.push(pianoPan);
    } else {
      pianoEnv.connect(channels.feltPiano.input);
    }

    const withPiano = !options?.padOnly;
    if (withPiano) {
      stringBody.start(startAt);
      stringUpper.start(startAt);
      nodesToStop.push(stringBody, stringUpper);
      if (stringBodyB) {
        stringBodyB.start(startAt);
        nodesToStop.push(stringBodyB);
      }

      // Warm wool-felt hammer thump
      if (!isSoftSwell && this.hammerBuffer && tone.hammerGain > 0) {
        const hammerSrc = ctx.createBufferSource();
        hammerSrc.buffer = this.hammerBuffer;

        const hammerFilter = ctx.createBiquadFilter();
        hammerFilter.type = 'bandpass';
        hammerFilter.frequency.value = Math.max(380, Math.min(2400, freq * tone.hammerBrightHz));
        hammerFilter.Q.value = 0.72;

        const hammerGain = ctx.createGain();
        hammerGain.gain.value = tone.hammerGain * (0.3 + velocity * 0.7) * 0.36;

        hammerSrc.connect(hammerFilter);
        hammerFilter.connect(hammerGain);
        hammerGain.connect(pianoPan ?? channels.feltPiano.input);

        hammerSrc.start(startAt);
        hammerSrc.stop(startAt + 0.055);
        nodesToStop.push(hammerSrc);
        nodesToDisconnect.push(hammerFilter, hammerGain);
      }
    }
    nodesToDisconnect.push(bodyGain, upperGain, pianoFilter, pianoEnv);

    // Hoisted so piano-only voices can return early with the same cleanup
    const cleanup = () => {
      nodesToStop.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // Ignore already stopped sources
        }
      });
      nodesToDisconnect.forEach((n) => {
        try {
          n.disconnect();
        } catch {
          // Ignore
        }
      });

      const list = this.activeVoices.get(midi);
      if (list) {
        const filtered = list.filter((v) => v.id !== id);
        if (filtered.length === 0) {
          this.activeVoices.delete(midi);
        } else {
          this.activeVoices.set(midi, filtered);
        }
      }
    };

    if (options?.pianoOnly) {
      // Background player voice: piano layer only. Idle gains stand in for the unused layers.
      const idle = ctx.createGain();
      return {
        id,
        midi,
        startTime: startAt,
        released: false,
        pianoOnly: true,
        pianoEnv,
        padEnv: idle,
        shimmerEnv: idle,
        subEnv: idle,
        cleanup,
      };
    }

    // =========================================================================
    // LAYER 2: WARM ANALOG PAD
    // Stereo-detuned Sawtooth + Triangle oscillators with slow attack & release
    // =========================================================================
    const padSawL = ctx.createOscillator();
    padSawL.type = 'sawtooth';
    padSawL.frequency.value = freq;
    padSawL.detune.value = -9;

    const padSawR = ctx.createOscillator();
    padSawR.type = 'sawtooth';
    padSawR.frequency.value = freq;
    padSawR.detune.value = 9;

    const padTri = ctx.createOscillator();
    padTri.type = 'triangle';
    padTri.frequency.value = freq;
    padTri.detune.value = 2;

    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.58;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.58;

    const padSawGain = ctx.createGain();
    padSawGain.gain.value = 0.2;
    const padTriGain = ctx.createGain();
    padTriGain.gain.value = 0.28;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    const padTargetFreq = Math.min(3200, Math.max(900, freq * 3.0));
    padFilter.Q.value = 0.7;
    if (isSoftSwell) {
      padFilter.frequency.setValueAtTime(340, startAt);
      padFilter.frequency.exponentialRampToValueAtTime(padTargetFreq, startAt + swellDuration);
    } else {
      padFilter.frequency.value = padTargetFreq;
    }

    const padEnv = ctx.createGain();
    padEnv.gain.value = 0;
    const padTarget = 0.24 * (0.55 + velocity * 0.45);
    if (isSoftSwell) {
      padEnv.gain.setValueCurveAtTime(
        this.buildRisingCurve(padTarget, 2.4),
        startAt + 0.002,
        swellDuration,
      );
    } else {
      padEnv.gain.setValueAtTime(0.0001, startAt);
      padEnv.gain.linearRampToValueAtTime(padTarget, startAt + this.shaping.padAttack);
    }

    padSawL.connect(panL);
    padSawR.connect(panR);
    panL.connect(padSawGain);
    panR.connect(padSawGain);
    padTri.connect(padTriGain);
    padSawGain.connect(padFilter);
    padTriGain.connect(padFilter);
    padFilter.connect(padEnv);
    padEnv.connect(channels.warmPad.input);

    padSawL.start(startAt);
    if (!IS_MOBILE) padSawR.start(startAt);
    padTri.start(startAt);
    nodesToStop.push(padSawL, padTri);
    if (!IS_MOBILE) nodesToStop.push(padSawR);
    nodesToDisconnect.push(panL, panR, padSawGain, padTriGain, padFilter, padEnv);

    if (options?.padOnly && IS_MOBILE) {
      // Phones: a background pad is just the warm pad layer (no shimmer or sub), to save CPU
      const idle = ctx.createGain();
      return {
        id,
        midi,
        startTime: startAt,
        released: false,
        padOnly: true,
        pianoEnv,
        padEnv,
        shimmerEnv: idle,
        subEnv: idle,
        cleanup,
      };
    }

    // =========================================================================
    // LAYER 3: HIGH SHIMMER LAYER
    // Octave-up (+12 semitones) ethereal sine/bell with subtle LFO vibrato
    // =========================================================================
    const shimmerFreq = midiToFreq(midi + 12);
    const shimmerOsc = ctx.createOscillator();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.value = shimmerFreq;

    const shimmerBell = ctx.createOscillator();
    shimmerBell.type = 'sine';
    shimmerBell.frequency.value = shimmerFreq * 2;

    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.type = 'sine';
    shimmerLfo.frequency.value = 4.3;
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.value = 7.5; // +/- 7.5 cents gentle vibrato

    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerOsc.detune);
    shimmerLfoGain.connect(shimmerBell.detune);

    const shimmerOscGain = ctx.createGain();
    shimmerOscGain.gain.value = 0.22;
    const shimmerBellGain = ctx.createGain();
    shimmerBellGain.gain.value = 0.06;

    const shimmerEnv = ctx.createGain();
    shimmerEnv.gain.value = 0;
    const shimmerAttack = isSoftSwell
      ? swellDuration * 1.15
      : Math.max(0.35, this.shaping.padAttack * 0.85);
    const shimmerTarget = 0.22 * (0.5 + velocity * 0.5);
    if (isSoftSwell) {
      shimmerEnv.gain.setValueCurveAtTime(
        this.buildRisingCurve(shimmerTarget, 2.7),
        startAt + 0.002,
        shimmerAttack,
      );
    } else {
      shimmerEnv.gain.setValueAtTime(0.0001, startAt);
      shimmerEnv.gain.linearRampToValueAtTime(shimmerTarget, startAt + shimmerAttack);
    }

    shimmerOsc.connect(shimmerOscGain);
    shimmerBell.connect(shimmerBellGain);
    shimmerOscGain.connect(shimmerEnv);
    shimmerBellGain.connect(shimmerEnv);
    shimmerEnv.connect(channels.highShimmer.input);

    shimmerOsc.start(startAt);
    nodesToStop.push(shimmerOsc);
    if (!IS_MOBILE) {
      shimmerBell.start(startAt);
      shimmerLfo.start(startAt);
      nodesToStop.push(shimmerBell, shimmerLfo);
    }
    nodesToDisconnect.push(shimmerLfoGain, shimmerOscGain, shimmerBellGain, shimmerEnv);

    // =========================================================================
    // LAYER 4: SUB-BASS LAYER
    // Clean sine sub-octave (-12 semitones), gently rolled off for phone speakers
    // =========================================================================
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = midiToFreq(midi - 12);

    const registerScale = midi <= 60 ? 1.0 : Math.max(0.18, 1 - (midi - 60) * 0.045);
    const subEnv = ctx.createGain();
    subEnv.gain.value = 0;
    const subTarget = 0.2 * registerScale * (0.5 + velocity * 0.5);
    if (isSoftSwell) {
      subEnv.gain.setValueCurveAtTime(
        this.buildRisingCurve(subTarget * 0.8, 2.0),
        startAt + 0.002,
        Math.max(0.9, swellDuration * 0.7),
      );
    } else {
      subEnv.gain.setValueAtTime(0.0001, startAt);
      subEnv.gain.linearRampToValueAtTime(subTarget, startAt + 0.04);
    }

    subOsc.connect(subEnv);
    subEnv.connect(channels.subBass.input);
    subOsc.start(startAt);
    nodesToStop.push(subOsc);
    nodesToDisconnect.push(subEnv);

    return {
      id,
      midi,
      startTime: startAt,
      released: false,
      pianoOnly: false,
      padOnly: Boolean(options?.padOnly),
      pianoEnv,
      padEnv,
      shimmerEnv,
      subEnv,
      cleanup,
    };
  }

  private releaseVoice(voice: ActiveVoice, overrideReleaseSec?: number) {
    if (!this.ctx || voice.released) return;
    voice.released = true;
    const now = this.ctx.currentTime;

    const pianoRel = overrideReleaseSec ?? this.pianoTone.release;
    const padRel = overrideReleaseSec ?? (voice.pianoOnly ? pianoRel : this.shaping.padRelease);
    const shimmerRel =
      overrideReleaseSec ?? (voice.pianoOnly ? pianoRel : Math.max(1.8, this.shaping.padRelease * 1.15));
    const subRel = overrideReleaseSec ?? (voice.pianoOnly ? pianoRel : 0.45);
    const maxRel = Math.max(pianoRel, padRel, shimmerRel, subRel);

    const rampOut = (gainNode: GainNode, duration: number) => {
      const param = gainNode.gain;
      const val = Math.max(0, param.value);
      param.cancelScheduledValues(now);
      param.setValueAtTime(val, now);
      // Smooth exponential decay to true zero without WebKit curve collisions
      param.setTargetAtTime(0, now, Math.max(0.015, duration / 4));
    };

    rampOut(voice.pianoEnv, pianoRel);
    rampOut(voice.padEnv, padRel);
    rampOut(voice.shimmerEnv, shimmerRel);
    rampOut(voice.subEnv, subRel);

    voice.stopTimeout = window.setTimeout(() => {
      voice.cleanup();
      this.onStateChange?.();
    }, (maxRel + 0.15) * 1000);
  }

  // --- Independent Continuous Key Drone Engine (Root + 5th across 2 octaves, no 3rd) ---

  public async setDroneEnabled(enabled: boolean) {
    if (enabled && (!this.isInitialized || this.ctx?.state === 'suspended')) {
      await this.initOrResume();
    }
    this.droneEnabled = enabled;
    if (!this.ctx || !this.channels) return;

    if (enabled) {
      this.triggerDroneKeyCrossfade(this.droneKey, 1.8);
    } else if (this.activeDroneBus) {
      const outgoing = this.activeDroneBus;
      this.activeDroneBus = null;
      const now = this.ctx.currentTime;
      const cur = outgoing.busGain.gain.value;
      outgoing.busGain.gain.cancelScheduledValues(now);
      outgoing.busGain.gain.setValueAtTime(cur, now);
      outgoing.busGain.gain.linearRampToValueAtTime(0, now + 1.2);
      if (this.outgoingDroneCleanupTimer) clearTimeout(this.outgoingDroneCleanupTimer);
      this.outgoingDroneCleanupTimer = window.setTimeout(() => {
        outgoing.stopNodes();
      }, 1300);
      this.isCrossfading = false;
    }
    this.onStateChange?.();
  }

  public async setDroneKey(key: MusicalKey) {
    this.droneKey = key;
    if (!this.droneEnabled) {
      this.onStateChange?.();
      return;
    }
    if (!this.isInitialized || this.ctx?.state === 'suspended') {
      await this.initOrResume();
    }
    this.triggerDroneKeyCrossfade(key, DRONE_CROSSFADE_SEC);
  }

  public getCrossfadeProgress(): { isCrossfading: boolean; progress: number } {
    if (!this.isCrossfading) return { isCrossfading: false, progress: 1 };
    const elapsed = (performance.now() - this.crossfadeStartMs) / 1000;
    const progress = Math.min(1, elapsed / DRONE_CROSSFADE_SEC);
    if (progress >= 1) {
      this.isCrossfading = false;
    }
    return { isCrossfading: this.isCrossfading, progress };
  }

  private triggerDroneKeyCrossfade(key: MusicalKey, fadeSec: number) {
    if (!this.ctx || !this.channels) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const incoming = this.createDroneBusForKey(key);
    const outgoing = this.activeDroneBus;
    this.activeDroneBus = incoming;

    // Equal-power fade-in curve (sin(t * pi/2))
    const steps = 64;
    const fadeInCurve = new Float32Array(steps);
    const fadeOutCurve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      fadeInCurve[i] = Math.sin(t * Math.PI * 0.5);
      fadeOutCurve[i] = Math.cos(t * Math.PI * 0.5);
    }

    incoming.busGain.gain.value = 0;
    incoming.busGain.gain.cancelScheduledValues(now);
    incoming.busGain.gain.setValueCurveAtTime(fadeInCurve, now + 0.002, fadeSec);

    if (outgoing) {
      const startLevel = Math.max(0.001, outgoing.busGain.gain.value);
      const scaledOut = new Float32Array(steps);
      for (let i = 0; i < steps; i++) {
        scaledOut[i] = fadeOutCurve[i] * startLevel;
      }
      outgoing.busGain.gain.cancelScheduledValues(now);
      outgoing.busGain.gain.setValueCurveAtTime(scaledOut, now + 0.002, fadeSec);

      if (this.outgoingDroneCleanupTimer) clearTimeout(this.outgoingDroneCleanupTimer);
      this.outgoingDroneCleanupTimer = window.setTimeout(() => {
        outgoing.stopNodes();
      }, (fadeSec + 0.15) * 1000);

      if (fadeSec >= DRONE_CROSSFADE_SEC - 0.1) {
        this.crossfadeStartMs = performance.now();
        this.isCrossfading = true;
      }
    } else {
      this.isCrossfading = false;
    }

    this.onStateChange?.();
  }

  private createDroneBusForKey(key: MusicalKey): DroneBus {
    const ctx = this.ctx!;
    const channels = this.channels!;
    const now = ctx.currentTime;

    const keyInfo = MUSICAL_KEYS.find((k) => k.key === key)!;
    // Place root comfortably between A1 (33) and G#2 (44) for consistent warm chest weight
    const rootMidi = keyInfo.semitone >= 9 ? 24 + keyInfo.semitone : 36 + keyInfo.semitone;
    // Strictly Root (1st) and Fifth (5th) across two octaves — NO 3rd!
    const droneMidis = [
      { midi: rootMidi, gain: 0.22, pan: -0.25 },
      { midi: rootMidi + 7, gain: 0.17, pan: 0.28 },
      { midi: rootMidi + 12, gain: 0.17, pan: -0.35 },
      { midi: rootMidi + 19, gain: 0.12, pan: 0.38 },
    ];

    const busGain = ctx.createGain();
    busGain.gain.value = 0;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 720;
    droneFilter.Q.value = 0.9;

    // Gentle organic filter breathing LFO
    const breathLfo = ctx.createOscillator();
    breathLfo.type = 'sine';
    breathLfo.frequency.value = 0.085;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 175;
    breathLfo.connect(breathDepth);
    breathDepth.connect(droneFilter.frequency);
    breathLfo.start(now);

    const oscList: OscillatorNode[] = [breathLfo];
    const nodeList: AudioNode[] = [breathDepth, droneFilter, busGain];

    droneMidis.forEach((voiceSpec) => {
      const freq = midiToFreq(voiceSpec.midi);

      const sawA = ctx.createOscillator();
      sawA.type = 'sawtooth';
      sawA.frequency.value = freq;
      sawA.detune.value = -6.5;

      const sawB = ctx.createOscillator();
      sawB.type = 'sawtooth';
      sawB.frequency.value = freq;
      sawB.detune.value = 6.5;

      const tri = ctx.createOscillator();
      tri.type = 'triangle';
      tri.frequency.value = freq;

      const panner = ctx.createStereoPanner();
      panner.pan.value = voiceSpec.pan;

      const noteGain = ctx.createGain();
      noteGain.gain.value = voiceSpec.gain;

      sawA.connect(noteGain);
      sawB.connect(noteGain);
      tri.connect(noteGain);
      noteGain.connect(panner);
      panner.connect(droneFilter);

      sawA.start(now);
      sawB.start(now);
      tri.start(now);

      oscList.push(sawA, sawB, tri);
      nodeList.push(noteGain, panner);
    });

    droneFilter.connect(busGain);
    busGain.connect(channels.keyDrone.input);

    return {
      busGain,
      stopNodes: () => {
        oscList.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // Ignore
          }
        });
        nodeList.forEach((n) => {
          try {
            n.disconnect();
          } catch {
            // Ignore
          }
        });
      },
    };
  }

  public dispose() {
    this.panic();
    if (this.activeDroneBus) {
      this.activeDroneBus.stopNodes();
      this.activeDroneBus = null;
    }
    if (this.shimmerHighOsc) {
      try {
        this.shimmerHighOsc.stop();
      } catch {
        // Ignore
      }
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}