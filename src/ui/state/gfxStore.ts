import { create } from "zustand";
import type { GfxResult } from "@core/protocol";
import { postToHost } from "../vscodeApi";
import { decodeTga, type DecodedImage } from "../gfx/decodeTga";
import { decodeDds } from "../gfx/decodeDds";
import { parseBitmapFont, type BitmapFont } from "@core/preview/bitmapFont";

export type GfxStatus = "pending" | "ready" | "missing";

export interface GfxEntry {
  status: GfxStatus;
  /** Renderable image src (webview uri or data URL) when status === "ready". */
  src?: string;
  /** Natural pixel dimensions, when known (used for aspect-correct placement). */
  w?: number;
  h?: number;
  pixels?: Uint8ClampedArray;
  font?: BitmapFont;
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

function imageEntry(img: DecodedImage): GfxEntry {
  const canvas = document.createElement("canvas");
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(img.width, img.height);
  data.data.set(img.rgba); ctx.putImageData(data, 0, 0);
  return { status: "ready", src: canvas.toDataURL("image/png"), w: img.width, h: img.height, pixels: img.rgba };
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

  onResolved: async (requestId, result) => {
    const s = get();
    const gfx = s.pending.get(requestId);
    if (!gfx) return;

    let entry: GfxEntry;
    if (result.kind === "uri") {
      entry = await new Promise<GfxEntry>(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0);
            resolve({ status: "ready", src: result.uri, w: canvas.width, h: canvas.height, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data });
          } catch { resolve({ status: "missing" }); }
        };
        img.onerror = () => resolve({ status: "missing" }); img.src = result.uri;
      });
    } else if (result.kind === "tga" || result.kind === "dds") {
      const decoded = (result.kind === "dds" ? decodeDds : decodeTga)(base64ToBytes(result.bytes));
      entry = decoded ? imageEntry(decoded) : { status: "missing" };
    } else if (result.kind === "font") {
      const font = parseBitmapFont(result.text);
      entry = font ? { status: "ready", font } : { status: "missing" };
    } else {
      entry = { status: "missing" };
    }

    // More resources may have completed while a browser image was loading.
    const current = get();
    if (!current.pending.has(requestId)) return;
    const cache = new Map(current.cache).set(gfx, entry);
    const pending = new Map(current.pending);
    pending.delete(requestId);
    set({ cache, pending });
  },

  reset: () => set({ cache: new Map(), pending: new Map() })
}));
