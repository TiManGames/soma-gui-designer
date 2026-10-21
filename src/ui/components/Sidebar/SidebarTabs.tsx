import { useStore, type SidebarTab } from "../../state/store";
import { HierarchyTree } from "../Hierarchy/HierarchyTree";
import { Palette } from "../Palette";
import { AssetsPanel } from "./AssetsPanel";
import { Tabs } from "../Tabs";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "layers", label: "Layers" }, { id: "widgets", label: "Widgets" }, { id: "assets", label: "Assets" }
];
export function SidebarTabs() {
  const tab = useStore(s => s.sidebarTab), setTab = useStore(s => s.setSidebarTab);
  const count = useStore(s => s.doc.nodes.length);
  return <div className="sidebar-tabs">
    <Tabs tabs={TABS} value={tab} onChange={setTab} label="Sidebar" id="sidebar" />
    <div className="sidebar-tabpanel" role="tabpanel" id={`sidebar-panel-${tab}`} aria-labelledby={`sidebar-${tab}`}>
      {tab === "layers" && <HierarchyTree />}
      {tab === "widgets" && <Palette />}
      {tab === "assets" && <AssetsPanel />}
    </div>
    <div className="sidebar-footer">{count} element{count === 1 ? "" : "s"}</div>
  </div>;
}
