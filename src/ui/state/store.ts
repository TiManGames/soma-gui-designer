import { create } from "zustand";
import type { SomaDocument, Target } from "@core/model/document";
import { detectPreset, RESOLUTION_PRESETS, isSomaDocument } from "@core/model/document";
import type { Override, WidgetNode, WidgetType } from "@core/model/nodes";
import { ROOT } from "@core/model/nodes";
import { makeNode, isContainerType } from "@core/model/defaults";
import { createDefaultDocument, cloneDoc } from "@core/model/createDefaultDocument";
import { uniqueId } from "@core/model/ids";
import { getNode, isContainer, removeNode, canReparent, descendantIds } from "@core/model/tree";
import {
  absoluteRect,
  parentAbsRect,
  previewSize,
  renormalizeToParent,
  snapPx
} from "@core/model/geometry";
import { canvasScale } from "@core/model/canvasScale";
import { clamp } from "@core/model/ids";
import { postToHost } from "../vscodeApi";
import { usePreview } from "./previewStore";

const HISTORY_LIMIT = 100;
const EDIT_DEBOUNCE_MS = 200;

export type PreviewTab = "hps" | "preload";
export type SidebarTab = "layers" | "widgets" | "assets";
export type DockTab = "problems" | "hps" | "preload" | "output";
export type LayoutUnit = "pct" | "px";

const UI_PREFS_KEY = "soma-gui:ui-prefs";

interface UiPrefs {
  sidebarTab: SidebarTab;
  dockTab: DockTab;
  dockOpen: boolean;
  layoutUnit: LayoutUnit;
  paletteFavorites: WidgetType[];
}

function loadUiPrefs(): UiPrefs {
  const fallback: UiPrefs = {
    sidebarTab: "layers",
    dockTab: "problems",
    dockOpen: true,
    layoutUnit: "pct",
    paletteFavorites: []
  };
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<UiPrefs>) };
  } catch {
    return fallback;
  }
}

function saveUiPrefs(prefs: Partial<UiPrefs>): void {
  try {
    const current = loadUiPrefs();
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    /* ignore */
  }
}

interface DragState {
  id: string;
  resize: boolean;
  startClientX: number;
  startClientY: number;
  startXN: number;
  startYN: number;
  startWN: number;
  startHN: number;
  /** Document snapshot captured when the drag began, pushed to history on release. */
  docBeforeDrag: SomaDocument;
}

interface DesignerState {
  doc: SomaDocument;
  selectedId: string | null;
  previewTab: PreviewTab;
  drag: DragState | null;
  dropTargetId: string | null;
  past: SomaDocument[];
  future: SomaDocument[];

  /** UI-only shell state (never persisted into the document / history). */
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
  dockTab: DockTab;
  setDockTab: (tab: DockTab) => void;
  dockOpen: boolean;
  toggleDock: () => void;
  setDockOpen: (open: boolean) => void;
  layoutUnit: LayoutUnit;
  setLayoutUnit: (unit: LayoutUnit) => void;

  /** Palette favorites (persisted) and recently-added types (session-only). */
  paletteFavorites: WidgetType[];
  toggleFavorite: (type: WidgetType) => void;
  paletteRecent: WidgetType[];

  /** Editor-only visibility / lock overlays (ephemeral, reset on reload). */
  hidden: Set<string>;
  toggleHidden: (id: string) => void;
  locked: Set<string>;
  toggleLocked: (id: string) => void;

  /** WYSIWYG rendering flag (runtime-only, mirrors the somaGui.wysiwyg.enabled setting). */
  wysiwygEnabled: boolean;
  setWysiwygEnabled: (enabled: boolean) => void;
  toggleWysiwyg: () => void;
  /** Canvas-only grid visibility; snapping remains controlled by doc.snapToGrid. */
  gridVisible: boolean;
  toggleGridVisible: () => void;

  // selection & tabs
  select: (id: string | null) => void;
  setPreviewTab: (tab: PreviewTab) => void;

