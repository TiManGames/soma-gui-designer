import type { SomaDocument } from "./document";
import { ROOT, type WidgetNode } from "./nodes";
import { isContainerType } from "./defaults";

export function getNode(doc: SomaDocument, id: string): WidgetNode | null {
  return doc.nodes.find((n) => n.id === id) ?? null;
}

export function getChildren(doc: SomaDocument, parentId: string): WidgetNode[] {
  return doc.nodes.filter((n) => n.parentId === parentId);
}

export function isContainer(node: WidgetNode | null | undefined): boolean {
  return isContainerType(node?.type);
}

/** All descendant ids of `id` (not including `id` itself). Ported from delete cascade app.js:725-735. */
export function descendantIds(doc: SomaDocument, id: string): Set<string> {
  const ids = new Set<string>();
  let changed = true;
  const seed = new Set<string>([id]);
  while (changed) {
    changed = false;
    for (const n of doc.nodes) {
      if (seed.has(n.parentId) && !seed.has(n.id)) {
        seed.add(n.id);
        ids.add(n.id);
        changed = true;
      }
    }
  }
  return ids;
}

/** Remove a node and all its descendants. Returns a new node list. */
export function removeNode(doc: SomaDocument, id: string): WidgetNode[] {
  const toRemove = descendantIds(doc, id);
  toRemove.add(id);
  return doc.nodes.filter((n) => !toRemove.has(n.id));
}

/**
 * Depth of a node in the parent hierarchy (root-level = 0, child of root = 1, …).
 * Used by the canvas to compute z-index so children always render above parents.
 */
export function nodeDepth(doc: SomaDocument, node: WidgetNode, maxDepth = 20): number {
  let depth = 0;
  let current: WidgetNode | null = node;
  while (current && current.parentId !== ROOT && depth < maxDepth) {
    current = getNode(doc, current.parentId);
    depth++;
  }
  return depth;
}
export function canReparent(doc: SomaDocument, nodeId: string, candidateParentId: string): boolean {
  if (nodeId === candidateParentId) return false;
  if (candidateParentId === ROOT) return true;
  const parent = getNode(doc, candidateParentId);
  if (!parent || !isContainer(parent)) return false;
  return !descendantIds(doc, nodeId).has(candidateParentId);
}
