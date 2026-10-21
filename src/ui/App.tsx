import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Canvas } from "./components/Canvas/Canvas";
import { SidebarTabs } from "./components/Sidebar/SidebarTabs";
import { PropertyPanel } from "./components/Properties/PropertyPanel";
import { BottomDock } from "./components/BottomDock/BottomDock";
import { InsertPopover } from "./components/InsertPopover";
import { useStore } from "./state/store";
import { useWorkspace } from "./state/workspaceStore";

const LIMITS = { left: [200, 440, 240], right: [280, 680, 340], dock: [120, 520, 200] } as const;
type Side = keyof typeof LIMITS;
const KEYS: Record<Side, string> = { left: "soma-gui:left-width", right: "soma-gui:right-width", dock: "soma-gui:dock-height" };
function loadSize(side: Side) {
  const [min, max, fallback] = LIMITS[side];
  try { const n = Number(localStorage.getItem(KEYS[side])); return n >= min && n <= max ? n : fallback; } catch { return fallback; }
}
function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest("input,textarea,select,[contenteditable=true],dialog,[role=dialog]");
}
export function App() {
  const dockOpen = useStore(s => s.dockOpen);
  const leftOpen = useWorkspace(s => s.leftOpen), rightOpen = useWorkspace(s => s.rightOpen);
  const focusMode = useWorkspace(s => s.focusMode);
  const [sizes, setSizes] = useState(() => ({ left: loadSize("left"), right: loadSize("right"), dock: loadSize("dock") }));
  const [available, setAvailable] = useState(1280);
  const workspace = useRef<HTMLDivElement>(null);
  const drag = useRef<{ side: Side; start: number; size: number } | null>(null);
  const showLeft = leftOpen && !focusMode, showRight = rightOpen && !focusMode;
  const showDock = !focusMode && dockOpen;
  // Shrink rails proportionally before taking space from the artboard.
  const requested = (showLeft ? sizes.left : 0) + (showRight ? sizes.right : 0);
  const factor = requested ? Math.min(1, Math.max(160, available - 320 - 12) / requested) : 1;
  const adjustSize = (side: Side, value: number) => setSizes(s => ({ ...s, [side]: Math.max(LIMITS[side][0], Math.min(LIMITS[side][1], value)) }));

  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setAvailable(element.clientWidth));
    observer.observe(element); setAvailable(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    for (const side of Object.keys(KEYS) as Side[]) {
      try { localStorage.setItem(KEYS[side], String(sizes[side])); } catch { /* Optional UI preferences. */ }
    }
  }, [sizes]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const state = useStore.getState(), ui = useWorkspace.getState();
      if (e.key === "Escape" && ui.focusMode) { ui.toggleFocus(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); if (e.shiftKey) state.redo(); else state.undo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selectedId) {
        e.preventDefault(); state.deleteNode(state.selectedId);
      }
    }
    const finish = () => { drag.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    function onMove(e: MouseEvent) {
      const d = drag.current; if (!d) return;
      const delta = d.side === "dock" ? d.start - e.clientY : d.side === "right" ? d.start - e.clientX : e.clientX - d.start;
      adjustSize(d.side, d.size + delta);
    }
    window.addEventListener("keydown", onKey); window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", finish); window.addEventListener("blur", finish);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", finish); window.removeEventListener("blur", finish); };
  }, []);
  const handle = (side: Side) => <div className={side === "dock" ? "dock-resize-handle" : "rail-resize-handle"}
    style={{ gridArea: side === "dock" ? "dockhandle" : side === "left" ? "lefthandle" : "railhandle" }}
    role="separator" aria-label={`Resize ${side} panel`} aria-orientation={side === "dock" ? "horizontal" : "vertical"}
    aria-valuemin={LIMITS[side][0]} aria-valuemax={LIMITS[side][1]} aria-valuenow={sizes[side]} tabIndex={0}
    onMouseDown={e => {
      if (e.button !== 0) return; e.preventDefault();
      drag.current = { side, start: side === "dock" ? e.clientY : e.clientX, size: sizes[side] };
      document.body.style.cursor = side === "dock" ? "ns-resize" : "ew-resize"; document.body.style.userSelect = "none";
    }}
    onKeyDown={e => {
      const negative = side === "dock" ? "ArrowDown" : side === "right" ? "ArrowRight" : "ArrowLeft";
      const positive = side === "dock" ? "ArrowUp" : side === "right" ? "ArrowLeft" : "ArrowRight";
      if (e.key === negative || e.key === positive) { e.preventDefault(); adjustSize(side, sizes[side] + (e.key === positive ? 16 : -16)); }
    }} />;

  return <div className={`app${focusMode ? " focus-mode" : ""}`}>
    <Toolbar />
    <div className="workspace" ref={workspace} style={{
      gridTemplateColumns: `${showLeft ? sizes.left * factor : 0}px ${showLeft ? 5 : 0}px minmax(0, 1fr) ${showRight ? 5 : 0}px ${showRight ? sizes.right * factor : 0}px`,
      gridTemplateRows: `minmax(0, 1fr) ${showDock ? 5 : 0}px ${focusMode ? 0 : showDock ? `min(${sizes.dock}px, 45%)` : "34px"}`,
      gridTemplateAreas: '"left lefthandle canvas railhandle right" "dockhandle dockhandle dockhandle dockhandle dockhandle" "dock dock dock dock dock"'
    }}>
      {showLeft && <aside className="rail left" style={{ gridArea: "left" }} aria-label="Elements and assets"><SidebarTabs /></aside>}
      {showLeft && handle("left")}
      <section className="canvas-panel" style={{ gridArea: "canvas" }} aria-label="Design canvas"><Canvas /></section>
      {showRight && handle("right")}
      {showRight && <aside className="rail right" style={{ gridArea: "right" }} aria-label="Inspector"><PropertyPanel /></aside>}
      {showDock && handle("dock")}
      {!focusMode && <BottomDock />}
    </div>
    <StatusBar />
    <InsertPopover />
  </div>;
}
function StatusBar() {
  const size = useStore(s => s.doc.previewResolution);
  return <footer className="status-bar"><span>{size.x} × {size.y}</span><span className="navigation-hints">Space + drag to pan <span className="status-divider">|</span> Ctrl / ⌘ + scroll to zoom</span><span>Ready</span></footer>;
}
