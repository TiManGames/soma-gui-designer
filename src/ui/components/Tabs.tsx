export function Tabs<T extends string>({ tabs, value, onChange, label, id }: {
  tabs: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; id: string;
}) {
  return <div className="tab-strip" role="tablist" aria-label={label}>
    {tabs.map((tab, index) => <button type="button" role="tab" id={`${id}-${tab.id}`} key={tab.id}
      aria-selected={value === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={value === tab.id ? 0 : -1}
      className={`panel-tab${value === tab.id ? " active" : ""}`} onClick={() => onChange(tab.id)}
      onKeyDown={e => {
        let next = index;
        if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        else return;
        e.preventDefault(); onChange(tabs[next].id);
        document.getElementById(`${id}-${tabs[next].id}`)?.focus();
      }}>{tab.label}</button>)}
  </div>;
}
