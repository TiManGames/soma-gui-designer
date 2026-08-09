import { useStore, type SidebarTab } from "../../state/store";
import { HierarchyTree } from "../Hierarchy/HierarchyTree";
import { Palette } from "../Palette";
import { AssetsPanel } from "./AssetsPanel";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "layers", label: "Layers" },
  { id: "widgets", label: "Widgets" },
  { id: "assets", label: "Assets" }
];

export function SidebarTabs() {
  const sidebarTab = useStore((s) => s.sidebarTab);
  const setSidebarTab = useStore((s) => s.setSidebarTab);

  return (
    <div className="sidebar-tabs">
      <div className="sidebar-tabstrip" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sidebarTab === t.id}
            className={`sidebar-tab${sidebarTab === t.id ? " active" : ""}`}
            onClick={() => setSidebarTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sidebar-tabpanel">
        {sidebarTab === "layers" && <HierarchyTree />}
        {sidebarTab === "widgets" && <Palette />}
        {sidebarTab === "assets" && <AssetsPanel />}
      </div>
    </div>
  );
}
