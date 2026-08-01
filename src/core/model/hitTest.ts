import type { SomaDocument } from "./document";
import { ROOT, type WidgetNode } from "./nodes";
import { absoluteRect } from "./geometry";
import { isContainer, canReparent } from "./tree";

/**
 * Find the best container to drop `draggedId` into, given a pointer position in
 * canvas pixel space. Returns a container node id or ROOT ("screen").
 *
 * Candidates are containers whose absolute rect contains the point, excluding
 * the dragged node and its descendants (cycle-safe via canReparent). The
 * top-most (highest z, then deepest) candidate wins; ROOT is the fallback.
 */
export function findDropTarget(
  doc: SomaDocument,
  draggedId: string,
  pointer: { x: number; y: number }
): string {
  const candidates: WidgetNode[] = doc.nodes.filter((n) => {
    if (!isContainer(n)) return false;
    if (!canReparent(doc, draggedId, n.id)) return false;
    const r = absoluteRect(doc, n);
    return (
      pointer.x >= r.x &&
      pointer.x <= r.x + r.w &&
      pointer.y >= r.y &&
      pointer.y <= r.y + r.h
    );
  });

  if (candidates.length === 0) return ROOT;

  // Deepest + top-most: prefer higher z, then smaller area (more specific).
  candidates.sort((a, b) => {
    if ((b.z ?? 0) !== (a.z ?? 0)) return (b.z ?? 0) - (a.z ?? 0);
    const ra = absoluteRect(doc, a);
    const rb = absoluteRect(doc, b);
    return ra.w * ra.h - rb.w * rb.h;
  });
  return candidates[0].id;
}
