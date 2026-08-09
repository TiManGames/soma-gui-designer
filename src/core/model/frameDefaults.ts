import type { WidgetType } from "./nodes";
import { stationFrameSize } from "./stationMetrics";

/**
 * Per-widget-type factory defaults for cImGuiFrameGfx sub-fields.
 * Keys are the dotted override paths (e.g. "mGfxFrame.mGfxCornerTopLeft").
 * Values are the file strings the default factory would call SetFile() with.
 * Mirrors what helper_imgui_station_basics.hps sets for each widget type.
 */
export const FRAME_GFX_DEFAULTS: Partial<Record<WidgetType, Record<string, string>>> = {
  "frame": {
    "mFrameGfx.mGfxCornerTopLeft":     "stationV2/button/small_corner_topleft",
    "mFrameGfx.mGfxCornerTopRight":    "stationV2/button/small_corner_topright",
    "mFrameGfx.mGfxCornerBottomLeft":  "stationV2/button/small_corner_bottomleft",
    "mFrameGfx.mGfxCornerBottomRight": "stationV2/button/small_corner_bottomright",
    "mFrameGfx.mGfxBorderTop":         "stationV2/button/small_border_top",
    "mFrameGfx.mGfxBorderRight":       "stationV2/button/small_border_right",
    "mFrameGfx.mGfxBorderBottom":      "stationV2/button/small_border_bottom",
    "mFrameGfx.mGfxBorderLeft":        "stationV2/button/small_border_left",
  },
  // Gauge uses bar/ corners only — borders are color-transparent in the factory.
  "gauge": {
    "mGfxFrame.mGfxCornerTopLeft":     "station/bar/small_framing_upper_left",
    "mGfxFrame.mGfxCornerTopRight":    "station/bar/small_framing_upper_right",
    "mGfxFrame.mGfxCornerBottomLeft":  "station/bar/small_framing_lower_left",
    "mGfxFrame.mGfxCornerBottomRight": "station/bar/small_framing_lower_right",
  },
};

const STATION_BUTTON_TYPES = new Set<WidgetType>([
  "station-button", "station-toggle-button", "repeat-button", "multi-toggle"
]);

function stationWindowDefaults(previewHeight: number): Record<string, string> {
  const size = stationFrameSize(previewHeight);
  const root = `stationV2/window/${size}`;
  return {
    "mGfxWindowData.mGfxCornerTopLeft":     `${root}_corner_topleft`,
    "mGfxWindowData.mGfxCornerTopRight":    `${root}_corner_topright`,
    "mGfxWindowData.mGfxCornerBottomLeft":  `${root}_corner_bottomleft`,
    "mGfxWindowData.mGfxCornerBottomRight": `${root}_corner_bottomright`,
    "mGfxWindowData.mGfxBorderTop":         `${root}_border_top`,
    "mGfxWindowData.mGfxBorderRight":       `${root}_border_right`,
    "mGfxWindowData.mGfxBorderBottom":      `${root}_border_bottom`,
    "mGfxWindowData.mGfxBorderLeft":        `${root}_border_left`,
  };
}

function stationButtonDefaults(previewHeight: number): Record<string, string> {
  const size = stationFrameSize(previewHeight);
  const root = `stationV2/button/${size}`;
  return {
    "mGfxFrame.mGfxCornerTopLeft":     `${root}_corner_topleft`,
    "mGfxFrame.mGfxCornerTopRight":    `${root}_corner_topright`,
    "mGfxFrame.mGfxCornerBottomLeft":  `${root}_corner_bottomleft`,
    "mGfxFrame.mGfxCornerBottomRight": `${root}_corner_slanted_bottomright`,
    "mGfxFrame.mGfxBorderTop":         `${root}_border_top`,
    "mGfxFrame.mGfxBorderRight":       `${root}_border_right`,
    "mGfxFrame.mGfxBorderBottom":      `${root}_border_bottom`,
    "mGfxFrame.mGfxBorderLeft":        `${root}_border_left`,
  };
}

/** Factory defaults resolved against the current ImGui virtual height. */
export function getFrameGfxDefaults(type: WidgetType, previewHeight: number): Record<string, string> {
  if (type === "station-window") return stationWindowDefaults(previewHeight);
  if (STATION_BUTTON_TYPES.has(type)) return stationButtonDefaults(previewHeight);
  return FRAME_GFX_DEFAULTS[type] ?? {};
}

/** Default track + thumb textures for sliders (factory: StationGui_CreateDefaultSliderData). */
export const SLIDER_GFX_DEFAULTS: Record<"slider-h" | "slider-v", { track: string; thumb: string }> = {
  "slider-h": {
    track: "station/scrollbar/scrollbar_bar",
    thumb: "station/scrollbar/scrollbar_button",
  },
  "slider-v": {
    track: "station/scrollbar/scrollbar_bar_vert",
    thumb: "station/scrollbar/scrollbar_button",
  },
};

/** Default unchecked texture for checkbox (engine default, no station factory). */
export const CHECKBOX_GFX_DEFAULT = "default/imgui_checkbox";
