import { useStore } from "../../state/store";
import { RESOLUTION_PRESETS, type Target } from "@core/model/document";
import { NumberInput } from "../NumberInput";
import { PropertyGroup } from "./PropertyGroup";
import { Icon } from "../Icon";

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
      <PropertyGroup title="Screen" preferenceKey="project-screen">
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
      </PropertyGroup>

      <PropertyGroup title="Resolution" preferenceKey="project-resolution">
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
              integer
              min={1}
              onCommit={(v) => setPreviewSize(v, doc.previewResolution.y)}
            />
          </label>
          <label>
            Height
            <NumberInput
              value={doc.previewResolution.y}
              integer
              min={1}
              onCommit={(v) => setPreviewSize(doc.previewResolution.x, v)}
            />
          </label>
        </div>
      </PropertyGroup>
      <PropertyGroup title="Reset layout" defaultOpen={false}>
        <p className="inspector-help">Replace this screen with the starter layout. You can undo this change.</p>
        <button className="danger" onClick={() => {
          if (confirm("Replace this design with the starter layout? You can undo this change.")) useStore.getState().newDocument();
        }}><Icon name="undo" />Reset to starter layout</button>
      </PropertyGroup>
    </>
  );
}
