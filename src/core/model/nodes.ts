// Framework-agnostic widget node model.
// Discriminated union keyed by `type` over a shared NodeBase.
// Coordinates are normalized fractions (0..1) relative to the parent; the root
// parent is the sentinel "screen". `z` is the draw depth (painter order), packed
// into the emitted cVector3f as its third component (mirrors the prototype).

export const ROOT = "screen";

export type WidgetType =
  | "station-window"
  | "group"
  | "station-button"
  | "station-toggle-button"
  | "label"
  | "text-frame"
  | "image"
  | "gauge"
  | "fill"
  | "station-numpad"
  | "station-text-reader-single"
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

export interface StationWindowNode extends NodeBase {
  type: "station-window";
  caption: string;
}

export interface GroupNode extends NodeBase {
  type: "group";
  caption: string;
}

export interface StationButtonNode extends NodeBase {
  type: "station-button";
  caption: string;
}

export interface StationToggleButtonNode extends NodeBase {
  type: "station-toggle-button";
  caption: string;
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

export interface AdvancedNode extends NodeBase {
  type: "advanced-imgui";
  caption: string;
  /** Raw HPS passed through verbatim. */
  code: string;
}

export type WidgetNode =
  | StationWindowNode
  | GroupNode
  | StationButtonNode
  | StationToggleButtonNode
  | LabelNode
  | TextFrameNode
  | ImageNode
  | GaugeNode
  | FillNode
  | NumpadNode
  | TextReaderNode
  | AdvancedNode;

/** Node types with a `caption` field (all current types). */
export type CaptionedNode = Extract<WidgetNode, { caption: string }>;
