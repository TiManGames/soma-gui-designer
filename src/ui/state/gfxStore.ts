import { create } from "zustand";
import type { GfxResult } from "@core/protocol";
import { postToHost } from "../vscodeApi";
import { tgaToDataUrl } from "../gfx/decodeTga";

export type GfxStatus = "pending" | "ready" | "missing";

export interface GfxEntry {
  status: GfxStatus;
  /** Renderable image src (webview uri or data URL) when status === "ready". */
  src?: string;
  /** Natural pixel dimensions, when known (used for aspect-correct placement). */
  w?: number;
  h?: number;
}

interface GfxState {
  /** Runtime-only cache of resolved gfx by their (raw) reference string. */
  cache: Map<string, GfxEntry>;
  /** Pending host requests: requestId -> gfx reference. */
  pending: Map<string, string>;
  /** Monotonic counter for request ids (Math.random is unavailable in some hosts). */
  seq: number;

  /** Look up a gfx, kicking off a host resolve on first request. */
  request: (gfx: string) => GfxEntry;
  /** Handle a gfxResolved reply from the host. */
  onResolved: (requestId: string, result: GfxResult) => void;
  /** Drop the whole cache (graphics paths changed). */
  reset: () => void;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const useGfx = create<GfxState>((set, get) => ({
  cache: new Map(),
  pending: new Map(),
  seq: 0,

  request: (gfx) => {
    const s = get();
    const existing = s.cache.get(gfx);
    if (existing) return existing;

    const entry: GfxEntry = { status: "pending" };
    const requestId = `gfx-${s.seq}`;
    const cache = new Map(s.cache).set(gfx, entry);
    const pending = new Map(s.pending).set(requestId, gfx);
    set({ cache, pending, seq: s.seq + 1 });
    postToHost({ type: "resolveGfx", requestId, gfx });
    return entry;
  },

  onResolved: (requestId, result) => {
    const s = get();
    const gfx = s.pending.get(requestId);
    if (!gfx) return;

    let entry: GfxEntry;
    if (result.kind === "uri") {
      entry = { status: "ready", src: result.uri };
    } else if (result.kind === "tga") {
      const decoded = tgaToDataUrl(base64ToBytes(result.bytes));
      entry = decoded
        ? { status: "ready", src: decoded.url, w: decoded.w, h: decoded.h }
        : { status: "missing" };
    } else {
      entry = { status: "missing" };
    }

    const cache = new Map(s.cache).set(gfx, entry);
    const pending = new Map(s.pending);
    pending.delete(requestId);
    set({ cache, pending });
  },

  reset: () => set({ cache: new Map(), pending: new Map() })
}));
