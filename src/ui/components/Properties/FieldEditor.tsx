import type { StructField } from "@core/schema/api-schema.types";
import { getEnum, paletteColors } from "@core/schema/loadSchema";
import {
  colorExpr,
  floatExpr,
  hexToRgb,
  parseColorExpr,
  parseFloatExpr,
  rgbaToHex,
  type Rgba
} from "./exprHelpers";

interface Props {
  field: StructField;
  /** Current expression for this field, or undefined if not overridden. */
  value: string | undefined;
  onChange: (expr: string) => void;
  onClear: () => void;
}

export function FieldEditor({ field, value, onChange, onClear }: Props) {
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
        return (
          <input
            type="number"
            value={value ?? ""}
            placeholder="0"
            onChange={(e) => onChange(e.target.value)}
          />
        );
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
        return <RawInput value={value} placeholder="ImGui_NrmSizeKeepRatio(0.035f)" onChange={onChange} />;
      case "vec3":
        return <RawInput value={value} placeholder="cVector3f(0,0,1)" onChange={onChange} />;
      case "font":
      case "gfx":
      default:
        return <RawInput value={value} placeholder={`${field.type} expression`} onChange={onChange} />;
    }
  };

  return (
    <div className="override-row" style={{ opacity: active ? 1 : 0.75 }}>
      <label style={{ margin: 0 }}>
        <span style={{ fontFamily: "monospace" }}>{field.name}</span>
        {control()}
      </label>
      {active ? (
        <button className="danger" title="Remove override" onClick={onClear}>
          ×
        </button>
      ) : (
        <span />
      )}
    </div>
  );
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
    // Non-numeric expression (e.g. ImGui_NrmSizeKeepRatio): edit raw.
    return <RawInput value={value} onChange={onChange} />;
  }
  return (
    <input
      type="number"
      step="0.01"
      value={n ?? ""}
      placeholder="0.0"
      onChange={(e) => onChange(floatExpr(Number(e.target.value)))}
    />
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
        <input
          type="number"
          className="color-alpha"
          min={0}
          max={1}
          step="0.05"
          title="alpha"
          value={rgba.a}
          onChange={(e) => onChange(colorExpr({ ...rgba, a: Number(e.target.value) }))}
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
