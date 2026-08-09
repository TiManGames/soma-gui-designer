import { describe, expect, it } from "vitest";
import { makeNode } from "../src/core/model/defaults";
import { getFrameGfxDefaults } from "../src/core/model/frameDefaults";
import {
  resolveStationButtonMetrics,
  resolveStationWindowMetrics,
  stationFrameSize,
  stationWindowChildFrame
} from "../src/core/model/stationMetrics";

describe("station window metrics", () => {
  it("derives default header metrics from the current virtual height", () => {
    const node = makeNode("station-window", "Window");
    const metrics = resolveStationWindowMetrics(node, 900);

    expect(metrics.fontSize.y).toBeCloseTo(900 * 0.047);
    expect(metrics.headerHeight).toBeCloseTo(900 * 0.047);
    expect(metrics.labelPadding).toEqual({ top: 0, right: 15, bottom: 0, left: 10 });
  });

  it("honors header visibility, caption multiplier, label padding, offset, and alignment", () => {
    const node = makeNode("station-window", "Window", {
      overrides: [
        { kind: "expr", path: "mFont.mvSize", expr: "ImGui_NrmSizeKeepRatio(0.05f)" },
        { kind: "expr", path: "mfCaptionSizeMul", expr: "1.5f" },
        { kind: "call", call: "SetLabelPadding(2, 3, 4, 5)" },
        { kind: "expr", path: "mvLabelOffset", expr: "cVector3f(7, 8, 0)" },
        { kind: "expr", path: "mFontAlign", expr: "eFontAlign_Right" },
        { kind: "expr", path: "mHeaderType", expr: "eImGuiWindowHeader_Full" }
      ]
    });
    const metrics = resolveStationWindowMetrics(node, 600);

    expect(metrics.headerHeight).toBeCloseTo(30 * 1.5 + 2 + 4);
    expect(metrics.labelOffset).toEqual({ x: 7, y: 8 });
    expect(metrics.fontAlign).toBe("right");
    expect(metrics.headerType).toBe("full");

    node.overrides.push({ kind: "expr", path: "mbUseHeader", expr: "false" });
    expect(resolveStationWindowMetrics(node, 600).headerHeight).toBe(0);
  });

  it("applies padding fields and method calls in emitted order", () => {
    const node = makeNode("station-window", "Window", {
      overrides: [
        { kind: "expr", path: "mfPaddingTop", expr: "4.0f" },
        { kind: "call", call: "SetPadding(10, 20, 30, 40)" },
        { kind: "expr", path: "mfPaddingLeft", expr: "8.0f" }
      ]
    });
    const metrics = resolveStationWindowMetrics(node, 720);

    expect(metrics.contentPadding).toEqual({ top: 10, right: 20, bottom: 30, left: 8 });
    expect(stationWindowChildFrame({ x: 100, y: 50, w: 500, h: 300 }, metrics)).toEqual({
      x: 108,
      y: 50 + metrics.headerHeight + 10,
      w: 472,
      h: 260
    });
  });

  it("falls back to factory values for expressions the preview cannot evaluate", () => {
    const node = makeNode("station-window", "Window", {
      overrides: [
        { kind: "expr", path: "mfPaddingTop", expr: "12.0f" },
        { kind: "expr", path: "mFont.mvSize", expr: "30.0f" },
        { kind: "expr", path: "mfPaddingTop", expr: "GetDynamicPadding()" },
        { kind: "expr", path: "mFont.mvSize", expr: "GetDynamicFontSize()" }
      ]
    });
    const metrics = resolveStationWindowMetrics(node, 640);
    expect(metrics.contentPadding.top).toBe(0);
    expect(metrics.fontSize.y).toBeCloseTo(640 * 0.047);
  });
});

describe("station button metrics", () => {
  it("resolves height-relative font size and literal presentation overrides", () => {
    const node = makeNode("station-button", "Button", {
      overrides: [
        { kind: "expr", path: "mFont.mvSize", expr: "ImGui_NrmSizeKeepRatio(cVector2f(0.04f, 0.06f))" },
        { kind: "expr", path: "mFontAlign", expr: "eFontAlign_Left" },
        { kind: "expr", path: "mbClipText", expr: "false" },
        { kind: "expr", path: "mbUseFrame", expr: "false" }
      ]
    });
    const metrics = resolveStationButtonMetrics(node, 500);
    expect(metrics.fontSize).toEqual({ x: 20, y: 30 });
    expect(metrics.fontAlign).toBe("left");
    expect(metrics.clipText).toBe(false);
    expect(metrics.useFrame).toBe(false);
  });

  it("accepts a literal scalar font size", () => {
    const node = makeNode("station-button", "Button", {
      overrides: [{ kind: "expr", path: "mFont.mvSize", expr: "24.0f" }]
    });
    expect(resolveStationButtonMetrics(node, 500).fontSize).toEqual({ x: 24, y: 24 });
  });
});

describe("resolution-derived station frame defaults", () => {
  it("mirrors the helper threshold for arbitrary virtual heights", () => {
    expect(stationFrameSize(600)).toBe("small");
    expect(stationFrameSize(900)).toBe("big");
    expect(getFrameGfxDefaults("station-button", 600)["mGfxFrame.mGfxBorderTop"])
      .toBe("stationV2/button/small_border_top");
    expect(getFrameGfxDefaults("station-window", 900)["mGfxWindowData.mGfxBorderTop"])
      .toBe("stationV2/window/big_border_top");
  });
});
