import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: false;
  onClick: () => void;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface Props {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Use mousedown so clicking outside before mouseup still closes.
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        "separator" in item && item.separator ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <button
            key={i}
            className={`ctx-item${(item as ContextMenuItem).danger ? " danger" : ""}`}
            disabled={(item as ContextMenuItem).disabled}
            onMouseDown={(e) => {
              e.stopPropagation();
              (item as ContextMenuItem).onClick();
              onClose();
            }}
          >
            {(item as ContextMenuItem).label}
          </button>
        )
      )}
    </div>
  );
}
