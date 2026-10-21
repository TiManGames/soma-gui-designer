import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../src/ui/state/store";
import { useViewport } from "../src/ui/state/viewportStore";
import { useWorkspace } from "../src/ui/state/workspaceStore";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { makeNode } from "../src/core/model/defaults";
import { generateHps } from "../src/core/codegen/generateHps";
import { validationIssues } from "../src/ui/validation";

vi.mock("../src/ui/vscodeApi", () => ({ postToHost: vi.fn() }));
beforeEach(() => {
  const doc = createDefaultDocument();
  doc.previewResolution = { x: 1000, y: 800 }; doc.snapToGrid = false;
  doc.nodes = [makeNode("group", "Parent", { xN: 0.1, yN: 0.1, wN: 0.8, hN: 0.75 }),
    makeNode("station-button", "Button", { parentId: "Parent", xN: 0.1, yN: 0.1, wN: 0.2, hN: 0.1 })];
  useStore.setState({ doc, selectedId: "Button", past: [], future: [], drag: null, wysiwygEnabled: false });
  useWorkspace.setState({ focusMode: false, leftOpen: true, rightOpen: true, projectSettings: false, reveal: null });
  useViewport.getState().setSize(doc.previewResolution, { x: 1200, y: 900 });
  useViewport.getState().setZoom("fit");
});
describe("zoom and editing", () => {
  it.each([0.25, 1, 2, 4])("moves and resizes in logical pixels at zoom %s", scale => {
    useViewport.getState().setZoom(scale);
    const state = () => useStore.getState();
    const start = (resize: boolean) => {
      const node = state().doc.nodes[1];
      state().startDrag({ id: node.id, resize, startClientX: 100, startClientY: 100,
        startXN: node.xN, startYN: node.yN, startWN: node.wN, startHN: node.hN });
    };
    start(false); state().dragMove(100 + 24 * scale, 100 + 18 * scale); state().endDrag();
    expect(state().doc.nodes[1].xN).toBeCloseTo(0.13);
    expect(state().doc.nodes[1].yN).toBeCloseTo(0.13);
    expect(state().past).toHaveLength(1);
    state().undo(); expect(state().doc.nodes[1].xN).toBe(0.1);
    start(true); state().dragMove(100 + 24 * scale, 100 + 18 * scale); state().endDrag();
    expect(state().doc.nodes[1].wN).toBeCloseTo(0.23);
    expect(state().doc.nodes[1].hN).toBeCloseTo(0.13);
  });
  it("does not change document JSON, generated code or history when navigating the UI", () => {
    const before = JSON.stringify(useStore.getState().doc), code = generateHps(useStore.getState().doc);
    useViewport.getState().setZoom(2);
    useViewport.getState().setSize({ x: 1000, y: 800 }, { x: 400, y: 500 });
    useWorkspace.getState().toggleFocus(); useWorkspace.getState().togglePanel("left");
    useWorkspace.getState().setInspectorTab("style"); useWorkspace.getState().setSection("Colors", false);
    useWorkspace.getState().showProject();
    expect(JSON.stringify(useStore.getState().doc)).toBe(before);
    expect(generateHps(useStore.getState().doc)).toBe(code);
    expect(useStore.getState().past).toEqual([]);
  });
  it("restores panel preferences after focus mode", () => {
    useWorkspace.getState().togglePanel("left");
    useWorkspace.getState().toggleFocus(); useWorkspace.getState().toggleFocus();
    expect(useWorkspace.getState()).toMatchObject({ focusMode: false, leftOpen: false, rightOpen: true });
  });
  it("associates schema warnings with widgets and opens their panels on reveal", () => {
    const doc = useStore.getState().doc;
    doc.nodes[1].overrides = [{ kind: "expr", path: "MissingField", expr: "1" }];
    expect(validationIssues(doc)).toContainEqual(expect.objectContaining({ nodeId: "Button" }));
    useWorkspace.setState({ focusMode: true, leftOpen: false, rightOpen: false });
    useWorkspace.getState().revealNode("Button");
    expect(useWorkspace.getState()).toMatchObject({ focusMode: false, leftOpen: true, rightOpen: true, reveal: { id: "Button" } });
  });
});
