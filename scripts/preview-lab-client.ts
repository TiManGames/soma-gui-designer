import { buildScene } from "../src/core/preview/scene";
import { GuiRenderer } from "../src/ui/gfx/GuiRenderer";
import { decodeDds } from "../src/ui/gfx/decodeDds";
import { decodeTga } from "../src/ui/gfx/decodeTga";
import { parseBitmapFont } from "../src/core/preview/bitmapFont";
import type { GfxEntry } from "../src/ui/state/gfxStore";
import type { SomaDocument } from "../src/core/model/document";
import type { Color, Material, Quad } from "../src/core/preview/types";
import { makeNode, WIDGETS } from "../src/core/model/defaults";
import type { WidgetType } from "../src/core/model/nodes";

const cache = new Map<string, GfxEntry>();
const doc: SomaDocument = await (await fetch("/lab/document")).json();
const canvas = document.getElementById("preview") as HTMLCanvasElement;
const renderer = new GuiRenderer(canvas);
const status = document.getElementById("status")!, resultsNode = document.getElementById("results")!;
async function load(name: string) {
  if (cache.has(name)) return;
  cache.set(name, { status: "pending" });
  const result = await (await fetch("/lab/resource?name=" + encodeURIComponent(name))).json();
  if (result.missing) { cache.set(name, { status: "missing" }); return; }
  const bytes = Uint8Array.from(atob(result.bytes), c => c.charCodeAt(0));
  if (result.extension === ".fnt") { cache.set(name, { status: "ready", font: parseBitmapFont(new TextDecoder().decode(bytes)) ?? undefined }); return; }
  const decoded = result.extension === ".dds" ? decodeDds(bytes) : result.extension === ".tga" ? decodeTga(bytes) : null;
  if (decoded) { cache.set(name, { status: "ready", w: decoded.width, h: decoded.height, pixels: decoded.rgba }); return; }
  if ([".png", ".jpg", ".jpeg"].includes(result.extension)) {
    const image = new Image(); image.src = `data:image/${result.extension === ".png" ? "png" : "jpeg"};base64,${result.bytes}`; await image.decode();
    const c = document.createElement("canvas"); c.width = image.naturalWidth; c.height = image.naturalHeight; const ctx = c.getContext("2d")!; ctx.drawImage(image, 0, 0);
    cache.set(name, { status: "ready", w: c.width, h: c.height, pixels: ctx.getImageData(0, 0, c.width, c.height).data }); return;
  }
  cache.set(name, { status: "missing" });
}
const requested = new Set<string>();
const resources = {
  texture: (name: string) => { requested.add(name); const e = cache.get(name); return e?.w && e?.h ? { width: e.w, height: e.h } : undefined; },
  font: (name: string) => { requested.add(name); return cache.get(name)?.font; }
};
const catalog = { ...doc, nodes: (Object.keys(WIDGETS) as WidgetType[]).filter(type => type !== "advanced-imgui").map(type => makeNode(type, type)) };
for (const node of catalog.nodes) if (node.type === "image") node.gfx = "default/imgui_checkbox.tga";
for (let round = 0; round < 8; round++) {
  buildScene(doc, resources); buildScene(catalog, resources); const todo = [...requested].filter(name => !cache.has(name));
  if (!todo.length) break; await Promise.all(todo.map(load));
}
const baseQuad = (texture: string, color: Color, material: Material): Quad => ({ texture, color, material, rect: { x: 0, y: 0, w: 4, h: 4 }, z: 0, corners: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]], uv: [0, 0, 1, 1], nodeId: "test", wrap: "Clamp" });
const checks: { name: string; actual: number[]; expected: number[]; pass: boolean }[] = [];
function check(name: string, source: Color, tint: Color, background: Color, material: Material, expected: number[]) {
  cache.set("__pixel", { status: "ready", w: 1, h: 1, pixels: Uint8ClampedArray.from(source.map(v => v * 255)) });
  renderer.render({ quads: [baseQuad("", background, "Diffuse"), baseQuad("__pixel", tint, material)], rects: new Map(), frames: new Map(), diagnostics: [] }, 4, 4, name => cache.get(name));
  const actual = Array.from(renderer.readPixels().slice(0, 3)); checks.push({ name, actual, expected, pass: actual.every((v, i) => Math.abs(v - expected[i]) <= 2) });
}
check("black alpha survives tint", [0, 0, 0, 0.75], [1, 0.5, 0, 1], [0.4, 0.4, 0.4, 1], "Alpha", [26, 26, 26]);
check("transparent colored texel stays transparent", [1, 0, 1, 0], [1, 1, 1, 1], [0.4, 0.4, 0.4, 1], "Alpha", [102, 102, 102]);
check("multiply before alpha blend", [1, 0.5, 0.25, 0.5], [0.5, 0.5, 0.5, 0.5], [0, 0, 0, 1], "Alpha", [32, 16, 8]);
check("native ONE/ONE additive", [0.2, 0.3, 0.4, 0], [1, 1, 1, 1], [0.1, 0.1, 0.1, 1], "Additive", [77, 102, 128]);
const scene = buildScene(doc, resources); renderer.render(scene, doc.previewResolution.x, doc.previewResolution.y, name => cache.get(name));
const missing = [...cache].filter(([, e]) => e.status === "missing").map(([name]) => name);
const catalogScene = buildScene(catalog, resources);
const results = { checks, missing, diagnostics: scene.diagnostics, catalogDiagnostics: catalogScene.diagnostics, catalogTypes: catalog.nodes.length, resources: cache.size, quads: scene.quads.length };
status.textContent = checks.every(c => c.pass) && !missing.length ? "PASS · local textures, bitmap fonts, and GPU blend checks loaded" : "FAIL · see results";
resultsNode.textContent = JSON.stringify(results, null, 2);
await fetch("/lab/capture", { method: "POST", body: JSON.stringify({ png: canvas.toDataURL("image/png"), results }) });
