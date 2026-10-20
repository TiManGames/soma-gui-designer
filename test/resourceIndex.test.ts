import { describe, expect, it } from "vitest";
import { findResource } from "../src/core/preview/resourceIndex";

describe("game resource lookup", () => {
  const entries = [
    { key: "imgui/station/stationv2/window/small_border_top.tga", isMod: false },
    { key: "imgui/stationv2/window/small_border_top.tga", isMod: true },
    { key: "tex/image.png", isMod: false }, { key: "tex/image.tga", isMod: true },
    { key: "@font/font.fnt", isMod: false }, { key: "@font/font.fnt", isMod: true }
  ];
  it("prefers mod suffix matches even when folder layouts differ", () => expect(findResource(entries, '"STATIONV2/window/small_border_top"')?.isMod).toBe(true));
  it("respects an explicit extension, retaining same-stem alternatives", () => {
    expect(findResource(entries, "tex/image.png")?.key).toBe("tex/image.png");
    expect(findResource(entries, "tex/image")?.key).toBe("tex/image.tga");
  });
  it("keeps font lookup in its own namespace and rejects traversal", () => {
    expect(findResource(entries, "@font/font.fnt")?.isMod).toBe(true);
    expect(findResource(entries, "font.fnt")).toBeUndefined();
    expect(findResource(entries, "../tex/image")).toBeUndefined();
  });
});
