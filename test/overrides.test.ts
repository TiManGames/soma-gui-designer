import { describe, it, expect } from "vitest";
import { getParam } from "../src/core/model/overrides";
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
