import { describe, expect, it } from "vitest";
import { canvasScale, scaledCanvasSize } from "../src/core/model/canvasScale";

describe("canvas scale", () => {
  it("does not upscale a preview that fits", () => {
    expect(canvasScale({ x: 640, y: 480 })).toBe(1);
    expect(scaledCanvasSize({ x: 640, y: 480 })).toEqual({ x: 640, y: 480 });
  });

  it("preserves the configured aspect ratio when fitting a wide preview", () => {
    const logical = { x: 1600, y: 900 };
    const display = scaledCanvasSize(logical);
    expect(display.x).toBeCloseTo(980, 10);
    expect(display.x / display.y).toBeCloseTo(logical.x / logical.y, 10);
  });
});
