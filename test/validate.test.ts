import { describe, it, expect } from "vitest";
import { validateDocument } from "../src/core/validate/validateDocument";
import { validateAgainstSchema } from "../src/core/validate/validateSchema";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { makeNode } from "../src/core/model/defaults";
import { findDropTarget } from "../src/core/model/hitTest";
import { generateHps } from "../src/core/codegen/generateHps";

describe("validateDocument", () => {
  it("passes the default document", () => {
    expect(validateDocument(createDefaultDocument())).toEqual([]);
  });

  it("flags an invalid function name", () => {
    const doc = createDefaultDocument();
    doc.functionName = "123 bad";
    expect(validateDocument(doc)).toContain("Function name must be a valid AngelScript identifier.");
  });

  it("flags a non-container parent", () => {
    const doc = createDefaultDocument();
    doc.nodes.push(makeNode("label", "L1", { parentId: "ConfirmButton" }));
    expect(validateDocument(doc)).toContain("L1: parent 'ConfirmButton' is not a container.");
  });

  it("flags duplicate ids", () => {
    const doc = createDefaultDocument();
    doc.nodes.push(makeNode("label", "InfoImage", { parentId: "screen" }));
    expect(validateDocument(doc)).toContain("InfoImage: duplicate element ID.");
  });

  it("flags out-of-bounds geometry", () => {
    const doc = createDefaultDocument();
    doc.nodes.push(makeNode("label", "Over", { parentId: "screen", xN: 0.8, wN: 0.5 }));
    expect(validateDocument(doc)).toContain("Over: element extends outside its parent coordinate space.");
  });
});

describe("findDropTarget", () => {
  it("targets the window when pointer is inside it", () => {
    const doc = createDefaultDocument(); // MainWindow abs: 128,80,1024,576
    const target = findDropTarget(doc, "InfoImage", { x: 640, y: 400 });
    expect(target).toBe("MainWindow");
  });

  it("falls back to screen when outside any container", () => {
    const doc = createDefaultDocument();
    const target = findDropTarget(doc, "InfoImage", { x: 5, y: 5 });
    expect(target).toBe("screen");
  });

  it("never targets itself or its descendants", () => {
    const doc = createDefaultDocument();
    // Dragging MainWindow: its own rect contains the point but must be excluded.
    const target = findDropTarget(doc, "MainWindow", { x: 640, y: 400 });
    expect(target).toBe("screen");
  });
});

describe("validateAgainstSchema", () => {
  it("passes valid overrides", () => {
    const doc = createDefaultDocument();
    const btn = doc.nodes.find((n) => n.id === "ConfirmButton")!;
    btn.overrides = [
      { kind: "expr", path: "mColorBase", expr: "gStationGuiColor_Warning" },
      { kind: "expr", path: "mFontAlign", expr: "eFontAlign_Center" }
    ];
    expect(validateAgainstSchema(doc)).toEqual([]);
  });

  it("flags an unknown field on the dataClass", () => {
    const doc = createDefaultDocument();
    const btn = doc.nodes.find((n) => n.id === "ConfirmButton")!;
    btn.overrides = [{ kind: "expr", path: "mNotAField", expr: "1" }];
    expect(validateAgainstSchema(doc)).toContain(
      "ConfirmButton: 'mNotAField' is not a field of cImGuiButtonData."
    );
  });

  it("flags an invalid enum member", () => {
    const doc = createDefaultDocument();
    const btn = doc.nodes.find((n) => n.id === "ConfirmButton")!;
    btn.overrides = [{ kind: "expr", path: "mFontAlign", expr: "eFontAlign_Nonsense" }];
    expect(validateAgainstSchema(doc)).toContain(
      "ConfirmButton: 'eFontAlign_Nonsense' is not a member of eFontAlign (mFontAlign)."
    );
  });

  it("accepts nested field paths without deep checking", () => {
    const doc = createDefaultDocument();
    const btn = doc.nodes.find((n) => n.id === "ConfirmButton")!;
    btn.overrides = [{ kind: "expr", path: "mFont.mvSize", expr: "ImGui_NrmSizeKeepRatio(0.035f)" }];
    expect(validateAgainstSchema(doc)).toEqual([]);
  });
});

describe("image aspect ratio", () => {
  it("emits DoImageCorrectAspect when correctAspect is set", () => {
    const doc = createDefaultDocument();
    doc.nodes = [makeNode("image", "Pic", { parentId: "screen", correctAspect: true } as never)];
    expect(generateHps(doc)).toContain("ImGui_DoImageCorrectAspect(cImGuiGfx(");
  });

  it("emits plain DoImage by default", () => {
    const doc = createDefaultDocument();
    doc.nodes = [makeNode("image", "Pic", { parentId: "screen" })];
    const hps = generateHps(doc);
    expect(hps).toContain("ImGui_DoImage(cImGuiGfx(");
    expect(hps).not.toContain("DoImageCorrectAspect");
  });
});
