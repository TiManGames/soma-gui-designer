import * as vscode from "vscode";

const SUPPORTED_EXTS = [".png", ".jpg", ".jpeg", ".tga"] as const;
const EXT_PROBE_ORDER = [".png", ".jpg", ".jpeg", ".tga"] as const;

/** How a resolved file should be delivered to the webview. */
export type ResolvedGfx =
  | { kind: "uri"; fileUri: vscode.Uri } // PNG/JPG served via asWebviewUri
  | { kind: "tga"; fileUri: vscode.Uri }; // TGA read as bytes, decoded in webview

interface Root {
  /** Absolute uri of a `graphics` folder. */
  uri: vscode.Uri;
  /** true if this is the mod folder (higher priority than the base game). */
  isMod: boolean;
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
  /** basename (no ext) -> absolute file uri, as a last-resort match. */
  private byBase = new Map<string, vscode.Uri>();

  /** Rebuild the index from the current workspace configuration. */
  async reindex(): Promise<void> {
    this.byPath.clear();
    this.byBase.clear();
    this.roots = resolveRoots();

    // Walk base first then mod, so mod overwrites base on key collisions.
    const ordered = [...this.roots].sort((a, b) => Number(a.isMod) - Number(b.isMod));
    for (const root of ordered) {
      await this.walk(root.uri, root.uri);
    }
  }

  /** True when at least one graphics folder is configured and exists. */
  get hasRoots(): boolean {
    return this.byPath.size > 0;
  }

  /** The configured root URIs (mod first, then base), for use as dialog defaultUri. */
  rootUris(): vscode.Uri[] {
    const ordered = [...this.roots].sort((a, b) => Number(b.isMod) - Number(a.isMod));
    return ordered.map((r) => r.uri);
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
   * Resolve a gfx reference to a file. Returns null when nothing matches or the
   * only candidate is an unsupported format (e.g. DDS) — the webview then falls
   * back to CSS placeholder rendering.
   */
  resolve(gfx: string): ResolvedGfx | null {
    const norm = normalizeName(gfx);
    if (!norm) return null;

    const givenExt = extOf(norm);
    // If the name already carries an extension, try it verbatim first.
    const candidates: string[] = [];
    if (givenExt) {
      candidates.push(norm);
      // Also try swapping to a supported ext if the given one is unsupported (e.g. .dds).
      const stem = norm.slice(0, norm.length - givenExt.length);
      for (const ext of EXT_PROBE_ORDER) candidates.push(stem + ext);
    } else {
      for (const ext of EXT_PROBE_ORDER) candidates.push(norm + ext);
    }

    for (const cand of candidates) {
      const hit = this.lookup(cand);
      if (hit) return classify(hit);
    }
    return null;
  }

  /** Match a fully-extensioned normalized path by suffix, then by basename. */
  private lookup(pathWithExt: string): vscode.Uri | null {
    const key = stripExt(pathWithExt);
    // Exact / suffix match against indexed normalized paths.
    const exact = this.byPath.get(key);
    if (exact && extMatches(exact, pathWithExt)) return exact;

    // Suffix match: the requested path is a tail of an indexed path.
    for (const [indexedKey, uri] of this.byPath) {
      if (indexedKey.endsWith("/" + key) && extMatches(uri, pathWithExt)) return uri;
    }

    // Basename fallback.
    const base = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
    const byBase = this.byBase.get(base);
    if (byBase && extMatches(byBase, pathWithExt)) return byBase;

    return null;
  }

  private async walk(dir: vscode.Uri, root: vscode.Uri): Promise<void> {
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
      return; // unreadable / missing folder — skip silently
    }
    for (const [name, kind] of entries) {
      const child = vscode.Uri.joinPath(dir, name);
      if (kind === vscode.FileType.Directory) {
        await this.walk(child, root);
      } else if (kind === vscode.FileType.File) {
        const ext = extOf(name.toLowerCase());
        if (!SUPPORTED_EXTS.includes(ext as (typeof SUPPORTED_EXTS)[number])) continue;
        const rel = relativePath(root, child).toLowerCase();
        const key = stripExt(rel);
        this.byPath.set(key, child);
        const base = key.includes("/") ? key.slice(key.lastIndexOf("/") + 1) : key;
        this.byBase.set(base, child); // last writer wins → mod overrides base
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

/** Normalize a gfx reference: strip quotes, backslashes, leading graphics/, lowercase. */
function normalizeName(gfx: string): string {
  let s = gfx.trim().replace(/^["']|["']$/g, "");
  s = s.replace(/\\/g, "/").replace(/^\.\//, "");
  s = s.replace(/^graphics\//i, "");
  s = s.replace(/^\/+/, "");
  return s.toLowerCase();
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

function extMatches(uri: vscode.Uri, wanted: string): boolean {
  const wantExt = extOf(wanted);
  if (!wantExt) return true;
  return extOf(uri.path.toLowerCase()) === wantExt;
}

function classify(fileUri: vscode.Uri): ResolvedGfx {
  return extOf(fileUri.path.toLowerCase()) === ".tga"
    ? { kind: "tga", fileUri }
    : { kind: "uri", fileUri };
}
