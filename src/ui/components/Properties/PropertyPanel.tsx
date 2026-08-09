import { useStore } from "../../state/store";
import { getNode } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { CommonProps } from "./CommonProps";
import { TypeFields } from "./TypeFields";
import { OverridesSection } from "./OverridesSection";
import { ProjectPanel } from "./ProjectPanel";

export function PropertyPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const doc = useStore((s) => s.doc);
  const deleteNode = useStore((s) => s.deleteNode);
  const duplicateNode = useStore((s) => s.duplicateNode);

  const node = selectedId ? getNode(doc, selectedId) : null;

  // Nothing selected → Project mode (screen-level metadata).
  if (!node) {
    return <ProjectPanel />;
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
