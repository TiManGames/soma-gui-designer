import type { Override, WidgetNode, WidgetType } from "./nodes";

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  category: "container" | "element" | "background" | "helper" | "advanced";
  canHaveChildren: boolean;
  dataClass?: string;
  factory?: string;
}

export const WIDGETS: Record<WidgetType, WidgetMeta> = {
  // --- Containers ---
  "station-window": {
    type: "station-window", label: "Station Window", category: "container", canHaveChildren: true,
    dataClass: "cImGuiWindowData", factory: "StationGui_CreateDefaultWindowData()"
  },
  group: { type: "group", label: "Group", category: "container", canHaveChildren: true },
  layout: { type: "layout", label: "Layout", category: "container", canHaveChildren: true },

  // --- Elements ---
  "station-button": {
    type: "station-button", label: "Station Button", category: "element", canHaveChildren: false,
    dataClass: "cImGuiButtonData", factory: "StationGui_CreateDefaultButtonData()"
  },
  "station-toggle-button": {
    type: "station-toggle-button", label: "Station Toggle", category: "element", canHaveChildren: false,
    dataClass: "cImGuiButtonData", factory: "StationGui_CreateToggleButtonData()"
  },
  "repeat-button": {
    type: "repeat-button", label: "Repeat Button", category: "element", canHaveChildren: false,
    dataClass: "cImGuiButtonData", factory: "StationGui_CreateDefaultButtonData()"
  },
  checkbox: {
    type: "checkbox", label: "Checkbox", category: "element", canHaveChildren: false,
    dataClass: "cImGuiCheckBoxData"
  },
  "slider-h": {
    type: "slider-h", label: "Slider (H)", category: "element", canHaveChildren: false,
    dataClass: "cImGuiSliderData"
  },
  "slider-v": {
    type: "slider-v", label: "Slider (V)", category: "element", canHaveChildren: false,
    dataClass: "cImGuiSliderData"
  },
  "multi-toggle": {
    type: "multi-toggle", label: "Multi Toggle", category: "element", canHaveChildren: false,
    dataClass: "cImGuiButtonData", factory: "StationGui_CreateDefaultButtonData()"
  },
  "multi-select": {
    type: "multi-select", label: "Multi Select", category: "element", canHaveChildren: false,
    dataClass: "cImGuiMultiSelectData"
  },
  label: { type: "label", label: "Label", category: "element", canHaveChildren: false },
  "text-frame": {
    type: "text-frame", label: "Text Frame", category: "element", canHaveChildren: false,
    dataClass: "cImGuiTextFrameData", factory: "StationGui_CreateDefaultTextFrameData()"
  },
  image: { type: "image", label: "Image", category: "element", canHaveChildren: false },
  gauge: {
    type: "gauge", label: "Gauge", category: "element", canHaveChildren: false,
    dataClass: "cImGuiGaugeData", factory: "StationGui_CreateDefaultGaugeData()"
  },
  fill: { type: "fill", label: "Fill / Frame", category: "element", canHaveChildren: false },
  frame: {
    type: "frame", label: "Frame", category: "element", canHaveChildren: false,
    dataClass: "cImGuiFrameData"
  },

  // --- Background / overlay ---
  "bg-scanlines":    { type: "bg-scanlines",    label: "BG Scanlines",      category: "background", canHaveChildren: false },
  "bg-backdrop":     { type: "bg-backdrop",     label: "BG Backdrop",       category: "background", canHaveChildren: false },
  "bg-flat-color":   { type: "bg-flat-color",   label: "BG Flat Color",     category: "background", canHaveChildren: false },
  "bg-ornament-tl":  { type: "bg-ornament-tl",  label: "Ornament Top-Left", category: "background", canHaveChildren: false },
  "bg-ornament-tr":  { type: "bg-ornament-tr",  label: "Ornament Top-Right", category: "background", canHaveChildren: false },
  "bg-ornament-br":  { type: "bg-ornament-br",  label: "Ornament Bot-Right", category: "background", canHaveChildren: false },
  "bg-ornament-bl":  { type: "bg-ornament-bl",  label: "Ornament Bot-Left", category: "background", canHaveChildren: false },

  // --- Helpers ---
  "station-numpad": { type: "station-numpad", label: "Numpad", category: "helper", canHaveChildren: false },
  "station-text-reader-single": {
    type: "station-text-reader-single", label: "Text Reader", category: "helper", canHaveChildren: false,
    dataClass: "cStationGui_TextReaderSettings", factory: "cStationGui_TextReaderSettings()"
  },

  // --- Advanced ---
  "advanced-imgui": { type: "advanced-imgui", label: "Advanced HPS", category: "advanced", canHaveChildren: false }
};

