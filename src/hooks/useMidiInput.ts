import { useEffect, useRef, useState } from 'react';

interface MidiCallbacks {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
  onSustainChange: (active: boolean) => void;
  onModWheelChange: (hzCutoff: number) => void; // CC 1 -> 120..12000Hz
  onExpressionChange: (swell: number) => void; // CC 11 -> 0..1
}

export interface MidiState {
  supported: boolean;
  permissionDenied: boolean;
  deviceNames: string[];
}

export function useMidiInput(callbacks: MidiCallbacks): MidiState {
  const [state, setState] = useState<MidiState>({
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    permissionDenied: false,
    deviceNames: [],
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return;
    }

    let midiAccess: MIDIAccess | null = null;
    let isMounted = true;

    const handleMidiMessage = (event: MIDIMessageEvent) => {
      const data = event.data;
      if (!data || data.length < 2) return;

      const status = data[0] & 0xf0;
      const d1 = data[1];
      const d2 = data.length > 2 ? data[2] : 0;

      if (status === 0x90) {
        if (d2 > 0) {
          callbacksRef.current.onNoteOn(d1, d2 / 127);
        } else {
          callbacksRef.current.onNoteOff(d1);
        }
      } else if (status === 0x80) {
        callbacksRef.current.onNoteOff(d1);
      } else if (status === 0xb0) {
        // Control Change
        if (d1 === 64) {
          // CC 64: Sustain Pedal
          callbacksRef.current.onSustainChange(d2 >= 64);
        } else if (d1 === 1) {
          // CC 1: Mod Wheel -> Master Filter Cutoff (log 120Hz..12000Hz)
          const norm = d2 / 127;
          const cutoff = Math.round(120 * Math.pow(12000 / 120, norm));
          callbacksRef.current.onModWheelChange(cutoff);
        } else if (d1 === 11) {
          // CC 11: Expression Pedal -> Master Swell (0..1)
          callbacksRef.current.onExpressionChange(d2 / 127);
        }
      }
    };

    const syncInputs = () => {
      if (!midiAccess || !isMounted) return;
      const names: string[] = [];
      midiAccess.inputs.forEach((input) => {
        if (input.state === 'connected') {
          names.push(input.name || 'USB MIDI Controller');
          input.onmidimessage = handleMidiMessage;
        } else {
          input.onmidimessage = null;
        }
      });
      setState({
        supported: true,
        permissionDenied: false,
        deviceNames: names,
      });
    };

    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        if (!isMounted) return;
        midiAccess = access;
        syncInputs();
        access.onstatechange = syncInputs;
      })
      .catch(() => {
        if (!isMounted) return;
        setState({
          supported: true,
          permissionDenied: true,
          deviceNames: [],
        });
      });

    return () => {
      isMounted = false;
      if (midiAccess) {
        midiAccess.onstatechange = null;
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, []);

  return state;
}
