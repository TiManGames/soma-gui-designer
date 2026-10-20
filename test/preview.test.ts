import { describe, expect, it } from "vitest";
import { makeNode, WIDGETS } from "../src/core/model/defaults";
import { createDefaultDocument } from "../src/core/model/createDefaultDocument";
import { buildScene, type Resources } from "../src/core/preview/scene";
import { evaluate, Properties } from "../src/core/preview/expressions";
import { fontLength, parseBitmapFont, wrapText } from "../src/core/preview/bitmapFont";
import { generateHps } from "../src/core/codegen/generateHps";
import type { WidgetNode } from "../src/core/model/nodes";

const xml = '<font><info size="10"/><common lineHeight="10" base="8" scaleW="32" scaleH="32"/><pages><page id="0" file="test.dds"/></pages><chars><char id="65" x="0" y="0" width="5" height="8" xoffset="1" yoffset="2" xadvance="6" page="0"/><char id="32" x="5" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="3" page="0"/></chars><kernings><kerning first="65" second="65" amount="-5"/></kernings></font>';
const font = parseBitmapFont(xml)!;
const resources: Resources = { texture: name => ({ width: name.includes("framing") ? 16 : name.includes("window/") ? 32 : 8, height: name.includes("framing") ? 16 : name.includes("window/") ? 32 : 8 }), font: () => font };
const docWith = (...nodes: WidgetNode[]) => ({ ...createDefaultDocument(), translationCategory: "", previewResolution: { x: 800, y: 600 }, nodes });
const ctx = { width: 800, height: 600, groupWidth: 400, groupHeight: 200 };

describe("preview expressions", () => {
  it("evaluates only known constructors and arithmetic", () => {
    expect(evaluate("cColor(0,0.75f)", ctx)).toEqual([0, 0, 0, 0.75]);
    expect(evaluate("ImGui_NrmSizeGroupKeepRatio(cVector2f(0.1f, 0.2f))*2", ctx)).toEqual([40, 80]);
    expect(evaluate("gStationGuiColor_Normal*cColor(1,0.6)", ctx)).toEqual([0.227, 0.51, 0.557, 0.6]);
    expect(evaluate("GetDynamicColor()", ctx)).toBeUndefined();
    expect(evaluate("1;globalThis.x=1", ctx)).toBeUndefined();
    expect(evaluate("1/0", ctx)).toBeUndefined();
    expect(evaluate('cImGuiFont("bad.fnt",1/0)', ctx)).toBeUndefined();
  });
  it("preserves assignment and setter ordering, including clearing files", () => {
    const p = new Properties({}, [
      { kind: "call", call: 'mGfxFrame.mGfxBorderTop.SetFile("first")' },
      { kind: "expr", path: "mGfxFrame.mGfxBorderTop", expr: 'cImGuiGfx("second")' },
      { kind: "call", call: 'mGfxFrame.mGfxBorderTop.SetFile("")' },
      { kind: "expr", path: "mColorBase", expr: "cColor(1,0,0,1)" },
      { kind: "expr", path: "mColorBase.a", expr: "0.25f" }
    ], ctx, () => {});
    expect(p.str("mGfxFrame.mGfxBorderTop.file")).toBe("");
    expect(p.color("mColorBase")).toEqual([1, 0, 0, 0.25]);
  });
  it("honors font constructor size and resets graphics constructors", () => {
    const p = new Properties({ "mGfxFill.file": "old", "mGfxFill.mColor": [1, 0, 0, 1] }, [
      { kind: "expr", path: "mFont", expr: 'cImGuiFont("other.fnt", cVector2f(12,20))' },
      { kind: "expr", path: "mGfxFill", expr: "cImGuiGfx()" }
    ], ctx, () => {});
    expect(p.vec("mFont.mvSize", [0, 0])).toEqual([12, 20]);
    expect(p.str("mGfxFill.file")).toBe(""); expect(p.color("mGfxFill.mColor")).toEqual([1, 1, 1, 1]);
  });
});

