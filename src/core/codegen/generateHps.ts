import type { SomaDocument, Target } from "../model/document";
import { ROOT, type WidgetNode } from "../model/nodes";
import { getChildren } from "../model/tree";
import { escapeString } from "./format";
import { EMITTERS, type EmitCtx } from "./emitters";

export interface CodegenResult {
  hps: string;
  preload: string;
}

function functionHeader(doc: SomaDocument): string {
  const header = (target: Target): string => {
    switch (target) {
      case "map-on-gui":
      case "helper-function":
        return `void ${doc.functionName}(float afTimeStep)`;
      case "terminal-on-gui":
      default:
        return `void ${doc.functionName}(const tString&in asEntityName, float afTimeStep)`;
    }
  };
  return header(doc.target);
}

function emitNode(
  doc: SomaDocument,
  lines: string[],
  node: WidgetNode,
  indent: string,
  parentIsGroup: boolean
): void {
  const ctx: EmitCtx = {
    lines,
    indent,
    parentIsGroup,
    emitChildren: (parent, childIndent) => {
      const children = getChildren(doc, parent.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
      for (const child of children) {
        emitNode(doc, lines, child, childIndent, true);
      }
    }
  };
  // Cast is safe: EMITTERS is keyed by the same discriminant as node.type.
  (EMITTERS[node.type].emit as (c: EmitCtx, n: WidgetNode) => void)(ctx, node);
}

// Ported from legacy/app.js:776-794.
export function generateHps(doc: SomaDocument): string {
  const lines: string[] = [
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station.hps"',
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station_apps_common.hps"',
    '#include "custom_depth/helper_custom_depth_imgui/helper_imgui_station_app_numpad.hps"',
    "",
    functionHeader(doc),
    "{",
    `\tImGui_SetTransCategory("${escapeString(doc.translationCategory)}");`,
    ""
  ];

  const roots = getChildren(doc, ROOT).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const node of roots) {
    emitNode(doc, lines, node, "\t", false);
  }

  lines.push("}");
  return lines.join("\n");
}

// Ported from legacy/app.js:766-774.
export function generatePreloadSnippet(): string {
  return [
    "// Add this to a preload/setup path used by the map before the GUI is shown.",
    "void OnGui(float afTimeStep)",
    "{",
    "\tStationGui_PreloadDefault();",
    "}"
  ].join("\n");
}

export function generate(doc: SomaDocument): CodegenResult {
  return { hps: generateHps(doc), preload: generatePreloadSnippet() };
}
