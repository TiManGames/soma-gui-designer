import { useEffect, useLayoutEffect, useRef } from "react";

export interface ContextMenuItem { label: string; disabled?: boolean; danger?: boolean; separator?: false; onClick: () => void }
export interface ContextMenuSeparator { separator: true }
export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.left = `${Math.max(4, Math.min(x, window.innerWidth - rect.width - 4))}px`;
    el.style.top = `${Math.max(4, Math.min(y, window.innerHeight - rect.height - 4))}px`;
    const previous = document.activeElement;
    el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [x, y]);
  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    window.addEventListener("mousedown", down); return () => window.removeEventListener("mousedown", down);
  }, [onClose]);
  return <div ref={ref} className="ctx-menu" role="menu" style={{ left: x, top: y }}
    onContextMenu={e => e.preventDefault()} onKeyDown={e => {
      if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
      const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      let next = index;
      if (e.key === "ArrowDown") next = (index + 1) % buttons.length;
      else if (e.key === "ArrowUp") next = (index + buttons.length - 1) % buttons.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[next]?.focus();
    }}>
    {items.map((item, i) => item.separator ? <div role="separator" key={i} className="ctx-sep" /> :
      <button role="menuitem" key={i} className={`ctx-item${item.danger ? " danger" : ""}`} disabled={item.disabled}
        onClick={() => { item.onClick(); onClose(); }}>{item.label}</button>)}
  </div>;
}
