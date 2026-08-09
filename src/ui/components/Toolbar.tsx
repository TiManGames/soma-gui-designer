import { useState } from "react";
import { useStore } from "../state/store";
import { generate } from "@core/codegen/generateHps";
import { postToHost } from "../vscodeApi";
import { ContextMenu, type ContextMenuEntry } from "./Canvas/ContextMenu";

/** Derive a suggested .hps filename from the function name. */
function hpsName(functionName: string): string {
  const base = (functionName || "soma_screen").replace(/[^A-Za-z0-9_]/g, "") || "soma_screen";
  return `${base}.hps`;
}

export function Toolbar() {
  const doc = useStore((s) => s.doc);
  const newDocument = useStore((s) => s.newDocument);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const wysiwygEnabled = useStore((s) => s.wysiwygEnabled);
  const toggleWysiwyg = useStore((s) => s.toggleWysiwyg);
  const setDockTab = useStore((s) => s.setDockTab);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const openExport = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ x: rect.right - 200, y: rect.bottom + 4 });
  };

  const exportItems = (): ContextMenuEntry[] => {
    const { hps, preload } = generate(doc);
    return [
      { label: "Copy HPS", onClick: () => postToHost({ type: "copy", text: hps }) },
      { label: "Copy preload", onClick: () => postToHost({ type: "copy", text: preload }) },
      { separator: true },
      {
        label: "Write .hps file…",
        onClick: () =>
          postToHost({ type: "writeHps", text: hps, suggestedName: hpsName(doc.functionName) })
      },
      { separator: true },
      {
        label: "Reset to starter layout",
        danger: true,
        onClick: () => {
          if (confirm("Reset the design to a fresh starter layout? This cannot be undone via file history.")) {
            newDocument();
          }
        }
      }
    ];
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden />
        <div>
          <h1>SOMA GUI Designer</h1>
          <p>Visual composer for HPL3 ImGui terminal screens</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="ghost icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button className="ghost icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
        <span className="toolbar-divider" />
        <button
          className={`ghost${wysiwygEnabled ? " " : ""}`}
          onClick={toggleWysiwyg}
          title="Toggle rendering real game textures & colors on the canvas"
        >
          Preview
        </button>
        <button
          className="ghost"
          onClick={() => setDockTab("problems")}
          title="Show validation problems"
        >
          Validate
        </button>
        <button className="primary" onClick={openExport}>
          Export ▾
        </button>
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={exportItems()} onClose={() => setMenu(null)} />
      )}
    </header>
  );
}
