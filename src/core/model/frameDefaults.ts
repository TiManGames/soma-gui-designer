import type { WidgetType } from "./nodes";

/**
 * Per-widget-type factory defaults for cImGuiFrameGfx sub-fields.
 * Keys are the dotted override paths (e.g. "mGfxFrame.mGfxCornerTopLeft").
 * Values are the file strings the default factory would call SetFile() with.
 * Mirrors what helper_imgui_station_basics.hps sets for each widget type.
 */
export const FRAME_GFX_DEFAULTS: Partial<Record<WidgetType, Record<string, string>>> = {
  "station-window": {
    "mGfxWindowData.mGfxCornerTopLeft":     "stationV2/window/small_corner_topleft",
    "mGfxWindowData.mGfxCornerTopRight":    "stationV2/window/small_corner_topright",
    "mGfxWindowData.mGfxCornerBottomLeft":  "stationV2/window/small_corner_bottomleft",
    "mGfxWindowData.mGfxCornerBottomRight": "stationV2/window/small_corner_bottomright",
    "mGfxWindowData.mGfxBorderTop":         "stationV2/window/small_border_top",
    "mGfxWindowData.mGfxBorderRight":       "stationV2/window/small_border_right",
    "mGfxWindowData.mGfxBorderBottom":      "stationV2/window/small_border_bottom",
    "mGfxWindowData.mGfxBorderLeft":        "stationV2/window/small_border_left",
  },
  "station-button": {
    "mGfxFrame.mGfxCornerTopLeft":     "stationV2/button/small_corner_topleft",
    "mGfxFrame.mGfxCornerTopRight":    "stationV2/button/small_corner_topright",
    "mGfxFrame.mGfxCornerBottomLeft":  "stationV2/button/small_corner_bottomleft",
    "mGfxFrame.mGfxCornerBottomRight": "stationV2/button/small_corner_slanted_bottomright",
    "mGfxFrame.mGfxBorderTop":         "stationV2/button/small_border_top",
    "mGfxFrame.mGfxBorderRight":       "stationV2/button/small_border_right",
    "mGfxFrame.mGfxBorderBottom":      "stationV2/button/small_border_bottom",
    "mGfxFrame.mGfxBorderLeft":        "stationV2/button/small_border_left",
  },
  "station-toggle-button": {
    "mGfxFrame.mGfxCornerTopLeft":     "stationV2/button/small_corner_topleft",
    "mGfxFrame.mGfxCornerTopRight":    "stationV2/button/small_corner_topright",
    "mGfxFrame.mGfxCornerBottomLeft":  "stationV2/button/small_corner_bottomleft",
    "mGfxFrame.mGfxCornerBottomRight": "stationV2/button/small_corner_slanted_bottomright",
    "mGfxFrame.mGfxBorderTop":         "stationV2/button/small_border_top",
    "mGfxFrame.mGfxBorderRight":       "stationV2/button/small_border_right",
    "mGfxFrame.mGfxBorderBottom":      "stationV2/button/small_border_bottom",
    "mGfxFrame.mGfxBorderLeft":        "stationV2/button/small_border_left",
  },
  "repeat-button": {
    "mGfxFrame.mGfxCornerTopLeft":     "stationV2/button/small_corner_topleft",
    "mGfxFrame.mGfxCornerTopRight":    "stationV2/button/small_corner_topright",
    "mGfxFrame.mGfxCornerBottomLeft":  "stationV2/button/small_corner_bottomleft",
    "mGfxFrame.mGfxCornerBottomRight": "stationV2/button/small_corner_slanted_bottomright",
    "mGfxFrame.mGfxBorderTop":         "stationV2/button/small_border_top",
    "mGfxFrame.mGfxBorderRight":       "stationV2/button/small_border_right",
    "mGfxFrame.mGfxBorderBottom":      "stationV2/button/small_border_bottom",
    "mGfxFrame.mGfxBorderLeft":        "stationV2/button/small_border_left",
  },
  "multi-toggle": {
    "mGfxFrame.mGfxCornerTopLeft":     "stationV2/button/small_corner_topleft",
    "mGfxFrame.mGfxCornerTopRight":    "stationV2/button/small_corner_topright",
    "mGfxFrame.mGfxCornerBottomLeft":  "stationV2/button/small_corner_bottomleft",
    "mGfxFrame.mGfxCornerBottomRight": "stationV2/button/small_corner_slanted_bottomright",
    "mGfxFrame.mGfxBorderTop":         "stationV2/button/small_border_top",
    "mGfxFrame.mGfxBorderRight":       "stationV2/button/small_border_right",
    "mGfxFrame.mGfxBorderBottom":      "stationV2/button/small_border_bottom",
    "mGfxFrame.mGfxBorderLeft":        "stationV2/button/small_border_left",
  },
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
