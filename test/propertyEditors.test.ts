import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { apiSchema, getStruct, getStructField } from "../src/core/schema/loadSchema";
import { makeNode, WIDGETS } from "../src/core/model/defaults";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { detectPreset, RESOLUTION_PRESETS } from "../src/core/model/document";
import { generateHps } from "../src/core/codegen/generateHps";
import { FieldEditor, canEditFieldValue } from "../src/ui/components/Properties/FieldEditor";
import { TypeFields } from "../src/ui/components/Properties/TypeFields";
import { OverridesSection } from "../src/ui/components/Properties/OverridesSection";
import { ProjectPanel } from "../src/ui/components/Properties/ProjectPanel";
import { CanvasToolbar } from "../src/ui/components/Canvas/CanvasToolbar";
import { useStore } from "../src/ui/state/store";
import { useGfxBrowse } from "../src/ui/state/gfxBrowseStore";
import { postToHost } from "../src/ui/vscodeApi";
import type { StructField } from "../src/core/schema/api-schema.types";
import type { WidgetType } from "../src/core/model/nodes";

vi.mock("../src/ui/vscodeApi", () => ({ postToHost: vi.fn() }));
const render = renderToStaticMarkup;
const noop = () => {};

beforeEach(() => {
  useStore.setState({ doc: createDefaultDocument(), past: [], future: [], selectedId: null });
  vi.clearAllMocks();
});

