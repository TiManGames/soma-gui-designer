import { useStore } from "../../state/store";
import { getNode } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { CommonProps } from "./CommonProps";
import { TypeFields } from "./TypeFields";
import { OverridesSection } from "./OverridesSection";

export function PropertyPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const doc = useStore((s) => s.doc);
  const deleteNode = useStore((s) => s.deleteNode);
  const duplicateNode = useStore((s) => s.duplicateNode);

  const node = selectedId ? getNode(doc, selectedId) : null;

  if (!node) {
    return (
      <div className="empty-state">
        <div className="es-icon" aria-hidden>
          ⌖
        </div>
        <div>Select a widget on the canvas or in the hierarchy to edit its properties.</div>
      </div>
    );
  }

  return (
    <>
      <div className="prop-title">
        <span className="pt-kind">{WIDGETS[node.type].label}</span>
        <strong>{node.id}</strong>
      </div>
      <CommonProps node={node} />
      <TypeFields node={node} />
      <OverridesSection node={node} />
      <div className="button-row">
        <button onClick={() => duplicateNode(node.id)}>Duplicate</button>
        <button className="danger" onClick={() => deleteNode(node.id)}>
          Delete
        </button>
      </div>
    </>
  );
}
