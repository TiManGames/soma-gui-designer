import { useStore } from "../../state/store";
import { WIDGETS } from "@core/model/defaults";
import type { Override, WidgetNode } from "@core/model/nodes";

/**
 * Structured override editor. In M2 this is a raw expr/call list; M4 layers
 * schema-driven typed field editors (color pickers, enum dropdowns, ...) on top,
 * writing into the same `overrides` array.
 */
export function OverridesSection({ node }: { node: WidgetNode }) {
  const setOverrides = useStore((s) => s.setOverrides);
  const meta = WIDGETS[node.type];

  if (!meta.dataClass) return null;

  const update = (index: number, next: Override) => {
    const overrides = node.overrides.map((o, i) => (i === index ? next : o));
    setOverrides(node.id, overrides);
  };
  const remove = (index: number) => {
    setOverrides(
      node.id,
      node.overrides.filter((_, i) => i !== index)
    );
  };
  const add = (kind: Override["kind"]) => {
    const next: Override =
      kind === "expr" ? { kind: "expr", path: "", expr: "" } : { kind: "call", call: "" };
    setOverrides(node.id, [...node.overrides, next]);
  };

  return (
    <div className="field-group">
      <h3>
        Overrides <span style={{ color: "var(--muted)", textTransform: "none" }}>({meta.dataClass})</span>
      </h3>

      {node.overrides.map((ov, i) =>
        ov.kind === "expr" ? (
          <div className="override-row" key={i}>
            <div className="two-col">
              <input
                placeholder="field path (e.g. mColorBase)"
                value={ov.path}
                onChange={(e) => update(i, { ...ov, path: e.target.value })}
              />
              <input
                placeholder="expression"
                value={ov.expr}
                onChange={(e) => update(i, { ...ov, expr: e.target.value })}
              />
            </div>
            <button className="danger" onClick={() => remove(i)}>
              ×
            </button>
          </div>
        ) : (
          <div className="override-row" key={i}>
            <input
              placeholder="method call (e.g. SetPadding(20,20,20,20))"
              value={ov.call}
              onChange={(e) => update(i, { ...ov, call: e.target.value })}
            />
            <button className="danger" onClick={() => remove(i)}>
              ×
            </button>
          </div>
        )
      )}

      <div className="button-row">
        <button onClick={() => add("expr")}>+ Field</button>
        <button onClick={() => add("call")}>+ Method</button>
      </div>
    </div>
  );
}