describe("widget input audit", () => {
  it("gives every catalog widget a renderable content and override panel", () => {
    for (const type of Object.keys(WIDGETS) as WidgetType[]) {
      const node = makeNode(type, type);
      expect(() => render(createElement(TypeFields, { node })), type).not.toThrow();
      expect(() => render(createElement(OverridesSection, { node })), type).not.toThrow();
      if (WIDGETS[type].dataClass) expect(getStruct(WIDGETS[type].dataClass), type).not.toBeNull();
    }
  });

  it("displays inherited factory colors in Style without creating overrides", () => {
    const node = makeNode("station-button", "Button");
    const before = JSON.stringify(node);
    const markup = render(createElement(OverridesSection, { node, view: "style" }));
    expect(markup).toContain('value="#3a828e"');
    expect(markup).toContain('aria-label="mColorBase expression mode"');
    expect(markup).toContain('title="mColorBase · Default (no override)"');
    expect(JSON.stringify(node)).toBe(before);
  });

  it("renders matching controls for every scalar/schema field", () => {
    const controls: Record<string, string> = { bool: 'type="checkbox"', float: 'type="number"', int: 'type="number"',
      string: 'type="text"', enum: "<select", color: 'type="color"', vec2: 'type="number"', vec3: 'type="number"', gfx: "Browse texture" };
    for (const struct of Object.values(apiSchema.structs)) {
      for (const field of struct.fields) {
        if (field.type === "cImGuiFrameGfx") continue;
        const markup = render(createElement(FieldEditor, { field, value: undefined, onChange: noop, onClear: noop }));
        expect(markup, `${struct.name}.${field.name}`).toContain(controls[field.category] ?? "AngelScript expression");
      }
    }
  });

  it.each(["slider-h", "slider-v"] as const)("uses numeric inputs for all %s values", type => {
    const markup = render(createElement(TypeFields, { node: makeNode(type, type) }));
    expect(markup.match(/type="number"/g)).toHaveLength(4);
    expect(markup).not.toContain('aria-label="Min expression"');
  });

  it("uses an image picker and whole-number counts", () => {
    const image = render(createElement(TypeFields, { node: makeNode("image", "Image") }));
    expect(image).toContain("Browse texture");
    expect(image).toContain('title="my_image"');
    for (const type of ["station-numpad", "multi-toggle"] as const) {
      const markup = render(createElement(TypeFields, { node: makeNode(type, type) }));
      expect(markup).toMatch(/type="number"[^>]*min="1"[^>]*step="1"/);
    }
  });

  it("distinguishes unset, false, and true booleans without writing defaults", () => {
    const field: StructField = { name: "mbEnabled", type: "bool", category: "bool" };
    const onChange = vi.fn();
    const draw = (value?: string) => render(createElement(FieldEditor, { field, value, onChange, onClear: noop }));
    expect(draw()).toContain('aria-checked="mixed"');
    expect(draw()).toContain("Default (no override)");
    expect(draw("false")).toContain('aria-checked="false"');
    expect(draw("true")).toContain('aria-checked="true"');
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows existing formulas in Expression mode without coercing them", () => {
    const field: StructField = { name: "Amount", type: "float", category: "float" };
    const onChange = vi.fn();
    const markup = render(createElement(FieldEditor, { field, value: "GetAmount() + 1.0f", onChange, onClear: noop }));
    expect(markup).toContain('aria-label="Amount expression"');
    expect(markup).toContain('value="GetAmount() + 1.0f"');
    expect(markup).not.toContain('type="number"');
    expect(onChange).not.toHaveBeenCalled();
    expect(canEditFieldValue({ name: "Count", type: "uint64", category: "int" }, "9007199254740993")).toBe(false);
    expect(canEditFieldValue({ name: "Count", type: "int", category: "int" }, "1.5")).toBe(false);
  });

  it("resolves nested numeric and enum fields and retains frame pickers", () => {
    expect(getStructField("cImGuiButtonData", "mFont.mvSize")?.category).toBe("vec2");
    expect(getStructField("cImGuiButtonData", "mGfxFrame.mGfxBorderTop.mWrapMode")?.enumType).toBe("eImGuiWrapMode");
    const node = makeNode("frame", "Frame", { overrides: [{ kind: "expr", path: "mFrameGfx.mGfxBorderTop", expr: 'cImGuiGfx("test/texture")' }] });
    const markup = render(createElement(OverridesSection, { node }));
    expect(markup.match(/aria-label="mFrameGfx\.mGfx[^"]+ editor mode"/g)).toHaveLength(9);
    expect(markup).toContain('title="test/texture"');
    const reader = makeNode("station-text-reader-single", "Reader", { overrides: [
      { kind: "call", call: 'mWindow.mGfxBackground.SetFile("nested/texture")' }
    ] });
    expect(render(createElement(OverridesSection, { node: reader }))).toContain('title="nested/texture"');
  });

  it("cancels graphics browsing without choosing or changing a path", async () => {
    const result = useGfxBrowse.getState().browse();
    const request = vi.mocked(postToHost).mock.calls.slice(-1)[0][0];
    expect(request.type).toBe("browseGfx");
    if (request.type !== "browseGfx") throw new Error("Expected a browse request");
    useGfxBrowse.getState().resolve(request.requestId, null);
    expect(await result).toBeNull();
    const selected = useGfxBrowse.getState().browse();
    const next = vi.mocked(postToHost).mock.calls.slice(-1)[0][0];
    if (next.type !== "browseGfx") throw new Error("Expected a browse request");
    useGfxBrowse.getState().resolve(next.requestId, "station/texture");
    expect(await selected).toBe("station/texture");
  });
});

describe("terminal preset and persistence", () => {
  it("appears in both selectors, detects dimensions, and supports undo/redo", () => {
    const preset = RESOLUTION_PRESETS.find(p => p.id === "768x613")!;
    expect(preset).toMatchObject({ x: 768, y: 613, label: "768 × 613 (Default Station Terminal)" });
    expect(render(createElement(ProjectPanel))).toContain(preset.label);
    expect(render(createElement(CanvasToolbar))).toContain(preset.label);
    const store = () => useStore.getState();
    store().setResolutionPreset(preset.id);
    expect(store().doc.previewResolution).toEqual({ x: 768, y: 613 });
    store().undo();
    expect(store().doc.previewResolution).toEqual({ x: 1280, y: 800 });
    store().redo();
    expect(store().doc.resolutionPreset).toBe(preset.id);
    store().setPreviewSize(768, 613);
    expect(detectPreset(768, 613)).toBe(preset.id);
  });

  it("preserves slider, gauge, boolean, and enum expressions through JSON and HPS", () => {
    const doc = createDefaultDocument();
    doc.nodes = [makeNode("slider-h", "Slider", { defaultValue: "GetValue()", min: "-1.0f", max: "GetMax()", step: "0.01f" }),
      makeNode("gauge", "Gauge", { fillExpr: "GetFill() * 0.01f", overrides: [
        { kind: "expr", path: "mbUseFrame", expr: "UseFrame()" },
        { kind: "expr", path: "mOrientation", expr: "GetOrientation()" }
      ] })];
    const restored = JSON.parse(JSON.stringify(doc));
    expect(restored).toEqual(doc);
    const hps = generateHps(restored);
    for (const expr of ["GetValue()", "GetMax()", "GetFill() * 0.01f", "UseFrame()", "GetOrientation()"]) expect(hps).toContain(expr);
  });
});
