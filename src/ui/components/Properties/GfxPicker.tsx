import { useEffect } from "react";
import { useGfx } from "../../state/gfxStore";
import { useGfxBrowse } from "../../state/gfxBrowseStore";

interface Props {
  /** Current gfx path (no extension, no quotes), e.g. "stationV2/button/small_corner_topleft". Empty string = unset. */
  value: string;
  onChange: (path: string) => void;
  onClear?: () => void;
}

/**
 * A texture file picker: shows a small preview thumbnail, the short filename,
 * a browse button that opens a VS Code file dialog, and an optional clear button.
 */
export function GfxPicker({ value, onChange, onClear }: Props) {
  const request = useGfx((s) => s.request);
  const entry = useGfx((s) => (value ? s.cache.get(value) : undefined));
  const browse = useGfxBrowse((s) => s.browse);

  useEffect(() => {
    if (value) request(value);
  }, [value, request]);

  const basename = value ? value.slice(value.lastIndexOf("/") + 1) : "";
  const hasSrc = entry?.status === "ready" && entry.src;

  const handleBrowse = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const picked = await browse();
    if (picked !== null) onChange(picked);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {/* Thumbnail */}
      <div style={{
        width: 24, height: 24, flexShrink: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--r1)",
        background: "#0c141c",
        backgroundImage: "linear-gradient(45deg,rgba(255,255,255,.06) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,.06) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,.06) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.06) 75%)",
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {hasSrc && (
          <img src={entry!.src} alt="" draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>

      {/* Filename display */}
      <span style={{
        flex: 1, fontSize: 11, fontFamily: "var(--font-mono)",
        color: value ? "var(--text)" : "var(--text-faint)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        minWidth: 0,
      }}>
        {basename || "none"}
      </span>

      {/* Browse button */}
      <button
        type="button"
        className="icon-btn"
        title="Browse texture…"
        onClick={handleBrowse}
        style={{ padding: "2px 6px", fontSize: 11, flexShrink: 0 }}
      >
        …
      </button>

      {/* Clear button */}
      {onClear && value && (
        <button
          type="button"
          className="danger icon-btn"
          title="Clear"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
          style={{ padding: "2px 5px", fontSize: 11, flexShrink: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
