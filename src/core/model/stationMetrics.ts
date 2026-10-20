import type { WidgetNode } from "./nodes";

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface StationWindowMetrics {
  useHeader: boolean;
  headerType: "full" | "fit-caption";
  captionSizeMul: number;
  fontSize: Vec2;
  fontAlign: "left" | "center" | "right";
  contentPadding: Insets;
  labelPadding: Insets;
  labelOffset: Vec2;
  labelMinWidth: number;
  headerHeight: number;
}

export interface StationButtonMetrics {
  fontSize: Vec2;
  fontAlign: "left" | "center" | "right";
  clipText: boolean;
  clipPaddingLeft: number;
  clipPaddingRight: number;
  useFrame: boolean;
  useBackgroundGfx: boolean;
}

export type StationFrameSize = "small" | "big";

const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function finiteOr(value: number | null, fallback: number): number {
  return value === null ? fallback : value;
}

/** Parse a plain AngelScript float literal, including an optional `f` suffix. */
export function parseFloatLiteral(expr: string): number | null {
  const cleaned = expr.trim().replace(/[fF]$/, "");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseBoolLiteral(expr: string): boolean | null {
  const cleaned = expr.trim();
  if (cleaned === "true") return true;
  if (cleaned === "false") return false;
  return null;
}

function parseArgs(expr: string): number[] | null {
  const values = expr.split(",").map((part) => parseFloatLiteral(part));
  return values.some((value) => value === null) ? null : (values as number[]);
}

function parseVector(expr: string): number[] | null {
  const match = /cVector[23]f\s*\(([^)]*)\)/.exec(expr);
  if (!match) return null;
  const values = parseArgs(match[1]);
  if (!values || values.length === 0) return null;
  return values.length === 1 ? [values[0], values[0]] : values;
}

/** Resolve a literal pixel vector or an ImGui height-relative size expression. */
function parseFontSize(expr: string, previewHeight: number): Vec2 | null {
  const keepRatioVector = /ImGui_NrmSizeKeepRatio\s*\(\s*cVector2f\s*\(([^)]*)\)\s*\)/.exec(expr);
  if (keepRatioVector) {
    const values = parseArgs(keepRatioVector[1]);
    if (values && values.length > 0) {
      const x = values[0];
      const y = values[1] ?? values[0];
      return { x: x * previewHeight, y: y * previewHeight };
    }
  }
  const keepRatio = /ImGui_NrmSizeKeepRatio\s*\(([^)]*)\)/.exec(expr);
  if (keepRatio) {
    const scalar = parseFloatLiteral(keepRatio[1]);
    if (scalar !== null) return { x: scalar * previewHeight, y: scalar * previewHeight };
  }

  const vector = parseVector(expr);
  if (vector && vector.length >= 2) return { x: vector[0], y: vector[1] };

  const scalar = parseFloatLiteral(expr);
  return scalar === null ? null : { x: scalar, y: scalar };
}

function parseAlign(expr: string): StationWindowMetrics["fontAlign"] | null {
  if (expr.trim() === "eFontAlign_Left") return "left";
  if (expr.trim() === "eFontAlign_Right") return "right";
  if (expr.trim() === "eFontAlign_Center") return "center";
  return null;
}

function setInset(insets: Insets, path: string, value: number): Insets {
  switch (path) {
    case "mfPaddingTop":
    case "mfLabelPaddingTop": return { ...insets, top: value };
    case "mfPaddingRight":
    case "mfLabelPaddingRight": return { ...insets, right: value };
    case "mfPaddingBottom":
    case "mfLabelPaddingBottom": return { ...insets, bottom: value };
    case "mfPaddingLeft":
    case "mfLabelPaddingLeft": return { ...insets, left: value };
    default: return insets;
  }
}

function getInset(insets: Insets, path: string): number {
  if (path.endsWith("Top")) return insets.top;
  if (path.endsWith("Right")) return insets.right;
  if (path.endsWith("Bottom")) return insets.bottom;
  return insets.left;
}

function parsePaddingCall(call: string, method: "SetPadding" | "SetLabelPadding"): Insets | null {
  const match = new RegExp(`^\\s*${method}\\s*\\(([^)]*)\\)\\s*$`).exec(call);
  if (!match) return null;
  const values = parseArgs(match[1]);
  if (!values || values.length !== 4) return null;
  return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
}

function nonNegativeInsets(insets: Insets): Insets {
  return {
    top: Math.max(0, insets.top),
    right: Math.max(0, insets.right),
    bottom: Math.max(0, insets.bottom),
    left: Math.max(0, insets.left)
  };
}

/**
 * Resolve the subset of cImGuiWindowData that changes preview geometry.
 * Overrides are applied in document order, matching emitDataVar and HPS runtime order.
 */
