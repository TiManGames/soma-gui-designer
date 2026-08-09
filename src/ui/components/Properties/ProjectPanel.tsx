import { useStore } from "../../state/store";
import { RESOLUTION_PRESETS, type Target } from "@core/model/document";
import { NumberInput } from "../NumberInput";

/**
 * Inspector "Project" mode — shown when nothing is selected. Holds screen-level
 * metadata (target callback, function name, translation category, resolution)
 * that used to live in the left-rail Document section.
 */
export function ProjectPanel() {
  const doc = useStore((s) => s.doc);
  const setMeta = useStore((s) => s.setMeta);
  const setResolutionPreset = useStore((s) => s.setResolutionPreset);
  const setPreviewSize = useStore((s) => s.setPreviewSize);

  return (
    <>
      <div className="inspector-mode-label">Project settings</div>

      <div className="field-group">
        <h3>Screen</h3>
        <label>
          Target callback
          <select value={doc.target} onChange={(e) => setMeta({ target: e.target.value as Target })}>
            <option value="terminal-on-gui">Terminal OnGui (asEntityName, afTimeStep)</option>
            <option value="map-on-gui">Map OnGui (afTimeStep)</option>
            <option value="helper-function">Helper function (afTimeStep)</option>
          </select>
        </label>

        <label>
          Function name
          <input value={doc.functionName} onChange={(e) => setMeta({ functionName: e.target.value })} />
        </label>

        <label>
          Translation category
          <input
            value={doc.translationCategory}
            onChange={(e) => setMeta({ translationCategory: e.target.value })}
          />
        </label>
      </div>

      <div className="field-group">
        <h3>Resolution</h3>
        <label>
          Preset
          <select value={doc.resolutionPreset} onChange={(e) => setResolutionPreset(e.target.value)}>
            {RESOLUTION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="two-col">
          <label>
            Width
            <NumberInput
              value={doc.previewResolution.x}
              min={1}
              onCommit={(v) => setPreviewSize(v, doc.previewResolution.y)}
            />
          </label>
          <label>
            Height
            <NumberInput
              value={doc.previewResolution.y}
              min={1}
              onCommit={(v) => setPreviewSize(doc.previewResolution.x, v)}
            />
          </label>
        </div>
      </div>
    </>
  );
}
