import type { SomaDocument } from "../model/document";
import { WIDGETS } from "../model/defaults";
import { getStruct, getEnum } from "../schema/loadSchema";

/**
 * Schema-aware validation layered on top of validateDocument. Checks that each
 * structured override references a real field on the widget's dataClass and that
 * enum-valued overrides use a real member. Returns human-readable warnings.
 *
 * Kept separate from validateDocument so the core validator stays schema-free
 * (and its unit tests stay simple).
 */
export function validateAgainstSchema(doc: SomaDocument): string[] {
  const warnings: string[] = [];

  for (const node of doc.nodes) {
    const meta = WIDGETS[node.type];
    if (!meta.dataClass) continue;
    const struct = getStruct(meta.dataClass);
    if (!struct) continue; // no schema for this dataClass (e.g. text-reader settings)

    const fieldByName = new Map(struct.fields.map((f) => [f.name, f]));

    for (const ov of node.overrides) {
      if (ov.kind !== "expr") continue;
      // Only validate top-level field paths (e.g. "mColorBase"); nested paths
      // like "mFont.mvSize" are accepted without deep checking.
      const top = ov.path.split(/[.[]/)[0];
      if (!top) continue;

      const field = fieldByName.get(top);
      if (!field) {
        warnings.push(`${node.id}: '${ov.path}' is not a field of ${meta.dataClass}.`);
        continue;
      }

      // If the override targets an enum field with a bare enum-looking value,
      // check membership.
      if (field.category === "enum" && field.enumType && ov.path === top) {
        const e = getEnum(field.enumType);
        if (e && /^e[A-Za-z]/.test(ov.expr.trim())) {
          if (!e.members.includes(ov.expr.trim())) {
            warnings.push(
              `${node.id}: '${ov.expr}' is not a member of ${field.enumType} (${field.name}).`
            );
          }
        }
      }
    }
  }

  return [...new Set(warnings)];
}
