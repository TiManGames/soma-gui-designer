import { useStore, type DockTab } from "../../state/store";
import { generate } from "@core/codegen/generateHps";
import { validationIssues } from "../../validation";
import { Icon } from "../Icon";
import { ValidationList } from "../ValidationList";
import { postToHost } from "../../vscodeApi";

const TABS: { id: DockTab; label: string }[] = [
  { id: "problems", label: "Problems" },
  { id: "hps", label: "Generated HPS" },
  { id: "preload", label: "Preload" }
];

export function BottomDock() {
  const doc = useStore((s) => s.doc);
  const dockTab = useStore((s) => s.dockTab);
  const setDockTab = useStore((s) => s.setDockTab);
  const dockOpen = useStore((s) => s.dockOpen);
  const toggleDock = useStore((s) => s.toggleDock);

  const problemCount = validationIssues(doc).length;

  return (
    <div className="bottom-dock">
      <div className="dock-tabstrip">
        {TABS.map((t) => (
          <button
            key={t.id}
            aria-expanded={dockOpen && dockTab === t.id}
            aria-controls="dock-content"
            className={`dock-tab${dockOpen && dockTab === t.id ? " active" : ""}`}
            onClick={() => {
              if (dockOpen && dockTab === t.id) toggleDock();
              else setDockTab(t.id);
            }}
          >
            <Icon name={t.id === "problems" ? "alert" : "code"} />
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
            aria-label={dockOpen ? "Collapse code panel" : "Expand code panel"}
            onClick={toggleDock}
          >
            <Icon name="down" style={{ transform: dockOpen ? "none" : "rotate(180deg)" }} />
          </button>
        </div>
      </div>
      {dockOpen && (
        <div className="dock-body" id="dock-content" role="region" aria-label={TABS.find(t => t.id === dockTab)?.label}>
          {dockTab === "problems" && <ValidationList />}
          {dockTab === "hps" && <DockCode kind="hps" />}
          {dockTab === "preload" && <DockCode kind="preload" />}
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
