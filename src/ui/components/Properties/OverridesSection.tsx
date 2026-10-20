import { useState } from "react";
import { useStore } from "../../state/store";
import { WIDGETS } from "@core/model/defaults";
import { getStruct, getStructField } from "@core/schema/loadSchema";
import type { FieldCategory, StructField } from "@core/schema/api-schema.types";
import type { Override, WidgetNode, WidgetType } from "@core/model/nodes";
import { getFrameGfxDefaults } from "@core/model/frameDefaults";
import { FieldEditor } from "./FieldEditor";
import { FrameGfxEditor } from "./FrameGfxEditor";
import { ExpressionControl } from "./ExpressionControl";
import { clearFieldOverride, getGfxFieldValue, setFieldExpression } from "@core/model/overrides";

// ---- Hand-authored param fields for bg-* widgets (no dataClass) ----------------

const BG_PARAM_FIELDS: Partial<Record<WidgetType, StructField[]>> = {
  "bg-scanlines": [
    { name: "zDepth", type: "float",   category: "float"  as FieldCategory },
    { name: "file",   type: "tString", category: "gfx"    as FieldCategory }
  ],
  "bg-backdrop": [
    { name: "file",    type: "tString", category: "gfx"   as FieldCategory },
    { name: "relPosX", type: "float",   category: "float" as FieldCategory },
    { name: "relPosY", type: "float",   category: "float" as FieldCategory },
    { name: "relSize", type: "float",   category: "float" as FieldCategory },
    { name: "zDepth",  type: "float",   category: "float" as FieldCategory }
  ],
  "bg-flat-color": [
    { name: "zDepth", type: "float",  category: "float" as FieldCategory },
    { name: "color",  type: "cColor", category: "color" as FieldCategory }
  ],
  "bg-ornament-tl": [
    { name: "file",   type: "tString", category: "gfx"   as FieldCategory },
    { name: "zDepth", type: "float",   category: "float" as FieldCategory },
    { name: "color",  type: "cColor",  category: "color" as FieldCategory }
  ],
  "bg-ornament-tr": [
    { name: "file",   type: "tString", category: "gfx"   as FieldCategory },
    { name: "zDepth", type: "float",   category: "float" as FieldCategory },
    { name: "color",  type: "cColor",  category: "color" as FieldCategory }
  ],
  "bg-ornament-br": [
    { name: "file",   type: "tString", category: "gfx"   as FieldCategory },
    { name: "zDepth", type: "float",   category: "float" as FieldCategory },
    { name: "color",  type: "cColor",  category: "color" as FieldCategory }
  ],
  "bg-ornament-bl": [
    { name: "file",   type: "tString", category: "gfx"   as FieldCategory },
    { name: "zDepth", type: "float",   category: "float" as FieldCategory },
    { name: "color",  type: "cColor",  category: "color" as FieldCategory }
  ]
};

// ---- Per-widget curated field groups -------------------------------------------

interface FieldGroup {
  title: string;
  /** Field names from the struct schema. */
  fields: string[];
  /** If set, renders a FrameGfxEditor for this fieldName instead of per-field editors. */
  frameGfx?: string;
}

