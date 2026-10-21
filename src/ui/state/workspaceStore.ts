import { create } from "zustand";

export type InspectorTab = "design" | "style" | "advanced";
interface Preferences {
  leftOpen: boolean;
  rightOpen: boolean;
  inspectorTab: InspectorTab;
  sections: Record<string, boolean>;
}
const KEY = "soma-gui:workspace";
const defaults: Preferences = { leftOpen: true, rightOpen: true, inspectorTab: "design", sections: {} };
function load(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      leftOpen: typeof saved.leftOpen === "boolean" ? saved.leftOpen : true,
      rightOpen: typeof saved.rightOpen === "boolean" ? saved.rightOpen : true,
      inspectorTab: ["design", "style", "advanced"].includes(saved.inspectorTab) ? saved.inspectorTab : "design",
      sections: saved.sections && typeof saved.sections === "object" && !Array.isArray(saved.sections) ? saved.sections : {}
    };
  } catch { return defaults; }
}
function save(prefs: Preferences) {
  const { leftOpen, rightOpen, inspectorTab, sections } = prefs;
  try { localStorage.setItem(KEY, JSON.stringify({ leftOpen, rightOpen, inspectorTab, sections })); } catch { /* UI preferences are optional. */ }
}
interface WorkspaceState extends Preferences {
  focusMode: boolean;
  projectSettings: boolean;
  insertOpen: boolean;
  reveal: { id: string; sequence: number } | null;
  togglePanel: (side: "left" | "right") => void;
  toggleFocus: () => void;
  showProject: () => void;
  showWidget: () => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setSection: (key: string, open: boolean) => void;
  setInsertOpen: (open: boolean) => void;
  revealNode: (id: string) => void;
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  ...load(), focusMode: false, projectSettings: false, insertOpen: false, reveal: null,
  togglePanel: side => set(s => {
    const key = side === "left" ? "leftOpen" : "rightOpen";
    const next = { ...s, [key]: s.focusMode || !s[key], focusMode: false };
    save(next); return next;
  }),
  toggleFocus: () => set(s => ({ focusMode: !s.focusMode })),
  showProject: () => set({ projectSettings: true, rightOpen: true, focusMode: false }),
  showWidget: () => set({ projectSettings: false }),
  setInspectorTab: inspectorTab => set(s => { save({ ...s, inspectorTab }); return { inspectorTab }; }),
  setSection: (key, open) => set(s => { const sections = { ...s.sections, [key]: open }; save({ ...s, sections }); return { sections }; }),
  setInsertOpen: insertOpen => set({ insertOpen }),
  revealNode: id => set(s => ({ reveal: { id, sequence: (s.reveal?.sequence ?? 0) + 1 },
    projectSettings: false, leftOpen: true, rightOpen: true, focusMode: false }))
}));
