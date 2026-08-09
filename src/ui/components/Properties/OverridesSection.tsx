import { useState } from "react";
import { useStore } from "../../state/store";
import { WIDGETS } from "@core/model/defaults";
import { getStruct } from "@core/schema/loadSchema";
import type { FieldCategory, StructField } from "@core/schema/api-schema.types";
import type { Override, WidgetNode, WidgetType } from "@core/model/nodes";
import { getFrameGfxDefaults } from "@core/model/frameDefaults";
import { FieldEditor } from "./FieldEditor";
import { FrameGfxEditor } from "./FrameGfxEditor";
import { GfxPicker } from "./GfxPicker";

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

// ---- Helpers -------------------------------------------------------------------

function upsertExpr(overrides: Override[], path: string, expr: string): Override[] {
  const idx = overrides.findIndex((o) => o.kind === "expr" && o.path === path);
  const next: Override = { kind: "expr", path, expr };
  return idx >= 0 ? overrides.map((o, i) => (i === idx ? next : o)) : [...overrides, next];
}

function removeExpr(overrides: Override[], path: string): Override[] {
  return overrides.filter((o) => !(o.kind === "expr" && o.path === path));
}

function upsertCall(overrides: Override[], call: string, matchPrefix: string): Override[] {
  const idx = overrides.findIndex((o) => o.kind === "call" && o.call.startsWith(matchPrefix));
  const next: Override = { kind: "call", call };
  return idx >= 0 ? overrides.map((o, i) => (i === idx ? next : o)) : [...overrides, next];
}

function removeCall(overrides: Override[], matchPrefix: string): Override[] {
  return overrides.filter((o) => !(o.kind === "call" && o.call.startsWith(matchPrefix)));
}

// ---- Main component ------------------------------------------------------------

