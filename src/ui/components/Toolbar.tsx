import { useRef } from "react";
import { useStore } from "../state/store";
import { generate } from "@core/codegen/generateHps";
import { isSomaDocument, CURRENT_SCHEMA_VERSION } from "@core/model/document";

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export function Toolbar() {
  const doc = useStore((s) => s.doc);
  const newDocument = useStore((s) => s.newDocument);
  const loadDocument = useStore((s) => s.loadDocument);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const previewTab = useStore((s) => s.previewTab);
  const fileInput = useRef<HTMLInputElement>(null);

  const onCopy = async () => {
    const { hps, preload } = generate(doc);
    await copyToClipboard(previewTab === "preload" ? preload : hps);
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.functionName || "soma-screen"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (isSomaDocument(parsed)) {
          loadDocument(parsed);
        } else {
          alert(`Unsupported document — expected a SOMA GUI Designer project (schema v${CURRENT_SCHEMA_VERSION}).`);
        }
      } catch {
        alert("Could not parse the selected file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="topbar">
      <div>
        <h1>SOMA GUI Designer</h1>
        <p>Visual composer for HPL3 ImGui terminal screens</p>
      </div>
      <div className="topbar-actions">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <button onClick={() => newDocument()}>New</button>
        <button onClick={() => fileInput.current?.click()}>Import</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={onImportFile}
        />
        <button onClick={onExport}>Export</button>
        <button className="primary" onClick={onCopy}>
          Copy Code
        </button>
      </div>
    </header>
  );
}