  // document meta
  setMeta: (patch: Partial<Omit<SomaDocument, "nodes">>) => void;
  setResolutionPreset: (presetId: string) => void;
  setPreviewSize: (x: number, y: number) => void;

  // nodes
  addNode: (type: WidgetType) => void;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  renameNode: (id: string, nextId: string) => void;
  setOverrides: (id: string, overrides: Override[]) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  reparent: (id: string, newParentId: string) => void;

  // clipboard (runtime-only, not persisted)
  clipboard: WidgetNode[] | null;
  copyNode: (id: string) => void;
  cutNode: (id: string) => void;
  pasteNode: () => void;

  // drag
  startDrag: (params: Omit<DragState, "docBeforeDrag">) => void;
  dragMove: (clientX: number, clientY: number) => void;
  endDrag: () => void;
  setDropTarget: (id: string | null) => void;

  // history
  undo: () => void;
  redo: () => void;

  // document lifecycle
  newDocument: () => void;
  loadDocument: (doc: SomaDocument) => void;
  /** Replace the document from host-provided JSON text without echoing an edit back. */
  setDocFromHost: (text: string) => void;
}

/** Commit a document mutation onto the history stack. */
function withHistory(
  state: DesignerState,
  nextDoc: SomaDocument,
  extra: Partial<DesignerState> = {}
): Partial<DesignerState> {
  const past = [...state.past, state.doc].slice(-HISTORY_LIMIT);
  persist(nextDoc);
  return { doc: nextDoc, past, future: [], ...extra };
}

// When the document originated from the host (init/docChanged) we suppress the
// echo so applying it doesn't post an "edit" straight back to the host.
let suppressPush = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

/** Push the document to the extension host as a debounced full-text edit. */
function persist(doc: SomaDocument): void {
  if (suppressPush) return;
  const text = JSON.stringify(doc, null, 2) + "\n";
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => postToHost({ type: "edit", text }), EDIT_DEBOUNCE_MS);
}

