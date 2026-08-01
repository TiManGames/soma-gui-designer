import { useEffect } from "react";
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

export function App() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  // Global undo/redo keyboard shortcuts.
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

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
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