export function isContainerType(type: WidgetType | undefined): boolean {
  return !!type && WIDGETS[type].canHaveChildren;
}

const TEXT_READER_DEFAULT_OVERRIDES: Override[] = [
  { kind: "expr", path: "mvTextFontSize", expr: "ImGui_NrmSizeKeepRatio(0.0325f)" },
  { kind: "expr", path: "mbDrawAppIcon", expr: "true" },
  { kind: "expr", path: "mbFullScreen", expr: "false" }
];

interface Rect { xN: number; yN: number; wN: number; hN: number; z: number; }

// Background widgets use the full screen as a placeholder on the canvas.
const BG_RECT: Rect = { xN: 0, yN: 0, wN: 1, hN: 1, z: 0 };

const DEFAULT_RECT: Record<WidgetType, Rect> = {
  "station-window":           { xN: 0.1,   yN: 0.1,  wN: 0.8,  hN: 0.72, z: 1 },
  group:                      { xN: 0.1,   yN: 0.1,  wN: 0.5,  hN: 0.5,  z: 1 },
  layout:                     { xN: 0.05,  yN: 0.05, wN: 0.9,  hN: 0.9,  z: 1 },
  "station-button":           { xN: 0.65,  yN: 0.82, wN: 0.25, hN: 0.1,  z: 1 },
  "station-toggle-button":    { xN: 0.65,  yN: 0.7,  wN: 0.25, hN: 0.1,  z: 1 },
  "repeat-button":            { xN: 0.65,  yN: 0.6,  wN: 0.25, hN: 0.1,  z: 1 },
  checkbox:                   { xN: 0.1,   yN: 0.5,  wN: 0.4,  hN: 0.08, z: 1 },
  "slider-h":                 { xN: 0.1,   yN: 0.6,  wN: 0.5,  hN: 0.06, z: 1 },
  "slider-v":                 { xN: 0.8,   yN: 0.1,  wN: 0.06, hN: 0.5,  z: 1 },
  "multi-toggle":             { xN: 0.1,   yN: 0.1,  wN: 0.8,  hN: 0.2,  z: 1 },
  "multi-select":             { xN: 0.1,   yN: 0.1,  wN: 0.4,  hN: 0.5,  z: 1 },
  label:                      { xN: 0.1,   yN: 0.1,  wN: 0.4,  hN: 0.08, z: 1 },
  "text-frame":               { xN: 0.45,  yN: 0.12, wN: 0.5,  hN: 0.55, z: 1 },
  image:                      { xN: 0.05,  yN: 0.12, wN: 0.35, hN: 0.45, z: 1 },
  gauge:                      { xN: 0.1,   yN: 0.78, wN: 0.5,  hN: 0.08, z: 1 },
  fill:                       { xN: 0,     yN: 0,    wN: 1,    hN: 1,    z: 0 },
  frame:                      { xN: 0.1,   yN: 0.1,  wN: 0.4,  hN: 0.3,  z: 1 },
  "bg-scanlines":             { ...BG_RECT, z: 10 },
  "bg-backdrop":              { ...BG_RECT, z: 0 },
  "bg-flat-color":            { ...BG_RECT, z: 0 },
  "bg-ornament-tl":           { ...BG_RECT, z: 0.2 },
  "bg-ornament-tr":           { ...BG_RECT, z: 0.2 },
  "bg-ornament-br":           { ...BG_RECT, z: 0.2 },
  "bg-ornament-bl":           { ...BG_RECT, z: 0.2 },
  "station-numpad":           { xN: 0.125, yN: 0.1,  wN: 0.75, hN: 0.8,  z: 1.5 },
  "station-text-reader-single": { xN: 0.05, yN: 0.02, wN: 0.9, hN: 0.775, z: 1 },
  "advanced-imgui":           { xN: 0.1,   yN: 0.1,  wN: 0.3,  hN: 0.2,  z: 1 }
};

