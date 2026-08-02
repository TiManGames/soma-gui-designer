import { useStore } from "../../state/store";
import type { WidgetNode, WidgetType } from "@core/model/nodes";
import type { Rect } from "@core/model/geometry";
import { getParam, getFileParam } from "@core/model/overrides";
import { FRAME_GFX_DEFAULTS, SLIDER_GFX_DEFAULTS, CHECKBOX_GFX_DEFAULT } from "@core/model/frameDefaults";
import { parseColorExpr, parseFloatExpr, type Rgba } from "../Properties/exprHelpers";
import { paletteColors } from "@core/schema/loadSchema";
import { GfxImage } from "./GfxImage";
import { FrameGfxPreview } from "./FrameGfxPreview";

const CSS_TYPE: Record<WidgetType, string> = {
  "station-window":            "widget-window",
  group:                       "widget-frame",
  layout:                      "widget-frame",
  "station-button":            "widget-button",
  "station-toggle-button":     "widget-button",
  "repeat-button":             "widget-button",
  checkbox:                    "widget-checkbox",
  "slider-h":                  "widget-gauge",
  "slider-v":                  "widget-gauge",
  "multi-toggle":              "widget-button",
  "multi-select":              "widget-textbox",
  label:                       "widget-label",
  "text-frame":                "widget-textbox",
  image:                       "widget-image",
  gauge:                       "widget-gauge",
  fill:                        "widget-frame",
  frame:                       "widget-frame",
  "bg-scanlines":              "widget-bg",
  "bg-backdrop":               "widget-bg",
  "bg-flat-color":             "widget-bg",
  "bg-ornament-tl":            "widget-bg",
  "bg-ornament-tr":            "widget-bg",
  "bg-ornament-br":            "widget-bg",
  "bg-ornament-bl":            "widget-bg",
  "station-numpad":            "widget-frame",
  "station-text-reader-single": "widget-textbox",
  "advanced-imgui":            "widget-frame"
};

// Background overlay widgets should not capture mouse events on the canvas —
// they cover the full screen and would block selecting any widget behind them.
// They remain selectable from the hierarchy tree.
const BG_TYPES = new Set<WidgetType>([
  "bg-scanlines", "bg-backdrop", "bg-flat-color",
  "bg-ornament-tl", "bg-ornament-tr", "bg-ornament-br", "bg-ornament-bl"
]);

const ORNAMENT_CORNER: Partial<Record<WidgetType, React.CSSProperties>> = {
  "bg-ornament-tl": { top: 0, left: 0 },
  "bg-ornament-tr": { top: 0, right: 0 },
  "bg-ornament-br": { bottom: 0, right: 0 },
  "bg-ornament-bl": { bottom: 0, left: 0 }
};

interface Props {
  node: WidgetNode;
  rect: Rect;
  zIndex: number;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}

/** cColor expr (0..1 channels) -> CSS rgba(), or null if not a literal/known color. */
function colorToCss(expr: string): string | null {
  const c: Rgba | null = parseColorExpr(expr, paletteColors);
  if (!c) return null;
  const to255 = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255);
  return `rgba(${to255(c.r)}, ${to255(c.g)}, ${to255(c.b)}, ${c.a})`;
}

/**
 * Real-texture / real-color content for the WYSIWYG-supported widget types.
 * Returns null for anything out of scope so the caller keeps the CSS placeholder.
 * `GfxImage` itself falls back to nothing (placeholder shows through) while a
 * texture is pending or unresolved.
 */
