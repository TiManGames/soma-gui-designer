// Typed message contract between the VS Code extension host and the webview UI.
// Pure types (no DOM/Node/vscode) so both the host bundle and the webview bundle
// import them from the shared core.

/** Messages sent from the extension host to the webview. */
export type HostToWebview =
  | { type: "init"; text: string }
  | { type: "docChanged"; text: string };

/** Messages sent from the webview to the extension host. */
export type WebviewToHost =
  | { type: "ready" }
  | { type: "edit"; text: string }
  | { type: "copy"; text: string }
  | { type: "writeHps"; text: string; suggestedName: string }
  | { type: "notify"; level: "info" | "warn" | "error"; message: string };
