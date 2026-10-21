import { useStore } from "../../state/store";
import { usePreview } from "../../state/previewStore";
import type { WidgetNode } from "@core/model/nodes";
import type { Rect } from "@core/model/geometry";

interface Props { node: WidgetNode; rect: Rect; zIndex: number; onContextMenu: (e: React.MouseEvent, nodeId: string) => void }

/** Editor hit boxes are independent of the render surface and never clip game art. */
export function WidgetView({ node, rect, zIndex, onContextMenu }: Props) {
  const selected = useStore(s => s.selectedId === node.id), drop = useStore(s => s.dropTargetId === node.id);
  const startDrag = useStore(s => s.startDrag), wysiwyg = useStore(s => s.wysiwygEnabled), error = usePreview(s => s.error);
  const hidden = useStore(s => {
    let current: WidgetNode | undefined = node;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (s.hidden.has(current.id)) return true;
      seen.add(current.id); current = s.doc.nodes.find(n => n.id === current!.parentId);
    }
    return false;
  }), locked = useStore(s => s.locked.has(node.id));
  if (hidden) return null;
  const background = node.type.startsWith("bg-");
  const beginDrag = (e: React.MouseEvent, resize: boolean) => {
    if (locked || e.button !== 0) return; e.preventDefault(); e.stopPropagation();
    startDrag({ id: node.id, resize, startClientX: e.clientX, startClientY: e.clientY, startXN: node.xN, startYN: node.yN, startWN: node.wN, startHN: node.hN });
  };
  const label = node.caption ? `${node.id} · ${node.caption}` : node.id;
  const style = node.type === "station-window" ? "widget-window" : node.type === "label" ? "widget-label" : node.type.includes("button") ? "widget-button" : "widget-frame";
  const real = wysiwyg && !error && node.type !== "advanced-imgui";
  return <div className={`widget ${style}${real ? " widget-wysiwyg" : ""}${selected ? " selected" : ""}${drop ? " drop-target" : ""}${locked ? " editor-locked" : ""}${background ? " widget-bg" : ""}`}
    style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex }}
    onMouseDown={background || locked ? undefined : e => beginDrag(e, false)}
    onContextMenu={background ? undefined : e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, node.id); }} title={label}>
    {!real && <span className="widget-title">{label}</span>}
    {selected && <span className="selection-label">{node.id}</span>}
    {!background && !locked && <div className="resize-handle" onMouseDown={e => beginDrag(e, true)} />}
  </div>;
}
