import type { HostToWebview, WebviewToHost } from "@core/protocol";

// Thin typed wrapper over the VS Code webview messaging API. acquireVsCodeApi()
// must be called exactly once per webview; we cache the handle here.

interface VsCodeApi {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscodeApi: VsCodeApi = acquireVsCodeApi();

/** Send a typed message to the extension host. */
export function postToHost(msg: WebviewToHost): void {
  vscodeApi.postMessage(msg);
}

/** Subscribe to messages from the extension host. Returns an unsubscribe fn. */
export function onHostMessage(handler: (msg: HostToWebview) => void): () => void {
  const listener = (event: MessageEvent) => handler(event.data as HostToWebview);
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

/** Ephemeral UI state (selection, active tab) that survives the webview hiding. */
export function getUiState<T>(): T | undefined {
  return vscodeApi.getState() as T | undefined;
}
export function setUiState(state: unknown): void {
  vscodeApi.setState(state);
}
