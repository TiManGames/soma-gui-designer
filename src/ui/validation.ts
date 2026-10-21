import type { SomaDocument } from "@core/model/document";
import { validateDocument } from "@core/validate/validateDocument";
import { validateAgainstSchema } from "@core/validate/validateSchema";

export function validationIssues(doc: SomaDocument) {
  return [...new Set([...validateDocument(doc), ...validateAgainstSchema(doc)])].map(message => ({
    message, nodeId: doc.nodes.find(n => message.startsWith(`${n.id}:`))?.id ?? null
  }));
}
