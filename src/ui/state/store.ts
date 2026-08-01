import { create } from "zustand";
import type { SomaDocument, Target } from "@core/model/document";
import { detectPreset, RESOLUTION_PRESETS, isSomaDocument } from "@core/model/document";
import type { Override, WidgetNode, WidgetType } from "@core/model/nodes";
import { ROOT } from "@core/model/nodes";
import { makeNode, isContainerType } from "@core/model/defaults";
import { createDefaultDocument, cloneDoc } from "@core/model/createDefaultDocument";
import { uniqueId } from "@core/model/ids";
import { getNode, isContainer, removeNode, canReparent } from "@core/model/tree";
import {
  absoluteRect,
  parentAbsRect,
  previewSize,
  renormalizeToParent,
  snapPx
} from "@core/model/geometry";
import { clamp } from "@core/model/ids";

const STORAGE_KEY = "soma-gui-designer:doc:v4";
const HISTORY_LIMIT = 100;

export type PreviewTab = "hps" | "preload";

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

function persist(doc: SomaDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // ignore (private mode / quota)
  }
}

function loadPersisted(): SomaDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isSomaDocument(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return createDefaultDocument();
}

export const useStore = create<DesignerState>((set, get) => ({
  doc: loadPersisted(),
  selectedId: null,
  previewTab: "hps",
  drag: null,
  dropTargetId: null,
  past: [],
  future: [],

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
      return withHistory(s, nextDoc, { selectedId: id });
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
      const abs = absoluteRect(s.doc, node);
      const norm = renormalizeToParent(s.doc, abs, newParentId);
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

    const parent = parentAbsRect(s.doc, node);
    const scale = Math.min(1, 980 / previewSize(s.doc).x);
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
    set((s) => withHistory(s, cloneDoc(doc), { selectedId: doc.nodes[0]?.id ?? null }))
}));

export { isContainerType };
export type { Target };
