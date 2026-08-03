import { useStore } from "../state/store";
import { RESOLUTION_PRESETS, type Target } from "@core/model/document";

export function DocumentControls() {
  const doc = useStore((s) => s.doc);
  const setMeta = useStore((s) => s.setMeta);
  const setResolutionPreset = useStore((s) => s.setResolutionPreset);
  const setPreviewSize = useStore((s) => s.setPreviewSize);

  return (
    <>
      <label>
        Target callback
        <select
          value={doc.target}
          onChange={(e) => setMeta({ target: e.target.value as Target })}
        >
          <option value="terminal-on-gui">Terminal OnGui (asEntityName, afTimeStep)</option>
          <option value="map-on-gui">Map OnGui (afTimeStep)</option>
          <option value="helper-function">Helper function (afTimeStep)</option>
        </select>
      </label>

      <label>
        Function name
        <input
          value={doc.functionName}
          onChange={(e) => setMeta({ functionName: e.target.value })}
        />
      </label>

      <label>
        Translation category
        <input
          value={doc.translationCategory}
          onChange={(e) => setMeta({ translationCategory: e.target.value })}
        />
      </label>

      <label>
        Resolution preset
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
          <input
            type="number"
            value={doc.previewResolution.x}
            onChange={(e) => setPreviewSize(Number(e.target.value) || 1, doc.previewResolution.y)}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            value={doc.previewResolution.y}
            onChange={(e) => setPreviewSize(doc.previewResolution.x, Number(e.target.value) || 1)}
          />
        </label>
      </div>

      <div className="two-col">
        <label>
          Grid size
          <input
            type="number"
            value={doc.gridSize}
            onChange={(e) => setMeta({ gridSize: Number(e.target.value) || 10 })}
          />
        </label>
        <div className="checkbox-row" style={{ alignSelf: "end" }}>
          <label>
            <input
              type="checkbox"
              checked={doc.snapToGrid}
              onChange={(e) => setMeta({ snapToGrid: e.target.checked })}
            />
            Snap to grid
          </label>
        </div>
      </div>
    </>
  );
}