export function resolveStationWindowMetrics(node: WidgetNode, previewHeight: number): StationWindowMetrics {
  const height = Math.max(1, previewHeight);
  const defaultFontSize: Vec2 = { x: height * 0.047, y: height * 0.047 };
  const defaultContentPadding: Insets = { ...ZERO_INSETS };
  const defaultLabelPadding: Insets = { top: 0, right: 15, bottom: 0, left: 10 };
  let useHeader = true;
  let headerType: StationWindowMetrics["headerType"] = "fit-caption";
  let captionSizeMul = 1;
  let fontSize: Vec2 = { ...defaultFontSize };
  let fontAlign: StationWindowMetrics["fontAlign"] = "left";
  let contentPadding: Insets = { ...defaultContentPadding };
  let labelPadding: Insets = { ...defaultLabelPadding };
  let labelOffset: Vec2 = { x: 0, y: 0 };
  let labelMinWidth = 0;

  for (const override of node.overrides) {
    if (override.kind === "call") {
      if (/^\s*SetPadding\s*\(/.test(override.call)) {
        contentPadding = parsePaddingCall(override.call, "SetPadding") ?? { ...defaultContentPadding };
      } else if (/^\s*SetLabelPadding\s*\(/.test(override.call)) {
        labelPadding = parsePaddingCall(override.call, "SetLabelPadding") ?? { ...defaultLabelPadding };
      }
      continue;
    }

    const { path, expr } = override;
    if (path === "mbUseHeader") useHeader = parseBoolLiteral(expr) ?? true;
    else if (path === "mHeaderType") {
      if (expr.trim() === "eImGuiWindowHeader_Full") headerType = "full";
      else if (expr.trim() === "eImGuiWindowHeader_FitCaption") headerType = "fit-caption";
      else headerType = "fit-caption";
    } else if (path === "mfCaptionSizeMul") {
      captionSizeMul = finiteOr(parseFloatLiteral(expr), 1);
    } else if (path === "mFont.mvSize") {
      fontSize = parseFontSize(expr, height) ?? { ...defaultFontSize };
    } else if (path === "mFontAlign") {
      fontAlign = parseAlign(expr) ?? "left";
    } else if (/^mfPadding(?:Top|Right|Bottom|Left)$/.test(path)) {
      const value = parseFloatLiteral(expr);
      contentPadding = setInset(
        contentPadding,
        path,
        value ?? getInset(defaultContentPadding, path)
      );
    } else if (/^mfLabelPadding(?:Top|Right|Bottom|Left)$/.test(path)) {
      const value = parseFloatLiteral(expr);
      labelPadding = setInset(
        labelPadding,
        path,
        value ?? getInset(defaultLabelPadding, path)
      );
    } else if (path === "mvLabelOffset") {
      const vector = parseVector(expr);
      labelOffset = vector && vector.length >= 2
        ? { x: vector[0], y: vector[1] }
        : { x: 0, y: 0 };
    } else if (path === "mfLabelMinWidth") {
      labelMinWidth = finiteOr(parseFloatLiteral(expr), 0);
    }
  }

  contentPadding = nonNegativeInsets(contentPadding);
  labelPadding = nonNegativeInsets(labelPadding);
  captionSizeMul = Math.max(0, captionSizeMul);
  const headerHeight = useHeader
    ? Math.max(0, fontSize.y * captionSizeMul + labelPadding.top + labelPadding.bottom)
    : 0;

  return {
    useHeader,
    headerType,
    captionSizeMul,
    fontSize,
    fontAlign,
    contentPadding,
    labelPadding,
    labelOffset,
    labelMinWidth: Math.max(0, labelMinWidth),
    headerHeight
  };
}

export function resolveStationButtonMetrics(node: WidgetNode, previewHeight: number): StationButtonMetrics {
  const height = Math.max(1, previewHeight);
  const defaultFontSize: Vec2 = { x: height * 0.0625, y: height * 0.0625 };
  let fontSize: Vec2 = { ...defaultFontSize };
  let fontAlign: StationButtonMetrics["fontAlign"] = "center";
  let clipText = true;
  let clipPaddingLeft = 6;
  let clipPaddingRight = 16;
  let useFrame = true;
  let useBackgroundGfx = false;

  for (const override of node.overrides) {
    if (override.kind !== "expr") continue;
    const { path, expr } = override;
    if (path === "mFont.mvSize") fontSize = parseFontSize(expr, height) ?? { ...defaultFontSize };
    else if (path === "mFontAlign") fontAlign = parseAlign(expr) ?? "center";
    else if (path === "mbClipText") clipText = parseBoolLiteral(expr) ?? true;
    else if (path === "mfClipAreaPaddingLeft") {
      clipPaddingLeft = finiteOr(parseFloatLiteral(expr), 6);
    } else if (path === "mfClipAreaPaddingRight") {
      clipPaddingRight = finiteOr(parseFloatLiteral(expr), 16);
    } else if (path === "mbUseFrame") useFrame = parseBoolLiteral(expr) ?? true;
    else if (path === "mbUseBackgroundGfx") {
      useBackgroundGfx = parseBoolLiteral(expr) ?? false;
    }
  }

  return {
    fontSize,
    fontAlign,
    clipText,
    clipPaddingLeft: Math.max(0, clipPaddingLeft),
    clipPaddingRight: Math.max(0, clipPaddingRight),
    useFrame,
    useBackgroundGfx
  };
}

/** Mirrors StationGui's resolution-dependent small/big frame selection. */
export function stationFrameSize(previewHeight: number): StationFrameSize {
  return Math.max(1, previewHeight) * 0.083334 < 64 ? "small" : "big";
}

/** Convert a station window's outer rect into the coordinate frame used by its children. */
export function stationWindowChildFrame<T extends { x: number; y: number; w: number; h: number }>(
  outer: T,
  metrics: StationWindowMetrics
): T {
  const padding = metrics.contentPadding;
  return {
    ...outer,
    x: outer.x + padding.left,
    y: outer.y + metrics.headerHeight + padding.top,
    w: Math.max(1, outer.w - padding.left - padding.right),
    h: Math.max(1, outer.h - metrics.headerHeight - padding.top - padding.bottom)
  };
}
