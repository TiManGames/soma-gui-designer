import { describe, it, expect } from "vitest";
import {
  colorExpr,
  floatExpr,
  hexToRgb,
  parseColorExpr,
  parseFloatExpr,
  rgbaToHex,
  parseVec,
  parseSizeKeepRatio
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

  it("accepts signed decimals and scientific notation without accepting formulas", () => {
    expect(parseFloatExpr("+1.25e-3f")).toBe(0.00125);
    expect(parseFloatExpr("-.5F")).toBe(-0.5);
    for (const value of ["", "1.0f + offset", "1junk", "1f2", "Infinity", "NaN"]) expect(parseFloatExpr(value)).toBeNull();
    expect(floatExpr(1e-7)).toBe("1.0e-7f");
  });
});

describe("compound literals", () => {
  it("requires full constructors, numeric components, and correct arity", () => {
    expect(parseVec("cVector2f(0.25f)")).toEqual([0.25, 0.25]);
    expect(parseVec("cVector3f(1,2,3)")).toEqual([1, 2, 3]);
    for (const expr of ["cVector2f(1,2) * 2", "cVector2f(1 + offset,2)", "cVector2f(1,2,3)", "cVector3f(1,2)"]) expect(parseVec(expr)).toBeNull();
    for (const expr of ["cColor(1,1,1) * fade", "cColor(1 + offset,0,0)", "cColor(1,2,3,4,5)"]) expect(parseColorExpr(expr, [])).toBeNull();
    expect(parseSizeKeepRatio("ImGui_NrmSizeKeepRatio(0.02f) * scale")).toBeNull();
    expect(parseSizeKeepRatio("ImGui_NrmSizeKeepRatio(0.02f + offset)")).toBeNull();
    expect(parseSizeKeepRatio("ImGui_NrmSizeKeepRatio(2e-2f)")).toBe(0.02);
  });
});
