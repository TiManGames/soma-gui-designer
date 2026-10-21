import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useStore } from "../../state/store";
import { useViewport } from "../../state/viewportStore";
import { useWorkspace } from "../../state/workspaceStore";
import { previewSize, absoluteRect } from "@core/model/geometry";
import { findDropTarget } from "@core/model/hitTest";
import { accumulatedZ } from "@core/model/tree";
import { canvasPlacement, type CanvasZoom } from "@core/model/canvasScale";
import { WidgetView } from "./WidgetView";
import { CanvasToolbar } from "./CanvasToolbar";
import { ContextMenu, type ContextMenuEntry } from "./ContextMenu";
import { WysiwygCanvas } from "./WysiwygCanvas";
import { usePreview } from "../../state/previewStore";

interface Anchor { worldX: number; worldY: number; x: number; y: number }
export function Canvas() {
  const doc = useStore(s => s.doc), grid = useStore(s => s.gridVisible);
  const drag = useStore(s => s.drag), wysiwyg = useStore(s => s.wysiwygEnabled);
  const preview = usePreview(s => s.scene), previewDoc = usePreview(s => s.doc);
  const diagnostics = usePreview(s => s.diagnostics), error = usePreview(s => s.error);
  const scale = useViewport(s => s.scale), available = useViewport(s => s.available), fit = useViewport(s => s.zoom === "fit");
  const reveal = useWorkspace(s => s.reveal);
  const size = previewSize(doc), placement = canvasPlacement(size, available, scale);
  const scroller = useRef<HTMLDivElement>(null), canvasRef = useRef<HTMLDivElement>(null);
  const pendingAnchor = useRef<Anchor | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const space = useRef(false);
  const [hand, setHand] = useState(false), [panning, setPanning] = useState(false);

  const rememberAnchor = useCallback((x?: number, y?: number) => {
    const element = scroller.current, canvas = canvasRef.current;
    if (!element || !canvas) return;
    const frame = element.getBoundingClientRect(), rect = canvas.getBoundingClientRect();
    const px = x ?? element.clientWidth / 2, py = y ?? element.clientHeight / 2;
    const currentScale = useViewport.getState().scale;
    pendingAnchor.current = { x: px, y: py, worldX: (frame.left + px - rect.left) / currentScale, worldY: (frame.top + py - rect.top) / currentScale };
  }, []);
  const zoomTo = useCallback((zoom: CanvasZoom, x?: number, y?: number) => {
    if (useStore.getState().drag) return;
    if (zoom !== "fit") rememberAnchor(x, y); else pendingAnchor.current = null;
    useViewport.getState().setZoom(zoom);
    if (zoom === "fit") scroller.current?.scrollTo(0, 0);
  }, [rememberAnchor]);

  useLayoutEffect(() => {
    const element = scroller.current; if (!element) return;
    const sync = () => {
      const state = useViewport.getState();
      if (state.zoom !== "fit" && !pendingAnchor.current) rememberAnchor();
      // Scrollbars are an effect of the canvas contents, not a change in the
      // space assigned to the editor. Measuring client size here makes Fit
      // alternate between two scales as overflow adds and removes scrollbars.
      state.setSize({ x: size.x, y: size.y }, fit
        ? { x: element.offsetWidth, y: element.offsetHeight }
        : { x: element.clientWidth, y: element.clientHeight });
    };
    sync();
    const observer = new ResizeObserver(sync); observer.observe(element, { box: fit ? "border-box" : "content-box" });
    return () => observer.disconnect();
  }, [size.x, size.y, fit, rememberAnchor]);
  useLayoutEffect(() => {
    const element = scroller.current; if (!element) return;
    const anchor = pendingAnchor.current;
    if (anchor) {
      element.scrollLeft = anchor.worldX * scale + placement.left - anchor.x;
      element.scrollTop = anchor.worldY * scale + placement.top - anchor.y;
      pendingAnchor.current = null;
    } else if (useViewport.getState().zoom === "fit") element.scrollTo(0, 0);
  }, [scale, available.x, available.y, placement.left, placement.top]);

  const startPan = useCallback((e: React.MouseEvent) => {
    const element = scroller.current; if (!element) return;
    pan.current = { x: e.clientX, y: e.clientY, left: element.scrollLeft, top: element.scrollTop };
    setPanning(true);
  }, []);
  useEffect(() => {
    const element = scroller.current; if (!element) return;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomTo(useViewport.getState().scale * Math.exp(-e.deltaY * 0.002), e.clientX - rect.left, e.clientY - rect.top);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [zoomTo]);
  useEffect(() => {
    const clearPan = () => { space.current = false; pan.current = null; setHand(false); setPanning(false); };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.target instanceof HTMLElement && e.target.closest("input,textarea,select,button,[contenteditable=true],[role=dialog]") || document.querySelector("dialog[open]")) return;
      e.preventDefault(); space.current = true; setHand(true);
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") { space.current = false; setHand(false); } };
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", clearPan);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", clearPan); };
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (pan.current && scroller.current) {
        scroller.current.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
        scroller.current.scrollTop = pan.current.top - (e.clientY - pan.current.y); return;
      }
      const state = useStore.getState(); if (!state.drag) return;
      state.dragMove(e.clientX, e.clientY);
      if (!state.drag.resize && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect(), current = usePreview.getState(), latest = useStore.getState();
        const target = findDropTarget(latest.doc, state.drag.id, { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }, current.doc === latest.doc ? current.scene?.rects : undefined);
        const parent = latest.doc.nodes.find(n => n.id === state.drag!.id)?.parentId;
        latest.setDropTarget(target !== parent ? target : null);
      }
    };
    const finish = () => {
      pan.current = null; setPanning(false);
      const state = useStore.getState(), target = state.dropTargetId, id = state.drag?.id;
      if (id) { state.endDrag(); if (target) useStore.getState().reparent(id, target); }
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", finish); window.addEventListener("blur", finish);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", finish); window.removeEventListener("blur", finish); };
  }, [scale, drag]);

  useEffect(() => {
    if (!reveal || !scroller.current) return;
    const element = scroller.current, node = useStore.getState().doc.nodes.find(n => n.id === reveal.id);
    if (!node) return;
    const current = usePreview.getState(), currentDoc = useStore.getState().doc;
    const rect = current.doc === currentDoc ? current.scene?.rects.get(node.id) ?? absoluteRect(currentDoc, node) : absoluteRect(currentDoc, node);
    const p = canvasPlacement(previewSize(currentDoc), useViewport.getState().available, scale);
    element.scrollTo({ left: p.left + (rect.x + rect.w / 2) * scale - element.clientWidth / 2, top: p.top + (rect.y + rect.h / 2) * scale - element.clientHeight / 2 });
  }, [reveal, scale]);

  const openContext = useCallback((e: React.MouseEvent, nodeId: string | null) => {
    e.preventDefault(); if (nodeId) useStore.getState().select(nodeId);
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);
  function menuItems(id: string | null): ContextMenuEntry[] {
    const state = useStore.getState();
    const paste = { label: "Paste", disabled: !state.clipboard, onClick: state.pasteNode };
    return id ? [
      { label: "Cut", onClick: () => state.cutNode(id) }, { label: "Copy", onClick: () => state.copyNode(id) },
      paste, { label: "Duplicate", onClick: () => state.duplicateNode(id) }, { separator: true },
      { label: "Delete", danger: true, onClick: () => state.deleteNode(id) }
    ] : [{ label: "Insert widget…", onClick: () => useWorkspace.getState().setInsertOpen(true) }, paste];
  }
  return <>
    <CanvasToolbar onZoom={zoomTo} />
    {wysiwyg && (error || diagnostics.length > 0) && <details className="preview-status" open={!!error}><summary>{error || `${diagnostics.length} preview notice${diagnostics.length === 1 ? "" : "s"}`}</summary><ul>{diagnostics.map(message => <li key={message}>{message}</li>)}</ul></details>}
    <div className={`canvas-scroller${panning ? " panning" : ""}${hand ? " hand-tool" : ""}`} ref={scroller} tabIndex={0} aria-label="Canvas viewport"
      onMouseDownCapture={e => {
        if (e.button === 1 || e.button === 0 && space.current) { e.preventDefault(); e.stopPropagation(); startPan(e); }
      }}
      onMouseDown={e => {
        const target = e.target as HTMLElement;
        if (e.button === 0 && (target === e.currentTarget || target.classList.contains("canvas-space") || target.classList.contains("canvas"))) {
          startPan(e); useStore.getState().select(null);
        }
      }}
      onContextMenu={e => { const target = e.target as HTMLElement;
        if (target === e.currentTarget || target.classList.contains("canvas-space") || target.classList.contains("canvas")) openContext(e, null);
      }}>
      {/* Fit fills the client area without retaining scrollbars after overflow disappears. */}
      <div className="canvas-space" style={{ width: fit ? "100%" : placement.spaceWidth, height: fit ? "100%" : placement.spaceHeight }}>
        <div className="canvas-stage" style={{ left: placement.left, top: placement.top, width: placement.width, height: placement.height }}>
          <div ref={canvasRef} className={`canvas${grid ? "" : " grid-hidden"}`} style={{
            width: size.x, height: size.y, transform: `scale(${scale})`, "--canvas-scale": scale,
            backgroundSize: `${doc.gridSize}px ${doc.gridSize}px`
          } as CSSProperties} onContextMenu={e => { if (e.target === e.currentTarget) openContext(e, null); }}>
            {wysiwyg && <WysiwygCanvas />}
            {wysiwyg && grid && <div className="gui-grid-overlay" style={{ backgroundSize: `${doc.gridSize}px ${doc.gridSize}px` }} />}
            {[...doc.nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map(node => <WidgetView key={node.id} node={node}
              rect={wysiwyg && previewDoc === doc ? preview?.rects.get(node.id) ?? absoluteRect(doc, node) : absoluteRect(doc, node)}
              zIndex={Math.max(1, 10000 + Math.round(accumulatedZ(doc, node) * 100))} onContextMenu={openContext} />)}
          </div>
        </div>
      </div>
    </div>
    {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={menuItems(ctxMenu.nodeId)} onClose={() => setCtxMenu(null)} />}
  </>;
}
