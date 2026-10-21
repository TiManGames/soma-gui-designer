import { useId, type ReactNode } from "react";
import { useWorkspace } from "../../state/workspaceStore";
import { Icon } from "../Icon";

export function PropertyGroup({ title, children, preferenceKey = title, defaultOpen = true, right }: {
  title: string; children: ReactNode; preferenceKey?: string; defaultOpen?: boolean; right?: ReactNode;
}) {
  const open = useWorkspace(s => s.sections[preferenceKey] ?? defaultOpen);
  const setSection = useWorkspace(s => s.setSection);
  const id = useId();
  return <section className="field-group property-group">
    <div className="property-group-heading">
      <button type="button" className="property-group-toggle" aria-expanded={open} aria-controls={id}
        onClick={() => setSection(preferenceKey, !open)}><Icon name={open ? "down" : "right"} /><span>{title}</span></button>
      {right}
    </div>
    {open && <div className="property-group-body" id={id}>{children}</div>}
  </section>;
}
