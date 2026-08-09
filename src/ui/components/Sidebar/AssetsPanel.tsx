import { useEffect, useMemo } from "react";
import { useStore } from "../../state/store";
import { useGfx } from "../../state/gfxStore";
import { useGfxBrowse } from "../../state/gfxBrowseStore";
import type { SomaDocument } from "@core/model/document";

/** Collect the distinct texture paths referenced anywhere in the document. */
function referencedGfx(doc: SomaDocument): string[] {
  const out = new Set<string>();
  for (const node of doc.nodes) {
    if (node.type === "image" && node.gfx) out.add(node.gfx);
    for (const ov of node.overrides) {
      if (ov.kind === "call") {
        const m = ov.call.match(/SetFile\(["']([^"']+)["']\)/);
        if (m) out.add(m[1]);
      } else if (ov.kind === "expr") {
        // bg-* file fields store a quoted texture path.
        const m = ov.expr.match(/^["']([^"']+)["']$/);
        if (m && m[1].includes("/")) out.add(m[1]);
      }
    }
  }
  return [...out];
}

function AssetCell({ path }: { path: string }) {
  const request = useGfx((s) => s.request);
  const entry = useGfx((s) => s.cache.get(path));
  const basename = path.slice(path.lastIndexOf("/") + 1);

  useEffect(() => {
    request(path);
  }, [path, request]);

  return (
    <div>
      <button className="asset-cell" title={path}>
        {entry?.status === "ready" && entry.src && <img src={entry.src} alt="" draggable={false} />}
      </button>
      <div className="asset-name" title={path}>{basename}</div>
    </div>
  );
}

export function AssetsPanel() {
  const doc = useStore((s) => s.doc);
  const browse = useGfxBrowse((s) => s.browse);
  const paths = useMemo(() => referencedGfx(doc), [doc]);

  return (
    <>
      <div className="sidebar-search" style={{ display: "flex", gap: "var(--s2)" }}>
        <button className="ghost" style={{ flex: 1 }} onClick={() => void browse()}>
          Browse texture…
        </button>
      </div>
      <div className="palette-group-label">Referenced in this screen</div>
      {paths.length === 0 ? (
        <div className="palette-empty">No textures referenced yet.</div>
      ) : (
        <div className="assets-grid">
          {paths.map((p) => (
            <AssetCell key={p} path={p} />
          ))}
        </div>
      )}
    </>
  );
}