describe("native frame and widget geometry", () => {
  it.each([20, 30, 32, 40])("anchors all gauge corners inside a %ipx widget", h => {
    const g = makeNode("gauge", "Gauge", { xN: 0, yN: 0, wN: 0.5, hN: h / 600 });
    const scene = buildScene(docWith(g), resources);
    const corners = scene.quads.filter(q => q.texture.includes("framing"));
    expect(corners).toHaveLength(4);
    const exportedHeight = Number((h / 600).toFixed(4)) * 600;
    expect(corners.find(q => q.texture.includes("lower_left"))?.rect).toEqual({ x: 0, y: exportedHeight - 16, w: 16, h: 16 });
    expect(corners.find(q => q.texture.includes("lower_right"))?.rect).toEqual({ x: 384, y: exportedHeight - 16, w: 16, h: 16 });
  });
  it("keeps native black window background instead of coloring it", () => {
    const window = makeNode("station-window", "Window", { xN: 0, yN: 0, wN: 1, hN: 1, overrides: [{ kind: "expr", path: "mColorBase", expr: "cColor(1,0.5,0,1)" }] });
    const scene = buildScene(docWith(window), resources);
    expect(scene.quads.find(q => !q.texture && q.rect.w > 700)?.color).toEqual([0, 0, 0, 0.75]);
    expect(scene.frames.get("Window")?.h).toBeCloseTo(571.8);
  });
  it("uses independent corner dimensions", () => {
    const n = makeNode("frame", "F", { xN: 0, yN: 0, wN: 1, hN: 1, overrides: [{ kind: "call", call: 'mFrameGfx.mGfxCornerBottomRight.SetFile("wide")' }] });
    const scene = buildScene(docWith(n), { ...resources, texture: () => ({ width: 20, height: 7 }) });
    expect(scene.quads.find(q => q.texture === "wide")?.rect).toEqual({ x: 780, y: 593, w: 20, h: 7 });
  });
  it("preserves native image-atlas UV inset and constructor font size", () => {
    const g = makeNode("gauge", "G");
    const q = buildScene(docWith(g), resources).quads.find(q => q.texture.includes("framing"))!;
    expect(q.uv).toEqual([0.064, 0.064, 0.9359999999999999, 0.9359999999999999]);
    const label = makeNode("label", "Label", { caption: "A", fontSizeMul: 2 });
    const glyph = buildScene(docWith(label), resources).quads[0];
    expect(glyph.rect.w).toBe(16); // 5px glyph / 10px font * (16px * 2)
  });
  it("flows layout children and accumulates parent depth without a hierarchy z multiplier", () => {
    const layout = makeNode("layout", "Layout", { xN: 0, yN: 0, wN: 1, hN: 1, z: 1 });
    const a = makeNode("fill", "A", { parentId: "Layout", wN: 0.5, hN: 0.1, z: 2 });
    const b = makeNode("fill", "B", { parentId: "Layout", wN: 0.5, hN: 0.2, z: 3 });
    const scene = buildScene(docWith(layout, a, b), resources);
    expect(scene.rects.get("B")?.y).toBe(60);
    expect(scene.quads.map(q => q.z)).toEqual([3, 4]);
  });
  it("renders vertical gauge fills from the bottom and honors padding", () => {
    const g = makeNode("gauge", "G", { xN: 0, yN: 0, wN: 0.1, hN: 0.5, fillExpr: "0.25f", overrides: [{ kind: "expr", path: "mOrientation", expr: "eImGuiGaugeOrientation_Vert" }] });
    expect(buildScene(docWith(g), resources).quads.slice(-1)[0]?.rect).toEqual({ x: 2, y: 224, w: 76, h: 74 });
  });
  it("provides a scene for every built-in widget and flags custom HPS", () => {
    for (const type of Object.keys(WIDGETS) as WidgetNode["type"][]) {
      const node = makeNode(type, type, { caption: "A" });
      if (node.type === "text-frame" || node.type === "station-text-reader-single") node.text = "A";
      const scene = buildScene(docWith(node), resources);
      expect(scene.rects.size, type).toBe(1);
      expect(scene.quads.every(q => Number.isFinite(q.rect.x + q.rect.y + q.rect.w + q.rect.h)), type).toBe(true);
      if (!["advanced-imgui", "group", "layout"].includes(type)) expect(scene.quads.length, type).toBeGreaterThan(0);
    }
  });
  it("uses explicit state colors without persisting preview state", () => {
    const node = makeNode("station-toggle-button", "B"), doc = docWith(node), before = JSON.stringify(doc);
    const scene = buildScene(doc, resources, { B: { focused: true, checked: true } });
    expect(scene.quads.find(q => q.texture)?.color).toEqual([0.9, 0.6, 0.1, 1]);
    expect(JSON.stringify(doc)).toBe(before);
  });
  it("keeps slider focus and press graphics above its thumb", () => {
    const node = makeNode("slider-h", "S");
    const scene = buildScene(docWith(node), resources, { S: { focused: true, pressed: true } });
    const thumb = scene.quads.find(q => q.texture.endsWith("imgui_slider_button.tga"))!;
    const overlays = scene.quads.filter(q => q.texture.endsWith("imgui_slider_button_infocus.tga"));
    expect(overlays).toHaveLength(2);
    expect(overlays.every(q => scene.quads.indexOf(q) > scene.quads.indexOf(thumb))).toBe(true);
  });
});

describe("bitmap metrics and exports", () => {
  it("uses glyph advances without synthetic kerning", () => {
    expect(fontLength(font, "AA", 20)).toBe(24);
    expect(wrapText(font, "AA AA\nA", 10, 15)).toEqual(["AA", "AA", "A"]);
    expect(parseBitmapFont("<font/> ")).toBeNull();
    const outlined = parseBitmapFont(xml.replace('size="10"', 'size="9" outline="1"'))!;
    expect(fontLength(outlined, "A", 12)).toBe(7); // (6+outline)/(lineHeight+2*outline)
  });
  it("initializes every data-bearing export and applies overrides", () => {
    const nodes = (["checkbox", "slider-h", "slider-v", "multi-select", "frame"] as const).map(type => makeNode(type, type, { overrides: [{ kind: "expr", path: "mColorBase", expr: "cColor(0.5f)" }] }));
    const hps = generateHps(docWith(...nodes));
    expect(hps).not.toMatch(/\(\s*,|,\s*,/);
    for (const getter of ["ImGui_GetDefaultCheckBox", "ImGui_GetDefaultSliderHorizontal", "ImGui_GetDefaultSliderVertical", "ImGui_GetDefaultMultiSelect"]) expect(hps).toContain(getter + "()");
    expect(hps).toContain("cImGuiFrameData()");
    expect(hps).toContain("cLux_GetCurrentImGui().DoFrame(frameData,");
  });
  it("passes normalized coordinates directly to the text-reader helper", () => {
    const hps = generateHps(docWith(makeNode("station-text-reader-single", "Reader")));
    const call = hps.split("\n").find(line => line.includes("StationGui_TextReaderSingle("))!;
    expect(call).toContain("cVector3f(0.05, 0.02, 1), cVector2f(0.9, 0.775)");
    expect(call).not.toContain("ImGui_Nrm");
  });
});
