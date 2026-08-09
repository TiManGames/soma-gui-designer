import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { WIDGETS, type WidgetMeta } from "@core/model/defaults";
import type { WidgetType } from "@core/model/nodes";

const CATEGORIES: { title: string; category: WidgetMeta["category"] }[] = [
  { title: "Containers", category: "container" },
  { title: "Elements", category: "element" },
  { title: "Background", category: "background" },
  { title: "Helpers", category: "helper" },
  { title: "Advanced", category: "advanced" }
];

/** A palette entry button with a favorite star overlay. */
function PaletteButton({ type }: { type: WidgetType }) {
  const addNode = useStore((s) => s.addNode);
  const isFav = useStore((s) => s.paletteFavorites.includes(type));
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  return (
    <div className="palette-btn-wrap">
      <button className="palette-btn" onClick={() => addNode(type)}>
        {WIDGETS[type].label}
      </button>
      <button
        type="button"
        className={`palette-fav${isFav ? " on" : ""}`}
        title={isFav ? "Remove from favorites" : "Add to favorites"}
        onClick={() => toggleFavorite(type)}
      >
        {isFav ? "★" : "☆"}
      </button>
    </div>
  );
}

export function Palette() {
  const favorites = useStore((s) => s.paletteFavorites);
  const recent = useStore((s) => s.paletteRecent);
  const [query, setQuery] = useState("");

  const allTypes = useMemo(() => Object.keys(WIDGETS) as WidgetType[], []);
  const q = query.trim().toLowerCase();

  // When searching, show a single flat filtered grid across all categories.
  const filtered = q
    ? allTypes.filter(
        (t) => WIDGETS[t].label.toLowerCase().includes(q) || t.includes(q)
      )
    : null;

  if (filtered) {
    return (
      <>
        <input
          className="sidebar-search"
          placeholder="Search widgets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtered.length === 0 ? (
          <div className="palette-empty">No widgets match “{query}”.</div>
        ) : (
          <div className="palette-group">
            <div className="palette-grid">
              {filtered.map((t) => (
                <PaletteButton key={t} type={t} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <input
        className="sidebar-search"
        placeholder="Search widgets…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {favorites.length > 0 && (
        <div className="palette-group">
          <div className="palette-group-label">Favorites</div>
          <div className="palette-grid">
            {favorites.map((t) => (
              <PaletteButton key={t} type={t} />
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="palette-group">
          <div className="palette-group-label">Recently used</div>
          <div className="palette-grid">
            {recent.map((t) => (
              <PaletteButton key={t} type={t} />
            ))}
          </div>
        </div>
      )}

      {CATEGORIES.map(({ title, category }) => {
        const types = allTypes.filter((t) => WIDGETS[t].category === category);
        if (types.length === 0) return null;
        return (
          <div className="palette-group" key={category}>
            <div className="palette-group-label">{title}</div>
            <div className="palette-grid">
              {types.map((t) => (
                <PaletteButton key={t} type={t} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
