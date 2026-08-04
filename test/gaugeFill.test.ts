import { describe, expect, it } from "vitest";
import { gaugeFillAmount, gaugeFillExpr } from "../src/core/model/gaugeFill";

describe("gauge fill values", () => {
  it("accepts editor values and legacy HPS literals", () => {
    expect(gaugeFillAmount("0.65")).toBe(0.65);
    expect(gaugeFillAmount("0.65f")).toBe(0.65);
  });

  it("clamps the preview and generated expression to the gauge range", () => {
    expect(gaugeFillAmount("-1")).toBe(0);
    expect(gaugeFillAmount("2")).toBe(1);
    expect(gaugeFillExpr("2")).toBe("1.0f");
  });

  it("emits normalized AngelScript float syntax", () => {
    expect(gaugeFillExpr("0.65")).toBe("0.65f");
    expect(gaugeFillExpr("0")).toBe("0.0f");
    expect(gaugeFillExpr(0.5)).toBe("0.5f");
    expect(gaugeFillExpr("not-a-number")).toBe("0.5f");
  });
});
