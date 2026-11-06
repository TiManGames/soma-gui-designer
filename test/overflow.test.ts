import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { makeNode } from "../src/core/model/defaults";
import { readDocument, isSomaDocument } from "../src/core/model/document";
import { absoluteRect, constrainGeometry, layoutValuePatch } from "../src/core/model/geometry";
import { findDropTarget } from "../src/core/model/hitTest";
import { validateDocument } from "../src/core/validate/validateDocument";
import { generateHps } from "../src/core/codegen/generateHps";
import { buildScene } from "../src/core/preview/scene";
import { useStore } from "../src/ui/state/store";
import { useViewport } from "../src/ui/state/viewportStore";
import { usePreview } from "../src/ui/state/previewStore";
import { CommonProps } from "../src/ui/components/Properties/CommonProps";
import { postToHost } from "../src/ui/vscodeApi";

vi.mock("../src/ui/vscodeApi", () => ({ postToHost: vi.fn() }));
const state = () => useStore.getState();
const image = () => state().doc.nodes.find(n => n.id === "Image")!;

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  const doc = createDefaultDocument();
  doc.previewResolution = { x: 1000, y: 800 }; doc.snapToGrid = false;
  doc.nodes = [makeNode("group", "Parent", { xN: 0.1, yN: 0.1, wN: 0.8, hN: 0.75 }),
    makeNode("image", "Image", { parentId: "Parent", xN: 0.1, yN: 0.1, wN: 0.2, hN: 0.2 })];
  useStore.setState({ doc, selectedId: "Image", past: [], future: [], drag: null, clipboard: null, wysiwygEnabled: false });
  usePreview.setState({ doc: null, scene: null });
  useViewport.getState().setSize(doc.previewResolution, { x: 1200, y: 900 });
  useViewport.getState().setZoom(1);
});
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

function drag(resize: boolean, dx: number, dy: number, scale: number) {
  const node = image();
  state().startDrag({ id: node.id, resize, startClientX: 100, startClientY: 100,
    startXN: node.xN, startYN: node.yN, startWN: node.wN, startHN: node.hN });
  state().dragMove(100 + dx * scale, 100 + dy * scale); state().endDrag();
}

