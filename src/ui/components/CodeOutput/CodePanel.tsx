import { useStore } from "../../state/store";
import { generate } from "@core/codegen/generateHps";

export function CodePanel() {
  const doc = useStore((s) => s.doc);
  const previewTab = useStore((s) => s.previewTab);
  const setPreviewTab = useStore((s) => s.setPreviewTab);

  const { hps, preload } = generate(doc);
  const code = previewTab === "preload" ? preload : hps;

  return (
    <section>
      <h2>Generated Code</h2>
      <div className="tabs">
        <button
          className={`tab${previewTab === "hps" ? " active" : ""}`}
          onClick={() => setPreviewTab("hps")}
        >
          HPS
        </button>
        <button
          className={`tab${previewTab === "preload" ? " active" : ""}`}
          onClick={() => setPreviewTab("preload")}
        >
          Preload
        </button>
      </div>
      <pre className="code-preview">{code}</pre>
    </section>
  );
}
