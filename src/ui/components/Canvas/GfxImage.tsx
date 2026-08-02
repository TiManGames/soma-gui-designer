import { useEffect } from "react";
import { useGfx, type GfxEntry } from "../../state/gfxStore";

interface Props {
  /** Raw gfx reference (may include surrounding quotes, no extension, etc.). */
  gfx: string;
  className?: string;
  style?: React.CSSProperties;
  /** object-fit for the <img> render (ignored when tint/repeat set). */
  objectFit?: "fill" | "contain" | "cover";
  /** Tile the texture at its natural size instead of stretching. */
  repeat?: boolean;
  /** CSS color; when set the texture is used as an alpha mask over this color. */
  tint?: string;
  /**
   * CSS color applied as a multiply-blend overlay over the rendered texture.
   * Preserves texture detail while tinting it — matches HPL3's mColorBase behavior.
   */
  multiply?: string;
  /** Rendered while the gfx is pending or could not be resolved (CSS fallback). */
  children?: React.ReactNode;
  /** Notified with the resolved entry (used for aspect-correct sizing). */
  onEntry?: (entry: GfxEntry) => void;
}

/**
 * Resolves a gfx reference through the gfx store and renders the real texture
 * once available. While pending or on a miss (unresolved / DDS) it renders the
 * provided `children` — the existing CSS placeholder — so the canvas degrades
 * gracefully. Selects an <img>, a tiled background, or a tinted mask depending
 * on the props, covering the direct-file widget cases.
 */
export function GfxImage({ gfx, className, style, objectFit = "fill", repeat, tint, multiply, children, onEntry }: Props) {
  const request = useGfx((s) => s.request);
  const entry = useGfx((s) => s.cache.get(gfx));

  useEffect(() => {
    request(gfx);
  }, [gfx, request]);

  useEffect(() => {
    if (entry) onEntry?.(entry);
  }, [entry, onEntry]);

  if (!entry || entry.status !== "ready" || !entry.src) {
    return <>{children}</>;
  }

  const base: React.CSSProperties = { width: "100%", height: "100%", ...style };

  if (tint) {
    const mask = `url("${entry.src}") no-repeat center / contain`;
    return (
      <div
        className={className}
        style={{
          ...base,
          background: tint,
          WebkitMask: mask,
          mask
        }}
      />
    );
  }

  if (repeat) {
    return (
      <div
        className={className}
        style={{
          ...base,
          backgroundImage: `url("${entry.src}")`,
          backgroundRepeat: "repeat",
          backgroundSize: entry.w ? `${entry.w}px ${entry.h}px` : "auto"
        }}
      />
    );
  }

  if (multiply) {
    // Mask the overlay with the same texture so transparent regions stay transparent
    // instead of filling with the multiply color.
    const maskUrl = `url("${entry.src}") center / 100% 100% no-repeat`;
    return (
      <div className={className} style={{ ...base, position: "relative", isolation: "isolate" }}>
        <img
          src={entry.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit, display: "block" }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: multiply,
          WebkitMask: maskUrl,
          mask: maskUrl,
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }} />
      </div>
    );
  }

  return (
    <img
      className={className}
      src={entry.src}
      alt=""
      draggable={false}
      style={{ ...base, objectFit, display: "block" }}
    />
  );
}