describe("overflow editing", () => {
  it.each([0.25, 1, 2])("crosses all edges and resizes at zoom %s with one undo per gesture", scale => {
    state().updateNode("Image", { allowOverflow: true });
    useViewport.getState().setZoom(scale);
    for (const [dx, dy, x, y] of [[-160, 0, -0.1, 0.1], [800, 0, 1.1, 0.1],
      [0, -120, 0.1, -0.1], [0, 600, 0.1, 1.1]]) {
      const count = state().past.length;
      drag(false, dx, dy, scale);
      expect(image().xN).toBeCloseTo(x); expect(image().yN).toBeCloseTo(y);
      expect(state().past).toHaveLength(count + 1);
      state().undo(); expect(image()).toMatchObject({ xN: 0.1, yN: 0.1, allowOverflow: true });
    }
    drag(true, 800, 600, scale);
    expect(image().wN).toBeCloseTo(1.2); expect(image().hN).toBeCloseTo(1.2);
    state().undo(); expect(image().wN).toBe(0.2);
    state().redo(); expect(image().wN).toBeCloseTo(1.2);
  });

  it.each([false, true])("keeps grid snapping independent (snap=%s)", snapToGrid => {
    useStore.setState({ doc: { ...state().doc, snapToGrid, gridSize: 10 } });
    state().updateNode("Image", { allowOverflow: true });
    drag(false, -107, -89, 1);
    expect(image().xN * 800).toBeCloseTo(snapToGrid ? -30 : -27);
    expect(image().yN * 600).toBeCloseTo(snapToGrid ? -30 : -29);
  });

  it.each(["px", "pct"] as const)("supports negative positions and oversized dimensions in %s", unit => {
    state().updateNode("Image", { allowOverflow: true });
    for (const [key, value, expected] of [["xN", -20, unit === "px" ? -0.025 : -0.2],
      ["yN", -30, unit === "px" ? -0.05 : -0.3], ["wN", unit === "px" ? 1200 : 150, 1.5],
      ["hN", unit === "px" ? 900 : 150, 1.5]] as const) {
      state().updateNode("Image", layoutValuePatch(state().doc, image(), key, value, unit));
      expect(image()[key]).toBeCloseTo(expected);
    }
  });

  it("snaps pixel inputs but leaves percentage precision unchanged", () => {
    state().updateNode("Image", { allowOverflow: true });
    const doc = { ...state().doc, snapToGrid: true, gridSize: 10 };
    expect(layoutValuePatch(doc, image(), "xN", -27, "px").xN).toBeCloseTo(-30 / 800);
    expect(layoutValuePatch(doc, image(), "xN", -2.7, "pct").xN).toBeCloseTo(-0.027);
  });

  it("fits dimensions before position on disable, without changing descendants", () => {
    state().updateNode("Parent", { allowOverflow: true, xN: -0.2, yN: 1.1, wN: 1.4, hN: 1.2 });
    const before = state().doc, child = image(), count = state().past.length;
    state().updateNode("Parent", { allowOverflow: false });
    expect(state().doc.nodes[0]).toMatchObject({ allowOverflow: false, xN: 0, yN: 0, wN: 1, hN: 1 });
    expect(image()).toEqual(child); expect(state().past).toHaveLength(count + 1);
    state().undo(); expect(state().doc).toEqual(before);
    state().redo(); expect(state().doc.nodes[0].allowOverflow).toBe(false);
  });

  it("enables without changing geometry, and moving a container moves its children", () => {
    const before = absoluteRect(state().doc, image());
    state().updateNode("Parent", { allowOverflow: true });
    expect(absoluteRect(state().doc, image())).toEqual(before);
    state().updateNode("Parent", { xN: -0.1 });
    expect(absoluteRect(state().doc, image()).x).toBeCloseTo(before.x - 200);
    expect(image().allowOverflow).toBe(false);
  });

  it("keeps constrained movement, resize limits and minimum dimensions", () => {
    drag(false, -1000, 1000, 1);
    expect(image()).toMatchObject({ xN: 0, yN: 0.8 });
    drag(true, 1000, 1000, 1);
    expect(image().wN).toBe(1); expect(image().hN).toBeCloseTo(0.2);
    state().updateNode("Image", { allowOverflow: true });
    drag(true, -2000, -2000, 1);
    expect(image().wN * 800).toBeCloseTo(4); expect(image().hN * 600).toBeCloseTo(4);
    state().updateNode("Image", { wN: -1, hN: 0 });
    expect(image().wN).toBe(0.001); expect(image().hN).toBe(0.001);
    const before = state().doc;
    state().updateNode("Image", { xN: Infinity });
    expect(state().doc).toBe(before);
    expect(layoutValuePatch(state().doc, image(), "xN", NaN, "px")).toEqual({});
    expect(Object.values(constrainGeometry({ xN: NaN, yN: Infinity, wN: NaN, hN: -1 }, true)).every(Number.isFinite)).toBe(true);
  });

  it("retains parent outside its bounds and still targets another valid container", () => {
    state().updateNode("Image", { allowOverflow: true });
    expect(findDropTarget(state().doc, "Image", { x: -20, y: 20 })).toBe("Parent");
    state().addNode("group");
    const added = state().selectedId!;
    state().reparent(added, "screen"); state().updateNode(added, { xN: 0, yN: 0, wN: 0.05, hN: 0.05 });
    expect(findDropTarget(state().doc, "Image", { x: 20, y: 20 })).toBe(added);
  });

  it.each([false, true])("preserves absolute overflow geometry through reparenting (WYSIWYG=%s)", wysiwyg => {
    state().updateNode("Image", { allowOverflow: true, xN: -0.5, yN: -0.4, wN: 1.5, hN: 1.4 });
    const before = absoluteRect(state().doc, image());
    if (wysiwyg) {
      const doc = state().doc, scene = buildScene(doc, { texture: () => undefined, font: () => undefined });
      usePreview.getState().publish(doc, scene, []); useStore.setState({ wysiwygEnabled: true });
    }
    state().reparent("Image", "screen");
    expect(absoluteRect(state().doc, image())).toEqual(before);
    expect(image().allowOverflow).toBe(true);
    state().reparent("Image", "Parent");
    const after = absoluteRect(state().doc, image());
    for (const key of ["x", "y", "w", "h"] as const) expect(after[key]).toBeCloseTo(before[key]);
  });

  it("preserves overflow geometry and settings when duplicating or pasting subtrees", () => {
    state().updateNode("Parent", { allowOverflow: true, xN: -0.4, wN: 1.5 });
    state().updateNode("Image", { allowOverflow: true, xN: -0.5, yN: 1.2, wN: 1.4 });
    state().duplicateNode("Image");
    const duplicate = state().doc.nodes.find(n => n.id === state().selectedId)!;
    expect(duplicate).toMatchObject({ allowOverflow: true, xN: -0.475, wN: 1.4 });
    expect(duplicate.yN).toBeCloseTo(1.225);
    state().copyNode("Parent"); state().pasteNode();
    const parent = state().doc.nodes.find(n => n.id === state().selectedId)!;
    expect(parent).toMatchObject({ allowOverflow: true, xN: -0.38, wN: 1.5 });
    const child = state().doc.nodes.find(n => n.parentId === parent.id)!;
    expect(child).toMatchObject({ allowOverflow: true, xN: -0.5, yN: 1.2, wN: 1.4 });
  });

  it("shows the checkbox only for positioned widgets", () => {
    for (const type of ["station-window", "image", "label", "group", "layout", "bg-backdrop", "advanced-imgui"] as const) {
      const markup = renderToStaticMarkup(createElement(CommonProps, { node: makeNode(type, "Widget") }));
      expect(markup.includes("Allow overflow")).toBe(!type.startsWith("bg-") && type !== "advanced-imgui");
    }
  });
});

