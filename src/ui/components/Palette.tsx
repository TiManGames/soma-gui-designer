import { useStore } from "../state/store";
import { WIDGETS, type WidgetMeta } from "@core/model/defaults";
import type { WidgetType } from "@core/model/nodes";

const CATEGORIES: { title: string; category: WidgetMeta["category"] }[] = [
  { title: "Containers", category: "container" },
  { title: "Elements", category: "element" },
  { title: "Background", category: "background" },
  { title: "Helpers", category: "helper" },
  { title: "Advanced", category: "advanced" }
];

export function Palette() {
  const addNode = useStore((s) => s.addNode);

  return (
    <>
      {CATEGORIES.map(({ title, category }) => {
        const types = (Object.keys(WIDGETS) as WidgetType[]).filter(
          (t) => WIDGETS[t].category === category
        );
        if (types.length === 0) return null;
        return (
          <div className="palette-group" key={category}>
            <div className="palette-group-label">{title}</div>
            <div className="palette-grid">
              {types.map((t) => (
                <button className="palette-btn" key={t} onClick={() => addNode(t)}>
                  {WIDGETS[t].label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
