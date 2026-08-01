import { useState } from "react";
import { useStore } from "../../state/store";
import { WIDGETS } from "@core/model/defaults";
import { getStruct } from "@core/schema/loadSchema";
import type { Override, WidgetNode } from "@core/model/nodes";
import { FieldEditor } from "./FieldEditor";

/**
 * Schema-driven override editor. Reads the struct schema for the node's
 * dataClass and renders a typed editor per field (color picker, enum dropdown,
 * float, bool, ...). Each edit round-trips through the `overrides` array, which
 * emitDataVar renders as `<var>.<path> = <expr>;`. Method-call and raw-field
 * escape hatches remain for power users.
 */
export function OverridesSection({ node }: { node: WidgetNode }) {
  const setOverrides = useStore((s) => s.setOverrides);
  const meta = WIDGETS[node.type];
  const [showAll, setShowAll] = useState(false);

  if (!meta.dataClass) return null;
  const struct = getStruct(meta.dataClass);

  // Index existing overrides by field path for quick lookup.
  const exprByPath = new Map<string, string>();
  const calls: { index: number; call: string }[] = [];
  node.overrides.forEach((ov, index) => {
    if (ov.kind === "expr") exprByPath.set(ov.path, ov.expr);
    else calls.push({ index, call: ov.call });
  });

  const setFieldExpr = (path: string, expr: string) => {
    const existing = node.overrides.findIndex((o) => o.kind === "expr" && o.path === path);
    const next: Override = { kind: "expr", path, expr };
    const overrides =
      existing >= 0
        ? node.overrides.map((o, i) => (i === existing ? next : o))
        : [...node.overrides, next];
    setOverrides(node.id, overrides);
  };

  const clearField = (path: string) => {
    setOverrides(
      node.id,
      node.overrides.filter((o) => !(o.kind === "expr" && o.path === path))
    );
  };

  const updateCall = (index: number, call: string) => {
    setOverrides(
      node.id,
      node.overrides.map((o, i) => (i === index ? { kind: "call", call } : o))
    );
  };
  const removeCall = (index: number) => {
    setOverrides(
      node.id,
      node.overrides.filter((_, i) => i !== index)
    );
  };
  const addCall = () => setOverrides(node.id, [...node.overrides, { kind: "call", call: "" }]);

  if (!struct) {
    // Schema missing (e.g. cStationGui_TextReaderSettings not extracted): fall
    // back to raw expr/call editing so nothing is lost.
    return (
      <div className="field-group">
        <h3>Overrides ({meta.dataClass})</h3>
        <p style={{ color: "var(--text-faint)", fontSize: 11.5, margin: "0 0 var(--s2)" }}>
          No struct schema; edit method calls below.
        </p>
        {calls.map(({ index, call }) => (
          <div className="override-row" key={index}>
            <input value={call} onChange={(e) => updateCall(index, e.target.value)} />
            <button className="danger" onClick={() => removeCall(index)}>
              ×
            </button>
          </div>
        ))}
        <div className="button-row">
          <button onClick={addCall}>+ Method</button>
        </div>
      </div>
    );
  }

  // Show overridden fields plus a curated set; "show all" expands the rest.
  const commonFields = new Set([
    "mColorBase",
    "mColorText",
    "mFontAlign",
    "mbUseBackgroundGfx",
    "mbUseFrame",
    "mHeaderType",
    "mbUseHeader",
    "mOrientation"
  ]);
  const visibleFields = struct.fields.filter(
    (f) => showAll || commonFields.has(f.name) || exprByPath.has(f.name)
  );

  return (
    <div className="field-group">
      <h3>
        Overrides{" "}
        <span style={{ color: "var(--muted)", textTransform: "none" }}>({meta.dataClass})</span>
      </h3>

      {visibleFields.map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={exprByPath.get(field.name)}
          onChange={(expr) => setFieldExpr(field.name, expr)}
          onClear={() => clearField(field.name)}
        />
      ))}

      <div className="button-row">
        <button onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show common fields" : `Show all ${struct.fields.length} fields`}
        </button>
      </div>

      {struct.methods.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>Method calls</h3>
          {calls.map(({ index, call }) => (
            <div className="override-row" key={index}>
              <input
                list={`methods-${node.id}`}
                value={call}
                placeholder="SetPadding(20,20,20,20)"
                onChange={(e) => updateCall(index, e.target.value)}
              />
              <button className="danger" onClick={() => removeCall(index)}>
                ×
              </button>
            </div>
          ))}
          <datalist id={`methods-${node.id}`}>
            {struct.methods.map((m) => (
              <option key={m} value={`${m}()`} />
            ))}
          </datalist>
          <div className="button-row">
            <button onClick={addCall}>+ Method</button>
          </div>
        </>
      )}
    </div>
  );
}
