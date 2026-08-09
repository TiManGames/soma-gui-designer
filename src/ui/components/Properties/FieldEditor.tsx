import type { StructField } from "@core/schema/api-schema.types";
import { getEnum, paletteColors } from "@core/schema/loadSchema";
import {
  colorExpr,
  floatExpr,
  hexToRgb,
  parseColorExpr,
  parseFloatExpr,
  parseSizeKeepRatio,
  parseVec,
  rgbaToHex,
  sizeKeepRatioExpr,
  vec2Expr,
  vec3Expr,
  type Rgba
} from "./exprHelpers";
import { NumberInput } from "../NumberInput";
import { GfxPicker } from "./GfxPicker";

interface Props {
  field: StructField;
  /** Current expression for this field, or undefined if not overridden. */
  value: string | undefined;
  onChange: (expr: string) => void;
  onClear: () => void;
  /**
   * For cImGuiGfx fields: called with a SetFile call string rather than an expr.
   * If not provided, falls back to storing as a quoted expr.
   */
  onGfxChange?: (call: string) => void;
}

export function FieldEditor({ field, value, onChange, onClear, onGfxChange }: Props) {
  const active = value !== undefined;

  const control = () => {
    switch (field.category) {
      case "color":
        return <ColorEditor value={value} onChange={onChange} />;
      case "bool":
        return (
          <select value={value ?? "true"} onChange={(e) => onChange(e.target.value)}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case "float":
        return <FloatEditor value={value} onChange={onChange} />;
      case "int":
        return <IntEditor value={value} onChange={onChange} />;
      case "enum": {
        const e = getEnum(field.enumType);
        if (!e) return <RawInput value={value} onChange={onChange} />;
        return (
          <select value={value ?? e.members[0]} onChange={(ev) => onChange(ev.target.value)}>
            {e.members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        );
      }
      case "vec2":
        // "size"-named vec2 fields take a single keep-ratio number; other vec2
        // fields (padding, UV) get a dedicated X/Y pair.
        return /size/i.test(field.name) ? (
          <SizeEditor value={value} onChange={onChange} />
        ) : (
          <VecEditor value={value} dims={2} onChange={onChange} />
        );
      case "vec3":
        return <VecEditor value={value} dims={3} onChange={onChange} />;
      case "gfx":
        if (field.type === "cImGuiFrameGfx") {
          // Rendered by OverridesSection as FrameGfxEditor — skip here.
          return null;
        }
        // cImGuiGfx: single texture picker
        return (
          <GfxPicker
            value={extractFileFromValue(value ?? "")}
            onChange={(path) => {
              if (onGfxChange) onGfxChange(`${field.name}.SetFile("${path}")`);
              else onChange(`"${path}"`);
            }}
            onClear={active ? onClear : undefined}
          />
        );
      case "font":
      default:
        return <RawInput value={value} placeholder={`${field.type} expression`} onChange={onChange} />;
    }
  };

  const ctrl = control();
  if (ctrl === null) return null;

  return (
    <div className="override-row" style={{ opacity: active ? 1 : 0.75 }}>
      <label style={{ margin: 0 }}>
        <span style={{ fontFamily: "monospace" }}>{field.name}</span>
        {ctrl}
      </label>
      {active && field.category !== "gfx" ? (
        <button className="danger" title="Remove override" onClick={onClear}>
          ×
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/** Strip surrounding quotes from a stored gfx expr, e.g. '"station/foo"' → 'station/foo' */
function extractFileFromValue(v: string): string {
  return v.replace(/^["']|["']$/g, "");
}

function RawInput({
  value,
  placeholder,
  onChange
}: {
  value: string | undefined;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FloatEditor({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const n = value !== undefined ? parseFloatExpr(value) : null;
  if (value !== undefined && n === null) {
    return <RawInput value={value} onChange={onChange} />;
  }
  return (
    <NumberInput
      value={n ?? 0}
      step="0.01"
      placeholder="0.0"
      onCommit={(v) => onChange(floatExpr(v))}
    />
  );
}

/**
 * An integer editor. Stores a plain integer expression (no float suffix).
 * Falls back to a raw input if the stored value isn't a plain number.
 */
function IntEditor({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const n = value !== undefined ? parseFloatExpr(value) : null;
  if (value !== undefined && n === null) {
    return <RawInput value={value} onChange={onChange} />;
  }
  return (
    <NumberInput
      value={n ?? 0}
      step={1}
      placeholder="0"
      onCommit={(v) => onChange(String(Math.round(v)))}
    />
  );
}

/**
 * A single-number editor for "size"-category vec2 fields, emitting
 * `ImGui_NrmSizeKeepRatio(n)`. Falls back to a raw expression input if the
 * stored value is something else the user hand-wrote.
 */
function SizeEditor({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const n = value !== undefined ? parseSizeKeepRatio(value) : null;
  if (value !== undefined && n === null) {
    return <RawInput value={value} onChange={onChange} />;
  }
  return (
    <NumberInput
      value={n ?? 0}
      step="0.005"
      min={0}
      title="Normalized size, aspect ratio preserved"
      onCommit={(v) => onChange(sizeKeepRatioExpr(v))}
    />
  );
}

/**
 * A per-component editor for cVector2f / cVector3f fields. Emits a plain
 * `cVector2f(x,y)` / `cVector3f(x,y,z)` literal. Falls back to a raw input if the
 * stored value is a hand-written expression (e.g. a helper-function call).
 */
function VecEditor({
  value,
  dims,
  onChange
}: {
  value: string | undefined;
  dims: 2 | 3;
  onChange: (v: string) => void;
}) {
  const parsed = value !== undefined ? parseVec(value) : null;
  if (value !== undefined && parsed === null) {
    return <RawInput value={value} onChange={onChange} />;
  }
  const comps = parsed ?? new Array(dims).fill(0);
  const labels = dims === 3 ? ["X", "Y", "Z"] : ["X", "Y"];

  const setComp = (i: number, v: number) => {
    const next = [...comps];
    next[i] = v;
    onChange(dims === 3 ? vec3Expr(next[0], next[1], next[2]) : vec2Expr(next[0], next[1]));
  };

  return (
    <div className="vec-field">
      {labels.map((lbl, i) => (
        <span key={lbl} className="vec-comp">
          <span className="vec-axis">{lbl}</span>
          <NumberInput value={comps[i] ?? 0} step="0.01" onCommit={(v) => setComp(i, v)} />
        </span>
      ))}
    </div>
  );
}

function ColorEditor({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const rgba: Rgba = (value ? parseColorExpr(value, paletteColors) : null) ?? {
    r: 1,
    g: 1,
    b: 1,
    a: 1
  };
  const isRawExpr = value !== undefined && parseColorExpr(value, paletteColors) === null;

  if (isRawExpr) {
    return <RawInput value={value} onChange={onChange} />;
  }

  return (
    <div>
      <div className="color-field">
        <span className="color-swatch" style={{ background: rgbaToHex(rgba) }} />
        <input
          type="color"
          value={rgbaToHex(rgba)}
          onChange={(e) => {
            const rgb = hexToRgb(e.target.value);
            onChange(colorExpr({ ...rgb, a: rgba.a }));
          }}
        />
        <NumberInput
          className="color-alpha"
          min={0}
          step="0.05"
          title="alpha"
          value={rgba.a}
          onCommit={(v) => onChange(colorExpr({ ...rgba, a: v }))}
        />
      </div>
      <div className="palette-swatches">
        {paletteColors.map((c) => (
          <button
            key={c.name}
            className="swatch-btn"
            title={c.name}
            style={{ background: rgbaToHex(c) }}
            onClick={() => onChange(c.name)}
          >
            {c.name.replace("gStationGuiColor_", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
