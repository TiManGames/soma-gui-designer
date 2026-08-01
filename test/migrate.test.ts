import { describe, it, expect } from "vitest";
import { migrateToV4, parseSettingsText } from "../src/core/model/migrate";
import { generateHps } from "../src/core/codegen/generateHps";

describe("parseSettingsText", () => {
  it("parses expr and call lines like the prototype", () => {
    const overrides = parseSettingsText(
      "mColorBase=gStationGuiColor_Warning\nSetPadding(20,20,20,20)\n// comment\n\nmFont.mvSize=ImGui_NrmSizeKeepRatio(0.035f)"
    );
    expect(overrides).toEqual([
      { kind: "expr", path: "mColorBase", expr: "gStationGuiColor_Warning" },
      { kind: "call", call: "SetPadding(20,20,20,20)" },
      { kind: "expr", path: "mFont.mvSize", expr: "ImGui_NrmSizeKeepRatio(0.035f)" }
    ]);
  });
});

describe("migrateToV4", () => {
  const legacy = {
    schemaVersion: 3,
    target: "terminal-on-gui",
    functionName: "OldScreen",
    translationCategory: "OldCat",
    previewResolution: { x: 1920, y: 1080 },
    resolutionPreset: "1920x1080",
    gridSize: 10,
    snapToGrid: true,
    blocks: [
      {
        id: "Win",
        type: "station-window",
        parentId: "screen",
        xN: 0.1,
        yN: 0.1,
        wN: 0.8,
        hN: 0.7,
        z: 1,
        caption: "Hello",
        settingsText: "mColorBase=gStationGuiColor_Warning"
      },
      {
        id: "Img",
        type: "image",
        parentId: "Win",
        xN: 0.05,
        yN: 0.1,
        wN: 0.3,
        hN: 0.4,
        z: 1,
        arg: "slide1"
      }
    ]
  };

  it("migrates a v3 document to v4 with typed fields and structured overrides", () => {
    const doc = migrateToV4(legacy)!;
    expect(doc.schemaVersion).toBe(4);
    expect(doc.functionName).toBe("OldScreen");
    expect(doc.nodes).toHaveLength(2);

    const win = doc.nodes.find((n) => n.id === "Win")!;
    expect(win.type).toBe("station-window");
    expect(win.overrides).toEqual([
      { kind: "expr", path: "mColorBase", expr: "gStationGuiColor_Warning" }
    ]);

    const img = doc.nodes.find((n) => n.id === "Img")!;
    // legacy `arg` maps to typed `gfx`
    expect(img.type === "image" && img.gfx).toBe("slide1");
  });

  it("migrated document generates valid HPS with the override applied", () => {
    const doc = migrateToV4(legacy)!;
    const hps = generateHps(doc);
    expect(hps).toContain("winData.mColorBase = gStationGuiColor_Warning;");
    expect(hps).toContain('ImGui_DoImage(cImGuiGfx("slide1")');
  });

  it("passes a v4 document through unchanged", () => {
    const v4 = { schemaVersion: 4, nodes: [], target: "map-on-gui" };
    expect(migrateToV4(v4)?.schemaVersion).toBe(4);
  });

  it("returns null for non-documents", () => {
    expect(migrateToV4(null)).toBeNull();
    expect(migrateToV4({ foo: "bar" })).toBeNull();
  });
});
