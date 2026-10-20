import * as vscode from "vscode";
import { findResource } from "@core/preview/resourceIndex";

const SUPPORTED_EXTS = [".png", ".jpg", ".jpeg", ".tga", ".dds", ".fnt"] as const;

/** How a resolved file should be delivered to the webview. */
export type ResolvedGfx =
  | { kind: "uri"; fileUri: vscode.Uri } // PNG/JPG served via asWebviewUri
  | { kind: "tga" | "dds" | "font"; fileUri: vscode.Uri };

interface Root {
  /** Absolute uri of a `graphics` folder. */
  uri: vscode.Uri;
  /** true if this is the mod folder (higher priority than the base game). */
  isMod: boolean;
  prefix?: string;
}

/**
 * Indexes the configured base-game and mod `graphics` folders and resolves the
 * loose gfx names used in HPS (e.g. `station/scanlines/standard_tileable`,
 * possibly without an `imgui/` prefix or file extension) to concrete files.
 *
 * HPL3 searches its resource dirs rather than joining a single root, so we build
 * a suffix/basename index and match against it — mod entries winning over base.
 */
export class GfxIndex {
  private roots: Root[] = [];
  /** normalized-path (no ext) -> absolute file uri. Mod entries inserted last so they win. */
  private byPath = new Map<string, vscode.Uri>();
  private entries: { key: string; isMod: boolean; uri: vscode.Uri }[] = [];

  /** Rebuild the index from the current workspace configuration. */
  async reindex(): Promise<void> {
    this.byPath.clear();
    this.entries = [];
    this.roots = resolveRoots();

    // Walk base first then mod, so mod overwrites base on key collisions.
    const ordered = [...this.roots].sort((a, b) => Number(a.isMod) - Number(b.isMod));
    for (const root of ordered) {
      await this.walk(root.uri, root.uri, root.prefix ?? "", root.isMod);
    }
  }

  /** True when at least one graphics folder is configured and exists. */
  get hasRoots(): boolean {
    return this.byPath.size > 0;
  }

  /** The configured root URIs (mod first, then base), for use as dialog defaultUri. */
  rootUris(): vscode.Uri[] {
    const ordered = [...this.roots].sort((a, b) => Number(b.isMod) - Number(a.isMod));
    return ordered.filter(r => !r.prefix).map((r) => r.uri);
  }

  /**
   * Given an absolute file URI that the user picked, return the normalized
   * gfx path (relative, no extension) suitable for use in overrides.
   * Returns null if the file is outside all configured roots.
   */
  normalize(fileUri: vscode.Uri): string | null {
    // First try exact reverse-lookup in the indexed map — handles all casing
    // differences since both sides went through the same walk normalization.
    const needle = fileUri.fsPath.toLowerCase().replace(/\\/g, "/");
    for (const [key, uri] of this.byPath) {
      if (uri.fsPath.toLowerCase().replace(/\\/g, "/") === needle) {
        return key; // already stripped of extension and normalized
      }
    }
    // Fallback: strip the root prefix manually (e.g. for a file not yet indexed)
    for (const root of this.roots) {
      const rootPath = root.uri.fsPath.toLowerCase().replace(/\\/g, "/");
      const prefix = rootPath.endsWith("/") ? rootPath : rootPath + "/";
      if (needle.startsWith(prefix)) {
        return stripExt(needle.slice(prefix.length));
      }
    }
    return null;
  }

  /**
   * Resolve a graphics/font reference, retaining its extension for decoding.
   * Missing or unsupported files are reported by the preview surface.
   */
  resolve(gfx: string): ResolvedGfx | null {
    const hit = findResource(this.entries, gfx);
    return hit ? classify(hit.uri) : null;
  }

  private async walk(dir: vscode.Uri, root: vscode.Uri, prefix: string, isMod: boolean): Promise<void> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
      return; // unreadable / missing folder — skip silently
    }
    for (const [name, kind] of entries) {
      const child = vscode.Uri.joinPath(dir, name);
      if (kind === vscode.FileType.Directory) {
        await this.walk(child, root, prefix, isMod);
      } else if (kind === vscode.FileType.File) {
        const ext = extOf(name.toLowerCase());
        if (!SUPPORTED_EXTS.includes(ext as (typeof SUPPORTED_EXTS)[number])) continue;
        const rel = relativePath(root, child).toLowerCase();
        const key = prefix + stripExt(rel);
        this.entries.push({ key: prefix + rel, isMod, uri: child });
        this.byPath.set(key, child);
      }
    }
  }
}

/** Read the two graphics-path settings and turn them into absolute root uris. */
function resolveRoots(): Root[] {
  const cfg = vscode.workspace.getConfiguration("somaGui");
  const base = (cfg.get<string>("baseGameGraphicsPath") ?? "").trim();
  const mod = (cfg.get<string>("modGraphicsPath") ?? "").trim();
  const roots: Root[] = [];
  const baseUri = toUri(base);
  if (baseUri) roots.push({ uri: baseUri, isMod: false });
  const modUri = toUri(mod);
  if (modUri) roots.push({ uri: modUri, isMod: true });
  const baseFont = toUri((cfg.get<string>("baseGameFontsPath") ?? "").trim()) ?? (baseUri ? vscode.Uri.joinPath(baseUri, "..", "fonts") : null);
  const modFont = toUri((cfg.get<string>("modFontsPath") ?? "").trim()) ?? (modUri ? vscode.Uri.joinPath(modUri, "..", "fonts") : null);
  if (baseFont) roots.push({ uri: baseFont, isMod: false, prefix: "@font/" });
  if (modFont) roots.push({ uri: modFont, isMod: true, prefix: "@font/" });
  return roots;
}

/** Resolve a possibly-relative configured path to an absolute uri. */
function toUri(p: string): vscode.Uri | null {
  if (!p) return null;
  if (isAbsolute(p)) return vscode.Uri.file(p);
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
  return ws ? vscode.Uri.joinPath(ws, p) : null;
}

function isAbsolute(p: string): boolean {
  return /^([a-zA-Z]:[\\/]|[\\/])/.test(p);
}

function relativePath(root: vscode.Uri, child: vscode.Uri): string {
  const rp = root.path.endsWith("/") ? root.path : root.path + "/";
  return child.path.startsWith(rp) ? child.path.slice(rp.length) : child.path;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  const slash = name.lastIndexOf("/");
  return i > slash && i >= 0 ? name.slice(i) : "";
}

function stripExt(name: string): string {
  const ext = extOf(name);
  return ext ? name.slice(0, name.length - ext.length) : name;
}

function classify(fileUri: vscode.Uri): ResolvedGfx {
  const ext = extOf(fileUri.path.toLowerCase());
  return { kind: ext === ".tga" ? "tga" : ext === ".dds" ? "dds" : ext === ".fnt" ? "font" : "uri", fileUri };
}
