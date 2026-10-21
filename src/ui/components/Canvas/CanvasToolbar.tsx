import { useStore } from "../../state/store";
import { useViewport } from "../../state/viewportStore";
import { RESOLUTION_PRESETS } from "@core/model/document";
import { MAX_ZOOM, MIN_ZOOM, type CanvasZoom } from "@core/model/canvasScale";
import { NumberInput } from "../NumberInput";
import { Icon } from "../Icon";

export function CanvasToolbar({ onZoom = zoom => useViewport.getState().setZoom(zoom) }: { onZoom?: (zoom: CanvasZoom) => void }) {
  const doc = useStore(s => s.doc), setMeta = useStore(s => s.setMeta);
  const preset = useStore(s => s.setResolutionPreset);
  const wysiwyg = useStore(s => s.wysiwygEnabled), setWysiwyg = useStore(s => s.setWysiwygEnabled);
  const grid = useStore(s => s.gridVisible), toggleGrid = useStore(s => s.toggleGridVisible);
  const scale = useViewport(s => s.scale), zoom = useViewport(s => s.zoom);
  return <div className="canvas-toolbar">
    <div className="ct-group">
      <select className="ct-select resolution-select" aria-label="Resolution preset" value={doc.resolutionPreset} onChange={e => preset(e.target.value)}>
        {RESOLUTION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.id === "custom" ? `Custom · ${doc.previewResolution.x} × ${doc.previewResolution.y}` : p.label}</option>)}
      </select>
    </div>
    <div className="ct-group zoom-controls">
      <button className="ghost icon-btn" aria-label="Zoom out" disabled={scale <= MIN_ZOOM} onClick={() => onZoom(scale / 1.25)}><Icon name="minus" /></button>
      <select aria-label="Canvas zoom" className="ct-select zoom-select" value={zoom === "fit" ? "fit" : String(Math.round(scale * 100))}
        onChange={e => onZoom(e.target.value === "fit" ? "fit" : Number(e.target.value) / 100)}>
        <option value="fit">Fit · {Math.round(scale * 100)}%</option>
        {![10, 25, 50, 75, 100, 125, 150, 200, 300, 400].includes(Math.round(scale * 100)) && zoom !== "fit" && <option value={Math.round(scale * 100)}>{Math.round(scale * 100)}%</option>}
        {[10, 25, 50, 75, 100, 125, 150, 200, 300, 400].map(n => <option key={n} value={n}>{n}%</option>)}
      </select>
      <button className="ghost icon-btn" aria-label="Zoom in" disabled={scale >= MAX_ZOOM} onClick={() => onZoom(scale * 1.25)}><Icon name="plus" /></button>
      <button className={`ct-toggle${zoom === "fit" ? " active" : ""}`} aria-pressed={zoom === "fit"} onClick={() => onZoom("fit")}>Fit</button>
    </div>
    <div className="ct-group">
      <button className={`ct-toggle${grid ? " active" : ""}`} aria-pressed={grid} onClick={toggleGrid} title="Show grid"><Icon name="grid" />Grid</button>
      <NumberInput className="ct-num" value={doc.gridSize} integer min={1} aria-label="Grid size" title="Grid size (px)" onCommit={gridSize => setMeta({ gridSize })} />
      <button className={`ct-toggle${doc.snapToGrid ? " active" : ""}`} aria-pressed={doc.snapToGrid} title="Snap widgets to grid" onClick={() => setMeta({ snapToGrid: !doc.snapToGrid })}><Icon name="snap" />Snap</button>
    </div>
    <div className="ct-spacer" />
    <div className="render-switch" role="group" aria-label="Canvas rendering">
      <button aria-pressed={wysiwyg} className={wysiwyg ? "active" : ""} onClick={() => setWysiwyg(true)}>Game textures</button>
      <button aria-pressed={!wysiwyg} className={!wysiwyg ? "active" : ""} onClick={() => setWysiwyg(false)}>Wireframe</button>
    </div>
  </div>;
}
