import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../state/store";
import { useWorkspace } from "../../state/workspaceStore";
import { ROOT, type WidgetNode } from "@core/model/nodes";
import { getChildren, canReparent, descendantIds } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import type { SomaDocument } from "@core/model/document";
import { validationIssues } from "../../validation";
import { Icon, widgetIcon } from "../Icon";

let dragId = "";
function TreeRow({ node, doc, depth, warnings, flat = false }: {
  node: WidgetNode; doc: SomaDocument; depth: number; warnings: Set<string>; flat?: boolean;
}) {
  const selected = useStore(s => s.selectedId === node.id), select = useStore(s => s.select);
  const hidden = useStore(s => s.hidden.has(node.id)), locked = useStore(s => s.locked.has(node.id));
  const reveal = useWorkspace(s => s.reveal);
  const [dropHint, setDropHint] = useState(false), [editing, setEditing] = useState(false), [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const children = getChildren(doc, node.id).sort((a, b) => a.z - b.z);
  const ancestor = !!reveal && descendantIds(doc, node.id).has(reveal.id);
  useEffect(() => { if (ancestor) setCollapsed(false); }, [reveal, ancestor]);
  useEffect(() => { if (reveal?.id === node.id) ref.current?.scrollIntoView({ block: "nearest" }); }, [reveal, node.id]);
  const label = "caption" in node && node.caption ? node.caption : node.id;
  const state = useStore;
  return <>
    <div ref={ref} role="treeitem" aria-level={depth} aria-selected={selected} aria-expanded={!flat && children.length ? !collapsed : undefined}
      data-node-id={node.id} className={`tree-row${selected ? " selected" : ""}${dropHint ? " drop-target" : ""}${hidden ? " hidden" : ""}`}
      style={{ paddingLeft: (depth - 1) * 14 + 4 }} tabIndex={0} title={`${node.id} · ${WIDGETS[node.type].label}`}
      draggable={!locked && !editing} onClick={() => select(node.id)} onDoubleClick={() => setEditing(true)}
      onKeyDown={e => {
        if (editing || e.target instanceof HTMLElement && e.target.closest("button,input")) return;
        if (e.key === "F2") { e.preventDefault(); setEditing(true); }
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(node.id); }
        if (e.key === "ArrowRight" && children.length) { e.preventDefault(); setCollapsed(false); }
        if (e.key === "ArrowLeft") { e.preventDefault(); setCollapsed(true); }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const rows = [...(ref.current?.closest("[role=tree]")?.querySelectorAll<HTMLElement>("[role=treeitem]") ?? [])];
          rows[rows.indexOf(ref.current!) + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
        }
      }}
      onDragStart={e => { if (locked) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", node.id); dragId = node.id; }}
      onDragEnd={() => { dragId = ""; setDropHint(false); }}
      onDragOver={e => {
        const id = e.dataTransfer.getData("text/plain") || dragId;
        if (id && canReparent(doc, id, node.id)) { e.preventDefault(); setDropHint(true); }
      }} onDragLeave={() => setDropHint(false)}
      onDrop={e => {
        e.preventDefault(); e.stopPropagation(); setDropHint(false);
        const id = e.dataTransfer.getData("text/plain") || dragId;
        if (id && canReparent(doc, id, node.id)) state.getState().reparent(id, node.id);
        dragId = "";
      }}>
      <span className="tree-caret-slot">{!flat && children.length > 0 && <button className="tree-caret" aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.id}`} onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}><Icon name={collapsed ? "right" : "down"} /></button>}</span>
      <span className="tree-icon"><Icon name={widgetIcon(node.type)} /></span>
      {editing ? <input className="tree-rename" defaultValue={node.id} aria-label="Element ID" autoFocus
        onClick={e => e.stopPropagation()} onBlur={e => { setEditing(false); state.getState().renameNode(node.id, e.target.value); }}
        onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = node.id; setEditing(false); } }} />
        : <span className="tree-name">{label}</span>}
      {warnings.has(node.id) && <span className="tree-warn" title="This element has validation problems"><Icon name="alert" /></span>}
      <span className={`tree-toggles${hidden || locked ? " pinned" : ""}`}>
        <button className={`tree-toggle${hidden ? " on" : ""}`} aria-label={`${hidden ? "Show" : "Hide"} ${node.id}`} title={hidden ? "Show on canvas" : "Hide on canvas"} aria-pressed={hidden}
          onClick={e => { e.stopPropagation(); state.getState().toggleHidden(node.id); }}><Icon name={hidden ? "eyeOff" : "eye"} /></button>
        <button className={`tree-toggle layer-lock${locked ? " on" : ""}`} aria-label={`${locked ? "Unlock" : "Lock"} ${node.id}`} title={locked ? "Unlock" : "Lock canvas edits"} aria-pressed={locked}
          onClick={e => { e.stopPropagation(); state.getState().toggleLocked(node.id); }}><Icon name={locked ? "lock" : "unlock"} /></button>
      </span>
    </div>
    {!flat && !collapsed && children.map(child => <TreeRow key={child.id} node={child} doc={doc} depth={depth + 1} warnings={warnings} />)}
  </>;
}
export function HierarchyTree() {
  const doc = useStore(s => s.doc), selected = useStore(s => s.selectedId), reveal = useWorkspace(s => s.reveal);
  const [rootHint, setRootHint] = useState(false), [query, setQuery] = useState("");
  useEffect(() => { if (reveal) setQuery(""); }, [reveal]);
  const warnings = useMemo(() => new Set(validationIssues(doc).flatMap(issue => issue.nodeId ? [issue.nodeId] : [])), [doc]);
  const q = query.trim().toLowerCase();
  const filtered = q ? doc.nodes.filter(n => n.id.toLowerCase().includes(q) || ("caption" in n && n.caption.toLowerCase().includes(q)) || n.type.includes(q)) : null;
  const roots = getChildren(doc, ROOT).sort((a, b) => a.z - b.z);
  return <div className="hierarchy-wrap">
    <div className="layers-search-row">
      <div className="search-control"><Icon name="search" /><input aria-label="Search layers" placeholder="Search layers" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <button className="ghost insert-widget-button" title="Insert widget" aria-label="Insert widget" aria-haspopup="dialog" onClick={() => useWorkspace.getState().setInsertOpen(true)}><Icon name="plus" />Insert</button>
    </div>
    <div className="hierarchy" role="tree" aria-label="Screen hierarchy">
      {!filtered && <div className={`tree-row root${rootHint ? " drop-target" : ""}`} role="treeitem" aria-level={1} aria-selected={!selected} tabIndex={0}
        onClick={() => useStore.getState().select(null)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); useStore.getState().select(null); } }}
        onDragOver={e => { const id = e.dataTransfer.getData("text/plain") || dragId; if (id && canReparent(doc, id, ROOT)) { e.preventDefault(); setRootHint(true); } }}
        onDragLeave={() => setRootHint(false)}
        onDrop={e => { e.preventDefault(); setRootHint(false); const id = e.dataTransfer.getData("text/plain") || dragId;
          if (id && canReparent(doc, id, ROOT)) useStore.getState().reparent(id, ROOT); dragId = ""; }}>
        <span className="tree-caret-slot" /><Icon name="screen" /><span className="tree-name">Screen</span>
      </div>}
      {filtered?.length === 0 && <div className="palette-empty">No layers match “{query}”.</div>}
      {(filtered ?? roots).map(node => <TreeRow key={node.id} node={node} doc={doc} depth={filtered ? 1 : 2} warnings={warnings} flat={!!filtered} />)}
    </div>
  </div>;
}
