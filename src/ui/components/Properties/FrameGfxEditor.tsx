import type { Override } from "@core/model/nodes";
import { getFileParam } from "@core/model/overrides";
import { GfxPicker } from "./GfxPicker";

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

function upsertCall(overrides: Override[], callStr: string, matchPrefix: string): Override[] {
  const idx = overrides.findIndex(
    (o) => o.kind === "call" && o.call.startsWith(matchPrefix)
  );
  const next: Override = { kind: "call", call: callStr };
  return idx >= 0
    ? overrides.map((o, i) => (i === idx ? next : o))
    : [...overrides, next];
}

function removeCall(overrides: Override[], matchPrefix: string): Override[] {
  return overrides.filter(
    (o) => !(o.kind === "call" && o.call.startsWith(matchPrefix))
  );
}

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
        const current = getFileParam(overrides, fullPath, def);
        const isOverridden = overrides.some(
          (o) => o.kind === "call" && o.call.startsWith(`${fullPath}.SetFile(`)
        );

        return (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "72px minmax(0, 1fr)", gap: 4, alignItems: "center" }}>
            <span style={{
              fontSize: 10.5, color: isOverridden ? "var(--teal-bright)" : "var(--text-dim)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {label}
            </span>
            <GfxPicker
              value={current}
              onChange={(path) => {
                const callStr = `${fullPath}.SetFile("${path}")`;
                onChange(upsertCall(overrides, callStr, `${fullPath}.SetFile(`));
              }}
              onClear={isOverridden ? () => onChange(removeCall(overrides, `${fullPath}.SetFile(`)) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
