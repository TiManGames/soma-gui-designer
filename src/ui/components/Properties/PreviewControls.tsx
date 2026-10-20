import type { WidgetNode } from "@core/model/nodes";
import { usePreview } from "../../state/previewStore";
import type { PreviewState } from "@core/preview/types";
import { NumberInput } from "../NumberInput";
import { parseNumberLiteral } from "@core/model/literals";

export function PreviewControls({ node }: { node: WidgetNode }) {
  const s = usePreview(p => p.states[node.id]) ?? {}, set = usePreview(p => p.setState), reset = usePreview(p => p.reset);
  const stateful = ["station-button", "station-toggle-button", "repeat-button", "checkbox", "multi-toggle", "multi-select", "slider-h", "slider-v", "station-numpad"].includes(node.type);
  const numeric = node.type === "gauge" || node.type.startsWith("slider-");
  const scrolling = ["text-frame", "station-text-reader-single"].includes(node.type);
  const valueKey = numeric ? "value" : scrolling ? "scroll" : "selectedItem";
  const defaultValue = node.type === "gauge" ? parseNumberLiteral(node.fillExpr) ?? 0.5
    : "defaultValue" in node ? parseNumberLiteral(node.defaultValue) ?? 0.5 : 0;
  if (!stateful && !numeric && !scrolling) return null;
  return <div className="field-group">
    <h3>Preview state</h3><p className="preview-help">Editor only · does not change exported code</p>
    {stateful && (["focused", "pressed", "checked", "disabled"] as const).map(key => <label key={key} className="checkbox-row"><input type="checkbox" checked={s[key] ?? false} onChange={e => set(node.id, { [key]: e.target.checked })} />{key}</label>)}
    {(numeric || scrolling || node.type === "multi-select" || node.type === "multi-toggle") && <label>{numeric ? "Value" : scrolling ? "Scroll (rows)" : "Selected item (0-based)"}
      <NumberInput value={s[valueKey] ?? defaultValue} integer={valueKey === "selectedItem"} min={numeric ? undefined : 0}
        onCommit={value => set(node.id, { [valueKey]: value } as PreviewState)} /></label>}
    {stateful && <label>Preview time (seconds)<NumberInput value={s.time ?? 0} min={0} onCommit={time => set(node.id, { time })} /></label>}
    {node.type === "station-numpad" && <label>Display input<input value={s.input ?? ""} maxLength={node.digits} onChange={e => set(node.id, { input: e.target.value })} /></label>}
    <button onClick={() => reset(node.id)}>Reset preview state</button>
  </div>;
}
