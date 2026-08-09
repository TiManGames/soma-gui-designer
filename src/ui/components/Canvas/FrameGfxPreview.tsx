import { useState, useCallback } from "react";
import type { WidgetNode } from "@core/model/nodes";
import { getFileParam } from "../../../core/model/overrides";
import { GfxImage } from "./GfxImage";
import type { GfxEntry } from "../../state/gfxStore";

interface Props {
  node: WidgetNode;
  /** The top-level FrameGfx field name, e.g. "mGfxWindowData" or "mGfxFrame". */
  frameField: string;
  /** Factory defaults for each sub-field path. */
  defaults: Record<string, string>;
  /** CSS color applied as multiply blend over all frame textures (mColorBase). */
  tintColor?: string;
  /** CSS color drawn behind the complete frame, matching mGfxBackground. */
  backgroundColor?: string;
  /** CSS color limited to the frame's center cell. */
  centerColor?: string;
  /** Size of the transparent diagonal cut in a slanted bottom-right corner. */
  backgroundClipBottomRight?: number | true;
  /** Optional caption rendered in the center cell. */
  caption?: string;
  captionColor?: string;
  captionFontSize?: number;
}

function sub(frameField: string, piece: string) {
  return `${frameField}.${piece}`;
}

const CAPTION_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 500,
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
  pointerEvents: "none",
  overflow: "hidden",
  whiteSpace: "nowrap" as const,
  textOverflow: "ellipsis",
  padding: "0 4px",
};

/**
 * Renders a 9-cell CSS-grid border frame using cImGuiFrameGfx sub-field textures.
 * Corner sizes are determined from the loaded TGA/PNG natural dimensions so the
 * frame proportions match the in-game rendering.
 *
 * Layout:
 *   [TL] [ top edge 1fr ] [TR]
 *   [left edge 1fr] [center fill] [right edge 1fr]
 *   [BL] [ bot edge 1fr ] [BR]
 */
export function FrameGfxPreview({
  node,
  frameField,
  defaults,
  tintColor,
  backgroundColor,
  centerColor,
  backgroundClipBottomRight,
  caption,
  captionColor,
  captionFontSize
}: Props) {
  const f = (piece: string) =>
    getFileParam(node.overrides, sub(frameField, piece), defaults[sub(frameField, piece)] ?? "");

  const tlGfx = f("mGfxCornerTopLeft");
  const trGfx = f("mGfxCornerTopRight");
  const blGfx = f("mGfxCornerBottomLeft");
  const brGfx = f("mGfxCornerBottomRight");
  const topGfx = f("mGfxBorderTop");
  const rightGfx = f("mGfxBorderRight");
  const botGfx = f("mGfxBorderBottom");
  const leftGfx = f("mGfxBorderLeft");
  const bgGfx = f("mGfxBackground");

  // Track corner sizes so the grid tracks are pixel-perfect.
  const [tlSize, setTlSize] = useState<{ w: number; h: number } | null>(null);
  const [trSize, setTrSize] = useState<{ w: number; h: number } | null>(null);
  const [blSize, setBlSize] = useState<{ w: number; h: number } | null>(null);
  const [brSize, setBrSize] = useState<{ w: number; h: number } | null>(null);

  const onTl = useCallback((e: GfxEntry) => { if (e.w && e.h) setTlSize({ w: e.w, h: e.h }); }, []);
  const onTr = useCallback((e: GfxEntry) => { if (e.w && e.h) setTrSize({ w: e.w, h: e.h }); }, []);
  const onBl = useCallback((e: GfxEntry) => { if (e.w && e.h) setBlSize({ w: e.w, h: e.h }); }, []);
  const onBr = useCallback((e: GfxEntry) => { if (e.w && e.h) setBrSize({ w: e.w, h: e.h }); }, []);

  // Use max corner width/height so all 4 corners match — they're typically identical.
  const cw = Math.max(tlSize?.w ?? 12, trSize?.w ?? 12, blSize?.w ?? 12, brSize?.w ?? 12);
  const ch = Math.max(tlSize?.h ?? 12, trSize?.h ?? 12, blSize?.h ?? 12, brSize?.h ?? 12);
  const clipBottomRight = backgroundClipBottomRight === true
    ? (brSize?.w ?? 16)
    : backgroundClipBottomRight;

  const gridStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    gridTemplateColumns: `${cw}px 1fr ${cw}px`,
    gridTemplateRows: `${ch}px 1fr ${ch}px`,
  };

  const cornerStyle: React.CSSProperties = { width: cw, height: ch, overflow: "hidden" };
  const edgeH: React.CSSProperties = { width: "100%", height: ch, overflow: "hidden" };
  const edgeV: React.CSSProperties = { width: cw, height: "100%", overflow: "hidden" };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {backgroundColor && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: backgroundColor,
            clipPath: clipBottomRight
              ? `polygon(0 0, 100% 0, 100% calc(100% - ${clipBottomRight}px), calc(100% - ${clipBottomRight}px) 100%, 0 100%)`
              : undefined
          }}
        />
      )}

      {/* Optional full-rect background texture */}
      {bgGfx && (
        <GfxImage
          gfx={bgGfx}
          objectFit="fill"
          multiply={tintColor}
          style={{ position: "absolute", inset: 0 }}
        />
      )}

      <div style={gridStyle}>
        {/* Row 1: TL, top edge, TR */}
        <div style={cornerStyle}>
          {tlGfx && <GfxImage gfx={tlGfx} objectFit="fill" multiply={tintColor} onEntry={onTl} style={{ width: cw, height: ch }} />}
        </div>
        <div style={edgeH}>
          {topGfx && <GfxImage gfx={topGfx} objectFit="fill" multiply={tintColor} style={{ width: "100%", height: "100%" }} />}
        </div>
        <div style={cornerStyle}>
          {trGfx && <GfxImage gfx={trGfx} objectFit="fill" multiply={tintColor} onEntry={onTr} style={{ width: cw, height: ch }} />}
        </div>

        {/* Row 2: left edge, center, right edge */}
        <div style={edgeV}>
          {leftGfx && <GfxImage gfx={leftGfx} objectFit="fill" multiply={tintColor} style={{ width: "100%", height: "100%" }} />}
        </div>
        <div style={{ position: "relative", overflow: "hidden", background: centerColor }} />
        <div style={edgeV}>
          {rightGfx && <GfxImage gfx={rightGfx} objectFit="fill" multiply={tintColor} style={{ width: "100%", height: "100%" }} />}
        </div>

        {/* Row 3: BL, bottom edge, BR */}
        <div style={cornerStyle}>
          {blGfx && <GfxImage gfx={blGfx} objectFit="fill" multiply={tintColor} onEntry={onBl} style={{ width: cw, height: ch }} />}
        </div>
        <div style={edgeH}>
          {botGfx && <GfxImage gfx={botGfx} objectFit="fill" multiply={tintColor} style={{ width: "100%", height: "100%" }} />}
        </div>
        <div style={cornerStyle}>
          {brGfx && <GfxImage gfx={brGfx} objectFit="fill" multiply={tintColor} onEntry={onBr} style={{ width: cw, height: ch }} />}
        </div>
      </div>

      {caption && (
        <span
          style={{
            ...CAPTION_STYLE,
            color: captionColor ?? "#ffffff",
            fontSize: captionFontSize ?? 11
          }}
        >
          {caption}
        </span>
      )}
    </div>
  );
}
