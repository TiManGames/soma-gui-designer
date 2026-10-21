import { useEffect, useRef } from "react";
import { useWorkspace } from "../state/workspaceStore";
import { Palette } from "./Palette";
import { Icon } from "./Icon";

export function InsertPopover() {
  const open = useWorkspace(s => s.insertOpen), setOpen = useWorkspace(s => s.setInsertOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    else if (!open && element?.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="insert-popover" aria-labelledby="insert-title"
    onCancel={e => { e.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)}
    onClick={e => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.target === e.currentTarget && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) setOpen(false);
    }}>
    <header><h2 id="insert-title">Insert widget</h2><button className="ghost icon-btn" aria-label="Close widget picker" onClick={() => setOpen(false)}><Icon name="close" /></button></header>
    {open && <div className="insert-popover-body"><Palette autoFocus onInsert={() => setOpen(false)} /></div>}
    <footer>Esc to close</footer>
  </dialog>;
}
