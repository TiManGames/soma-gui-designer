import type { WidgetType } from "../model/nodes";
import { getFrameGfxDefaults } from "../model/frameDefaults";
import type { Value } from "./expressions";

// Shipped helper_imgui_station_basics.hps and base/GuiHandler.hps.
export const NORMAL = [0.227, 0.51, 0.557, 1];
export const HIGHLIGHT = [0.576, 0.612, 0.184, 1];
export const WARNING = [0.706, 0.208, 0.082, 1];
export const FRAME_SLOTS = ["mGfxCornerTopLeft", "mGfxBorderTop", "mGfxCornerTopRight", "mGfxBorderLeft", "mGfxBackground", "mGfxBorderRight", "mGfxCornerBottomLeft", "mGfxBorderBottom", "mGfxCornerBottomRight"] as const;

export function widgetDefaults(type: WidgetType, height: number): Record<string, Value> {
  const p: Record<string, Value> = {
    mColorBase: [1, 1, 1, 1], mColorText: [1, 1, 1, 1], mColorDisabled: [0.7, 0.7, 0.7, 0.8],
    // Empty font file falls back to GuiHandler's default face. The widget's
    // cImGuiFont still keeps its native constructor size of 16 pixels.
    mbUseDisabledColor: true, "mFont.file": "", "mFont.mvSize": [16, 16],
    "mFont.mColor": [1, 1, 1, 1], "mFont.mMaterial": "eGuiMaterial_FontNormal", mFontAlign: "eFontAlign_Left",
    mbUseBackgroundGfx: true
  };
  if (["station-button", "station-toggle-button", "repeat-button", "multi-toggle"].includes(type)) Object.assign(p, {
    mColorBase: NORMAL, mColorInFocus: HIGHLIGHT, mColorTriggered: WARNING,
    mColorTriggeredAndInFocus: [0.9, 0.6, 0.1, 1], mColorDisabled: [0.192, 0.192, 0.192, 1],
    mbUseInFocusColor: true, mbUseTriggeredColor: true, mbUseTriggeredAndInFocusColor: type === "station-toggle-button",
    mbUseInFocusGfx: false, mbUseTriggeredGfx: false, mbUseBackgroundGfx: false, mbUseFrame: true,
    "mGfxFrame.mGfxBackground.mColor": [1, 1, 1, 0.7],
    "mFont.file": "sansation_large_additive.fnt", "mFont.mvSize": [height * 0.0625, height * 0.0625],
    "mFont.mMaterial": "eGuiMaterial_Additive", mFontAlign: "eFontAlign_Center", mbClipText: true,
    mfClipAreaPaddingLeft: 6, mfClipAreaPaddingRight: 16, mfScrollSpeed: 32, mfScrollResetDelay: 1, mfScrollStartDelay: 1
  });
  if (type === "station-window") Object.assign(p, {
    mColorBase: NORMAL, mbUseHeader: true, mHeaderType: "eImGuiWindowHeader_FitCaption", mfCaptionSizeMul: 1,
    "mGfxWindowData.mGfxBackground.mColor": [0, 0, 0, 0.75],
    "mFont.file": "sansation_large_additive.fnt", "mFont.mvSize": [height * 0.047, height * 0.047],
    "mFont.mMaterial": "eGuiMaterial_Additive", mfLabelPaddingTop: 0, mfLabelPaddingRight: 15,
    mfLabelPaddingBottom: 0, mfLabelPaddingLeft: 10
  });
  if (type === "gauge") {
    Object.assign(p, { mbUseFrame: true, mvPadding: [2, 2], mOrientation: "eImGuiGaugeOrientation_Hori", mbUseFillUV: false, "mGfxFrame.mGfxBackground.mColor": [0, 0, 0, 0] });
    for (const slot of FRAME_SLOTS) if (slot.includes("Corner")) p[`mGfxFrame.${slot}.mColor`] = NORMAL;
    else if (slot.includes("Border")) p[`mGfxFrame.${slot}.mColor`] = [0, 0, 0, 0];
  }
  if (type === "text-frame") Object.assign(p, { mbUseBackgroundGfx: false, "mFont.mvSize": [height * 0.035, height * 0.035], mColorText: NORMAL });
  if (type === "slider-h" || type === "slider-v") {
    const vertical = type === "slider-v";
    Object.assign(p, { "mGfxBackground.file": `default/imgui_slider_base${vertical ? "_vert" : ""}.tga`, "mGfxBaseInFocus.file": `default/imgui_slider_base${vertical ? "_vert" : ""}_infocus.tga`,
      "mGfxBaseInFocus.mMaterial": "eGuiMaterial_Additive", "mGfxButton.file": "default/imgui_slider_button.tga", mvButtonSize: [20, 20],
      mbUseBaseInFocusGfx: true, mbUseButtonInFocusGfx: true, mbUseButtonTriggeredGfx: true,
      "mGfxButtonInFocus.file": "default/imgui_slider_button_infocus.tga", "mGfxButtonInFocus.mMaterial": "eGuiMaterial_Additive", "mGfxButtonInFocus.mColor": [0.4, 0.4, 0.4, 1],
      "mGfxButtonTriggered.file": "default/imgui_slider_button_infocus.tga", "mGfxButtonTriggered.mMaterial": "eGuiMaterial_Additive", "mGfxButtonTriggered.mColor": [0.6, 0, 0, 1]
    });
  }
  if (type === "checkbox") Object.assign(p, {
    mbUseBackgroundGfx: false, mvBoxSize: [20, 20], mvCheckOverlaySize: [20, 20],
    "mGfxBox.file": "default/imgui_checkbox.tga", "mGfxCheckOverlay.file": "default/imgui_checkbox_check.tga", "mGfxCheckOverlay.mColor": [1, 0.5, 0.5, 1],
    mbUseBoxInFocusGfx: true, "mGfxBoxInFocus.file": "default/imgui_checkbox_infocus.tga", "mGfxBoxInFocus.mMaterial": "eGuiMaterial_Additive", "mGfxBoxInFocus.mColor": [0.4, 0.4, 0.4, 1]
  });
  if (type === "multi-select") {
    Object.assign(p, { mvArrowSize: [20, 20], mbUseArrowInFocusGfx: true, mbUseBackgroundInFocusGfx: true, "mGfxBackgroundInFocus.file": "default/imgui_text_infocus.tga", "mGfxBackgroundInFocus.mMaterial": "eGuiMaterial_Additive", "mGfxBackgroundInFocus.mColor": [0.3, 0.3, 0.3, 1] });
    for (const side of ["Left", "Right"]) for (const focus of ["", "InFocus"]) {
      p[`mGfxArrow${side}${focus}.file`] = `default/imgui_arrow_${side.toLowerCase()}${focus ? "_infocus" : ""}.tga`;
      if (focus) p[`mGfxArrow${side}${focus}.mMaterial`] = "eGuiMaterial_Additive";
    }
  }
  // Plain frames use the native two-pixel solid frame, not station button art.
  if (type === "frame") p["mFrameGfx.mGfxBackground.mColor"] = [1, 1, 1, 1];
  if (type !== "frame") for (const [path, file] of Object.entries(getFrameGfxDefaults(type, height))) p[path + ".file"] = file;
  return p;
}