const WIDGET_FIELD_GROUPS: Partial<Record<WidgetType, FieldGroup[]>> = {
  "station-button": [
    { title: "Frame", frameGfx: "mGfxFrame",
      fields: [] },
    { title: "Background",
      fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "States",
      fields: ["mbUseFrame", "mGfxInFocus", "mbUseInFocusGfx", "mGfxTriggered", "mbUseTriggeredGfx"] },
    { title: "Colors",
      fields: ["mColorBase", "mColorText", "mColorInFocus", "mbUseInFocusColor",
               "mColorTriggered", "mbUseTriggeredColor", "mColorDisabled", "mbUseDisabledColor"] },
    { title: "Text",
      fields: ["mFontAlign", "mbClipText", "mfScrollSpeed", "mfScrollStartDelay", "mfScrollResetDelay"] },
    { title: "Size", fields: ["mvDefaultSize"] }
  ],
  "station-toggle-button": [
    { title: "Frame", frameGfx: "mGfxFrame", fields: [] },
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "States",
      fields: ["mbUseFrame", "mGfxInFocus", "mbUseInFocusGfx", "mGfxTriggered", "mbUseTriggeredGfx"] },
    { title: "Colors",
      fields: ["mColorBase", "mColorText", "mColorInFocus", "mbUseInFocusColor",
               "mColorTriggered", "mbUseTriggeredColor", "mColorDisabled", "mbUseDisabledColor"] },
    { title: "Text",
      fields: ["mFontAlign", "mbClipText", "mfScrollSpeed", "mfScrollStartDelay", "mfScrollResetDelay"] },
    { title: "Size", fields: ["mvDefaultSize"] }
  ],
  "repeat-button": [
    { title: "Frame", frameGfx: "mGfxFrame", fields: [] },
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "States",
      fields: ["mbUseFrame", "mGfxInFocus", "mbUseInFocusGfx", "mGfxTriggered", "mbUseTriggeredGfx"] },
    { title: "Colors",
      fields: ["mColorBase", "mColorText", "mColorInFocus", "mbUseInFocusColor",
               "mColorTriggered", "mbUseTriggeredColor", "mColorDisabled", "mbUseDisabledColor"] },
    { title: "Text",
      fields: ["mFontAlign", "mbClipText", "mfScrollSpeed", "mfScrollStartDelay", "mfScrollResetDelay"] },
    { title: "Size", fields: ["mvDefaultSize"] }
  ],
  "multi-toggle": [
    { title: "Frame", frameGfx: "mGfxFrame", fields: [] },
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "States",
      fields: ["mbUseFrame", "mGfxInFocus", "mbUseInFocusGfx", "mGfxTriggered", "mbUseTriggeredGfx"] },
    { title: "Colors",
      fields: ["mColorBase", "mColorText", "mColorInFocus", "mbUseInFocusColor",
               "mColorTriggered", "mbUseTriggeredColor", "mColorDisabled", "mbUseDisabledColor"] },
    { title: "Text",
      fields: ["mFontAlign", "mbClipText", "mfScrollSpeed", "mfScrollStartDelay", "mfScrollResetDelay"] },
    { title: "Size", fields: ["mvDefaultSize"] }
  ],
  "station-window": [
    { title: "Window Frame", frameGfx: "mGfxWindowData", fields: [] },
    { title: "Label Frame",  frameGfx: "mGfxLabelData",  fields: [] },
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "Colors",     fields: ["mColorBase"] },
    { title: "Header",     fields: ["mbUseHeader", "mHeaderType", "mfCaptionSizeMul"] },
    { title: "Padding",    fields: ["mfPaddingTop", "mfPaddingRight", "mfPaddingBottom", "mfPaddingLeft"] },
    { title: "Label Pad",  fields: ["mfLabelPaddingTop", "mfLabelPaddingRight", "mfLabelPaddingBottom", "mfLabelPaddingLeft"] },
    { title: "Label",      fields: ["mfLabelMinWidth", "mvLabelOffset"] },
    { title: "Text",       fields: ["mFontAlign"] }
  ],
  "frame": [
    { title: "Frame", frameGfx: "mFrameGfx", fields: [] },
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "Colors",     fields: ["mColorBase", "mColorText", "mColorDisabled"] }
  ],
  "text-frame": [
    { title: "Background", fields: ["mbUseBackgroundGfx", "mGfxBackground"] },
    { title: "Colors",     fields: ["mColorBase", "mColorText", "mColorDisabled"] },
    { title: "Text",       fields: ["mFontAlign", "mbUseDisabledColor"] }
  ],
  "gauge": [
    { title: "Frame", frameGfx: "mGfxFrame", fields: [] },
    { title: "Textures",   fields: ["mbUseFrame", "mbUseBackgroundGfx", "mGfxBackground", "mGfxFill", "mbUseFillUV"] },
    { title: "Colors",     fields: ["mColorBase", "mColorText"] },
    { title: "Layout",     fields: ["mOrientation"] }
  ],
  "slider-h": [
    { title: "Textures",
      fields: ["mGfxBackground", "mGfxBaseInFocus", "mGfxButton", "mGfxButtonInFocus"] },
    { title: "Colors",     fields: ["mColorBase"] },
    { title: "Text",       fields: ["mFontAlign"] }
  ],
  "slider-v": [
    { title: "Textures",
      fields: ["mGfxBackground", "mGfxBaseInFocus", "mGfxButton", "mGfxButtonInFocus"] },
    { title: "Colors",     fields: ["mColorBase"] },
    { title: "Text",       fields: ["mFontAlign"] }
  ]
};

// ---- Shared field rendering ----------------------------------------------------

