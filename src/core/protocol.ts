// Typed message contract between the VS Code extension host and the webview UI.
// Pure types (no DOM/Node/vscode) so both the host bundle and the webview bundle
// import them from the shared core.

/** Result of resolving a gfx name against the configured graphics folders. */
export type GfxResult =
  | { kind: "uri"; uri: string } // PNG/JPG: served directly via asWebviewUri
  | { kind: "tga"; bytes: string } // TGA: base64 bytes for webview-side decoding
  | { kind: "dds"; bytes: string }
  | { kind: "font"; text: string }
  | { kind: "none" }; // not found / unsupported (e.g. DDS) → CSS fallback

/** Whether WYSIWYG rendering is enabled (mirrors the somaGui.wysiwyg.enabled setting). */
export interface GfxConfig {
  wysiwygEnabled: boolean;
}

/** Messages sent from the extension host to the webview. */
export type HostToWebview =
  | { type: "init"; text: string }
  | { type: "docChanged"; text: string }
  | { type: "gfxConfig"; config: GfxConfig }
  | { type: "gfxResolved"; requestId: string; result: GfxResult }
  | { type: "gfxConfigChanged"; config: GfxConfig }
  | { type: "gfxBrowseResult"; requestId: string; path: string | null };

/** Messages sent from the webview to the extension host. */
export type WebviewToHost =
  | { type: "previewStatus"; diagnostics: string[]; error: string; quads: number; readyResources: number }
  | { type: "ready" }
  | { type: "edit"; text: string }
  | { type: "copy"; text: string }
  | { type: "writeHps"; text: string; suggestedName: string }
  | { type: "notify"; level: "info" | "warn" | "error"; message: string }
  | { type: "resolveGfx"; requestId: string; gfx: string }
  | { type: "browseGfx"; requestId: string };
