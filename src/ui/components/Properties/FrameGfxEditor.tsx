import type { Override } from "@core/model/nodes";
import { clearFieldOverride, getGfxFieldValue, setFieldExpression } from "@core/model/overrides";
import { stringLiteral } from "@core/model/literals";
import { FieldEditor } from "./FieldEditor";

interface Props {
  /** Top-level field name on the data struct, e.g. "mGfxFrame" or "mGfxWindowData". */
  fieldName: string;
  overrides: Override[];
  /** Factory defaults keyed by full dotted path, e.g. "mGfxFrame.mGfxCornerTopLeft" */
  defaults: Record<string, string>;
  onChange: (overrides: Override[]) => void;
}

const SLOTS = [
  { key: "mGfxBackground",      label: "Background" },
  { key: "mGfxCornerTopLeft",    label: "Corner TL" },
  { key: "mGfxCornerTopRight",   label: "Corner TR" },
  { key: "mGfxCornerBottomLeft", label: "Corner BL" },
  { key: "mGfxCornerBottomRight",label: "Corner BR" },
  { key: "mGfxBorderTop",        label: "Border Top" },
  { key: "mGfxBorderRight",      label: "Border Right" },
  { key: "mGfxBorderBottom",     label: "Border Bottom" },
  { key: "mGfxBorderLeft",       label: "Border Left" },
] as const;

/**
 * Renders 9 GfxPicker rows for a cImGuiFrameGfx field (background + 4 corners + 4 borders).
 * Each change emits a kind:"call" override like:
 *   mGfxFrame.mGfxCornerTopLeft.SetFile("stationV2/button/small_corner_topleft")
 */
export function FrameGfxEditor({ fieldName, overrides, defaults, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {SLOTS.map(({ key, label }) => {
        const fullPath = `${fieldName}.${key}`;
        const def = defaults[fullPath] ?? "";
        const value = getGfxFieldValue(overrides, fullPath);

        return <FieldEditor key={key} label={label} field={{ name: fullPath, type: "cImGuiGfx", category: "gfx" }}
          active={value !== undefined} value={value ?? `cImGuiGfx(${stringLiteral(def)})`}
          onChange={expr => onChange(setFieldExpression(overrides, fullPath, expr, true))}
          onClear={() => onChange(clearFieldOverride(overrides, fullPath))} />;
      })}
    </div>
  );
}
