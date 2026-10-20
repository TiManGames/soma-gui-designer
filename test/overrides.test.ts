import { describe, it, expect } from "vitest";
import { getParam, getFileParam, getGfxFieldValue, clearFieldOverride, setFieldExpression } from "../src/core/model/overrides";
import { parseGfxLiteral, parseStringLiteral, stringLiteral } from "../src/core/model/literals";
import type { Override } from "../src/core/model/nodes";

describe("getParam", () => {
  const overrides: Override[] = [
    { kind: "expr", path: "zDepth", expr: "10.0f" },
    { kind: "expr", path: "color", expr: "cColor(1.0f, 0.5f, 0.0f, 1.0f)" },
    { kind: "call", call: "SetPadding(1,1,1,1)" }
  ];

  it("returns the expr for a present path", () => {
    expect(getParam(overrides, "zDepth", "0.0f")).toBe("10.0f");
    expect(getParam(overrides, "color", "cColor_White")).toBe("cColor(1.0f, 0.5f, 0.0f, 1.0f)");
  });

  it("falls back to the default for a missing path", () => {
    expect(getParam(overrides, "relSize", "0.5f")).toBe("0.5f");
  });

  it("ignores call-kind overrides", () => {
    expect(getParam([{ kind: "call", call: "Foo()" }], "Foo", "def")).toBe("def");
  });

  it("handles an empty overrides array", () => {
    expect(getParam([], "anything", "fallback")).toBe("fallback");
  });
});

describe("graphics overrides", () => {
  it("reads the last assignment or file call, including empty paths and escaped strings", () => {
    const path = 'station/with "quotes"';
    const overrides: Override[] = [
      { kind: "expr", path: "mGfxBackground", expr: 'cImGuiGfx("old")' },
      { kind: "call", call: `mGfxBackground.SetFile(${stringLiteral(path)})` }
    ];
    expect(getFileParam(overrides, "mGfxBackground", "default")).toBe(path);
    expect(parseGfxLiteral(getGfxFieldValue(overrides, "mGfxBackground")!)).toBe(path);
    expect(parseStringLiteral(stringLiteral('Line 1\nLine 2\\'))).toBe('Line 1\nLine 2\\');
    expect(parseStringLiteral("'station/single-quoted'")).toBe("station/single-quoted");
    expect(parseStringLiteral("'Header \"quoted\"'")).toBe('Header "quoted"');
    expect(parseStringLiteral('"folder/" + "file"')).toBeNull();
    expect(getFileParam([{ kind: "call", call: 'mGfxBackground.SetFile("")' }], "mGfxBackground", "default")).toBe("");
  });

  it("replaces both stored forms and clears them to reveal inherited defaults", () => {
    const original: Override[] = [
      { kind: "expr", path: "mGfxFrame.mGfxBorderTop", expr: 'cImGuiGfx("old")' },
      { kind: "call", call: 'mGfxFrame.mGfxBorderTop.SetFile("newer")' },
      { kind: "expr", path: "mColorBase", expr: "cColor_White" }
    ];
    const next = setFieldExpression(original, "mGfxFrame.mGfxBorderTop", 'cImGuiGfx("picked")', true);
    expect(next).toHaveLength(2);
    expect(getFileParam(next, "mGfxFrame.mGfxBorderTop", "default")).toBe("picked");
    expect(clearFieldOverride(next, "mGfxFrame.mGfxBorderTop")).toEqual([original[2]]);
    expect(getFileParam(clearFieldOverride(next, "mGfxFrame.mGfxBorderTop"), "mGfxFrame.mGfxBorderTop", "default")).toBe("default");
    expect(original).toHaveLength(3);
  });

  it("does not misread texture formulas as literal file names", () => {
    expect(parseGfxLiteral('cImGuiGfx("folder/" + GetName())')).toBeNull();
    const overrides: Override[] = [{ kind: "call", call: "mGfxBackground.SetFile(GetFile())" }];
    expect(getGfxFieldValue(overrides, "mGfxBackground")).toBe("cImGuiGfx(GetFile())");
    expect(getFileParam(overrides, "mGfxBackground", "default")).toBe("default");
  });
});
