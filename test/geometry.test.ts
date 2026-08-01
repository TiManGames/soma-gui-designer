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
    // image abs: x = 128 + 0.05*1024 = 179.2, y = 80 + 0.1*576 = 137.6
    expect(rect.x).toBeCloseTo(179.2, 3);
    expect(rect.y).toBeCloseTo(137.6, 3);
    expect(rect.w).toBeCloseTo(358.4, 3);
    expect(rect.h).toBeCloseTo(259.2, 3);
  });

  it("renormalize is the inverse of absoluteRect for the same parent", () => {
    const doc = createDefaultDocument();
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
    // Under screen (1280x800): xN = 179.2/1280, yN = 137.6/800
    expect(norm.xN).toBeCloseTo(179.2 / 1280, 4);
    expect(norm.yN).toBeCloseTo(137.6 / 800, 4);
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
