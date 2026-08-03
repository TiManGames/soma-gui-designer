import { describe, it, expect } from "vitest";
import {
  colorExpr,
  floatExpr,
  hexToRgb,
  parseColorExpr,
  parseFloatExpr,
  rgbaToHex
} from "../src/ui/components/Properties/exprHelpers";
import { paletteColors } from "../src/core/schema/loadSchema";

describe("color expressions", () => {
  it("parses a literal cColor", () => {
    expect(parseColorExpr("cColor(0.5f, 0.25f, 0.1f, 1.0f)", [])).toEqual({
      r: 0.5,
      g: 0.25,
      b: 0.1,
      a: 1
    });
  });

  it("resolves a named palette color", () => {
    const warn = paletteColors.find((c) => c.name === "gStationGuiColor_Warning")!;
    const parsed = parseColorExpr("gStationGuiColor_Warning", paletteColors)!;
    expect(parsed.r).toBeCloseTo(warn.r, 4);
  });

  it("returns null for non-color expressions", () => {
    expect(parseColorExpr("someFunc()", [])).toBeNull();
  });

  it("round-trips rgba through cColor expr", () => {
    const c = { r: 0.2, g: 0.4, b: 0.6, a: 0.8 };
    const parsed = parseColorExpr(colorExpr(c), []);
    expect(parsed!.r).toBeCloseTo(0.2, 3);
    expect(parsed!.a).toBeCloseTo(0.8, 3);
  });

  it("converts rgb <-> hex", () => {
    expect(rgbaToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe("#ff0000");
    const rgb = hexToRgb("#00ff00");
    expect(rgb.g).toBeCloseTo(1, 2);
  });
});

describe("float expressions", () => {
  it("parses and formats float exprs", () => {
    expect(parseFloatExpr("0.5f")).toBe(0.5);
    expect(parseFloatExpr("2")).toBe(2);
    expect(floatExpr(0.35)).toBe("0.35f");
  });

  it("returns null for non-numeric exprs", () => {
    expect(parseFloatExpr("ImGui_NrmSizeKeepRatio(0.035f)")).toBeNull();
  });
});
