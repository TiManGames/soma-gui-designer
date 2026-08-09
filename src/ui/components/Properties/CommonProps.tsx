import { useStore } from "../../state/store";
import { ROOT, type WidgetNode } from "@core/model/nodes";
import { getNode } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { clamp } from "@core/model/ids";
import { parentAbsRect, snapPx } from "@core/model/geometry";
import { NumberInput } from "../NumberInput";

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

  const setX = (v: number) => {
    const xN = isPx ? snapPx(v, doc) / parent.w : v / 100;
    updateNode(node.id, { xN: clamp(xN, 0, 1 - node.wN) });
  };
  const setY = (v: number) => {
    const yN = isPx ? snapPx(v, doc) / parent.h : v / 100;
    updateNode(node.id, { yN: clamp(yN, 0, 1 - node.hN) });
  };
  const setW = (v: number) => {
    const wN = isPx ? snapPx(v, doc) / parent.w : v / 100;
    updateNode(node.id, { wN: clamp(wN, 0.001, 1 - node.xN) });
  };
  const setH = (v: number) => {
    const hN = isPx ? snapPx(v, doc) / parent.h : v / 100;
    updateNode(node.id, { hN: clamp(hN, 0.001, 1 - node.yN) });
  };

  const unit = isPx ? "px" : "%";

  return (
    <>
      <div className="field-group">
        <h3>Identity</h3>

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
          Type
          <input value={WIDGETS[node.type].label} disabled />
        </label>

        <label>
          Parent
          <select
            value={node.parentId}
            onChange={(e) => useStore.getState().reparent(node.id, e.target.value)}
          >
            <option value={ROOT}>screen (root)</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id} disabled={getNode(doc, c.id) === node}>
                {c.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-group">
        <h3
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>Layout</span>
          <span className="unit-toggle">
            <button
              type="button"
              className={!isPx ? "active" : ""}
              onClick={() => setLayoutUnit("pct")}
            >
              %
            </button>
            <button
              type="button"
              className={isPx ? "active" : ""}
              onClick={() => setLayoutUnit("px")}
            >
              px
            </button>
          </span>
        </h3>

        <div className="four-col">
          <label>
            X {unit}
            <NumberInput value={dispX} onCommit={setX} />
          </label>
          <label>
            Y {unit}
            <NumberInput value={dispY} onCommit={setY} />
          </label>
          <label>
            W {unit}
            <NumberInput value={dispW} onCommit={setW} />
          </label>
          <label>
            H {unit}
            <NumberInput value={dispH} onCommit={setH} />
          </label>
        </div>

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
      </div>
    </>
  );
}
