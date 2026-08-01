import { useState } from "react";
import { useStore } from "../../state/store";
import { generate } from "@core/codegen/generateHps";
import { postToHost } from "../../vscodeApi";

export function CodePanel() {
  const doc = useStore((s) => s.doc);
  const previewTab = useStore((s) => s.previewTab);
  const setPreviewTab = useStore((s) => s.setPreviewTab);
  const [copied, setCopied] = useState(false);

  const { hps, preload } = generate(doc);
  const code = previewTab === "preload" ? preload : hps;

  const copy = () => {
    postToHost({ type: "copy", text: code });
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <button className="ghost" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="code-preview">{code}</pre>
    </>
  );
}
