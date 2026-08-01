import { useStore } from "../state/store";
import { WIDGETS } from "@core/model/defaults";
import type { WidgetType } from "@core/model/nodes";

const ORDER: WidgetType[] = [
  "station-window",
  "group",
  "station-button",
  "station-toggle-button",
  "label",
  "text-frame",
  "image",
  "gauge",
  "fill",
  "station-numpad",
  "station-text-reader-single",
  "advanced-imgui"
];

export function Palette() {
  const addNode = useStore((s) => s.addNode);

  return (
    <div className="palette-grid">
      {ORDER.map((t) => (
        <button className="palette-btn" key={t} onClick={() => addNode(t)}>
          {WIDGETS[t].label}
        </button>
      ))}
    </div>
  );
}
