import { useStore } from "../../state/store";
import { previewSize } from "@core/model/geometry";
import { RESOLUTION_PRESETS } from "@core/model/document";
import { NumberInput } from "../NumberInput";
import { canvasScale } from "@core/model/canvasScale";

/**
 * Canvas toolbar: resolution preset + custom W/H, fit-only zoom readout,
 * grid size + snap, grid/guides visibility, and the WYSIWYG (Preview) toggle.
 * Zoom is fit-only — the canvas always scales to min(1, MAX/width); we only
 * display the resulting percentage, never drive it.
 */
export function CanvasToolbar() {
  const doc = useStore((s) => s.doc);
  const setMeta = useStore((s) => s.setMeta);
  const setResolutionPreset = useStore((s) => s.setResolutionPreset);
  const setPreviewSize = useStore((s) => s.setPreviewSize);
  const wysiwygEnabled = useStore((s) => s.wysiwygEnabled);
  const toggleWysiwyg = useStore((s) => s.toggleWysiwyg);

  const size = previewSize(doc);
  const scale = canvasScale(size);

  return (
    <div className="canvas-toolbar">
      <div className="ct-group">
        <select
          className="ct-select"
          value={doc.resolutionPreset}
          title="Resolution preset"
          onChange={(e) => setResolutionPreset(e.target.value)}
        >
          {RESOLUTION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <NumberInput
          className="ct-num"
          value={doc.previewResolution.x}
          integer
          min={1}
          title="Width (px)"
          onCommit={(v) => setPreviewSize(v, doc.previewResolution.y)}
        />
        <span className="ct-label">×</span>
        <NumberInput
          className="ct-num"
          value={doc.previewResolution.y}
          integer
          min={1}
          title="Height (px)"
          onCommit={(v) => setPreviewSize(doc.previewResolution.x, v)}
        />
      </div>

      <div className="ct-group">
        <span className="ct-label">Fit</span>
        <span className="ct-readout">{Math.round(scale * 100)}%</span>
      </div>

      <div className="ct-group">
        <span className="ct-label">Grid</span>
        <NumberInput
          className="ct-num"
          value={doc.gridSize}
          integer
          min={1}
          title="Grid size (px)"
          onCommit={(v) => setMeta({ gridSize: v })}
        />
        <button
          className={`ct-toggle${doc.snapToGrid ? " active" : ""}`}
          title="Snap dragged widgets to the grid"
          onClick={() => setMeta({ snapToGrid: !doc.snapToGrid })}
        >
          Snap
        </button>
      </div>

      <div className="ct-spacer" />

      <div className="ct-group">
        <button
          className={`ct-toggle${wysiwygEnabled ? " active" : ""}`}
          title="Toggle rendering real game textures & colors on the canvas"
          onClick={toggleWysiwyg}
        >
          Preview {wysiwygEnabled ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
