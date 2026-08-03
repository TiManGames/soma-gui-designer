// Framework-agnostic widget node model.
// Discriminated union keyed by `type` over a shared NodeBase.
// Coordinates are normalized fractions (0..1) relative to the parent; the root
// parent is the sentinel "screen". `z` is the draw depth (painter order), packed
// into the emitted cVector3f as its third component (mirrors the prototype).

export const ROOT = "screen";

export type WidgetType =
  // --- containers ---
  | "station-window"
  | "group"
  | "layout"
  // --- elements ---
  | "station-button"
  | "station-toggle-button"
  | "repeat-button"
  | "checkbox"
  | "slider-h"
  | "slider-v"
  | "multi-toggle"
  | "multi-select"
  | "label"
  | "text-frame"
  | "image"
  | "gauge"
  | "fill"
  | "frame"
  // --- background / overlay (full-screen, no pos/size on canvas) ---
  | "bg-scanlines"
  | "bg-backdrop"
  | "bg-flat-color"
  | "bg-ornament-tl"
  | "bg-ornament-tr"
  | "bg-ornament-br"
  | "bg-ornament-bl"
  // --- helpers ---
  | "station-numpad"
  | "station-text-reader-single"
  // --- advanced ---
  | "advanced-imgui";

/**
 * A single override applied to a widget's data struct.
 * - `expr`: assignment, e.g. { path: "mColorBase", expr: "gStationGuiColor_Warning" }
 *           emits `<var>.mColorBase = gStationGuiColor_Warning;`
 * - `call`: method call, e.g. { call: "SetPadding(20,20,20,20)" }
 *           emits `<var>.SetPadding(20,20,20,20);`
 */
export type Override =
  | { kind: "expr"; path: string; expr: string }
  | { kind: "call"; call: string };

export interface NodeBase {
  id: string;
  parentId: string; // "screen" or a container id
  xN: number;
  yN: number;
  wN: number;
  hN: number;
  z: number;
  enabled: boolean;
  /** Structured customizations of the widget's data struct (override-only). */
  overrides: Override[];
}

// ---- Containers --------------------------------------------------------

export interface StationWindowNode extends NodeBase {
  type: "station-window";
  caption: string;
}

export interface GroupNode extends NodeBase {
  type: "group";
  caption: string;
}

/** Auto-flow layout (X, Y, or XY). Children placed automatically without explicit coords. */
export interface LayoutNode extends NodeBase {
  type: "layout";
  caption: string;
  /** eImGuiLayout value: eImGuiLayout_X | eImGuiLayout_Y | eImGuiLayout_XY | eImGuiLayout_X_Tabbed */
  layoutType: string;
}

// ---- Elements ----------------------------------------------------------

export interface StationButtonNode extends NodeBase {
  type: "station-button";
  caption: string;
}

export interface StationToggleButtonNode extends NodeBase {
  type: "station-toggle-button";
  caption: string;
}

export interface RepeatButtonNode extends NodeBase {
  type: "repeat-button";
  caption: string;
}

export interface CheckboxNode extends NodeBase {
  type: "checkbox";
  caption: string;
}

export interface SliderHNode extends NodeBase {
  type: "slider-h";
  caption: string;
  /** Default value expression, e.g. "0.5f". */
  defaultValue: string;
  min: string;
  max: string;
  step: string;
}

export interface SliderVNode extends NodeBase {
  type: "slider-v";
  caption: string;
  defaultValue: string;
  min: string;
  max: string;
  step: string;
}

export interface MultiToggleNode extends NodeBase {
  type: "multi-toggle";
  caption: string;
  /** Pipe-separated item labels, e.g. "Option A|Option B|Option C". */
  itemsText: string;
  /** Number of columns in the grid. */
  columns: number;
}

export interface MultiSelectNode extends NodeBase {
  type: "multi-select";
  caption: string;
  /** Pipe-separated item labels. */
  itemsText: string;
}

export interface LabelNode extends NodeBase {
  type: "label";
  caption: string;
  fontSizeMul: number;
}

export interface TextFrameNode extends NodeBase {
  type: "text-frame";
  caption: string;
  /** Translation-entry key (or literal text) rendered by the frame. */
  text: string;
}

export interface ImageNode extends NodeBase {
  type: "image";
  caption: string;
  /** Gfx file/name passed to cImGuiGfx("..."). */
  gfx: string;
  /** When true, emit ImGui_DoImageCorrectAspect to preserve the image ratio. */
  correctAspect: boolean;
}

export interface GaugeNode extends NodeBase {
  type: "gauge";
  caption: string;
  /** Fill amount expression (0..1), e.g. "0.5f". */
  fillExpr: string;
}

export interface FillNode extends NodeBase {
  type: "fill";
  caption: string;
}

/** Decorative 9-slice border/frame (no interactive children). */
export interface FrameNode extends NodeBase {
  type: "frame";
  caption: string;
}

// ---- Background / overlay (full-screen, emitted without pos/size args) -

export interface BgScanlinesNode extends NodeBase {
  type: "bg-scanlines";
  caption: string;
}

export interface BgBackdropNode extends NodeBase {
  type: "bg-backdrop";
  caption: string;
}

export interface BgFlatColorNode extends NodeBase {
  type: "bg-flat-color";
  caption: string;
}

export interface BgOrnamentTLNode extends NodeBase { type: "bg-ornament-tl"; caption: string; }
export interface BgOrnamentTRNode extends NodeBase { type: "bg-ornament-tr"; caption: string; }
export interface BgOrnamentBRNode extends NodeBase { type: "bg-ornament-br"; caption: string; }
export interface BgOrnamentBLNode extends NodeBase { type: "bg-ornament-bl"; caption: string; }

// ---- Helpers -----------------------------------------------------------

export interface NumpadNode extends NodeBase {
  type: "station-numpad";
  caption: string;
  /** Number of digits. */
  digits: number;
}

export interface TextReaderNode extends NodeBase {
  type: "station-text-reader-single";
  caption: string;
  text: string;
}

// ---- Advanced ----------------------------------------------------------

export interface AdvancedNode extends NodeBase {
  type: "advanced-imgui";
  caption: string;
  /** Raw HPS passed through verbatim. */
  code: string;
}

export type WidgetNode =
  | StationWindowNode
  | GroupNode
  | LayoutNode
  | StationButtonNode
  | StationToggleButtonNode
  | RepeatButtonNode
  | CheckboxNode
  | SliderHNode
  | SliderVNode
  | MultiToggleNode
  | MultiSelectNode
  | LabelNode
  | TextFrameNode
  | ImageNode
  | GaugeNode
  | FillNode
  | FrameNode
  | BgScanlinesNode
  | BgBackdropNode
  | BgFlatColorNode
  | BgOrnamentTLNode
  | BgOrnamentTRNode
  | BgOrnamentBRNode
  | BgOrnamentBLNode
  | NumpadNode
  | TextReaderNode
  | AdvancedNode;

/** Node types with a `caption` field (all current types). */
export type CaptionedNode = Extract<WidgetNode, { caption: string }>;
