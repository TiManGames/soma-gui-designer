import { useStore } from "../../state/store";
import { ROOT, type WidgetNode } from "@core/model/nodes";
import { canReparent } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { parentAbsRect, layoutValuePatch } from "@core/model/geometry";
import { NumberInput } from "../NumberInput";
import { PropertyGroup } from "./PropertyGroup";

function pct(n: number): number {
  return Math.round(n * 10000) / 100;
}

export function CommonProps({ node }: { node: WidgetNode }) {
  const doc = useStore((s) => s.doc);
  const updateNode = useStore((s) => s.updateNode);
  const renameNode = useStore((s) => s.renameNode);
  const layoutUnit = useStore((s) => s.layoutUnit);
  const setLayoutUnit = useStore((s) => s.setLayoutUnit);

  const containers = doc.nodes.filter((n) => WIDGETS[n.type].canHaveChildren && n.id !== node.id);

  // Parent pixel rect drives px <-> normalized conversion (mirrors the drag math).
  const parent = parentAbsRect(doc, node);
  const isPx = layoutUnit === "px";

  // Display helpers per unit.
  const dispX = isPx ? Math.round(node.xN * parent.w) : pct(node.xN);
  const dispY = isPx ? Math.round(node.yN * parent.h) : pct(node.yN);
  const dispW = isPx ? Math.round(node.wN * parent.w) : pct(node.wN);
  const dispH = isPx ? Math.round(node.hN * parent.h) : pct(node.hN);

  const setLayout = (key: "xN" | "yN" | "wN" | "hN", value: number) =>
    updateNode(node.id, layoutValuePatch(doc, node, key, value, layoutUnit));
  const positioned = !node.type.startsWith("bg-") && node.type !== "advanced-imgui";

  const unit = isPx ? "px" : "%";

  return (
    <>
      <PropertyGroup title="Identity" defaultOpen={false}>

        <label>
          ID
          <input
            defaultValue={node.id}
            key={node.id}
            onBlur={(e) => renameNode(node.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        </label>

        <label>
          Parent
          <select
            value={node.parentId}
            onChange={(e) => useStore.getState().reparent(node.id, e.target.value)}
          >
            <option value={ROOT}>screen (root)</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id !== node.parentId && !canReparent(doc, node.id, c.id)}>
                {c.id}
              </option>
            ))}
          </select>
        </label>
      </PropertyGroup>

      <PropertyGroup title="Layout" right={<span className="unit-toggle" role="group" aria-label="Layout units">
            <button
              type="button"
              aria-pressed={!isPx}
              className={!isPx ? "active" : ""}
              onClick={() => setLayoutUnit("pct")}
            >
              %
            </button>
            <button
              type="button"
              aria-pressed={isPx}
              className={isPx ? "active" : ""}
              onClick={() => setLayoutUnit("px")}
            >
              px
            </button>
          </span>}>

        <div className="four-col">
          <label>
            X {unit}
            <NumberInput value={dispX} onCommit={v => setLayout("xN", v)} />
          </label>
          <label>
            Y {unit}
            <NumberInput value={dispY} onCommit={v => setLayout("yN", v)} />
          </label>
          <label>
            W {unit}
            <NumberInput value={dispW} onCommit={v => setLayout("wN", v)} />
          </label>
          <label>
            H {unit}
            <NumberInput value={dispH} onCommit={v => setLayout("hN", v)} />
          </label>
        </div>

        {positioned && <div className="checkbox-row">
          <label title="Allow movement and resizing beyond parent edges. Turning off fits this widget inside its parent.">
            <input type="checkbox" checked={node.allowOverflow}
              onChange={e => updateNode(node.id, { allowOverflow: e.target.checked })} />
            Allow overflow
          </label>
        </div>}

        <div className="two-col">
          <label>
            Z (depth)
            <NumberInput
              step="0.1"
              value={node.z}
              onCommit={(v) => updateNode(node.id, { z: v })}
            />
          </label>
          <div className="checkbox-row" style={{ alignSelf: "end" }}>
            <label>
              <input
                type="checkbox"
                checked={node.enabled}
                onChange={(e) => updateNode(node.id, { enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>
        </div>
      </PropertyGroup>
    </>
  );
}
