import { useState } from "react";
import { useStore } from "../../state/store";
import { ROOT, type WidgetNode, type WidgetType } from "@core/model/nodes";
import { getChildren, canReparent } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import type { SomaDocument } from "@core/model/document";

// Color coding by category for the tree dot / quick scanning.
const DOT_COLOR: Record<WidgetType, string> = {
  "station-window": "#3fb6c9",
  group: "#6b7b8f",
  "station-button": "#8fffd2",
  "station-toggle-button": "#8fffd2",
  label: "#a7d0d9",
  "text-frame": "#c9b26f",
  image: "#d98f5a",
  gauge: "#6fe3f2",
  fill: "#4a5a6f",
  "station-numpad": "#d9a441",
  "station-text-reader-single": "#c9b26f",
  "advanced-imgui": "#b07cff"
};

function TreeRow({ node, doc, depth }: { node: WidgetNode; doc: SomaDocument; depth: number }) {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const reparent = useStore((s) => s.reparent);
  const [dropHint, setDropHint] = useState(false);

  const children = getChildren(doc, node.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <>
      <div
        className={`tree-row${selectedId === node.id ? " selected" : ""}${dropHint ? " drop-target" : ""}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        draggable
        onClick={() => select(node.id)}
        onDragStart={(e) => e.dataTransfer.setData("text/plain", node.id)}
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
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId && canReparent(doc, draggedId, node.id)) reparent(draggedId, node.id);
        }}
      >
        <span className="tree-dot" style={{ background: DOT_COLOR[node.type] }} />
        <span className="tree-name">{node.id}</span>
        <span className="tree-kind">{WIDGETS[node.type].label}</span>
      </div>
      {children.map((c) => (
        <TreeRow key={c.id} node={c} doc={doc} depth={depth + 1} />
      ))}
    </>
  );
}

// Module fallback for browsers that hide dataTransfer during dragover.
let dragId = "";

export function HierarchyTree() {
  const doc = useStore((s) => s.doc);
  const reparent = useStore((s) => s.reparent);
  const [rootHint, setRootHint] = useState(false);

  const roots = getChildren(doc, ROOT).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <div
      className="hierarchy"
      onDragStart={(e) => {
        dragId = ((e.target as HTMLElement).textContent ?? "").trim();
      }}
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
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && canReparent(doc, draggedId, ROOT)) reparent(draggedId, ROOT);
      }}
    >
      <div className={`tree-row root${rootHint ? " drop-target" : ""}`}>
        <span className="tree-dot" style={{ background: "#2a3646" }} />
        <span className="tree-name">screen (root)</span>
      </div>
      {roots.map((node) => (
        <TreeRow key={node.id} node={node} doc={doc} depth={1} />
      ))}
    </div>
  );
}
