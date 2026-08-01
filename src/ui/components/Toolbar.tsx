import { useStore } from "../state/store";
import { generate } from "@core/codegen/generateHps";
import { postToHost } from "../vscodeApi";

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
  const previewTab = useStore((s) => s.previewTab);

  const onCopy = () => {
    const { hps, preload } = generate(doc);
    postToHost({ type: "copy", text: previewTab === "preload" ? preload : hps });
  };

  const onWriteHps = () => {
    const { hps } = generate(doc);
    postToHost({ type: "writeHps", text: hps, suggestedName: hpsName(doc.functionName) });
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
        <button className="ghost" onClick={() => newDocument()} title="Reset to a fresh starter layout">
          Reset
        </button>
        <span className="toolbar-divider" />
        <button className="ghost" onClick={onWriteHps} title="Write generated HPS to a .hps file">
          Write .hps
        </button>
        <button className="primary" onClick={onCopy}>
          Copy Code
        </button>
      </div>
    </header>
  );
}
