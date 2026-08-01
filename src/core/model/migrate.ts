import type { SomaDocument, Target } from "./document";
import type { Override, WidgetNode, WidgetType } from "./nodes";
import { makeNode } from "./defaults";

/**
 * Parse a prototype v3 `settingsText` blob into structured overrides.
 * v3 lines were: `key=value` -> expr override; `something(...)` -> method call.
 * Mirrors legacy/app.js:894-905.
 */
export function parseSettingsText(text: string): Override[] {
  const out: Override[] = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.includes("=")) {
      const idx = line.indexOf("=");
      out.push({
        kind: "expr",
        path: line.slice(0, idx).trim(),
        expr: line.slice(idx + 1).trim()
      });
    } else if (line.includes("(")) {
      out.push({ kind: "call", call: line });
    }
  }
  return out;
}

interface LegacyBlock {
  id: string;
  type: string;
  parentId?: string;
  xN?: number;
  yN?: number;
  wN?: number;
  hN?: number;
  z?: number;
  caption?: string;
  text?: string;
  arg?: string;
  code?: string;
  settingsText?: string;
  enabled?: boolean;
}

interface LegacyDoc {
  schemaVersion?: number;
  target?: string;
  functionName?: string;
  translationCategory?: string;
  previewResolution?: { x: number; y: number };
  resolutionPreset?: string;
  gridSize?: number;
  snapToGrid?: boolean;
  blocks?: LegacyBlock[];
}

const TARGET_MAP: Record<string, Target> = {
  "terminal-on-gui": "terminal-on-gui",
  "map-on-gui": "map-on-gui",
  "helper-function": "helper-function"
};

/** Map a legacy block's loose fields onto the typed node for its type. */
function migrateBlock(block: LegacyBlock): WidgetNode | null {
  const type = block.type as WidgetType;
  const patch: Partial<WidgetNode> = {
    parentId: block.parentId ?? "screen",
    xN: block.xN ?? 0.1,
    yN: block.yN ?? 0.1,
    wN: block.wN ?? 0.25,
    hN: block.hN ?? 0.1,
    z: block.z ?? 1,
    enabled: block.enabled ?? true,
    overrides: parseSettingsText(block.settingsText ?? "")
  };
  const node = makeNode(type, block.id, patch);

  // Map legacy generic fields (caption/text/arg/code) onto typed fields.
  if ("caption" in node && block.caption !== undefined) node.caption = block.caption;
  if (node.type === "text-frame" || node.type === "station-text-reader-single") {
    if (block.text !== undefined) node.text = block.text;
  }
  if (node.type === "image" && block.arg !== undefined) node.gfx = block.arg;
  if (node.type === "gauge" && block.arg !== undefined) node.fillExpr = block.arg;
  if (node.type === "station-numpad" && block.arg !== undefined) {
    node.digits = Number(block.arg) || 4;
  }
  if (node.type === "advanced-imgui" && block.code !== undefined) node.code = block.code;

  return node;
}

/**
 * Migrate an arbitrary parsed JSON document to schema v4. Returns null if it
 * doesn't look like a designer document.
 */
export function migrateToV4(input: unknown): SomaDocument | null {
  if (!input || typeof input !== "object") return null;
  const doc = input as LegacyDoc & { nodes?: WidgetNode[] };

  // Already v4.
  if (doc.schemaVersion === 4 && Array.isArray((doc as SomaDocument).nodes)) {
    return doc as unknown as SomaDocument;
  }

  // v3 (or unversioned) with `blocks`.
  if (Array.isArray(doc.blocks)) {
    const nodes = doc.blocks
      .map(migrateBlock)
      .filter((n): n is WidgetNode => n !== null);
    return {
      schemaVersion: 4,
      target: TARGET_MAP[doc.target ?? ""] ?? "terminal-on-gui",
      functionName: doc.functionName ?? "DrawGeneratedCustomScreen",
      translationCategory: doc.translationCategory ?? "GeneratedTerminal",
      previewResolution: doc.previewResolution ?? { x: 1280, y: 800 },
      resolutionPreset: doc.resolutionPreset ?? "1280x800",
      gridSize: doc.gridSize ?? 10,
      snapToGrid: doc.snapToGrid ?? true,
      nodes
    };
  }

  return null;
}