export const useStore = create<DesignerState>((set, get) => ({
  doc: createDefaultDocument(),
  selectedId: null,
  previewTab: "hps",
  drag: null,
  dropTargetId: null,
  clipboard: null,
  past: [],
  future: [],

  ...(() => {
    const p = loadUiPrefs();
    return {
      sidebarTab: p.sidebarTab,
      dockTab: p.dockTab,
      dockOpen: p.dockOpen,
      layoutUnit: p.layoutUnit,
      paletteFavorites: p.paletteFavorites
    };
  })(),
  paletteRecent: [],
  toggleFavorite: (type) =>
    set((s) => {
      const has = s.paletteFavorites.includes(type);
      const paletteFavorites = has
        ? s.paletteFavorites.filter((t) => t !== type)
        : [...s.paletteFavorites, type];
      saveUiPrefs({ paletteFavorites });
      return { paletteFavorites };
    }),
  setSidebarTab: (tab) => {
    saveUiPrefs({ sidebarTab: tab });
    set({ sidebarTab: tab });
  },
  setDockTab: (tab) => {
    saveUiPrefs({ dockTab: tab, dockOpen: true });
    set({ dockTab: tab, dockOpen: true });
  },
  toggleDock: () =>
    set((s) => {
      const dockOpen = !s.dockOpen;
      saveUiPrefs({ dockOpen });
      return { dockOpen };
    }),
  setDockOpen: (open) => {
    saveUiPrefs({ dockOpen: open });
    set({ dockOpen: open });
  },
  setLayoutUnit: (unit) => {
    saveUiPrefs({ layoutUnit: unit });
    set({ layoutUnit: unit });
  },

  hidden: new Set<string>(),
  toggleHidden: (id) =>
    set((s) => {
      const hidden = new Set(s.hidden);
      // Cascade to the whole subtree: hiding a parent hides its descendants;
      // re-showing it shows them again. In between, children toggle individually.
      const subtree = [id, ...descendantIds(s.doc, id)];
      if (hidden.has(id)) subtree.forEach((n) => hidden.delete(n));
      else subtree.forEach((n) => hidden.add(n));
      return { hidden };
    }),
  locked: new Set<string>(),
  toggleLocked: (id) =>
    set((s) => {
      const locked = new Set(s.locked);
      const subtree = [id, ...descendantIds(s.doc, id)];
      if (locked.has(id)) subtree.forEach((n) => locked.delete(n));
      else subtree.forEach((n) => locked.add(n));
      return { locked };
    }),

  wysiwygEnabled: true,
  setWysiwygEnabled: (enabled) => set({ wysiwygEnabled: enabled }),
  toggleWysiwyg: () => set((s) => ({ wysiwygEnabled: !s.wysiwygEnabled })),
  gridVisible: true,
  toggleGridVisible: () => set((s) => ({ gridVisible: !s.gridVisible })),

  select: (id) => set({ selectedId: id }),
  setPreviewTab: (tab) => set({ previewTab: tab }),

  setMeta: (patch) => set((s) => withHistory(s, { ...s.doc, ...patch })),

  setResolutionPreset: (presetId) =>
    set((s) => {
      const preset = RESOLUTION_PRESETS.find((p) => p.id === presetId);
      if (!preset || preset.id === "custom") {
        return withHistory(s, { ...s.doc, resolutionPreset: "custom" });
      }
      return withHistory(s, {
        ...s.doc,
        resolutionPreset: preset.id,
        previewResolution: { x: preset.x, y: preset.y }
      });
    }),

  setPreviewSize: (x, y) =>
    set((s) =>
      withHistory(s, {
        ...s.doc,
        previewResolution: { x, y },
        resolutionPreset: detectPreset(x, y)
      })
    ),

  addNode: (type) =>
    set((s) => {
      const selected = s.selectedId ? getNode(s.doc, s.selectedId) : null;
      const parentId = isContainer(selected) ? selected!.id : selected?.parentId ?? ROOT;
      const id = uniqueId(
        type.replace(/[^A-Za-z0-9]/g, ""),
        s.doc.nodes.map((n) => n.id)
      );
      const node = makeNode(type, id, { parentId });
      const nextDoc = { ...s.doc, nodes: [...s.doc.nodes, node] };
      // Track recently-added types (session-only, most-recent-first, max 6).
      const paletteRecent = [type, ...s.paletteRecent.filter((t) => t !== type)].slice(0, 6);
      return withHistory(s, nextDoc, { selectedId: id, paletteRecent });
    }),

  updateNode: (id, patch) =>
    set((s) => {
      const nodes = s.doc.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as WidgetNode) : n));
      return withHistory(s, { ...s.doc, nodes });
    }),

  renameNode: (id, nextId) =>
    set((s) => {
      const trimmed = nextId.trim();
      if (!trimmed || trimmed === id) return {};
      if (s.doc.nodes.some((n) => n.id === trimmed)) return {};
      const nodes = s.doc.nodes.map((n) => {
        if (n.id === id) return { ...n, id: trimmed } as WidgetNode;
        if (n.parentId === id) return { ...n, parentId: trimmed } as WidgetNode;
        return n;
      });
      return withHistory(s, { ...s.doc, nodes }, { selectedId: trimmed });
    }),

  setOverrides: (id, overrides) =>
    set((s) => {
      const nodes = s.doc.nodes.map((n) => (n.id === id ? ({ ...n, overrides } as WidgetNode) : n));
      return withHistory(s, { ...s.doc, nodes });
    }),

  deleteNode: (id) =>
    set((s) => {
      const nodes = removeNode(s.doc, id);
      const nextSelected = nodes[0]?.id ?? null;
      return withHistory(s, { ...s.doc, nodes }, { selectedId: nextSelected });
    }),

  duplicateNode: (id) =>
    set((s) => {
      const src = getNode(s.doc, id);
      if (!src) return {};
      const newId = uniqueId(src.id, s.doc.nodes.map((n) => n.id));
      const copy: WidgetNode = {
        ...JSON.parse(JSON.stringify(src)),
        id: newId,
        xN: clamp(src.xN + 0.025, 0, 1 - src.wN),
        yN: clamp(src.yN + 0.025, 0, 1 - src.hN),
        z: src.z + 0.1
      };
      return withHistory(s, { ...s.doc, nodes: [...s.doc.nodes, copy] }, { selectedId: newId });
    }),

  reparent: (id, newParentId) =>
    set((s) => {
      if (!canReparent(s.doc, id, newParentId)) return {};
      const node = getNode(s.doc, id);
      if (!node) return {};
      const preview = usePreview.getState();
      const abs = s.wysiwygEnabled && preview.doc === s.doc ? preview.scene?.rects.get(id) ?? absoluteRect(s.doc, node) : absoluteRect(s.doc, node);
      const target = s.wysiwygEnabled && preview.doc === s.doc ? preview.scene?.frames.get(newParentId) : undefined;
      const norm = target ? { xN: clamp((abs.x - target.x) / target.w, 0, 1 - abs.w / target.w), yN: clamp((abs.y - target.y) / target.h, 0, 1 - abs.h / target.h), wN: clamp(abs.w / target.w, 0.001, 1), hN: clamp(abs.h / target.h, 0.001, 1) } : renormalizeToParent(s.doc, abs, newParentId);
      const nodes = s.doc.nodes.map((n) =>
        n.id === id ? ({ ...n, parentId: newParentId, ...norm } as WidgetNode) : n
      );
      return withHistory(s, { ...s.doc, nodes }, { dropTargetId: null });
    }),

  startDrag: (params) =>
    set((s) => ({
      drag: { ...params, docBeforeDrag: s.doc },
      selectedId: params.id
    })),

  dragMove: (clientX, clientY) => {
    const s = get();
    if (!s.drag) return;
    const node = getNode(s.doc, s.drag.id);
    if (!node) return;

    const preview = usePreview.getState();
    const parent = s.wysiwygEnabled && preview.doc === s.doc ? preview.scene?.frames.get(node.parentId) ?? parentAbsRect(s.doc, node) : parentAbsRect(s.doc, node);
    const scale = canvasScale(previewSize(s.doc));
    const dxPx = (clientX - s.drag.startClientX) / scale;
    const dyPx = (clientY - s.drag.startClientY) / scale;

    let patch: Partial<WidgetNode>;
    if (s.drag.resize) {
      const wPx = snapPx(s.drag.startWN * parent.w + dxPx, s.doc);
      const hPx = snapPx(s.drag.startHN * parent.h + dyPx, s.doc);
      patch = {
        wN: clamp(Math.max(4, wPx) / parent.w, 0.001, 1 - node.xN),
        hN: clamp(Math.max(4, hPx) / parent.h, 0.001, 1 - node.yN)
      };
    } else {
      const xPx = snapPx(s.drag.startXN * parent.w + dxPx, s.doc);
      const yPx = snapPx(s.drag.startYN * parent.h + dyPx, s.doc);
      patch = {
        xN: clamp(xPx / parent.w, 0, 1 - node.wN),
        yN: clamp(yPx / parent.h, 0, 1 - node.hN)
      };
    }
    // Live drag mutates without pushing history each frame.
    const nodes = s.doc.nodes.map((n) => (n.id === s.drag!.id ? ({ ...n, ...patch } as WidgetNode) : n));
    set({ doc: { ...s.doc, nodes } });
  },

  endDrag: () =>
    set((s) => {
      if (!s.drag) return { drag: null };
      // Push the pre-drag snapshot to history so the whole gesture is one undo step.
      const changed = s.drag.docBeforeDrag !== s.doc;
      persist(s.doc);
      return {
        drag: null,
        dropTargetId: null,
        past: changed ? [...s.past, s.drag.docBeforeDrag].slice(-HISTORY_LIMIT) : s.past,
        future: changed ? [] : s.future
      };
    }),

  setDropTarget: (id) => set({ dropTargetId: id }),

  copyNode: (id) =>
    set((s) => {
      const node = getNode(s.doc, id);
      if (!node) return {};
      const descIds = descendantIds(s.doc, id);
      const nodes = [node, ...s.doc.nodes.filter((n) => descIds.has(n.id))];
      return { clipboard: JSON.parse(JSON.stringify(nodes)) as WidgetNode[] };
    }),

  cutNode: (id) =>
    set((s) => {
      const node = getNode(s.doc, id);
      if (!node) return {};
      const descIds = descendantIds(s.doc, id);
      const nodes = [node, ...s.doc.nodes.filter((n) => descIds.has(n.id))];
      const clipboard: WidgetNode[] = JSON.parse(JSON.stringify(nodes));
      const nextNodes = removeNode(s.doc, id);
      const nextSelected = nextNodes[0]?.id ?? null;
      return {
        clipboard,
        ...withHistory(s, { ...s.doc, nodes: nextNodes }, { selectedId: nextSelected })
      };
    }),

  pasteNode: () =>
    set((s) => {
      if (!s.clipboard || s.clipboard.length === 0) return {};
      const root = s.clipboard[0];
      const existingIds = new Set(s.doc.nodes.map((n) => n.id));

      // Build a mapping from old id -> new id for all pasted nodes.
      const idMap = new Map<string, string>();
      for (const n of s.clipboard) {
        const newId = uniqueId(n.id, new Set([...existingIds, ...idMap.values()]));
        idMap.set(n.id, newId);
        existingIds.add(newId);
      }

      // Re-parent root to its original parent if it still exists, else "screen".
      const rootParent =
        root.parentId === ROOT || getNode(s.doc, root.parentId) ? root.parentId : ROOT;

      const pasted: WidgetNode[] = s.clipboard.map((n) => ({
        ...n,
        id: idMap.get(n.id)!,
        parentId: n.id === root.id ? rootParent : (idMap.get(n.parentId) ?? rootParent),
        xN: n.id === root.id ? clamp(n.xN + 0.02, 0, 1 - n.wN) : n.xN,
        yN: n.id === root.id ? clamp(n.yN + 0.02, 0, 1 - n.hN) : n.yN
      })) as WidgetNode[];

      const nextDoc = { ...s.doc, nodes: [...s.doc.nodes, ...pasted] };
      return withHistory(s, nextDoc, { selectedId: idMap.get(root.id)! });
    }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      persist(previous);
      return {
        doc: previous,
        past: s.past.slice(0, -1),
        future: [s.doc, ...s.future].slice(0, HISTORY_LIMIT)
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      persist(next);
      return {
        doc: next,
        past: [...s.past, s.doc].slice(-HISTORY_LIMIT),
        future: s.future.slice(1)
      };
    }),

  newDocument: () =>
    set((s) => {
      const fresh = createDefaultDocument();
      return withHistory(s, fresh, { selectedId: "MainWindow" });
    }),

  loadDocument: (doc) =>
    set((s) => withHistory(s, cloneDoc(doc), { selectedId: doc.nodes[0]?.id ?? null })),

  setDocFromHost: (text) =>
    set((s) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {};
      }
      if (!isSomaDocument(parsed)) return {};
      // Applying host content must not echo an edit back to the host, and must
      // not pollute undo history (VS Code owns file-level undo).
      suppressPush = true;
      try {
        const doc = parsed;
        const selectedId =
          s.selectedId && doc.nodes.some((n) => n.id === s.selectedId)
            ? s.selectedId
            : doc.nodes[0]?.id ?? null;
        return { doc, selectedId };
      } finally {
        suppressPush = false;
      }
    })
}));

export { isContainerType };
export type { Target };
