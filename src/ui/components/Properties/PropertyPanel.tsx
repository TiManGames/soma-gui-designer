import { useStore } from "../../state/store";
import { getNode } from "@core/model/tree";
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
      <section>
        <h2>Selected Block</h2>
        <p className="empty-selection">Select a block on the canvas or in the hierarchy to edit it.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Selected Block</h2>
      <CommonProps node={node} />
      <TypeFields node={node} />
      <OverridesSection node={node} />
      <div className="button-row">
        <button onClick={() => duplicateNode(node.id)}>Duplicate</button>
        <button className="danger" onClick={() => deleteNode(node.id)}>
          Delete
        </button>
      </div>
    </section>
  );
}
