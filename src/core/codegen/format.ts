import { safeId } from "../model/ids";

export { nrm, escapeString } from "../model/ids";

/** Data variable name for a node id, e.g. "ConfirmButton" -> "confirmButtonData". Ported from app.js:891. */
export function dataVarName(id: string): string {
  const s = safeId(id, "item");
  return `${s.charAt(0).toLowerCase()}${s.slice(1)}Data`;
}
