import { useStore } from "../../state/store";
import { ROOT, type WidgetNode } from "@core/model/nodes";
import { getNode } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { clamp } from "@core/model/ids";

function pct(n: number): number {
  return Math.round(n * 10000) / 100;
}

export function CommonProps({ node }: { node: WidgetNode }) {
  const doc = useStore((s) => s.doc);
  const updateNode = useStore((s) => s.updateNode);
  const renameNode = useStore((s) => s.renameNode);

  const containers = doc.nodes.filter((n) => WIDGETS[n.type].canHaveChildren && n.id !== node.id);

  return (
    <div className="field-group">
      <h3>Layout</h3>

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

      <div className="four-col">
        <label>
          X %
          <input
            type="number"
            value={pct(node.xN)}
            onChange={(e) => updateNode(node.id, { xN: clamp(Number(e.target.value) / 100, 0, 1) })}
          />
        </label>
        <label>
          Y %
          <input
            type="number"
            value={pct(node.yN)}
            onChange={(e) => updateNode(node.id, { yN: clamp(Number(e.target.value) / 100, 0, 1) })}
          />
        </label>
        <label>
          W %
          <input
            type="number"
            value={pct(node.wN)}
            onChange={(e) =>
              updateNode(node.id, { wN: clamp(Number(e.target.value) / 100, 0.001, 1 - node.xN) })
            }
          />
        </label>
        <label>
          H %
          <input
            type="number"
            value={pct(node.hN)}
            onChange={(e) =>
              updateNode(node.id, { hN: clamp(Number(e.target.value) / 100, 0.001, 1 - node.yN) })
            }
          />
        </label>
      </div>

      <div className="two-col">
        <label>
          Z (depth)
          <input
            type="number"
            step="0.1"
            value={node.z}
            onChange={(e) => updateNode(node.id, { z: Number(e.target.value) || 0 })}
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
              <option key={c.id} value={c.id} disabled={getNode(doc, c.id) === node}>
                {c.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="checkbox-row">
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
  );
}
