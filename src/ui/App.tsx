import { useEffect } from "react";
import { Toolbar } from "./components/Toolbar";
import { Palette } from "./components/Palette";
import { Canvas } from "./components/Canvas/Canvas";
import { HierarchyTree } from "./components/Hierarchy/HierarchyTree";
import { ValidationList } from "./components/ValidationList";
import { PropertyPanel } from "./components/Properties/PropertyPanel";
import { CodePanel } from "./components/CodeOutput/CodePanel";
import { DocumentControls } from "./components/DocumentControls";
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
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <>
      <Toolbar />
      <main className="app-shell">
        <aside className="panel palette-panel">
          <DocumentControls />
          <Palette />
          <section>
            <h2>Blocks</h2>
            <HierarchyTree />
          </section>
          <section>
            <h2>Validation</h2>
            <ValidationList />
          </section>
        </aside>

        <section className="canvas-panel">
          <Canvas />
        </section>

        <aside className="panel properties-panel">
          <PropertyPanel />
          <CodePanel />
        </aside>
      </main>
    </>
  );
}
