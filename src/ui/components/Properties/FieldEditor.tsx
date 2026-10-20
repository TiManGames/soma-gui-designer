import { useEffect, useRef } from "react";
import type { StructField } from "@core/schema/api-schema.types";
import { getEnum, paletteColors } from "@core/schema/loadSchema";
import { parseGfxLiteral, parseStringLiteral, stringLiteral } from "@core/model/literals";
import { colorExpr, floatExpr, hexToRgb, parseColorExpr, parseFloatExpr, parseSizeKeepRatio,
  parseVec, rgbaToHex, sizeKeepRatioExpr, vec2Expr, vec3Expr } from "./exprHelpers";
import { NumberInput } from "../NumberInput";
import { GfxPicker } from "./GfxPicker";
import { ExpressionControl } from "./ExpressionControl";

interface ValueProps {
  field: StructField;
  value: string | undefined;
  onChange: (expr: string) => void;
  min?: number;
  max?: number;
}

export function canEditFieldValue(field: StructField, value: string | undefined): boolean {
  if (field.category === "font" || field.category === "unknown" || field.type === "cImGuiFrameGfx") return false;
  if (field.category === "enum" && !getEnum(field.enumType)?.members.length) return false;
  if (value === undefined) return true;
  switch (field.category) {
    case "float": return parseFloatExpr(value) !== null;
    case "int": {
      const n = parseFloatExpr(value);
      return /^[+-]?\d+$/.test(value.trim()) && n !== null && Number.isSafeInteger(n) && (!field.type.startsWith("uint") || n >= 0);
    }
    case "bool": return /^(true|false)$/.test(value.trim());
    case "string": return parseStringLiteral(value) !== null;
    case "enum": return getEnum(field.enumType)!.members.includes(value.trim());
    case "vec2": return parseVec(value)?.length === 2 || parseSizeKeepRatio(value) !== null;
    case "vec3": return parseVec(value)?.length === 3;
    case "color": return parseColorExpr(value, paletteColors) !== null;
    case "gfx": return parseGfxLiteral(value) !== null;
    default: return false;
  }
}

function BooleanInput({ name, value, onChange }: { name: string; value?: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = value === undefined; }, [value]);
  return <input ref={ref} type="checkbox" aria-label={name} checked={value?.trim() === "true"}
    aria-checked={value === undefined ? "mixed" : value.trim() === "true"}
    onChange={e => onChange(String(e.target.checked))} />;
}

/** Shared by first-class content fields, curated groups, and the full schema view. */
export function TypedExpressionInput({ field, value, onChange, min, max }: ValueProps) {
  const canEdit = canEditFieldValue(field, value);
  const name = field.name;
  const control = () => {
    if (!canEdit) return null;
    switch (field.category) {
      case "float": case "int":
        return <NumberInput aria-label={name} value={value === undefined ? 0 : parseFloatExpr(value)!}
          integer={field.category === "int"} min={min ?? (field.type.startsWith("uint") ? 0 : undefined)} max={max}
          step={field.category === "float" ? 0.01 : 1}
          onCommit={n => onChange(field.category === "int" ? String(n) : floatExpr(n))} />;
      case "bool": return <BooleanInput name={name} value={value} onChange={onChange} />;
      case "string": return <input type="text" aria-label={name} value={value === undefined ? "" : parseStringLiteral(value)!}
        onChange={e => onChange(stringLiteral(e.target.value))} />;
      case "enum": return <select aria-label={name} value={value?.trim() ?? ""} onChange={e => onChange(e.target.value)}>
        <option value="" disabled>Default (no override)</option>
        {getEnum(field.enumType)!.members.map(member => <option key={member} value={member}>{member}</option>)}
      </select>;
      case "vec2": case "vec3": {
        const size = value === undefined ? null : parseSizeKeepRatio(value);
        if (field.category === "vec2" && (size !== null || (value === undefined && /size/i.test(name)))) {
          return <NumberInput aria-label={name} value={size ?? 0} step={0.005}
            title="Normalized size, aspect ratio preserved" onCommit={n => onChange(sizeKeepRatioExpr(n))} />;
        }
        const dims = field.category === "vec3" ? 3 : 2;
        const components = (value === undefined ? null : parseVec(value)) ?? Array<number>(dims).fill(0);
        return <div className="vec-field">{components.map((n, i) => <span key={i} className="vec-comp">
          <span className="vec-axis">{"XYZ"[i]}</span>
          <NumberInput aria-label={`${name} ${"XYZ"[i]}`} value={n} step={0.01} onCommit={next => {
            const v = [...components]; v[i] = next;
            onChange(dims === 3 ? vec3Expr(v[0], v[1], v[2]) : vec2Expr(v[0], v[1]));
          }} />
        </span>)}</div>;
      }
      case "color": {
        const rgba = (value === undefined ? null : parseColorExpr(value, paletteColors)) ?? { r: 1, g: 1, b: 1, a: 1 };
        return <div>
          <div className="color-field">
            <span className="color-swatch" style={{ background: rgbaToHex(rgba) }} />
            <input type="color" aria-label={name} value={rgbaToHex(rgba)} onChange={e => onChange(colorExpr({ ...hexToRgb(e.target.value), a: rgba.a }))} />
            <NumberInput aria-label={`${name} alpha`} className="color-alpha" value={rgba.a} step={0.05}
              onCommit={a => onChange(colorExpr({ ...rgba, a }))} />
          </div>
          <div className="palette-swatches">{paletteColors.map(c => <button type="button" key={c.name} className="swatch-btn"
            title={c.name} style={{ background: rgbaToHex(c) }} onClick={() => onChange(c.name)}>{c.name.replace("gStationGuiColor_", "")}</button>)}</div>
        </div>;
      }
      case "gfx": return <GfxPicker value={value === undefined ? "" : parseGfxLiteral(value)!}
        onChange={path => onChange(field.type === "cImGuiGfx" ? `cImGuiGfx(${stringLiteral(path)})` : stringLiteral(path))} />;
      default: return null;
    }
  };
  return <ExpressionControl label={name} value={value} canEditValue={canEdit} onChange={onChange}>{control()}</ExpressionControl>;
}

export function FieldEditor({ field, value, onChange, onClear, active = value !== undefined, label }: ValueProps & { onClear: () => void; active?: boolean; label?: string }) {
  return <div className="override-row" style={{ opacity: active ? 1 : 0.75 }}>
    <div className="override-field">
      <span className="override-name" title={field.name}>{label ?? field.name}</span>
      {!active && <span className="field-inherited">Default (no override)</span>}
      <TypedExpressionInput field={field} value={value} onChange={onChange} />
    </div>
    {active ? <button type="button" className="danger" aria-label={`Remove ${field.name} override`} title={`Remove ${field.name} override`} onClick={onClear}>×</button> : <span />}
  </div>;
}
