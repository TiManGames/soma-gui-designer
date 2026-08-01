import type { Override, WidgetNode, WidgetType } from "./nodes";

/**
 * Static widget catalog. `dataClass`/`factory` mirror legacy/app.js COMPONENTS
 * (app.js:20-90); these are validated against the extracted API schema at build
 * time (M3). The codegen emitter registry keys off `type`.
 */
export interface WidgetMeta {
  type: WidgetType;
  label: string;
  category: "container" | "element" | "helper" | "advanced";
  canHaveChildren: boolean;
  /** AngelScript data-struct class, if the widget takes a data arg. */
  dataClass?: string;
  /** Factory expression that produces default data, e.g. "StationGui_CreateDefaultButtonData()". */
  factory?: string;
}

export const WIDGETS: Record<WidgetType, WidgetMeta> = {
  "station-window": {
    type: "station-window",
    label: "Station Window",
    category: "container",
    canHaveChildren: true,
    dataClass: "cImGuiWindowData",
    factory: "StationGui_CreateDefaultWindowData()"
  },
  group: {
    type: "group",
    label: "Group",
    category: "container",
    canHaveChildren: true
  },
  "station-button": {
    type: "station-button",
    label: "Station Button",
    category: "element",
    canHaveChildren: false,
    dataClass: "cImGuiButtonData",
    factory: "StationGui_CreateDefaultButtonData()"
  },
  "station-toggle-button": {
    type: "station-toggle-button",
    label: "Station Toggle",
    category: "element",
    canHaveChildren: false,
    dataClass: "cImGuiButtonData",
    factory: "StationGui_CreateToggleButtonData()"
  },
  label: {
    type: "label",
    label: "Label",
    category: "element",
    canHaveChildren: false
  },
  "text-frame": {
    type: "text-frame",
    label: "Text Frame",
    category: "element",
    canHaveChildren: false,
    dataClass: "cImGuiTextFrameData",
    factory: "StationGui_CreateDefaultTextFrameData()"
  },
  image: {
    type: "image",
    label: "Image",
    category: "element",
    canHaveChildren: false
  },
  gauge: {
    type: "gauge",
    label: "Gauge",
    category: "element",
    canHaveChildren: false,
    dataClass: "cImGuiGaugeData",
    factory: "StationGui_CreateDefaultGaugeData()"
  },
  fill: {
    type: "fill",
    label: "Fill / Frame",
    category: "element",
    canHaveChildren: false
  },
  "station-numpad": {
    type: "station-numpad",
    label: "Numpad helper",
    category: "helper",
    canHaveChildren: false
  },
  "station-text-reader-single": {
    type: "station-text-reader-single",
    label: "Text Reader helper",
    category: "helper",
    canHaveChildren: false,
    dataClass: "cStationGui_TextReaderSettings",
    factory: "cStationGui_TextReaderSettings()"
  },
  "advanced-imgui": {
    type: "advanced-imgui",
    label: "Advanced HPS",
    category: "advanced",
    canHaveChildren: false
  }
};

export function isContainerType(type: WidgetType | undefined): boolean {
  return !!type && WIDGETS[type].canHaveChildren;
}

/** Default overrides for the text-reader (ported from app.js:84 defaultSettingsText). */
const TEXT_READER_DEFAULT_OVERRIDES: Override[] = [
  { kind: "expr", path: "mvTextFontSize", expr: "ImGui_NrmSizeKeepRatio(0.0325f)" },
  { kind: "expr", path: "mbDrawAppIcon", expr: "true" },
  { kind: "expr", path: "mbFullScreen", expr: "false" }
];

interface Rect {
  xN: number;
  yN: number;
  wN: number;
  hN: number;
  z: number;
}

// Default geometry per type, ported from legacy/app.js BLOCK_DEFAULTS (app.js:92-208).
const DEFAULT_RECT: Record<WidgetType, Rect> = {
  "station-window": { xN: 0.1, yN: 0.1, wN: 0.8, hN: 0.72, z: 1 },
  group: { xN: 0.1, yN: 0.1, wN: 0.5, hN: 0.5, z: 1 },
  "station-button": { xN: 0.65, yN: 0.82, wN: 0.25, hN: 0.1, z: 1 },
  "station-toggle-button": { xN: 0.65, yN: 0.7, wN: 0.25, hN: 0.1, z: 1 },
  label: { xN: 0.1, yN: 0.1, wN: 0.4, hN: 0.08, z: 1 },
  "text-frame": { xN: 0.45, yN: 0.12, wN: 0.5, hN: 0.55, z: 1 },
  image: { xN: 0.05, yN: 0.12, wN: 0.35, hN: 0.45, z: 1 },
  gauge: { xN: 0.1, yN: 0.78, wN: 0.5, hN: 0.08, z: 1 },
  fill: { xN: 0, yN: 0, wN: 1, hN: 1, z: 0 },
  "station-numpad": { xN: 0.125, yN: 0.1, wN: 0.75, hN: 0.8, z: 1.5 },
  "station-text-reader-single": { xN: 0.05, yN: 0.02, wN: 0.9, hN: 0.775, z: 1 },
  "advanced-imgui": { xN: 0.1, yN: 0.1, wN: 0.3, hN: 0.2, z: 1 }
};

const DEFAULT_CAPTION: Record<WidgetType, string> = {
  "station-window": "MainWindow",
  group: "Group",
  "station-button": "Confirm",
  "station-toggle-button": "Toggle",
  label: "LabelText",
  "text-frame": "BodyText",
  image: "Image",
  gauge: "Gauge",
  fill: "Fill",
  "station-numpad": "EnterCode",
  "station-text-reader-single": "SystemStatus",
  "advanced-imgui": "Advanced"
};

/**
 * Build a fully-formed node of `type` with `id`. Callers pass geometry/parent
 * overrides via `patch`. Type-specific fields get sensible defaults matching
 * the prototype.
 */
export function makeNode(
  type: WidgetType,
  id: string,
  patch: Partial<WidgetNode> = {}
): WidgetNode {
  const rect = DEFAULT_RECT[type];
  const base = {
    id,
    parentId: "screen",
    xN: rect.xN,
    yN: rect.yN,
    wN: rect.wN,
    hN: rect.hN,
    z: rect.z,
    enabled: true,
    overrides: [] as Override[]
  };
  const caption = DEFAULT_CAPTION[type];

  let node: WidgetNode;
  switch (type) {
    case "station-window":
      node = { ...base, type, caption };
      break;
    case "group":
      node = { ...base, type, caption };
      break;
    case "station-button":
      node = { ...base, type, caption };
      break;
    case "station-toggle-button":
      node = { ...base, type, caption };
      break;
    case "label":
      node = { ...base, type, caption, fontSizeMul: 1 };
      break;
    case "text-frame":
      node = { ...base, type, caption, text: "BodyTextEntry" };
      break;
    case "image":
      node = { ...base, type, caption, gfx: "my_image" };
      break;
    case "gauge":
      node = { ...base, type, caption, fillExpr: "0.5f" };
      break;
    case "fill":
      node = { ...base, type, caption };
      break;
    case "station-numpad":
      node = { ...base, type, caption, digits: 4 };
      break;
    case "station-text-reader-single":
      node = {
        ...base,
        type,
        caption,
        text: "SystemStatusBody",
        overrides: [...TEXT_READER_DEFAULT_OVERRIDES]
      };
      break;
    case "advanced-imgui":
      node = { ...base, type, caption, code: "// Custom HPS here." };
      break;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown widget type: ${String(_exhaustive)}`);
    }
  }

  return { ...node, ...patch } as WidgetNode;
}
