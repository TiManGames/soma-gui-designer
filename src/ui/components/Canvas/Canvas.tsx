import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { previewSize, absoluteRect } from "@core/model/geometry";
import { findDropTarget } from "@core/model/hitTest";
import { WidgetView } from "./WidgetView";

const MAX_CANVAS_WIDTH = 980;

export function Canvas() {
  const doc = useStore((s) => s.doc);
  const drag = useStore((s) => s.drag);
  const dragMove = useStore((s) => s.dragMove);
  const endDrag = useStore((s) => s.endDrag);
  const reparent = useStore((s) => s.reparent);
  const setDropTarget = useStore((s) => s.setDropTarget);
  const select = useStore((s) => s.select);

  const size = previewSize(doc);
  const scale = Math.min(1, MAX_CANVAS_WIDTH / size.x);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Global pointer handlers while a drag is in progress.
  useEffect(() => {
    if (!drag) return;

    function onMove(e: MouseEvent) {
      dragMove(e.clientX, e.clientY);

      // Drag-to-reparent: only when moving (not resizing).
      if (drag && !drag.resize) {
        const canvas = scrollerRef.current?.querySelector(".canvas") as HTMLElement | null;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const px = (e.clientX - rect.left) / scale;
          const py = (e.clientY - rect.top) / scale;
          const target = findDropTarget(useStore.getState().doc, drag.id, { x: px, y: py });
          const currentParent = useStore.getState().doc.nodes.find((n) => n.id === drag.id)?.parentId;
          setDropTarget(target !== currentParent ? target : null);
        }
      }
    }

    function onUp() {
      const state = useStore.getState();
      const target = state.dropTargetId;
      const draggedId = drag?.id;
      endDrag();
      if (draggedId && target) {
        reparent(draggedId, target);
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dragMove, endDrag, reparent, setDropTarget, scale]);

  const orderedNodes = [...doc.nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  return (
    <>
      <div className="canvas-toolbar">
        <span>
          {size.x}×{size.y} · scale {Math.round(scale * 100)}%
        </span>
        <span className="hint">Drag to move · corner handle to resize · drag into a window/group to reparent</span>
      </div>
      <div className="canvas-scroller" ref={scrollerRef}>
        <div
          className="canvas"
          style={{
            width: size.x,
            height: size.y,
            transform: `scale(${scale})`,
            backgroundSize: `${doc.gridSize}px ${doc.gridSize}px, ${doc.gridSize}px ${doc.gridSize}px`
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) select(null);
          }}
        >
          {orderedNodes.map((node) => (
            <WidgetView key={node.id} node={node} rect={absoluteRect(doc, node)} />
          ))}
        </div>
      </div>
    </>
  );
}
