import { describe, it, expect } from "vitest";
import { validateDocument } from "../src/core/validate/validateDocument";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { makeNode } from "../src/core/model/defaults";
import { findDropTarget } from "../src/core/model/hitTest";

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
