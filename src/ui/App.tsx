import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Canvas } from "./components/Canvas/Canvas";
import { SidebarTabs } from "./components/Sidebar/SidebarTabs";
import { PropertyPanel } from "./components/Properties/PropertyPanel";
import { BottomDock } from "./components/BottomDock/BottomDock";
import { Section } from "./components/Section";
import { useStore } from "./state/store";

const RIGHT_MIN = 280;
const RIGHT_MAX = 680;
const RIGHT_DEFAULT = 380;
const LEFT_MIN = 200;
const LEFT_MAX = 440;
const LEFT_DEFAULT = 264;
const DOCK_MIN = 120;
const DOCK_MAX = 520;
const DOCK_DEFAULT = 200;

const KEY_RIGHT = "soma-gui:right-width";
const KEY_LEFT = "soma-gui:left-width";
const KEY_DOCK = "soma-gui:dock-height";

function loadNum(key: string, min: number, max: number, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    if (v >= min && v <= max) return v;
  } catch { /* ignore */ }
  return fallback;
}

type ResizeSide = "left" | "right" | "dock";

export function App() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const dockOpen = useStore((s) => s.dockOpen);

  const [rightWidth, setRightWidth] = useState(() => loadNum(KEY_RIGHT, RIGHT_MIN, RIGHT_MAX, RIGHT_DEFAULT));
  const [leftWidth, setLeftWidth] = useState(() => loadNum(KEY_LEFT, LEFT_MIN, LEFT_MAX, LEFT_DEFAULT));
  const [dockHeight, setDockHeight] = useState(() => loadNum(KEY_DOCK, DOCK_MIN, DOCK_MAX, DOCK_DEFAULT));

  const dragRef = useRef<{ side: ResizeSide; startPos: number; startSize: number } | null>(null);

  // Global undo/redo + delete keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        const { selectedId, deleteNode } = useStore.getState();
        if (selectedId) deleteNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Panel resize drag handlers (left rail, right rail, bottom dock).
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      if (d.side === "right") {
        // Dragging leftward widens the right rail.
        const delta = d.startPos - e.clientX;
        setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, d.startSize + delta)));
      } else if (d.side === "left") {
        // Dragging rightward widens the left rail.
        const delta = e.clientX - d.startPos;
        setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, d.startSize + delta)));
      } else {
        // Dragging upward grows the dock.
        const delta = d.startPos - e.clientY;
        setDockHeight(Math.min(DOCK_MAX, Math.max(DOCK_MIN, d.startSize + delta)));
      }
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Persist sizes across sessions (UI prefs, never into the document).
  useEffect(() => { try { localStorage.setItem(KEY_RIGHT, String(rightWidth)); } catch { /* ignore */ } }, [rightWidth]);
  useEffect(() => { try { localStorage.setItem(KEY_LEFT, String(leftWidth)); } catch { /* ignore */ } }, [leftWidth]);
  useEffect(() => { try { localStorage.setItem(KEY_DOCK, String(dockHeight)); } catch { /* ignore */ } }, [dockHeight]);

  const startResize = (side: ResizeSide) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = side === "dock" ? e.clientY : e.clientX;
    const startSize = side === "dock" ? dockHeight : side === "left" ? leftWidth : rightWidth;
    dragRef.current = { side, startPos, startSize };
    document.body.style.cursor = side === "dock" ? "ns-resize" : "ew-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="app">
      <Toolbar />
      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${leftWidth}px 6px minmax(360px, 1fr) 6px ${rightWidth}px`,
          gridTemplateRows: `1fr ${dockOpen ? "6px" : "0px"} ${dockOpen ? `${dockHeight}px` : "auto"}`,
          gridTemplateAreas: `
            "left lefthandle canvas railhandle right"
            "dockhandle dockhandle dockhandle dockhandle dockhandle"
            "dock dock dock dock dock"
          `
        }}
      >
        <aside className="rail left" style={{ gridArea: "left" }}>
          <SidebarTabs />
        </aside>

        <div
          className="rail-resize-handle"
          style={{ gridArea: "lefthandle" }}
          onMouseDown={startResize("left")}
          title="Drag to resize sidebar"
        />

        <section className="canvas-panel" style={{ gridArea: "canvas" }}>
          <Canvas />
        </section>

        <div
          className="rail-resize-handle"
          style={{ gridArea: "railhandle" }}
          onMouseDown={startResize("right")}
          title="Drag to resize panel"
        />

        <aside className="rail right" style={{ gridArea: "right" }}>
          <Section title="Inspector">
            <PropertyPanel />
          </Section>
        </aside>

        {dockOpen && (
          <div
            className="dock-resize-handle"
            onMouseDown={startResize("dock")}
            title="Drag to resize panel"
          />
        )}
        <BottomDock />
      </div>
    </div>
  );
}
