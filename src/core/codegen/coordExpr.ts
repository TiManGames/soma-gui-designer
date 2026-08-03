import type { WidgetNode } from "../model/nodes";
import { nrm } from "./format";

// Ported from legacy/app.js:911-919. Z is packed as the cVector3f third component.
export function posExpr(node: WidgetNode, parentIsGroup: boolean): string {
  const fn = parentIsGroup ? "ImGui_NrmPosGroup" : "ImGui_NrmPos";
  return `${fn}(cVector3f(${nrm(node.xN)}, ${nrm(node.yN)}, ${nrm(node.z)}))`;
}

export function sizeExpr(node: WidgetNode, parentIsGroup: boolean): string {
  const fn = parentIsGroup ? "ImGui_NrmSizeGroup" : "ImGui_NrmSize";
  return `${fn}(cVector2f(${nrm(node.wN)}, ${nrm(node.hN)}))`;
}