export function OverridesSection({ node }: { node: WidgetNode }) {
  const setOverrides = useStore((s) => s.setOverrides);
  const previewHeight = useStore((s) => Math.max(1, s.doc.previewResolution.y));
  const meta = WIDGETS[node.type];
  const [showAll, setShowAll] = useState(false);

  const applyOverrides = (overrides: Override[]) => setOverrides(node.id, overrides);

  // ---- bg-* widgets (no dataClass) ----
  if (!meta.dataClass) {
    const bgFields = BG_PARAM_FIELDS[node.type];
    if (!bgFields) return null;

    const exprByPath = new Map<string, string>();
    node.overrides.forEach((ov) => {
      if (ov.kind === "expr") exprByPath.set(ov.path, ov.expr);
    });

    return (
      <div className="field-group">
        <h3>Parameters</h3>
        {bgFields.map((field) => {
          if (field.category === "gfx") {
            // file field: stored as quoted expr, e.g. "station/scanlines/standard_tileable"
            const raw = exprByPath.get(field.name) ?? "";
            const path = raw.replace(/^["']|["']$/g, "");
            return (
              <div key={field.name} className="override-row" style={{ opacity: path ? 1 : 0.75 }}>
                <label style={{ margin: 0 }}>
                  <span style={{ fontFamily: "monospace" }}>{field.name}</span>
                  <GfxPicker
                    value={path}
                    onChange={(p) => applyOverrides(upsertExpr(node.overrides, field.name, `"${p}"`))}
                    onClear={path ? () => applyOverrides(removeExpr(node.overrides, field.name)) : undefined}
                  />
                </label>
                <span />
              </div>
            );
          }
          return (
            <FieldEditor
              key={field.name}
              field={field}
              value={exprByPath.get(field.name)}
              onChange={(expr) => applyOverrides(upsertExpr(node.overrides, field.name, expr))}
              onClear={() => applyOverrides(removeExpr(node.overrides, field.name))}
            />
          );
        })}
      </div>
    );
  }

  // ---- Widgets with a dataClass ----
  const struct = getStruct(meta.dataClass);

  // Index expr overrides by path for FieldEditor.
  const exprByPath = new Map<string, string>();
  const calls: { index: number; call: string }[] = [];
  node.overrides.forEach((ov, index) => {
    if (ov.kind === "expr") exprByPath.set(ov.path, ov.expr);
    else calls.push({ index, call: ov.call });
  });

  const updateCall = (index: number, call: string) =>
    applyOverrides(node.overrides.map((o, i) => (i === index ? { kind: "call", call } : o)));
  const removeCallAt = (index: number) =>
    applyOverrides(node.overrides.filter((_, i) => i !== index));
  const addCall = () => applyOverrides([...node.overrides, { kind: "call", call: "" }]);

  // No schema — raw call editor fallback.
  if (!struct) {
    return (
      <div className="field-group">
        <h3>Overrides ({meta.dataClass})</h3>
        <p style={{ color: "var(--text-faint)", fontSize: 11.5, margin: "0 0 var(--s2)" }}>
          No struct schema; edit method calls below.
        </p>
        {calls.map(({ index, call }) => (
          <div className="override-row" key={index}>
            <input value={call} onChange={(e) => updateCall(index, e.target.value)} />
            <button className="danger" onClick={() => removeCallAt(index)}>×</button>
          </div>
        ))}
        <div className="button-row">
          <button onClick={addCall}>+ Method</button>
        </div>
      </div>
    );
  }

  // Build a field lookup for the struct.
  const fieldByName = new Map(struct.fields.map((f) => [f.name, f]));

  // ---- Curated groups layout ----
  const groups = WIDGET_FIELD_GROUPS[node.type as WidgetType];

  if (groups) {
    return (
      <>
        {groups.map((group) => {
          // FrameGfx group
          if (group.frameGfx) {
            const defs = getFrameGfxDefaults(node.type as WidgetType, previewHeight);
            return (
              <div className="field-group" key={group.frameGfx}>
                <h3>{group.title}</h3>
                <FrameGfxEditor
                  fieldName={group.frameGfx}
                  overrides={node.overrides}
                  defaults={defs}
                  onChange={applyOverrides}
                />
              </div>
            );
          }

          // Regular field group — skip empty groups
          const renderable = group.fields
            .map((name) => fieldByName.get(name))
            .filter((f): f is (typeof struct.fields)[0] => f !== undefined);
          if (renderable.length === 0) return null;

          return (
            <div className="field-group" key={group.title}>
              <h3>{group.title}</h3>
              {renderable.map((field) => {
                if (field.type === "cImGuiGfx") {
                  // Single-texture GfxPicker → stored as kind:"call" SetFile
                  const callPrefix = `${field.name}.SetFile(`;
                  const existing = node.overrides.find(
                    (o) => o.kind === "call" && o.call.startsWith(callPrefix)
                  );
                  const currentPath = existing?.kind === "call"
                    ? (existing.call.match(/SetFile\(["']([^"']+)["']\)/) ?? [])[1] ?? ""
                    : "";
                  return (
                    <div key={field.name} className="override-row" style={{ opacity: currentPath ? 1 : 0.75 }}>
                      <label style={{ margin: 0 }}>
                        <span style={{ fontFamily: "monospace" }}>{field.name}</span>
                        <GfxPicker
                          value={currentPath}
                          onChange={(path) =>
                            applyOverrides(upsertCall(node.overrides, `${field.name}.SetFile("${path}")`, callPrefix))
                          }
                          onClear={currentPath ? () => applyOverrides(removeCall(node.overrides, callPrefix)) : undefined}
                        />
                      </label>
                      <span />
                    </div>
                  );
                }
                return (
                  <FieldEditor
                    key={field.name}
                    field={field}
                    value={exprByPath.get(field.name)}
                    onChange={(expr) => applyOverrides(upsertExpr(node.overrides, field.name, expr))}
                    onClear={() => applyOverrides(removeExpr(node.overrides, field.name))}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Method calls (padding etc.) */}
        {struct.methods.length > 0 && (
          <div className="field-group">
            <h3>Method calls</h3>
            {calls.map(({ index, call }) => (
              <div className="override-row" key={index}>
                <input
                  list={`methods-${node.id}`}
                  value={call}
                  placeholder="SetPadding(20,20,20,20)"
                  onChange={(e) => updateCall(index, e.target.value)}
                />
                <button className="danger" onClick={() => removeCallAt(index)}>×</button>
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
          </div>
        )}
      </>
    );
  }

  // ---- Fallback: all fields (widgets not in WIDGET_FIELD_GROUPS, e.g. checkbox) ----
  const visibleFields = struct.fields.filter(
    (f) => showAll || exprByPath.has(f.name)
      || calls.some((c) => c.call.startsWith(f.name + "."))
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
          onChange={(expr) => applyOverrides(upsertExpr(node.overrides, field.name, expr))}
          onClear={() => applyOverrides(removeExpr(node.overrides, field.name))}
          onGfxChange={(call) => applyOverrides(upsertCall(node.overrides, call, field.name + ".SetFile("))}
        />
      ))}

      <div className="button-row">
        <button onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show overridden only" : `Show all ${struct.fields.length} fields`}
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
              <button className="danger" onClick={() => removeCallAt(index)}>×</button>
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
