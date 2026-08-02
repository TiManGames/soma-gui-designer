import { create } from "zustand";
import { postToHost } from "../vscodeApi";

interface GfxBrowseState {
  pending: Map<string, (path: string | null) => void>;
  seq: number;
  browse: () => Promise<string | null>;
  resolve: (requestId: string, path: string | null) => void;
}

export const useGfxBrowse = create<GfxBrowseState>((set, get) => ({
  pending: new Map(),
  seq: 0,
  browse(): Promise<string | null> {
    return new Promise((resolve) => {
      const { seq, pending } = get();
      const requestId = `browse-${seq}`;
      pending.set(requestId, resolve);
      set({ seq: seq + 1, pending: new Map(pending) });
      postToHost({ type: "browseGfx", requestId });
    });
  },
  resolve(requestId: string, path: string | null) {
    const { pending } = get();
    const cb = pending.get(requestId);
    if (cb) {
      pending.delete(requestId);
      set({ pending: new Map(pending) });
      cb(path);
    }
  },
}));
