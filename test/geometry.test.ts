import { describe, it, expect } from "vitest";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { absoluteRect, renormalizeToParent } from "../src/core/model/geometry";
import { canReparent, descendantIds, getNode } from "../src/core/model/tree";
import { makeNode } from "../src/core/model/defaults";

describe("geometry", () => {
  it("computes absolute rect through the parent chain", () => {
    const doc = createDefaultDocument(); // 1280x800, MainWindow at 0.1/0.1/0.8/0.72
    const img = getNode(doc, "InfoImage")!; // child of MainWindow at 0.05/0.1/0.35/0.45
    const rect = absoluteRect(doc, img);
    // parent window abs: x=128, y=80, w=1024, h=576
    // A station window translates its child group below the height-relative header.
    // image abs: x = 128 + 0.05*1024 = 179.2,
    // y = 80 + 0.047*800 + 0.1*576 = 175.2
    expect(rect.x).toBeCloseTo(179.2, 3);
    expect(rect.y).toBeCloseTo(175.2, 3);
    expect(rect.w).toBeCloseTo(358.4, 3);
    expect(rect.h).toBeCloseTo(259.2, 3);
  });

  it("renormalize is the inverse of absoluteRect for the same parent", () => {
    const doc = createDefaultDocument();
    const window = getNode(doc, "MainWindow")!;
    window.overrides = [{ kind: "call", call: "SetPadding(10, 20, 30, 40)" }];
    const img = getNode(doc, "InfoImage")!;
    const abs = absoluteRect(doc, img);
    const norm = renormalizeToParent(doc, abs, "MainWindow");
    expect(norm.xN).toBeCloseTo(img.xN, 4);
    expect(norm.yN).toBeCloseTo(img.yN, 4);
    expect(norm.wN).toBeCloseTo(img.wN, 4);
    expect(norm.hN).toBeCloseTo(img.hN, 4);
  });

  it("reparenting to screen keeps the widget visually in place", () => {
    const doc = createDefaultDocument();
    const img = getNode(doc, "InfoImage")!;
    const abs = absoluteRect(doc, img);
    const norm = renormalizeToParent(doc, abs, "screen");
    // Under screen (1280x800): xN = 179.2/1280, yN = 175.2/800
    expect(norm.xN).toBeCloseTo(179.2 / 1280, 4);
    expect(norm.yN).toBeCloseTo(175.2 / 800, 4);
  });

  it("uses the outer window origin when its header is disabled", () => {
    const doc = createDefaultDocument();
    const window = getNode(doc, "MainWindow")!;
    window.overrides = [{ kind: "expr", path: "mbUseHeader", expr: "false" }];
    const img = getNode(doc, "InfoImage")!;
    expect(absoluteRect(doc, img).y).toBeCloseTo(137.6, 3);
  });

  it("applies the station transform before recursively resolving nested groups", () => {
    const doc = createDefaultDocument();
    const group = makeNode("group", "Nested", {
      parentId: "MainWindow", xN: 0.1, yN: 0.2, wN: 0.5, hN: 0.5
    });
    const label = makeNode("label", "NestedLabel", {
      parentId: "Nested", xN: 0.2, yN: 0.25, wN: 0.4, hN: 0.1
    });
    doc.nodes.push(group, label);

    const groupRect = absoluteRect(doc, group);
    const labelRect = absoluteRect(doc, label);
    expect(labelRect.x).toBeCloseTo(groupRect.x + groupRect.w * 0.2, 4);
    expect(labelRect.y).toBeCloseTo(groupRect.y + groupRect.h * 0.25, 4);
  });

  it("applies each station window frame in a nested window chain", () => {
    const doc = createDefaultDocument();
    const nestedWindow = makeNode("station-window", "NestedWindow", {
      parentId: "MainWindow", xN: 0.1, yN: 0.2, wN: 0.5, hN: 0.5
    });
    const label = makeNode("label", "NestedWindowLabel", {
      parentId: "NestedWindow", xN: 0, yN: 0, wN: 0.5, hN: 0.1
    });
    doc.nodes.push(nestedWindow, label);

    const nestedOuter = absoluteRect(doc, nestedWindow);
    const labelRect = absoluteRect(doc, label);
    expect(labelRect.x).toBeCloseTo(nestedOuter.x, 4);
    expect(labelRect.y).toBeCloseTo(nestedOuter.y + 0.047 * doc.previewResolution.y, 4);
  });
});

describe("tree", () => {
  it("collects descendants", () => {
    const doc = createDefaultDocument();
    const kids = descendantIds(doc, "MainWindow");
    expect(kids).toEqual(new Set(["InfoImage", "BodyText", "ConfirmButton"]));
  });

  it("prevents cycles: cannot reparent a node into its own descendant", () => {
    const doc = createDefaultDocument();
    // add a nested group under MainWindow to test deep cycle
    doc.nodes.push(makeNode("group", "Inner", { parentId: "MainWindow" }));
    expect(canReparent(doc, "MainWindow", "Inner")).toBe(false);
    expect(canReparent(doc, "MainWindow", "MainWindow")).toBe(false);
    expect(canReparent(doc, "InfoImage", "Inner")).toBe(true);
  });

  it("rejects reparenting under a non-container", () => {
    const doc = createDefaultDocument();
    expect(canReparent(doc, "InfoImage", "ConfirmButton")).toBe(false);
    expect(canReparent(doc, "InfoImage", "screen")).toBe(true);
  });
});