describe("overflow persistence and rendering", () => {
  it("upgrades a real v4 file without changing geometry, code, or the original input", () => {
    const legacy = JSON.parse(readFileSync(new URL("./fixtures/parity.somagui.json", import.meta.url), "utf8"));
    const original = JSON.stringify(legacy), code = generateHps(legacy);
    const doc = readDocument(legacy)!;
    expect(doc.schemaVersion).toBe(5); expect(isSomaDocument(doc)).toBe(true);
    expect(doc.nodes.every(n => n.allowOverflow === false)).toBe(true);
    expect(doc.nodes.map(({ allowOverflow: _flag, ...node }) => node)).toEqual(legacy.nodes);
    expect(generateHps(doc)).toBe(code); expect(JSON.stringify(legacy)).toBe(original);
    expect(readDocument(doc)).toBe(doc);
    for (const value of [null, {}, { schemaVersion: 3, nodes: [] }, { schemaVersion: 6, nodes: [] },
      { ...legacy, nodes: [null] }, { ...legacy, schemaVersion: 5 }]) expect(readDocument(value)).toBeNull();
  });

  it("opens v4 without a host edit or history; the next edit saves v5", () => {
    const legacy = { ...state().doc, schemaVersion: 4, nodes: state().doc.nodes.map(({ allowOverflow: _flag, ...node }) => node) };
    state().setDocFromHost(JSON.stringify(legacy)); vi.runOnlyPendingTimers();
    expect(state().past).toEqual([]); expect(postToHost).not.toHaveBeenCalled();
    state().updateNode("Image", { allowOverflow: true, xN: -0.1 }); vi.runOnlyPendingTimers();
    const message = vi.mocked(postToHost).mock.calls[0][0];
    expect(message.type).toBe("edit"); if (message.type !== "edit") throw new Error("Expected edit");
    const saved = JSON.parse(message.text);
    expect(saved.schemaVersion).toBe(5); expect(isSomaDocument(saved)).toBe(true);
    state().setDocFromHost(message.text);
    expect(image()).toMatchObject({ allowOverflow: true, xN: -0.1 });
    expect(postToHost).toHaveBeenCalledTimes(1);
  });

  it("allows intentional overflow but rejects invalid geometry for either setting", () => {
    state().updateNode("Image", { allowOverflow: true, xN: -0.3, yN: 1.2, wN: 1.4 });
    expect(validateDocument(state().doc)).toEqual([]);
    for (const allowOverflow of [true, false]) {
      const doc = { ...state().doc, nodes: [{ ...image(), allowOverflow, xN: NaN, wN: 0 }] };
      expect(validateDocument(doc).some(e => e.includes("must be finite"))).toBe(true);
    }
    image().allowOverflow = false;
    expect(validateDocument(state().doc).some(e => e.includes("outside its parent"))).toBe(true);
  });

  it("exports signed coordinates and oversized dimensions, matching preview geometry", () => {
    state().reparent("Image", "screen");
    state().updateNode("Image", { allowOverflow: true, xN: -0.1, yN: -0.2, wN: 1.2, hN: 1.4 });
    const code = generateHps(state().doc);
    expect(code).toContain("ImGui_NrmPos(cVector3f(-0.1, -0.2, 1))");
    expect(code).toContain("ImGui_NrmSize(cVector2f(1.2, 1.4))");
    expect(code).not.toContain("allowOverflow");
    const scene = buildScene(state().doc, { texture: () => ({ width: 32, height: 32 }), font: () => undefined });
    expect(scene.rects.get("Image")).toEqual({ x: -100, y: -160, w: 1200, h: 1120 });
    const quad = scene.quads.find(q => q.nodeId === "Image");
    expect(quad?.rect).toEqual(scene.rects.get("Image"));
    // Screen clipping is performed by the unchanged render target, not by moving or trimming the image rect.
    expect(quad?.clip).toBeUndefined();
  });
});
