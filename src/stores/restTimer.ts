import { create } from 'zustand';

// Client-only rest timer for the active workout screen.
// Fires when a set is logged; counts down from `targetSec`.
// Not persisted — a fresh app launch during rest starts the next set at zero,
// which is fine because the user is present and can restart with the presets.
type State = {
  startedAt: number | null;
  targetSec: number;
  start: () => void;
  stop: () => void;
  setTarget: (sec: number) => void;
};

export const REST_PRESETS_SEC = [60, 90, 120, 180] as const;

export const useRestTimer = create<State>((set) => ({
  startedAt: null,
  targetSec: 90,
  start: () => set({ startedAt: Date.now() }),
  stop: () => set({ startedAt: null }),
  setTarget: (sec) => set({ targetSec: sec }),
}));
