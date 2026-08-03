import { useEffect, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { Palette } from "./components/Palette";
import { Canvas } from "./components/Canvas/Canvas";
import { HierarchyTree } from "./components/Hierarchy/HierarchyTree";
import { ValidationList } from "./components/ValidationList";
import { PropertyPanel } from "./components/Properties/PropertyPanel";
import { CodePanel } from "./components/CodeOutput/CodePanel";
import { DocumentControls } from "./components/DocumentControls";
import { Section } from "./components/Section";
import { useStore } from "./state/store";

const RIGHT_PANEL_MIN = 280;
const RIGHT_PANEL_MAX = 680;
const RIGHT_PANEL_DEFAULT = 380;

const STORAGE_KEY_RIGHT_WIDTH = "soma-gui:right-width";

function loadRightWidth(): number {
  try {
    const v = Number(localStorage.getItem(STORAGE_KEY_RIGHT_WIDTH));
    if (v >= RIGHT_PANEL_MIN && v <= RIGHT_PANEL_MAX) return v;
  } catch { /* ignore */ }
  return RIGHT_PANEL_DEFAULT;
}

export function App() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  const [rightWidth, setRightWidth] = useState(loadRightWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

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

  // Panel resize drag handlers.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      // Dragging leftward increases the panel width.
      const delta = dragRef.current.startX - e.clientX;
      const next = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, dragRef.current.startWidth + delta));
      setRightWidth(next);
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

  // Persist width across sessions via localStorage (not the document — purely UI pref).
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_RIGHT_WIDTH, String(rightWidth)); } catch { /* ignore */ }
  }, [rightWidth]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: rightWidth };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace" style={{ gridTemplateColumns: `264px minmax(360px, 1fr) 6px ${rightWidth}px` }}>
        <aside className="rail left">
          <Section title="Document">
            <DocumentControls />
          </Section>
          <Section title="Hierarchy">
            <HierarchyTree />
          </Section>
          <Section title="Add Widget">
            <Palette />
          </Section>
          <Section title="Validation">
            <ValidationList />
          </Section>
        </aside>

        <section className="canvas-panel">
          <Canvas />
        </section>

        {/* Drag handle — sits at the border between canvas and right rail */}
        <div className="rail-resize-handle" onMouseDown={startResize} title="Drag to resize panel" />

        <aside className="rail right">
          <Section title="Inspector">
            <PropertyPanel />
          </Section>
          <Section title="Generated Code">
            <CodePanel />
          </Section>
        </aside>
      </div>
    </div>
  );
}

