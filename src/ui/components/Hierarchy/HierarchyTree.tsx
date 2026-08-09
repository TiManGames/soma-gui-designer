import { useMemo, useState } from "react";
import { useStore } from "../../state/store";
import { ROOT, type WidgetNode, type WidgetType } from "@core/model/nodes";
import { getChildren, canReparent } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { validateDocument } from "@core/validate/validateDocument";
import type { SomaDocument } from "@core/model/document";

// Color coding by category for the tree dot / quick scanning.
const DOT_COLOR: Record<WidgetType, string> = {
  "station-window":            "#3fb6c9",
  group:                       "#6b7b8f",
  layout:                      "#6b7b8f",
  "station-button":            "#8fffd2",
  "station-toggle-button":     "#8fffd2",
  "repeat-button":             "#8fffd2",
  checkbox:                    "#a7d0d9",
  "slider-h":                  "#6fe3f2",
  "slider-v":                  "#6fe3f2",
  "multi-toggle":              "#8fffd2",
  "multi-select":              "#c9b26f",
  label:                       "#a7d0d9",
  "text-frame":                "#c9b26f",
  image:                       "#d98f5a",
  gauge:                       "#6fe3f2",
  fill:                        "#4a5a6f",
  frame:                       "#4a5a6f",
  "bg-scanlines":              "#3a4a5f",
  "bg-backdrop":               "#3a4a5f",
  "bg-flat-color":             "#3a4a5f",
  "bg-ornament-tl":            "#3a4a5f",
  "bg-ornament-tr":            "#3a4a5f",
  "bg-ornament-br":            "#3a4a5f",
  "bg-ornament-bl":            "#3a4a5f",
  "station-numpad":            "#d9a441",
  "station-text-reader-single": "#c9b26f",
  "advanced-imgui":            "#b07cff"
};

// A per-type glyph for at-a-glance scanning (kept ASCII/emoji to avoid extra assets).
const TYPE_ICON: Record<WidgetType, string> = {
  "station-window":            "▢",
  group:                       "▦",
  layout:                      "▤",
  "station-button":            "◉",
  "station-toggle-button":     "⏻",
  "repeat-button":             "⟳",
  checkbox:                    "☑",
  "slider-h":                  "▭",
  "slider-v":                  "▯",
  "multi-toggle":              "⚏",
  "multi-select":              "☰",
  label:                       "T",
  "text-frame":                "¶",
  image:                       "▧",
  gauge:                       "◑",
  fill:                        "▬",
  frame:                       "▭",
  "bg-scanlines":              "░",
  "bg-backdrop":               "▚",
  "bg-flat-color":             "■",
  "bg-ornament-tl":            "◤",
  "bg-ornament-tr":            "◥",
  "bg-ornament-br":            "◢",
  "bg-ornament-bl":            "◣",
  "station-numpad":            "⌨",
  "station-text-reader-single": "≡",
  "advanced-imgui":            "⚙"
};

// Module fallback for browsers that hide dataTransfer during dragover.
let dragId = "";