const DEFAULT_CAPTION: Record<WidgetType, string> = {
  "station-window": "MainWindow", group: "Group", layout: "Layout",
  "station-button": "Confirm", "station-toggle-button": "Toggle",
  "repeat-button": "RepeatBtn", checkbox: "MyCheckbox",
  "slider-h": "SliderH", "slider-v": "SliderV",
  "multi-toggle": "MultiToggle", "multi-select": "MultiSelect",
  label: "LabelText", "text-frame": "BodyText", image: "Image",
  gauge: "Gauge", fill: "Fill", frame: "Frame",
  "bg-scanlines": "Scanlines", "bg-backdrop": "Backdrop",
  "bg-flat-color": "FlatColor",
  "bg-ornament-tl": "OrnamentTL", "bg-ornament-tr": "OrnamentTR",
  "bg-ornament-br": "OrnamentBR", "bg-ornament-bl": "OrnamentBL",
  "station-numpad": "EnterCode",
  "station-text-reader-single": "SystemStatus",
  "advanced-imgui": "Advanced"
};

export function makeNode(type: WidgetType, id: string, patch: Partial<WidgetNode> = {}): WidgetNode {
  const rect = DEFAULT_RECT[type];
  const base = {
    id, parentId: "screen",
    xN: rect.xN, yN: rect.yN, wN: rect.wN, hN: rect.hN, z: rect.z,
    enabled: true, overrides: [] as Override[]
  };
  const caption = DEFAULT_CAPTION[type];

  let node: WidgetNode;
  switch (type) {
    case "station-window":          node = { ...base, type, caption }; break;
    case "group":                   node = { ...base, type, caption }; break;
    case "layout":                  node = { ...base, type, caption, layoutType: "eImGuiLayout_Y" }; break;
    case "station-button":          node = { ...base, type, caption }; break;
    case "station-toggle-button":   node = { ...base, type, caption }; break;
    case "repeat-button":           node = { ...base, type, caption }; break;
    case "checkbox":                node = { ...base, type, caption }; break;
    case "slider-h":                node = { ...base, type, caption, defaultValue: "0.5f", min: "0.0f", max: "1.0f", step: "0.1f" }; break;
    case "slider-v":                node = { ...base, type, caption, defaultValue: "0.5f", min: "0.0f", max: "1.0f", step: "0.1f" }; break;
    case "multi-toggle":            node = { ...base, type, caption, itemsText: "Option A|Option B|Option C", columns: 3 }; break;
    case "multi-select":            node = { ...base, type, caption, itemsText: "Item 1|Item 2|Item 3" }; break;
    case "label":                   node = { ...base, type, caption, fontSizeMul: 1 }; break;
    case "text-frame":              node = { ...base, type, caption, text: "BodyTextEntry" }; break;
    case "image":                   node = { ...base, type, caption, gfx: "my_image", correctAspect: false }; break;
    case "gauge":                   node = { ...base, type, caption, fillExpr: "0.5f" }; break;
    case "fill":                    node = { ...base, type, caption }; break;
    case "frame":                   node = { ...base, type, caption }; break;
    case "bg-scanlines":   node = { ...base, type, caption, zDepth: "10.0f", file: "station/scanlines/standard_tileable" }; break;
    case "bg-backdrop":    node = { ...base, type, caption, file: "background_logo_pathOS", relPosX: "0.1f", relPosY: "0.45f", relSize: "0.5f", zDepth: "0.0f" }; break;
    case "bg-flat-color":  node = { ...base, type, caption, zDepth: "0.0f", color: "cColor(0,1.0f)" }; break;
    case "bg-ornament-tl": node = { ...base, type, caption, file: "station/ornament/corner_topleft",    zDepth: "0.2f", color: "cColor_White" }; break;
    case "bg-ornament-tr": node = { ...base, type, caption, file: "station/ornament/corner_topright",   zDepth: "0.2f", color: "cColor(1.0f, 0.75f, 0.75f, 1.0f)" }; break;
    case "bg-ornament-br": node = { ...base, type, caption, file: "station/ornament/corner_bottomright",zDepth: "0.2f", color: "cColor(1.0f, 0.75f, 0.75f, 1.0f)" }; break;
    case "bg-ornament-bl": node = { ...base, type, caption, file: "station/ornament/corner_bottomleft", zDepth: "0.2f", color: "cColor(1.0f, 0.75f, 0.75f, 1.0f)" }; break;
    case "station-numpad":          node = { ...base, type, caption, digits: 4 }; break;
    case "station-text-reader-single":
      node = { ...base, type, caption, text: "SystemStatusBody", overrides: [...TEXT_READER_DEFAULT_OVERRIDES] };
      break;
    case "advanced-imgui":          node = { ...base, type, caption, code: "// Custom HPS here." }; break;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown widget type: ${String(_exhaustive)}`);
    }
  }

  return { ...node, ...patch } as WidgetNode;
}
