import { useState } from "react";
import { useStore } from "../state/store";
import { useWorkspace } from "../state/workspaceStore";
import { generate } from "@core/codegen/generateHps";
import { postToHost } from "../vscodeApi";
import { ContextMenu, type ContextMenuEntry } from "./Canvas/ContextMenu";
import { Icon } from "./Icon";

function hpsName(name: string) { return `${(name || "soma_screen").replace(/[^A-Za-z0-9_]/g, "") || "soma_screen"}.hps`; }
export function Toolbar() {
  const doc = useStore(s => s.doc), undo = useStore(s => s.undo), redo = useStore(s => s.redo);
  const canUndo = useStore(s => s.past.length > 0), canRedo = useStore(s => s.future.length > 0);
  const left = useWorkspace(s => s.leftOpen), right = useWorkspace(s => s.rightOpen);
  const focus = useWorkspace(s => s.focusMode), project = useWorkspace(s => s.projectSettings);
  const ui = useWorkspace;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const exportItems = (): ContextMenuEntry[] => {
    const { hps, preload } = generate(doc);
    return [
      { label: "Copy HPS", onClick: () => postToHost({ type: "copy", text: hps }) },
      { label: "Copy preload", onClick: () => postToHost({ type: "copy", text: preload }) },
      { separator: true },
      { label: "Write .hps file…", onClick: () => postToHost({ type: "writeHps", text: hps, suggestedName: hpsName(doc.functionName) }) }
    ];
  };
  return <header className="topbar">
    <div className="toolbar-leading">
      <div className="brand"><span className="brand-logo"><Icon name="window" /></span><h1>SOMA GUI Designer</h1></div>
      <span className="toolbar-divider" />
      <span className="document-name" title={doc.functionName}>{doc.functionName || "Untitled screen"}</span>
      <div className="toolbar-history">
        <button className="ghost icon-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="ghost icon-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Icon name="redo" /></button>
      </div>
    </div>
    <div className="topbar-actions">
      <button className={`ghost project-trigger${project ? " active" : ""}`} onClick={() => ui.getState().showProject()} title="Project settings"><Icon name="settings" /><span>Project settings</span></button>
      <div className="panel-controls">
        <button className="ghost icon-btn" aria-label="Toggle layers panel" aria-pressed={left && !focus} onClick={() => ui.getState().togglePanel("left")} title="Toggle layers panel"><Icon name="left" /></button>
        <button className="ghost icon-btn" aria-label="Toggle inspector" aria-pressed={right && !focus} onClick={() => ui.getState().togglePanel("right")} title="Toggle inspector"><Icon name="rightPanel" /></button>
      </div>
      <button className={`ghost icon-btn${focus ? " active" : ""}`} onClick={() => ui.getState().toggleFocus()} aria-label={focus ? "Exit focus mode" : "Focus canvas"} aria-pressed={focus} title={focus ? "Exit focus mode (Esc)" : "Focus canvas"}><Icon name="focus" /></button>
      <button className="primary export-trigger" aria-haspopup="menu" aria-expanded={!!menu} onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect(); setMenu({ x: Math.max(8, rect.right - 200), y: rect.bottom + 4 });
      }}>Export<Icon name="down" /></button>
    </div>
    {menu && <ContextMenu x={menu.x} y={menu.y} items={exportItems()} onClose={() => setMenu(null)} />}
  </header>;
}
