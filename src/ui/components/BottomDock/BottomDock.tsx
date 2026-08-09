import { useStore, type DockTab } from "../../state/store";
import { generate } from "@core/codegen/generateHps";
import { validateDocument } from "@core/validate/validateDocument";
import { validateAgainstSchema } from "@core/validate/validateSchema";
import { ValidationList } from "../ValidationList";
import { postToHost } from "../../vscodeApi";

const TABS: { id: DockTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "hps", label: "Generated HPS" },
  { id: "preload", label: "Preload" },
  { id: "output", label: "Output" }
];

export function BottomDock() {
  const doc = useStore((s) => s.doc);
  const dockTab = useStore((s) => s.dockTab);
  const setDockTab = useStore((s) => s.setDockTab);
  const dockOpen = useStore((s) => s.dockOpen);
  const toggleDock = useStore((s) => s.toggleDock);

  const problemCount = [...validateDocument(doc), ...validateAgainstSchema(doc)].length;

  return (
    <div className="bottom-dock">
      <div className="dock-tabstrip">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`dock-tab${dockOpen && dockTab === t.id ? " active" : ""}`}
            onClick={() => {
              if (dockOpen && dockTab === t.id) toggleDock();
              else setDockTab(t.id);
            }}
          >
            {t.label}
            {t.id === "problems" && (
              <span className={`dock-badge${problemCount === 0 ? " zero" : ""}`}>{problemCount}</span>
            )}
          </button>
        ))}
        <div className="dock-actions">
          <button
            className="dock-collapse"
            title={dockOpen ? "Collapse panel" : "Expand panel"}
            onClick={toggleDock}
          >
            {dockOpen ? "▾" : "▴"}
          </button>
        </div>
      </div>
      {dockOpen && (
        <div className="dock-body">
          {dockTab === "problems" && <ValidationList />}
          {dockTab === "hps" && <DockCode kind="hps" />}
          {dockTab === "preload" && <DockCode kind="preload" />}
          {dockTab === "output" && (
            <div className="palette-empty">Output log is empty. Write or copy generated code to see activity here.</div>
          )}
        </div>
      )}
    </div>
  );
}

function DockCode({ kind }: { kind: "hps" | "preload" }) {
  const doc = useStore((s) => s.doc);
  const { hps, preload } = generate(doc);
  const code = kind === "preload" ? preload : hps;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--s2)" }}>
        <button className="ghost" onClick={() => postToHost({ type: "copy", text: code })}>
          Copy
        </button>
      </div>
      <pre className="code-preview">{code}</pre>
    </>
  );
}
