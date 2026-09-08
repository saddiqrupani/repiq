import { create } from 'zustand';

// UI-only state for the currently active workout.
// Server-side truth lives in Postgres and is fetched via TanStack Query.
// This store just holds exercises the user has picked but hasn't logged a set for yet,
// so the picker modal can hand off to the log screen without route params.
type State = {
  pickedExerciseIds: string[];
  addPickedExercise: (id: string) => void;
  removePickedExercise: (id: string) => void;
  clear: () => void;
};

export const useActiveWorkoutUi = create<State>((set) => ({
  pickedExerciseIds: [],
  addPickedExercise: (id) =>
    set((s) =>
      s.pickedExerciseIds.includes(id)
        ? s
        : { pickedExerciseIds: [...s.pickedExerciseIds, id] },
    ),
  removePickedExercise: (id) =>
    set((s) => ({ pickedExerciseIds: s.pickedExerciseIds.filter((x) => x !== id) })),
  clear: () => set({ pickedExerciseIds: [] }),
}));
