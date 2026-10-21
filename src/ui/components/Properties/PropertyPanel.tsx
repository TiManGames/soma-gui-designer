import { useStore } from "../../state/store";
import { useWorkspace, type InspectorTab } from "../../state/workspaceStore";
import { getNode } from "@core/model/tree";
import { WIDGETS } from "@core/model/defaults";
import { CommonProps } from "./CommonProps";
import { TypeFields } from "./TypeFields";
import { OverridesSection } from "./OverridesSection";
import { ProjectPanel } from "./ProjectPanel";
import { PreviewControls } from "./PreviewControls";
import { Tabs } from "../Tabs";
import { Icon } from "../Icon";

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "design", label: "Design" }, { id: "style", label: "Style" }, { id: "advanced", label: "Advanced" }
];
export function PropertyPanel() {
  const selected = useStore(s => s.selectedId), doc = useStore(s => s.doc);
  const remove = useStore(s => s.deleteNode), duplicate = useStore(s => s.duplicateNode);
  const project = useWorkspace(s => s.projectSettings), tab = useWorkspace(s => s.inspectorTab), setTab = useWorkspace(s => s.setInspectorTab);
  const node = selected ? getNode(doc, selected) : null;
  if (project || !node) return <div className="inspector">
    <header className="inspector-header"><h2>Project settings</h2><span className="inspector-subtitle">Screen and export configuration</span>
      {node && <button className="ghost back-to-widget" onClick={() => useWorkspace.getState().showWidget()}>Back to {node.id}</button>}
    </header><div className="inspector-body"><ProjectPanel /></div>
  </div>;
  const parent = node.parentId === "screen" ? "Screen" : `Screen / ${node.parentId}`;
  return <div className="inspector">
    <header className="inspector-header">
      <h2 title={node.id}>{node.id}</h2><div className="inspector-meta"><span className="widget-kind">{WIDGETS[node.type].label}</span><span title={parent}>{parent}</span></div>
    </header>
    <Tabs tabs={TABS} value={tab} onChange={setTab} label="Inspector" id="inspector" />
    <div className={`inspector-body inspector-${tab}`} role="tabpanel" id={`inspector-panel-${tab}`} aria-labelledby={`inspector-${tab}`}>
      {tab === "design" && <><CommonProps node={node} /><TypeFields key={node.id} node={node} /><PreviewControls node={node} /></>}
      {tab === "style" && <><OverridesSection key={`style-${node.id}`} node={node} view="style" /><PreviewControls node={node} /></>}
      {tab === "advanced" && <><p className="inspector-help">Schema fields and AngelScript expressions. Hover a field label to see its API name.</p><OverridesSection key={`advanced-${node.id}`} node={node} view="advanced" /></>}
    </div>
    <footer className="inspector-actions">
      <button onClick={() => duplicate(node.id)}><Icon name="copy" />Duplicate</button>
      <button className="ghost danger icon-btn" aria-label={`Delete ${node.id}`} title="Delete element" onClick={() => remove(node.id)}><Icon name="trash" /></button>
    </footer>
  </div>;
}
