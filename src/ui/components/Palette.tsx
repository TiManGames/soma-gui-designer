import { useStore } from "../state/store";
import { WIDGETS, type WidgetMeta } from "@core/model/defaults";
import type { WidgetType } from "@core/model/nodes";

const CATEGORIES: { title: string; category: WidgetMeta["category"] }[] = [
  { title: "Containers", category: "container" },
  { title: "Elements", category: "element" },
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
        return (
          <section key={category}>
            <h2>{title}</h2>
            <div className="palette-grid">
              {types.map((t) => (
                <button key={t} onClick={() => addNode(t)}>
                  {WIDGETS[t].label}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
