import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../state/store";
import { previewSize, absoluteRect } from "@core/model/geometry";
import { findDropTarget } from "@core/model/hitTest";
import { WidgetView } from "./WidgetView";
import { ContextMenu, type ContextMenuEntry } from "./ContextMenu";

const MAX_CANVAS_WIDTH = 980;

interface CtxState {
  x: number;
  y: number;
  nodeId: string | null; // null = blank canvas
}

export function Canvas() {
  const doc = useStore((s) => s.doc);
  const drag = useStore((s) => s.drag);
  const dragMove = useStore((s) => s.dragMove);
  const endDrag = useStore((s) => s.endDrag);
  const reparent = useStore((s) => s.reparent);
  const setDropTarget = useStore((s) => s.setDropTarget);
  const select = useStore((s) => s.select);
  const clipboard = useStore((s) => s.clipboard);
  const copyNode = useStore((s) => s.copyNode);
  const cutNode = useStore((s) => s.cutNode);
  const pasteNode = useStore((s) => s.pasteNode);
  const deleteNode = useStore((s) => s.deleteNode);

  const size = previewSize(doc);
  const scale = Math.min(1, MAX_CANVAS_WIDTH / size.x);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null);
  const openCtx = useCallback((e: React.MouseEvent, nodeId: string | null) => {
    e.preventDefault();
    if (nodeId) select(nodeId);
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, [select]);

  // Pan state (middle-mouse or background-drag)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const startPan = useCallback((e: MouseEvent) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: scroller.scrollLeft, scrollTop: scroller.scrollTop };
    setPanning(true);
  }, []);

  // Global pointer handlers for widget dragging and panning.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      // Pan
      if (panRef.current && scrollerRef.current) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        scrollerRef.current.scrollLeft = panRef.current.scrollLeft - dx;
        scrollerRef.current.scrollTop = panRef.current.scrollTop - dy;
      }
      // Widget drag
      if (!drag) return;
      dragMove(e.clientX, e.clientY);
      if (!drag.resize) {
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
      // End pan
      if (panRef.current) {
        panRef.current = null;
        setPanning(false);
      }
      // End widget drag
      const state = useStore.getState();
      const target = state.dropTargetId;
      const draggedId = state.drag?.id;
      if (draggedId) {
        endDrag();
        if (target) reparent(draggedId, target);
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, dragMove, endDrag, reparent, setDropTarget, scale, startPan]);

  const orderedNodes = [...doc.nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  // Build context-menu items based on what was right-clicked.
  function buildMenuItems(nodeId: string | null): ContextMenuEntry[] {
    if (nodeId) {
      return [
        { label: "Cut", onClick: () => cutNode(nodeId) },
        { label: "Copy", onClick: () => copyNode(nodeId) },
        { label: "Paste", disabled: !clipboard, onClick: () => pasteNode() },
        { separator: true },
        { label: "Delete", danger: true, onClick: () => deleteNode(nodeId) }
      ];
    }
    return [
      { label: "Paste", disabled: !clipboard, onClick: () => pasteNode() }
    ];
  }

  return (
    <>
      <div className="canvas-toolbar">
        <span className="scale-chip">
          {size.x}×{size.y} · {Math.round(scale * 100)}%
        </span>
        <span className="canvas-hint">
          Drag to move · corner to resize · drop into window/group to reparent · middle-drag to pan
        </span>
      </div>
      <div
        className={`canvas-scroller${panning ? " panning" : ""}`}
        ref={scrollerRef}
        onMouseDown={(e) => {
          // Middle-mouse anywhere in the scroller
          if (e.button === 1) {
            e.preventDefault();
            startPan(e.nativeEvent);
            return;
          }
          // Left-drag on the blank scroller background (not on canvas or widget)
          if (e.button === 0 && e.target === e.currentTarget) {
            startPan(e.nativeEvent);
          }
        }}
        onContextMenu={(e) => {
          // Right-click on blank scroller background
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("canvas")) {
            openCtx(e, null);
          }
        }}
      >
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
          onContextMenu={(e) => {
            if (e.target === e.currentTarget) openCtx(e, null);
          }}
        >
          {orderedNodes.map((node) => (
            <WidgetView
              key={node.id}
              node={node}
              rect={absoluteRect(doc, node)}
              onContextMenu={openCtx}
            />
          ))}
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildMenuItems(ctxMenu.nodeId)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
