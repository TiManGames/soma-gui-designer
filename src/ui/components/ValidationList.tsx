import { useStore } from "../state/store";
import { useWorkspace } from "../state/workspaceStore";
import { validationIssues } from "../validation";
import { Icon } from "./Icon";

export function ValidationList() {
  const doc = useStore(s => s.doc), issues = validationIssues(doc);
  if (!issues.length) return <div className="validation"><div className="v-ok"><Icon name="check" />No validation issues.</div></div>;
  return <div className="validation">
    {issues.map(({ message, nodeId }, i) => <button className="v-item" key={i} onClick={() => {
      if (nodeId) {
        useStore.getState().select(nodeId);
        useStore.getState().setSidebarTab("layers");
        useWorkspace.getState().revealNode(nodeId);
      } else useWorkspace.getState().showProject();
    }} title={nodeId ? `Reveal ${nodeId}` : "Open project settings"}><Icon name="alert" /><span>{message}</span><Icon name="right" /></button>)}
  </div>;
}