function WysiwygContent({ node }: { node: WidgetNode }) {
  switch (node.type) {
    case "image": {
      const gfx = node.gfx || node.caption;
      if (!gfx) return null;
      return (
        <GfxImage
          gfx={gfx}
          objectFit={node.correctAspect ? "contain" : "fill"}
          style={{ position: "absolute", inset: 0 }}
        />
      );
    }
    case "bg-flat-color": {
      const css = colorToCss(getParam(node.overrides, "color", "cColor(0.0f, 1.0f)"));
      if (!css) return null;
      return <div style={{ position: "absolute", inset: 0, background: css }} />;
    }
    case "bg-scanlines": {
      const file = getParam(node.overrides, "file", '"station/scanlines/standard_tileable"');
      return (
        <GfxImage
          gfx={file}
          repeat
          style={{ position: "absolute", inset: 0, opacity: 0.15, mixBlendMode: "screen" }}
        />
      );
    }
    case "bg-backdrop": {
      const file = getParam(node.overrides, "file", '"background_logo_pathOS"');
      const px = parseFloatExpr(getParam(node.overrides, "relPosX", "0.1f")) ?? 0.1;
      const py = parseFloatExpr(getParam(node.overrides, "relPosY", "0.45f")) ?? 0.45;
      const sz = parseFloatExpr(getParam(node.overrides, "relSize", "0.5f")) ?? 0.5;
      return (
        <GfxImage
          gfx={file}
          objectFit="contain"
          style={{
            position: "absolute",
            left: `${px * 100}%`,
            top: `${py * 100}%`,
            width: `${sz * 100}%`,
            height: `${sz * 100}%`
          }}
        />
      );
    }
    case "bg-ornament-tl":
    case "bg-ornament-tr":
    case "bg-ornament-br":
    case "bg-ornament-bl": {
      const file = getParam(node.overrides, "file", '"station/ornament/corner_topleft"');
      const tint = colorToCss(getParam(node.overrides, "color", "cColor_White")) ?? "#ffffff";
      return (
        <GfxImage
          gfx={file}
          tint={tint}
          style={{
            position: "absolute",
            width: "22%",
            aspectRatio: "1 / 1",
            ...ORNAMENT_CORNER[node.type]
          }}
        />
      );
    }
    case "station-window": {
      const defs = FRAME_GFX_DEFAULTS["station-window"] ?? {};
      // Factory default: gStationGuiColor_Normal = cColor(0.227, 0.51, 0.557) = #3a828e
      const tint = colorToCss(getParam(node.overrides, "mColorBase", "cColor(0.227f, 0.51f, 0.557f)")) ?? undefined;
      const useHeader = getParam(node.overrides, "mbUseHeader", "true") !== "false";
      const cap = "caption" in node ? node.caption : undefined;
      return (
        <FrameGfxPreview
          node={node}
          frameField="mGfxWindowData"
          defaults={defs}
          tintColor={tint}
          showHeader={useHeader}
          caption={cap}
        />
      );
    }
    case "station-button":
    case "station-toggle-button":
    case "repeat-button":
    case "multi-toggle": {
      const defs = FRAME_GFX_DEFAULTS[node.type] ?? FRAME_GFX_DEFAULTS["station-button"] ?? {};
      // Factory default: gStationGuiColor_Normal = cColor(0.227, 0.51, 0.557) = #3a828e
      const tint = colorToCss(getParam(node.overrides, "mColorBase", "cColor(0.227f, 0.51f, 0.557f)")) ?? undefined;
      const cap = "caption" in node ? node.caption : undefined;
      return (
        <FrameGfxPreview
          node={node}
          frameField="mGfxFrame"
          defaults={defs}
          tintColor={tint}
          bgColor={tint}
          caption={cap}
        />
      );
    }
    case "frame": {
      const defs = FRAME_GFX_DEFAULTS["frame"] ?? {};
      return (
        <FrameGfxPreview
          node={node}
          frameField="mFrameGfx"
          defaults={defs}
        />
      );
    }
    case "gauge": {
      const defs = FRAME_GFX_DEFAULTS["gauge"] ?? {};
      // Factory sets mColor = gStationGuiColor_Normal on each corner GfxImage
      const tint = colorToCss(getParam(node.overrides, "mColorBase", "cColor(0.227f, 0.51f, 0.557f)")) ?? undefined;
      return (
        <FrameGfxPreview
          node={node}
          frameField="mGfxFrame"
          defaults={defs}
          tintColor={tint}
        />
      );
    }
    case "text-frame": {
      const bg = getFileParam(node.overrides, "mGfxBackground", "");
      if (!bg) return null;
      return (
        <GfxImage
          gfx={bg}
          objectFit="fill"
          style={{ position: "absolute", inset: 0 }}
        />
      );
    }
    case "slider-h":
    case "slider-v": {
      const sliderType = node.type as "slider-h" | "slider-v";
      const defs = SLIDER_GFX_DEFAULTS[sliderType];
      const track = getFileParam(node.overrides, "mGfxBackground", defs.track);
      const thumb = getFileParam(node.overrides, "mGfxButton", defs.thumb);
      return (
        <div style={{ position: "absolute", inset: 0 }}>
          {track && (
            <GfxImage
              gfx={track}
              objectFit="fill"
              style={{ position: "absolute", inset: 0 }}
            />
          )}
          {thumb && (
            <GfxImage
              gfx={thumb}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: sliderType === "slider-v" ? "100%" : undefined,
                height: sliderType === "slider-h" ? "100%" : undefined,
              }}
            />
          )}
        </div>
      );
    }
    case "checkbox": {
      const gfx = getParam(node.overrides, "mGfxBackground", `"${CHECKBOX_GFX_DEFAULT}"`);
      return (
        <GfxImage
          gfx={gfx}
          objectFit="contain"
          style={{ position: "absolute", inset: 0 }}
        />
      );
    }
    default:
      return null;
  }
}

const WYSIWYG_TYPES = new Set<WidgetType>([
  "image", "bg-flat-color", "bg-scanlines", "bg-backdrop",
  "bg-ornament-tl", "bg-ornament-tr", "bg-ornament-br", "bg-ornament-bl",
  "station-window", "station-button", "station-toggle-button", "repeat-button",
  "multi-toggle", "frame", "gauge", "text-frame", "slider-h", "slider-v", "checkbox",
]);

export function WidgetView({ node, rect, zIndex, onContextMenu }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const dropTargetId = useStore((s) => s.dropTargetId);
  const startDrag = useStore((s) => s.startDrag);
  const wysiwygEnabled = useStore((s) => s.wysiwygEnabled);

  const selected = selectedId === node.id;
  const isDropTarget = dropTargetId === node.id;
  const isBg = BG_TYPES.has(node.type);
  const showWysiwyg = wysiwygEnabled && WYSIWYG_TYPES.has(node.type);

  const beginDrag = (e: React.MouseEvent, resize: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag({
      id: node.id,
      resize,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXN: node.xN,
      startYN: node.yN,
      startWN: node.wN,
      startHN: node.hN
    });
  };

  const label = "caption" in node && node.caption ? `${node.id} · ${node.caption}` : node.id;

  return (
    <div
      className={`widget ${CSS_TYPE[node.type]}${showWysiwyg ? " widget-wysiwyg" : ""}${
        selected ? " selected" : ""
      }${isDropTarget ? " drop-target" : ""}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex }}
      onMouseDown={isBg ? undefined : (e) => beginDrag(e, false)}
      onContextMenu={isBg ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, node.id);
      }}
      title={label}
    >
      {showWysiwyg && <WysiwygContent node={node} />}
      {!showWysiwyg && <span className="widget-title">{label}</span>}
      {!isBg && <div className="resize-handle" onMouseDown={(e) => beginDrag(e, true)} />}
    </div>
  );
}
