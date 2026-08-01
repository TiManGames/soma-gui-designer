import { useState } from "react";
import { useStore } from "../../state/store";
import { ROOT, type WidgetNode } from "@core/model/nodes";
import { getChildren, canReparent } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import type { SomaDocument } from "@core/model/document";

function TreeNode({
  node,
  doc,
  depth
}: {
  node: WidgetNode;
  doc: SomaDocument;
  depth: number;
}) {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const reparent = useStore((s) => s.reparent);
  const [dropHint, setDropHint] = useState(false);

  const children = getChildren(doc, node.id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <>
      <div
        className={`hierarchy-item${selectedId === node.id ? " selected" : ""}${
          dropHint ? " drop-target" : ""
        }`}
        style={{ marginLeft: depth * 12 }}
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
          if (draggedId && canReparent(doc, draggedId, node.id)) {
            reparent(draggedId, node.id);
          }
        }}
      >
        <span>{node.id}</span>
        <span className="type-tag">{WIDGETS[node.type].label}</span>
      </div>
      {children.map((c) => (
        <TreeNode key={c.id} node={c} doc={doc} depth={depth + 1} />
      ))}
    </>
  );
}

// Module-scoped fallback for browsers that don't expose dataTransfer during dragover.
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
        const t = e.target as HTMLElement;
        // Capture drag id for the module fallback.
        dragId = (t.textContent ?? "").trim();
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
        // Only treat as "drop to screen" if not handled by a child item.
        if (e.defaultPrevented) return;
        const draggedId = e.dataTransfer.getData("text/plain");
        setRootHint(false);
        if (draggedId && canReparent(doc, draggedId, ROOT)) {
          reparent(draggedId, ROOT);
        }
      }}
    >
      <div
        className={`hierarchy-item${rootHint ? " drop-target" : ""}`}
        style={{ opacity: 0.7 }}
      >
        <span>screen (root)</span>
      </div>
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} doc={doc} depth={1} />
      ))}
    </div>
  );
}
