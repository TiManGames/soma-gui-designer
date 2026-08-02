import { useState, useCallback } from "react";
import type { WidgetNode } from "../../state/../../../core/model/nodes";
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
  /** CSS color for the center fill. Transparent if omitted. */
  bgColor?: string;
  /** Optional caption rendered in the header (showHeader=true) or center cell. */
  caption?: string;
  /** When true, renders a header bar at the top of the interior (station-window). */
  showHeader?: boolean;
}

function sub(frameField: string, piece: string) {
  return `${frameField}.${piece}`;
}

const HEADER_STYLE: React.CSSProperties = {
  height: 20,
  background: "linear-gradient(180deg, rgba(63,182,201,0.28), rgba(63,182,201,0.10))",
  borderBottom: "1px solid rgba(63,182,201,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 500,
  color: "#dff6ff",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
  pointerEvents: "none",
  overflow: "hidden",
  whiteSpace: "nowrap" as const,
  textOverflow: "ellipsis",
  padding: "0 4px",
  flexShrink: 0,
};

const CAPTION_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 500,
  color: "#dff6ff",
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
export function FrameGfxPreview({ node, frameField, defaults, tintColor, bgColor, caption, showHeader }: Props) {
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
        <div style={{ background: bgColor ?? "transparent", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {showHeader && <div style={HEADER_STYLE}>{caption}</div>}
          {!showHeader && caption && <span style={CAPTION_STYLE}>{caption}</span>}
        </div>
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
    </div>
  );
}
