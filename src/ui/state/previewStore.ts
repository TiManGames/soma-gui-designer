import { create } from "zustand";
import type { PreviewState, Scene } from "@core/preview/types";
import type { SomaDocument } from "@core/model/document";

interface State {
  states: Record<string, PreviewState>;
  scene: Scene | null;
  doc: SomaDocument | null;
  error: string;
  diagnostics: string[];
  setState: (id: string, patch: PreviewState) => void;
  reset: (id: string) => void;
  publish: (doc: SomaDocument, scene: Scene, diagnostics: string[], error?: string) => void;
}
export const usePreview = create<State>(set => ({
  states: {}, scene: null, doc: null, error: "", diagnostics: [],
  setState: (id, patch) => set(s => ({ states: { ...s.states, [id]: { ...s.states[id], ...patch } } })),
  reset: id => set(s => { const states = { ...s.states }; delete states[id]; return { states }; }),
  publish: (doc, scene, diagnostics, error = "") => set({ doc, scene, diagnostics, error })
}));
