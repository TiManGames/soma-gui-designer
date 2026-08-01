import type { SomaDocument } from "../model/document";
import { ROOT } from "../model/nodes";
import { getNode, isContainer } from "../model/tree";
import { validIdentifier } from "../model/ids";

// Ported from legacy/app.js:566-596.
export function validateDocument(doc: SomaDocument): string[] {
  const errors: string[] = [];
  if (!validIdentifier(doc.functionName)) {
    errors.push("Function name must be a valid AngelScript identifier.");
  }
  if (!doc.translationCategory) {
    errors.push("Translation category is recommended for generated GUI text.");
  }
  if (doc.previewResolution.x <= 0 || doc.previewResolution.y <= 0) {
    errors.push("Preview resolution must be positive.");
  }

  const ids = new Set<string>();
  for (const node of doc.nodes) {
    if (!validIdentifier(node.id)) errors.push(`${node.id}: element ID must be a valid identifier.`);
    if (ids.has(node.id)) errors.push(`${node.id}: duplicate element ID.`);
    ids.add(node.id);

    if (node.parentId !== ROOT) {
      const parent = getNode(doc, node.parentId);
      if (!parent) errors.push(`${node.id}: parent '${node.parentId}' does not exist.`);
      else if (!isContainer(parent)) errors.push(`${node.id}: parent '${node.parentId}' is not a container.`);
    }

    if (node.xN < 0 || node.yN < 0 || node.wN <= 0 || node.hN <= 0) {
      errors.push(`${node.id}: normalized position/size must be positive.`);
    }
    if (node.xN + node.wN > 1.001 || node.yN + node.hN > 1.001) {
      errors.push(`${node.id}: element extends outside its parent coordinate space.`);
    }
  }

  return [...new Set(errors)];
}
