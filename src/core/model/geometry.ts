import type { SomaDocument } from "./document";
import { ROOT, type WidgetNode } from "./nodes";
import { getNode } from "./tree";
import { clamp } from "./ids";
import { resolveStationWindowMetrics, stationWindowChildFrame } from "./stationMetrics";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Native layout cursor rules with the zero spacing emitted by LayoutBegin. */
export function layoutRects(parent: Rect, type: string, nodes: WidgetNode[]): Map<string, Rect> {
  const result = new Map<string, Rect>();
  let x = 0, y = 0, rowHeight = 0;
  for (const node of [...nodes].sort((a, b) => a.z - b.z)) {
    const offsetX = node.xN * parent.w, offsetY = node.yN * parent.h;
    const w = node.wN * parent.w, h = node.hN * parent.h;
    if (type === "eImGuiLayout_XY" && x !== 0 && x + w + offsetX > parent.w) { x = 0; y += rowHeight; rowHeight = 0; }
    result.set(node.id, { x: parent.x + x + offsetX, y: parent.y + y + offsetY, w, h });
    rowHeight = Math.max(rowHeight, Math.max(0, offsetY + h));
    if (type === "eImGuiLayout_Y") { y += rowHeight; rowHeight = 0; }
    else if (type !== "eImGuiLayout_X_Tabbed") x += w;
  }
  return result;
}

export function previewSize(doc: SomaDocument): { x: number; y: number } {
  return {
    x: Math.max(1, doc.previewResolution.x || 1280),
    y: Math.max(1, doc.previewResolution.y || 800)
  };
}

// Ported from legacy/app.js:408-426.
export function parentAbsRect(doc: SomaDocument, node: WidgetNode | null): Rect {
  const size = previewSize(doc);
  if (!node || node.parentId === ROOT) {
    return { x: 0, y: 0, w: size.x, h: size.y };
  }
  const parent = getNode(doc, node.parentId);
  if (!parent) return { x: 0, y: 0, w: size.x, h: size.y };
  return absRectOfParent(doc, parent.id);
}

export function absoluteRect(doc: SomaDocument, node: WidgetNode): Rect {
  const parent = parentAbsRect(doc, node);
  const owner = getNode(doc, node.parentId);
  if (owner?.type === "layout") {
    const resolved = layoutRects(parent, owner.layoutType, doc.nodes.filter(n => n.parentId === owner.id)).get(node.id);
    if (resolved) return resolved;
  }
  return {
    x: parent.x + node.xN * parent.w,
    y: parent.y + node.yN * parent.h,
    w: node.wN * parent.w,
    h: node.hN * parent.h
  };
}

/** Absolute rect of an arbitrary parent id (used for renormalization). */
export function absRectOfParent(doc: SomaDocument, parentId: string): Rect {
  const size = previewSize(doc);
  if (parentId === ROOT) return { x: 0, y: 0, w: size.x, h: size.y };
  const parent = getNode(doc, parentId);
  if (!parent) return { x: 0, y: 0, w: size.x, h: size.y };
  const outer = absoluteRect(doc, parent);
  if (parent.type !== "station-window") return outer;
  return stationWindowChildFrame(outer, resolveStationWindowMetrics(parent, size.y));
}

export function snapPx(value: number, doc: SomaDocument): number {
  if (!doc.snapToGrid) return value;
  const grid = Math.max(1, doc.gridSize || 10);
  return Math.round(value / grid) * grid;
}

/**
 * Given a node's current absolute pixel rect and a new parent id, produce the
 * normalized coords that keep the node visually in place under the new parent.
 * Inverse of absoluteRect. Clamped to stay inside the parent.
 */
export function renormalizeToParent(
  doc: SomaDocument,
  abs: Rect,
  newParentId: string
): { xN: number; yN: number; wN: number; hN: number } {
  const p = absRectOfParent(doc, newParentId);
  const wN = clamp(abs.w / p.w, 0.001, 1);
  const hN = clamp(abs.h / p.h, 0.001, 1);
  const xN = clamp((abs.x - p.x) / p.w, 0, 1 - wN);
  const yN = clamp((abs.y - p.y) / p.h, 0, 1 - hN);
  return { xN, yN, wN, hN };
}
