import { useStore } from "../../state/store";
import type { WidgetNode, WidgetType } from "@core/model/nodes";
import type { Rect } from "@core/model/geometry";

// Map widget types to the prototype's CSS classes (legacy app.js cssType).
const CSS_TYPE: Record<WidgetType, string> = {
  "station-window": "widget-window",
  group: "widget-frame",
  "station-button": "widget-button",
  "station-toggle-button": "widget-button",
  label: "widget-label",
  "text-frame": "widget-textbox",
  image: "widget-image",
  gauge: "widget-gauge",
  fill: "widget-frame",
  "station-numpad": "widget-frame",
  "station-text-reader-single": "widget-textbox",
  "advanced-imgui": "widget-frame"
};

export function WidgetView({ node, rect }: { node: WidgetNode; rect: Rect }) {
  const selectedId = useStore((s) => s.selectedId);
  const dropTargetId = useStore((s) => s.dropTargetId);
  const startDrag = useStore((s) => s.startDrag);

  const selected = selectedId === node.id;
  const isDropTarget = dropTargetId === node.id;

  const beginDrag = (e: React.MouseEvent, resize: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    startDrag({
      id: node.id,
      resize,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXN: node.xN,
      startYN: node.yN,
      startWN: node.wN,
      startHN: node.hN
    });
  };

  const label = "caption" in node && node.caption ? `${node.id} · ${node.caption}` : node.id;

  return (
    <div
      className={`widget ${CSS_TYPE[node.type]}${selected ? " selected" : ""}${
        isDropTarget ? " drop-target" : ""
      }`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: Math.round(node.z * 10) }}
      onMouseDown={(e) => beginDrag(e, false)}
      title={label}
    >
      <span className="widget-title">{label}</span>
      <div className="resize-handle" onMouseDown={(e) => beginDrag(e, true)} />
    </div>
  );
}