export function OverridesSection({ node }: { node: WidgetNode }) {
  const setOverrides = useStore(s => s.setOverrides);
  const previewHeight = useStore(s => Math.max(1, s.doc.previewResolution.y));
  const [showAll, setShowAll] = useState(false);
  const meta = WIDGETS[node.type];
  const struct = getStruct(meta.dataClass);
  const fields = struct?.fields ?? BG_PARAM_FIELDS[node.type] ?? [];
  const apply = (overrides: Override[]) => setOverrides(node.id, overrides);
  const exprByPath = new Map<string, string>();
  node.overrides.forEach(o => { if (o.kind === "expr") exprByPath.set(o.path, o.expr); });
  const defaults = getFrameGfxDefaults(node.type, previewHeight);

  const renderField = (field: StructField) => {
    const value = field.type === "cImGuiGfx" ? getGfxFieldValue(node.overrides, field.name) : exprByPath.get(field.name);
    const onChange = (expr: string) => apply(setFieldExpression(node.overrides, field.name, expr, field.type === "cImGuiGfx"));
    const onClear = () => apply(clearFieldOverride(node.overrides, field.name));
    if (field.type === "cImGuiFrameGfx") {
      return <div className="override-row" key={field.name}>
        <div className="override-field"><span className="override-name">{field.name}</span>
          <ExpressionControl label={field.name} value={value} canEditValue={value === undefined} onChange={onChange}>
            <FrameGfxEditor fieldName={field.name} overrides={node.overrides} defaults={defaults} onChange={apply} />
          </ExpressionControl>
        </div>
        {value !== undefined ? <button type="button" className="danger" aria-label={`Remove ${field.name} override`} title={`Remove ${field.name} override`} onClick={onClear}>×</button> : <span />}
      </div>;
    }
    return <FieldEditor key={field.name} field={field} value={value} onChange={onChange} onClear={onClear} />;
  };

  const groups = WIDGET_FIELD_GROUPS[node.type] ?? [];
  const grouped = new Set(groups.flatMap(g => g.frameGfx ? [g.frameGfx] : g.fields));
  const isActive = (field: StructField) => node.overrides.some(o => o.kind === "expr"
    ? o.path === field.name || o.path.startsWith(field.name + ".")
    : o.call.trim().startsWith(field.name + "."));
  const remaining = fields.filter(f => !grouped.has(f.name));
  const visible = remaining.filter(f => !meta.dataClass || showAll || isActive(f));
  // Existing nested/unknown assignments remain editable instead of disappearing.
  const extraPaths = new Set([...exprByPath.keys(), ...node.overrides.flatMap(o => {
    const match = o.kind === "call" ? /^([\w.]+)\.SetFile\(/.exec(o.call.trim()) : null;
    return match ? [match[1]] : [];
  })]);
  const additional = [...extraPaths].filter(path => !fields.some(f => f.name === path))
    .filter(path => !fields.some(f => f.type === "cImGuiFrameGfx" && path.startsWith(f.name + ".mGfx") && path.split(".").length === 2))
    .map(path => meta.dataClass ? getStructField(meta.dataClass, path)
      ?? { name: path, type: "AngelScript", category: "unknown" as const }
      : { name: path, type: "AngelScript", category: "unknown" as const });
  const calls = node.overrides.flatMap((o, index) => o.kind === "call" ? [{ call: o.call, index }] : []);

  if (!fields.length && !additional.length && !meta.dataClass) return null;
  return <>
    {groups.map(group => {
      const names = group.frameGfx ? [group.frameGfx] : group.fields;
      const entries = names.map(name => fields.find(f => f.name === name)).filter((f): f is StructField => !!f);
      return entries.length ? <div className="field-group" key={group.title}><h3>{group.title}</h3>{entries.map(renderField)}</div> : null;
    })}
    {(remaining.length > 0 || additional.length > 0 || !struct && meta.dataClass) && <div className="field-group">
      <h3>{!meta.dataClass ? "Parameters" : groups.length ? "Other overrides" : "Overrides"}</h3>
      {visible.map(renderField)}
      {additional.map(renderField)}
      {meta.dataClass && remaining.length > 0 && <button type="button" onClick={() => setShowAll(v => !v)}>
        {showAll ? "Show overridden only" : `Show all ${remaining.length} fields`}
      </button>}
    </div>}
    {(struct?.methods.length || calls.length || meta.dataClass && !struct) ? <div className="field-group">
      <details><summary>Method calls (AngelScript expressions)</summary>
        {calls.map(({ call, index }) => <div className="override-row" key={index}>
          <input type="text" aria-label={`Method expression ${index + 1}`} list={`methods-${node.id}`} value={call}
            placeholder="SetPadding(20,20,20,20)" onChange={e => apply(node.overrides.map((o, i) => i === index ? { kind: "call", call: e.target.value } : o))} />
          <button type="button" className="danger" title="Remove method call" onClick={() => apply(node.overrides.filter((_, i) => i !== index))}>×</button>
        </div>)}
        <datalist id={`methods-${node.id}`}>{struct?.methods.map(m => <option key={m} value={`${m}()`} />)}</datalist>
        <button type="button" onClick={() => apply([...node.overrides, { kind: "call", call: "" }])}>+ Method expression</button>
      </details>
    </div> : null}
  </>;
}
