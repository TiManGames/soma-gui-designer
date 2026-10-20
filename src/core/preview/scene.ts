import type { SomaDocument } from "../model/document";
import type { WidgetNode, WidgetType } from "../model/nodes";
import { layoutRects, type Rect } from "../model/geometry";
import { Properties, evaluate, type EvalContext } from "./expressions";
import { fontLength, wrapText, type BitmapFont } from "./bitmapFont";
import { FRAME_SLOTS, widgetDefaults } from "./defaults";
import { intersect, mul, WHITE, type Color, type Material, type PreviewState, type Quad, type Scene, type TextureInfo } from "./types";

export interface Resources { texture: (name: string) => TextureInfo | undefined; font: (name: string) => BitmapFont | undefined }
export const materialName = (value: string): Material => {
  const name = value.replace(/^eGuiMaterial_/, "");
  return ["Alpha", "Additive", "Diffuse", "FontNormal", "Modulative", "PremulAlpha"].includes(name) ? name as Material : "Alpha";
};
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const replaceType = (node: WidgetNode, type: WidgetType): WidgetNode => ({ ...node, type } as WidgetNode);

export function buildScene(doc: SomaDocument, resources: Resources, states: Record<string, PreviewState> = {}, hidden = new Set<string>()): Scene {
  // Match the four decimal coordinates written to HPS. Even a subpixel
  // difference can cross a pixel center on a thin outline or gauge edge.
  doc = { ...doc, nodes: doc.nodes.map(n => ({ ...n, ...Object.fromEntries((["xN", "yN", "wN", "hN"] as const).map(k => [k, Number(n[k].toFixed(4))])) })) };
  const scene: Scene = { quads: [], rects: new Map(), frames: new Map(), diagnostics: [] };
  const used = new Map<string, Set<string>>();
  const screen = rect(0, 0, doc.previewResolution.x, doc.previewResolution.y);
  let nodeId = "", clip: Rect | undefined;
  const warn = (message: string) => scene.diagnostics.push(`${nodeId}: ${message}`);
  const ctx = (group: Rect): EvalContext => ({ width: screen.w, height: screen.h, groupWidth: group.w, groupHeight: group.h });
  const props = (node: WidgetNode, group: Rect, prefix = "", type = node.type) => {
    const defaults = widgetDefaults(type, screen.h);
    const read = used.get(node.id) ?? new Set<string>(); used.set(node.id, read);
    return new Properties(defaults, node.overrides.filter(o => !prefix || (o.kind === "expr" ? o.path.startsWith(prefix) : o.call.startsWith(prefix))).map(o => !prefix ? o : o.kind === "expr" ? { ...o, path: o.path.slice(prefix.length) } : { ...o, call: o.call.slice(prefix.length) }), ctx(group), warn, path => read.add(prefix + path));
  };
  function quad(r: Rect, z: number, texture = "", color: Color = WHITE, material: Material = "Alpha", uv: Quad["uv"] = [0, 0, 1, 1], corners: Quad["corners"] = [WHITE, WHITE, WHITE, WHITE], wrap: Quad["wrap"] = "Clamp") {
    if (!(r.w > 0 && r.h > 0) || !Number.isFinite(r.x + r.y + r.w + r.h + z)) return;
    const size = texture ? resources.texture(texture) : undefined;
    // cFrameSubImage insets UVs by .001 of its 1024px image atlas. Font
    // glyphs apply the same inset against their own page dimensions below.
    const mapped = size && !texture.startsWith("@font/") ? uv.map((v, i) => {
      const inset = 1.024 / (i % 2 ? size.height : size.width);
      return inset + v * (1 - inset * 2);
    }) as Quad["uv"] : uv;
    scene.quads.push({ rect: r, z, texture, color, corners, uv: mapped, material, wrap, clip, nodeId });
  }
  function gfx(p: Properties, path: string, r: Rect, z: number, color: Color = WHITE, uvOverride?: Quad["uv"]) {
    const type = p.str(path + ".mType", "eImGuiGfx_Image");
    if (type !== "eImGuiGfx_Image") warn(`Graphics type ${type} requires SOMA; showing its still image when available.`);
    const offset = p.vec(path + ".mvOffset", [0, 0, 0]), lo = p.vec(path + ".mvUVMin", [0, 0]), hi = p.vec(path + ".mvUVMax", [1, 1]);
    const uv: Quad["uv"] = uvOverride ?? [lo[0], lo[1], hi[0], hi[1]];
    if (p.bool(path + ".mbUVFlipH", false)) [uv[0], uv[2]] = [uv[2], uv[0]];
    if (p.bool(path + ".mbUVFlipV", false)) [uv[1], uv[3]] = [uv[3], uv[1]];
    const colors = ["TopLeft", "TopRight", "BotRight", "BotLeft"].map(k => p.color(path + ".mColorCorner" + k)) as Quad["corners"];
    quad({ ...r, x: r.x + offset[0], y: r.y + offset[1] }, z + (offset[2] ?? 0), p.str(path + ".file"), mul(color, p.color(path + ".mColor")), materialName(p.str(path + ".mMaterial", "Alpha")), uv, colors, p.str(path + ".mWrapMode").endsWith("_Mirror") ? "Mirror" : uv.some(n => n < 0 || n > 1) ? "Repeat" : "Clamp");
  }
  function natural(p: Properties, path: string): TextureInfo {
    const file = p.str(path + ".file");
    return file ? resources.texture(file) ?? { width: 2, height: 2 } : { width: 2, height: 2 };
  }
  function frame(p: Properties, path: string, r: Rect, z: number, color: Color) {
    const sizes = FRAME_SLOTS.map(s => natural(p, `${path}.${s}`));
    const [tl, top, tr, left, , right, bl, bottom, br] = sizes;
    const cells = [
      rect(r.x, r.y, tl.width, tl.height), rect(r.x + tl.width, r.y, r.w - tl.width - tr.width, top.height),
      rect(r.x + r.w - tr.width, r.y, tr.width, tr.height), rect(r.x, r.y + tl.height, left.width, r.h - tl.height - bl.height),
      rect(r.x + left.width, r.y + top.height, r.w - left.width - right.width, r.h - top.height - bottom.height),
      rect(r.x + r.w - right.width, r.y + tr.height, right.width, r.h - tr.height - br.height),
      rect(r.x, r.y + r.h - bl.height, bl.width, bl.height), rect(r.x + bl.width, r.y + r.h - bottom.height, r.w - bl.width - br.width, bottom.height),
      rect(r.x + r.w - br.width, r.y + r.h - br.height, br.width, br.height)
    ];
    // DrawFrame fills the gaps between independently sized corners and borders.
    const bg = `${path}.mGfxBackground`;
    const strips = [
      rect(r.x + tl.width, r.y + top.height, r.w - tl.width - tr.width, Math.max(tl.height, tr.height) - top.height),
      rect(r.x + left.width, r.y + tl.height, Math.max(tl.width, bl.width) - left.width, r.h - tl.height - bl.height),
      rect(r.x + r.w - Math.max(tr.width, br.width), r.y + tr.height, Math.max(tr.width, br.width) - right.width, r.h - tr.height - br.height),
      rect(r.x + bl.width, r.y + r.h - Math.max(bl.height, br.height), r.w - bl.width - br.width, Math.max(bl.height, br.height) - bottom.height)
    ];
    // Partition the background so no pixel is alpha blended twice.
    const innerLeft = Math.max(tl.width, bl.width, left.width), innerRight = Math.max(tr.width, br.width, right.width);
    const innerTop = Math.max(tl.height, tr.height, top.height), innerBottom = Math.max(bl.height, br.height, bottom.height);
    cells[4] = rect(r.x + innerLeft, r.y + innerTop, r.w - innerLeft - innerRight, r.h - innerTop - innerBottom);
    // Border-adjacent fill strips extend across the matching center interval.
    strips[0] = rect(r.x + tl.width, r.y + top.height, r.w - tl.width - tr.width, innerTop - top.height);
    strips[1] = rect(r.x + left.width, r.y + innerTop, innerLeft - left.width, r.h - innerTop - innerBottom);
    strips[2] = rect(r.x + r.w - innerRight, r.y + innerTop, innerRight - right.width, r.h - innerTop - innerBottom);
    strips[3] = rect(r.x + bl.width, r.y + r.h - innerBottom, r.w - bl.width - br.width, innerBottom - bottom.height);
    for (const s of strips) gfx(p, bg, s, z, color);
    FRAME_SLOTS.forEach((slot, i) => {
      const c = cells[i];
      const frameColors = ["TopLeft", "TopRight", "BotRight", "BotLeft"].map(k => p.color(`${path}.mColorCorner${k}`));
      // Interpolate the frame-wide vertex gradient at this piece's corners.
      const at = (x: number, y: number): Color => WHITE.map((_, k) => {
        const tx = (x - r.x) / r.w, ty = (y - r.y) / r.h;
        return (frameColors[0][k] * (1 - tx) + frameColors[1][k] * tx) * (1 - ty) + (frameColors[3][k] * (1 - tx) + frameColors[2][k] * tx) * ty;
      }) as Color;
      const before = scene.quads.length;
      gfx(p, `${path}.${slot}`, c, z, color);
      const q = scene.quads[before];
      if (q) q.corners = q.corners.map((col, j) => mul(col, at(j === 0 || j === 3 ? c.x : c.x + c.w, j < 2 ? c.y : c.y + c.h))) as Quad["corners"];
    });
  }
  function fontData(p: Properties, factor = 1): { font?: BitmapFont; name: string; size: number[] } {
    const name = "@font/" + (p.str("mFont.file") || "default_small.fnt").replace(/^@font\//, "");
    return { font: resources.font(name), name, size: p.vec("mFont.mvSize", [17, 17]).map(n => n * factor) };
  }
  function text(p: Properties, content: string, r: Rect, z: number, factor = 1, multiline = false, scroll = 0, rowSpace = 0, color: Color = WHITE) {
    const { font, name, size } = fontData(p, factor); if (!font) return;
    const rows = multiline ? wrapText(font, content, size[0], r.w) : [content];
    const tint = mul(mul(p.color("mColorText"), p.color("mFont.mColor")), color);
    const material = materialName(p.str("mFont.mMaterial", "FontNormal"));
    const align = p.str("mFontAlign", "eFontAlign_Left");
    let y = r.y - scroll * (size[1] + rowSpace);
    for (const row of rows) {
      let x = r.x + (align.endsWith("_Center") ? (r.w - fontLength(font, row, size[0])) / 2 : align.endsWith("_Right") ? r.w - fontLength(font, row, size[0]) : 0);
      for (const ch of row) {
        const g = font.glyphs.get(ch.codePointAt(0)!);
        if (!g) { warn(`Font has no glyph U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`); continue; }
        const page = font.pages.get(g.page);
        if (page) quad(rect(x + g.xoffset * size[0] / font.size, y + g.yoffset * size[1] / font.size, g.width * size[0] / font.size, g.height * size[1] / font.size), z, name.slice(0, name.lastIndexOf("/") + 1) + page, tint, material,
          [g.x / font.width + 0.001, g.y / font.height + 0.001, (g.x + g.width) / font.width - 0.001, (g.y + g.height) / font.height - 0.001]);
        x += g.xadvance * size[0] / font.size;
      }
      y += size[1] + rowSpace;
    }
  }
  function stateColor(p: Properties, s: PreviewState): Color {
    if (s.disabled && p.bool("mbUseDisabledColor")) return mul(p.color("mColorBase"), p.color("mColorDisabled", [0.7, 0.7, 0.7, 0.8]));
    if ((s.checked || s.pressed) && s.focused && p.bool("mbUseTriggeredAndInFocusColor", false)) return p.color("mColorTriggeredAndInFocus");
    if ((s.checked || s.pressed) && p.bool("mbUseTriggeredColor", false)) return p.color("mColorTriggered");
    if (s.focused && p.bool("mbUseInFocusColor", false)) return p.color("mColorInFocus");
    return p.color("mColorBase");
  }
  function button(p: Properties, content: string, r: Rect, z: number, s: PreviewState) {
    const c = stateColor(p, s);
    if (p.bool("mbUseFrame", false)) frame(p, "mGfxFrame", r, z, c);
    else if (p.bool("mbUseBackgroundGfx")) gfx(p, "mGfxBackground", r, z, c);
    if (s.focused && p.bool("mbUseInFocusGfx", false)) gfx(p, "mGfxInFocus", r, z + 0.1);
    if ((s.pressed || s.checked) && p.bool("mbUseTriggeredGfx", false)) gfx(p, "mGfxTriggered", r, z + 0.15);
    const f = fontData(p), width = f.font ? fontLength(f.font, content, f.size[0]) : 0;
    let tr = rect(r.x, r.y + (r.h - f.size[1]) / 2, r.w, f.size[1]);
    const saved = clip;
    if (p.bool("mbClipText", false) && width > r.w - p.num("mfClipAreaPaddingLeft") - p.num("mfClipAreaPaddingRight")) {
      const l = p.num("mfClipAreaPaddingLeft"), w = Math.max(0, r.w - l - p.num("mfClipAreaPaddingRight"));
      clip = intersect(rect(r.x + l, r.y, w, r.h), clip);
      const travel = Math.max(0, width - w), speed = Math.max(1, p.num("mfScrollSpeed", 32));
      const delay = p.num("mfScrollStartDelay", 1), cycle = delay + travel / speed + p.num("mfScrollResetDelay", 1);
      const offset = s.focused ? Math.min(travel, Math.max(0, ((s.time ?? 0) % cycle - delay) * speed)) : 0;
      tr = { ...tr, x: r.x + l - offset, w: width }; p.values.set("mFontAlign", "eFontAlign_Left");
    }
    text(p, content, tr, z + 0.2, 1, false, 0, 0, s.disabled && p.bool("mbUseDisabledColor") ? p.color("mColorDisabled") : WHITE);
    clip = saved;
  }
  function window(p: Properties, caption: string, r: Rect, z: number): Rect {
    frame(p, "mGfxWindowData", r, z, p.color("mColorBase"));
    let hh = 0;
    if (p.bool("mbUseHeader")) {
      let factor = p.num("mfCaptionSizeMul", 1);
      const f = fontData(p, factor), left = p.num("mfLabelPaddingLeft", 10), right = p.num("mfLabelPaddingRight", 15), top = p.num("mfLabelPaddingTop"), bottom = p.num("mfLabelPaddingBottom");
      const measured = f.font ? fontLength(f.font, caption, f.size[0]) : 0;
      if (measured > r.w - left - right) factor *= Math.max(0, r.w - left - right) / measured;
      hh = p.vec("mFont.mvSize", [17, 17])[1] * factor + top + bottom;
      const off = p.vec("mvLabelOffset", [0, 0, 0]);
      const width = p.str("mHeaderType").endsWith("_Full") ? r.w - off[0] * 2 : Math.max(p.num("mfLabelMinWidth"), (f.font ? fontLength(f.font, caption, p.vec("mFont.mvSize", [17, 17])[0] * factor) : 0) + left + right);
      const hr = rect(r.x + off[0], r.y + off[1], width, hh);
      frame(p, "mGfxLabelData", hr, z + 0.1, p.color("mColorBase"));
      text(p, caption, rect(hr.x + left, hr.y + top, hr.w - left - right, hh - top - bottom), z + 0.3, factor);
    }
    return rect(r.x + p.num("mfPaddingLeft"), r.y + hh + p.num("mfPaddingTop"), Math.max(1, r.w - p.num("mfPaddingLeft") - p.num("mfPaddingRight")), Math.max(1, r.h - hh - p.num("mfPaddingTop") - p.num("mfPaddingBottom")));
  }
  function draw(node: WidgetNode, p: Properties, r: Rect, parent: Rect, z: number, s: PreviewState): Rect {
    switch (node.type) {
      case "station-window": {
        if (node.drawOrnaments) {
          for (const [file, right, bottom, width, offset, color] of [
            ["station/ornament/corner_topright", true, false, 50, 2, WHITE], ["station/ornament/corner_bottomleft", false, true, 50, 2, WHITE],
            ["station/chinsymbol/small_default_exit", true, false, 0, 5, [0.396, 0.698, 0.745, 0.6]], ["station/chinsymbol/small_default_help", false, true, 0, 2, [0.396, 0.698, 0.745, 0.6]]
          ] as [string, boolean, boolean, number, number, Color][]) {
            const t = resources.texture(file); if (!t) continue; const w = width || t.width, h = w * t.height / t.width;
            quad(rect(right ? r.x + r.w - w - offset : r.x + (width ? offset : 5), bottom ? r.y + r.h - h - offset : r.y + offset, w, h), z + (width ? -0.1 : 0.1), file, color);
          }
        }
        return window(p, node.caption, r, z);
      }
      case "station-button": case "station-toggle-button": case "repeat-button": button(p, node.caption, r, z, s); break;
      case "multi-toggle": {
        const items = node.itemsText.split("|").filter(Boolean), columns = Math.max(1, node.columns), rows = Math.ceil(items.length / columns);
        items.forEach((item, i) => button(p, item, rect(r.x + i % columns * r.w / columns, r.y + Math.floor(i / columns) * r.h / rows, r.w / columns, r.h / rows), z, { ...s, checked: i === (s.selectedItem ?? 0) })); break;
      }
      case "gauge": {
        const c = stateColor(p, s); if (p.bool("mbUseFrame")) frame(p, "mGfxFrame", r, z, c);
        const pad = p.vec("mvPadding", [2, 2]);
        const expr = evaluate(node.fillExpr || "0.5f", ctx(parent));
        if (typeof expr !== "number") warn(`Cannot preview fill: ${node.fillExpr}`);
        const fill = Math.max(0, Math.min(1, s.value ?? (typeof expr === "number" ? expr : 0.5)));
        const inner = rect(r.x + pad[0], r.y + pad[1], Math.max(0, r.w - pad[0] * 2), Math.max(0, r.h - pad[1] * 2));
        const vertical = p.str("mOrientation").endsWith("_Vert");
        const fillRect = vertical ? { ...inner, y: inner.y + inner.h * (1 - fill), h: inner.h * fill } : { ...inner, w: inner.w * fill };
        const scaleUv = p.bool("mbUseFillUV", false);
        const lo = p.vec("mGfxFill.mvUVMin", [0, 0]), hi = p.vec("mGfxFill.mvUVMax", [1, 1]);
        gfx(p, "mGfxFill", fillRect, z, c, [lo[0], lo[1], vertical ? hi[0] : scaleUv ? fill : 1, vertical ? scaleUv ? fill : 1 : hi[1]]); break;
      }
      case "label": text(p, node.caption, { ...r, y: r.y + (r.h - 17 * node.fontSizeMul) / 2 }, z, node.fontSizeMul); break;
      case "text-frame": {
        if (p.bool("mbUseBackgroundGfx")) gfx(p, "mGfxBackground", r, z, stateColor(p, s));
        const saved = clip; clip = intersect(r, clip); text(p, node.text || node.caption, r, z + 0.1, 1, true, s.scroll); clip = saved; break;
      }
      case "image": {
        const file = node.gfx || node.caption, t = resources.texture(file); let ir = r;
        if (node.correctAspect && t) { const scale = Math.min(r.w / t.width, r.h / t.height); ir = { ...r, w: t.width * scale, h: t.height * scale }; }
        quad(ir, z, file); break;
      }
      case "fill": quad(r, z); break;
      case "frame": frame(p, "mFrameGfx", r, z, p.color("mColorBase")); break;
      case "slider-h": case "slider-v": {
        if (p.bool("mbUseBackgroundGfx")) gfx(p, "mGfxBackground", r, z, stateColor(p, s));
        if (s.focused && p.bool("mbUseBaseInFocusGfx")) gfx(p, "mGfxBaseInFocus", r, z + 0.05);
        const min = evaluate(node.min || "0", ctx(parent)), max = evaluate(node.max || "1", ctx(parent)), def = evaluate(node.defaultValue || "0.5f", ctx(parent));
        const lo = typeof min === "number" ? min : 0, hi = typeof max === "number" ? max : 1;
        const amount = Math.max(0, Math.min(1, ((s.value ?? (typeof def === "number" ? def : 0.5)) - lo) / (hi - lo || 1)));
        const size = p.vec("mvButtonSize", [20, 20]), vertical = node.type === "slider-v";
        const thumb = rect(r.x + (vertical ? (r.w - size[0]) / 2 : amount * (r.w - size[0])), r.y + (vertical ? (1 - amount) * (r.h - size[1]) : (r.h - size[1]) / 2), size[0], size[1]);
        if (p.bool("mbUseButtonGfx")) gfx(p, "mGfxButton", thumb, z + 0.1);
        if (s.focused && p.bool("mbUseButtonInFocusGfx")) gfx(p, "mGfxButtonInFocus", thumb, z + 0.2);
        if (s.pressed && p.bool("mbUseButtonTriggeredGfx")) gfx(p, "mGfxButtonTriggered", thumb, z + 0.3); break;
      }
      case "checkbox": {
        const size = p.vec("mvBoxSize", [20, 20]), box = rect(r.x, r.y + (r.h - size[1]) / 2, size[0], size[1]);
        gfx(p, "mGfxBox", box, z, stateColor(p, s));
        if (s.focused && p.bool("mbUseBoxInFocusGfx")) gfx(p, "mGfxBoxInFocus", box, z + 0.1);
        if (s.checked) { const overlay = p.vec("mvCheckOverlaySize", size); gfx(p, "mGfxCheckOverlay", rect(box.x, box.y, overlay[0], overlay[1]), z + 0.2); }
        text(p, node.caption, rect(r.x + size[0] + 5, r.y + (r.h - 17) / 2, r.w - size[0] - 5, 17), z + 0.3); break;
      }
      case "multi-select": {
        gfx(p, "mGfxBackground", r, z, stateColor(p, s));
        if (s.focused && p.bool("mbUseBackgroundInFocusGfx")) gfx(p, "mGfxBackgroundInFocus", r, z + 0.1);
        const size = p.vec("mvArrowSize", [20, 20]);
        for (const side of ["Left", "Right"]) {
          const ar = rect(side === "Left" ? r.x : r.x + r.w - size[0], r.y + (r.h - size[1]) / 2, size[0], size[1]);
          gfx(p, `mGfxArrow${side}`, ar, z + 0.2);
          if (s.focused && p.bool("mbUseArrowInFocusGfx")) gfx(p, `mGfxArrow${side}InFocus`, ar, z + 0.3);
        }
        const items = node.itemsText.split("|").filter(Boolean); p.values.set("mFontAlign", "eFontAlign_Center");
        text(p, items[Math.max(0, Math.min(items.length - 1, s.selectedItem ?? 0))] ?? "", rect(r.x + size[0], r.y + (r.h - 17) / 2, r.w - 2 * size[0], 17), z + 0.4); break;
      }
      case "bg-flat-color": quad(parent, z, "", p.color("color", [0, 0, 0, 1])); break;
      case "bg-scanlines": quad(screen, z, p.str("file", "station/scanlines/standard_tileable"), [0.008, 0.238, 0.23, 1], "Additive", [0, 0, 1, 4], undefined, "Repeat"); break;
      case "bg-backdrop": {
        const file = p.str("file", "background_logo_pathOS"), t = resources.texture(file); if (!t) break;
        const w = screen.w * p.num("relSize", 0.5);
        quad(rect(screen.w * p.num("relPosX", 0.1), screen.h * p.num("relPosY", 0.45), w, w * t.height / t.width), z, file, [1, 1, 1, 0.35]); break;
      }
      case "bg-ornament-tl": case "bg-ornament-tr": case "bg-ornament-br": case "bg-ornament-bl": {
        const corner = node.type.slice(-2), file = p.str("file", `station/ornament/corner_${({ tl: "topleft", tr: "topright", br: "bottomright", bl: "bottomleft" } as Record<string, string>)[corner]}`), t = resources.texture(file); if (!t) break;
        const w = screen.w * 0.25, h = w * t.height / t.width;
        quad(rect(corner.endsWith("r") ? parent.x + parent.w - w : parent.x, corner.startsWith("b") ? parent.y + parent.h - h : parent.y, w, h), z, file, p.color("color", corner === "tl" ? WHITE : [1, 0.75, 0.75, 1])); break;
      }
      case "station-numpad": {
        const display = rect(r.x, r.y, r.w, r.h * 0.176), wp = props(replaceType(node, "station-window"), r);
        const inside = window(wp, node.caption, display, z);
        const lp = props(replaceType(node, "label"), inside); lp.values.set("mFontAlign", "eFontAlign_Center");
        text(lp, (s.input ?? "").slice(0, node.digits), inside, z + 1);
        const bp = props(replaceType(node, "station-button"), parent); bp.values.set("mFont.mvSize", [parent.h * 0.0375, parent.h * 0.0375]); bp.values.set("mbClipText", false);
        const group = rect(r.x + r.w * 0.2075, r.y + r.h * 0.275, r.w * 0.585, r.h * 0.681);
        ["7", "8", "9", "4", "5", "6", "1", "2", "3", "Clear", "0", "OK"].forEach((label, i) => button(bp, label, rect(group.x + i % 3 * group.w * 0.333, group.y + Math.floor(i / 3) * group.h * 0.25, group.w * 0.32, group.h * 0.23), z + 2.1, { ...s, disabled: label === "OK" && (s.input ?? "").length !== node.digits })); break;
      }
      case "station-text-reader-single": {
        const wp = props(node, parent, "mWindow.", "station-window"), inside = window(wp, node.caption, r, z);
        const tp = props(node, inside, "", "text-frame"); tp.values.set("mFont.mvSize", p.vec("mvTextFontSize", [screen.h * 0.0325, screen.h * 0.0325]));
        const margin = rect(inside.x + inside.w * 0.075, inside.y + inside.h * 0.075, inside.w * 0.85, inside.h * 0.875);
        const saved = clip; clip = intersect(margin, clip);
        text(tp, node.text || node.caption, margin, z + 1, 1, true, s.scroll, tp.vec("mFont.mvSize", [17, 17])[1] * 0.06); clip = saved; break;
      }
      case "advanced-imgui": warn("Custom HPS is exported unchanged; its rendering requires SOMA."); break;
      case "group": case "layout": break;
    }
    return r;
  }
  function visit(parentId: string, parent: Rect, parentZ: number, active = new Set<string>(), disabled = false) {
    const nodes = doc.nodes.filter(n => n.parentId === parentId).sort((a, b) => a.z - b.z);
    const owner = doc.nodes.find(n => n.id === parentId);
    const flow = owner?.type === "layout" ? layoutRects(parent, owner.layoutType, nodes) : undefined;
    for (const node of nodes) {
      if (hidden.has(node.id) || active.has(node.id)) continue;
      nodeId = node.id;
      const p = props(node, parent), state = { ...states[node.id], disabled: disabled || !node.enabled || states[node.id]?.disabled };
      const r = flow?.get(node.id) ?? rect(parent.x + node.xN * parent.w, parent.y + node.yN * parent.h, node.wN * parent.w, node.hN * parent.h);
      scene.rects.set(node.id, r);
      const z = parentZ + (node.type.startsWith("bg-") ? p.num("zDepth", node.z) : node.z);
      const inner = draw(node, p, r, parent, z, state);
      scene.frames.set(node.id, inner);
      const next = new Set(active).add(node.id);
      const saved = clip;
      // Shipped StationGui_DoWindowStart and GroupBegin default to no clipping.
      visit(node.id, inner, z, next, state.disabled); clip = saved;
    }
  }
  visit("screen", screen, 0);
  if (doc.translationCategory) scene.diagnostics.push(`Translation category '${doc.translationCategory}': showing entry keys; use literal text for direct pixel comparison.`);
  for (const node of doc.nodes) {
    const reads = used.get(node.id); if (!reads) continue;
    for (const override of node.overrides) {
      if (override.kind !== "expr") continue;
      const path = override.path, component = /\.[rgbaxyz]$/.test(path) ? path.slice(0, path.lastIndexOf(".")) : path;
      if (/^mColor(?:Base|Text|Disabled|InFocus|Triggered|TriggeredAndInFocus)(?:\.[rgba])?$/.test(path) || /^mbUse(?:Disabled|InFocus|Triggered|TriggeredAndInFocus)Color$/.test(path)) continue;
      if (node.type === "station-text-reader-single" && ["mbDrawAppIcon", "mbFullScreen"].includes(path)) continue; // ignored by the shipped single-reader helper too
      if (/^(?:mWindow\.|mButton\.)?(?:mGfx(?:Box|CheckOverlay|BoxInFocus|BaseInFocus|Button|ButtonInFocus|ButtonTriggered|BackgroundInFocus|InFocus|Triggered|Arrow(?:Left|Right)(?:InFocus)?)|mFont)\.(?:mColor(?:Corner(?:TopLeft|TopRight|BotRight|BotLeft))?(?:\.[rgba])?|mMaterial|mvSize|mvOffset|mvUVMin|mvUVMax|mbUVFlipH|mbUVFlipV|mWrapMode)(?:\.[xyz])?$/.test(path)) continue;
      if (![...reads].some(read => read === path || read === component || read.startsWith(path + "."))) scene.diagnostics.push(`${node.id}: ${path} has no preview effect in the current widget state.`);
    }
  }
  scene.quads.sort((a, b) => a.z - b.z);
  scene.diagnostics = [...new Set(scene.diagnostics)];
  return scene;
}
