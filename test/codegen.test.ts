import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { makeNode } from "../src/core/model/defaults";
import { generateHps } from "../src/core/codegen/generateHps";
import type { SomaDocument } from "../src/core/model/document";

function fixture(name: string): string {
  const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
  // Normalize any trailing newline so comparisons are stable across editors.
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").replace(/\n$/, "");
}

describe("generateHps parity", () => {
  it("reproduces the prototype output for the default document", () => {
    const doc = createDefaultDocument();
    expect(generateHps(doc)).toBe(fixture("default-doc.hps"));
  });

  it("matches the README worked example structure", () => {
    const hps = generateHps(createDefaultDocument());
    // Structural anchors from README.md:23-67.
    expect(hps).toContain('void DrawGeneratedCustomScreen(const tString&in asEntityName, float afTimeStep)');
    expect(hps).toContain('ImGui_SetTransCategory("GeneratedTerminal");');
    expect(hps).toContain("cImGuiWindowData mainWindowData = StationGui_CreateDefaultWindowData();");
    expect(hps).toContain("StationGui_DoWindowStart(");
    expect(hps).toContain("StationGui_DoWindowEnd();");
    expect(hps).toContain("// TODO: ConfirmButton pressed");
  });
});

describe("generateHps widget coverage", () => {
  function docWith(nodes: SomaDocument["nodes"]): SomaDocument {
    return {
      schemaVersion: 4,
      target: "terminal-on-gui",
      functionName: "Screen",
      translationCategory: "Cat",
      previewResolution: { x: 1280, y: 800 },
      resolutionPreset: "1280x800",
      gridSize: 10,
      snapToGrid: true,
      nodes
    };
  }

  it("emits a group with group-relative coords for children", () => {
    const hps = generateHps(
      docWith([
        makeNode("group", "G1", { parentId: "screen", xN: 0.1, yN: 0.1, wN: 0.5, hN: 0.5, z: 1 }),
        makeNode("label", "L1", { parentId: "G1", xN: 0.2, yN: 0.2, wN: 0.4, hN: 0.08, z: 1 })
      ])
    );
    expect(hps).toContain("ImGui_GroupBegin(ImGui_NrmPos(cVector3f(0.1, 0.1, 1)), ImGui_NrmSize(cVector2f(0.5, 0.5)));");
    expect(hps).toContain('ImGui_DoLabel("LabelText", ImGui_NrmPosGroup(cVector3f(0.2, 0.2, 1)), ImGui_NrmSizeGroup(cVector2f(0.4, 0.08)), 1.0f);');
    expect(hps).toContain("ImGui_GroupEnd();");
  });

  it("emits a toggle button with state persistence", () => {
    const hps = generateHps(
      docWith([makeNode("station-toggle-button", "Tog", { parentId: "screen" })])
    );
    expect(hps).toContain('bool bTog = ImGui_DoToggleButtonExt("Tog", "Toggle", ImGui_GetStateBool("Tog_Checked", false)');
    expect(hps).toContain('ImGui_SetStateBool("Tog_Checked", bTog);');
  });

  it("emits a numpad helper block", () => {
    const hps = generateHps(docWith([makeNode("station-numpad", "Pad", { parentId: "screen" })]));
    expect(hps).toContain('if (StationGui_Numpad("EnterCode", 4, 0.2f,');
    expect(hps).toContain("tString sInput = StationGui_GetNumpadInput();");
  });

  it("applies structured overrides to the data variable", () => {
    const node = makeNode("station-button", "Btn", { parentId: "screen" });
    node.overrides = [
      { kind: "expr", path: "mColorBase", expr: "gStationGuiColor_Warning" },
      { kind: "call", call: "SetPadding(20,20,20,20)" }
    ];
    const hps = generateHps(docWith([node]));
    expect(hps).toContain("btnData.mColorBase = gStationGuiColor_Warning;");
    expect(hps).toContain("btnData.SetPadding(20,20,20,20);");
  });

  it("uses the map-on-gui header for that target", () => {
    const doc = docWith([]);
    doc.target = "map-on-gui";
    doc.functionName = "OnGui";
    expect(generateHps(doc)).toContain("void OnGui(float afTimeStep)");
  });
});