function TreeRow({
  node,
  doc,
  depth,
  warnings
}: {
  node: WidgetNode;
  doc: SomaDocument;
  depth: number;
  warnings: Set<string>;
}) {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const reparent = useStore((s) => s.reparent);
  const renameNode = useStore((s) => s.renameNode);
  const isHidden = useStore((s) => s.hidden.has(node.id));
  const isLocked = useStore((s) => s.locked.has(node.id));
  const toggleHidden = useStore((s) => s.toggleHidden);
  const toggleLocked = useStore((s) => s.toggleLocked);

  const [dropHint, setDropHint] = useState(false);
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const children = getChildren(doc, node.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const hasChildren = children.length > 0;
  const label = "caption" in node && node.caption ? node.caption : WIDGETS[node.type].label;

  const commitRename = (value: string) => {
    setEditing(false);
    const next = value.trim();
    if (next && next !== node.id) renameNode(node.id, next);
  };

  return (
    <>
      <div
        className={`tree-row${selectedId === node.id ? " selected" : ""}${dropHint ? " drop-target" : ""}${isHidden ? " hidden" : ""}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        draggable={!isLocked && !editing}
        onClick={() => !isLocked && select(node.id)}
        onDoubleClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "F2" && selectedId === node.id && !editing) {
            e.preventDefault();
            setEditing(true);
          }
        }}
        tabIndex={0}
        onDragStart={(e) => {
          if (isLocked) { e.preventDefault(); return; }
          e.dataTransfer.setData("text/plain", node.id);
          dragId = node.id;
        }}
        onDragOver={(e) => {
          const draggedId = e.dataTransfer.getData("text/plain") || dragId;
          if (draggedId && canReparent(doc, draggedId, node.id)) {
            e.preventDefault();
            setDropHint(true);
          }
        }}
        onDragLeave={() => setDropHint(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropHint(false);
          const draggedId = e.dataTransfer.getData("text/plain") || dragId;
          if (draggedId && canReparent(doc, draggedId, node.id)) reparent(draggedId, node.id);
        }}
      >
        <span className="tree-caret-slot">
          {hasChildren ? (
            <button
              type="button"
              className={`tree-caret${collapsed ? " collapsed" : ""}`}
              title={collapsed ? "Expand" : "Collapse"}
              onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
            >
              ▾
            </button>
          ) : null}
        </span>
        <span className="tree-dot" style={{ background: DOT_COLOR[node.type] }} />
        <span className="tree-icon" aria-hidden>{TYPE_ICON[node.type]}</span>

        {editing ? (
          <input
            className="tree-rename"
            defaultValue={node.id}
            autoFocus
            onBlur={(e) => commitRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              else if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="tree-name">{label}</span>
            <span className="tree-id">{node.id}</span>
          </>
        )}

        {warnings.has(node.id) && (
          <span className="tree-warn" title="This element has validation problems">⚠</span>
        )}

        <span className={`tree-toggles${isHidden || isLocked ? " pinned" : ""}`}>
          <button
            type="button"
            className={`tree-toggle${isHidden ? " on" : ""}`}
            title={isHidden ? "Show on canvas" : "Hide on canvas"}
            onClick={(e) => { e.stopPropagation(); toggleHidden(node.id); }}
          >
            {isHidden ? "🚫" : "👁"}
          </button>
          <button
            type="button"
            className={`tree-toggle${isLocked ? " on" : ""}`}
            title={isLocked ? "Unlock" : "Lock (block canvas edits)"}
            onClick={(e) => { e.stopPropagation(); toggleLocked(node.id); }}
          >
            {isLocked ? "🔒" : "🔓"}
          </button>
        </span>
      </div>
      {!collapsed &&
        children.map((c) => (
          <TreeRow key={c.id} node={c} doc={doc} depth={depth + 1} warnings={warnings} />
        ))}
    </>
  );
}

export function HierarchyTree() {
  const doc = useStore((s) => s.doc);
  const reparent = useStore((s) => s.reparent);
  const [rootHint, setRootHint] = useState(false);
  const [query, setQuery] = useState("");

  // Node IDs that appear at the start of a validation message ("<id>: ...").
  const warnings = useMemo(() => {
    const set = new Set<string>();
    for (const msg of validateDocument(doc)) {
      const colon = msg.indexOf(":");
      if (colon > 0) set.add(msg.slice(0, colon));
    }
    return set;
  }, [doc]);

  const q = query.trim().toLowerCase();
  // When searching, show a flat filtered list (ignoring the tree structure) so
  // deeply-nested matches are still reachable.
  const filtered = q
    ? doc.nodes.filter((n) => {
        const cap = "caption" in n && n.caption ? n.caption.toLowerCase() : "";
        return n.id.toLowerCase().includes(q) || cap.includes(q) || n.type.includes(q);
      })
    : null;

  const roots = getChildren(doc, ROOT).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <div className="hierarchy-wrap">
      <input
        className="sidebar-search"
        placeholder="Search layers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div
        className="hierarchy"
        onDragOver={(e) => {
          const draggedId = e.dataTransfer.getData("text/plain") || dragId;
          if (draggedId && canReparent(doc, draggedId, ROOT)) {
            e.preventDefault();
            setRootHint(true);
          }
        }}
        onDragLeave={() => setRootHint(false)}
        onDrop={(e) => {
          if (e.defaultPrevented) return;
          setRootHint(false);
          const draggedId = e.dataTransfer.getData("text/plain") || dragId;
          if (draggedId && canReparent(doc, draggedId, ROOT)) reparent(draggedId, ROOT);
        }}
      >
        {filtered ? (
          filtered.length === 0 ? (
            <div className="palette-empty">No layers match “{query}”.</div>
          ) : (
            filtered.map((node) => (
              <TreeRow key={node.id} node={node} doc={doc} depth={1} warnings={warnings} />
            ))
          )
        ) : (
          <>
            <div className={`tree-row root${rootHint ? " drop-target" : ""}`}>
              <span className="tree-dot" style={{ background: "#2a3646" }} />
              <span className="tree-name">screen (root)</span>
            </div>
            {roots.map((node) => (
              <TreeRow key={node.id} node={node} doc={doc} depth={1} warnings={warnings} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
