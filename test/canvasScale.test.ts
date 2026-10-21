import { describe, expect, it } from "vitest";
import { canvasScale, canvasPlacement, clampZoom } from "../src/core/model/canvasScale";

describe("canvas viewport", () => {
  it("fits both dimensions with margins without upscaling", () => {
    expect(canvasScale({ x: 640, y: 480 }, { x: 1000, y: 800 })).toBe(1);
    expect(canvasScale({ x: 1600, y: 900 }, { x: 864, y: 1000 })).toBe(0.5);
    expect(canvasScale({ x: 1000, y: 1600 }, { x: 1200, y: 864 })).toBe(0.5);
  });
  it("recomputes fit as available panel space changes", () => {
    const screen = { x: 1024, y: 768 };
    const narrow = canvasScale(screen, { x: 400, y: 600 });
    const wide = canvasScale(screen, { x: 1000, y: 600 });
    expect(wide).toBeGreaterThan(narrow);
    expect(768 * wide).toBeLessThanOrEqual(536);
  });
  it("allows numeric pixel zoom independently of available space", () => {
    expect(canvasScale({ x: 1600, y: 900 }, { x: 400, y: 300 }, 2)).toBe(2);
    expect(clampZoom(0.01)).toBe(0.1);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(Number.NaN)).toBe(1);
  });
  it("centers small artboards and provides scrollable margins for large ones", () => {
    expect(canvasPlacement({ x: 640, y: 480 }, { x: 1000, y: 800 }, 1)).toMatchObject({
      left: 180, top: 160, spaceWidth: 1000, spaceHeight: 800
    });
    expect(canvasPlacement({ x: 640, y: 480 }, { x: 1000, y: 800 }, 2)).toMatchObject({
      width: 1280, height: 960, left: 32, top: 32, spaceWidth: 1344, spaceHeight: 1024
    });
  });
});
