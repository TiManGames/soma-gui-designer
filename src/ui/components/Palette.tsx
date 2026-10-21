import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { WIDGETS, type WidgetMeta } from "@core/model/defaults";
import type { WidgetType } from "@core/model/nodes";
import { Icon, widgetIcon } from "./Icon";

const CATEGORIES: { title: string; category: WidgetMeta["category"] }[] = [
  { title: "Containers", category: "container" }, { title: "Elements", category: "element" },
  { title: "Background", category: "background" }, { title: "Helpers", category: "helper" }, { title: "Advanced", category: "advanced" }
];
function PaletteButton({ type, onInsert }: { type: WidgetType; onInsert?: () => void }) {
  const add = useStore(s => s.addNode), isFav = useStore(s => s.paletteFavorites.includes(type)), favorite = useStore(s => s.toggleFavorite);
  return <div className="palette-btn-wrap">
    <button className="palette-btn" onClick={() => { add(type); onInsert?.(); }} title={WIDGETS[type].label}><Icon name={widgetIcon(type)} /><span>{WIDGETS[type].label}</span></button>
    <button type="button" className={`palette-fav${isFav ? " on" : ""}`} title={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-label={`${isFav ? "Remove" : "Favorite"} ${WIDGETS[type].label}`} aria-pressed={isFav} onClick={() => favorite(type)}>
      <Icon name="star" fill={isFav ? "currentColor" : "none"} />
    </button>
  </div>;
}
export function Palette({ onInsert, autoFocus = false }: { onInsert?: () => void; autoFocus?: boolean }) {
  const favorites = useStore(s => s.paletteFavorites), recent = useStore(s => s.paletteRecent);
  const [query, setQuery] = useState("");
  const types = useMemo(() => Object.keys(WIDGETS) as WidgetType[], []);
  const q = query.trim().toLowerCase();
  const filtered = types.filter(t => WIDGETS[t].label.toLowerCase().includes(q) || t.includes(q));
  const group = (title: string, entries: WidgetType[]) => entries.length ? <div className="palette-group" key={title}>
    <div className="palette-group-label">{title}</div><div className="palette-grid">{entries.map(type => <PaletteButton key={type} type={type} onInsert={onInsert} />)}</div>
  </div> : null;
  return <>
    <div className="search-control"><Icon name="search" /><input aria-label="Search widgets" placeholder="Search widgets" value={query} autoFocus={autoFocus}
      onChange={e => setQuery(e.target.value)} onKeyDown={e => {
        if (e.key === "ArrowDown") { e.preventDefault(); e.currentTarget.closest(".insert-popover-body,.sidebar-tabpanel")?.querySelector<HTMLButtonElement>(".palette-btn")?.focus(); }
      }} /></div>
    {q ? filtered.length ? group("Results", filtered) : <div className="palette-empty">No widgets match “{query}”.</div> : <>
      {group("Favorites", favorites)}{group("Recently used", recent)}
      {CATEGORIES.map(c => group(c.title, types.filter(t => WIDGETS[t].category === c.category)))}
    </>}
  </>;
}
