// The practice transport state machine — practice.session/REQ-003,
// REQ-004, REQ-005. Pure: no clocks, no frames. `Tick.durationBeats` is the
// only timing fact it emits; turning that into wall-clock time is the
// session's job (T008).

import type { SessionSettings } from "./settings";

export type BeatsLeft = 1 | 2 | 3 | 4;

export type TransportState =
  | { readonly kind: "idle" }
  | { readonly kind: "countingIn"; readonly beatsLeft: BeatsLeft }
  | { readonly kind: "playing"; readonly position: number } // 0-based into the sequence
  | { readonly kind: "resting"; readonly beatsLeft: BeatsLeft };

export interface Tick {
  readonly click: { readonly accent: boolean } | null; // what sounds at this state's onset
  readonly tonePosition: number | null; // sequence position whose tone sounds, else null
  readonly durationBeats: 1 | 0.5; // until the next tick
}

export function startTransport(settings: SessionSettings): TransportState {
  return settings.countIn
    ? { kind: "countingIn", beatsLeft: 4 }
    : { kind: "playing", position: 0 };
}

export function tickOf(state: TransportState, settings: SessionSettings): Tick {
  switch (state.kind) {
    case "idle":
      return { click: null, tonePosition: null, durationBeats: 1 };

    case "countingIn":
    case "resting":
      // Count-in and rest bar always click, whatever the sound mode
      // (practice.session/REQ-003), the first beat accented, no tone.
      return {
        click: { accent: state.beatsLeft === 4 },
        tonePosition: null,
        durationBeats: 1,
      };

    case "playing": {
      const clicks =
        settings.soundMode !== "notes" &&
        (settings.noteLength === "crotchet" || state.position % 2 === 0);
      return {
        click: clicks ? { accent: false } : null,
        tonePosition:
          settings.soundMode === "metronome" ? null : state.position,
        durationBeats: settings.noteLength === "crotchet" ? 1 : 0.5,
      };
    }
  }
}

export function advance(
  state: TransportState,
  settings: SessionSettings,
  sequenceLength: number,
): TransportState {
  switch (state.kind) {
    case "idle":
      return state;

    case "countingIn":
      return state.beatsLeft === 1
        ? { kind: "playing", position: 0 }
        : // beatsLeft is 2, 3 or 4 here, so beatsLeft - 1 is a BeatsLeft.
          { kind: "countingIn", beatsLeft: (state.beatsLeft - 1) as BeatsLeft };

    case "playing": {
      const next = state.position + 1;
      if (next < sequenceLength) return { kind: "playing", position: next };
      if (!settings.loop) return { kind: "idle" };
      return settings.restBar
        ? { kind: "resting", beatsLeft: 4 }
        : { kind: "playing", position: 0 };
    }

    case "resting":
      return state.beatsLeft === 1
        ? { kind: "playing", position: 0 }
        : // beatsLeft is 2, 3 or 4 here, so beatsLeft - 1 is a BeatsLeft.
          { kind: "resting", beatsLeft: (state.beatsLeft - 1) as BeatsLeft };
  }
}
